const express = require('express');
const router = express.Router();
const { registerUser, loginUser, forgotPassword, resetPassword, sendResetPasswordMail, getUserProfile, updateProfile, checkAuth, logoutUser } = require('../controller/authController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');
const profileUpload = require("../middleware/profileUploadMiddleware");
const { verifyEmailOTP } = require('../controller/otpController');
const User = require('../model/User');

// Rate limiter for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 5,
    message: { message: "Too many login attempts. Try again later." }
});

const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // max 10 profile edits per window per IP
    message: { message: "Too many profile update attempts. Try again later." }
});

router.post('/register', registerUser);
router.post('/login', loginLimiter, loginUser);
router.post('/forgotPassword', forgotPassword);
router.post('/sendResetMailPassword', sendResetPasswordMail);
router.post('/reset-password', resetPassword);
router.post('/verify-otp', verifyEmailOTP);
router.get('/profile', verifyToken, getUserProfile);
router.put("/update-profile", verifyToken, profileUpload, profileLimiter, updateProfile);
router.get('/users', verifyToken, authorizeRole(['admin']), (req, res) => {
    User.find().select('createdAt role').then(users => res.json(users)).catch(err => res.status(500).json({ message: err.message }));
});

router.get("/check-auth", verifyToken, checkAuth);
router.post('/logout', verifyToken, logoutUser);

module.exports = router;