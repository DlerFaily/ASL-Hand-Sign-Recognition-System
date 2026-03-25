import json
import os
from django.contrib.auth.models import User
from rest_framework.test import APITransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

class PredictApiTests(APITransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword',
            is_staff=True,
            is_superuser=True
        )
        self.client.force_authenticate(user=self.user)

        base_path = os.path.dirname(__file__)
        fixture_path = os.path.join(base_path, 'fixtures_norm', 'landmarks.csv')

        try:
            with open(fixture_path, 'rb') as f:
                file_content = f.read()
        except FileNotFoundError:
            self.fail(f"Fixture file not found at: {fixture_path}. Please check the path and filename.")

        uploaded_file = SimpleUploadedFile(
            name='landmarks.csv',
            content=file_content,
            content_type='text/csv'
        )

        train_model = self.client.post('/api/models/train/', format='multipart', data={'file': uploaded_file})

        self.assertEqual(
            train_model.status_code, 
            status.HTTP_201_CREATED, 
            f"Failed training model during setup: {train_model.data}"
        )

        all_models = self.client.get('/api/models/')

        self.assertEqual(
            all_models.status_code, 
            status.HTTP_200_OK, 
            f"Failed loading model data"
        )

        select_model = self.client.put('/api/models/1/select/')

        self.assertEqual(
            select_model.status_code, 
            status.HTTP_200_OK, 
            f"Failed selecting model"
        )

    def load_fixture(self, letter, filename):
        """Helper to load JSON data from fixtures directory."""
        base_path = os.path.dirname(__file__)
        fixture_path = os.path.join(base_path, 'fixtures_norm', letter, filename)
        if not os.path.exists(fixture_path):
            raise FileNotFoundError(f"Fixture {filename} not found at {fixture_path}")
        with open(fixture_path, 'r') as f:
            return json.load(f)
        
    def test_predict_letters(self):
        # Define letters to test (must match your fixture filenames)
        letters_to_test = [
            'A','B','C','D','E','F','G','H','I','J',
            'K','L','M','N','O','P','Q','R','S','T',
            'U','V','W','X','Y','Z'
        ]

        accuracy_threshold = 0.30
        correct = 0
        wrong = 0

        for letter in letters_to_test:
            with self.subTest(letter=letter):
                base_path = os.path.dirname(__file__)
                fixture_path = os.path.join(base_path, 'fixtures', letter)
                all_entries = os.listdir(fixture_path)
                files_only = [
                    entry for entry in all_entries
                    if os.path.isfile(os.path.join(fixture_path, entry))
                ]

                for file in files_only:
                    if not file.endswith('.json'):
                        self.fail(f"Unexpected file format in fixtures for letter {letter}: {file}")

                    # Load the specific JSON payload for this letter
                    payload = self.load_fixture(letter, file)
                    print(f"Testing letter: {letter}")

                    payload.update({'target': letter})

                    # Make the Request
                    response = self.client.post('/api/models/predict/', payload, format='json')

                    # Assertions
                    self.assertEqual(
                        response.status_code, 
                        status.HTTP_200_OK, 
                        f"Failed on letter {letter}: {response.data}"
                    )

                    if response.data['prediction'] == letter:
                        correct += 1
                        print(f"Correct prediction: {letter} from file {file} ")
                    else:
                        wrong += 1
                        print(f"Wrong prediction: expected {letter}, got {response.data['prediction']} from file {file} ")
        
        total = correct + wrong
        accuracy = correct / total if total > 0 else 0
        print(f"Total predictions: {total}, Correct: {correct}, Wrong: {wrong}, Accuracy: {accuracy:.2%}")