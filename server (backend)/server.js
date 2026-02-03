const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

const seedAdmin = require('./utils/seeder');

dotenv.config();
connectDB().then(() => {
    seedAdmin();
});

const app = express();

app.use(cors());
app.use(express.json());
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/auth', require('./routes/organizerRoutes')); // Organizer auth routes
app.use('/api/users', require('./routes/userRoutes')); // User profile routes
app.use('/api/events', require('./routes/eventRoutes'));
app.use('/api/rsvp', require('./routes/rsvpRoutes'));
app.use('/api/hype', require('./routes/hypeRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/admin', require('./routes/adminRoutes')); // Admin routes
app.use('/api/upload', require('./routes/uploadRoutes'));

const scheduleReminders = require('./utils/cronJobs');
scheduleReminders();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
