require('dotenv').config();
const mongoose = require('mongoose');
const RSVP = require('./models/RSVP');
const User = require('./models/User');
const Event = require('./models/Event');

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

    console.log('Creating Test Data for Analytics...');
    
    // Create Test Event
    const event = new Event({
        title: 'TEST_ANALYTICS_EVENT',
        description: 'Test Event',
        category: 'Tech',
        city: 'Test City',
        locality: 'Test Locality',
        dateTime: new Date(),
        capacity: 100,
        organizerName: 'Tester'
    });
    await event.save();
    
    // Create Test Users with Genders
    const userMale = new User({ name: 'Male User', email: 'male@test.com', password: '123', profile: { gender: 'Male' } });
    const userFemale = new User({ name: 'Female User', email: 'female@test.com', password: '123', profile: { gender: 'Female' } });
    const userOther = new User({ name: 'Other User', email: 'other@test.com', password: '123', profile: { gender: 'Other' } });
    
    await userMale.save();
    await userFemale.save();
    await userOther.save();

    // Create RSVPs
    await RSVP.create({ user: userMale._id, event: event._id, status: 'YES' });
    await RSVP.create({ user: userFemale._id, event: event._id, status: 'YES' });
    await RSVP.create({ user: userOther._id, event: event._id, status: 'YES' });

    console.log('Test Data Created. Running Aggregation...');

    // Run Aggregation Logic (Copied from Controller)
    const stats = await RSVP.aggregate([
        { $match: { event: event._id, status: 'YES' } },
        {
            $lookup: {
                from: 'users',
                localField: 'user',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        { $unwind: '$userInfo' },
        {
            $group: {
                _id: '$userInfo.profile.gender', // Group by gender
                count: { $sum: 1 }
            }
        }
    ]);

    console.log('Raw Aggregation Results:', stats);
    
    const formattedStats = stats.map(item => ({
        name: item._id || 'Not Specified',
        value: item.count
    }));
    
    console.log('Formatted Stats:', formattedStats);

    // Assertions
    const hasMale = formattedStats.find(s => s.name === 'Male' && s.value === 1);
    const hasFemale = formattedStats.find(s => s.name === 'Female' && s.value === 1);
    
    if (hasMale && hasFemale && formattedStats.length === 3) {
        console.log('SUCCESS: Analytics aggregation working correctly.');
    } else {
        console.log('FAILURE: Aggregation results mismatch.');
    }

    // Cleanup
    await Event.deleteOne({ _id: event._id });
    await User.deleteMany({ email: /@test.com$/ });
    await RSVP.deleteMany({ event: event._id });
    
    await mongoose.connection.close();
};

runTest();
