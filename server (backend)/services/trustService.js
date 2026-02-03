const Event = require('../models/Event');

const calculateTrustScore = async (eventData) => {
    let score = 50; // Base score

    // 1. Completeness: +10 if description is detailed (> 50 chars)
    if (eventData.description && eventData.description.length > 50) {
        score += 10;
    }

    // 2. Source Platform Trust
    // Manual entries by logged-in users are slightly more trusted than scraped data initially
    if (eventData.sourcePlatform === 'Manual') {
        score += 10;
    } else if (eventData.sourcePlatform === 'WhatsApp') {
        score -= 5; // Unverified source
    }

    // 3. Organizer History (finding past events by name)
    // In a real app, this would be by ID, but we support loose names due to scraping
    const historyCount = await Event.countDocuments({
        organizerName: eventData.organizerName,
        dateTime: { $lt: new Date() } // Past events
    });

    if (historyCount > 5) score += 20;
    else if (historyCount > 2) score += 10;

    // 4. Spam Detection (Duplicate Check)
    const duplicate = await Event.findOne({
        title: eventData.title,
        dateTime: eventData.dateTime,
        city: eventData.city
    });

    if (duplicate) {
        console.log("Duplicate event detected, marking as spam.");
        return 0;
    }

    // Cap score at 100
    return Math.min(score, 100);
};

const updateTrustWithFeedback = async (eventId, newRating) => {
    try {
        const Event = require('../models/Event');
        const event = await Event.findById(eventId);
        if (!event) return;

        // Simple Algorithm:
        // If rating >= 4, increase trust (+1)
        // If rating <= 2, decrease trust (-2)
        // Cap at 100, Min at 0
        let change = 0;
        if (newRating >= 4) change = 1;
        if (newRating <= 2) change = -2;

        if (change !== 0) {
            event.trustScore = Math.min(100, Math.max(0, event.trustScore + change));
            await event.save();
        }
    } catch (err) {
        console.error("Error updating trust score:", err);
    }
};

module.exports = { calculateTrustScore, updateTrustWithFeedback };
