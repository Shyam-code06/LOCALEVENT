const RSVP = require('../models/RSVP');
const Event = require('../models/Event');
const User = require('../models/User');
const mlService = require('../services/mlService');
const sendEmail = require('../utils/sendEmail');
const { registrationEmailTemplate } = require('../utils/emailTemplates');
const crypto = require('crypto'); // For generating ticket codes

exports.createRSVP = async (req, res) => {
    const { eventId, status, guestsCount, source } = req.body;
    const userId = req.body.userId; // In real app, from req.user.id

    try {
        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // Check capacity if status is YES
        if (status === 'YES') {
            const currentRSVPs = await RSVP.countDocuments({ event: eventId, status: 'YES' });
            // Total heads = user + guests
            const totalNewHeads = 1 + (guestsCount || 0);

            if (currentRSVPs + totalNewHeads > event.capacity) {
                return res.status(400).json({ message: 'Event is full' });
            }
        }

        // Update or Create
        const rsvp = await RSVP.findOneAndUpdate(
            { user: userId, event: eventId },
            {
                status,
                guestsCount: guestsCount || 0,
                source: source || 'web',
                // Generate ticket code only if not exists
                $setOnInsert: { ticketCode: crypto.randomBytes(8).toString('hex').toUpperCase() }
            },
            { new: true, upsert: true }
        );

        // Send Email Notifications if status is YES (Newly joined)
        if (status === 'YES') {
            const user = await User.findById(userId);
            if (user && user.email) {
                const eventDate = new Date(event.dateTime).toLocaleString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const eventLocation = event.eventType === 'online'
                    ? 'Online / Virtual Event'
                    : `${event.locality}, ${event.city}`;

                console.log(`Attempting to send RSVP confirmation email to ${user.email} for event ${event.title}`);
                try {
                    const result = await sendEmail({
                        email: user.email,
                        subject: `Registration Confirmed: ${event.title}`,
                        message: `Hi ${user.name}, your registration for ${event.title} is confirmed!`,
                        html: registrationEmailTemplate({
                            name: user.name,
                            eventTitle: event.title,
                            eventDate: eventDate,
                            eventLocation: eventLocation,
                            ticketCode: rsvp.ticketCode
                        })
                    });

                    // Trigger dynamic updates
                    mlService.updateUserInterests(userId, event.category, 'REGISTER');
                    mlService.updateEventPopularity(eventId, 5); // Registration is very high engagement
                } catch (emailError) {
                    console.error("Failed to send RSVP confirmation email:", emailError);
                }
            }
        }

        res.json(rsvp);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify Ticket & Mark Attendance
// @route   POST /api/rsvp/verify
exports.verifyTicket = async (req, res) => {
    const { ticketCode, eventId } = req.body;
    try {
        const rsvp = await RSVP.findOne({ ticketCode, event: eventId }).populate('user', 'name email');

        if (!rsvp) {
            return res.status(404).json({ message: 'Invalid Ticket or Wrong Event' });
        }

        if (rsvp.attendanceStatus === 'Checked In') {
            return res.status(400).json({ message: 'User already checked in', rsvp });
        }

        rsvp.attendanceStatus = 'Checked In';
        rsvp.checkInTime = Date.now();
        await rsvp.save();

        res.json({ message: 'Check-in Successful', rsvp });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


exports.getUserRSVPs = async (req, res) => {
    try {
        const rsvps = await RSVP.find({ user: req.params.userId }).populate('event');

        const rsvpsWithStats = await Promise.all(rsvps.map(async (rsvp) => {
            if (!rsvp.event) return rsvp;

            const participantCount = await RSVP.countDocuments({ event: rsvp.event._id, status: 'YES' });
            return {
                ...rsvp._doc,
                event: {
                    ...rsvp.event._doc,
                    participantCount
                }
            };
        }));

        res.json(rsvpsWithStats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
exports.getEventRSVPs = async (req, res) => {
    try {
        const rsvps = await RSVP.find({ event: req.params.eventId }).populate('user', 'name email');
        res.json(rsvps);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get event demographics (Analytics)
// @route   GET /api/rsvp/analytics/:eventId
exports.getEventDemographics = async (req, res) => {
    const mongoose = require('mongoose');
    try {
        const { eventId } = req.params;

        // Aggregate RSVPs to count users by gender and age
        const stats = await RSVP.aggregate([
            { $match: { event: new mongoose.Types.ObjectId(eventId), status: 'YES' } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            { $unwind: '$userInfo' },
            {
                $project: {
                    gender: '$userInfo.profile.gender',
                    dob: '$userInfo.profile.dob',
                    attendanceStatus: '$attendanceStatus',
                    age: {
                        $dateDiff: {
                            startDate: '$userInfo.profile.dob',
                            endDate: '$$NOW',
                            unit: 'year'
                        }
                    }
                }
            }
        ]);

        // Process stats to a more usable format
        const summary = {
            registered: { Male: 0, Female: 0 },
            attended: { Male: 0, Female: 0 },
            ageGroups: {
                '10-18': 0,
                '18-30': 0,
                '30-40': 0,
                '40+': 0
            }
        };

        stats.forEach(item => {
            const gender = item.gender;
            const isAttended = item.attendanceStatus === 'Checked In';
            const age = item.age;

            // Gender stats (Filtered for Male/Female as requested)
            if (gender === 'Male' || gender === 'Female') {
                summary.registered[gender] = (summary.registered[gender] || 0) + 1;
                if (isAttended) {
                    summary.attended[gender] = (summary.attended[gender] || 0) + 1;
                }
            }

            // Age stats
            if (age >= 10 && age < 18) summary.ageGroups['10-18']++;
            else if (age >= 18 && age < 30) summary.ageGroups['18-30']++;
            else if (age >= 30 && age < 40) summary.ageGroups['30-40']++;
            else if (age >= 40) summary.ageGroups['40+']++;
        });

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
