import cv2

for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, frame = cap.read()
        if ret:
            print(f"Camera index {i} opened. Frame shape: {frame.shape}, mean pixel: {frame.mean():.2f}")
        else:
            print(f"Camera index {i} opened, but failed to read frame.")
        cap.release()
    else:
        print(f"Camera index {i} could not be opened.")
