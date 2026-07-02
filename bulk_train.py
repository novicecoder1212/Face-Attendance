import os
import cv2
import pickle
import numpy as np
from insightface.app import FaceAnalysis
from tqdm import tqdm

def bulk_train():
    print("Loading InsightFace model...")
    app = FaceAnalysis(name='buffalo_l')
    app.prepare(ctx_id=0, det_size=(640, 640))
    
    training_dir = r"archive\lfw-deepfunneled\lfw-deepfunneled"
    embed_file = "TrainingImageLabel/insightface_embeddings.pkl"
    
    # Load existing embeddings if they exist
    existing_embeddings = []
    existing_names = []
    trained_persons = set()
    
    if os.path.exists(embed_file):
        with open(embed_file, "rb") as f:
            data = pickle.load(f)
            existing_embeddings = list(data["embeddings"])
            existing_names = list(data["names"])
            trained_persons = set(data["names"])
        print(f"Loaded {len(trained_persons)} already trained persons.")
    
    if not os.path.exists(training_dir):
        print(f"Error: Directory '{training_dir}' not found.")
        return

    # Find all folders in TrainingImage
    folders = [f for f in os.listdir(training_dir) if os.path.isdir(os.path.join(training_dir, f))]
    
    new_embeddings = []
    new_names = []
    
    persons_to_train = [f for f in folders if f not in trained_persons]
    
    if not persons_to_train:
        print("All folders are already trained. Nothing new to process.")
        return
        
    print(f"Found {len(persons_to_train)} new persons to train.")
    
    for person_id in persons_to_train:
        print(f"\nProcessing {person_id}...")
        dataset_dir = os.path.join(training_dir, person_id)
        image_files = [f for f in os.listdir(dataset_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
        
        if not image_files:
            print(f"  No images found in {dataset_dir}, skipping.")
            continue
            
        for img_name in tqdm(image_files, desc=f"Extracting faces"):
            img_path = os.path.join(dataset_dir, img_name)
            img = cv2.imread(img_path)
            
            if img is None:
                continue
                
            faces = app.get(img)
            
            # If a face is found, grab the embedding
            if len(faces) > 0:
                emb = faces[0].embedding
                new_embeddings.append(emb)
                new_names.append(person_id)

    if len(new_embeddings) > 0:
        print(f"\nExtracted {len(new_embeddings)} total new embeddings. Saving to database...")
        
        # Combine old and new
        final_embeddings = np.array(existing_embeddings + new_embeddings) if existing_embeddings else np.array(new_embeddings)
        final_names = np.array(existing_names + new_names) if existing_names else np.array(new_names)
        
        os.makedirs("TrainingImageLabel", exist_ok=True)
        with open(embed_file, "wb") as f:
            pickle.dump({"embeddings": final_embeddings, "names": final_names}, f)
            
        print("✅ Bulk training completed successfully!")
    else:
        print("\nNo valid faces were found in the provided images.")

if __name__ == "__main__":
    bulk_train()
