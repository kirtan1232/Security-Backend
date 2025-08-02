/**
 * otp.js
 * Utility to generate a more visually appealing HTML email for OTP verification.
 * Use this to create the HTML body for your OTP emails.
 */

function generateOtpEmailHtml({ name, otp }) {
    return `
      <div style="font-family: Arial, sans-serif; background: #f5f7fa; padding: 40px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table width="400" style="background: #fff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.07); padding: 32px;">
                <tr>
                  <td align="center">
                    <img src="https://cdn-icons-png.flaticon.com/512/3064/3064197.png" alt="SoundWise Logo" width="72" style="margin-bottom: 16px;" />
                    <h2 style="color: #222; margin-bottom: 18px;">Verify your Soundwise Account</h2>
                    <p style="color: #333; font-size: 16px; margin-bottom: 24px;">
                      Hi <b>${name || "User"}</b>,
                      <br /><br />
                      To complete your registration, please use the following verification code:
                    </p>
                    <div style="display: inline-block; background: #f0f4fa; border-radius: 6px; padding: 16px 32px; margin-bottom: 24px;">
                      <span style="font-size: 32px; letter-spacing: 8px; color: #2657eb; font-weight: bold;">${otp}</span>
                    </div>
                    <p style="color: #555; font-size: 14px; margin: 0 0 10px 0;">
                      This code will expire in <b>10 minutes</b>.
                    </p>
                    <p style="color: #a5a5a5; font-size: 12px; margin: 0;">
                      If you did not request this, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: #b0b0b0; margin-top: 16px;">&copy; ${new Date().getFullYear()} SoundWise. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </div>
    `;
  }
  
  module.exports = { generateOtpEmailHtml };