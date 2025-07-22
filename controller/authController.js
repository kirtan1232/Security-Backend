const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const User = require('../model/User');
const isStrongPassword = require('../utils/passwordvalidator'); // <-- Use correct casing and spelling!
const { logProfileUpdate } = require('../utils/auditLogger'); // NEW: for activity logging
require('dotenv').config();
const { fromBuffer } = require("file-type");
const { generateAndSendOTP } = require('./otpController'); 
const fs = require("fs");

const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const profilePicture = req.file ? req.file.path : null;

    try {
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password should be atleast 8 characters.' });
        }
        const userExist = await User.findOne({ email });
        if (userExist) {
            return res.status(400).json({ message: 'User already exists' });
        }
        if (req.file) {
            const buffer = fs.readFileSync(req.file.path);
            const type = await fromBuffer(buffer);
            if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: "Uploaded file is not a valid image." });
            }
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role,
            profilePicture,
            emailVerified: false
        });

        await user.save();
        await generateAndSendOTP(user); // <-- Call here

        res.status(201).json({ message: 'User registered successfully. Please check your email for OTP.', userId: user._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error registering user' });
    }
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User does not exist' });

        // Account lockout check
        if (user.lockUntil && user.lockUntil > Date.now()) {
            return res.status(403).json({ message: "Account locked. Try again later." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            user.failedLoginAttempts += 1;
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
                user.failedLoginAttempts = 0;
            }
            await user.save();
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        await user.save();

        // --- EMAIL VERIFICATION CHECK ---
        if (!user.emailVerified) {
            // Send OTP again!
            await generateAndSendOTP(user);
            return res.status(403).json({ message: 'Please verify your email.', userId: user._id });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.status(200).json({ message: 'Login successful', token, role: user.role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error logging in', error });
    }
};
// Forgot password
const forgotPassword = async (req, res) => {
    const email = req.body.email;
    try {
        const userData = await User.findOne({ email });
        if (!userData) {
            return res.status(404).send({ success: false, msg: "This email does not exist." });
        }
        const randomToken = randomstring.generate();
        await User.updateOne({ email }, { $set: { token: randomToken } });
        sendResetPasswordMail(userData.name, userData.email, randomToken);
        return res.status(200).send({ success: true, msg: "Please check your inbox to reset your password." });
    } catch (error) {
        console.error("Error in forgotPassword:", error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

const sendResetPasswordMail = (name, email, token) => {
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
        subject: 'Password Reset Request',
        html: `<p>Hi ${name},<br/>You requested a password reset. <a href="https://localhost:5173/resetPassword?token=${token}">Reset Password</a></p>`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) console.error("Error sending email:", error.message);
    });
};

// Reset password
const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        if (!isStrongPassword(newPassword)) {
            return res.status(400).send({ success: false, msg: "Password does not meet complexity requirements." });
        }
        const userData = await User.findOne({ token });
        if (!userData) {
            return res.status(404).send({ success: false, msg: "Invalid or expired token." });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne({ _id: userData._id }, { $set: { password: hashedPassword, token: null } });
        res.status(200).send({ success: true, msg: "Password reset successfully." });
    } catch (error) {
        console.error("Error in resetPassword:", error.message);
        res.status(500).send({ success: false, msg: error.message });
    }
};

// Fetch User Profile (excluding password)
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
    } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Update Profile
const updateProfile = async (req, res) => {
    const { name, email, about, oldPassword, newPassword } = req.body;
    const userId = req.user.id;
    let profilePicture = req.file ? req.file.path : null;

    try {
        const user = await User.findById(userId);
        if (!user) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(404).json({ message: 'User not found' });
        }

        if (req.file) {
            const buffer = fs.readFileSync(req.file.path);
            const type = await fromBuffer(buffer);
            if (!type || !["image/jpeg", "image/png", "image/webp"].includes(type.mime)) {
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ message: "Uploaded file is not a valid image." });
            }
            profilePicture = req.file.path;
        }

        if (typeof name === "string" && name.trim() !== "") user.name = name.trim();
        if (typeof email === "string" && email.trim() !== "") user.email = email.trim();
        if (typeof about === "string") user.about = about.trim();
        if (profilePicture) user.profilePicture = profilePicture;

        if (newPassword) {
            if (!oldPassword) {
                return res.status(400).json({ message: "Old password required to change password." });
            }
            const isMatch = await bcrypt.compare(oldPassword, user.password);
            if (!isMatch) {
                return res.status(403).json({ message: "Old password is incorrect." });
            }
            if (!isStrongPassword(newPassword)) {
                return res.status(400).json({ message: "New password does not meet complexity requirements." });
            }
            user.password = await bcrypt.hash(newPassword, 10);
        }

        await user.save();

        await logProfileUpdate(userId, req.user.email, req.ip, {
            updatedFields: Object.keys(req.body)
        });

        const safeUser = { ...user.toObject() };
        delete safeUser.password;
        res.status(200).json({ message: 'Profile updated successfully', user: safeUser });
    } catch (err) {
        console.log("Error updating profile:", err.message); // Log only message
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error updating profile' });
    }
};



module.exports = {
    registerUser,
    loginUser,
    forgotPassword,
    sendResetPasswordMail,
    resetPassword,
    getUserProfile,
    updateProfile,
};