/**
 * Email template for welcoming new users
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @returns {Object} - Email template configuration
 */
const welcomeTemplate = (data) => ({
  subject: 'Welcome to RentalLease System From Juhan',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Welcome to RentalLease System, ${data.name}!</h2>
      <br>
      <p style="color: #333; line-height: 1.6;">We're excited to have you on board as a Super User.</p>
      <p style="color: #333; line-height: 1.6;">You now have access to manage and oversee the RentalLease platform. Our system provides you with powerful tools to manage properties, leases, and users efficiently.</p>
      <div style="margin: 30px 0;">
        <p style="color: #666;">If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      </div>
      <p style="color: #333;">Best regards,<br>The RentalLease Team</p>
    </div>
  `
});

/**
 * Email template for password reset OTP
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.otp - OTP code
 * @param {number} data.expirationMinutes - OTP expiration time in minutes
 * @returns {Object} - Email template configuration
 */
const passwordResetOTPTemplate = (data) => ({
  subject: 'Password Reset OTP - RentalLease System',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have requested to reset your password for your RentalLease account. 
          Please use the following OTP (One-Time Password) to complete your password reset:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; font-family: monospace;">
            ${data.otp}
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⚠️ Important:</strong> This OTP will expire in ${data.expirationMinutes} minutes. 
            Please use it immediately to reset your password.
          </p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you didn't request this password reset, please ignore this email. 
          Your password will remain unchanged.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalLease System. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalLease Team</strong>
        </p>
      </div>
    </div>
  `
});

// Add more email templates here as needed
const templates = {
  welcome: welcomeTemplate,
  passwordResetOTP: passwordResetOTPTemplate
};

module.exports = templates; 