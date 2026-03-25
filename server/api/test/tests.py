from rest_framework.test import APITestCase
from django.contrib.auth.models import User
from rest_framework import status

class TestTestViewEndpoint(APITestCase):
    """
    Test suite for the TestViewViewSet's list endpoint.
    """
    def test_test_endpoint_get_request(self):
        """
        Ensure the '/api/test/' list endpoint returns the expected status code and data.
        """
        url = '/api/test/'
        
        # 1. Perform the GET request
        response = self.client.get(url)

        # 2. Assert the status code
        self.assertEqual(response.status_code, 200, 
                         f"Expected HTTP 200 OK, but received {response.status_code}")

        # 3. Assert the response data
        expected_data = {"message": "test ok"}
        self.assertEqual(response.data, expected_data, 
                         f"Expected data {expected_data}, but received {response.data}")

        print("\nTest passed successfully:")
        print(f"  Request URL: {url}")
        print(f"  Status Code: {response.status_code}")
        print(f"  Response Data: {response.data}")


class TestProtectedEndpoint(APITestCase):
    """
    Test suite for the protected endpoint in TestViewViewSet.
    """
    
    def setUp(self):
        """Set up test user for authentication tests"""
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'TestPass123!',
            'first_name': 'Test',
            'last_name': 'User'
        }
        self.user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name']
        )
    
    def test_protected_endpoint_without_authentication(self):
        """
        Test that the protected endpoint returns 401 without authentication.
        """
        url = '/api/test/protected/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        
        print("\nTest passed: Protected endpoint blocks unauthenticated requests")
        print(f"  Request URL: {url}")
        print(f"  Status Code: {response.status_code}")
    
    def test_protected_endpoint_with_authentication(self):
        """
        Test that the protected endpoint returns user data with valid JWT token.
        """
        # Get JWT token
        login_response = self.client.post('/api/token/', {
            'username': self.user_data['username'],
            'password': self.user_data['password']
        })
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        access_token = login_response.data['access']
        
        # Access protected endpoint with token
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        url = '/api/test/protected/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'This is a protected endpoint')
        self.assertEqual(response.data['user']['username'], self.user_data['username'])
        self.assertEqual(response.data['user']['email'], self.user_data['email'])
        self.assertIn('id', response.data['user'])
        
        print("\nTest passed: Protected endpoint accessible with valid token")
        print(f"  Request URL: {url}")
        print(f"  Status Code: {response.status_code}")
        print(f"  User: {response.data['user']['username']}")
    
    def test_protected_endpoint_with_invalid_token(self):
        """
        Test that the protected endpoint returns 401 with invalid token.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Bearer invalid_token')
        url = '/api/test/protected/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        print("\nTest passed: Protected endpoint blocks invalid tokens")
        print(f"  Request URL: {url}")
        print(f"  Status Code: {response.status_code}")