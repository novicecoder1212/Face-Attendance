# # recognize.py
# # Reliable blink detection using OpenCV eye-state transition
# # Shows:
# #   NAME
# #   LIVE VERIFIED   (after real blink)
# #   NOT VERIFIED    (before blink)
# #   UNKNOWN         (if not recognized)

# import cv2
# import os
# import pickle
# import numpy as np
# from insightface.app import FaceAnalysis

# # ===============================
# # LOAD TRAINED DATA
# # ===============================
# DATA_FILE = "face_data.pkl"

# if not os.path.exists(DATA_FILE):
#     print("face_data.pkl not found")
#     exit()

# with open(DATA_FILE, "rb") as f:
#     known_faces = pickle.load(f)

# print("Loaded:", list(known_faces.keys()))

# # ===============================
# # INSIGHTFACE
# # ===============================
# app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
# app.prepare(ctx_id=0, det_size=(640, 640))

# # ===============================
# # OPENCV EYE CASCADE
# # ===============================
# eye_cascade = cv2.CascadeClassifier(
#     cv2.data.haarcascades + "haarcascade_eye.xml"
# )

# # ===============================
# # CAMERA
# # ===============================
# cap = cv2.VideoCapture(0)

# THRESHOLD = 0.45

# # store states
# eye_closed_counter = {}
# live_verified = {}

# print("Press Q to exit")

# # ===============================
# # LOOP
# # ===============================
# while True:
#     ret, frame = cap.read()
#     if not ret:
#         break

#     faces = app.get(frame)

#     for face in faces:
#         box = face.bbox.astype(int)
#         x1, y1, x2, y2 = box

#         emb = face.embedding

#         best_name = "UNKNOWN"
#         best_score = -1

#         # ==========================
#         # RECOGNITION
#         # ==========================
#         for name, data in known_faces.items():

#             if isinstance(data, dict):
#                 saved = np.array(data["embedding"])
#             else:
#                 saved = np.array(data)

#             score = np.dot(emb, saved) / (
#                 np.linalg.norm(emb) * np.linalg.norm(saved)
#             )

#             if score > best_score:
#                 best_score = score
#                 best_name = name

#         if best_score < THRESHOLD:
#             best_name = "UNKNOWN"

#         # ==========================
#         # BLINK DETECTION
#         # ==========================
#         live = False

#         if best_name != "UNKNOWN":

#             gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
#             roi = gray[y1:y2, x1:x2]

#             eyes = eye_cascade.detectMultiScale(
#                 roi,
#                 scaleFactor=1.1,
#                 minNeighbors=4,
#                 minSize=(18, 18)
#             )

#             # initialize
#             if best_name not in eye_closed_counter:
#                 eye_closed_counter[best_name] = 0

#             # If no eyes detected => closed eyes
#             if len(eyes) == 0:
#                 eye_closed_counter[best_name] += 1

#             # If eyes reopen after being closed for few frames => blink success
#             else:
#                 if eye_closed_counter[best_name] >= 2:
#                     live_verified[best_name] = True

#                 eye_closed_counter[best_name] = 0

#             if best_name in live_verified:
#                 live = True

#         # ==========================
#         # DISPLAY
#         # ==========================
#         if best_name == "UNKNOWN":
#             color = (0, 0, 255)
#             name_text = "UNKNOWN"
#             status_text = ""

#         else:
#             if live:
#                 color = (0, 255, 0)
#                 status_text = "LIVE VERIFIED"
#             else:
#                 color = (0, 255, 255)
#                 status_text = "NOT VERIFIED"

#             name_text = best_name

#         # FACE BOX
#         cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

#         # NAME BAR
#         cv2.rectangle(frame, (x1, y1 - 55), (x2, y1 - 30), color, -1)
#         cv2.putText(
#             frame,
#             name_text,
#             (x1 + 5, y1 - 38),
#             cv2.FONT_HERSHEY_SIMPLEX,
#             0.55,
#             (0, 0, 0),
#             2
#         )

#         # STATUS BAR
#         if status_text:
#             cv2.rectangle(frame, (x1, y1 - 30), (x2, y1), color, -1)
#             cv2.putText(
#                 frame,
#                 status_text,
#                 (x1 + 5, y1 - 8),
#                 cv2.FONT_HERSHEY_SIMPLEX,
#                 0.52,
#                 (0, 0, 0),
#                 2
#             )

#     cv2.imshow("Recognition", frame)

#     if cv2.waitKey(1) & 0xFF == ord("q"):
#         break

# cap.release()
# cv2.destroyAllWindows()

















# import cv2
# import numpy as np
# import pickle
# import os
# from insightface.app import FaceAnalysis

# # ===============================
# # LOAD FACE DATA
# # ===============================
# DATA_FILE = "face_data.pkl"

# if not os.path.exists(DATA_FILE):
#     raise FileNotFoundError("face_data.pkl not found")

# with open(DATA_FILE, "rb") as f:
#     known_faces = pickle.load(f)

# # ===============================
# # INSIGHTFACE MODEL
# # ===============================
# app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
# app.prepare(ctx_id=0, det_size=(640, 640))

# # ===============================
# # EYE CASCADE
# # ===============================
# eye_cascade = cv2.CascadeClassifier(
#     cv2.data.haarcascades + "haarcascade_eye.xml"
# )

# THRESHOLD = 0.45


# def process_frame(frame, eye_closed_counter, live_verified):
#     """
#     Returns:
#         results: list of detections (name, status, box, color)
#         updated eye_closed_counter
#         updated live_verified
#     """

#     faces = app.get(frame)

#     results = []

#     gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

#     for face in faces:
#         x1, y1, x2, y2 = face.bbox.astype(int)
#         emb = face.embedding

#         best_name = "UNKNOWN"
#         best_score = -1

#         # ================= FACE MATCH =================
#         for name, data in known_faces.items():
#             saved = np.array(data["embedding"] if isinstance(data, dict) else data)

#             score = np.dot(emb, saved) / (
#                 np.linalg.norm(emb) * np.linalg.norm(saved)
#             )

#             if score > best_score:
#                 best_score = score
#                 best_name = name

#         if best_score < THRESHOLD:
#             best_name = "UNKNOWN"

#         # ================= BLINK DETECTION =================
#         status = "UNKNOWN"
#         color = (0, 0, 255)
#         live = False

#         if best_name != "UNKNOWN":
#             roi = gray[y1:y2, x1:x2]

#             eyes = eye_cascade.detectMultiScale(
#                 roi,
#                 scaleFactor=1.1,
#                 minNeighbors=4,
#                 minSize=(18, 18)
#             )

#             if best_name not in eye_closed_counter:
#                 eye_closed_counter[best_name] = 0

#             if len(eyes) == 0:
#                 eye_closed_counter[best_name] += 1
#             else:
#                 if eye_closed_counter[best_name] >= 2:
#                     live_verified[best_name] = True

#                 eye_closed_counter[best_name] = 0

#             if best_name in live_verified:
#                 live = True

#             if live:
#                 status = "LIVE VERIFIED"
#                 color = (0, 255, 0)
#             else:
#                 status = "NOT VERIFIED"
#                 color = (0, 255, 255)

#         results.append({
#             "name": best_name,
#             "box": (x1, y1, x2, y2),
#             "status": status,
#             "color": color
#         })

#     return results, eye_closed_counter, live_verified













# import cv2
# import os
# import pickle
# import numpy as np
# import time
# from insightface.app import FaceAnalysis

# # ===============================
# # LOAD TRAINED FACES
# # ===============================
# DATA_FILE = "face_data.pkl"

# if not os.path.exists(DATA_FILE):
#     raise FileNotFoundError("face_data.pkl not found")

# with open(DATA_FILE, "rb") as f:
#     known_faces = pickle.load(f)

# # ===============================
# # INSIGHTFACE MODEL
# # ===============================
# app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
# app.prepare(ctx_id=0, det_size=(640, 640))

# # ===============================
# # EYE DETECTOR
# # ===============================
# eye_cascade = cv2.CascadeClassifier(
#     cv2.data.haarcascades + "haarcascade_eye.xml"
# )

# THRESHOLD = 0.45

# # ===============================
# # LIVENESS STATE MEMORY
# # ===============================
# eye_closed_counter = {}
# blink_state = {}
# head_motion = {}


# # ===============================
# # MAIN PROCESS FUNCTION
# # ===============================
# def process_frame(frame, eye_closed_counter, blink_state, head_motion):

#     faces = app.get(frame)
#     results = []

#     gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
#     current_time = time.time()

#     for face in faces:
#         x1, y1, x2, y2 = face.bbox.astype(int)
#         emb = face.embedding

#         # ===============================
#         # FACE RECOGNITION
#         # ===============================
#         best_name = "UNKNOWN"
#         best_score = -1

#         for name, data in known_faces.items():
#             saved = np.array(data["embedding"] if isinstance(data, dict) else data)

#             score = np.dot(emb, saved) / (
#                 np.linalg.norm(emb) * np.linalg.norm(saved)
#             )

#             if score > best_score:
#                 best_score = score
#                 best_name = name

#         if best_score < THRESHOLD:
#             best_name = "UNKNOWN"

#         # ===============================
#         # INIT STATES
#         # ===============================
#         if best_name != "UNKNOWN":

#             if best_name not in eye_closed_counter:
#                 eye_closed_counter[best_name] = 0

#             if best_name not in blink_state:
#                 blink_state[best_name] = {
#                     "blink_count": 0,
#                     "last_blink_time": 0,
#                     "verified": False
#                 }

#             if best_name not in head_motion:
#                 head_motion[best_name] = []

#             # ===============================
#             # EYE ROI
#             # ===============================
#             roi = gray[y1:y2, x1:x2]
#             eyes = eye_cascade.detectMultiScale(
#                 roi,
#                 scaleFactor=1.1,
#                 minNeighbors=4,
#                 minSize=(18, 18)
#             )

#             # ===============================
#             # BLINK DETECTION
#             # ===============================
#             if len(eyes) == 0:
#                 eye_closed_counter[best_name] += 1
#             else:
#                 if eye_closed_counter[best_name] >= 2:
#                     # REGISTER BLINK
#                     if current_time - blink_state[best_name]["last_blink_time"] < 8:
#                         blink_state[best_name]["blink_count"] += 1
#                     else:
#                         blink_state[best_name]["blink_count"] = 1

#                     blink_state[best_name]["last_blink_time"] = current_time

#                 eye_closed_counter[best_name] = 0

#             # ===============================
#             # HEAD MOVEMENT (SIMPLE X TRACKING)
#             # ===============================
#             nose_x = (x1 + x2) // 2
#             head_motion[best_name].append(nose_x)

#             if len(head_motion[best_name]) > 10:
#                 head_motion[best_name].pop(0)

#             movement = 0
#             if len(head_motion[best_name]) > 2:
#                 movement = max(head_motion[best_name]) - min(head_motion[best_name])

#             # ===============================
#             # FINAL LIVENESS DECISION
#             # ===============================
#             blink_verified = blink_state[best_name]["blink_count"] >= 2

#             live = False
#             if blink_verified and movement > 15:
#                 blink_state[best_name]["verified"] = True
#                 live = True

#             # ===============================
#             # STATUS
#             # ===============================
#             if blink_state[best_name]["verified"]:
#                 status = "LIVE VERIFIED"
#                 color = (0, 255, 0)
#             else:
#                 status = "NOT VERIFIED"
#                 color = (0, 255, 255)

#         else:
#             status = "UNKNOWN"
#             color = (0, 0, 255)

#         # ===============================
#         # OUTPUT
#         # ===============================
#         results.append({
#             "name": best_name,
#             "box": (x1, y1, x2, y2),
#             "status": status,
#             "color": color
#         })

#     return results, eye_closed_counter, blink_state, head_motion





import cv2
import os
import pickle
import numpy as np
import time
from insightface.app import FaceAnalysis

# ===============================
# LOAD EMBEDDINGS
# ===============================
DATA_FILE = "TrainingImageLabel/insightface_embeddings.pkl"

if not os.path.exists(DATA_FILE):
    raise FileNotFoundError("Training embeddings file not found")

with open(DATA_FILE, "rb") as f:
    data = pickle.load(f)

known_embeddings = np.array(data["embeddings"])
known_names = np.array(data["names"])

# ===============================
# INSIGHTFACE MODEL
# ===============================
app = FaceAnalysis(name="buffalo_l", providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(320, 320))

# ===============================
# EYE DETECTOR
# ===============================
eye_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + "haarcascade_eye.xml"
)

THRESHOLD = 0.55   # improved stability and stricter for multi-user

# ===============================
# STATE MEMORY
# ===============================
eye_closed_counter = {}
blink_state = {}
head_motion = {}

# ===============================
# FACE MATCH
# ===============================
def get_best_match(emb, match_threshold=None):
    if match_threshold is None:
        match_threshold = THRESHOLD
    
    best_score = -1
    best_name = "UNKNOWN"

    for i in range(len(known_embeddings)):
        saved = known_embeddings[i]
        name = known_names[i]

        score = np.dot(emb, saved) / (
            np.linalg.norm(emb) * np.linalg.norm(saved)
        )

        if score > best_score:
            best_score = score
            best_name = name

    if best_score < match_threshold:
        return "UNKNOWN", best_score

    return best_name, best_score


# ===============================
# PROCESS FRAME (STREAMLIT + LIVE)
# ===============================
def process_frame(frame, eye_closed_counter, blink_state, head_motion, match_threshold=None):

    # IMPORTANT FIX: Pass BGR frame directly to InsightFace
    faces = app.get(frame)

    results = []
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    current_time = time.time()

    for face in faces:

        x1, y1, x2, y2 = face.bbox.astype(int)
        emb = face.embedding

        best_name, score = get_best_match(emb, match_threshold)

        # ================= UNKNOWN =================
        if best_name == "UNKNOWN":
            results.append({
                "name": "UNKNOWN",
                "box": (x1, y1, x2, y2),
                "status": "UNKNOWN",
                "color": (0, 0, 255)
            })
            continue

        # ================= SAFE INIT (FIXED FOR NEW USERS) =================
        if best_name not in eye_closed_counter:
            eye_closed_counter[best_name] = 0

        if best_name not in blink_state:
            blink_state[best_name] = {
                "blink_count": 0,
                "last_blink_time": time.time(),
                "verified": False
            }

        if best_name not in head_motion:
            head_motion[best_name] = []

        # ================= EYE DETECTION =================
        # Crop to the upper 55% of the face to avoid detecting nostrils/mouth as eyes
        face_h = y2 - y1
        roi = gray[y1:y1 + int(face_h * 0.55), x1:x2]
        
        # Lower minNeighbors and minSize to detect eyes more reliably even in lower quality
        eyes = eye_cascade.detectMultiScale(roi, 1.1, 3, minSize=(10, 10))

        if len(eyes) == 0:
            # Eyes closed or not detected
            eye_closed_counter[best_name] += 1
        else:
            # Eyes are open. If they were closed for at least 1 frame, count as a blink!
            # Since the model runs at lower FPS on CPU, 1 frame is enough.
            if eye_closed_counter[best_name] >= 1:
                blink_state[best_name]["blink_count"] = 1
                blink_state[best_name]["last_blink_time"] = current_time

            eye_closed_counter[best_name] = 0

        # ================= HEAD MOVEMENT =================
        cx = (x1 + x2) // 2
        head_motion[best_name].append(cx)

        # Keep history of center x positions
        if len(head_motion[best_name]) > 20:
            head_motion[best_name].pop(0)

        is_left_to_right = False
        if len(head_motion[best_name]) >= 3:
            max_x = max(head_motion[best_name])
            min_x = min(head_motion[best_name])
            
            min_idx = head_motion[best_name].index(min_x)
            max_idx = head_motion[best_name].index(max_x)

            movement = max_x - min_x
            
            # Check if movement is > 15 pixels and occurred from left to right
            # (min_x happened before max_x -> moving right)
            if movement > 15 and min_idx < max_idx:
                is_left_to_right = True

        # ================= LIVENESS =================
        # Verify if 1 blink has occurred
        blink_verified = blink_state[best_name]["blink_count"] >= 1

        if blink_verified and is_left_to_right:
            blink_state[best_name]["verified"] = True

        live = blink_state[best_name]["verified"]

        # ================= STATUS =================
        if live:
            status = "LIVE VERIFIED"
            color = (0, 255, 0)
        else:
            status = "NOT VERIFIED"
            color = (0, 255, 255)

        results.append({
            "name": best_name,
            "box": (x1, y1, x2, y2),
            "status": status,
            "color": color
        })

    return results, eye_closed_counter, blink_state, head_motion


# ===============================
# STANDALONE TEST (VS CODE)
# ===============================
if __name__ == "__main__":

    cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)

    print("Camera started... Press Q to exit")

    while True:

        ret, frame = cap.read()
        if not ret:
            break

        results, eye_closed_counter, blink_state, head_motion = process_frame(
            frame,
            eye_closed_counter,
            blink_state,
            head_motion
        )

        for r in results:
            x1, y1, x2, y2 = r["box"]

            cv2.rectangle(frame, (x1, y1), (x2, y2), r["color"], 2)
            cv2.putText(frame, r["name"], (x1, y1 - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, r["color"], 2)
            cv2.putText(frame, r["status"], (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, r["color"], 2)

        cv2.imshow("Face Recognition + Liveness", frame)

        if cv2.waitKey(1) & 0xFF == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()