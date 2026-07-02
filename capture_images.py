import cv2
import os

# Ask name
person_name = input("Enter your name: ").strip()

# Create folder
dataset_path = os.path.join("TrainingImage", person_name)
os.makedirs(dataset_path, exist_ok=True)

# Start camera
cam = cv2.VideoCapture(0, cv2.CAP_DSHOW)
count = 0

print("📸 Capturing images... Look at camera")
print("Press 'q' to stop")

while True:
    ret, frame = cam.read()
    if not ret:
        continue

    cv2.imshow("Capture Images", frame)

    # Save every 10th frame
    if count % 10 == 0:
        img_name = os.path.join(dataset_path, f"{person_name}_{count}.jpg")
        cv2.imwrite(img_name, frame)
        print(f"Saved: {img_name}")

    count += 1

    # Stop after 50 images OR press q
    if count > 200 or cv2.waitKey(1) & 0xFF == ord('q'):
        break

cam.release()
cv2.destroyAllWindows()

print("✅ Image capture complete!")