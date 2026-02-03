const User = require('../models/User');

// @desc    Update organizer profile
// @route   PUT /api/users/organizer-profile/:id
exports.updateOrganizerProfile = async (req, res) => {
    try {
        const {
            organizationName,
            organizationType,
            companyRegistrationNumber,
            gstNumber,
            panNumber,
            street,
            city,
            state,
            pincode,
            contactPerson,
            contactPhone,
            contactEmail,
            website,
            bio,
            // Document URLs
            aadharCard,
            companyRegistration,
            gstCertificate,
            panCard,
            companyPagePhoto,
            bankStatement,
            otherDocuments
        } = req.body;

        const user = await User.findById(req.params.id);
        if (!user || user.role !== 'organizer') {
            return res.status(404).json({ message: 'Organizer not found' });
        }

        // Update organizer profile
        user.organizerProfile = {
            ...user.organizerProfile,
            organizationName,
            organizationType,
            companyRegistrationNumber,
            gstNumber,
            panNumber,
            address: {
                street,
                city,
                state,
                pincode,
                country: 'India'
            },
            contactPerson,
            contactPhone,
            contactEmail,
            website,
            bio,
            // Documents
            documents: {
                aadharCard: aadharCard || user.organizerProfile?.documents?.aadharCard || '',
                companyRegistration: companyRegistration || user.organizerProfile?.documents?.companyRegistration || '',
                gstCertificate: gstCertificate || user.organizerProfile?.documents?.gstCertificate || '',
                panCard: panCard || user.organizerProfile?.documents?.panCard || '',
                companyPagePhoto: companyPagePhoto || user.organizerProfile?.documents?.companyPagePhoto || '',
                bankStatement: bankStatement || user.organizerProfile?.documents?.bankStatement || '',
                otherDocuments: Array.isArray(otherDocuments) ? otherDocuments : (otherDocuments ? [otherDocuments] : (user.organizerProfile?.documents?.otherDocuments || []))
            },
            verificationStatus: 'under_review' // Auto-submit for review when profile is updated
        };

        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            organizerProfile: user.organizerProfile
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

