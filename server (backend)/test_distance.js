require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');
const RSVP = require('./models/RSVP'); // Needed for population or we mock it

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};

const runTest = async () => {
    await connectDB();

    console.log('Creating Test Events...');
    
    // Locations (Lat, Lng)
    // Central Point: New Delhi (28.6139, 77.2090)
    // Point A (Close): Connaught Place (~1km) -> 28.6304, 77.2177 
    // Point B (Far): Mumbai (~1000km) -> 19.0760, 72.8777
    
    // Clean up old test data
    await Event.deleteMany({ title: /^TEST_EVENT/ });

    // Sync Indexes
    await Event.createIndexes();
    console.log('Indexes Synced');

    const eventNear = new Event({
        title: 'TEST_EVENT_NEAR',
        description: 'Test Event Near',
        category: 'Tech',
        city: 'New Delhi',
        locality: 'CP',
        dateTime: new Date(),
        capacity: 100,
        organizerName: 'Tester',
        eventAddress: {
            city: 'New Delhi',
            location: {
                type: 'Point',
                coordinates: [77.2177, 28.6304] // Lng, Lat
            }
        }
    });

    const eventFar = new Event({
        title: 'TEST_EVENT_FAR',
        description: 'Test Event Far',
        category: 'Tech',
        city: 'Mumbai',
        locality: 'Bandra',
        dateTime: new Date(),
        capacity: 100,
        organizerName: 'Tester',
        eventAddress: {
            city: 'Mumbai',
            location: {
                type: 'Point',
                coordinates: [72.8777, 19.0760] // Lng, Lat
            }
        }
    });

    await eventNear.save();
    await eventFar.save();
    console.log('Test Events Saved');

    // Run Aggregation Query
    console.log('Running $geoNear Query from New Delhi (28.6139, 77.2090)...');
    
    const userLat = 28.6139;
    const userLng = 77.2090;
    const maxDist = 50 * 1000; // 50km

    const pipeline = [
        {
            $geoNear: {
                near: { type: "Point", coordinates: [userLng, userLat] },
                distanceField: "distance",
                maxDistance: maxDist,
                query: { title: /^TEST_EVENT/ },
                spherical: true
            }
        },
        { $project: { title: 1, distance: 1 } }
    ];

    const results = await Event.aggregate(pipeline);
    
    console.log('Results (Should only see NEAR event):');
    console.log(results);

    if (results.length === 1 && results[0].title === 'TEST_EVENT_NEAR') {
        console.log('SUCCESS: Distance filtering working correctly.');
    } else {
        console.log('FAILURE: Unexpected results.');
    }

    // Cleanup
    await Event.deleteMany({ title: /^TEST_EVENT/ });
    await mongoose.connection.close();
};

runTest();
