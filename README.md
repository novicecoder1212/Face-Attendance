# 👤 BPPIMT Face Recognition Attendance System

An AI-powered, hardware-accelerated web application designed for automated student attendance tracking. The system utilizes client-side deep learning models for face detection, landmark tracking, real-time recognition, and liveness verification.

---

## 🌟 Key Features

* **High-Performance Scanning**: Processes video feeds at 30+ FPS directly in the web browser using WebGL acceleration.
* **Liveness Detection (Anti-Spoofing)**: Combined Eye Aspect Ratio (EAR) blink validation and nose displacement head-motion analysis to prevent photo/video spoofing attacks.
* **Modern Glassmorphism UI**: A premium dark-theme interface with custom animations, metrics panels, and responsive layouts.
* **Direct CSV Exports**: Export historical logs dynamically into excel-friendly CSV formats.
* **Automated Data Seeding**: Seamlessly reads and migrates legacy Python `TrainingImage` directories and root `Attendance.csv` files upon startup.

---

## 🛠️ Technology Stack

### Frontend (Client-Side)
* **Framework**: React.js (bootstrapped with Vite)
* **Styling**: Vanilla CSS3 Custom Variables (featuring blur backdrops, radial gradients, HSL tailored variables, and micro-interactions)
* **Icons**: Lucide React
* **Machine Learning Engine**: TensorFlow.js (via the `@vladmandic/face-api` active wrapper)

### Backend (Server-Side)
* **Runtime**: Node.js
* **Framework**: Express.js
* **Middleware**: CORS (Cross-Origin Resource Sharing), Express JSON Parser
* **Development Process**: Nodemon (hot reloading server)

### Storage & Database
* **Local Database**: Persistent local JSON tables (`users.json`, `embeddings.json`, `attendance.json`)
* **CSV Logging**: Direct writes to root `Attendance.csv` for backend storage reporting.

---

## 🧠 Deep Learning Models Integrated

The application runs three advanced Convolutional Neural Network (CNN) models client-side in the browser:

1. **SSD MobileNet V1** (Face Detection)
   - Evaluates video frames and predicts bounding box coordinates containing human faces. Optimized for light-speed execution on browser environments.
2. **Landmark 68 Net** (Biometric Alignment)
   - Localizes 68 key points outline of the face. Used to calculate eye dimensions for blink checks and track coordinate shifts for movement checks.
3. **ResNet-34** (Face Recognition / Embeddings)
   - A deep residual network that maps the facial region into a 128-dimensional floating-point vector (descriptor). Similar faces produce vectors with high cosine similarity.

---

## 📂 Project Structure

```
Final-year-project-main/
├── backend/                       # Express Node.js Server
│   ├── src/
│   │   └── server.js              # Routing, Data-seeding, and CSV writer
│   ├── data/                      # Local JSON Database
│   │   ├── users.json             # Registered student records
│   │   ├── embeddings.json        # 128-d trained face vectors
│   │   ├── attendance.json        # Saved attendance timestamps
│   │   └── TrainingImage/         # Uploaded JPEG photos
│   └── package.json
├── frontend/                      # React SPA (Vite)
│   ├── src/
│   │   ├── utils/
│   │   │   └── faceApiHelper.js   # Dynamic CDN neural-net weights loader
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx      # Overview statistics and system guide
│   │   │   ├── CollectFaces.jsx   # Webcam interface for saving photo datasets
│   │   │   ├── Train.jsx          # Descriptor extraction and database sync
│   │   │   ├── MarkAttendance.jsx # Liveness verification scanning portal
│   │   │   ├── ViewRecords.jsx    # Historical grids and CSV exporting
│   │   │   └── ManageEmbeddings.jsx # Record removals and DB resets
│   │   ├── App.jsx                # Layout Shell and routing config
│   │   ├── index.css              # Glassmorphic Stylesheet
│   │   └── main.jsx
│   ├── index.html                 # Entry HTML page
│   └── package.json
├── Attendance.csv                 # Legacy & current synced spreadsheet log
├── package.json                   # Root Concurrency runner script
└── README.md                      # Documentation
```

---

## ⚙️ Module Walkthrough

### 1️⃣ Dashboard
Displays system counts (total registered students and logged records) fetched from the backend API. Shows quick action links to guide administrators.

### 2️⃣ Collect Faces
Allows registering a new University ID and Name. Turns on the webcam and runs the **SSD MobileNet** detector. Once a face is found in frame, it captures a high-resolution snapshot and streams the base64 JPEG to the backend until 50 samples are collected.

### 3️⃣ Train Model
Lists all student directories. When "Train" is triggered, the frontend downloads the student's 50 photos, runs landmark extraction and embedding generation on each, and compiles them into a JSON package. It syncs the 128-d arrays to the backend's `embeddings.json`.

### 4️⃣ Mark Attendance (Liveness Scanner)
Performs automated scanning. It instantiates a `FaceMatcher` class mapping target descriptors. For any detected face:
* **Blink check**: Measures eye coordinates. If the Eye Aspect Ratio (EAR) falls below `0.22` and re-opens, a blink is logged.
* **Head motion check**: Tracks nose coordinates over 20 frames. A delta of `> 15` pixels verifies structural rotation.
* **Logging**: If both checks pass, the face is marked `"LIVE VERIFIED"`, and an API call marks their attendance in the database and synches to `Attendance.csv`.

### 5️⃣ View History
A comprehensive registry showing timestamps. Features instant text filtering for student names, IDs, or dates, and exports the active list to a `.csv` file.

### 6️⃣ System Management
Provides administrator deletion functions. Enables purging single student files or completely clearing the trained vectors database (Danger Zone).

---

## 🚀 Installation & Setup

### Prerequisites
* Install **[Node.js](https://nodejs.org/)** (Version 18.0.0 or later recommended).

### Launching the Application
1. Clone this repository and open your terminal inside the root directory:
   ```bash
   cd Final-year-project-main
   ```
2. Install dependencies (Root, Backend, and Frontend modules):
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```
3. Run the development environments concurrently:
   ```bash
   npm run dev
   ```
4. Access the web interface:
   * Frontend Portal: **[http://localhost:5173/](http://localhost:5173/)**
   * Backend API: **[http://localhost:5000/](http://localhost:5000/)**
