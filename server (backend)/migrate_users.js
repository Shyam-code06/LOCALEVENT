const mongoose = require('mongoose');
const User = require('./models/User');
const { geocodeAddress } = require('./utils/geocoder');
require('dotenv').config();

async function migrateUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const users = await User.find({
            $or: [
                { 'profile.location.coordinates': { $exists: false } },
                { 'profile.location.coordinates': { $size: 0 } }
            ]
        });

        console.log(`Found ${users.length} users needing geocoding.`);

        for (const user of users) {
            let address = user.profile?.address || user.locationCity;
            if (!address) continue;

            console.log(`Geocoding user: ${user.name} (${address})`);

            try {
                const geo = await geocodeAddress(address);
                if (geo) {
                    if (!user.profile) user.profile = {};
                    user.profile.location = {
                        type: 'Point',
                        coordinates: [geo.lng, geo.lat]
                    };
                    await user.save();
                    console.log(`✅ Success for ${user.name}`);
                }
            } catch (err) {
                console.error(`Error geocoding ${user.name}:`, err.message);
            }
            await new Promise(r => setTimeout(r, 1100));
        }

        console.log('User Migration complete');
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrateUsers();
