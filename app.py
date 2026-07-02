
import streamlit as st
import cv2
import os
import pickle
import numpy as np
from datetime import datetime
from insightface.app import FaceAnalysis
import pandas as pd
from PIL import Image
import time

# Page configuration
st.set_page_config(
    page_title="BPPIMT Attendance System",
    page_icon="👤",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'face_app' not in st.session_state:
    st.session_state.face_app = None
if 'capturing' not in st.session_state:
    st.session_state.capturing = False
if 'attendance_running' not in st.session_state:
    st.session_state.attendance_running = False

# Initialize InsightFace
@st.cache_resource
def load_face_model():
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=0, det_size=(320, 320))
    return app

# Custom CSS
st.markdown("""
    <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    :root {
        --bg-color: #0F172A;
        --card-bg: rgba(30, 41, 59, 0.6);
        --border-color: rgba(255, 255, 255, 0.08);
        --primary: #8B5CF6;
        --primary-hover: #A78BFA;
        --secondary: #3B82F6;
        --text-main: #F8FAFC;
        --text-muted: #94A3B8;
    }

    /* Global Font */
    html, body, [class*="css"] {
        font-family: 'Inter', sans-serif !important;
    }

    /* Main Background */
    .stApp {
        background: radial-gradient(circle at top right, #1E1B4B, #0F172A, #020617);
        color: var(--text-main);
    }
    
    /* Header Transparency */
    header[data-testid="stHeader"] {
        background-color: transparent !important;
    }

    /* Sidebar styling */
    [data-testid="stSidebar"] {
        background: rgba(15, 23, 42, 0.8) !important;
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-right: 1px solid var(--border-color);
    }
    [data-testid="stSidebar"] * {
        color: var(--text-main) !important;
    }

    /* Sidebar Navigation Links */
    [data-testid="stSidebar"] [role="radiogroup"] label {
        padding: 12px 15px !important;
        border-radius: 12px;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 6px;
        background: transparent;
        cursor: pointer;
        border: 1px solid transparent;
    }
    [data-testid="stSidebar"] [role="radiogroup"] label:hover {
        background: rgba(139, 92, 246, 0.1) !important;
        border: 1px solid rgba(139, 92, 246, 0.2);
        transform: translateX(4px);
    }
    [data-testid="stSidebar"] [role="radiogroup"] div[data-testid="stMarkdownContainer"] p {
        font-weight: 500;
        font-size: 1.1rem;
    }

    /* Headers */
    h1, h2, h3, h4 {
        color: var(--text-main) !important;
        font-weight: 700 !important;
        letter-spacing: -0.02em;
    }

    /* Glassmorphism Cards */
    .info-card {
        background: var(--card-bg);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        margin: 1rem 0;
        height: 100%;
    }
    .info-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(139, 92, 246, 0.4);
    }
    .info-card h3 {
        margin-top: 0;
        color: #A78BFA !important;
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.3rem;
    }
    .info-card p {
        color: var(--text-muted);
        margin-bottom: 0;
        font-size: 0.95rem;
        line-height: 1.5;
    }

    /* Institute Header */
    .institute-header {
        background: linear-gradient(135deg, rgba(30, 27, 75, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 20px;
        padding: 2.5rem;
        text-align: center;
        margin-bottom: 2rem;
        position: relative;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .institute-header::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
        animation: rotate 20s linear infinite;
        pointer-events: none;
    }
    @keyframes rotate {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .institute-logo {
        max-width: 200px;
        margin-bottom: 1rem;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.05);
        padding: 10px;
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(5px);
    }

    .main-header {
        font-size: 2.5rem;
        font-weight: 800;
        background: linear-gradient(to right, #C4B5FD, #93C5FD);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 1rem 0;
        text-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
    }

    .sub-header {
        font-size: 1.2rem;
        color: var(--text-main) !important;
        margin-bottom: 0.5rem;
        font-weight: 500 !important;
    }

    /* Modern Buttons */
    .stButton>button {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%) !important;
        color: white !important;
        border: none !important;
        border-radius: 12px !important;
        padding: 0.6rem 2rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.5px;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.2) !important;
        transition: all 0.3s ease !important;
    }
    .stButton>button:hover {
        box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4) !important;
        transform: translateY(-2px) !important;
        filter: brightness(1.1);
    }
    .stButton>button:active {
        transform: translateY(1px) !important;
    }
    
    /* Secondary/Stop Buttons (danger) */
    button:contains("Stop"), button:contains("Delete"), button:contains("Clear") {
        background: linear-gradient(135deg, #EF4444 0%, #B91C1C 100%) !important;
        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.2) !important;
    }
    button:contains("Stop"):hover, button:contains("Delete"):hover, button:contains("Clear"):hover {
        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4) !important;
    }

    /* Inputs */
    .stTextInput>div>div>input, .stNumberInput>div>div>input {
        background: rgba(15, 23, 42, 0.5) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        border-radius: 10px !important;
        padding: 0.75rem 1rem !important;
        transition: all 0.3s ease;
    }
    .stTextInput>div>div>input:focus, .stNumberInput>div>div>input:focus {
        border-color: var(--primary) !important;
        box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2) !important;
    }

    /* Metrics */
    [data-testid="stMetric"] {
        background: var(--card-bg);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }
    [data-testid="stMetric"]:hover {
        transform: translateY(-3px);
        border-color: rgba(139, 92, 246, 0.4);
        box-shadow: 0 8px 30px rgba(0,0,0,0.2);
    }
    [data-testid="stMetricLabel"] {
        justify-content: center;
        color: var(--text-muted) !important;
        font-size: 1.1rem !important;
        font-weight: 500 !important;
    }
    [data-testid="stMetricValue"] {
        color: var(--text-main) !important;
        font-size: 2.8rem !important;
        font-weight: 800 !important;
        background: linear-gradient(to right, #C4B5FD, #93C5FD);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    /* Alerts and Info Boxes */
    .stAlert {
        background: rgba(30, 41, 59, 0.6) !important;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255,255,255,0.08) !important;
        border-radius: 12px !important;
        color: var(--text-main) !important;
    }
    
    /* Progress Bar */
    .stProgress > div > div > div > div {
        background-color: var(--primary) !important;
    }

    /* Animations */
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .main > div {
        animation: fadeIn 0.6s ease-out forwards;
    }
    </style>
""", unsafe_allow_html=True)

import base64

institute_logo = "bppimt_logo.jpg"
logo_html = ""
if os.path.exists(institute_logo):
    try:
        with open(institute_logo, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode()
        logo_html = f'<img src="data:image/jpeg;base64,{encoded_string}" class="institute-logo" alt="Logo">'
    except Exception:
        pass

st.markdown(f"""<div class="institute-header">
{logo_html}
<p class="main-header">✨ Face Recognition Attendance System ✨</p>
<h1 class="sub-header">B.P. Poddar Institute of Management & Technology</h1>
<p class="sub-header" style="color: #94A3B8 !important; font-size: 0.95rem;">Approved by AICTE, New Delhi & Affiliated to MAKAUT, W.B</p>
</div>""", unsafe_allow_html=True)




# Sidebar navigation
st.sidebar.title("Navigation")
page = st.sidebar.radio("Select Module", 
                        ["🏠 Home", "📸 Collect Faces", "🧠 Train Model", "✅ Mark Attendance", 
                         "📊 View Records", "🗑️ Manage Embeddings"])

st.sidebar.markdown("---")
camera_index = st.sidebar.selectbox("📷 Select Camera", [0, 1, 2, 3], index=1, help="If the camera is black or not detecting faces, try changing this index.")


# ==================== HOME PAGE ====================
if page == "🏠 Home":
    st.markdown("<h2>👋 Welcome to B.P.P.I.M.T Attendance System</h2>", unsafe_allow_html=True)
    st.markdown("<p style='color: #94A3B8; margin-bottom: 2rem;'>A modern, AI-powered system for seamless and secure attendance tracking.</p>", unsafe_allow_html=True)
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.markdown("""<div class="info-card">
<h3>📸 Collect Faces</h3>
<p>Register new students by capturing multiple angles of their face for high accuracy.</p>
</div>""", unsafe_allow_html=True)
    with col2:
        st.markdown("""<div class="info-card">
<h3>🧠 Train Model</h3>
<p>Process the collected facial data to build unique and secure embeddings.</p>
</div>""", unsafe_allow_html=True)
    with col3:
        st.markdown("""<div class="info-card">
<h3>✅ Mark Attendance</h3>
<p>Real-time face recognition and liveness detection for automated attendance.</p>
</div>""", unsafe_allow_html=True)
    
    st.markdown("---")
    st.subheader("📋 Instructions")
    st.write("""
    1. **Collect Faces**: Enter your University ID and Name, then capture 50 clear images
    2. **Train Model**: Train the system with your captured images
    3. **Mark Attendance**: Start the camera to automatically mark attendance
    4. **View Records**: Check attendance history
    """)
    
    # Display system status
    st.markdown("---")
    st.subheader("📈 System Status")
    
    col1, col2 = st.columns(2)
    
    with col1:
        # Count trained persons
        embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
        if os.path.exists(embed_file):
            with open(embed_file, "rb") as f:
                data = pickle.load(f)
            unique_names = set(data["names"])
            st.metric("Registered Users", len(unique_names))
        else:
            st.metric("Registered Users", 0)
    
    with col2:
        # Count attendance records
        attendance_file = "Attendance.csv"
        if os.path.exists(attendance_file):
            df = pd.read_csv(attendance_file)
            st.metric("Total Attendance Records", len(df))
        else:
            st.metric("Total Attendance Records", 0)

# ==================== COLLECT FACES ====================
elif page == "📸 Collect Faces":
    st.header("📸 Collect Face Images")
    
    col1, col2 = st.columns(2)
    with col1:
        univ_id = st.text_input("🆔 Enter University ID", 
                                placeholder="e.g., 12345")
    with col2:
        name = st.text_input("👤 Enter Name", 
                             placeholder="e.g., John")
    
    person_id = f"{univ_id}_{name}" if univ_id and name else ""
    
    if person_id and univ_id and name:
        output_dir = os.path.join("TrainingImage", person_id)
        
        col1, col2 = st.columns([2, 1])
        
        with col2:
            st.info(f"**Save Location:**\n{output_dir}")
            target_count = st.number_input("Number of images to capture", 
                                          min_value=10, max_value=100, value=50)
        
        with col1:
            if st.button("🎥 Start Capture", type="primary"):
                os.makedirs(output_dir, exist_ok=True)
                
                try:
                    app = load_face_model()
                    cam = cv2.VideoCapture(camera_index)
                    
                    if not cam.isOpened():
                        st.error("❌ Could not open camera!")
                    else:
                        st.success("✅ Camera opened successfully!")
                        
                        frame_placeholder = st.empty()
                        progress_bar = st.progress(0)
                        status_text = st.empty()
                        
                        count = 0
                        
                        while count < target_count:
                            ret, frame = cam.read()
                            if not ret:
                                st.error("Failed to capture frame")
                                break
                            
                            faces = app.get(frame)
                            
                            if len(faces) > 0:
                                face = faces[0]
                                x1, y1, x2, y2 = map(int, face.bbox)
                                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                                
                                count += 1
                                img_name = os.path.join(output_dir, f"{person_id}_{count}.jpg")
                                cv2.imwrite(img_name, frame)
                                
                                cv2.putText(frame, f"Captured: {count}/{target_count}", (30, 50),
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
                                
                                progress_bar.progress(count / target_count)
                                status_text.text(f"✅ Captured: {count}/{target_count}")
                            else:
                                cv2.putText(frame, "No face detected!", (30, 50),
                                          cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                            
                            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                            frame_placeholder.image(frame_rgb, channels="RGB", use_container_width=True)
                        
                        cam.release()
                        st.success(f"✅ Successfully captured {count} images!")
                        st.balloons()
                        
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

# ==================== TRAIN MODEL ====================
elif page == "🧠 Train Model":
    st.header("🧠 Train Face Recognition Model")
    
    # Load existing trained data to check who's already trained
    embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
    trained_persons = set()
    if os.path.exists(embed_file):
        with open(embed_file, "rb") as f:
            data = pickle.load(f)
            trained_persons = set(data["names"])
    
    # List available folders
    training_dir = "TrainingImage"
    if os.path.exists(training_dir):
        folders = [f for f in os.listdir(training_dir) if os.path.isdir(os.path.join(training_dir, f))]
        
        if folders:
            # Show trained and untrained persons
            col1, col2 = st.columns(2)
            
            with col1:
                st.subheader("✅ Already Trained")
                if trained_persons:
                    for person in sorted(trained_persons):
                        st.success(f"✓ {person}")
                else:
                    st.info("No one trained yet")
            
            with col2:
                st.subheader("⏳ Not Yet Trained")
                untrained = [f for f in folders if f not in trained_persons]
                if untrained:
                    for person in sorted(untrained):
                        st.warning(f"⚠ {person}")
                else:
                    st.info("All persons are trained")
            
            st.markdown("---")
            
            # Select person to train
            person_id = st.selectbox("Select person to train", folders)
            
            # Check if already trained
            if person_id in trained_persons:
                st.warning(f"⚠️ **{person_id}** is already trained. Training again will add more data.")
            else:
                st.info(f"ℹ️ **{person_id}** is not yet trained. Ready to train!")
            
            dataset_dir = os.path.join(training_dir, person_id)
            image_files = [f for f in os.listdir(dataset_dir) if f.endswith(('.jpg', '.png'))]
            
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Images Found", len(image_files))
            with col2:
                st.metric("Selected Person", person_id)
            
            if st.button("🚀 Start Training", type="primary"):
                with st.spinner("Training in progress..."):
                    try:
                        app = load_face_model()
                        
                        embeddings = []
                        names = []
                        
                        progress_bar = st.progress(0)
                        status_text = st.empty()
                        
                        for idx, img_name in enumerate(image_files):
                            img_path = os.path.join(dataset_dir, img_name)
                            img = cv2.imread(img_path)
                            
                            if img is None:
                                continue
                            
                            faces = app.get(img)
                            
                            if len(faces) > 0:
                                emb = faces[0].embedding
                                embeddings.append(emb)
                                names.append(person_id)
                            
                            progress_bar.progress((idx + 1) / len(image_files))
                            status_text.text(f"Processing: {idx + 1}/{len(image_files)}")
                        
                        # Save embeddings
                        os.makedirs("TrainingImageLabel", exist_ok=True)
                        embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
                        
                        if os.path.exists(embed_file):
                            with open(embed_file, "rb") as f:
                                data = pickle.load(f)
                            embeddings = np.vstack([data["embeddings"], embeddings]) if len(data["embeddings"]) > 0 else np.array(embeddings)
                            names = np.concatenate([data["names"], names])
                        else:
                            embeddings = np.array(embeddings)
                            names = np.array(names)
                        
                        with open(embed_file, "wb") as f:
                            pickle.dump({"embeddings": embeddings, "names": names}, f)
                        
                        st.success(f"✅ Training complete for {person_id}!")
                        st.success(f"📊 Total embeddings extracted: {len(embeddings)}")
                        st.balloons()
                        
                    except Exception as e:
                        st.error(f"❌ Error during training: {str(e)}")
        else:
            st.warning("⚠️ No training folders found. Please collect faces first.")
    else:
        st.warning("⚠️ TrainingImage directory not found.")

# # ==================== MARK ATTENDANCE ====================
# elif page == "✅ Mark Attendance":
#     st.header("✅ Mark Attendance")
    
#     # Check if model is trained
#     embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
#     if not os.path.exists(embed_file):
#         st.error("❌ No trained model found! Please train the model first.")
#     else:
#         # Load embeddings
#         with open(embed_file, "rb") as f:
#             data = pickle.load(f)
#         embeddings = np.array(data["embeddings"])
#         names = np.array(data["names"])
        
#         st.info(f"📊 Loaded {len(set(names))} registered users")
        
#         # Attendance settings
#         col1, col2 = st.columns(2)
#         with col1:
#             threshold = st.slider("Recognition Threshold", 0.3, 0.7, 0.4, 0.05)
#         with col2:
#             st.metric("Registered Users", len(set(names)))
        
#         if st.button("🎥 Start Attendance", type="primary"):
#             attendance_file = "Attendance.csv"
            
#             # Create file with headers if not exists
#             if not os.path.exists(attendance_file):
#                 with open(attendance_file, 'w') as f:
#                     f.write("ID,Name,Date_Time\n")
            
#             def mark_attendance(full_name):
#                 if "_" in full_name:
#                     id_part, name_part = full_name.split("_", 1)
#                 else:
#                     id_part, name_part = "N/A", full_name
                
#                 with open(attendance_file, 'r+', newline='') as f:
#                     existing_data = f.readlines()
#                     ids_list = [line.split(',')[0] for line in existing_data]
                    
#                     if id_part not in ids_list:
#                         now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#                         f.write(f"{id_part},{name_part},{now}\n")
#                         return True
#                 return False
            
#             try:
#                 app = load_face_model()
#                 cam = cv2.VideoCapture(0)
                
#                 if not cam.isOpened():
#                     st.error("❌ Could not open camera!")
#                 else:
#                     frame_placeholder = st.empty()
#                     status_placeholder = st.empty()
#                     stop_button = st.button("🛑 Stop Attendance")
                    
#                     marked_today = set()
                    
#                     while not stop_button:
#                         ret, frame = cam.read()
#                         if not ret:
#                             break
                        
#                         faces = app.get(frame)
#                         for face in faces:
#                             emb = face.embedding
#                             similarities = np.dot(embeddings, emb) / (
#                                 np.linalg.norm(embeddings, axis=1) * np.linalg.norm(emb)
#                             )
#                             best_idx = np.argmax(similarities)
#                             best_score = similarities[best_idx]
                            
#                             if best_score > threshold:
#                                 full_name = names[best_idx]
#                                 color = (0, 255, 0)
                                
#                                 if full_name not in marked_today:
#                                     if mark_attendance(full_name):
#                                         marked_today.add(full_name)
#                                         status_placeholder.success(f"✅ Attendance marked for {full_name}")
                                
#                                 display_name = full_name.split("_")[1] if "_" in full_name else full_name
#                                 text_to_show = display_name
#                             else:
#                                 text_to_show = "Unknown"
#                                 color = (0, 0, 255)
                            
#                             x1, y1, x2, y2 = face.bbox.astype(int)
#                             cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
#                             cv2.putText(frame, text_to_show, (x1, y1 - 10),
#                                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
                        
#                         frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
#                         frame_placeholder.image(frame_rgb, channels="RGB", use_container_width=True)
                    
#                     cam.release()
#                     st.success("✅ Attendance session ended")
                    
#             except Exception as e:
#                 st.error(f"❌ Error: {str(e)}")


# ............updated with blink.............
elif page == "✅ Mark Attendance":
    st.header("✅ Mark Attendance")

    embed_file = "TrainingImageLabel/insightface_embeddings.pkl"

    if not os.path.exists(embed_file):
        st.error("❌ No trained model found! Please train the model first.")
    else:
        with open(embed_file, "rb") as f:
            data = pickle.load(f)

        embeddings = np.array(data["embeddings"])
        names = np.array(data["names"])

        st.info(f"📊 Loaded {len(set(names))} registered users")

        col1, col2 = st.columns(2)
        with col1:
            threshold = st.slider("Recognition Threshold", 0.3, 0.7, 0.4, 0.05)
        with col2:
            st.metric("Registered Users", len(set(names)))

        # ================= START BUTTON =================
        start = st.button("🎥 Start Attendance", type="primary")

        if "run_attendance" not in st.session_state:
            st.session_state.run_attendance = False

        if start:
            st.session_state.run_attendance = True

        if st.session_state.run_attendance:

            attendance_file = "Attendance.csv"

            if not os.path.exists(attendance_file):
                with open(attendance_file, 'w') as f:
                    f.write("ID,Name,Date_Time\n")

            def mark_attendance(full_name):
                if "_" in full_name:
                    id_part, name_part = full_name.split("_", 1)
                else:
                    id_part, name_part = "N/A", full_name

                with open(attendance_file, 'r+', newline='') as f:
                    lines = f.readlines()
                    ids_list = [line.split(',')[0] for line in lines]

                    if id_part not in ids_list:
                        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        f.write(f"{id_part},{name_part},{now}\n")
                        return True
                return False

            try:
                import recognize

                cam = cv2.VideoCapture(camera_index)

                frame_placeholder = st.empty()
                status_placeholder = st.empty()

                stop = st.button("🛑 Stop Attendance")

                eye_closed_counter = {}
                blink_state = {}
                head_motion = {}
                marked_today = set()
                frame_count = 0
                last_results = []

                while cam.isOpened():

                    if stop:
                        st.session_state.run_attendance = False
                        break

                    ret, frame = cam.read()
                    if not ret:
                        break

                    frame_count += 1
                    
                    # Process every 2nd frame to boost FPS
                    if frame_count % 2 != 0:
                        # Draw using last results
                        for r in last_results:
                            x1, y1, x2, y2 = r["box"]
                            cv2.rectangle(frame, (x1, y1), (x2, y2), r["color"], 2)
                            cv2.putText(frame, r["name"], (x1, y1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, r["color"], 2)
                            cv2.putText(frame, r["status"], (x1, y2 + 25),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, r["color"], 2)
                        
                        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                        frame_placeholder.image(frame_rgb, use_container_width=True)
                        continue

                    # ================= ANTI-SPOOF PROCESS =================
                    results, eye_closed_counter, blink_state, head_motion = recognize.process_frame(
                        frame,
                        eye_closed_counter,
                        blink_state,
                        head_motion
                    )
                    
                    last_results = results

                    for r in results:
                        x1, y1, x2, y2 = r["box"]

                        cv2.rectangle(frame, (x1, y1), (x2, y2), r["color"], 2)

                        cv2.putText(frame, r["name"], (x1, y1 - 10),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, r["color"], 2)

                        cv2.putText(frame, r["status"], (x1, y2 + 25),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, r["color"], 2)

                        # ================= ATTENDANCE ONLY IF LIVE =================
                        if r["status"] == "LIVE VERIFIED":
                            full_name = r["name"]

                            if full_name not in marked_today:
                                if mark_attendance(full_name):
                                    marked_today.add(full_name)
                                    status_placeholder.success(
                                        f"✅ LIVE VERIFIED & MARKED: {full_name}"
                                    )
                        else:
                            status_placeholder.warning("👁️ Waiting for blink + head movement verification...")

                    frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    frame_placeholder.image(frame_rgb, use_container_width=True)

                cam.release()
                st.session_state.run_attendance = False
                st.success("✅ Attendance session ended")

            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

# ==================== VIEW RECORDS ====================
elif page == "📊 View Records":
    st.header("📊 Attendance Records")
    
    attendance_file = "Attendance.csv"
    
    if os.path.exists(attendance_file):
        df = pd.read_csv(attendance_file)
        
        if len(df) > 0:
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Total Records", len(df))
            with col2:
                st.metric("Unique Students", df['ID'].nunique())
            with col3:
                st.metric("Today's Attendance", 
                         len(df[df['Date_Time'].str.contains(datetime.now().strftime("%Y-%m-%d"))]))
            
            st.markdown("---")
            
            # Filters
            col1, col2 = st.columns(2)
            with col1:
                search_id = st.text_input("🔍 Search by ID", "")
            with col2:
                search_name = st.text_input("🔍 Search by Name", "")
            
            # Apply filters
            filtered_df = df.copy()
            if search_id:
                filtered_df = filtered_df[filtered_df['ID'].astype(str).str.contains(search_id)]
            if search_name:
                filtered_df = filtered_df[filtered_df['Name'].str.contains(search_name, case=False)]
            
            st.dataframe(filtered_df, use_container_width=True)
            
            # Download button
            csv = filtered_df.to_csv(index=False)
            st.download_button(
                label="📥 Download CSV",
                data=csv,
                file_name=f"attendance_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )
            
            # Delete option
            st.markdown("---")
            col1, col2 = st.columns([1, 3])
            with col1:
                if st.button("🗑️ Clear All Records", type="secondary"):
                    st.session_state.confirm_delete = True
            
            if st.session_state.get('confirm_delete', False):
                with col2:
                    st.warning("⚠️ This will delete all attendance records permanently!")
                    col_yes, col_no = st.columns(2)
                    with col_yes:
                        if st.button("✅ Yes, Delete All", type="primary"):
                            os.remove(attendance_file)
                            st.session_state.confirm_delete = False
                            st.success("✅ All records deleted!")
                            time.sleep(1)
                            st.rerun()
                    with col_no:
                        if st.button("❌ Cancel"):
                            st.session_state.confirm_delete = False
                            st.rerun()
        else:
            st.info("📭 No attendance records found.")
    else:
        st.info("📭 No attendance file exists yet.")

# Footer
st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown("""<div style="background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.08); padding: 2rem; border-radius: 16px; text-align: center; margin-top: 2rem;">
<p style="color: #F8FAFC; font-weight: 600; font-size: 1.1rem; margin-bottom: 10px;">
✨ Face Recognition Based Attendance System | B.P. Poddar Institute of Management & Technology ✨
</p>
<div style="color: #94A3B8; font-size: 0.9rem; line-height: 1.6; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
<span>🌍 137, V.I.P Road, Poddar Vihar, Kolkata - 700052</span>
<span>📞 91-033-40619174 / 75 / 76</span>
<span>✉️ <a href="mailto:info@bppimt.ac.in" style="color: #A78BFA; text-decoration: none;">info@bppimt.ac.in</a></span>
</div>
<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); color: #94A3B8; font-size: 0.85rem;">
Designed & Developed by <b>Team 14</b><br>
<i>Jayita Chatterjee • Paramita Banik • Kaustav Das • Soumik Saha</i>
</div>
<p style='text-align: center; color: #60A5FA; font-size: 0.8rem; margin-top: 15px; font-weight: 600; letter-spacing: 1px;'>
POWERED BY INSIGHTFACE & STREAMLIT
</p>
</div>""", unsafe_allow_html=True)

# ==================== MANAGE EMBEDDINGS ====================
if page == "🗑️ Manage Embeddings":
    st.header("🗑️ Manage Training Embeddings")
    
    embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
    
    if not os.path.exists(embed_file):
        st.warning("⚠️ No trained embeddings found!")
        st.info("Train some persons first before managing embeddings.")
    else:
        # Load embeddings
        with open(embed_file, "rb") as f:
            data = pickle.load(f)
        
        embeddings = np.array(data["embeddings"])
        names = np.array(data["names"])
        
        # Get unique persons and their counts
        unique_persons = {}
        for name in names:
            unique_persons[name] = unique_persons.get(name, 0) + 1
        
        st.success(f"✅ Total trained persons: **{len(unique_persons)}**")
        st.info(f"📊 Total embeddings: **{len(embeddings)}**")
        
        st.markdown("---")
        
        # Display all trained persons with delete option
        st.subheader("👥 Trained Persons")
        
        for person_name, count in sorted(unique_persons.items()):
            col1, col2, col3 = st.columns([3, 1, 1])
            
            with col1:
                st.write(f"**{person_name}**")
            with col2:
                st.write(f"📊 {count} embeddings")
            with col3:
                if st.button(f"🗑️ Delete", key=f"del_{person_name}"):
                    st.session_state[f'confirm_delete_{person_name}'] = True
            
            # Confirmation dialog
            if st.session_state.get(f'confirm_delete_{person_name}', False):
                st.warning(f"⚠️ Are you sure you want to delete **{person_name}**?")
                col_yes, col_no, col_space = st.columns([1, 1, 3])
                
                with col_yes:
                    if st.button("✅ Yes, Delete", key=f"yes_{person_name}"):
                        # Filter out this person's embeddings
                        mask = names != person_name
                        new_embeddings = embeddings[mask]
                        new_names = names[mask]
                        
                        # Save updated embeddings
                        if len(new_embeddings) > 0:
                            with open(embed_file, "wb") as f:
                                pickle.dump({"embeddings": new_embeddings, "names": new_names}, f)
                            st.success(f"✅ Successfully deleted {person_name}!")
                        else:
                            # If no embeddings left, delete the file
                            os.remove(embed_file)
                            st.success(f"✅ Deleted {person_name}! No embeddings remaining.")
                        
                        st.session_state[f'confirm_delete_{person_name}'] = False
                        time.sleep(1)
                        st.rerun()
                
                with col_no:
                    if st.button("❌ Cancel", key=f"no_{person_name}"):
                        st.session_state[f'confirm_delete_{person_name}'] = False
                        st.rerun()
            
            st.markdown("---")
        
        # Option to delete all embeddings
        st.markdown("### 🚨 Danger Zone")
        st.error("**Delete All Embeddings** - This will remove all trained data!")
        
        if st.button("🗑️ Delete All Embeddings", type="secondary"):
            st.session_state.confirm_delete_all = True
        
        if st.session_state.get('confirm_delete_all', False):
            st.warning("⚠️ This will permanently delete ALL training data!")
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("✅ Yes, Delete Everything", type="primary"):
                    os.remove(embed_file)
                    # Also delete the directory if empty
                    if os.path.exists("TrainingImageLabel") and not os.listdir("TrainingImageLabel"):
                        os.rmdir("TrainingImageLabel")
                    st.session_state.confirm_delete_all = False
                    st.success("✅ All embeddings deleted!")
                    time.sleep(1)
                    st.rerun()
            
            with col2:
                if st.button("❌ Cancel"):
                    st.session_state.confirm_delete_all = False
                    st.rerun()

















