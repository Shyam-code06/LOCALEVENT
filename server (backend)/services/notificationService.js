const User = require("../models/User");
const Notification = require("../models/Notification");

const sendEmail = require("../utils/sendEmail");
const { eventNotificationEmailTemplate } = require("../utils/emailTemplates");

const sendEventNotifications = async (event) => {
  try {
    // 1. Find users who are interested in this category AND live in this city
    // Using $regex for city to be case-insensitive and flexible
    const cityTrimmed = event.city ? event.city.trim() : "";
    const interestedUsers = await User.find({
      locationCity: { $regex: new RegExp(`^${cityTrimmed}$`, "i") },
      interests: { $regex: new RegExp(`^${event.category}$`, "i") },
      // Assuming checks for valid prefs - double check if field exists or default to true
      // If notificationPrefs.email is missing for some old users, we might want to default true.
      // But let's stick to explicit match for safety, or check existence.
      // safest: 'notificationPrefs.email': { $ne: false }
      "notificationPrefs.email": { $ne: false },
      isActive: { $ne: false }, // Only notify active users
    });

    console.log(
      `Found ${interestedUsers.length} interested users for event in ${event.city} - category ${event.category}`,
    );

    if (interestedUsers.length === 0) {
      console.log("No users matched the criteria for notifications.");
      return;
    }

    // 2. Create DB notifications for them
    const notifications = interestedUsers.map((user) => ({
      user: user._id,
      event: event._id,
      message: `New ${event.category} event in ${event.locality}: ${event.title}`,
      type: "EVENT_ALERT",
    }));

    await Notification.insertMany(notifications);
    console.log(
      `Created DB notifications for ${notifications.length} users for event: ${event.title}`,
    );

    // 3. Send Emails via Nodemailer
    // formatting date nicely
    const eventDate = new Date(event.dateTime).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const emailPromises = interestedUsers.map((user) => {
      return sendEmail({
        email: user.email,
        subject: `New Event in ${event.category}: ${event.title}`,
        html: eventNotificationEmailTemplate({
          name: user.name,
          eventTitle: event.title,
          eventCategory: event.category,
          eventDate: eventDate,
          eventLocation: `${event.locality}, ${event.city}`,
          eventId: event._id,
        }),
      });
    });

    // Run in parallel
    await Promise.allSettled(emailPromises);
    console.log(`Sent emails to ${interestedUsers.length} users.`);
  } catch (error) {
    console.error("Notification Error:", error);
  }
};

module.exports = { sendEventNotifications };
