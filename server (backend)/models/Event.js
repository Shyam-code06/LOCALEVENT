const mongoose = require('mongoose');
const mirrorService = require('../services/mirrorService');

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['Workshop', 'Meetup', 'Music', 'Art', 'Sports', 'Food', 'Tech', 'Other']
    },
    city: { type: String, required: true, index: true },
    locality: { type: String, required: true },
    dateTime: { type: Date, required: true, index: true },
    capacity: { type: Number, required: true },
    organizerName: { type: String, required: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sourcePlatform: {
        type: String,
        enum: ['WhatsApp', 'Facebook', 'Instagram', 'Manual', 'Other'],
        default: 'Manual'
    },
    trustScore: { type: Number, default: 0, min: 0, max: 100 },
    popularityScore: { type: Number, default: 0 },
    organizerRating: { type: Number, default: 0 },
    imageUrl: { type: String }, // Auto-generated based on category
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Registration & External Links
    registrationLink: { type: String }, // Google Form or external registration link
    postLink: { type: String }, // Original social media post link (WhatsApp, Facebook, Instagram)
    posterImageUrl: { type: String }, // Uploaded event poster/flyer image

    // Event Type: Online or Offline
    eventType: {
        type: String,
        enum: ['online', 'offline'],
        default: 'offline'
    },
    // Event Address (for offline events)
    eventAddress: {
        street: { type: String },
        city: { type: String },
        state: { type: String },
        pincode: { type: String },
        fullAddress: { type: String }, // Complete address string
        location: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], index: '2dsphere' } // [longitude, latitude]
        }
    },
    // Online event link (for online events)
    onlineLink: { type: String }, // Zoom, Google Meet, etc.
    location: { // Explicitly NOT using a map map, but storing coords for potential future distance calc if needed, or just text.
        // Keeping it text-based as per "Avoid maps" rule, but lat/lng is useful for "nearby" logic even without a visual map.
        // Rule says: "Notify users ONLY when: Event is within nearby locality". 
        // We'll stick to string locality for now to strictly follow "Avoid maps", 
        // but maybe add simple lat/lng for distance sorting if the user allows. 
        // The user said "Avoid maps (explicitly exclude map features)". 
        // I will stick to string matching for locality first to be safe.
        type: Object,
    },
    // Status of the event
    status: {
        type: String,
        enum: ['upcoming', 'cancelled', 'completed', 'ongoing'],
        default: 'upcoming'
    },
    // Skills gained from this event (extracted from description)
    skills: [{ type: String }],
    aiSuccessScore: { type: Number, default: 0 },
    // Admin Deletion Logic
    isDeleted: { type: Boolean, default: false },
    deletionReason: { type: String, default: '' }
}, { timestamps: true });

// Compound index for efficient searching: City + Date are most common filters
eventSchema.index({ city: 1, dateTime: 1 });
eventSchema.index({ trustScore: -1 }); // For ranking

eventSchema.post('save', function () {
    mirrorService.mirrorCollection('Event');
});

eventSchema.post('remove', function () {
    mirrorService.mirrorCollection('Event');
});

module.exports = mongoose.model('Event', eventSchema);
