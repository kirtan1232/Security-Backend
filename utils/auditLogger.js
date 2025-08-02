const fs = require('fs');
const path = require('path');

const logProfileUpdate = async (userId, email, ip, details) => {
    const logPath = path.join(__dirname, '../logs/profile_updates.log');
    const logDir = path.dirname(logPath);

    
    if (!fs.existsSync(logDir)) {
        try {
            fs.mkdirSync(logDir, { recursive: true });
        } catch (e) {
           
            return;
        }
    }

    const logLine = `[${new Date().toISOString()}] PROFILE UPDATE: userId=${userId}, email=${email}, ip=${ip}, details=${JSON.stringify(details)}\n`;
    fs.appendFile(logPath, logLine, err => {
        
    });
};

module.exports = { logProfileUpdate };