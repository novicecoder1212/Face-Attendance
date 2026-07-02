import cv2
import time

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Camera 0 cannot be opened.")
else:
    print("Camera 0 opened successfully.")
    for i in range(5):
        ret, frame = cap.read()
        if ret:
            print(f"Frame {i} shape: {frame.shape}, mean pixel value: {frame.mean()}")
        else:
            print(f"Failed to read frame {i}")
        time.sleep(0.5)
cap.release()
