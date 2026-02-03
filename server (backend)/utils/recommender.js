const mlService = require('../services/mlService');
const { getReputations } = require('../services/organizerReputationService');

class Recommender {
    /**
     * Ranks a set of candidate events for a specific user.
     * Formula: Score = ML_Score + Interest_Weight + (Organizer_Boost * 0.2) + (Popularity * 0.1)
     */
    async rankEvents(user, events) {
        // Fetch ML scores - we still calculate them for the recommendationScore field
        const mlScores = await mlService.getMLPredictions(user, events);

        // Determine organizer IDs from events (handle populated or raw ids)
        const organizerIds = [];
        for (const ev of events) {
            const id = ev && ev.organizerId ? (typeof ev.organizerId === 'object' ? (ev.organizerId._id || ev.organizerId).toString() : ev.organizerId.toString()) : null;
            if (id && !organizerIds.includes(id)) organizerIds.push(id);
        }

        // Fetch organizer reputations (avg feedback ratings)
        const reputations = await getReputations(organizerIds);

        // Accept either Mongoose documents or plain objects
        const rankedEvents = events.map((event, index) => {
            const mlScore = mlScores[index] || 0.5;
            const base = (event && typeof event.toObject === 'function') ? event.toObject() : { ...(event || {}) };

            const interestWeight = (user.interestWeights && (user.interestWeights[base.category] !== undefined))
                ? user.interestWeights[base.category]
                : 0.5;

            // Organizer reputation: prefer computed reputations, fallback to event.organizerRating or 3.5
            const orgId = base.organizerId ? (typeof base.organizerId === 'object' ? (base.organizerId._id || base.organizerId).toString() : base.organizerId.toString()) : null;
            const organizerAvg = orgId && reputations[orgId] ? reputations[orgId] : (base.organizerRating || 3.5);
            const organizerRepNormalized = Math.min(1.0, Math.max(0, organizerAvg / 5));

            const popularityFactor = Math.min(1.0, (base.popularityScore || 0) / 100);

            // Distance Factor (if using aggregate $geoNear, it adds a "distance" field in meters)
            let distanceScore = 0.5; // Neutral default
            if (base.distance !== undefined) {
                const distanceKm = base.distance / 1000;
                // Higher score for closer events. Boost if < 5km, neutral if 10km, penalize if > 20km
                distanceScore = Math.max(0, 1 - (distanceKm / 40)); // Scale 0 to 1 over 40km
            }

            // Recency: relative to when the event was added (createdAt)
            const now = new Date();
            const createdDate = new Date(base.createdAt || base.dateTime || now);
            const ageMs = Math.max(0, now - createdDate);
            const ageDays = ageMs / (1000 * 60 * 60 * 24);
            const recencyScore = Math.max(0, 1 - (ageDays / 30)); // Normalized over 30 days

            // Composite score: Interests(35%) + Distance(25%) + Recency(15%) + ML(15%) + Reputation(10%)
            const finalScore = (interestWeight * 0.35) + (distanceScore * 0.25) + (recencyScore * 0.15) + (mlScore * 0.15) + (organizerRepNormalized * 0.10);

            return {
                ...base,
                recommendationScore: finalScore,
                interestWeight,
                distanceScore,
                timestampCreated: createdDate.getTime(),
                organizerAvgRating: organizerAvg
            };
        });

        // STRICT SORTING: 
        // 1. Recommendation Score (Highest first)
        // 2. User Interest Weight (Tie-breaker)
        return rankedEvents.sort((a, b) => {
            if (Math.abs(b.recommendationScore - a.recommendationScore) > 0.01) {
                return b.recommendationScore - a.recommendationScore;
            }
            if (b.interestWeight !== a.interestWeight) {
                return b.interestWeight - a.interestWeight;
            }
            return b.timestampCreated - a.timestampCreated;
        });
    }
}

module.exports = new Recommender();
