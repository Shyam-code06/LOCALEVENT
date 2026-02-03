const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Reuse same default as authController for dev if env not set
const JWT_SECRET = process.env.JWT_SECRET || 'local-events-dev-secret';

// Protect routes - requires valid JWT in Authorization header: "Bearer <token>"
const protect = async (req, res, next) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer ')
        ) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log("Auth Middleware - Token Verified. Decoded:", decoded);

        // Attach user (without password) to request
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
            console.log("Auth Middleware - User Not Found for ID:", decoded.id);
            return res.status(401).json({ message: 'Not authorized, user not found' });
        }

        if (req.user.isActive === false) {
            return res.status(403).json({
                message: `Account deactivated. Reason: ${req.user.deactivationReason || 'N/A'}`
            });
        }

        next();
    } catch (error) {
        console.error('Auth error:', error.message);
        return res.status(401).json({ message: 'Not authorized, token failed' });
    }
};

// Only allow organizer role
const organizerOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'organizer') {
        return res.status(403).json({ message: 'Organizer access only' });
    }
    next();
};

// Only allow admin role
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access only' });
    }
    next();
};

module.exports = { protect, organizerOnly, adminOnly };

