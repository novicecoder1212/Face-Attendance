import cv2

print("Starting camera test...")

cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

if not cap.isOpened():
    print("❌ Camera not working")
else:
    print("✅ Camera working")

while True:
    ret, frame = cap.read()
    
    if not ret:
        print("❌ Failed to grab frame")
        break

    cv2.imshow("Camera Test", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Program ended")