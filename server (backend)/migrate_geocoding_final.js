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
            let addresses = [
                event.eventAddress?.fullAddress,
                `${event.locality}, ${event.city}`,
                event.city
            ].filter(Boolean);

            let success = false;
            for (const addr of addresses) {
                console.log(`Geocoding attempt: ${event.title} -> ${addr}`);
                try {
                    const geo = await geocodeAddress(addr);
                    if (geo) {
                        if (!event.eventAddress) event.eventAddress = {};
                        event.eventAddress.location = {
                            type: 'Point',
                            coordinates: [geo.lng, geo.lat]
                        };
                        await event.save();
                        console.log(`✅ Success for ${event.title} using ${addr}`);
                        success = true;
                        break;
                    }
                } catch (err) {
                    console.error(`Error geocoding ${event.title}:`, err.message);
                }
                await new Promise(r => setTimeout(r, 1100)); // Rate limit
            }
            if (!success) console.log(`❌ Failed all attempts for ${event.title}`);
        }

        console.log('Migration complete');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrateEvents();
