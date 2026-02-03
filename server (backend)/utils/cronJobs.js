const cron = require('node-cron');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const User = require('../models/User');
const mlService = require('../services/mlService');
const sendEmail = require('./sendEmail');

const scheduleReminders = () => {
    // ---------------------------------------------------------
    // 1. HOURLY CHECK: 48-HOUR AND 24-HOUR REMINDERS
    // ---------------------------------------------------------
    cron.schedule('0 * * * *', async () => {
        console.log('Running 48h & 24h Event Reminder Jobs...');
        try {
            const now = new Date();

            const sendIntervalReminder = async (hours, label) => {
                const windowStart = new Date(now.getTime() + (hours - 0.5) * 60 * 60 * 1000);
                const windowEnd = new Date(now.getTime() + (hours + 0.5) * 60 * 60 * 1000);

                const events = await Event.find({
                    dateTime: { $gte: windowStart, $lte: windowEnd },
                    isDeleted: { $ne: true },
                    status: 'upcoming'
                });

                for (const event of events) {
                    const rsvps = await RSVP.find({ event: event._id, status: 'YES' }).populate('user');
                    for (const rsvp of rsvps) {
                        if (rsvp.user?.email) {
                            const html = `
                                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                                    <div style="background-color: #1e293b; color: #f8fafc; padding: 24px; text-align: center;">
                                        <h2 style="margin: 0; font-weight: 600;">Event Reminder: ${label}</h2>
                                    </div>
                                    <div style="padding: 32px; color: #475569; line-height: 1.6;">
                                        <p>Dear <strong>${rsvp.user.name}</strong>,</p>
                                        <p>This is a reminder that the event <strong>${event.title}</strong> will begin in ${label}.</p>
                                        <div style="background-color: #f1f5f9; padding: 20px; border-radius: 6px; margin: 24px 0;">
                                            <p style="margin: 0;"><strong>Date:</strong> ${new Date(event.dateTime).toLocaleDateString()}</p>
                                            <p style="margin: 8px 0;"><strong>Time:</strong> ${new Date(event.dateTime).toLocaleTimeString()}</p>
                                            <p style="margin: 0;"><strong>Venue:</strong> ${event.eventType === 'online' ? 'Digital Meeting Room' : event.locality}</p>
                                        </div>
                                        <p>We look forward to seeing you there!</p>
                                        <p style="margin-top: 32px; border-top: 1px solid #e2e8f0; pt: 16px; font-size: 12px; color: #94a3b8;">Warm regards,<br/>The GatherX Team</p>
                                    </div>
                                </div>
                            `;
                            await sendEmail({ email: rsvp.user.email, subject: `${label} Reminder: ${event.title}`, html });
                        }
                    }
                }
            };

            await sendIntervalReminder(48, '48 Hours');
            await sendIntervalReminder(24, '24 Hours');

        } catch (err) { console.error('Hourly Cron Error:', err); }
    });

    // ---------------------------------------------------------
    // 2. MINUTELY CHECK: 1-HOUR REMINDER
    // ---------------------------------------------------------
    cron.schedule('* * * * *', async () => {
        try {
            const now = new Date();

            // Check Windows
            const checkWindow = async (minutes, label, color, tone) => {
                const start = new Date(now.getTime() + (minutes - 0.5) * 60 * 1000);
                const end = new Date(now.getTime() + (minutes + 0.5) * 60 * 1000);

                const events = await Event.find({
                    dateTime: { $gte: start, $lte: end },
                    isDeleted: { $ne: true },
                    status: 'upcoming'
                });

                if (events.length > 0) console.log(`[Alert] Found ${events.length} events starting in ~${minutes}m`);

                for (const event of events) {
                    const rsvps = await RSVP.find({ event: event._id, status: 'YES' }).populate('user');
                    for (const rsvp of rsvps) {
                        if (rsvp.user?.email) {
                            const html = `
                                <div style="font-family: sans-serif; border-left: 5px solid ${color}; padding: 20px; background-color: #fafafa;">
                                    <h2 style="color: ${color}; margin-top: 0;">${tone}</h2>
                                    <p>Hi ${rsvp.user.name}, <strong>${event.title}</strong> is starting in <strong>${label}</strong>.</p>
                                    <p><strong>Location:</strong> ${event.eventType === 'online' ? `<a href="${event.onlineLink}" style="color: ${color}; font-weight: bold;">Click Here to Join</a>` : event.locality}</p>
                                    <p>Please ensure you are ready to begin at the scheduled time.</p>
                                    <hr style="border: none; border-top: 1px solid #eee;" />
                                    <small>Automated Alert | GatherX</small>
                                </div>
                            `;
                            await sendEmail({ email: rsvp.user.email, subject: `Reminder (${label}): ${event.title}`, html });
                        }
                    }
                }
            };

            // Process 1-hour timeframe only
            await checkWindow(60, '1 Hour', '#6366f1', 'Final Hour Preparation ⏳');


        } catch (error) {
            console.error('Minute-Cron Error:', error);
        }
    });

    // ---------------------------------------------------------
    // 3. DAILY ML RETRAINING: 2 AM
    // ---------------------------------------------------------
    cron.schedule('0 2 * * *', async () => {
        console.log('Starting daily ML model retraining...');
        try {
            await mlService.trainModel();
            console.log('ML model retraining completed.');
        } catch (err) {
            console.error('ML Retraining Job Error:', err);
        }
    });
};

module.exports = scheduleReminders;
