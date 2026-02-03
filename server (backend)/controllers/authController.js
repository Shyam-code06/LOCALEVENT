const User = require('../models/User');
const Registration = require('../models/Registration');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sendEmail = require('../utils/sendEmail');
const { otpEmailTemplate } = require('../utils/emailTemplates');

// Use env secret if provided, otherwise fall back to a safe default for dev
const JWT_SECRET = process.env.JWT_SECRET || 'local-events-dev-secret';

const generateToken = (id, role = 'user') => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res) => {
    const { name, email, password, locationCity, interests } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({
            name, email, password: hashedPassword, locationCity, interests
        });
        
        // Initialize weights based on interests
        user.updateInterestWeights();
        await user.save();

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                locationCity: user.locationCity,
                interests: user.interests,
                role: user.role,
                profile: user.profile,
                organizerProfile: user.organizerProfile,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (user && (await bcrypt.compare(password, user.password))) {
            if (user.isActive === false) {
                return res.status(403).json({
                    message: `Account deactivated. Reason: ${user.deactivationReason || 'N/A'}`
                });
            }
            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                locationCity: user.locationCity,
                interests: user.interests,
                role: user.role,
                profile: user.profile,
                organizerProfile: user.organizerProfile,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send OTP for Login
// @route   POST /api/auth/send-otp
exports.sendOtp = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

        user.otp = otp;
        user.otpExpires = otpExpires;
        await user.save();

        await sendEmail({
            email: user.email,
            subject: 'Your Login OTP',
            message: `Your OTP for login is: ${otp}`,
            html: otpEmailTemplate({ name: user.name, otp, purpose: 'Login', minutes: 10 })
        });

        res.json({ message: 'OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Verify OTP and Login
// @route   POST /api/auth/verify-otp
exports.verifyOtp = async (req, res) => {
    const { email, otp } = req.body;
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.otp === otp && user.otpExpires > Date.now()) {
            if (user.isActive === false) {
                return res.status(403).json({
                    message: `Account deactivated. Reason: ${user.deactivationReason || 'N/A'}`
                });
            }
            // Clear OTP
            user.otp = undefined;
            user.otpExpires = undefined;
            await user.save();

            res.json({
                _id: user.id,
                name: user.name,
                email: user.email,
                locationCity: user.locationCity,
                interests: user.interests,
                role: user.role,
                profile: user.profile,
                organizerProfile: user.organizerProfile,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(400).json({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// === Registration with OTP flow ===
// @desc Request OTP and save registration temp
// @route POST /api/auth/register/request-otp
exports.requestRegisterOtp = async (req, res) => {
    const { name, email, password, locationCity, interests } = req.body;
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
            { name, email, password: hashedPassword, locationCity, interests, otp, otpExpires },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await sendEmail({
            email,
            subject: 'Your Registration OTP',
            message: `Your OTP for completing registration is: ${otp}`,
            html: otpEmailTemplate({ name, otp, purpose: 'Registration', minutes: 10 })
        });

        res.json({ message: 'Registration OTP sent to email' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc Verify OTP and create user
// @route POST /api/auth/register/verify-otp
exports.verifyRegisterOtp = async (req, res) => {
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

        const user = new User({
            name: reg.name,
            email: reg.email,
            password: reg.password,
            locationCity: reg.locationCity,
            interests: reg.interests
        });

        // Initialize weights based on interests
        user.updateInterestWeights();
        await user.save();

        // Remove temp registration
        await Registration.deleteOne({ email });

        if (user) {
            res.status(201).json({
                _id: user.id,
                name: user.name,
                email: user.email,
                locationCity: user.locationCity,
                interests: user.interests,
                role: user.role,
                profile: user.profile,
                organizerProfile: user.organizerProfile,
                token: generateToken(user.id, user.role)
            });
        } else {
            res.status(500).json({ message: 'Failed to create user' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
