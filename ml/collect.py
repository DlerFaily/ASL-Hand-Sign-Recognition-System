import csv
import math
import os

import cv2
import mediapipe as mp
import numpy as np

# config
OUTPUT_FILE = "landmarks.csv"
SEQ_LEN = 30


def get_label():
    return input("Enter the landmark name:")


# TODO: kamil: another approach is to duplicate frames
# I found that the below apporach is recommended more
# but the frame duplication is also used for some stuff
# so i think we should try both and see which one works best
def interpolate_sequence(sequence, target_len):
    seq_array = np.array(sequence)
    current_len = len(seq_array)
    if current_len == target_len:
        return sequence

    # calculate the positions in the original sequence for each target frame
    target_positions = np.linspace(0, current_len - 1, target_len)
    interpolated_sequence = []

    for pos in target_positions:
        # find the two frames to interpolate between
        lower_index = int(np.floor(pos))
        upper_index = min(int(np.ceil(pos)), current_len - 1)
        weight = pos - lower_index

        # get the two frames
        lower_frame = seq_array[lower_index]
        upper_frame = seq_array[upper_index]

        # interpolate between the two frames
        interpolated_frame = (1 - weight) * lower_frame + weight * upper_frame

        # convert the interpolated frame to a list and add to the result
        interpolated_sequence.append(interpolated_frame.tolist())

    return interpolated_sequence


def prepare_csv(output_file, seq_len):
    # check if file already exists
    if not os.path.exists(output_file):
        with open(output_file, "w", newline="") as f:
            writer = csv.writer(f)
            header = []

            for frame in range(seq_len):
                # for each landmark point
                for i in range(21):
                    # for each pair of landmark points (i, j)
                    j = i + 1
                    while j < 21:
                        header.append(f"frame{frame}_dx_{i}_{j}")
                        header.append(f"frame{frame}_dy_{i}_{j}")
                        header.append(f"frame{frame}_dz_{i}_{j}")
                        j += 1

            # add the label column at the end
            header.append("label")
            writer.writerow(header)


def extract_landmark_vectors(hand_landmarks):
    # get the coordinates for each landmark
    coords = []
    for lm in hand_landmarks.landmark:
        coords.append((lm.x, lm.y, lm.z))

    vectors = []

    # calculate the width of the hand using two specific landmarks (that is why it is 5 and 17)
    p1 = coords[5]
    p2 = coords[17]
    hand_width = math.sqrt(
        (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2
    )

    # for each landmark point
    for i in range(21):
        xi = coords[i][0]
        yi = coords[i][1]
        zi = coords[i][2]
        # for each other landmark point after i
        for j in range(i + 1, 21):
            xj = coords[j][0]
            yj = coords[j][1]
            zj = coords[j][2]
            # calculate the difference and normalize by hand width
            dx = (xj - xi) / hand_width
            dy = (yj - yi) / hand_width
            dz = (zj - zi) / hand_width
            vectors.append(dx)
            vectors.append(dy)
            vectors.append(dz)

    return vectors


def save_sequence(sequence_buffer, label, output_file):
    # flatten the sequence_buffer (which is a list of lists) into a single list
    flattened = []
    for frame_vec in sequence_buffer:
        for value in frame_vec:
            flattened.append(value)
    # save the flattened list and the label to the CSV
    with open(output_file, "a", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(flattened + [label])


def process_sequence(sequence_buffer, seq_len):
    buffer_len = len(sequence_buffer)

    # if the buffer is shorter than needed, interpolate to the required length
    if buffer_len > 0 and buffer_len < seq_len:
        sequence_buffer = interpolate_sequence(sequence_buffer, seq_len)
        print("Interpolated sequence to", seq_len, "frames.")

    # if the buffer is longer than needed, downsample to the required length
    elif buffer_len > seq_len and buffer_len <= 2 * seq_len:
        step = buffer_len / seq_len
        indices = []
        for i in range(seq_len):
            index = int(i * step)
            indices.append(index)
        new_buffer = []
        for idx in indices:
            new_buffer.append(sequence_buffer[idx])
        sequence_buffer = new_buffer
        print("Downsampled sequence to", seq_len, "frames.")

    # if the buffer is too long, reject it
    elif buffer_len > 2 * seq_len:
        print("Too many frames (", buffer_len, "). Please try again.")
        return []

    return sequence_buffer


def main():
    label = get_label()
    prepare_csv(OUTPUT_FILE, SEQ_LEN)

    mp_hands = mp.solutions.hands
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    mp_draw = mp.solutions.drawing_utils
    cap = cv2.VideoCapture(0)

    print("Press SPACE to start/stop recording")
    print("Press ESC to quit")

    counter = 0
    prev_space_pressed = False
    recording = False
    sequence_buffer = []

    while True:
        ret, frame = cap.read()
        if not ret:
            print("Failed to grab frame")
            break

        img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(img_rgb)
        landmark_vectors = None

        # if hand landmarks are detected extract them
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                landmark_vectors = extract_landmark_vectors(hand_landmarks)

        # show status on the frame
        status_text = "Label: {} | Sample: {} | Frames: {} | {}".format(
            label, counter, len(sequence_buffer), "REC" if recording else ""
        )
        color = (0, 255, 0) if not recording else (0, 0, 255)
        cv2.rectangle(frame, (0, 0), (1200, 60), (0, 0, 0), -1)
        cv2.putText(
            frame,
            status_text,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            color,
            2,
            cv2.LINE_AA,
        )

        cv2.imshow("collectdata", frame)
        key = cv2.waitKey(1) & 0xFF
        space_pressed = key == 32

        if space_pressed and not prev_space_pressed:
            if not recording:
                recording = True
                sequence_buffer = []
                print("\nRecording started.")
            else:
                recording = False
                print("\nRecording stopped.")
                sequence_buffer = process_sequence(sequence_buffer, SEQ_LEN)
                # automatically discard if too many frames
                if len(sequence_buffer) == 0 and len(sequence_buffer) != SEQ_LEN:
                    discard_text = "Too many frames (>60). Sequence discarded."
                    temp_frame = frame.copy()

                    cv2.rectangle(temp_frame, (0, 60), (1200, 120), (0, 0, 0), -1)
                    cv2.putText(
                        temp_frame,
                        discard_text,
                        (20, 105),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2,
                        (0, 0, 255),
                        3,
                        cv2.LINE_AA,
                    )
                    cv2.imshow("collectdata", temp_frame)
                    print("Too many frames (>60). Sequence discarded.")
                    cv2.waitKey(1000)
                    sequence_buffer = []
                else:
                    prompt_text = "Press 'd' to discard, any other key to save."
                    temp_frame = frame.copy()
                    cv2.rectangle(temp_frame, (0, 60), (1200, 120), (0, 0, 0), -1)
                    cv2.putText(
                        temp_frame,
                        prompt_text,
                        (20, 105),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1.2,
                        (255, 255, 0),
                        3,
                        cv2.LINE_AA,
                    )
                    cv2.imshow("collectdata", temp_frame)
                    print("Press 'd' to discard, any other key to save.")
                    key2 = cv2.waitKey(0) & 0xFF
                    if key2 == ord("d"):
                        print("Sequence discarded.")
                        discard_text = "Sequence discarded."
                        cv2.rectangle(temp_frame, (0, 120), (1200, 180), (0, 0, 0), -1)
                        cv2.putText(
                            temp_frame,
                            discard_text,
                            (20, 165),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            1.2,
                            (0, 0, 255),
                            3,
                            cv2.LINE_AA,
                        )
                        cv2.imshow("collectdata", temp_frame)
                        cv2.waitKey(500)
                        sequence_buffer = []
                    elif len(sequence_buffer) == SEQ_LEN:
                        save_sequence(sequence_buffer, label, OUTPUT_FILE)
                        print(
                            "Saved sequence for label:",
                            label,
                            "Sample number:",
                            counter,
                        )
                        counter += 1
                        sequence_buffer = []
                    else:
                        print(
                            "Need",
                            SEQ_LEN,
                            "frames, currently have",
                            len(sequence_buffer),
                        )

        if recording and landmark_vectors is not None:
            sequence_buffer.append(landmark_vectors)

        print(
            "Current label:",
            label,
            "| Sample number:",
            counter,
            "| Frames:",
            len(sequence_buffer),
            "|",
            "RECORDING" if recording else "",
            end="\r",
        )

        prev_space_pressed = space_pressed

        # ESC to quit
        if key == 27:
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
