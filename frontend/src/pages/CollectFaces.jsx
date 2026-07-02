import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { loadModels, faceapi } from '../utils/faceApiHelper';
import { API_URL } from '../utils/api';

function CollectFaces() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ univId: '', name: '' });
  const [status, setStatus] = useState({
    modelLoading: true,
    modelProgress: 0,
    cameraActive: false,
    capturing: false,
    count: 0,
    target: 50,
    error: '',
    success: ''
  });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  // Load models on mount
  useEffect(() => {
    const initModels = async () => {
      try {
        await loadModels((progress) => {
          setStatus(prev => ({ ...prev, modelProgress: progress }));
        });
        setStatus(prev => ({ ...prev, modelLoading: false }));
      } catch (err) {
        setStatus(prev => ({ 
          ...prev, 
          modelLoading: false, 
          error: 'Failed to load face detection models. Please check internet connection.' 
        }));
      }
    };
    initModels();

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const startCamera = async () => {
    try {
      setStatus(prev => ({ ...prev, error: '', success: '' }));
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      setStatus(prev => ({ ...prev, cameraActive: true }));
    } catch (err) {
      console.error('Camera access error:', err);
      setStatus(prev => ({ ...prev, error: 'Could not access webcam. Please check permissions.' }));
    }
  };

  const stopCamera = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setStatus(prev => ({ ...prev, cameraActive: false, capturing: false }));
  };

  const handleStartCapture = async (e) => {
    e.preventDefault();
    const { univId, name } = formData;
    if (!univId.trim() || !name.trim()) {
      setStatus(prev => ({ ...prev, error: 'Please enter university ID and Name.' }));
      return;
    }

    const personId = `${univId.trim()}_${name.trim()}`;

    try {
      setStatus(prev => ({ ...prev, error: '', success: '', capturing: true, count: 0 }));

      // 1. Register student details on the backend
      const regRes = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: personId, name: name.trim() })
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.error || 'Registration failed');
      }

      // 2. Start webcam
      await startCamera();

      // 3. Begin capturing loop
      let captureCount = 0;
      const targetCount = status.target;

      captureIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || !streamRef.current) return;

        // Perform face detection in browser
        const detection = await faceapi.detectSingleFace(
          videoRef.current, 
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        );

        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (detection) {
          captureCount++;
          setStatus(prev => ({ ...prev, count: captureCount }));

          // Draw detection bounding box on local canvas overlay
          const displaySize = { width: video.videoWidth, height: video.videoHeight };
          faceapi.matchDimensions(canvas, displaySize);
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
          faceapi.draw.drawDetections(canvas, resizedDetections);

          // Capture the exact frame from video
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = video.videoWidth;
          tempCanvas.height = video.videoHeight;
          const tempContext = tempCanvas.getContext('2d');
          
          // Draw video image and box to save
          tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
          
          // Convert to base64 jpeg
          const base64Image = tempCanvas.toDataURL('image/jpeg', 0.9);

          // Save image asynchronously to server
          fetch(`${API_URL}/api/images/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: personId,
              imageName: `${personId}_${captureCount}.jpg`,
              image: base64Image
            })
          }).catch(err => console.error('Failed to save frame:', err));

          // If reached target, stop capture
          if (captureCount >= targetCount) {
            stopCamera();
            setStatus(prev => ({ 
              ...prev, 
              success: `Successfully registered and captured ${targetCount} images!`,
              capturing: false
            }));
          }
        } else {
          // Clear canvas box if no face
          const context = canvas.getContext('2d');
          context.clearRect(0, 0, canvas.width, canvas.height);
        }
      }, 200); // Check and capture every 200ms

    } catch (err) {
      console.error(err);
      setStatus(prev => ({ ...prev, error: err.message, capturing: false }));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">📸 Collect Face Dataset</p>
        <h1 className="sub-header">Student Registration and Face Capture</h1>
      </div>

      {status.modelLoading && (
        <div className="glass-card flex-center" style={{ flexDirection: 'column', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Loading Face Detection Models...</h3>
          <p style={{ color: 'var(--text-muted)' }}>This only happens on first load.</p>
          <div className="progress-bar-container" style={{ maxWidth: '300px' }}>
            <div className="progress-bar-fill" style={{ width: `${status.modelProgress}%` }}></div>
          </div>
        </div>
      )}

      {!status.modelLoading && (
        <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {/* Registration Form */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>Student Details</h3>
            
            {status.error && (
              <div className="alert alert-danger">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{status.error}</span>
              </div>
            )}

            {status.success && (
              <div className="alert alert-success">
                <CheckCircle size={18} style={{ flexShrink: 0 }} />
                <span>{status.success}</span>
              </div>
            )}

            <form onSubmit={handleStartCapture}>
              <div className="form-group">
                <label className="form-label">University ID</label>
                <input
                  type="text"
                  name="univId"
                  className="input-field"
                  placeholder="e.g., 12345"
                  value={formData.univId}
                  onChange={handleInputChange}
                  disabled={status.capturing || status.cameraActive}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Student Name</label>
                <input
                  type="text"
                  name="name"
                  className="input-field"
                  placeholder="e.g., John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={status.capturing || status.cameraActive}
                  required
                />
              </div>

              {!status.cameraActive ? (
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  <Camera size={18} />
                  <span>Start Capture</span>
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={stopCamera} 
                  className="btn btn-danger" 
                  style={{ width: '100%', marginTop: '1rem' }}
                >
                  Stop Capture
                </button>
              )}
            </form>

            {status.capturing && (
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <span>Capturing Progress</span>
                  <strong style={{ color: 'var(--primary-hover)' }}>{status.count} / {status.target}</strong>
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar-fill" style={{ width: `${(status.count / status.target) * 100}%` }}></div>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' }}>
                  Move your head slightly to capture different angles.
                </p>
              </div>
            )}

            {status.success && (
              <button
                onClick={() => navigate('/train')}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '1.5rem', background: 'var(--success)' }}
              >
                Go to Model Training
              </button>
            )}
          </div>

          {/* Camera Feed Screen */}
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
                <span className={`status-dot ${status.cameraActive ? 'active' : 'inactive'}`}></span>
                <span>{status.cameraActive ? 'Camera Live' : 'Camera Inactive'}</span>
              </div>
            </div>

            {!status.cameraActive && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p>Webcam preview is currently turned off.</p>
                <p style={{ fontSize: '0.85rem' }}>Fill in the form on the left and click "Start Capture" to activate the camera.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CollectFaces;
