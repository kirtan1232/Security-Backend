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
const { sendMail, generateStyledMail } = require('../utils/mail');
const fs = require("fs");
const crypto = require('crypto');
const validator = require('validator'); 

const registerUser = async (req, res) => {
    let { name, email, password, role } = req.body;
    const profilePicture = req.file ? req.file.path : null;

    try {
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email address.' });
        }
        name = validator.escape(name || "");
        role = validator.escape(role || "");

        if (!isStrongPassword(password)) {
            return res.status(400).json({ message: 'Password should be at least 8 characters.' });
        }
        const userExist = await User.findOne({ email: email });
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
            passwordLastChanged: new Date()
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

const loginUser = async (req, res) => {
    let { email, password, captchaToken } = req.body;
    try {
        
        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: 'Invalid email address.' });
        }
        const user = await User.findOne({ email: email });
        if (!user) return res.status(400).json({ message: 'User does not exist' });

        
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

       
        if (user.lockUntil && user.lockUntil <= Date.now()) {
            user.lockUntil = null;
            user.failedLoginAttempts = 0;
            try {
                await user.save();
            } catch (error) {
                console.error(`Error resetting lock for user ${user.email}:`, error);
                return res.status(500).json({ message: 'Server error during lock reset' });
            }
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            user.failedLoginAttempts += 1;
            
            if (user.failedLoginAttempts >= 5) {
                user.lockUntil = new Date(Date.now() + 2 * 60 * 1000); 
                user.failedLoginAttempts = 0; 
                try {
                    await user.save();
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

        
        user.failedLoginAttempts = 0;
        user.lockUntil = null;
        try {
            await user.save();
        } catch (error) {
            console.error(`Error saving user after successful login for ${user.email}:`, error);
            return res.status(500).json({ message: 'Server error after successful login' });
        }

        
        if (!user.emailVerified) {
            await generateAndSendOTP(user);
            return res.status(403).json({ message: 'Please verify your email.', userId: user._id });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

      
        res.cookie('authToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 
        });
        
        
        res.cookie('userRole', user.role, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 
        });

       
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 
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

        res.status(200).json({
            message: 'Login successful',
            token,
            role: user.role,
            passwordLastChanged: user.passwordLastChanged,
            csrfToken
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Error logging in', error });
    }
};

const logoutUser = async (req, res) => {
    try {
        await createLog({
            user: req.user ? req.user.id : null,
            action: 'LOGOUT',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });
        
        res.clearCookie('authToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        res.clearCookie('userRole', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        res.clearCookie('csrfToken', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });
        
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Logout error' });
    }
};

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

        
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 
        });
        
        return res.status(200).json({ 
            isAuthenticated: true, 
            role: user.role,
            userId: user._id,
            csrfToken
        });
    } catch (error) {
        console.error('Auth check error:', error);
        return res.status(401).json({ isAuthenticated: false });
    }
};

const forgotPassword = async (req, res) => {
    const email = req.body.email;
    try {
        // Validate email input
        if (!validator.isEmail(email)) {
            return res.status(400).send({ success: false, msg: "Invalid email address." });
        }
        const userData = await User.findOne({ email: email });
        if (!userData) {
            return res.status(404).send({ success: false, msg: "This email does not exist." });
        }
        const randomToken = randomstring.generate();
        await User.updateOne({ email: email }, { $set: { token: randomToken } });
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

const sendResetPasswordMail = async (name, email, token) => {
    if (!email) return;
    const resetUrl = `https://localhost:5173/resetPassword?token=${token}`;
    const html = generateStyledMail({
        title: "Password Reset Request",
        message: `Hi <b>${name}</b>,<br>We received a request to reset your password. Click below to set a new password:`,
        buttonText: "Reset Password",
        buttonUrl: resetUrl,
        footer: "If you did not request a password reset, you can safely ignore this email."
    });
    await sendMail({
        to: email,
        subject: "Password Reset Request",
        html
    });
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        if (!isStrongPassword(newPassword)) {
            return res.status(400).send({ success: false, msg: "Password does not meet complexity requirements." });
        }
        const userData = await User.findOne({ token: token });
        if (!userData) {
            return res.status(404).send({ success: false, msg: "Invalid or expired token." });
        }
        const isSame = await bcrypt.compare(newPassword, userData.password);
        if (isSame) {
            return res.status(400).send({ success: false, msg: "Please use another password." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.updateOne(
            { _id: userData._id },
            { $set: { password: hashedPassword, token: null, passwordLastChanged: new Date() } }
        );

        await createLog({
            user: userData._id,
            action: 'RESET_PASSWORD',
            ip: req.ip,
            userAgent: req.headers['user-agent']
        });

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
        const csrfToken = crypto.randomBytes(32).toString('hex');
        res.cookie('csrfToken', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000
        });

        res.status(200).send({ success: true, msg: "Password reset successfully.", token: tokenJwt, role: userData.role, csrfToken });
    } catch (error) {
        console.error("Error in resetPassword:", error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

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

const updateProfile = async (req, res) => {
    let { name, email, about, oldPassword, newPassword } = req.body;
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
            user.name = validator.escape(name.trim());
            updatedFields.name = user.name;
        }
        if (typeof email === "string" && email.trim() !== "" && validator.isEmail(email.trim())) {
            user.email = email.trim();
            updatedFields.email = email.trim();
        }
        if (typeof about === "string") {
            user.about = validator.escape(about.trim());
            updatedFields.about = user.about;
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
            user.passwordLastChanged = new Date();
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
    checkAuth
};