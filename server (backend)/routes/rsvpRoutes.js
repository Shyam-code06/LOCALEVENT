const express = require('express');
const router = express.Router();
const rsvpController = require('../controllers/rsvpController');

router.post('/', rsvpController.createRSVP);
router.post('/verify', rsvpController.verifyTicket); // New Verification Route
router.get('/analytics/:eventId', rsvpController.getEventDemographics); // Analytics Route
router.get('/user/:userId', rsvpController.getUserRSVPs);
router.get('/event/:eventId', rsvpController.getEventRSVPs);

module.exports = router;
