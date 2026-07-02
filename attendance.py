import cv2
import numpy as np
import pickle
from datetime import datetime
from insightface.app import FaceAnalysis
import os

# -------------------------------
# Load embeddings
# -------------------------------
with open("TrainingImageLabel/insightface_embeddings.pkl", "rb") as f:
    data = pickle.load(f)

embeddings = np.array(data["embeddings"])
names = np.array(data["names"])

# -------------------------------
# Initialize InsightFace
# -------------------------------
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640))
print("✅ InsightFace model initialized")

# -------------------------------
# Setup CSV file with column names
# -------------------------------
attendance_file = "Attendance.csv"

# Create file with headers if not exists
if not os.path.exists(attendance_file):
    with open(attendance_file, 'w') as f:
        f.write("ID,Name,Date_Time\n")  # column headers

# -------------------------------
# Function to mark attendance
# -------------------------------
def mark_attendance(full_name):
    # Assume folder name format: "12345_Soumik"
    if "_" in full_name:
        id_part, name_part = full_name.split("_", 1)
    else:
        id_part, name_part = "N/A", full_name

    with open(attendance_file, 'r+', newline='') as f:
        existing_data = f.readlines()
        ids_list = [line.split(',')[0] for line in existing_data]

        if id_part not in ids_list:
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"{id_part},{name_part},{now}\n")
            print(f"✅ Attendance marked for {name_part} (ID: {id_part})")

# -------------------------------
# Start Webcam
# -------------------------------
cam = cv2.VideoCapture(0)
print("🎥 Press 'q' to quit")

while True:
    ret, frame = cam.read()
    if not ret:
        break

    faces = app.get(frame)
    for face in faces:
        emb = face.embedding
        similarities = np.dot(embeddings, emb) / (
            np.linalg.norm(embeddings, axis=1) * np.linalg.norm(emb)
        )
        best_idx = np.argmax(similarities)
        best_score = similarities[best_idx]

        # Threshold for matching
        if best_score > 0.4:
            full_name = names[best_idx]
            color = (0, 255, 0)
            mark_attendance(full_name)

            # Display only ID above box
            display_name = full_name.split("_")[1] if "_" in full_name else full_name
            text_to_show = f"{display_name}"
        else:
            text_to_show = "Unknown"
            color = (0, 0, 255)

        # Draw bounding box and ID
        x1, y1, x2, y2 = face.bbox.astype(int)
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(frame, text_to_show, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    cv2.imshow("InsightFace Attendance System", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cam.release()
cv2.destroyAllWindows()
