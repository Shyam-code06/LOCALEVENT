const express = require('express');
const router = express.Router();
const { updateProfile, getProfile, geocode } = require('../controllers/userController');
const { updateOrganizerProfile } = require('../controllers/organizerProfileController');

router.get('/profile/:id', getProfile);
router.put('/profile/:id', updateProfile);
router.put('/organizer-profile/:id', updateOrganizerProfile);
router.get('/geocode', geocode);

module.exports = router;
