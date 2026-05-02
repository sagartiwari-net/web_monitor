import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME || process.env.GOOGLE_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.GOOGLE_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"MonitorPro Alerts" <${process.env.EMAIL_USERNAME || process.env.GOOGLE_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};
