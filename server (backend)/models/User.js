const mongoose = require('mongoose');
const mirrorService = require('../services/mirrorService');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otp: { type: String },
    otpExpires: { type: Date },
    interests: [{ type: String }],
    interestWeights: {
        Tech: { type: Number, default: 0.5 },
        Food: { type: Number, default: 0.5 },
        Music: { type: Number, default: 0.5 },
        Sports: { type: Number, default: 0.5 },
        Workshop: { type: Number, default: 0.5 },
        Meetup: { type: Number, default: 0.5 },
        Art: { type: Number, default: 0.5 },
        Other: { type: Number, default: 0.5 }
    },
    lastActive: { type: Date, default: Date.now },
    locationCity: { type: String, default: '' },
    reliabilityScore: { type: Number, default: 70 }, // Reputation score (0-100) for attendance fidelity
    notificationPrefs: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }

    },
    // Account Status
    isActive: { type: Boolean, default: true },
    deactivationReason: { type: String },

    // Enhanced User Profile
    profile: {
        bio: { type: String, maxlength: 500 },
        occupation: { type: String },
        college: { type: String },
        graduationYear: { type: String },
        skills: [{ type: String }],
        dob: { type: Date },
        gender: { type: String, enum: ['Male', 'Female', 'Other', 'Prefer not to say'] },
        phoneNumber: { type: String }, // Strictly 10 digits
        pincode: { type: String }, // User's pincode
        address: { type: String }, // User's full address
        location: {
            type: { type: String, enum: ['Point'] },
            coordinates: { type: [Number] } // [longitude, latitude]
        },
        profilePicture: { type: String }, // URL
        socialLinks: {
            linkedin: { type: String },
            twitter: { type: String },
            instagram: { type: String }
        },
        profileCompleted: { type: Boolean, default: false }
    },
    // Organizer-specific fields
    role: { type: String, enum: ['user', 'organizer', 'admin'], default: 'user' },
    organizerProfile: {
        organizationName: { type: String },
        organizationType: { type: String, enum: ['Individual', 'Company', 'NGO', 'Educational', 'Government', 'Other'] },

        // Business Verification Details
        companyRegistrationNumber: { type: String },
        gstNumber: { type: String },
        panNumber: { type: String },

        // Address Details
        address: {
            street: { type: String },
            city: { type: String },
            state: { type: String },
            pincode: { type: String },
            country: { type: String, default: 'India' }
        },

        // Contact Details
        contactPerson: { type: String },
        contactPhone: { type: String },
        contactEmail: { type: String },
        website: { type: String },

        // Verification
        verified: { type: Boolean, default: false },
        verificationDocuments: [{ type: String }], // URLs to uploaded docs
        verificationStatus: {
            type: String,
            enum: ['pending', 'under_review', 'verified', 'rejected'],
            default: 'pending'
        },
        verificationNotes: { type: String }, // Admin notes

        // Specific Document Uploads
        documents: {
            aadharCard: { type: String }, // URL to Aadhar card image
            companyRegistration: { type: String }, // URL to company registration certificate
            gstCertificate: { type: String }, // URL to GST certificate
            panCard: { type: String }, // URL to PAN card
            companyPagePhoto: { type: String }, // URL to company page/letterhead photo
            bankStatement: { type: String }, // URL to bank statement (optional)
            otherDocuments: [{ type: String }] // Array of other document URLs
        },

        // Stats
        trustRating: { type: Number, default: 50, min: 0, max: 100 },
        eventsHosted: { type: Number, default: 0 },

        // Profile
        bio: { type: String, maxlength: 1000 }
    }
}, { timestamps: true });

userSchema.post('save', function () {
    mirrorService.mirrorCollection('User');
});

userSchema.post('remove', function () {
    mirrorService.mirrorCollection('User');
});

// Helper to update interest weights based on selected interests
userSchema.methods.updateInterestWeights = function () {
    const categories = ['Tech', 'Food', 'Music', 'Sports', 'Workshop', 'Meetup', 'Art', 'Other'];
    const HIGH_INTEREST = 0.9;
    const DEFAULT_INTEREST = 0.3;

    // Reset all to default
    categories.forEach(cat => {
        this.interestWeights[cat] = DEFAULT_INTEREST;
    });

    // Boost selected interests
    if (this.interests && this.interests.length > 0) {
        const normalizedInterests = [];
        this.interests.forEach(interest => {
            const matchedCategory = categories.find(c =>
                interest.toLowerCase().includes(c.toLowerCase()) ||
                c.toLowerCase().includes(interest.toLowerCase())
            );

            if (matchedCategory) {
                this.interestWeights[matchedCategory] = HIGH_INTEREST;
                normalizedInterests.push(matchedCategory); // Store exact category name
            } else {
                if (this.interestWeights[interest]) {
                    this.interestWeights[interest] = HIGH_INTEREST;
                }
                normalizedInterests.push(interest);
            }
        });
        this.interests = [...new Set(normalizedInterests)]; // Update with normalized values
    }
};

module.exports = mongoose.model('User', userSchema);
