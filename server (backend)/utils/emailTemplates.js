const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const otpEmailTemplate = ({ name = '', otp, purpose = 'Login', minutes = 10, appName = 'LocalEvents' }) => {
  const displayName = name || '';
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${appName} - ${purpose} OTP</title>
      <style>
        body { background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .header { padding: 24px; background: linear-gradient(90deg,#0d6efd,#6610f2); color: #fff; }
        .logo { font-weight: 700; font-size: 20px; }
        .content { padding: 28px; color: #333; }
        .otp { display:inline-block; background:#f1f5ff; border: 1px dashed #c6d2ff; padding: 12px 18px; font-size: 22px; letter-spacing: 4px; border-radius: 6px; margin: 12px 0; }
        .note { font-size: 13px; color: #6b7280; }
        .btn { display:inline-block; background:#0d6efd; color:#fff; padding:10px 16px; border-radius:6px; text-decoration:none; }
        .footer { padding:18px; font-size:12px; color:#8890a6; background:#fafbfc; text-align:center; }
        @media (max-width:480px){ .content { padding:18px } .otp { font-size:20px; letter-spacing:3px } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${appName}</div>
        </div>
        <div class="content">
          <p style="margin:0 0 8px">Hi ${displayName || 'there'},</p>
          <p style="margin:0 0 16px">Use the following One-Time Password (OTP) to complete your ${purpose.toLowerCase()} on ${appName}. This code will expire in ${minutes} minutes.</p>

          <div class="otp">${otp}</div>

          <p class="note">If you didn't request this, you can safely ignore this email. For security, do not share this code with anyone.</p>

          <p style="margin:18px 0 0">Need help? <a class="btn" href="${FRONTEND_URL}" target="_blank" rel="noreferrer">Visit ${appName}</a></p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${appName} — Bringing local communities together</div>
      </div>
    </body>
  </html>
  `;
};

const registrationEmailTemplate = ({ name, eventTitle, eventDate, eventLocation, ticketCode, appName = 'LocalEvents' }) => {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Entry Pass: ${eventTitle}</title>
      <style>
        body { background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .header { padding: 24px; background: linear-gradient(90deg,#198754,#20c997); color: #fff; text-align: center; }
        .logo { font-weight: 700; font-size: 24px; }
        .content { padding: 32px; color: #333; line-height: 1.6; }
        .event-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #198754; margin: 20px 0; }
        .event-title { font-weight: 700; font-size: 18px; color: #198754; margin: 0 0 10px 0; }
        .ticket-box { background: #fff; border: 2px dashed #198754; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; }
        .ticket-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .ticket-code { font-size: 32px; font-weight: 800; color: #198754; font-family: monospace; margin: 5px 0; }
        .btn { display:inline-block; background:#198754; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight: 600; margin-top: 20px; }
        .footer { padding:18px; font-size:12px; color:#8890a6; background:#fafbfc; text-align:center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">�️ Your Entry Pass</div>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Your registration for <strong>${eventTitle}</strong> is confirmed. Please show the entry code below at the venue for check-in.</p>
          
          <div class="ticket-box">
            <div class="ticket-label">Your Unique Entry Code</div>
            <div class="ticket-code">${ticketCode}</div>
            <p style="font-size: 11px; color: #888; margin-top: 10px;">Please present this digital pass or a printout at the entrance.</p>
          </div>

          <div class="event-card">
            <h3 class="event-title">${eventTitle}</h3>
            <p style="margin: 5px 0"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0"><strong>📍 Location:</strong> ${eventLocation}</p>
          </div>

          <p>You can manage your registrations and find more details on your dashboard.</p>
          
          <div style="text-align: center;">
            <a href="${FRONTEND_URL}/my-events" class="btn">View My Events</a>
          </div>

          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            If you need to cancel or modify your registration, please do so at least 24 hours before the event starts.
          </p>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${appName} — Bringing local communities together</div>
      </div>
    </body>
  </html>
  `;
};

const eventNotificationEmailTemplate = ({ name, eventTitle, eventCategory, eventDate, eventLocation, eventId, appName = 'LocalEvents' }) => {
  const eventLink = `${FRONTEND_URL}/event/${eventId}`;

  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New ${eventCategory} Event: ${eventTitle}</title>
      <style>
        body { background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .header { padding: 24px; background: linear-gradient(90deg,#6610f2,#6f42c1); color: #fff; text-align: center; }
        .logo { font-weight: 700; font-size: 24px; }
        .content { padding: 32px; color: #333; line-height: 1.6; }
        .match-badge { display: inline-block; background: #e0cffc; color: #59359a; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
        .event-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #6610f2; margin: 20px 0; }
        .event-title { font-weight: 700; font-size: 18px; color: #6610f2; margin: 0 0 10px 0; }
        .btn { display:inline-block; background:#6610f2; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight: 600; margin-top: 20px; }
        .footer { padding:18px; font-size:12px; color:#8890a6; background:#fafbfc; text-align:center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">New Event Alert 🔔</div>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>We found a new event that matches your interest in <span class="match-badge">${eventCategory}</span>!</p>
          
          <div class="event-card">
            <h3 class="event-title">${eventTitle}</h3>
            <p style="margin: 5px 0"><strong>📅 Date:</strong> ${eventDate}</p>
            <p style="margin: 5px 0"><strong>📍 Location:</strong> ${eventLocation}</p>
          </div>

          <p>Don't miss out! Check out the details and register now.</p>
          
          <div style="text-align: center;">
            <a href="${eventLink}" class="btn">View Event Details</a>
          </div>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${appName} — Bringing local communities together</div>
      </div>
    </body>
  </html>
  `;
};

const feedbackEmailTemplate = ({ name, eventTitle, appName = 'LocalEvents' }) => {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>How was ${eventTitle}?</title>
      <style>
        body { background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .header { padding: 24px; background: linear-gradient(90deg,#ffc107,#ff9800); color: #fff; text-align: center; }
        .logo { font-weight: 700; font-size: 24px; }
        .content { padding: 32px; color: #333; line-height: 1.6; text-align: center; }
        .stars { font-size: 30px; margin: 20px 0; color: #ffc107; }
        .btn { display:inline-block; background:#ffc107; color:#000; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight: 600; margin-top: 20px; }
        .footer { padding:18px; font-size:12px; color:#8890a6; background:#fafbfc; text-align:center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">We'd love your feedback! ⭐</div>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for attending <strong>${eventTitle}</strong>! We hope you had a great time.</p>
          <p>Your feedback helps us and the organizer improve future events. It only takes a minute!</p>
          
          <div class="stars">★★★★★</div>
 
          <a href="${FRONTEND_URL}/my-events" class="btn">Rate Event Now</a>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${appName} — Bringing local communities together</div>
      </div>
    </body>
  </html>
  `;
};

const eventCancellationEmailTemplate = ({ name, eventTitle, appName = 'LocalEvents' }) => {
  return `
  <!doctype html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Event Cancelled: ${eventTitle}</title>
      <style>
        body { background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; }
        .container { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 6px 18px rgba(0,0,0,0.08); }
        .header { padding: 24px; background: linear-gradient(90deg,#dc3545,#c82333); color: #fff; text-align: center; }
        .logo { font-weight: 700; font-size: 24px; }
        .content { padding: 32px; color: #333; line-height: 1.6; text-align: center; }
        .sorry-icon { font-size: 50px; margin-bottom: 20px; }
        .btn { display:inline-block; background:#0d6efd; color:#fff; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight: 600; margin-top: 20px; }
        .footer { padding:18px; font-size:12px; color:#8890a6; background:#fafbfc; text-align:center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Event Cancelled ⚠️</div>
        </div>
        <div class="content">
          <div class="sorry-icon">😔</div>
          <p>Hi <strong>${name}</strong>,</p>
          <p>We are very sorry to inform you that the event <strong>${eventTitle}</strong> has been cancelled by the organizer.</p>
          <p>We understand this might be disappointing, and we apologize for any inconvenience caused.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p>Don't worry! There are many other exciting events happening around you. Check out our recommendations for you!</p>
          
          <a href="${FRONTEND_URL}/dashboard" class="btn">View Recommended Events</a>
        </div>
        <div class="footer">&copy; ${new Date().getFullYear()} ${appName} — Bringing local communities together</div>
      </div>
    </body>
  </html>
  `;
};

module.exports = {
  otpEmailTemplate,
  registrationEmailTemplate,
  eventNotificationEmailTemplate,
  feedbackEmailTemplate,
  eventCancellationEmailTemplate
};
