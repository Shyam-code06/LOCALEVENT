const mongoose = require('mongoose');
const Feedback = require('../models/Feedback');

/**
 * Compute average feedback rating per organizer based on past event feedback.
 * Returns a map { organizerIdString: avgRating }
 */
async function getReputations(organizerIds = []) {
    if (!organizerIds || organizerIds.length === 0) return {};

    // Convert to ObjectId where necessary
    const objIds = organizerIds.map(id => {
        try { return mongoose.Types.ObjectId(id); } catch (e) { return id; }
    });

    // Aggregate feedbacks, joining events to find organizerId, then averaging ratings per organizer
    const agg = await Feedback.aggregate([
        {
            $lookup: {
                from: 'events',
                localField: 'event',
                foreignField: '_id',
                as: 'eventDoc'
            }
        },
        { $unwind: '$eventDoc' },
        { $match: { 'eventDoc.organizerId': { $in: objIds }, rating: { $exists: true } } },
        { $group: { _id: '$eventDoc.organizerId', avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    const map = {};
    agg.forEach(r => {
        map[String(r._id)] = r.avgRating;
    });
    return map;
}

module.exports = { getReputations };
