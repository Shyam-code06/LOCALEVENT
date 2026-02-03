const mongoose = require('mongoose');
const Event = require('./models/Event');
const { geocodeAddress } = require('./utils/geocoder');
require('dotenv').config();

async function migrateEvents() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const events = await Event.find({
            $or: [
                { 'eventAddress.location.coordinates': { $exists: false } },
                { 'eventAddress.location.coordinates': { $size: 0 } }
            ]
        });

        console.log(`Found ${events.length} events needing geocoding.`);

        for (const event of events) {
            let address = event.eventAddress?.fullAddress || `${event.locality}, ${event.city}`;
            console.log(`Geocoding: ${event.title} (${address})`);

            try {
                const geo = await geocodeAddress(address);
                if (geo) {
                    if (!event.eventAddress) event.eventAddress = {};
                    event.eventAddress.location = {
                        type: 'Point',
                        coordinates: [geo.lng, geo.lat]
                    };
                    await event.save();
                    console.log(`✅ Success for ${event.title}`);
                } else {
                    console.log(`❌ Failed for ${event.title}`);
                }
            } catch (err) {
                console.error(`Error geocoding ${event.title}:`, err.message);
            }
            // Sleep a bit to avoid rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log('Migration complete');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrateEvents();
