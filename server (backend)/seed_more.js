const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');

dotenv.config();

const seedMore = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const events = [
            {
                title: 'Global Tech Summit',
                description: 'A summit for everyone, everywhere.',
                category: 'Tech',
                city: 'Bangalore',
                locality: 'Electronic City',
                dateTime: new Date(Date.now() + 86400000 * 10),
                capacity: 500,
                organizerName: 'Summit Org',
                status: 'upcoming',
                trustScore: 80,
                eventType: 'online'
            },
            {
                title: 'Yoga for Beginners',
                description: 'Join us for a relaxing morning yoga session.',
                category: 'Workshop',
                city: 'Remote',
                locality: 'Online',
                dateTime: new Date(Date.now() + 86400000 * 3),
                capacity: 100,
                organizerName: 'Wellness Center',
                status: 'upcoming',
                trustScore: 75,
                eventType: 'online'
            }
        ];
        await Event.insertMany(events);
        console.log('Seeded more events');
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedMore();
