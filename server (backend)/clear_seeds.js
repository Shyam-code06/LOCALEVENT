const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

async function clearSeededEvents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const titlesToDelete = [
            'Live Music Night',
            'Tech Meetup 2026',
            'Global Tech Summit',
            'Yoga for Beginners',
            'Past Coding Workshop'
        ];

        const result = await Event.deleteMany({ title: { $in: titlesToDelete } });
        console.log(`Deleted ${result.deletedCount} seeded events.`);

        // Also delete events without an organizerId (likely my test data)
        const result2 = await Event.deleteMany({ organizerId: { $exists: false } });
        console.log(`Deleted ${result2.deletedCount} events without organizer ID.`);

    } catch (e) {
        console.error(e);
    }
    process.exit();
}
clearSeededEvents();
