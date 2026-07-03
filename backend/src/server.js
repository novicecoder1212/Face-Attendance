require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Directory (for images)
const DATA_DIR = path.join(__dirname, '..', 'data');
app.use('/data/images', express.static(path.join(DATA_DIR, 'TrainingImage')));

// MongoDB Connection
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI || MONGO_URI.includes('<YOUR_PASSWORD>')) {
  console.warn('⚠️ WARNING: MongoDB connection string has not been updated with your password in .env yet.');
}

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully.');
    // Run migration/seeding logic after database connects
    seedFromMigratedData();
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
  });

// ================= SCHEMAS & MODELS =================

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', UserSchema);

const EmbeddingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  descriptors: { type: [[Number]], required: true },
  updatedAt: { type: Date, default: Date.now }
});
const Embedding = mongoose.model('Embedding', EmbeddingSchema);

const AttendanceSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  dateTime: { type: String, required: true }
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// ================= MIGRATION SEEDER =================
const seedFromMigratedData = async () => {
  try {
    const userCount = await User.countDocuments();
    const trainingDir = path.join(DATA_DIR, 'TrainingImage');
    
    const USERS_FILE = path.join(DATA_DIR, 'users.json');
    const EMBEDDINGS_FILE = path.join(DATA_DIR, 'embeddings.json');
    const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');

    // 1. If DB is empty, check if we have local JSON data files to import
    if (userCount === 0) {
      console.log('Checking for local JSON database files to migrate...');
      
      // Migrate users
      if (fs.existsSync(USERS_FILE)) {
        try {
          const raw = fs.readFileSync(USERS_FILE, 'utf8');
          const localUsers = JSON.parse(raw);
          if (localUsers.length > 0) {
            await User.insertMany(localUsers);
            console.log(`✓ Migrated ${localUsers.length} users to MongoDB.`);
            fs.renameSync(USERS_FILE, `${USERS_FILE}.bak`);
          }
        } catch (err) {
          console.error('Error migrating users JSON:', err);
        }
      }

      // Migrate embeddings
      if (fs.existsSync(EMBEDDINGS_FILE)) {
        try {
          const raw = fs.readFileSync(EMBEDDINGS_FILE, 'utf8');
          const localEmbeds = JSON.parse(raw);
          if (localEmbeds.length > 0) {
            await Embedding.insertMany(localEmbeds);
            console.log(`✓ Migrated ${localEmbeds.length} embeddings to MongoDB.`);
            fs.renameSync(EMBEDDINGS_FILE, `${EMBEDDINGS_FILE}.bak`);
          }
        } catch (err) {
          console.error('Error migrating embeddings JSON:', err);
        }
      }

      // Migrate attendance logs
      if (fs.existsSync(ATTENDANCE_FILE)) {
        try {
          const raw = fs.readFileSync(ATTENDANCE_FILE, 'utf8');
          const localLogs = JSON.parse(raw);
          if (localLogs.length > 0) {
            await Attendance.insertMany(localLogs);
            console.log(`✓ Migrated ${localLogs.length} attendance records to MongoDB.`);
            fs.renameSync(ATTENDANCE_FILE, `${ATTENDANCE_FILE}.bak`);
          }
        } catch (err) {
          console.error('Error migrating attendance JSON:', err);
        }
      }
    }

    // 2. Fallback: If DB is still empty and folders exist in TrainingImage, seed users list
    const updatedUserCount = await User.countDocuments();
    if (updatedUserCount === 0 && fs.existsSync(trainingDir)) {
      console.log('No JSON files found. Seeding database from folders in TrainingImage...');
      const folders = fs.readdirSync(trainingDir).filter(f => {
        const fullPath = path.join(trainingDir, f);
        return fs.statSync(fullPath).isDirectory();
      });

      const seededUsers = folders.map(folder => {
        let name = folder;
        if (folder.includes('_')) {
          const parts = folder.split('_');
          name = parts.slice(1).join('_');
        }
        return { id: folder, name };
      });

      if (seededUsers.length > 0) {
        await User.insertMany(seededUsers);
        console.log(`✓ Seeded ${seededUsers.length} user records from TrainingImage directory.`);
      }
    }

    // 3. Fallback: Seed attendance from root Attendance.csv if Attendance collection is empty
    const attendanceCount = await Attendance.countDocuments();
    const csvPath = path.join(__dirname, '..', '..', 'Attendance.csv');
    if (attendanceCount === 0 && fs.existsSync(csvPath)) {
      console.log('Attendance collection is empty. Seeding records from Attendance.csv...');
      const csvData = fs.readFileSync(csvPath, 'utf8');
      const lines = csvData.split('\n').map(l => l.trim()).filter(Boolean);
      
      if (lines.length > 1) {
        const logs = [];
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 3) {
            const id = parts[0];
            const name = parts[1];
            const dateTime = parts.slice(2).join(',');
            
            // Match with full directory ID folder name
            let fullId = id;
            if (fs.existsSync(trainingDir)) {
              const matchedFolder = fs.readdirSync(trainingDir).find(f => f.startsWith(`${id}_`));
              if (matchedFolder) {
                fullId = matchedFolder;
              }
            }
            logs.push({ id: fullId, name, dateTime });
          }
        }
        if (logs.length > 0) {
          await Attendance.insertMany(logs);
          console.log(`✓ Seeded ${logs.length} attendance records from Attendance.csv.`);
        }
      }
    }

  } catch (err) {
    console.error('Migration Seeder error:', err);
  }
};

// ================= API ENDPOINTS =================

// 1. Get all registered users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// 2. Register a new user
app.post('/api/users/register', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'ID and Name are required' });
  }

  try {
    const existing = await User.findOne({ id });
    if (existing) {
      return res.status(400).json({ error: 'User with this University ID already exists' });
    }

    const newUser = await User.create({ id, name });
    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// 3. Get all embeddings
app.get('/api/embeddings', async (req, res) => {
  try {
    const embeddings = await Embedding.find();
    res.json(embeddings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve embeddings' });
  }
});

// 4. Sync embeddings for a user
app.post('/api/embeddings/sync', async (req, res) => {
  const { id, name, descriptors } = req.body;
  if (!id || !name || !descriptors || !Array.isArray(descriptors)) {
    return res.status(400).json({ error: 'Invalid embedding data' });
  }

  try {
    const updated = await Embedding.findOneAndUpdate(
      { id },
      { name, descriptors, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.json({ message: 'Embeddings saved successfully', count: descriptors.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save embeddings' });
  }
});

// 5. Get attendance logs
app.get('/api/attendance', async (req, res) => {
  try {
    const logs = await Attendance.find();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve attendance logs' });
  }
});

// 6. Mark attendance
app.post('/api/attendance/mark', async (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'ID and Name are required' });
  }

  try {
    // Robust Indian Standard Time (IST) formatting using native Intl.DateTimeFormat
    const formatter = new Intl.DateTimeFormat('en-ZA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const formatted = formatter.format(new Date());
    const [datePart, timePart] = formatted.split(', ');
    const todayStr = datePart.replace(/\//g, '-'); // YYYY-MM-DD
    const dateTimeStr = `${todayStr} ${timePart}`; // YYYY-MM-DD HH:MM:SS

    const logs = await Attendance.find({ id });

    // Check if already marked today
    const alreadyMarked = logs.some(log => log.dateTime.split(' ')[0] === todayStr);
    if (alreadyMarked) {
      return res.status(200).json({ message: 'Attendance already marked today', duplicate: true });
    }

    const newLog = await Attendance.create({ id, name, dateTime: dateTimeStr });

    // Sync to root CSV for local reporting backup
    const csvPath = path.join(__dirname, '..', '..', 'Attendance.csv');
    try {
      if (!fs.existsSync(csvPath)) {
        fs.writeFileSync(csvPath, 'ID,Name,Date_Time\n');
      }
      fs.appendFileSync(csvPath, `${id.split('_')[0]},${name},${dateTimeStr}\n`);
    } catch (err) {
      console.error('Failed to sync to Attendance.csv:', err);
    }

    res.status(201).json({ message: 'Attendance marked successfully', log: newLog });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// 7. Delete user & embeddings
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await User.deleteOne({ id });
    await Embedding.deleteOne({ id });
    res.json({ message: `User ${id} and associated embeddings deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 8. Clear all embeddings
app.delete('/api/embeddings', async (req, res) => {
  try {
    await Embedding.deleteMany({});
    res.json({ message: 'All embeddings cleared from database' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear embeddings database' });
  }
});

// 9. Save captured face image to disk
app.post('/api/images/save', (req, res) => {
  const { id, imageName, image } = req.body;
  if (!id || !imageName || !image) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const userDir = path.join(DATA_DIR, 'TrainingImage', id);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const base64Data = image.replace(/^data:image\/jpeg;base64,/, '').replace(/^data:image\/png;base64,/, '');

  fs.writeFile(path.join(userDir, imageName), base64Data, 'base64', (err) => {
    if (err) {
      console.error('Error saving image:', err);
      return res.status(500).json({ error: 'Failed to save image' });
    }
    res.json({ message: 'Image saved successfully' });
  });
});

// 10. Get list of training images for a user
app.get('/api/images/:id', (req, res) => {
  const { id } = req.params;
  const userDir = path.join(DATA_DIR, 'TrainingImage', id);
  
  if (!fs.existsSync(userDir)) {
    return res.json([]);
  }

  try {
    const files = fs.readdirSync(userDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    res.json(files.map(file => `/data/images/${id}/${file}`));
  } catch (err) {
    console.error('Error reading training images:', err);
    res.status(500).json({ error: 'Failed to retrieve image list' });
  }
});

// 11. Get list of all folders in TrainingImage
app.get('/api/images-folders', (req, res) => {
  const trainingDir = path.join(DATA_DIR, 'TrainingImage');
  if (!fs.existsSync(trainingDir)) {
    return res.json([]);
  }

  try {
    const folders = fs.readdirSync(trainingDir).filter(f => {
      const fullPath = path.join(trainingDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
    res.json(folders);
  } catch (err) {
    console.error('Error listing image folders:', err);
    res.status(500).json({ error: 'Failed to retrieve folder list' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
