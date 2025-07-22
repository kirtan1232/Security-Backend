const fs = require('fs');
const path = require('path');

const logProfileUpdate = async (userId, email, ip, details) => {
    const logPath = path.join(__dirname, '../logs/profile_updates.log');
    const logDir = path.dirname(logPath);

    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch (e) {
            // Silently fail, do NOT log error
            return;
        }
    }

    const logLine = `[${new Date().toISOString()}] PROFILE UPDATE: userId=${userId}, email=${email}, ip=${ip}, details=${JSON.stringify(details)}\n`;
    fs.appendFile(logPath, logLine, err => {
        // Silently fail, do NOT log error
    });
};

module.exports = { logProfileUpdate };