const mongoose = require('mongoose');

const rsvpSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    status: {
        type: String,
        enum: ['YES', 'MAYBE', 'NO'],
        default: 'YES'
    },
    source: {
        type: String,
        enum: ['web', 'qr'],
        default: 'web'
    },
    guestsCount: { type: Number, default: 0 }, // For "Group RSVP" feature: +1, +2
    ticketCode: { type: String, unique: true, sparse: true }, // Unique Ticket ID
    attendanceStatus: { 
        type: String, 
        enum: ['Pending', 'Checked In'], 
        default: 'Pending' 
    },
    checkInTime: { type: Date }
}, { timestamps: true });

// Prevent duplicate RSVPs
rsvpSchema.index({ user: 1, event: 1 }, { unique: true });

module.exports = mongoose.model('RSVP', rsvpSchema);
