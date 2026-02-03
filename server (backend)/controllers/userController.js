const User = require('../models/User');
const { geocodeAddress } = require('../utils/geocoder');
// @desc    Update user profile
// @route   PUT /api/users/profile/:id
exports.updateProfile = async (req, res) => {
    try {
        const { bio, occupation, college, graduationYear, skills, dob, gender, phoneNumber, pincode, address, locationCity, interests, socialLinks } = req.body;

        if (!dob || !gender || !pincode) {
            return res.status(400).json({ message: 'Date of Birth, Gender and Pincode are mandatory.' });
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize profile if missing
        if (!user.profile) user.profile = {};

        if (locationCity) user.locationCity = locationCity;

        // PRIORITY: Use coordinates sent from frontend (Verfied by user toast)
        if (req.body.coordinates && req.body.coordinates.lat) {
            user.profile.location = {
                type: 'Point',
                coordinates: [req.body.coordinates.lng, req.body.coordinates.lat]
            };
        }
        // FALLBACK: Geocode address or pincode if coordinates are still missing
        else if (!user.profile.location?.coordinates || (pincode && pincode !== user.profile.pincode) || (address && address !== user.profile.address)) {
            try {
                // Prioritize Address for specificity, but fallback to Pincode
                const geo = await geocodeAddress(address || pincode);
                if (geo) {
                    user.profile.location = {
                        type: 'Point',
                        coordinates: [geo.lng, geo.lat]
                    };
                    if (geo.city && !user.locationCity) user.locationCity = geo.city;
                }
            } catch (err) {
                console.error("Geocoding error:", err);
            }
        }

        // Update profile fields
        // We mutate the subdocument directly so Mongoose change tracking works
        if (bio !== undefined) user.profile.bio = bio;
        if (occupation !== undefined) user.profile.occupation = occupation;
        if (college !== undefined) user.profile.college = college;
        if (graduationYear !== undefined) user.profile.graduationYear = graduationYear;
        if (skills !== undefined) user.profile.skills = skills;
        if (dob !== undefined) user.profile.dob = dob;
        if (gender !== undefined) user.profile.gender = gender;
        if (phoneNumber !== undefined) user.profile.phoneNumber = phoneNumber;
        if (pincode !== undefined) user.profile.pincode = pincode;
        if (address !== undefined) user.profile.address = address;
        if (socialLinks !== undefined) user.profile.socialLinks = socialLinks;
        user.profile.profileCompleted = true;

        // Update interests if provided
        if (interests) {
            user.interests = interests;
            user.updateInterestWeights(); // Recalculate weights
        }

        // Ensure Mongoose tracks the changes to the mixed/nested object
        user.markModified('profile');
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            locationCity: user.locationCity,
            interests: user.interests,
            profile: user.profile,
            role: user.role
        });
    } catch (error) {
        console.error("Update Profile Error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user profile
// @route   GET /api/users/profile/:id
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Geocode an address
// @route   GET /api/users/geocode
exports.geocode = async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) return res.status(400).json({ message: 'Address is required' });

        const geo = await geocodeAddress(address);
        if (geo) {
            res.json(geo);
        } else {
            res.status(404).json({ message: 'Location not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
