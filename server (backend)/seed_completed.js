const mongoose = require('mongoose');
const Event = require('./models/Event');
const dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('Connected to DB');

        const completedEvent = {
            title: 'Past Coding Workshop',
            description: 'A great workshop that happened in the past.',
            category: 'Tech',
            city: 'Mumbai',
            locality: 'Andheri',
            dateTime: new Date('2023-01-01'),
            capacity: 100,
            organizerName: 'Tech Hub',
            status: 'completed',
            trustScore: 90,
            eventType: 'offline',
            eventAddress: { fullAddress: 'Tech Hub, Andheri, Mumbai' }
        };

        await Event.create(completedEvent);
        console.log('Seeded completed event');
        process.exit();
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
