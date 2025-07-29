const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const User = require('../model/User');
const isStrongPassword = require('../utils/passwordvalidator');
const { logProfileUpdate } = require('../utils/auditLogger');
const { createLog } = require('./auditLogController');
require('dotenv').config();
const { fromBuffer } = require("file-type");
const { generateAndSendOTP } = require('./otpController');
const fs = require("fs");

// Register a new user
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const profilePicture = req.file ? req.file.path : null;

    try {
        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password should be at least 8 characters.' });
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
            emailVerified: false,
            passwordLastChanged: new Date() // Set on registration
        });

        await user.save();
        await generateAndSendOTP(user);

        await createLog({
            user: user._id,
            action: 'REGISTER',
            details: { email },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        res.status(201).json({ message: 'User registered successfully. Please check your email for OTP.', userId: user._id });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ message: 'Error registering user' });
    }
};

// Login user
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'User does not exist' });

        // --- LOCKOUT CHECK & RESET ---
        if (user.lockUntil && user.lockUntil > Date.now()) {
            const timeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000);
            await createLog({
                user: user._id,
                action: 'LOGIN_BLOCKED',
                details: { 
                    reason: 'Account locked',
                    lockUntil: user.lockUntil,
                    timeRemaining: timeRemaining + ' seconds'
                },
                ip: req.ip,
                userAgent: req.headers['user-agent']
            });
            res.set('Retry-After', timeRemaining);
            return res.status(403).json({ 
                message: "Account locked. Try again later.",
                lockUntil: user.lockUntil,
                timeRemaining
            });
        }

        // If lock expired, reset counters
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.lockUntil = null;
            user.failedLoginAttempts = 0;
            try {
                await user.save();
                console.log(`Lock reset successful for user ${user.email}, new lockUntil: ${user.lockUntil}, failedLoginAttempts: ${user.failedLoginAttempts}`);
            } catch (error) {
                console.error(`Error resetting lock for user ${user.email}:`, error);
                return res.status(500).json({ message: 'Server error during lock reset' });
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            user.failedLoginAttempts += 1;
            
            // Check if we should lock the account
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 2 * 60 * 1000); // Lock for 2 minutes
                user.failedLoginAttempts = 0; // Reset attempts to avoid accumulation
                try {
                    await user.save();
                    console.log(`Account locked for user ${user.email}, lockUntil: ${user.lockUntil}`);
                } catch (error) {
                    console.error(`Error saving lock for user ${user.email}:`, error);
                    return res.status(500).json({ message: 'Server error during account lock' });
                }
                
                await createLog({
                    user: user._id,
                    action: 'ACCOUNT_LOCKED',
                    details: { 
                        reason: 'Too many failed login attempts',
                        failedAttempts: user.failedLoginAttempts,
                        lockUntil: user.lockUntil
                    },
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });

                res.set('Retry-After', 120);
                return res.status(403).json({ 
                    message: 'Account locked due to too many failed attempts. Try again in 2 minutes.',
                    lockUntil: user.lockUntil,
                    timeRemaining: 120
                });
            } else {
                try {
                    await user.save();
                    console.log(`Saved failed login attempt for user ${user.email}, attempts: ${user.failedLoginAttempts}`);
                } catch (error) {
                    console.error(`Error saving failed login attempt for user ${user.email}:`, error);
                    return res.status(500).json({ message: 'Server error during login attempt' });
                }
                
                await createLog({
                    user: user._id,
                    action: 'LOGIN_FAILED',
                    details: { 
                        reason: 'Invalid password',
                        failedAttempts: user.failedLoginAttempts,
                        attemptsRemaining: 5 - user.failedLoginAttempts
                    },
                    ip: req.ip,
                    userAgent: req.headers['user-agent']
                });

                return res.status(401).json({ 
                    message: 'Invalid email or password',
                    attemptsRemaining: 5 - user.failedLoginAttempts
                });
            }
        }

        // Successful login - reset counters
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        try {
            await user.save();
            console.log(`Successful login for user ${user.email}, counters reset`);
        } catch (error) {
            console.error(`Error saving user after successful login for ${user.email}:`, error);
            return res.status(500).json({ message: 'Server error after successful login' });
        }

        // --- EMAIL VERIFICATION CHECK ---
        if (!user.emailVerified) {
            await generateAndSendOTP(user);
            return res.status(403).json({ message: 'Please verify your email.', userId: user._id });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Set authentication cookie
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Only in production
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour in milliseconds
        });
        
        // Set role cookie (accessible to JavaScript)
        res.cookie('userRole', user.role, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        await createLog({
            user: user._id,
            action: 'LOGIN_SUCCESS',
            details: { 
                email: user.email,
                role: user.role
            },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // Send passwordLastChanged to frontend
        res.status(200).json({
            message: 'Login successful',
            token,
            role: user.role,
            passwordLastChanged: user.passwordLastChanged // Add here
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
};

// Logout user
const logoutUser = async (req, res) => {
    try {
        await createLog({
            user: req.user ? req.user.id : null,
            action: 'LOGOUT',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        // Clear authentication cookies
        res.clearCookie('authToken');
        res.clearCookie('userRole');
        
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout error' });
    }
};

// Check authentication status
const checkAuth = async (req, res) => {
    try {
        const token = req.cookies.authToken;
        if (!token) {
            return res.status(401).json({ isAuthenticated: false });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({ isAuthenticated: false });
        }
        
        return res.status(200).json({ 
            isAuthenticated: true, 
            role: user.role,
            userId: user._id
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ isAuthenticated: false });
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

        await createLog({
            user: userData._id,
            action: 'FORGOT_PASSWORD',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

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
        // --- Check if new password is same as old password ---
        const isSame = await bcrypt.compare(newPassword, userData.password);
        if (isSame) {
            return res.status(400).send({ success: false, msg: "Please use another password." });
        }
        // --- End same password check ---

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne(
            { _id: userData._id },
            { $set: { password: hashedPassword, token: null, passwordLastChanged: new Date() } } // Set here
        );

        await createLog({
            user: userData._id,
            action: 'RESET_PASSWORD',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        // --- Option: Log the user in automatically (remove this if you want them to login manually) ---
        const tokenJwt = jwt.sign(
            { id: userData._id, email: userData.email, role: userData.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        res.cookie('authToken', tokenJwt, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });
        res.cookie('userRole', userData.role, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });
        // -------------------------------------------------------

        res.status(200).send({ success: true, msg: "Password reset successfully.", token: tokenJwt, role: userData.role });
    } catch (error) {
        console.error("Error in resetPassword:", error.message);
        return res.status(500).send({ success: false, msg: error.message });
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

        const updatedFields = {};

        if (typeof name === "string" && name.trim() !== "") {
            user.name = name.trim();
            updatedFields.name = name.trim();
        }
        if (typeof email === "string" && email.trim() !== "") {
            user.email = email.trim();
            updatedFields.email = email.trim();
        }
        if (typeof about === "string") {
            user.about = about.trim();
            updatedFields.about = about.trim();
        }
        if (profilePicture) {
            user.profilePicture = profilePicture;
            updatedFields.profilePicture = profilePicture;
        }

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
            user.passwordLastChanged = new Date(); // Set here
            updatedFields.password = true;
        }

        await user.save();

        await createLog({
            user: userId,
            action: 'UPDATE_PROFILE',
            details: { updatedFields: Object.keys(updatedFields) },
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

        const safeUser = { ...user.toObject() };
        delete safeUser.password;
        res.status(200).json({ message: 'Profile updated successfully', user: safeUser });
    } catch (err) {
        console.log("Error updating profile:", err.message);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ message: 'Error updating profile' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    forgotPassword,
    sendResetPasswordMail,
    resetPassword,
    getUserProfile,
    updateProfile,
    checkAuth  // Export the new function
};