import cv2
import numpy as np
from insightface.app import FaceAnalysis

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

# Create a dummy image (e.g., random noise or load an existing one if available)
# Actually, let's see if we can find any image in the project
import os
img_path = 'bppimt_logo.jpg'
if os.path.exists(img_path):
    img = cv2.imread(img_path)
    faces = app.get(img)
    print(f"Faces in {img_path} (BGR): {len(faces)}")
else:
    print("No test image found.")
