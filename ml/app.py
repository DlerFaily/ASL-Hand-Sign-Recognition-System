import argparse
import math
import os
import pickle

import cv2
import mediapipe as mp
import numpy as np
import torch


def list_models(models_path):
    # find all files with .pt extension
    model_files = []
    for filename in os.listdir(models_path):
        if filename.endswith(".pt"):
            model_files.append(filename)
    # sort files by last modified time (so newest first)
    model_files.sort(
        key=lambda filename: os.path.getmtime(os.path.join(models_path, filename)),
        reverse=True,
    )
    return model_files


def select_model(model_files):
    print("Available models:")
    for number, filename in enumerate(model_files, start=1):
        print(f"{number}: {filename}")

    # prompt the user to choose a model by typing in its number
    choice = input(f"Select model by number (1-{len(model_files)}): ")
    try:
        # convert the user's input to an index (minus 1 because lists start at 0)
        index = int(choice) - 1
        # check if index is valid
        if index < 0 or index >= len(model_files):
            raise ValueError
    except ValueError:
        print("Invalid selection.")
        exit(1)
    # return the filename of the selected model
    return model_files[index]


def load_label_encoder(models_path, model_file):
    encoder_file = model_file.replace(".pt", "_label_encoder.pkl")
    encoder_path = os.path.join(models_path, encoder_file)
    with open(encoder_path, "rb") as f:
        label_encoder = pickle.load(f)
    return label_encoder


class GestureLSTM(torch.nn.Module):
    def __init__(self, input_size, hidden_size=128, num_layers=1, num_classes=1):
        super().__init__()
        # LSTM layer, it learns patterns from sequences
        self.lstm = torch.nn.LSTM(input_size, hidden_size, num_layers, batch_first=True)
        # fully connected layer, it converts the LSTM output to class scores
        self.fc = torch.nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        # pass the input data through the LSTM layer
        lstm_output, _ = self.lstm(x)
        # take only the last output from the sequence
        last_output = lstm_output[:, -1, :]
        # pass the last output through the fully connected layer to get predictions
        predictions = self.fc(last_output)
        return predictions


def load_model(model_path, num_classes):
    # load model weights from the file
    state_dict = torch.load(model_path, map_location="cpu")
    # figure out the input size from the weights
    input_size = state_dict["lstm.weight_ih_l0"].shape[1]
    # create a new GestureLSTM model with correct input and output sizes
    model = GestureLSTM(input_size=input_size, num_classes=num_classes)
    # load the saved weights into the model
    model.load_state_dict(state_dict)
    # set the model to evaluation mode (not training)
    model.eval()
    return model, input_size


def extract_hand_vectors(hand_landmarks):
    # get the x, y, z coordinates for each landmark on the hand
    coords = []
    for lm in hand_landmarks.landmark:
        coords.append((lm.x, lm.y, lm.z))
    # find the distance between two key points to measure hand width
    p1, p2 = coords[5], coords[17]
    hand_width = math.sqrt(sum((a - b) ** 2 for a, b in zip(p2, p1)))
    vectors = []
    # for every pair of landmarks, calculate the difference in position
    for i in range(21):
        xi, yi, zi = coords[i]
        for j in range(i + 1, 21):
            xj, yj, zj = coords[j]
            vectors.extend(
                [(xj - xi) / hand_width, (yj - yi) / hand_width, (zj - zi) / hand_width]
            )
    # return all the vectors as a numpy array
    return np.array(vectors)


def main():
    parser = argparse.ArgumentParser(description="Dynamic gesture classifier app.")
    parser.add_argument(
        "--models_dir",
        type=str,
        default="models",
        help="Directory containing models (default: models)",
    )
    parser.add_argument(
        "--seq_len",
        type=int,
        default=100,
        help="Number of frames per sequence (default: 100)",
    )
    args = parser.parse_args()

    models_path = args.models_dir
    seq_len = args.seq_len

    # find available models and let the user pick one
    model_files = list_models(models_path)
    if not model_files:
        print("No models found in the 'models' folder.")
        exit(1)
    model_file = select_model(model_files)
    model_path = os.path.join(models_path, model_file)

    # load the label encoder and model
    label_encoder = load_label_encoder(models_path, model_file)
    classes = list(label_encoder.classes_)
    print("Loaded classes:", classes)
    model, input_size = load_model(model_path, num_classes=len(classes))

    # set up MediaPipe for hand tracking
    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    mp_draw = mp.solutions.drawing_utils

    # start video capture from the webcam
    cap = cv2.VideoCapture(0)
    print("Press SPACE to start/stop gesture capture. ESC to exit.")

    sequence = []
    capturing = False
    predicted_letter = ""
    confidence_score = 0.0

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)

        key = cv2.waitKey(1) & 0xFF
        # ESC to exit
        if key == 27:
            break
        # SPACE to start/stop capturing
        elif key == 32:
            capturing = not capturing
            if not capturing and sequence:
                # run prediction when stopped
                sample = np.stack(sequence)
                sample = torch.tensor(sample, dtype=torch.float32).unsqueeze(0)
                with torch.no_grad():
                    outputs = model(sample)
                    probs = torch.nn.functional.softmax(outputs, dim=1)[0]
                    class_id = int(torch.argmax(probs))
                    predicted_letter = classes[class_id]
                    confidence_score = float(probs[class_id])
                sequence = []

        # if hand is detected and capturing, save hand vectors
        if results.multi_hand_landmarks and capturing:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                vectors = extract_hand_vectors(hand_landmarks)
                sequence.append(vectors)
                # keep only the last seq_len of frames
                if len(sequence) > seq_len:
                    sequence.pop(0)

        # show prediction and status on the video
        cv2.rectangle(frame, (0, 0), (600, 140), (0, 0, 0), -1)
        display_text = f"Pred: {predicted_letter} ({confidence_score:.2f})"
        text_color = (0, 255, 0) if confidence_score > 0.8 else (0, 0, 255)
        cv2.putText(
            frame, display_text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.3, text_color, 3
        )
        status_text = "Capturing..." if capturing else "Press SPACE to capture"
        cv2.putText(
            frame,
            status_text,
            (20, 90),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (255, 255, 0),
            2,
        )

        cv2.imshow("app", frame)

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
