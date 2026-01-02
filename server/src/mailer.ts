import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load the .env file
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    // Read from the hidden file
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendOtpEmail = async (toEmail: string, otp: string) => {
  const mailOptions = {
    from: `"Todo App Security" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Login Code',
    text: `Your security code is: ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔐 Login Verification</h2>
        <p>Please use the following code to access your account:</p>
        <h1 style="color: #4F46E5; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${toEmail}`);
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
};