const mongoose = require('mongoose');
const mirrorService = require('../services/mirrorService');

const organizerSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    averageRating: { type: Number, default: 0 },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    totalEvents: { type: Number, default: 0 },
    ratingsCount: { type: Number, default: 0 }
}, { timestamps: true });

organizerSchema.post('save', function () {
    mirrorService.mirrorCollection('Organizer');
});

organizerSchema.post('remove', function () {
    mirrorService.mirrorCollection('Organizer');
});

module.exports = mongoose.model('Organizer', organizerSchema);
