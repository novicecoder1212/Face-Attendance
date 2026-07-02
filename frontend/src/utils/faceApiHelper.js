import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

let modelsLoaded = false;

export async function loadModels(onProgress = () => {}) {
  if (modelsLoaded) {
    onProgress(100);
    return;
  }

  try {
    console.log('Loading face-api.js models from CDN:', MODEL_URL);
    
    // Load models sequentially or parallel, update progress
    onProgress(10);
    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    onProgress(40);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    onProgress(70);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    onProgress(100);

    modelsLoaded = true;
    console.log('All models loaded successfully');
  } catch (err) {
    console.error('Failed to load face-api.js models:', err);
    throw err;
  }
}

export { faceapi };
