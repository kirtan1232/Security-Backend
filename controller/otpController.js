const User = require('../model/User');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { generateOtpEmailHtml } = require('../utils/otp');

require('dotenv').config();


const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');


const sendVerificationOTP = async (name, email, otp) => {
    if (!email) return;
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASSWORD },
    });
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your Anna Account',
        html: generateOtpEmailHtml({ name, otp })
    };
    await transporter.sendMail(mailOptions);
};

const generateAndSendOTP = async (user) => {
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = hashOTP(plainOtp);
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.emailOTP = otpHash;
    user.emailOTPExpires = otpExpires;
    await user.save();
    await sendVerificationOTP(user.name, user.email, plainOtp);
};


const verifyEmailOTP = async (req, res) => {
    const { userId, otp } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (user.emailVerified) return res.status(400).json({ message: 'Already verified' });
        if (!user.emailOTP || user.emailOTPExpires < new Date()) {
            return res.status(400).json({ message: 'OTP expired. Please re-register.' });
        }
        const otpHash = hashOTP(otp);
        if (user.emailOTP !== otpHash) {
            return res.status(400).json({ message: 'Incorrect OTP' });
        }
        user.emailVerified = true;
        user.emailOTP = null;
        user.emailOTPExpires = null;
        await user.save();
        res.status(200).json({ message: 'Email verified successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'OTP verification failed' });
    }
};

module.exports = {
    generateAndSendOTP,
    verifyEmailOTP,
};