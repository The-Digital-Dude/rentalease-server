import { Resend } from "resend";
import emailConfig from "../config/email.js";
import emailTemplates from "../utils/emailTemplates.js";

class EmailService {
  constructor() {
    // Only initialize Resend if API key is provided
    if (emailConfig.resendApiKey) {
      this.resend = new Resend(emailConfig.resendApiKey);
    } else {
      this.resend = null;
      console.warn(
        "⚠️ Resend API key not provided. Email functionality will be disabled."
      );
    }
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
  async sendTemplatedEmail({
    to,
    templateName,
    templateData,
    from = this.defaultFrom,
  }) {
    try {
      if (!emailTemplates[templateName]) {
        throw new Error(`Template "${templateName}" not found`);
      }

      if (!this.resend) {
        console.warn("📧 Email service not configured. Skipping email send.");
        return { id: "mock-email-id", status: "skipped" };
      }

      const template = emailTemplates[templateName](templateData);

      console.log(`Preparing to send ${templateName} email...`);
      console.log("Email details:", {
        template: templateName,
        to: to,
        from: from,
        timestamp: new Date().toISOString(),
      });

      const result = await this.resend.emails.send({
        from,
        to: [to],
        subject: template.subject,
        html: template.html,
      });

      console.log("Email sent successfully:", {
        messageId: result.id,
        to: to,
        template: templateName,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error("Error sending email:", {
        error: error.message,
        templateName,
        to,
        timestamp: new Date().toISOString(),
        stack: error.stack,
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
      throw new Error("Invalid user data provided for welcome email");
    }

    console.log("Sending welcome email to:", {
      email: user.email,
      name: user.name,
    });

    return await this.sendTemplatedEmail({
      to: user.email,
      templateName: "welcome",
      templateData: {
        name: user.name,
      },
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
      throw new Error(
        "Invalid user data provided for password reset OTP email"
      );
    }

    if (!otp) {
      throw new Error("OTP is required for password reset email");
    }

    console.log("Sending password reset OTP email to:", {
      email: user.email,
      name: user.name,
      otpLength: otp.length,
      expirationMinutes,
    });

    return await this.sendTemplatedEmail({
      to: user.email,
      templateName: "passwordResetOTP",
      templateData: {
        name: user.name,
        otp: otp,
        expirationMinutes: expirationMinutes,
      },
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
    if (
      !propertyManager ||
      !propertyManager.email ||
      !propertyManager.contactPerson ||
      !propertyManager.companyName
    ) {
      throw new Error(
        "Invalid property manager data provided for welcome email"
      );
    }

    console.log("Sending property manager welcome email to:", {
      email: propertyManager.email,
      contactPerson: propertyManager.contactPerson,
      companyName: propertyManager.companyName,
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: "propertyManagerWelcome",
      templateData: {
        name: propertyManager.contactPerson,
        companyName: propertyManager.companyName,
        email: propertyManager.email,
      },
    });
  }

  /**
   * Send credentials email to property manager
   * @param {Object} propertyManager - Property manager object
   * @param {string} propertyManager.email - Property manager's email
   * @param {string} propertyManager.contactPerson - Property manager's contact person name
   * @param {string} propertyManager.companyName - Property manager's company name
   * @param {string} propertyManager.abn - Property manager's ABN
   * @param {string} propertyManager.region - Property manager's region
   * @param {string} propertyManager.compliance - Property manager's compliance level
   * @param {string} password - Property manager's password
   * @param {string} [loginUrl] - Login URL for the system
   * @returns {Promise} - Email send result
   */
  async sendPropertyManagerCredentialsEmail(
    propertyManager,
    password,
    loginUrl = null
  ) {
    if (
      !propertyManager ||
      !propertyManager.email ||
      !propertyManager.contactPerson ||
      !propertyManager.companyName
    ) {
      throw new Error(
        "Invalid property manager data provided for credentials email"
      );
    }

    if (!password) {
      throw new Error("Password is required for credentials email");
    }

    console.log("Sending property manager credentials email to:", {
      email: propertyManager.email,
      contactPerson: propertyManager.contactPerson,
      companyName: propertyManager.companyName,
      abn: propertyManager.abn,
      region: propertyManager.region,
      compliance: propertyManager.compliance,
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: "propertyManagerCredentials",
      templateData: {
        name: propertyManager.contactPerson,
        companyName: propertyManager.companyName,
        email: propertyManager.email,
        password: password,
        abn: propertyManager.abn,
        region: propertyManager.region,
        compliance: propertyManager.compliance,
        loginUrl: loginUrl,
      },
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
  async sendPropertyManagerPasswordResetOTP(
    propertyManager,
    otp,
    expirationMinutes = 10
  ) {
    if (
      !propertyManager ||
      !propertyManager.email ||
      !propertyManager.contactPerson ||
      !propertyManager.companyName
    ) {
      throw new Error(
        "Invalid property manager data provided for password reset OTP email"
      );
    }

    if (!otp) {
      throw new Error("OTP is required for password reset email");
    }

    console.log("Sending property manager password reset OTP email to:", {
      email: propertyManager.email,
      name: propertyManager.contactPerson,
      companyName: propertyManager.companyName,
      otpLength: otp.length,
      expirationMinutes,
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: "propertyManagerPasswordResetOTP",
      templateData: {
        name: propertyManager.contactPerson,
        companyName: propertyManager.companyName,
        otp: otp,
        expirationMinutes: expirationMinutes,
      },
    });
  }

  /**
   * Send welcome email to new agency
   * @param {Object} agency - Agency object
   * @param {string} agency.email - Agency's email
   * @param {string} agency.contactPerson - Agency's contact person name
   * @param {string} agency.companyName - Agency's company name
   * @returns {Promise} - Email send result
   */
  async sendAgencyWelcomeEmail(agency) {
    if (
      !agency ||
      !agency.email ||
      !agency.contactPerson ||
      !agency.companyName
    ) {
      throw new Error("Invalid agency data provided for welcome email");
    }

    console.log("Sending agency welcome email to:", {
      email: agency.email,
      contactPerson: agency.contactPerson,
      companyName: agency.companyName,
    });

    return await this.sendTemplatedEmail({
      to: agency.email,
      templateName: "agencyWelcome",
      templateData: {
        name: agency.contactPerson,
        companyName: agency.companyName,
        email: agency.email,
      },
    });
  }

  /**
   * Send credentials email to agency
   * @param {Object} agency - Agency object
   * @param {string} agency.email - Agency's email
   * @param {string} agency.contactPerson - Agency's contact person name
   * @param {string} agency.companyName - Agency's company name
   * @param {string} agency.abn - Agency's ABN
   * @param {string} agency.region - Agency's region
   * @param {string} agency.compliance - Agency's compliance level
   * @param {string} password - Agency's password
   * @param {string} [loginUrl] - Login URL for the system
   * @returns {Promise} - Email send result
   */
  async sendAgencyCredentialsEmail(agency, password, loginUrl = null) {
    if (
      !agency ||
      !agency.email ||
      !agency.contactPerson ||
      !agency.companyName
    ) {
      throw new Error("Invalid agency data provided for credentials email");
    }

    if (!password) {
      throw new Error("Password is required for credentials email");
    }

    console.log("Sending agency credentials email to:", {
      email: agency.email,
      contactPerson: agency.contactPerson,
      companyName: agency.companyName,
      abn: agency.abn,
      region: agency.region,
      compliance: agency.compliance,
    });

    return await this.sendTemplatedEmail({
      to: agency.email,
      templateName: "agencyCredentials",
      templateData: {
        name: agency.contactPerson,
        companyName: agency.companyName,
        email: agency.email,
        password: password,
        abn: agency.abn,
        region: agency.region,
        compliance: agency.compliance,
        loginUrl: loginUrl,
      },
    });
  }

  /**
   * Send password reset OTP email to agency
   * @param {Object} agency - Agency object
   * @param {string} agency.email - Agency's email
   * @param {string} agency.contactPerson - Agency's contact person name
   * @param {string} agency.companyName - Agency's company name
   * @param {string} otp - OTP code
   * @param {number} expirationMinutes - OTP expiration time in minutes
   * @returns {Promise} - Email send result
   */
  async sendAgencyPasswordResetOTP(agency, otp, expirationMinutes = 10) {
    if (
      !agency ||
      !agency.email ||
      !agency.contactPerson ||
      !agency.companyName
    ) {
      throw new Error(
        "Invalid agency data provided for password reset OTP email"
      );
    }

    if (!otp) {
      throw new Error("OTP is required for password reset email");
    }

    console.log("Sending agency password reset OTP email to:", {
      email: agency.email,
      name: agency.contactPerson,
      companyName: agency.companyName,
      otpLength: otp.length,
      expirationMinutes,
    });

    return await this.sendTemplatedEmail({
      to: agency.email,
      templateName: "agencyPasswordResetOTP",
      templateData: {
        name: agency.contactPerson,
        companyName: agency.companyName,
        otp: otp,
        expirationMinutes: expirationMinutes,
      },
    });
  }

  /**
   * Send welcome email to new technician
   * @param {Object} technician - Technician object
   * @param {string} technician.email - Technician's email
   * @param {string} technician.fullName - Technician's full name
   * @param {Object} owner - Owner object
   * @param {string} owner.name - Owner's name
   * @param {string} owner.type - Owner's type (SuperUser or Agency)
   * @returns {Promise} - Email send result
   */
  async sendTechnicianWelcomeEmail(technician, owner) {
    if (!technician || !technician.email || !technician.fullName) {
      throw new Error("Invalid technician data provided for welcome email");
    }

    if (!owner || !owner.name || !owner.type) {
      throw new Error(
        "Invalid owner data provided for technician welcome email"
      );
    }

    console.log("Sending technician welcome email to:", {
      email: technician.email,
      fullName: technician.fullName,
      ownerName: owner.name,
      ownerType: owner.type,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "technicianWelcome",
      templateData: {
        technicianName: technician.fullName,
        ownerName: owner.name,
        ownerType: owner.type,
      },
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
      throw new Error("Invalid staff data provided for status update email");
    }

    if (!newStatus) {
      throw new Error("New status is required for status update email");
    }

    if (!owner || !owner.name) {
      throw new Error(
        "Invalid owner data provided for staff status update email"
      );
    }

    console.log("Sending staff status update email to:", {
      email: staff.email,
      fullName: staff.fullName,
      newStatus: newStatus,
      ownerName: owner.name,
      reason: reason,
    });

    return await this.sendTemplatedEmail({
      to: staff.email,
      templateName: "staffStatusUpdate",
      templateData: {
        staffName: staff.fullName,
        newStatus: newStatus,
        ownerName: owner.name,
        reason: reason,
      },
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
  async sendStaffDocumentReminderEmail(
    staff,
    documentType,
    owner,
    dueDate = null
  ) {
    if (!staff || !staff.email || !staff.fullName) {
      throw new Error(
        "Invalid staff data provided for document reminder email"
      );
    }

    if (!documentType) {
      throw new Error("Document type is required for document reminder email");
    }

    if (!owner || !owner.name) {
      throw new Error(
        "Invalid owner data provided for staff document reminder email"
      );
    }

    console.log("Sending staff document reminder email to:", {
      email: staff.email,
      fullName: staff.fullName,
      documentType: documentType,
      ownerName: owner.name,
      dueDate: dueDate,
    });

    return await this.sendTemplatedEmail({
      to: staff.email,
      templateName: "staffDocumentReminder",
      templateData: {
        staffName: staff.fullName,
        documentType: documentType,
        ownerName: owner.name,
        dueDate: dueDate,
      },
    });
  }

  /**
   * Send job assignment notification email to technician
   * @param {Object} technician - Technician object
   * @param {string} technician.email - Technician's email
   * @param {string} technician.fullName - Technician's full name
   * @param {Object} job - Job object
   * @param {string} job.job_id - Job ID
   * @param {string} job.propertyAddress - Property address
   * @param {string} job.jobType - Job type
   * @param {Date} job.dueDate - Due date
   * @param {string} job.priority - Job priority
   * @param {string} [job.description] - Job description
   * @param {number} [job.estimatedDuration] - Estimated duration in hours
   * @param {string} [job.notes] - Additional notes
   * @param {Object} assignedBy - User who assigned the job
   * @param {string} assignedBy.name - Name of person who assigned
   * @param {string} assignedBy.type - Type of user (SuperUser or PropertyManager)
   * @returns {Promise} - Email send result
   */
  async sendJobAssignmentEmail(technician, job, assignedBy) {
    if (!technician || !technician.email || !technician.fullName) {
      throw new Error(
        "Invalid technician data provided for job assignment email"
      );
    }

    if (
      !job ||
      !job.job_id ||
      !job.propertyAddress ||
      !job.jobType ||
      !job.dueDate ||
      !job.priority
    ) {
      throw new Error("Invalid job data provided for job assignment email");
    }

    if (!assignedBy || !assignedBy.name || !assignedBy.type) {
      throw new Error(
        "Invalid assignedBy data provided for job assignment email"
      );
    }

    // Format the due date for display
    const formattedDueDate = new Date(job.dueDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    console.log("Sending job assignment email to technician:", {
      email: technician.email,
      technicianName: technician.fullName,
      jobId: job.job_id,
      jobType: job.jobType,
      propertyAddress: job.propertyAddress,
      assignedBy: assignedBy.name,
      assignedByType: assignedBy.type,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "jobAssignment",
      templateData: {
        technicianName: technician.fullName,
        jobId: job.job_id,
        propertyAddress: job.propertyAddress,
        jobType: job.jobType,
        dueDate: formattedDueDate,
        priority: job.priority,
        description: job.description || "",
        estimatedDuration: job.estimatedDuration || "",
        assignedBy: assignedBy.name,
        assignedByType:
          assignedBy.type === "SuperUser" ? "Super User" : "Agency",
        notes: job.notes || "",
      },
    });
  }

  /**
   * Send welcome email to new technician
   * @param {Object} technician - Technician object
   * @param {string} technician.email - Technician's email
   * @param {string} technician.fullName - Technician's full name
   * @param {string} technician.tradeType - Technician's trade type
   * @returns {Promise} - Email send result
   */
  async sendTechnicianWelcomeEmail(technician) {
    if (
      !technician ||
      !technician.email ||
      !technician.fullName ||
      !technician.tradeType
    ) {
      throw new Error("Invalid technician data provided for welcome email");
    }

    console.log("Sending welcome email to technician:", {
      email: technician.email,
      fullName: technician.fullName,
      tradeType: technician.tradeType,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "technicianWelcome",
      templateData: {
        fullName: technician.fullName,
        tradeType: technician.tradeType,
      },
    });
  }

  /**
   * Send password reset OTP email to technician
   * @param {Object} technician - Technician object
   * @param {string} technician.email - Technician's email
   * @param {string} technician.fullName - Technician's full name
   * @param {string} otp - One-time password
   * @param {number} expirationMinutes - OTP expiration time in minutes
   * @returns {Promise} - Email send result
   */
  async sendTechnicianPasswordResetOTP(
    technician,
    otp,
    expirationMinutes = 10
  ) {
    if (!technician || !technician.email || !technician.fullName) {
      throw new Error(
        "Invalid technician data provided for password reset email"
      );
    }

    if (!otp) {
      throw new Error("OTP is required for password reset email");
    }

    console.log("Sending password reset OTP email to technician:", {
      email: technician.email,
      fullName: technician.fullName,
      otp: otp,
      expirationMinutes: expirationMinutes,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "technicianPasswordReset",
      templateData: {
        fullName: technician.fullName,
        otp: otp,
        expirationMinutes: expirationMinutes,
      },
    });
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
export default emailService;
