import cv2
import os
from insightface.app import FaceAnalysis

# -------------------------------
# Configuration
# -------------------------------
person_id = input("Enter your university ID and Name(univid_name): ").strip()

output_dir = os.path.join("TrainingImage", person_id)
os.makedirs(output_dir, exist_ok=True)

target_count = 50
count = 0

# -------------------------------
# Initialize InsightFace
# -------------------------------
app = FaceAnalysis(name='buffalo_l')
app.prepare(ctx_id=0, det_size=(640, 640))
print("✅ InsightFace detector ready.")
print("🎥 Press 'q' to quit early.")

# -------------------------------
# Start webcam
# -------------------------------
cam = cv2.VideoCapture(0)
if not cam.isOpened():
    print("❌ Error: Could not open camera.")
    exit()

while True:
    ret, frame = cam.read()
    if not ret:
        print("❌ Failed to capture frame.")
        break

    # Detect faces
    faces = app.get(frame)

    if len(faces) > 0:
        # Take first face for indication
        face = faces[0]
        x1, y1, x2, y2 = map(int, face.bbox)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Save the full frame (not cropped)
        count += 1
        img_name = os.path.join(output_dir, f"{person_id}_{count}.jpg")
        cv2.imwrite(img_name, frame)
        print(f"✅ Captured image {count}/{target_count}")

        # Show capture progress
        cv2.putText(frame, f"Captured: {count}/{target_count}", (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    else:
        # No face detected — show warning
        cv2.putText(frame, "No face detected!", (30, 50),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

    cv2.imshow("Capture Faces - InsightFace", frame)

     # Stop on keypress or target reached
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("🛑 Exiting early.")
        break
    if count >= target_count:
        print("✅ 50 clear images captured.")
        break

cam.release()
cv2.destroyAllWindows()
print(f"📁 Saved all images in: {output_dir}")

