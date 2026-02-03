const User = require('../models/User');
const Event = require('../models/Event');
const Feedback = require('../models/Feedback');
const RSVP = require('../models/RSVP');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');

// Admin credentials (removed hardcoded)

// @desc    Admin Login
// @route   POST /api/admin/login
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (user.role === 'admin') && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign({ id: user._id, role: 'admin' }, process.env.JWT_SECRET || 'local-events-dev-secret', { expiresIn: '30d' });
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: 'admin',
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid admin credentials' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
exports.getAllOrganizers = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' }).select('-password').sort({ createdAt: -1 });
        res.json(organizers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get organizer by ID
// @route   GET /api/admin/organizers/:id
exports.getOrganizerById = async (req, res) => {
    try {
        const organizer = await User.findById(req.params.id).select('-password');
        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }
        res.json(organizer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify/Reject Organizer
// @route   PUT /api/admin/organizers/:id/verify
exports.verifyOrganizer = async (req, res) => {
    try {
        const { status, notes, trustRating } = req.body; // status: 'verified', 'rejected', 'under_review', 'pending'
        const organizer = await User.findById(req.params.id);

        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        organizer.organizerProfile.verificationStatus = status;
        organizer.organizerProfile.verified = status === 'verified';
        if (notes) {
            organizer.organizerProfile.verificationNotes = notes;
        }

        // Update trust score if provided during verification
        if (trustRating !== undefined) {
            organizer.organizerProfile.trustRating = trustRating;
        }

        await organizer.save();

        let statusText = "updated";
        if (status === 'verified') statusText = "verified";
        else if (status === 'rejected') statusText = "rejected";
        else if (status === 'under_review') statusText = "placed under review";

        res.json({
            message: `Organizer ${statusText} successfully`,
            organizer: {
                _id: organizer._id,
                name: organizer.name,
                email: organizer.email,
                organizerProfile: organizer.organizerProfile
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update organizer trust score
// @route   PUT /api/admin/organizers/:id/trust-score
exports.updateTrustScore = async (req, res) => {
    try {
        const { trustRating } = req.body;
        const organizer = await User.findById(req.params.id);

        if (!organizer || organizer.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Calculate trust score based on successful events
        const pastEvents = await Event.find({
            organizerId: organizer._id,
            dateTime: { $lt: new Date() }
        });

        const totalEvents = pastEvents.length;
        const successfulEvents = await Feedback.aggregate([
            {
                $lookup: {
                    from: 'events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'eventData'
                }
            },
            {
                $match: {
                    'eventData.organizerId': organizer._id,
                    rating: { $gte: 4 } // Events with rating >= 4 are considered successful
                }
            },
            {
                $count: 'successful'
            }
        ]);

        const successfulCount = successfulEvents[0]?.successful || 0;

        // Calculate trust score: base 50 + (successful events * 5) + (total events * 2)
        // Cap at 100
        let calculatedTrust = 50;
        calculatedTrust += successfulCount * 5;
        calculatedTrust += totalEvents * 2;
        calculatedTrust = Math.min(100, calculatedTrust);

        // Use provided trustRating or calculated one
        organizer.organizerProfile.trustRating = trustRating !== undefined ? trustRating : calculatedTrust;
        organizer.organizerProfile.eventsHosted = totalEvents;

        await organizer.save();
        res.json({
            message: 'Trust score updated',
            organizer: {
                _id: organizer._id,
                name: organizer.name,
                organizerProfile: organizer.organizerProfile
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all events
// @route   GET /api/admin/events
exports.getAllEvents = async (req, res) => {
    try {
        const events = await Event.find().populate('organizerId', 'name email organizerProfile').sort({ createdAt: -1 });

        const eventsWithStats = await Promise.all(events.map(async (event) => {
            const feedbacks = await Feedback.find({ event: event._id });
            const participantCount = await RSVP.countDocuments({ event: event._id, status: 'YES' });

            const avgRating = feedbacks.length > 0
                ? feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length
                : 0;

            return {
                ...event._doc,
                participantCount: participantCount,
                averageRating: avgRating.toFixed(1),
                feedbackCount: feedbacks.length
            };
        }));

        res.json(eventsWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
exports.getDashboardStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const totalOrganizers = await User.countDocuments({ role: 'organizer' });
        const verifiedOrganizers = await User.countDocuments({
            role: 'organizer',
            'organizerProfile.verified': true
        });
        const pendingOrganizers = await User.countDocuments({
            role: 'organizer',
            'organizerProfile.verificationStatus': { $in: ['pending', 'under_review'] }
        });
        const totalEvents = await Event.countDocuments();
        const upcomingEvents = await Event.countDocuments({ dateTime: { $gte: new Date() } });
        const pastEvents = await Event.countDocuments({ dateTime: { $lt: new Date() } });
        const totalRSVPs = await RSVP.countDocuments();
        const totalFeedback = await Feedback.countDocuments();

        res.json({
            users: {
                total: totalUsers,
                organizers: totalOrganizers,
                verifiedOrganizers,
                pendingOrganizers
            },
            events: {
                total: totalEvents,
                upcoming: upcomingEvents,
                past: pastEvents
            },
            engagement: {
                totalRSVPs,
                totalFeedback
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get feedback for completed events
// @route   GET /api/admin/feedback
exports.getFeedback = async (req, res) => {
    try {
        const feedback = await Feedback.find()
            .populate('user', 'name email role')
            .populate({
                path: 'event',
                populate: {
                    path: 'organizerId',
                    select: 'name email organizerProfile'
                }
            })
            .sort({ createdAt: -1 });

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Auto-update all organizer trust scores
// @route   POST /api/admin/update-trust-scores
exports.updateAllTrustScores = async (req, res) => {
    try {
        const organizers = await User.find({ role: 'organizer' });
        const updates = [];

        for (const organizer of organizers) {
            const pastEvents = await Event.find({
                organizerId: organizer._id,
                dateTime: { $lt: new Date() }
            });

            const successfulEvents = await Feedback.aggregate([
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'eventData'
                    }
                },
                {
                    $match: {
                        'eventData.organizerId': organizer._id,
                        rating: { $gte: 4 }
                    }
                },
                {
                    $count: 'successful'
                }
            ]);

            const successfulCount = successfulEvents[0]?.successful || 0;
            const totalEvents = pastEvents.length;

            let calculatedTrust = 50;
            calculatedTrust += successfulCount * 5;
            calculatedTrust += totalEvents * 2;
            calculatedTrust = Math.min(100, calculatedTrust);

            organizer.organizerProfile.trustRating = calculatedTrust;
            organizer.organizerProfile.eventsHosted = totalEvents;
            await organizer.save();

            updates.push({
                organizerId: organizer._id,
                name: organizer.name,
                trustRating: calculatedTrust,
                eventsHosted: totalEvents
            });
        }

        res.json({
            message: 'Trust scores updated for all organizers',
            updates
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Admin Soft Delete Event
// @route   DELETE /api/admin/events/:id
exports.deleteEvent = async (req, res) => {
    try {
        const { reason } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.isDeleted = true;
        event.deletionReason = reason || 'Deleted by Admin';
        await event.save();

        res.json({ message: 'Event deleted successfully', eventId: event._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



// @desc    Deactivate/Activate User (Organizer/User)
// @route   PUT /api/admin/users/:id/status
exports.updateUserStatus = async (req, res) => {
    try {
        const { isActive, reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isActive = isActive;
        if (isActive === false) {
            user.deactivationReason = reason || 'Deactivated by Admin';
        } else {
            user.deactivationReason = undefined;
        }

        await user.save();
        res.json({
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            user: { _id: user._id, isActive: user.isActive, deactivationReason: user.deactivationReason }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Deactivate Organizer
// @route   PUT /api/admin/organizers/:id/deactivate
exports.deactivateOrganizer = async (req, res) => {
    try {
        const { reason } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        user.isActive = false;
        user.deactivationReason = reason || 'Deactivated by Admin';

        await user.save();
        res.json({
            message: 'Organizer deactivated successfully',
            user: { _id: user._id, isActive: user.isActive, deactivationReason: user.deactivationReason }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Activate Organizer
// @route   PUT /api/admin/organizers/:id/activate
exports.activateOrganizer = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        user.isActive = true;
        user.deactivationReason = undefined;

        await user.save();
        res.json({
            message: 'Organizer activated successfully',
            user: { _id: user._id, isActive: user.isActive }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Generate Overall Report
// @route   GET /api/admin/report
exports.generateOverallReport = async (req, res) => {
    try {
        const events = await Event.find().populate('organizerId', 'name organizerProfile');

        const report = await Promise.all(events.map(async (event) => {
            const feedbacks = await Feedback.find({ event: event._id });
            const participantCount = await RSVP.countDocuments({ event: event._id, status: 'YES' });

            const avgRating = feedbacks.length > 0
                ? feedbacks.reduce((acc, curr) => acc + curr.rating, 0) / feedbacks.length
                : 0;

            return {
                eventId: event._id,
                title: event.title,
                organizer: event.organizerId?.organizerProfile?.organizationName || event.organizerName,
                date: event.dateTime,
                category: event.category,
                participants: participantCount,
                capacity: event.capacity,
                avgRating: avgRating.toFixed(1),
                feedbackCount: feedbacks.length,
                status: event.status
            };
        }));

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
