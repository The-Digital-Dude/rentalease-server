const { Resend } = require('resend');
const emailConfig = require('../config/email');
const emailTemplates = require('../utils/emailTemplates');

class EmailService {
  constructor() {
    this.resend = new Resend(emailConfig.resendApiKey);
    this.defaultFrom = emailConfig.defaultFrom;

    // Bind methods to preserve 'this' context
    this.sendTemplatedEmail = this.sendTemplatedEmail.bind(this);
    this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
  }

  /**
   * Send an email using a template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.templateName - Name of the template to use
   * @param {Object} options.templateData - Data to populate the template
   * @param {string} [options.from] - Sender email (optional)
   * @returns {Promise} - Email send result
   */
  async sendTemplatedEmail({ to, templateName, templateData, from = this.defaultFrom }) {
    try {
      if (!emailTemplates[templateName]) {
        throw new Error(`Template "${templateName}" not found`);
      }

      if (!emailConfig.resendApiKey) {
        throw new Error('Resend API key is not configured');
      }

      const template = emailTemplates[templateName](templateData);

      console.log(`Preparing to send ${templateName} email...`);
      console.log('Email details:', {
        template: templateName,
        to: to,
        from: from,
        timestamp: new Date().toISOString()
      });

      const result = await this.resend.emails.send({
        from,
        to: ["farhad@digitaldude.co.uk"], // Hardcoded for testing
        subject: template.subject,
        html: template.html
      });

      console.log('Email sent successfully:', {
        messageId: result.id,
        to: to,
        template: templateName,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('Error sending email:', {
        error: error.message,
        templateName,
        to,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   * @param {Object} user - User object
   * @param {string} user.email - User's email
   * @param {string} user.name - User's name
   * @returns {Promise} - Email send result
   */
  async sendWelcomeEmail(user) {
    if (!user || !user.email || !user.name) {
      throw new Error('Invalid user data provided for welcome email');
    }

    console.log('Sending welcome email to:', {
      email: user.email,
      name: user.name
    });

    return await this.sendTemplatedEmail({
      to: user.email,
      templateName: 'welcome',
      templateData: {
        name: user.name
      }
    });
  }

  /**
   * Send password reset OTP email
   * @param {Object} user - User object
   * @param {string} user.email - User's email
   * @param {string} user.name - User's name
   * @param {string} otp - OTP code
   * @param {number} expirationMinutes - OTP expiration time in minutes
   * @returns {Promise} - Email send result
   */
  async sendPasswordResetOTP(user, otp, expirationMinutes = 10) {
    if (!user || !user.email || !user.name) {
      throw new Error('Invalid user data provided for password reset OTP email');
    }

    if (!otp) {
      throw new Error('OTP is required for password reset email');
    }

    console.log('Sending password reset OTP email to:', {
      email: user.email,
      name: user.name,
      otpLength: otp.length,
      expirationMinutes
    });

    return await this.sendTemplatedEmail({
      to: user.email,
      templateName: 'passwordResetOTP',
      templateData: {
        name: user.name,
        otp: otp,
        expirationMinutes: expirationMinutes
      }
    });
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = emailService; 