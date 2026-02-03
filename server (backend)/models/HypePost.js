const mongoose = require('mongoose');

const hypePostSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true }, // Cache name for speed
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
    content: { type: String },
    imageUrl: { type: String },
    likes: { type: Number, default: 0 },
    expireAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } }
}, { timestamps: true });

module.exports = mongoose.model('HypePost', hypePostSchema);
