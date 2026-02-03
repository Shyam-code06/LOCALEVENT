const mongoose = require('mongoose');
const mirrorService = require('../services/mirrorService');

const feedbackSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    imageUrl: { type: String }, // Optional event photo from user
    createdAt: { type: Date, default: Date.now }
});

// Prevent multiple feedbacks for same event by same user
feedbackSchema.index({ user: 1, event: 1 }, { unique: true });

feedbackSchema.post('save', function () {
    mirrorService.mirrorCollection('Feedback');
});

feedbackSchema.post('remove', function () {
    mirrorService.mirrorCollection('Feedback');
});

module.exports = mongoose.model('Feedback', feedbackSchema);
