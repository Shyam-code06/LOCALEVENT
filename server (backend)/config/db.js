const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ Error: MONGO_URI is not defined in .env file');
      console.error('Please create a .env file in the backend directory with:');
      console.error('MONGO_URI=mongodb://localhost:27017/local-events');
      console.error('PORT=5000');
      process.exit(1);
    }
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.error('Make sure MongoDB is running or check your connection string');
    process.exit(1);
  }
};

module.exports = connectDB;
