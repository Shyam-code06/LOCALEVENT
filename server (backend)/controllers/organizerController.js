const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Registration = require('../models/Registration');
const sendEmail = require('../utils/sendEmail');
const { otpEmailTemplate } = require('../utils/emailTemplates');

const JWT_SECRET = process.env.JWT_SECRET || 'local-events-dev-secret';

// @desc    Register as Organizer
// @route   POST /api/auth/register-organizer
exports.registerOrganizer = async (req, res) => {
    try {
        const { name, email, password, locationCity, organizationName, bio } = req.body;

        // Check if user exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create organizer user
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            locationCity,
            role: 'organizer',
            organizerProfile: {
                organizationName,
                bio,
                verified: false, // Needs admin approval
                trustRating: 50 // Starting trust score
            }
        });

        // Generate token (reuse same secret as normal users)
        const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            locationCity: user.locationCity,
            organizerProfile: user.organizerProfile,
            token
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// === Registration with OTP flow for Organizers ===
// @desc Request OTP and save organizer registration temp
// @route POST /api/auth/register-organizer/request-otp
exports.requestRegisterOrganizerOtp = async (req, res) => {
    const { name, email, password, locationCity, organizationName, bio } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'Email already registered' });

        // Hash password now and store in temp registration
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Upsert temp registration by email
        await Registration.findOneAndUpdate(
            { email },
            { name, email, password: hashedPassword, locationCity, role: 'organizer', organizerProfile: { organizationName, bio }, otp, otpExpires },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await sendEmail({
            email,
            subject: 'Your Organizer Registration OTP',
            message: `Your OTP for completing organizer registration is: ${otp}`,
            html: otpEmailTemplate({ name, otp, purpose: 'Organizer Registration', minutes: 10 })
        });

        res.json({ message: 'Organizer registration OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Verify OTP and create organizer user
// @route POST /api/auth/register-organizer/verify-otp
exports.verifyRegisterOrganizerOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const reg = await Registration.findOne({ email });
        if (!reg) return res.status(404).json({ message: 'No pending registration found' });

        if (reg.otp !== otp || reg.otpExpires < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Double-check no user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'Email already registered' });

        const user = await User.create({
            name: reg.name,
            email: reg.email,
            password: reg.password,
            locationCity: reg.locationCity,
            role: 'organizer',
            organizerProfile: {
                organizationName: reg.organizerProfile?.organizationName || '',
                bio: reg.organizerProfile?.bio || '',
                verified: false,
                trustRating: 50
            }
        });

        // Remove temp registration
        await Registration.deleteOne({ email });

        if (user) {
            const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                locationCity: user.locationCity,
                organizerProfile: user.organizerProfile,
                token
            });
        } else {
            res.status(500).json({ message: 'Failed to create organizer' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Organizer Dashboard Stats
// @route   GET /api/auth/organizer-stats/:id
exports.getOrganizerStats = async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        const Event = require('../models/Event');
        const eventsHosted = await Event.countDocuments({ organizerId: user._id });

        // Update count
        user.organizerProfile.eventsHosted = eventsHosted;
        await user.save();

        res.json({
            organizationName: user.organizerProfile.organizationName,
            verified: user.organizerProfile.verified,
            verificationStatus: user.organizerProfile.verificationStatus,
            trustRating: user.organizerProfile.trustRating,
            eventsHosted: user.organizerProfile.eventsHosted,
            bio: user.organizerProfile.bio
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Organizer Profile (Full Details)
// @route   GET /api/auth/organizer-profile/:id
exports.getOrganizerProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user || user.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            locationCity: user.locationCity,
            organizerProfile: user.organizerProfile
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
