import tempfile
import pickle
import torch
import numpy as np
import math
import io # <-- ADDED for in-memory handling

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

def load_model_and_encoder_from_obj(obj):
    if obj is None:
        raise Exception("Model object not found.")

    # Use in-memory loading (io.BytesIO and pickle.loads) to avoid file locking ---
    
    # Load the encoder directly from binary data using pickle.loads (no temporary file)
    encoder = pickle.loads(obj.encoder_file)
    
    # Set up the model binary data as an in-memory file stream
    model_buffer = io.BytesIO(obj.model_file)
    
    if isinstance(encoder, dict):
        INPUT_SIZE = encoder.get('input_size')
        NUM_CLASSES = encoder.get('num_classes')
    else:
        INPUT_SIZE = getattr(encoder, 'input_size', None)
        NUM_CLASSES = getattr(encoder, 'num_classes', None)

    if INPUT_SIZE is None or NUM_CLASSES is None:
        raise Exception("input_size or num_classes not found in encoder.")

    # Load the model using the in-memory buffer
    model = torch.load(model_buffer, map_location=torch.device('cpu'))
        
    if isinstance(model, dict):
        model_instance = GestureLSTM(input_size=INPUT_SIZE, num_classes=NUM_CLASSES)
        model_instance.load_state_dict(model)
        model = model_instance
        
    return model, encoder

def load_latest_model_and_encoder():
    from .models import TrainedModel
    obj = TrainedModel.objects.filter(is_active=True).first()
    if obj is None:
        raise Exception("No active model found.")
    return load_model_and_encoder_from_obj(obj)

def load_active_model_and_encoder():
    from .models import TrainedModel
    obj = TrainedModel.objects.filter(is_active=True).first()
    if obj is None:
        raise Exception("No active model found.")
    return load_model_and_encoder_from_obj(obj)

def load_model_and_encoder_by_id(model_id):
    from .models import TrainedModel
    obj = TrainedModel.objects.filter(id=model_id).first()
    if obj is None:
        raise Exception(f"Model with id {model_id} not found.")
    return load_model_and_encoder_from_obj(obj)

def prep_data_for_model(coords):
    sequence = []
    for frame in coords:
        landmarks = []
        for i in range(0, len(frame), 3):
            landmarks.append((frame[i], frame[i+1], frame[i+2]))

        # defining reference point for wrist and knuckle of middle finger
        wrist_x, wrist_y, wrist_z = landmarks[0]
        middle_x, middle_y, middle_z = landmarks[9]

        # defining scale by calculating euclidean distance
        scale = math.sqrt((middle_x - wrist_x)**2 + (middle_y - wrist_y)**2 + (middle_z - wrist_z)**2)
        # check so that we dont accidentally divide by 0 if the detection fails
        if scale == 0:
            scale = 1.0

        normalized_frame = []
        for i in range(21):
            ix, iy, iz = landmarks[i]

            nx = (ix - wrist_x) / scale 
            ny = (iy - wrist_y) / scale 
            nz = (iz - wrist_z) / scale 

            normalized_frame.extend([nx, ny, nz])
        sequence.append(normalized_frame)
    return np.array(sequence)