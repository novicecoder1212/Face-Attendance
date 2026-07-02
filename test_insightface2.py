import cv2
import numpy as np
from insightface.app import FaceAnalysis

img_path = r"TrainingImage\11500122042_Jayita_Chatterjee\11500122042_Jayita_Chatterjee_1.jpg"

app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))

img = cv2.imread(img_path)
if img is not None:
    print(f"Image shape: {img.shape}")
    faces = app.get(img)
    print(f"Faces detected in BGR: {len(faces)}")
    
    # Test RGB
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    faces_rgb = app.get(rgb)
    print(f"Faces detected in RGB: {len(faces_rgb)}")
else:
    print("Failed to read image.")
