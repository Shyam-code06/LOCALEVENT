const Feedback = require('../models/Feedback');
const Event = require('../models/Event');
const mlService = require('../services/mlService');
const { updateTrustWithFeedback } = require('../services/trustService');

exports.createFeedback = async (req, res) => {
    const { eventId, rating, comment, userId, imageUrl } = req.body;

    try {
        const feedback = await Feedback.create({
            user: userId,
            event: eventId,
            rating,
            comment,
            imageUrl
        });

        // Async updates for dynamic system
        updateTrustWithFeedback(eventId, rating);
        mlService.updateUserInterests(userId, (await Event.findById(eventId)).category, 'FEEDBACK');
        mlService.updateEventPopularity(eventId, 2); // Feedback is high engagement

        res.status(201).json(feedback);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'You have already submitted feedback for this event' });
        }
        res.status(400).json({ message: error.message });
    }
};

exports.getEventFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find({ event: req.params.eventId }).populate('user', 'name');
        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.checkUserFeedback = async (req, res) => {
    const { eventId, userId } = req.params;
    try {
        const feedback = await Feedback.findOne({ event: eventId, user: userId });
        res.json({ hasFeedback: !!feedback });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
