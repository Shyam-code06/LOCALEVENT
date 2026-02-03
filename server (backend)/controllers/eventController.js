const RSVP = require('../models/RSVP');
const Event = require('../models/Event');
const User = require('../models/User');

const recommender = require('../utils/recommender');
const { extractEventDetails } = require('../utils/smartParser');
const sendEmail = require('../utils/sendEmail');
const { feedbackEmailTemplate, eventCancellationEmailTemplate } = require('../utils/emailTemplates');

// @desc    Get all events (filtered)
// @route   GET /api/events
// @access  Public
// @desc    Get all events (filtered)
// @route   GET /api/events
// @access  Public
exports.getEvents = async (req, res) => {
    try {
        const { city, category, startDate, endDate, organizerId, userId, status, lat, lng, distance } = req.query;

        // If lat/lng provided, use Aggregation pipeline with $geoNear
        // Note: $geoNear MUST be the first stage
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);
            const maxDist = distance ? parseFloat(distance) * 1000 : null; // km to meters

            let matchStage = {
                isDeleted: { $ne: true }
            };

            if (city) matchStage.city = { $regex: city, $options: 'i' };
            if (category) matchStage.category = category;
            if (status) matchStage.status = status;

            // Date Filter
            if (startDate || endDate) {
                matchStage.dateTime = {};
                if (startDate) matchStage.dateTime.$gte = new Date(startDate);
                if (endDate) matchStage.dateTime.$lte = new Date(endDate);
            }

            // Pipeline
            const geoNearStage = {
                near: { type: "Point", coordinates: [userLng, userLat] },
                distanceField: "distance",
                query: matchStage,
                spherical: true
            };
            if (maxDist) geoNearStage.maxDistance = maxDist;

            const pipeline = [
                { $geoNear: geoNearStage },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'organizerId',
                        foreignField: '_id',
                        as: 'organizerId'
                    }
                },
                // Use $addFields or check if organizerId array is empty before unwind to avoid losing events without organizers
                { $addFields: { organizerId: { $ifNull: [{ $arrayElemAt: ["$organizerId", 0] }, null] } } },
                { $sort: { distance: 1 } } // Sort by distance nearest
            ];

            const events = await Event.aggregate(pipeline);
            // Populate participant count manually since aggregate doesn't support virtual populate easily
            const eventsWithParticipants = await Promise.all(events.map(async (event) => {
                const participantCount = await RSVP.countDocuments({ event: event._id, status: 'YES' });
                const attendedCount = await RSVP.countDocuments({ event: event._id, status: 'YES', attendanceStatus: 'Checked In' });
                return { ...event, participantCount, attendedCount };
            }));

            // Optional: Re-rank if userId is present (hybrid approach: distance + user interest)
            // For now, distance sort usually overrides interest in a "Nearby" feed, but we can do simple re-ranking if needed.
            // We return events sorted by distance.
            return res.json(eventsWithParticipants);

        } else {
            // Standard Find Query (Existing Logic)
            let query = {};
            if (city) query.city = { $regex: city, $options: 'i' };
            if (category) query.category = category;
            if (organizerId) query.organizerId = organizerId; // Filter by organizer
            if (status) query.status = status;

            if (startDate || endDate) {
                query.dateTime = {};
                if (startDate) query.dateTime.$gte = new Date(startDate);
                if (endDate) query.dateTime.$lte = new Date(endDate);
            }

            if (!organizerId) {
                query.isDeleted = { $ne: true };
            }

            const events = await Event.find(query)
                .populate('organizerId', 'name email organizerProfile')
                .sort({ dateTime: -1, trustScore: -1 });

            const eventsWithParticipants = await Promise.all(events.map(async (event) => {
                const participantCount = await RSVP.countDocuments({ event: event._id, status: 'YES' });
                const attendedCount = await RSVP.countDocuments({ event: event._id, status: 'YES', attendanceStatus: 'Checked In' });
                return {
                    ...event._doc,
                    participantCount,
                    attendedCount
                };
            }));

            // Recommender logic...
            let finalEvents = eventsWithParticipants;
            if (userId && eventsWithParticipants.length > 0) {
                const currentUser = await User.findById(userId);
                if (currentUser) {
                    finalEvents = await recommender.rankEvents(currentUser, eventsWithParticipants);
                }
            }
            res.json(finalEvents);
        }

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const { calculateTrustScore } = require('../services/trustService');
const { generateEventImage } = require('../utils/imageGenerator');

// @desc    Create an event
// @route   POST /api/events
// @access  Private
exports.createEvent = async (req, res) => {
    try {
        // Check if user is active
        if (req.user.isActive === false) {
            return res.status(403).json({
                message: 'Account deactivated. Reason: ' + (req.user.deactivationReason || 'Contact admin.')
            });
        }

        // Limit check for organizers
        if (req.user.role === 'organizer') {
            const isVerified = req.user.organizerProfile?.verified;
            if (!isVerified) {
                const eventCount = await Event.countDocuments({
                    organizerId: req.user._id,
                    isDeleted: { $ne: true }
                });
                if (eventCount >= 3) {
                    return res.status(403).json({
                        message: 'Limit Reached: Unverified organizers can only post 3 events. Please complete verification to post unlimited events.'
                    });
                }
            }
        }
        const { geocodeAddress } = require('../utils/geocoder');

        const trustScore = await calculateTrustScore(req.body);

        // Auto-generate image if not provided (Prefer uploaded poster if available)
        const imageUrl = req.body.posterImageUrl || req.body.imageUrl || generateEventImage(req.body.title, req.body.description, req.body.category);

        const eventData = {
            ...req.body,
            trustScore, // Add calculated score
            imageUrl, // Add auto-generated image
            skills: extractSkills(req.body.description || '')
        };

        // Geocode Address Logic
        // Priority 1: Coordinates provided by frontend
        if (req.body.coordinates && req.body.coordinates.lat) {
            if (!eventData.eventAddress) eventData.eventAddress = {};
            eventData.eventAddress.location = {
                type: 'Point',
                coordinates: [req.body.coordinates.lng, req.body.coordinates.lat]
            };
        }
        // Priority 2: Use explicit address if provided
        else if (eventData.eventAddress && eventData.eventAddress.fullAddress) {
            const geo = await geocodeAddress(eventData.eventAddress.fullAddress);
            if (geo) {
                eventData.eventAddress.location = {
                    type: 'Point',
                    coordinates: [geo.lng, geo.lat]
                };
            }
        }
        // Fallback: Construct address from city/locality
        else if (eventData.city && eventData.locality) {
            const constructedAddress = `${eventData.locality}, ${eventData.city}`;
            const geo = await geocodeAddress(constructedAddress);
            if (geo) {
                if (!eventData.eventAddress) eventData.eventAddress = {};
                eventData.eventAddress.location = {
                    type: 'Point',
                    coordinates: [geo.lng, geo.lat]
                };
            }
        }

        const event = new Event(eventData);
        const { sendEventNotifications } = require('../services/notificationService');

        const savedEvent = await event.save();

        // Trigger notifications asynchronously
        sendEventNotifications(savedEvent);

        res.status(201).json(savedEvent);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Helper: Extract skills from text
const extractSkills = (text) => {
    const commonSkills = [
        'Python', 'JavaScript', 'React', 'Node.js', 'Public Speaking', 'Leadership',
        'Networking', 'Design', 'Art', 'Yoga', 'Meditation', 'Cooking', 'Music',
        'Communication', 'Teamwork', 'Cybersecurity', 'AI', 'Machine Learning'
    ];
    const found = commonSkills.filter(skill =>
        text.toLowerCase().includes(skill.toLowerCase())
    );
    return [...new Set(found)];
};

// @desc    Cancel an event
// @route   PUT /api/events/:id/cancel
// @access  Private (Organizer/Admin)
exports.cancelEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        const isAdmin = req.user && req.user.role === 'admin';
        const isOwner = req.user && event.organizerId.toString() === req.user._id.toString();

        if (!isAdmin && !isOwner) {
            console.log("Cancel Event Failed: Not Authorized");
            return res.status(401).json({ message: 'Not authorized to cancel this event' });
        }

        event.status = 'cancelled';
        await event.save();

        // Notify attendees
        const attendees = await RSVP.find({ event: event._id, status: 'YES' }).populate('user', 'name email');

        attendees.forEach(rsvp => {
            if (rsvp.user && rsvp.user.email) {
                sendEmail({
                    email: rsvp.user.email,
                    subject: `IMPORTANT: Event Cancelled - ${event.title}`,
                    message: `Hi ${rsvp.user.name}, we're sorry to inform you that ${event.title} has been cancelled.`,
                    html: eventCancellationEmailTemplate({
                        name: rsvp.user.name,
                        eventTitle: event.title
                    })
                }).catch(err => console.error(`Failed to send cancellation email to ${rsvp.user.email}`, err));
            }
        });

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark an event as completed
// @route   PUT /api/events/:id/complete
// @access  Private (Organizer)
exports.markEventCompleted = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ message: 'Event not found' });

        if (event.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        event.status = 'completed';
        await event.save();

        // Send Feedback Emails to Attendees
        const attendees = await RSVP.find({ event: event._id, status: 'YES' }).populate('user', 'name email');

        attendees.forEach(rsvp => {
            if (rsvp.user && rsvp.user.email) {
                sendEmail({
                    email: rsvp.user.email,
                    subject: `How was ${event.title}? Rate your experience!`,
                    message: `Hi ${rsvp.user.name}, please rate your experience at ${event.title}.`,
                    html: feedbackEmailTemplate({
                        name: rsvp.user.name,
                        eventTitle: event.title
                    })
                }).catch(err => console.error(`Failed to send feedback email to ${rsvp.user.email}`, err));
            }
        });

        res.json(event);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public
exports.getEventById = async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('organizerId', 'name email organizerProfile');
        if (event) {
            const participantCount = await RSVP.countDocuments({ event: event._id, status: 'YES' });
            res.json({
                ...event._doc,
                participantCount
            });
        }
        else res.status(404).json({ message: 'Event not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get recommended events based on feedback
// @route   GET /api/events/recommendations/:userId
exports.getRecommendations = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { lat, lng } = req.query; // Accept coordinates from frontend
        const Feedback = require('../models/Feedback'); // Lazy load
        const User = require('../models/User');

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 1. Find categories user rated highly (>= 4)
        const highRatedFeedbacks = await Feedback.find({ user: userId, rating: { $gte: 4 } }).populate('event');
        // Filter out feedbacks where event might be null
        const validFeedbacks = highRatedFeedbacks.filter(f => f.event);
        const likedCategories = [...new Set(validFeedbacks.map(f => f.event.category))];

        // 2. Combine with explicit interests
        const allInterests = [...new Set([...(user.interests || []), ...likedCategories])];

        // 3. Find candidates
        let candidates;
        if (lat && lng) {
            // Use $geoNear for distance-aware candidates
            candidates = await Event.aggregate([
                {
                    $geoNear: {
                        near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
                        distanceField: "distance",
                        query: {
                            ...(allInterests.length > 0 ? { category: { $in: allInterests } } : {}),
                            dateTime: { $gte: new Date() },
                            isDeleted: { $ne: true },
                            status: 'upcoming'
                        },
                        spherical: true
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'organizerId',
                        foreignField: '_id',
                        as: 'organizerInfo'
                    }
                },
                { $limit: 30 }
            ]);
        } else {
            // Fallback to city-based
            candidates = await Event.find({
                ...(user.locationCity ? { city: user.locationCity } : {}),
                ...(allInterests.length > 0 ? { category: { $in: allInterests } } : {}),
                dateTime: { $gte: new Date() },
                isDeleted: { $ne: true },
                status: 'upcoming'
            }).limit(30);
        }

        // 4. Rank using ML service and weights
        const recommended = await recommender.rankEvents(user, candidates);
        res.json(recommended.slice(0, 10)); // Return top 10 instead of 5
    } catch (error) {
        console.error("Recommendation Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get discover feed sorted by interest and recency
// @route   GET /api/events/discover
exports.getDiscoverFeed = async (req, res) => {
    try {
        const userId = req.query.userId;
        const city = req.query.city;

        if (!userId) return res.status(400).json({ message: 'UserId is required' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Fetch candidate events: upcoming, same city, not deleted
        let query = {
            dateTime: { $gte: new Date() },
            isDeleted: { $ne: true },
            status: 'upcoming'
        };
        if (city) query.city = { $regex: city, $options: 'i' };

        // Pull more candidates for ranking (limit 50)
        const events = await Event.find(query).limit(50);

        // Rank using the sophisticated recommender
        const rankedEvents = await recommender.rankEvents(user, events);

        res.json(rankedEvents);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const fs = require('fs');
const path = require('path');

// @desc    Extract event details from image (OCR)
// @route   POST /api/events/extract
// @access  Private (Organizer)
exports.extractEventFromImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image' });
        }

        // 1. Process OCR
        const details = await extractEventDetails(req.file.buffer);

        // 2. STRICT VALIDATION: Address and Time must be present in the image
        if (!details.dateTime || !details.locality) {
            return res.status(400).json({
                message: 'Image Rejected: The uploaded image must contain a visible Date/Time and Address/Location. Please upload a valid event flyer.'
            });
        }

        // 3. Save image permanently to uploads/
        const fileName = `poster_${Date.now()}_${Math.round(Math.random() * 1E9)}.png`;
        const uploadPath = path.join(__dirname, '..', 'uploads', fileName);

        // Ensure uploads directory exists
        if (!fs.existsSync(path.join(__dirname, '..', 'uploads'))) {
            fs.mkdirSync(path.join(__dirname, '..', 'uploads'), { recursive: true });
        }

        fs.writeFileSync(uploadPath, req.file.buffer);
        const imageUrl = `http://localhost:5000/uploads/${fileName}`;

        res.json({
            ...details,
            posterImageUrl: imageUrl
        });
    } catch (error) {
        console.error("Extraction Error:", error);
        res.status(500).json({ message: error.message });
    }
};
