const express = require('express');
const router = express.Router();
const { createFeedback, getEventFeedback, checkUserFeedback } = require('../controllers/feedbackController');

const { protect } = require('../middlewares/authMiddleware');
const upload = require('../utils/diskUpload');

router.post('/', createFeedback);
router.get('/:eventId', getEventFeedback);
router.get('/check/:eventId/:userId', checkUserFeedback);
router.post('/upload', protect, upload.single('image'), (req, res) => {
    if (req.file) {
        res.json({ imageUrl: `http://localhost:5000/uploads/${req.file.filename}` });
    } else {
        res.status(400).json({ message: 'No file uploaded' });
    }
});

module.exports = router;
