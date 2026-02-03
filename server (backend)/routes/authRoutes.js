const express = require('express');
const router = express.Router();
const {
	registerUser,
	loginUser,
	sendOtp,
	verifyOtp,
	requestRegisterOtp,
	verifyRegisterOtp
} = require('../controllers/authController');

// Legacy direct register (keeps backward compatibility)
router.post('/register', registerUser);
router.post('/login', loginUser);

// Login OTP
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// New registration OTP flow
router.post('/register/request-otp', requestRegisterOtp);
router.post('/register/verify-otp', verifyRegisterOtp);

module.exports = router;
