const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use SSL
    auth: {
      user: process.env.EMAIL_USER.trim(),
      pass: process.env.EMAIL_PASS.trim().replace(/\s/g, ""),
    },
  });

  // Verify connection configuration
  transporter.verify(function (error, success) {
    if (error) {
      console.log("Email Transporter Error:", error);
    } else {
      console.log("Email Server is ready to take our messages");
    }
  });

  const message = {
    from: `${process.env.FROM_NAME || "Team gatherX"} <${
      process.env.EMAIL_USER
    }>`,
    to: options.email,
    subject: options.subject,
    text: options.message, // Fallback text
    html: options.html, // HTML template
  };

  try {
    await transporter.sendMail(message);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

module.exports = sendEmail;
