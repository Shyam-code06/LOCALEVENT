const mongoose = require('mongoose');
const Event = require('./models/Event');
require('dotenv').config();

async function deleteAutoEvents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        // Delete anything that looks like mock data
        const patterns = [
            /Pottery/i,
            /Workshop/i,
            /Session/i,
            /Networking/i,
            /Mixer/i,
            /Walk/i,
            /Bootcamp/i,
            /Indie Music/i
        ];

        // But KEEP hackathons and resume building as those are user-centric
        const keepPatterns = [
            /hackathon/i,
            /resume/i
        ];

        const events = await Event.find({});
        for (const event of events) {
            const isAuto = patterns.some(p => p.test(event.title)) && !keepPatterns.some(p => p.test(event.title));
            if (isAuto) {
                await Event.deleteOne({ _id: event._id });
                console.log(`Deleted: ${event.title}`);
            }
        }

    } catch (e) {
        console.error(e);
    }
    process.exit();
}
deleteAutoEvents();
