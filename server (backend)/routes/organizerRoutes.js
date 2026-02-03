const express = require('express');
const router = express.Router();
const { registerOrganizer, getOrganizerStats, getOrganizerProfile, requestRegisterOrganizerOtp, verifyRegisterOrganizerOtp } = require('../controllers/organizerController');

router.post('/register-organizer', registerOrganizer);
router.post('/register-organizer/request-otp', requestRegisterOrganizerOtp);
router.post('/register-organizer/verify-otp', verifyRegisterOrganizerOtp);
router.get('/organizer-stats/:id', getOrganizerStats);
router.get('/organizer-profile/:id', getOrganizerProfile);

module.exports = router;
