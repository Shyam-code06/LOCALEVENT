const dotenv = require('dotenv');
const connectDB = require('../config/db');
const mlService = require('../services/mlService');

dotenv.config();

(async () => {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Triggering training...');
    const res = await mlService.trainModel();
    console.log('TRAIN RESULT:', res);
    process.exit(0);
  } catch (e) {
    console.error('TRAIN ERROR:', e);
    process.exit(1);
  }
})();