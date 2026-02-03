const express = require('express');
const router = express.Router();
const {
    getEvents,
    createEvent,
    getEventById,
    getRecommendations,
    getDiscoverFeed,
    cancelEvent,
    markEventCompleted,
    extractEventFromImage
} = require('../controllers/eventController');
const { protect, organizerOnly } = require('../middlewares/authMiddleware');
const upload = require('../utils/fileUpload');

router.route('/')
    .get(getEvents)
    .post(protect, organizerOnly, createEvent);



router.get('/recommendations/:userId', getRecommendations);
router.get('/discover', getDiscoverFeed);
router.get('/:id', protect, getEventById);
router.put('/:id/cancel', protect, cancelEvent);
router.put('/:id/complete', protect, markEventCompleted);

module.exports = router;
