const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

const seedAdmin = async () => {
    try {
        const adminEmail = process.env.EMAIL_USER || 'teamgatherx@gmail.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            console.log('Admin user not found. Creating default admin...');

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('12345', salt);

            await User.create({
                name: 'GatherX Admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin',
                locationCity: 'New Delhi', // Default
                interests: ['Platform Management']
            });

            console.log(`Default admin created successfully: ${adminEmail}`);
        } else {
            console.log('Admin user already exists.');
        }
    } catch (error) {
        console.error('Error seeding admin user:', error);
    }
};

module.exports = seedAdmin;
