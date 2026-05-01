import nodemailer from 'nodemailer';

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GOOGLE_USER,
      pass: process.env.GOOGLE_APP_PASSWORD,    },
  });

  const mailOptions = {
    from: `"MonitorPro Alerts" <${process.env.GOOGLE_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
};
