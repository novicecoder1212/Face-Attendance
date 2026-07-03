require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    const Attendance = mongoose.model('Attendance', new mongoose.Schema({
      id: String,
      name: String,
      dateTime: String
    }));

    const count = await Attendance.countDocuments();
    console.log(`Total attendance logs: ${count}`);

    const latest = await Attendance.find().sort({ _id: -1 }).limit(10);
    console.log('\nLatest 10 attendance records in MongoDB Atlas:');
    latest.forEach(log => {
      console.log(` - [${log.dateTime}] ID: ${log.id}, Name: ${log.name}`);
    });

    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);
  });
