const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    profilePicture: { type: String },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    token: { type: String, default: '' }, 
    // --- OTP fields ---
    emailVerified: { type: Boolean, default: false },
    emailOTP: { type: String }, 
    emailOTPExpires: { type: Date },
    // --- Password Expiry ---
    passwordLastChanged: { type: Date, default: Date.now },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;