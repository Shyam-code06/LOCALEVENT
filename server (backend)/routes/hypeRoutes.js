const express = require('express');
const router = express.Router();
const { createHypePost, getEventHype, getHypeFeed } = require('../controllers/hypeController');

router.get('/feed', getHypeFeed); // Specific route first
router.post('/', createHypePost);
router.get('/:eventId', getEventHype);

module.exports = router;
