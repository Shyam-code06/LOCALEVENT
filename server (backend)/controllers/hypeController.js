const HypePost = require('../models/HypePost');
const Event = require('../models/Event');
const User = require('../models/User');

exports.createHypePost = async (req, res) => {
    const { eventId, content, imageUrl, userName, userId } = req.body;

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Set expiry to 24 hours after event
        const expireAt = new Date(event.dateTime);
        expireAt.setHours(expireAt.getHours() + 24);

        const post = await HypePost.create({
            user: userId,
            userName,
            event: eventId,
            content,
            imageUrl,
            expireAt
        });

        res.status(201).json(post);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getEventHype = async (req, res) => {
    try {
        const posts = await HypePost.find({ event: req.params.eventId }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getHypeFeed = async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) return res.status(400).json({ message: 'User ID required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Find events user is interested in (simplified: matching city & categories)
        const relevantEvents = await Event.find({
            city: user.locationCity,
            category: { $in: user.interests }
        }).select('_id');

        const eventIds = relevantEvents.map(e => e._id);

        const posts = await HypePost.find({
            event: { $in: eventIds },
            expireAt: { $gt: new Date() } // Only active stories
        })
            .sort({ createdAt: -1 })
            .populate('event', 'title');

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
