import React, { useState, useEffect } from 'react';
import { Cpu, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { loadModels, faceapi } from '../utils/faceApiHelper';
import { API_URL } from '../utils/api';

function Train() {
  const [folders, setFolders] = useState([]);
  const [trainedList, setTrainedList] = useState(new Set());
  const [selectedPerson, setSelectedPerson] = useState('');
  const [status, setStatus] = useState({
    modelLoading: true,
    modelProgress: 0,
    training: false,
    processed: 0,
    total: 0,
    error: '',
    success: '',
    log: []
  });

  const appendLog = (msg) => {
    setStatus(prev => ({ ...prev, log: [...prev.log, `[${new Date().toLocaleTimeString()}] ${msg}`] }));
  };

  const loadInitialData = async () => {
    try {
      // Load model weights
      await loadModels((progress) => {
        setStatus(prev => ({ ...prev, modelProgress: progress }));
      });
      setStatus(prev => ({ ...prev, modelLoading: false }));

      // Fetch folders from TrainingImage
      const foldersRes = await fetch(`${API_URL}/api/images-folders`);
      const folderData = await foldersRes.json();
      setFolders(folderData);

      if (folderData.length > 0) {
        setSelectedPerson(folderData[0]);
      }

      // Fetch already trained embeddings to see who is trained
      const embedRes = await fetch(`${API_URL}/api/embeddings`);
      const embedData = await embedRes.json();
      const trainedSet = new Set(embedData.map(e => e.id));
      setTrainedList(trainedSet);

    } catch (err) {
      console.error(err);
      setStatus(prev => ({ 
        ...prev, 
        modelLoading: false, 
        error: 'Failed to initialize training module.' 
      }));
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const startTraining = async () => {
    if (!selectedPerson) return;
    
    setStatus(prev => ({ 
      ...prev, 
      training: true, 
      processed: 0, 
      total: 0, 
      error: '', 
      success: '', 
      log: [] 
    }));

    appendLog(`Starting training sequence for user: ${selectedPerson}`);

    try {
      // 1. Fetch training images URLs from backend
      const imagesRes = await fetch(`${API_URL}/api/images/${selectedPerson}`);
      const relativeUrls = await imagesRes.json();
      
      if (relativeUrls.length === 0) {
        throw new Error('No images found in dataset. Please collect faces first.');
      }

      setStatus(prev => ({ ...prev, total: relativeUrls.length }));
      appendLog(`Found ${relativeUrls.length} images. Processing...`);

      const descriptors = [];
      let successCount = 0;

      // 2. Loop through each image, load it, detect face and get descriptors
      for (let i = 0; i < relativeUrls.length; i++) {
        const url = `${API_URL}${relativeUrls[i]}`;
        const fileName = relativeUrls[i].split('/').pop();

        appendLog(`Processing image ${i + 1}/${relativeUrls.length}: ${fileName}`);

        try {
          // Load image using Promise
          const img = await new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous'; // Crucial to prevent CORS canvas taint
            image.src = url;
            image.onload = () => resolve(image);
            image.onerror = (e) => reject(new Error(`Failed to load image: ${fileName}`));
          });

          // Detect face with landmarks and face recognition descriptor
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptors.push(Array.from(detection.descriptor));
            successCount++;
            appendLog(`✅ Face descriptor extracted successfully from ${fileName}`);
          } else {
            appendLog(`⚠️ No face detected in ${fileName}. Skipping.`);
          }
        } catch (err) {
          appendLog(`❌ Error processing ${fileName}: ${err.message}`);
        }

        setStatus(prev => ({ ...prev, processed: i + 1 }));
      }

      appendLog(`Extraction finished. Successfully extracted ${successCount} out of ${relativeUrls.length} faces.`);

      if (descriptors.length === 0) {
        throw new Error('Could not extract face descriptors from any images. Check lighting and image quality.');
      }

      // 3. Sync extracted descriptors back to Node.js backend
      // Extract student name from folder string (Format: UNIVID_NAME)
      let namePart = selectedPerson;
      if (selectedPerson.includes('_')) {
        namePart = selectedPerson.split('_')[1];
      }

      appendLog('Syncing embeddings database with the backend...');
      
      const syncRes = await fetch(`${API_URL}/api/embeddings/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedPerson,
          name: namePart,
          descriptors: descriptors
        })
      });

      if (!syncRes.ok) {
        throw new Error('Failed to save embeddings to backend database.');
      }

      appendLog('🎉 Sync complete! Embeddings successfully stored on backend.');
      setStatus(prev => ({
        ...prev,
        training: false,
        success: `Training successfully completed for ${selectedPerson}!`
      }));

      // Refresh list
      const updatedTrained = new Set(trainedList);
      updatedTrained.add(selectedPerson);
      setTrainedList(updatedTrained);

    } catch (err) {
      appendLog(`❌ Training failed: ${err.message}`);
      setStatus(prev => ({ ...prev, training: false, error: err.message }));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="institute-header">
        <p className="main-header">🧠 Model Training Module</p>
        <h1 className="sub-header">Train Face Embeddings from Collected Images</h1>
      </div>

      {status.modelLoading && (
        <div className="glass-card flex-center" style={{ flexDirection: 'column', padding: '3rem' }}>
          <Loader2 className="animate-spin" size={48} color="var(--primary)" style={{ marginBottom: '1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Loading Neural Network Models...</h3>
          <p style={{ color: 'var(--text-muted)' }}>This only happens on first load.</p>
          <div className="progress-bar-container" style={{ maxWidth: '300px' }}>
            <div className="progress-bar-fill" style={{ width: `${status.modelProgress}%` }}></div>
          </div>
        </div>
      )}

      {!status.modelLoading && (
        <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
          {/* Controls Card */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem', color: '#a78bfa' }}>Training Configuration</h3>

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

            {folders.length === 0 ? (
              <div className="alert alert-warning">
                <AlertCircle size={18} />
                <span>No registered datasets found. Please register and collect images first!</span>
              </div>
            ) : (
              <div>
                <div className="form-group">
                  <label className="form-label">Select Student Dataset</label>
                  <select
                    className="input-field"
                    value={selectedPerson}
                    onChange={(e) => setSelectedPerson(e.target.value)}
                    disabled={status.training}
                    style={{ background: 'rgba(9, 13, 22, 0.8)' }}
                  >
                    {folders.map(f => (
                      <option key={f} value={f}>
                        {f} {trainedList.has(f) ? '(Trained ✓)' : '(Untrained ⏳)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Dataset Folder:</span>
                    <strong>{selectedPerson}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Training Status:</span>
                    {trainedList.has(selectedPerson) ? (
                      <strong style={{ color: 'var(--success)' }}>TRAINED ✓</strong>
                    ) : (
                      <strong style={{ color: 'var(--warning)' }}>NOT YET TRAINED ⏳</strong>
                    )}
                  </div>
                </div>

                <button
                  onClick={startTraining}
                  disabled={status.training || !selectedPerson}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: '2rem' }}
                >
                  {status.training ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Training... ({status.processed}/{status.total})</span>
                    </>
                  ) : (
                    <>
                      <Cpu size={18} />
                      <span>Start Training</span>
                    </>
                  )}
                </button>
              </div>
            )}
            
            {status.training && (
              <div style={{ marginTop: '2rem' }}>
                <div className="progress-bar-container">
                  <div 
                    className="progress-bar-fill" 
                    style={{ width: `${status.total > 0 ? (status.processed / status.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Console / Log Output */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <h3 style={{ marginBottom: '1rem', color: '#a78bfa' }}>Training Console Output</h3>
            <div 
              style={{
                flexGrow: 1,
                background: 'rgba(0,0,0,0.4)',
                borderRadius: '12px',
                border: '1px solid var(--card-border)',
                padding: '1.25rem',
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#6ee7b7',
                maxHeight: '400px',
                minHeight: '280px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              {status.log.length === 0 ? (
                <span style={{ color: 'var(--text-muted)' }}>Console is ready. Select a dataset and start training to output logs.</span>
              ) : (
                status.log.map((line, idx) => <span key={idx}>{line}</span>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Train;
