# train_model.py
# Final Modified Version
# Works with recognize.py
# Saves face_data.pkl
# Uses InsightFace + OpenCV

import os
import cv2
import pickle
import numpy as np
from insightface.app import FaceAnalysis

# -----------------------------------
# INPUT NAME
# -----------------------------------
person_name = input("Enter the name to train: ").strip()

# -----------------------------------
# TRAINING FOLDER
# -----------------------------------
folder_path = os.path.join("TrainingImage", person_name)

if not os.path.exists(folder_path):
    print("❌ Folder not found:", folder_path)
    exit()

# -----------------------------------
# LOAD INSIGHTFACE MODEL
# -----------------------------------
app = FaceAnalysis(name="buffalo_l")
app.prepare(ctx_id=-1, det_size=(320, 320))   # CPU Fast mode

print("✅ InsightFace model initialized.")
print("🧠 Training on folder:", folder_path)

# -----------------------------------
# LOAD OLD DATA IF EXISTS
# -----------------------------------
database = {}

if os.path.exists("face_data.pkl"):
    with open("face_data.pkl", "rb") as f:
        database = pickle.load(f)

# -----------------------------------
# EXTRACT EMBEDDINGS
# -----------------------------------
embeddings = []

for file in os.listdir(folder_path):

    if file.lower().endswith((".jpg", ".jpeg", ".png")):

        img_path = os.path.join(folder_path, file)
        img = cv2.imread(img_path)

        if img is None:
            continue

        faces = app.get(img)

        if len(faces) > 0:
            emb = faces[0].embedding
            embeddings.append(emb)

# -----------------------------------
# CHECK FACE FOUND
# -----------------------------------
if len(embeddings) == 0:
    print("❌ No face detected in images.")
    exit()

# -----------------------------------
# AVERAGE EMBEDDING
# -----------------------------------
avg_embedding = np.mean(embeddings, axis=0)

# Save / Update person
database[person_name] = avg_embedding

# -----------------------------------
# SAVE FILE
# -----------------------------------
with open("face_data.pkl", "wb") as f:
    pickle.dump(database, f)

print("✅ Training complete for", person_name)
print("✅ Saved as face_data.pkl")