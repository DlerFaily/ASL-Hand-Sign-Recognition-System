import os
import pickle
from datetime import datetime

import pandas as pd
import torch
import torch.nn as nn
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from torch.utils.data import DataLoader, Dataset

# config
EPOCHS = 12
BATCH_SIZE = 32
TEST_SIZE = 0.2
MODELS_DIR = "models"
SEQ_LEN = 30
FRAME_FEATURES = 630
INPUT_SIZE = FRAME_FEATURES
HIDDEN_SIZE = 128
NUM_LAYERS = 1

os.makedirs(MODELS_DIR, exist_ok=True)


# dataset
class GestureDataset(Dataset):
    def __init__(self, X, y):
        # convert input features to PyTorch tensor type float32
        self.X = torch.tensor(X, dtype=torch.float32)
        # convert labels to PyTorch tensor type long (for classification)
        self.y = torch.tensor(y, dtype=torch.long)

    def __len__(self):
        # return the number of samples in the dataset
        return len(self.X)

    def __getitem__(self, idx):
        # get the features and label for the sample at index idx
        x_item = self.X[idx]
        y_item = self.y[idx]
        return x_item, y_item


# model
class GestureLSTM(nn.Module):
    def __init__(self, input_size, hidden_size, num_classes, num_layers=1):
        # call the parent class (nn.Module) constructor
        super().__init__()
        # create an LSTM layer
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            batch_first=True,
            num_layers=num_layers,
        )
        # create a fully connected layer for classification
        self.fc = nn.Linear(hidden_size, num_classes)

    def forward(self, x):
        # pass the input through the LSTM layer
        lstm_output, _ = self.lstm(x)
        # take the output from the last time step
        last_time_step = lstm_output[:, -1, :]
        # pass the last time step output through the fully connected layer
        output = self.fc(last_time_step)
        return output


def load_data(csv_path):
    # read the CSV file into a pandas DataFrame
    data = pd.read_csv(csv_path)
    # get all columns except the last one as features
    feature_columns = data.columns[:-1]
    features = data[feature_columns].values
    # reshape features to have shape (number of samples, sequence length, features per frame)
    features = features.reshape(-1, SEQ_LEN, FRAME_FEATURES)
    # get the last column as labels
    label_column = data.columns[-1]
    labels = data[label_column].values
    return features, labels


def encode_labels(labels):
    # create a label encoder object
    encoder = LabelEncoder()
    # fit the encoder to the labels and transform them into numbers
    labels_encoded = encoder.fit_transform(labels)
    # return the encoded labels and the encoder object
    return labels_encoded, encoder


def get_data_loaders(features, labels_encoded):
    X_train, X_test, y_train, y_test = train_test_split(
        features, labels_encoded, test_size=TEST_SIZE, random_state=42
    )
    # create the training data loader
    train_dataset = GestureDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)

    # create the testing data loader
    test_dataset = GestureDataset(X_test, y_test)
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE)

    # count the number of unique classes
    num_classes = len(set(labels_encoded))
    return train_loader, test_loader, num_classes


def train(model, train_loader, criterion, optimizer, epochs):
    # set the model to training mode
    model.train()
    # loop over each epoch
    for epoch in range(epochs):
        # loop over each batch of data
        for X_batch, y_batch in train_loader:
            # clear previous gradients
            optimizer.zero_grad()
            # make predictions using the model
            outputs = model(X_batch)
            # calculate the loss between predictions and true labels
            loss = criterion(outputs, y_batch)
            # compute gradients for all model parameters
            loss.backward()
            # update model parameters using the optimizer
            optimizer.step()

        print("Epoch {}/{} - Loss: {:.4f}".format(epoch + 1, epochs, loss.item()))


def save_model_and_encoder(model, encoder, num_classes, epochs):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    model_path = (
        MODELS_DIR
        + "/gesture_lstm_"
        + str(num_classes)
        + "classes_"
        + str(epochs)
        + "epochs_"
        + timestamp
        + ".pt"
    )
    torch.save(model.state_dict(), model_path)
    print("Saved:", model_path)

    encoder_path = model_path.replace(".pt", "_label_encoder.pkl")
    with open(encoder_path, "wb") as f:
        pickle.dump(encoder, f)
    print("Saved label encoder:", encoder_path)


def main():
    features, labels = load_data("landmarks.csv")
    labels_encoded, label_encoder = encode_labels(labels)

    train_loader, test_loader, num_classes = get_data_loaders(features, labels_encoded)
    model = GestureLSTM(INPUT_SIZE, HIDDEN_SIZE, num_classes, num_layers=NUM_LAYERS)

    # set loss function
    criterion = nn.CrossEntropyLoss()

    # set optimizer
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    train(model, train_loader, criterion, optimizer, EPOCHS)
    save_model_and_encoder(model, label_encoder, num_classes, EPOCHS)


if __name__ == "__main__":
    main()
