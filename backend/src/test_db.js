require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in the .env file!');
  process.exit(1);
}

console.log('Attempting to connect to MongoDB Atlas...');
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas successfully.');
    
    // Retrieve connection status and collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections in database:');
    collections.forEach(c => console.log(` - ${c.name}`));

    // Check Users count
    const User = mongoose.model('User', new mongoose.Schema({}));
    const userCount = await User.countDocuments();
    console.log(`Registered users in database: ${userCount}`);

    console.log('\n🌟 VERIFICATION SUCCESS: MongoDB database connection is fully operational!');
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ MongoDB Connection Failure:', err.message);
    process.exit(1);
  });
