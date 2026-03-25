import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import tempfile
import pickle
import pandas as pd
import io

SEQ_LEN = 30
FRAME_FEATURES = 63
INPUT_SIZE = FRAME_FEATURES
HIDDEN_SIZE = 128
NUM_LAYERS = 1

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
        return self.X[idx], self.y[idx]

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

def train_model_from_dataframe(df, epochs=12, batch_size=32, test_size=0.2):
    #--validation--

    # check for NaNs
    if df.isnull().values.any():
        raise ValueError("Input dataframe contains NaNs, data needs to be cleaned.")
    
    # check if empty dataframe
    if df.empty:
        raise ValueError("Input dataframe is empty")
    
    # check if dataframe contains correct amount of columns
    expected_features = SEQ_LEN * FRAME_FEATURES
    if len(df.columns) != expected_features + 1:
        raise ValueError(f"Expected {expected_features + 1} columns, got {len(df.columns)} columns.")
    
    # get all columns except the last one as features
    feature_columns = df.columns[:-1]
    features = df[feature_columns].values
    # reshape features to have shape (number of samples, sequence length, features per frame)
    features = features.reshape(-1, SEQ_LEN, FRAME_FEATURES)
    # get the last column as labels
    labels = df[df.columns[-1]].values

    # create a label encoder object
    label_encoder = LabelEncoder()
    # fit the encoder to the labels and transform them into numbers
    labels_num = label_encoder.fit_transform(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        features, labels_num, test_size=test_size, random_state=42, shuffle=True
    )

    num_classes = len(label_encoder.classes_)
    # create the training data loader
    train_dataset = GestureDataset(X_train, y_train)
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)

    model = GestureLSTM(INPUT_SIZE, HIDDEN_SIZE, num_classes, num_layers=NUM_LAYERS)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    model.train()
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

    # save model
    with tempfile.NamedTemporaryFile(suffix='.pt') as tmp:
        torch.save(model.state_dict(), tmp)
        tmp.seek(0)
        model_bytes = tmp.read()

    encoder_package = {
        'label_encoder': label_encoder,
        'input_size': INPUT_SIZE,
        'num_classes': num_classes,
    }
    encoder_bytes = pickle.dumps(encoder_package)

    return model_bytes, encoder_bytes, model

def train_model_from_csv_chunks(csv_content, epochs=12, batch_size=32, chunk_size=1000):
    # fit label encoder for all labels
    label_values = []
    for chunk in pd.read_csv(io.StringIO(csv_content), chunksize=chunk_size):
        if "label" not in chunk.columns:
            raise ValueError("CSV must contain 'label' column")
        label_values.extend(chunk["label"].values)
    label_encoder = LabelEncoder()
    label_encoder.fit(label_values)
    num_classes = len(label_encoder.classes_)

    # init model, loss, and optimizer
    model = GestureLSTM(INPUT_SIZE, HIDDEN_SIZE, num_classes, num_layers=NUM_LAYERS)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

    # train incrementally on each chunk
    for epoch in range(epochs):
        for chunk in pd.read_csv(io.StringIO(csv_content), chunksize=chunk_size):
            if "label" not in chunk.columns:
                continue
            feature_columns = chunk.columns[:-1]
            features = chunk[feature_columns].values
            if len(features) == 0:
                continue
            try:
                features = features.reshape(-1, SEQ_LEN, FRAME_FEATURES)
            except Exception:
                continue  # skip if chunk malformed
            labels = chunk["label"].values
            y = label_encoder.transform(labels)
            train_dataset = GestureDataset(features, y)
            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
            model.train()
            for X_batch, y_batch in train_loader:
                optimizer.zero_grad()
                outputs = model(X_batch)
                loss = criterion(outputs, y_batch)
                loss.backward()
                optimizer.step()

    # save model
    with tempfile.NamedTemporaryFile(suffix='.pt') as tmp:
        torch.save(model.state_dict(), tmp)
        tmp.seek(0)
        model_bytes = tmp.read()

    encoder_package = {
        'label_encoder': label_encoder,
        'input_size': INPUT_SIZE,
        'num_classes': num_classes,
    }
    encoder_bytes = pickle.dumps(encoder_package)

    return model_bytes, encoder_bytes, model