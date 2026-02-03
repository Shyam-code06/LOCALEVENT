const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // already hashed
  interests: [{ type: String }],
  locationCity: { type: String, default: '' },
  role: { type: String, default: 'user' },
  organizerProfile: {
    organizationName: { type: String, default: '' },
    bio: { type: String, default: '' }
  },
  otp: { type: String },
  otpExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Registration', registrationSchema);
