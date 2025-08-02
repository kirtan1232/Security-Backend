const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587,
    secure: false,
    requireTLS: true,
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASSWORD 
    },
});

/**
 * Send an email using nodemailer.
 * @param {Object} options
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject.
 * @param {string} options.html - HTML body content.
 * @param {string} [options.text] - Plain text version of body.
 * @returns {Promise}
 */
const sendMail = async ({ to, subject, html, text }) => {
    const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to,
        subject,
        html,
        text
    };
    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

/**
 * Generate a styled HTML email template.
 * @param {Object} params
 * @param {string} params.title - Main email title.
 * @param {string} params.message - Body message of email.
 * @param {string} [params.buttonText] - Button text (optional).
 * @param {string} [params.buttonUrl] - URL for the button (optional).
 * @param {string} [params.footer] - Footer message (optional).
 */
function generateStyledMail({ title, message, buttonText, buttonUrl, footer }) {
    return `
        <div style="max-width:440px;margin:40px auto;padding:30px;border-radius:12px;border:1px solid #ececec;font-family:Arial,sans-serif;background:#fff;box-shadow:0 4px 18px rgba(0,0,0,0.08)">
            <div style="text-align:center;margin-bottom:28px;">
                <img src="https://cdn-icons-png.flaticon.com/512/561/561127.png" alt="Mail Icon" width="54" height="54" style="margin-bottom:8px;">
                <h2 style="margin:0;font-size:1.4em;color:#1a1a1a;">${title}</h2>
            </div>
            <div style="margin-bottom:28px;font-size:1.05em;color:#313131;line-height:1.6;">
                ${message}
            </div>
            ${buttonText && buttonUrl ? `
                <div style="text-align:center;margin-bottom:22px;">
                    <a href="${buttonUrl}" style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:1.1em;letter-spacing:0.04em;">
                        ${buttonText}
                    </a>
                </div>
            ` : ''}
            <div style="font-size:0.97em;color:#999;text-align:center;">
                ${footer || 'If you did not request this, please ignore this email.'}
            </div>
        </div>
    `;
}

module.exports = {
    sendMail,
    generateStyledMail
};