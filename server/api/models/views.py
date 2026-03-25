from django.core.files.base import ContentFile
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from .models import TrainedModel, UserPrediction, Label
from api.models.util import load_latest_model_and_encoder, prep_data_for_model
import pandas as pd
import io
from ml.train_utils import train_model_from_dataframe, train_model_from_csv_chunks
import numpy as np
from datetime import datetime
import torch
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score, accuracy_score, confusion_matrix, classification_report
import pickle
import os

def get_timestamp():
    return datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def predictGesture(request):
    landmarks = request.data.get("data")
    target_letter = request.data.get("target")

    if landmarks is None:
        return Response({"error": "No input data provided."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        model, encoder = load_latest_model_and_encoder()

        sample = prep_data_for_model(landmarks)
        sample = np.stack(sample)
        sample = torch.tensor(sample, dtype=torch.float32).unsqueeze(0)

        with torch.no_grad():
            outputs = model(sample)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]
            class_id = int(torch.argmax(probs))
            label_encoder = encoder['label_encoder']
            predicted_letter = label_encoder.inverse_transform([class_id])[0]
            confidence_score = float(probs[class_id])
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    if target_letter is not None:
        UserPrediction.objects.create(
            model = TrainedModel.objects.filter(is_active=True).first(),
            predicted_letter = predicted_letter,
            target_letter = target_letter,
            confidence_score = confidence_score,
            user = request.user,
        )

    return Response({"prediction": predicted_letter, "confidence_score": confidence_score}, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllModels(request):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        models = TrainedModel.objects.all().values("id", "name", "is_active", "precision", "recall", "f1_score", "accuracy", "confusion_matrix", "previous_model")
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({"models": list(models)}, status=status.HTTP_200_OK)

@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def trainNewModel(request):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)

    csv_file = request.FILES.get("file")
    if not csv_file:
        return Response({"error": "No CSV file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        chunk_size = 1000
        file_content = csv_file.read().decode()
        # read the first chunk to get column and label count
        first_chunk = next(pd.read_csv(io.StringIO(file_content), chunksize=chunk_size))
        if "label" not in first_chunk.columns:
            return Response({"error": "CSV must contain 'label' column"}, status=status.HTTP_400_BAD_REQUEST)
        num_classes = first_chunk['label'].nunique()
        timestamp = get_timestamp()
        epochs = int(request.data.get("epochs", 10))

        model_name = f"{timestamp}_model_{num_classes}classes_{epochs}_epochs"
        model_bytes, encoder_bytes, model = train_model_from_csv_chunks(file_content, epochs=epochs, chunk_size=chunk_size)

        # evaluate in low memory
        label_encoder = pickle.loads(encoder_bytes)['label_encoder']
        y_true_all = []
        y_pred_all = []
        unique_labels = set()

        # evaluate in chunks so it stays low memory usage
        for chunk in pd.read_csv(io.StringIO(file_content), chunksize=chunk_size):
            if "label" not in chunk.columns:
                continue
            features = chunk.drop("label", axis=1).values
            if len(features) == 0:
                continue
            try:
                features = features.reshape(-1, 30, 63)
            except Exception:
                continue  # skip malformed chunk
            X_tensor = torch.tensor(features, dtype=torch.float32)
            y_true = chunk["label"].values
            unique_labels.update(y_true)
            model.eval()
            with torch.no_grad():
                outputs = model(X_tensor)
                y_pred_indices = torch.argmax(outputs, dim=1).cpu().numpy()
            y_pred = label_encoder.inverse_transform(y_pred_indices)
            y_true_all.extend(y_true)
            y_pred_all.extend(y_pred)

        # compute metrics
        precision = precision_score(y_true=y_true_all, y_pred=y_pred_all, average="weighted", zero_division=0)
        recall = recall_score(y_true=y_true_all, y_pred=y_pred_all, average="weighted", zero_division=0)
        f1 = f1_score(y_true=y_true_all, y_pred=y_pred_all, average="weighted", zero_division=0)
        accuracy = accuracy_score(y_true=y_true_all, y_pred=y_pred_all)
        conf_matrix = confusion_matrix(y_true=y_true_all, y_pred=y_pred_all).tolist()
        class_report = classification_report(y_true=y_true_all, y_pred=y_pred_all, output_dict=True)
        models_cnt = TrainedModel.objects.count()

        new_model = TrainedModel(
            name=model_name,
            model_file=model_bytes,
            encoder_file=encoder_bytes,
            precision=precision,
            recall=recall,
            f1_score=f1,
            accuracy=accuracy,
            confusion_matrix=conf_matrix,
            classification_report=class_report,
            is_active=(models_cnt == 0)
        )
        new_model.csv_file.save(f"{timestamp}_initial_data.csv", ContentFile(file_content))
        new_model.save()

        #run evaluation
        evaluateModel(model, label_encoder, new_model)  

        # update labels in the database
        for label_name in unique_labels:
            Label.objects.get_or_create(name=label_name)
        labels = Label.objects.filter(name__in=unique_labels)
        new_model.active_labels.set(labels)

        return Response({
            "message": f"Model trained and saved as: {model_name}",
            "total_samples": len(y_true_all),
            "epochs": epochs,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": accuracy,
            "confussion_matrix": conf_matrix,
            "classification_report": class_report,
            "validation_percentage": new_model.validation_percentage
        }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def retrainModelById(request, model_id):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)    

    try:
        existing_model = TrainedModel.objects.get(id=model_id)
    except TrainedModel.DoesNotExist:
        return Response({"error": "Model not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    new_csv_file = request.FILES.get("file")
    if not new_csv_file:
        return Response({"error": "Missing CSV file."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # chunking so it runs on our google cloud
        chunk_size = 1000
        new_file_content = new_csv_file.read().decode("utf-8")
        new_chunks = []
        for chunk in pd.read_csv(io.StringIO(new_file_content), chunksize=chunk_size):
            new_chunks.append(chunk)
        df_new = pd.concat(new_chunks, ignore_index=True)

        if existing_model.csv_file:
            try:
                with existing_model.csv_file.open("rb") as f:
                    old_content = f.read().decode("utf-8")
                    old_chunks = []
                    for chunk in pd.read_csv(io.StringIO(old_content), chunksize=chunk_size):
                        old_chunks.append(chunk)
                    df_old = pd.concat(old_chunks, ignore_index=True)
                df_combined = pd.concat([df_old, df_new], ignore_index=True)
            except Exception as e:
                print(f"Exception thrown in retrainModelById: {str(e)}")
                df_combined = df_new
        else:
            df_combined = df_new

        if "label" not in df_combined.columns:
            return Response({"error": "CSV file missing 'label' column"}, status=status.HTTP_400_BAD_REQUEST)

        train_df, test_df = train_test_split(
            df_combined, test_size=0.2, random_state=42, stratify=df_combined["label"]
        )
        timestamp = get_timestamp()
        num_classes = df_combined['label'].nunique()
        epochs = int(request.data.get("epochs", 10))

        model_name = f"{timestamp}_model_{num_classes}classes_{epochs}_epochs"
        model_bytes, encoder_bytes, model = train_model_from_dataframe(train_df, epochs=epochs)

        x_test = test_df.drop("label", axis=1).values
        x_test = x_test.reshape(-1, 30, 63)
        x_test_tensor = torch.tensor(x_test, dtype=torch.float32)
        y_test = test_df["label"].values
        model.eval()

        with torch.no_grad():
            outputs = model(x_test_tensor)
            y_pred_indices = torch.argmax(outputs, dim=1).cpu().numpy()

        label_encoder = pickle.loads(encoder_bytes)['label_encoder']
        y_pred = label_encoder.inverse_transform(y_pred_indices)

        precision = precision_score(y_true=y_test, y_pred=y_pred, average="weighted", zero_division=0)
        recall = recall_score(y_true=y_test, y_pred=y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_true=y_test, y_pred=y_pred, average="weighted", zero_division=0)
        accuracy = accuracy_score(y_true=y_test, y_pred=y_pred)
        conf_matrix = (confusion_matrix(y_true=y_test, y_pred=y_pred)).tolist()
        class_report = classification_report(y_true=y_test, y_pred=y_pred, output_dict=True)

        new_csv_content = df_combined.to_csv(index=False)

        new_model = TrainedModel(
            name=model_name,
            model_file=model_bytes,
            encoder_file=encoder_bytes,
            precision=precision,
            recall=recall,
            f1_score=f1,
            accuracy=accuracy,
            confusion_matrix=conf_matrix,
            classification_report=class_report,
            previous_model=existing_model
        )
        new_model.csv_file.save(f"{timestamp}_combined_data.csv", ContentFile(new_csv_content))
        new_model.save()

        #run evaluation
        evaluateModel(model, label_encoder, new_model)        

        # update labels in hte database
        label_names = df_combined['label'].unique()
        for label_name in label_names:
            Label.objects.get_or_create(name=label_name)
        labels = Label.objects.filter(name__in=label_names)
        new_model.active_labels.set(labels)

        return Response({
            "message": "Model retrained successfully",
            "new_model_id": new_model.id,
            "total_samples": len(df_combined),
            "epochs": epochs,
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": accuracy,
            "confusion_matrix": conf_matrix,
            "classification_report": class_report,
            "previous_model_id": existing_model.id,
            "validation_percentage": new_model.validation_percentage
        }, status=status.HTTP_201_CREATED)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def selectModelById(request, model_id):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        TrainedModel.objects.update(is_active=False)
        model = TrainedModel.objects.get(id=model_id)
        model.is_active = True
        model.save()

        # update which labels are active
        _, encoder = load_latest_model_and_encoder()
        label_names = encoder['label_encoder'].classes_.tolist()
        labels = Label.objects.filter(name__in=label_names)
        model.active_labels.set(labels)
        return Response({"message": f"Model {model_id} set as active."}, status=status.HTTP_200_OK)

    except TrainedModel.DoesNotExist:
        return Response({"error": "Model not found."}, status=status.HTTP_404_NOT_FOUND)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def deleteModelById(request, model_id):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        model_to_delete = TrainedModel.objects.get(id=model_id)
        previous_model = model_to_delete.previous_model
        TrainedModel.objects.filter(previous_model=model_to_delete).update(previous_model=previous_model)
        model_to_delete.delete()
    except TrainedModel.DoesNotExist:
        return Response({"error": "Model not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"message": f"Model {model_id} deleted."}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getActiveModel(request):
    active = TrainedModel.objects.filter(is_active=True).first()
    active_id = active.id if active else None
    return Response({"active_model_id": active_id}, status=status.HTTP_200_OK)

# TODO remove this later, use "getAllLabels" instead
@api_view(["GET"])
@permission_classes([IsAuthenticated])
# TODO: we should be cacheing this
def getCurrentActiveLabels(request):
    try:
        model, encoder = load_latest_model_and_encoder()
        label_enconder = encoder['label_encoder']
        labels = label_enconder.classes_.tolist()
        return Response({"labels": labels}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getAllLabels(request):
    try:
        active_model = TrainedModel.objects.filter(is_active=True).first()
        active_label_ids = set(active_model.active_labels.values_list("id", flat=True)) if active_model else set()
        labels = Label.objects.all().values("id", "name", "example_image")
        label_list = []
        for label in labels:
            if label["example_image"]:
                request_scheme = request.scheme
                request_host = request.get_host()
                label["example_image"] = f"{request_scheme}://{request_host}/media/{label['example_image']}"
            label["is_active"] = label["id"] in active_label_ids
            label_list.append(label)

        # filter
        active_param = request.query_params.get("active")
        if active_param is not None:
            filtered_labels = []
            if active_param.lower() == "true":
                for label in label_list:
                    if label["is_active"]:
                        filtered_labels.append(label)
                label_list = filtered_labels
            elif active_param.lower() == "false":
                for label in label_list:
                    if not label["is_active"]:
                        filtered_labels.append(label)
                label_list = filtered_labels

        return Response({"labels": label_list}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def uploadLabelImage(request, label_id):
    if not request.user.is_staff:
        return Response(status=status.HTTP_403_FORBIDDEN)
    try:
        label = Label.objects.get(id=label_id)
    except Label.DoesNotExist:
        return Response({"error": "Label not found"}, status=status.HTTP_404_NOT_FOUND)

    image = request.FILES.get("image")
    if not image:
        return Response({"error": "Missing image"}, status=status.HTTP_400_BAD_REQUEST)

    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if image.content_type not in allowed_types:
        return Response({"error": "Only JPEG, PNG, GIF, and WEBP images are allowed."}, status=status.HTTP_400_BAD_REQUEST)

    import os
    ext = os.path.splitext(image.name)[1] or ".jpg"

    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ._")
    label_name = label.name
    safe_chars = []
    for c in label_name:
        if c in allowed_chars:
            safe_chars.append(c)
        else:
            safe_chars.append("_")
    safe_label_name = "".join(safe_chars)
    filename = f"{safe_label_name}{ext}"

    label.example_image.save(filename, image, save=True)

    image_url = None
    if label.example_image:
        image_url = request.build_absolute_uri(label.example_image.url)

    return Response({
        "message": "image processed",
        "label_id": label_id,
        "image_url": image_url
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def getLabelById(request, label_id):
    try:
        label = Label.objects.filter(id=label_id).values("id", "name", "example_image").first()
        if not label:
            return Response({"error": "Label not found"}, status=status.HTTP_404_NOT_FOUND)

        active_model = TrainedModel.objects.filter(is_active=True).first()
        active_label_ids = set(active_model.active_labels.values_list("id", flat=True)) if active_model else set()

        if label["example_image"]:
            request_scheme = request.scheme
            request_host = request.get_host()
            label["example_image"] = f"{request_scheme}://{request_host}/media/{label['example_image']}"
        label["is_active"] = label["id"] in active_label_ids

        return Response(label, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@parser_classes([MultiPartParser])
@permission_classes([IsAuthenticated])
def evaluateModelOnCSV(request):
    csv_file = request.FILES.get("file")
    if not csv_file:
        return Response({"error": "No CSV file uploaded."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        file_content = csv_file.read().decode()
        df = pd.read_csv(io.StringIO(file_content))

        if "label" not in df.columns:
            return Response({"error": "CSV must contain 'label' column"}, status=status.HTTP_400_BAD_REQUEST)

        model, encoder = load_latest_model_and_encoder()
        label_encoder = encoder['label_encoder']

        X = df.drop("label", axis=1).values
        y_true = df["label"].values

        X = X.reshape(-1, 30, 63)
        X_tensor = torch.tensor(X, dtype=torch.float32)

        model.eval()
        with torch.no_grad():
            outputs = model(X_tensor)
            y_pred_indices = torch.argmax(outputs, dim=1).cpu().numpy()

        y_pred = label_encoder.inverse_transform(y_pred_indices)

        precision = precision_score(y_true=y_true, y_pred=y_pred, average="weighted", zero_division=0)
        recall = recall_score(y_true=y_true, y_pred=y_pred, average="weighted", zero_division=0)
        f1 = f1_score(y_true=y_true, y_pred=y_pred, average="weighted", zero_division=0)
        accuracy = accuracy_score(y_true=y_true, y_pred=y_pred)
        conf_matrix = confusion_matrix(y_true=y_true, y_pred=y_pred).tolist()
        class_report = classification_report(y_true=y_true, y_pred=y_pred, output_dict=True)
        labels = label_encoder.classes_.tolist()

        return Response({
            "precision": precision,
            "recall": recall,
            "f1_score": f1,
            "accuracy": accuracy,
            "confusion_matrix": conf_matrix,
            "classification_report": class_report,
            "labels": labels,
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({"error": f"{str(e)}, the input dataset must be 30 x 63"}, status=status.HTTP_400_BAD_REQUEST)

def evaluateModel(model, label_encoder, new_model):
    # validation testing 
    base_path = os.path.dirname(__file__)
    validation_path = os.path.join(base_path, 'fixtures', 'validation')

    correct_cnt = 0
    total_cnt = 0

    if os.path.exists(validation_path):
        for entry in os.scandir(validation_path):
            if entry.is_file():
                with open(entry.path, 'rb') as f:
                    file_content = f.read().decode()
                    df_validation = pd.read_csv(io.StringIO(file_content))

                    X = df_validation.drop("label", axis=1).values
                    y_true = df_validation["label"].values

                    X = X.reshape(-1, 30, 630)
                    X_tensor = torch.tensor(X, dtype=torch.float32)

                    model.eval()
                    with torch.no_grad():
                        outputs = model(X_tensor)
                        y_pred_indices = torch.argmax(outputs, dim=1).cpu().numpy()

                    y_pred = label_encoder.inverse_transform(y_pred_indices)
                    
                    correct_cnt += np.sum(y_pred == y_true)
                    total_cnt += len(y_true)

    if total_cnt > 0:
        new_model.validation_percentage = correct_cnt / total_cnt
        new_model.save()