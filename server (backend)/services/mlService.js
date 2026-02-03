const User = require('../models/User');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const axios = require('axios');
const mirrorService = require('./mirrorService');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Normalize category names to a canonical set used by the ML pipeline
const KNOWN_CATEGORIES = ['Tech', 'Food', 'Music', 'Sports', 'Workshop', 'Meetup', 'Art', 'Other'];
const normalizeCategory = (raw) => {
    if (!raw && raw !== 0) return 'Other';
    const s = String(raw).trim().toLowerCase();
    if (!s) return 'Other';
    for (const c of KNOWN_CATEGORIES) {
        if (c.toLowerCase() === s) return c;
    }
    // handle simple pluralization/aliases
    if (s.includes('tech')) return 'Tech';
    if (s.includes('food')) return 'Food';
    if (s.includes('music')) return 'Music';
    if (s.includes('sport')) return 'Sports';
    if (s.includes('workshop')) return 'Workshop';
    if (s.includes('meetup')) return 'Meetup';
    if (s.includes('art')) return 'Art';
    return 'Other';
};

class MLService {
    async trainModel() {
        try {
            // Ensure CSV mirrors are up-to-date before asking Python service to train
            await Promise.all([
                mirrorService.mirrorCollection('User'),
                mirrorService.mirrorCollection('Event'),
                mirrorService.mirrorCollection('Feedback')
            ]);

            // Python service reads from CSV mirrors
            const response = await axios.post(`${ML_SERVICE_URL}/train`);
            console.log('Training response:', response.data);
            return response.data;
        } catch (error) {
            console.error('Error training model:', error.response ? { status: error.response.status, data: error.response.data } : error.message || error);
            throw error;
        }
    }

    async getMLPredictions(user, candidateEvents) {
        try {
            // Build normalized user features and event features so both sides use the same category keys
            const categories = KNOWN_CATEGORIES;

            // Normalize user weights: produce an object where keys are canonical category names
            const rawWeights = (user && user.interestWeights && typeof user.interestWeights.toObject === 'function')
                ? user.interestWeights.toObject()
                : (user && user.interestWeights) || {};
            const normalizedUserFeatures = {};
            categories.forEach(cat => {
                // allow older users who may have lowercase keys
                normalizedUserFeatures[cat] = (rawWeights[cat] !== undefined)
                    ? rawWeights[cat]
                    : (rawWeights[cat.toLowerCase()] !== undefined ? rawWeights[cat.toLowerCase()] : 0.5);
            });

            const eventFeatures = candidateEvents.map(event => {
                const normCat = normalizeCategory(event.category);
                const feat = {
                    trustScore: event.trustScore || 0,
                    popularity: event.popularityScore || 0,
                    organizerRating: event.organizerRating || 0,
                    category: normCat
                };
                // one-hot for known categories (ML service will use same names)
                categories.forEach(cat => {
                    feat[`is_${cat}`] = (normCat === cat) ? 1 : 0;
                });
                return feat;
            });

            const payload = {
                user_features: normalizedUserFeatures,
                event_features: eventFeatures
            };

            const url1 = `${ML_SERVICE_URL}/predict`;
            const url2 = `${ML_SERVICE_URL}/predict/`;

            let response;
            try {
                response = await axios.post(url1, payload);
            } catch (err) {
                // Log detailed error for debugging
                console.warn('Prediction error (first attempt): ML Service might be down.');
                // Try fallback URL with trailing slash
                try {
                    response = await axios.post(url2, payload);
                } catch (err2) {
                    // console.error('Prediction error (second attempt):', err2.message);
                    throw err2;
                }
            }

            return response.data.scores;
        } catch (error) {
            if (error.code === 'ECONNREFUSED') {
                console.warn('ML Service unreachable (ECONNREFUSED). Using fallback scores.');
            } else {
                console.error('Prediction error final:', error.message);
            }
            return candidateEvents.map(() => 0.5); // Fallback score
        }
    }

    /**
     * Dynamically update user interest weights based on behavior.
     */
    async updateUserInterests(userId, category, interactionType) {
        const weightDelta = interactionType === 'REGISTER' ? 0.1 : 0.05;
        const user = await User.findById(userId);
        if (user && user.interestWeights[category] !== undefined) {
            user.interestWeights[category] = Math.min(1.0, user.interestWeights[category] + weightDelta);
            user.lastActive = new Date();
            await user.save();
        }
    }

    /**
     * Increment popularity score and update organizer rating.
     */
    async updateEventPopularity(eventId, delta = 1) {
        const event = await Event.findById(eventId);
        if (event) {
            event.popularityScore = (event.popularityScore || 0) + delta;
            await event.save();
        }
    }
}

module.exports = new MLService();
