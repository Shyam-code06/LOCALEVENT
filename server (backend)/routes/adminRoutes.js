const express = require('express');
const router = express.Router();
const {
    adminLogin,
    getAllOrganizers,
    getOrganizerById,
    verifyOrganizer,
    updateTrustScore,
    getAllEvents,
    getDashboardStats,
    getFeedback,
    updateAllTrustScores,
    deleteEvent,
    updateUserStatus,
    deactivateOrganizer,
    activateOrganizer,
    generateOverallReport
} = require('../controllers/adminController');

const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.post('/login', adminLogin);

// Protect all other admin routes
router.use(protect);
router.use(adminOnly);

router.get('/report', generateOverallReport);
router.get('/organizers', getAllOrganizers);
router.get('/organizers/:id', getOrganizerById);
router.put('/organizers/:id/verify', verifyOrganizer);
router.put('/organizers/:id/trust-score', updateTrustScore);
router.get('/events', getAllEvents);
router.get('/stats', getDashboardStats);
router.get('/feedback', getFeedback);
router.post('/update-trust-scores', updateAllTrustScores);
router.delete('/events/:id', deleteEvent);
router.put('/users/:id/status', updateUserStatus);
router.put('/organizers/:id/deactivate', deactivateOrganizer);
router.put('/organizers/:id/activate', activateOrganizer);

module.exports = router;

