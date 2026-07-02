import React, { useState, useRef, useEffect } from 'react';
import { CheckSquare, AlertCircle, CheckCircle2, Loader2, Play, Square } from 'lucide-react';
import { loadModels, faceapi } from '../utils/faceApiHelper';
import { API_URL } from '../utils/api';

function MarkAttendance() {
  const [loading, setLoading] = useState({
    models: true,
    progress: 0,
    database: true,
    error: ''
  });

  const [attendanceState, setAttendanceState] = useState({
    active: false,
    threshold: 0.45,
    markedUsers: new Set(),
    statusMessage: 'Ready to start attendance.',
    statusType: 'info' // info, success, warning, error
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const runLoopRef = useRef(false);
  const faceMatcherRef = useRef(null);

  // Liveness state memory per user
  // Structure: { [userId]: { blinkCount: 0, eyeClosed: false, noseCoords: [], verified: false } }
  const livenessMemoryRef = useRef({});

  // 1. Initialize models and load embeddings database
  useEffect(() => {
    const init = async () => {
      try {
        // Load Face API neural nets
        await loadModels((progress) => {
          setLoading(prev => ({ ...prev, progress }));
        });
        setLoading(prev => ({ ...prev, models: false }));

        // Load embeddings from backend
        const embedRes = await fetch(`${API_URL}/api/embeddings`);
        const embedData = await embedRes.json();

        if (embedData.length === 0) {
          setLoading(prev => ({
            ...prev,
            database: false,
            error: 'No trained student models found in the database. Please train a model first!'
          }));
          return;
        }

        // Convert stored embeddings back to faceapi.LabeledFaceDescriptors
        const labeledDescriptors = embedData.map(user => {
          const descriptors = user.descriptors.map(d => new Float32Array(d));
          return new faceapi.LabeledFaceDescriptors(user.id, descriptors);
        });

        // Initialize FaceMatcher
        faceMatcherRef.current = new faceapi.FaceMatcher(labeledDescriptors, attendanceState.threshold);
        setLoading(prev => ({ ...prev, database: false }));

      } catch (err) {
        console.error(err);
        setLoading(prev => ({
          ...prev,
          models: false,
          database: false,
          error: 'Initialization failed. Please check backend connection.'
        }));
      }
    };

    init();

    return () => {
      stopSession();
    };
  }, []);

  // Update FaceMatcher when threshold slider changes
  const handleThresholdChange = (e) => {
    const val = parseFloat(e.target.value);
    setAttendanceState(prev => ({ ...prev, threshold: val }));
    if (faceMatcherRef.current) {
      // Re-create matcher with new threshold distance
      const labeled = faceMatcherRef.current.labeledDescriptors;
      faceMatcherRef.current = new faceapi.FaceMatcher(labeled, val);
    }
  };

  const startSession = async () => {
    try {
      setAttendanceState(prev => ({ 
        ...prev, 
        active: true, 
        statusMessage: 'Starting camera...', 
        statusType: 'info' 
      }));

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: { ideal: 30 } } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      runLoopRef.current = true;
      
      // Start processing frames loop
      requestAnimationFrame(processVideoFrame);
      setAttendanceState(prev => ({ ...prev, statusMessage: 'Verification running. Stand in front of camera.', statusType: 'info' }));
    } catch (err) {
      console.error(err);
      setAttendanceState(prev => ({
        ...prev,
        active: false,
        statusMessage: 'Could not access camera.',
        statusType: 'error'
      }));
    }
  };

  const stopSession = () => {
    runLoopRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    setAttendanceState(prev => ({ 
      ...prev, 
      active: false,
      statusMessage: 'Attendance session ended.',
      statusType: 'info'
    }));
  };

  // Distance formula for EAR calculation
  const getDistance = (p1, p2) => {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  };

  // Compute Eye Aspect Ratio (EAR)
  const calculateEAR = (eyePoints) => {
    // eyePoints coordinate indexes:
    // 0: left corner, 3: right corner, 1 & 2: top curve, 4 & 5: bottom curve
    const vertical1 = getDistance(eyePoints[1], eyePoints[5]);
    const vertical2 = getDistance(eyePoints[2], eyePoints[4]);
    const horizontal = getDistance(eyePoints[0], eyePoints[3]);
    return (vertical1 + vertical2) / (2.0 * horizontal);
  };

  // Main frame loop
  const processVideoFrame = async () => {
    if (!runLoopRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const matcher = faceMatcherRef.current;

    // Verify video is actually rendering frames
    if (video.paused || video.ended || video.readyState < 2) {
      requestAnimationFrame(processVideoFrame);
      return;
    }

    // Capture detections with landmarks and descriptors
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < resizedDetections.length; i++) {
      const det = resizedDetections[i];
      const descriptor = det.descriptor;
      const box = det.detection.box;
      const landmarks = det.landmarks;

      // 1. Recognize User
      let recognizedId = 'unknown';
      let recognizedName = 'Unknown';
      let confidence = 0;

      if (matcher) {
        const bestMatch = matcher.findBestMatch(descriptor);
        recognizedId = bestMatch.label;
        confidence = (1 - bestMatch.distance).toFixed(2);
        
        if (recognizedId !== 'unknown') {
          // Extract name from ID (Format: ID_Name)
          recognizedName = recognizedId.includes('_') ? recognizedId.split('_')[1] : recognizedId;
        }
      }

      // If unrecognized, draw red box and skip liveness tracking
      if (recognizedId === 'unknown') {
        drawFaceBox(context, box, 'Unknown', 'Access Denied', '#ef4444');
        continue;
      }

      // 2. Perform Liveness Checks (Blink + Head Movement)
      
      // Initialize memory for this user if not present
      if (!livenessMemoryRef.current[recognizedId]) {
        livenessMemoryRef.current[recognizedId] = {
          blinkCount: 0,
          eyeClosed: false,
          noseCoords: [],
          verified: false
        };
      }

      const mem = livenessMemoryRef.current[recognizedId];

      if (!mem.verified) {
        // A. Eye Blink Detection
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = calculateEAR(leftEye);
        const rightEAR = calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2.0;

        // Check closed threshold
        if (avgEAR < 0.22) {
          mem.eyeClosed = true;
        } else if (avgEAR > 0.26 && mem.eyeClosed) {
          // Eyes open again -> Blink registered!
          mem.blinkCount += 1;
          mem.eyeClosed = false;
          console.log(`Blink registered for ${recognizedName}. Total blinks: ${mem.blinkCount}`);
        }

        // B. Head Movement Check
        const nose = landmarks.getNose();
        // Nose tip coordinate is typically nose[3]
        const noseTipX = nose[3].x;
        mem.noseCoords.push(noseTipX);
        
        if (mem.noseCoords.length > 20) {
          mem.noseCoords.shift();
        }

        let isMoving = false;
        if (mem.noseCoords.length >= 3) {
          const maxNoseX = Math.max(...mem.noseCoords);
          const minNoseX = Math.min(...mem.noseCoords);
          const movement = maxNoseX - minNoseX;
          
          if (movement > 15) {
            isMoving = true;
          }
        }

        // C. Combine for Liveness decision
        const hasBlinked = mem.blinkCount >= 1;
        if (hasBlinked && isMoving) {
          mem.verified = true;
          handleMarkAttendance(recognizedId, recognizedName);
        }
      }

      // 3. Draw Box
      if (mem.verified) {
        drawFaceBox(context, box, recognizedName, `LIVE VERIFIED`, '#10b981');
      } else {
        const text = `NOT VERIFIED (Blink + Turn Head)`;
        drawFaceBox(context, box, recognizedName, text, '#f59e0b');
      }
    }

    // Continue frame processing loop
    if (runLoopRef.current) {
      requestAnimationFrame(processVideoFrame);
    }
  };

  const drawFaceBox = (ctx, box, title, subText, color) => {
    // Draw rounded rect bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Title label bar
    ctx.fillStyle = color;
    ctx.fillRect(box.x - 1.5, box.y - 45, box.width + 3, 25);
    
    // Draw Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText(title, box.x + 8, box.y - 28);

    // Subtext label bar (liveness status)
    ctx.fillStyle = 'rgba(9, 13, 22, 0.85)';
    ctx.fillRect(box.x - 1.5, box.y + box.height, box.width + 3, 24);

    ctx.fillStyle = color;
    ctx.font = '600 11px Outfit, sans-serif';
    ctx.fillText(subText, box.x + 8, box.y + box.height + 16);
  };

  const handleMarkAttendance = async (userId, userName) => {
    try {
      const res = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, name: userName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.duplicate) {
        setAttendanceState(prev => ({
          ...prev,
          statusMessage: `✓ ${userName} has already marked attendance today.`,
          statusType: 'warning'
        }));
      } else {
        setAttendanceState(prev => {
          const updated = new Set(prev.markedUsers);
          updated.add(userId);
          return {
            ...prev,
            markedUsers: updated,
            statusMessage: `✅ Attendance recorded for ${userName}!`,
            statusType: 'success'
          };
        });
      }

    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">✅ Mark Attendance</p>
        <h1 className="sub-header">Webcam Face Scanner & Liveness Portal</h1>
      </div>

      {loading.models && (
        <div className="glass-card flex-center" style={{ flexDirection: 'column', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Loading Neural Network Models...</h3>
          <div className="progress-bar-container" style={{ maxWidth: '300px' }}>
            <div className="progress-bar-fill" style={{ width: `${loading.progress}%` }}></div>
          </div>
        </div>
      )}

      {!loading.models && loading.database && (
        <div className="glass-card flex-center" style={{ flexDirection: 'column', padding: '3rem' }}>
          {loading.error ? (
            <div style={{ textAlign: 'center' }}>
              <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem' }}>Configuration Error</h3>
              <p style={{ color: 'var(--text-muted)' }}>{loading.error}</p>
            </div>
          ) : (
            <>
              <Loader2 className="animate-spin" size={36} color="var(--primary)" style={{ marginBottom: '1rem' }} />
              <h3>Loading Embeddings Database...</h3>
            </>
          )}
        </div>
      )}

      {!loading.models && !loading.database && (
        <div className="grid-3" style={{ gridTemplateColumns: '1fr 2.2fr' }}>
          {/* Controls Side */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>Scanning Portal</h3>

            {/* Threshold slider */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Match Threshold:</span>
                <strong style={{ color: 'var(--primary-hover)' }}>{attendanceState.threshold}</strong>
              </label>
              <input
                type="range"
                min="0.30"
                max="0.70"
                step="0.05"
                className="input-field"
                style={{ padding: 0, height: '6px', background: 'rgba(255,255,255,0.1)' }}
                value={attendanceState.threshold}
                onChange={handleThresholdChange}
                disabled={attendanceState.active}
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Stricter settings match more accurately.
              </p>
            </div>

            {/* Attendance Status Messages */}
            <div 
              className={`alert ${
                attendanceState.statusType === 'success' ? 'alert-success' :
                attendanceState.statusType === 'warning' ? 'alert-warning' :
                attendanceState.statusType === 'error' ? 'alert-danger' : 'alert-info'
              }`}
            >
              <span>{attendanceState.statusMessage}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
              {!attendanceState.active ? (
                <button onClick={startSession} className="btn btn-primary" style={{ width: '100%' }}>
                  <Play size={18} />
                  <span>Start Attendance</span>
                </button>
              ) : (
                <button onClick={stopSession} className="btn btn-danger" style={{ width: '100%' }}>
                  <Square size={18} />
                  <span>Stop Scanner</span>
                </button>
              )}
            </div>

            {/* Display list of users marked in this session */}
            {attendanceState.markedUsers.size > 0 && (
              <div style={{ marginTop: '2.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', color: '#a78bfa' }}>Marked This Session:</h4>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {Array.from(attendanceState.markedUsers).map(userId => (
                    <li 
                      key={userId} 
                      style={{ 
                        fontSize: '0.9rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        color: 'var(--text-main)',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.04)'
                      }}
                    >
                      <CheckCircle2 size={16} color="var(--success)" />
                      <span>{userId.split('_')[1]} ({userId.split('_')[0]})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Camera Frame */}
          <div className="glass-card flex-center" style={{ flexDirection: 'column' }}>
            <div className="camera-wrapper">
              <video
                ref={videoRef}
                className="webcam-feed"
                autoPlay
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="canvas-overlay" />
              
              <div className="camera-status">
                <span className={`status-dot ${attendanceState.active ? 'active' : 'inactive'}`}></span>
                <span>{attendanceState.active ? 'Scanner Live' : 'Scanner Offline'}</span>
              </div>
            </div>

            {!attendanceState.active && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p>Scanner feed is currently stopped.</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Click "Start Attendance" on the left to begin verification.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MarkAttendance;
