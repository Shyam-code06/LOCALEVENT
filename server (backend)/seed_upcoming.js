const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');

dotenv.config();

const seedUpcoming = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const upcomingCount = await Event.countDocuments({ status: 'upcoming', isDeleted: false });
        console.log('Total upcoming events:', upcomingCount);

        if (upcomingCount < 3) {
            console.log('Seeding upcoming events...');
            const events = [
                {
                    title: 'Live Music Night',
                    description: 'Enjoy a night of soulful music.',
                    category: 'Music',
                    city: 'Mumbai',
                    locality: 'Bandra',
                    dateTime: new Date(Date.now() + 86400000 * 2), // 2 days from now
                    capacity: 50,
                    organizerName: 'Jazz Club',
                    status: 'upcoming',
                    trustScore: 85,
                    eventType: 'offline',
                    eventAddress: {
                        fullAddress: 'Jazz Club, Bandra, Mumbai',
                        location: { type: 'Point', coordinates: [72.83, 19.06] } // Mumbai Bandra approx
                    }
                },
                {
                    title: 'Tech Meetup 2026',
                    description: 'Connect with tech enthusiasts.',
                    category: 'Tech',
                    city: 'New Delhi',
                    locality: 'Connaught Place',
                    dateTime: new Date(Date.now() + 86400000 * 5), // 5 days from now
                    capacity: 200,
                    organizerName: 'Delhi Tech',
                    status: 'upcoming',
                    trustScore: 95,
                    eventType: 'offline',
                    eventAddress: {
                        fullAddress: 'CP, New Delhi',
                        location: { type: 'Point', coordinates: [77.22, 28.63] } // Delhi CP approx
                    }
                }
            ];
            await Event.insertMany(events);
            console.log('Successfully seeded upcoming events');
        }

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedUpcoming();
