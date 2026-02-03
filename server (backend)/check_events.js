const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Event = require('./models/Event');

dotenv.config();

const checkEvents = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const total = await Event.countDocuments();
        console.log('Total events in DB:', total);

        const events = await Event.find().limit(5);
        events.forEach(e => {
            console.log(`- ${e.title}: Locality: ${e.locality}, City: ${e.city}`);
            console.log(`  Address Location:`, e.eventAddress?.location);
            console.log(`  Other Location:`, e.location);
            console.log('---');
        });

        const geoIndex = await Event.collection.getIndexes();
        console.log('Indexes:', geoIndex);

        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkEvents();
