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

  /**
   * Send welcome email to new property manager
   * @param {Object} propertyManager - Property manager object
   * @param {string} propertyManager.email - Property manager's email
   * @param {string} propertyManager.contactPerson - Property manager's contact person name
   * @param {string} propertyManager.companyName - Property manager's company name
   * @returns {Promise} - Email send result
   */
  async sendPropertyManagerWelcomeEmail(propertyManager) {
    if (!propertyManager || !propertyManager.email || !propertyManager.contactPerson || !propertyManager.companyName) {
      throw new Error('Invalid property manager data provided for welcome email');
    }

    console.log('Sending property manager welcome email to:', {
      email: propertyManager.email,
      contactPerson: propertyManager.contactPerson,
      companyName: propertyManager.companyName
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: 'propertyManagerWelcome',
      templateData: {
        name: propertyManager.contactPerson,
        companyName: propertyManager.companyName,
        email: propertyManager.email
      }
    });
  }

  /**
   * Send password reset OTP email to property manager
   * @param {Object} propertyManager - Property manager object
   * @param {string} propertyManager.email - Property manager's email
   * @param {string} propertyManager.contactPerson - Property manager's contact person name
   * @param {string} propertyManager.companyName - Property manager's company name
   * @param {string} otp - OTP code
   * @param {number} expirationMinutes - OTP expiration time in minutes
   * @returns {Promise} - Email send result
   */
  async sendPropertyManagerPasswordResetOTP(propertyManager, otp, expirationMinutes = 10) {
    if (!propertyManager || !propertyManager.email || !propertyManager.contactPerson || !propertyManager.companyName) {
      throw new Error('Invalid property manager data provided for password reset OTP email');
    }

    if (!otp) {
      throw new Error('OTP is required for password reset email');
    }

    console.log('Sending property manager password reset OTP email to:', {
      email: propertyManager.email,
      name: propertyManager.contactPerson,
      companyName: propertyManager.companyName,
      otpLength: otp.length,
      expirationMinutes
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: 'propertyManagerPasswordResetOTP',
      templateData: {
        name: propertyManager.contactPerson,
        companyName: propertyManager.companyName,
        otp: otp,
        expirationMinutes: expirationMinutes
      }
    });
  }

  /**
   * Send welcome email to new staff member
   * @param {Object} staff - Staff object
   * @param {string} staff.email - Staff's email
   * @param {string} staff.fullName - Staff's full name
   * @param {string} staff.tradeType - Staff's trade type
   * @param {Object} owner - Owner object
   * @param {string} owner.name - Owner's name
   * @param {string} owner.type - Owner's type (SuperUser or PropertyManager)
   * @returns {Promise} - Email send result
   */
  async sendStaffWelcomeEmail(staff, owner) {
    if (!staff || !staff.email || !staff.fullName || !staff.tradeType) {
      throw new Error('Invalid staff data provided for welcome email');
    }

    if (!owner || !owner.name || !owner.type) {
      throw new Error('Invalid owner data provided for staff welcome email');
    }

    console.log('Sending staff welcome email to:', {
      email: staff.email,
      fullName: staff.fullName,
      tradeType: staff.tradeType,
      ownerName: owner.name,
      ownerType: owner.type
    });

    return await this.sendTemplatedEmail({
      to: staff.email,
      templateName: 'staffWelcome',
      templateData: {
        staffName: staff.fullName,
        ownerName: owner.name,
        ownerType: owner.type,
        tradeType: staff.tradeType
      }
    });
  }

  /**
   * Send status update email to staff member
   * @param {Object} staff - Staff object
   * @param {string} staff.email - Staff's email
   * @param {string} staff.fullName - Staff's full name
   * @param {string} newStatus - New status
   * @param {Object} owner - Owner object
   * @param {string} owner.name - Owner's name
   * @param {string} [reason] - Optional reason for the status change
   * @returns {Promise} - Email send result
   */
  async sendStaffStatusUpdateEmail(staff, newStatus, owner, reason = null) {
    if (!staff || !staff.email || !staff.fullName) {
      throw new Error('Invalid staff data provided for status update email');
    }

    if (!newStatus) {
      throw new Error('New status is required for status update email');
    }

    if (!owner || !owner.name) {
      throw new Error('Invalid owner data provided for staff status update email');
    }

    console.log('Sending staff status update email to:', {
      email: staff.email,
      fullName: staff.fullName,
      newStatus: newStatus,
      ownerName: owner.name,
      reason: reason
    });

    return await this.sendTemplatedEmail({
      to: staff.email,
      templateName: 'staffStatusUpdate',
      templateData: {
        staffName: staff.fullName,
        newStatus: newStatus,
        ownerName: owner.name,
        reason: reason
      }
    });
  }

  /**
   * Send document reminder email to staff member
   * @param {Object} staff - Staff object
   * @param {string} staff.email - Staff's email
   * @param {string} staff.fullName - Staff's full name
   * @param {string} documentType - Type of document needed
   * @param {Object} owner - Owner object
   * @param {string} owner.name - Owner's name
   * @param {string} [dueDate] - Optional due date for documents
   * @returns {Promise} - Email send result
   */
  async sendStaffDocumentReminderEmail(staff, documentType, owner, dueDate = null) {
    if (!staff || !staff.email || !staff.fullName) {
      throw new Error('Invalid staff data provided for document reminder email');
    }

    if (!documentType) {
      throw new Error('Document type is required for document reminder email');
    }

    if (!owner || !owner.name) {
      throw new Error('Invalid owner data provided for staff document reminder email');
    }

    console.log('Sending staff document reminder email to:', {
      email: staff.email,
      fullName: staff.fullName,
      documentType: documentType,
      ownerName: owner.name,
      dueDate: dueDate
    });

    return await this.sendTemplatedEmail({
      to: staff.email,
      templateName: 'staffDocumentReminder',
      templateData: {
        staffName: staff.fullName,
        documentType: documentType,
        ownerName: owner.name,
        dueDate: dueDate
      }
    });
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
module.exports = emailService; 