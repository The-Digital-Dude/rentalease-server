import FormData from "form-data";
import Mailgun from "mailgun.js";
import postmark from "postmark";
import nodemailer from "nodemailer";
import emailConfig, { isValidEmail } from "../config/email.js";
import emailTemplates from "../utils/emailTemplates.js";
import SuperUser from "../models/SuperUser.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import TeamMember from "../models/TeamMember.js";
import Technician from "../models/Technician.js";

class EmailService {
  constructor() {
    this.mailgun = null;
    this.smtpTransporter = null;
    this.postmark = null;
    this.resend = null;
    this.providerName = "none";

    if (emailConfig.mailgunApiKey && emailConfig.mailgunDomain) {
      const mailgun = new Mailgun(FormData);
      const mailgunClientConfig = {
        username: "api",
        key: emailConfig.mailgunApiKey,
      };

      if (emailConfig.mailgunBaseUrl) {
        mailgunClientConfig.url = emailConfig.mailgunBaseUrl;
      }

      this.mailgun = {
        client: mailgun.client(mailgunClientConfig),
        domain: emailConfig.mailgunDomain,
      };
      this.providerName = "mailgun";
    }

    const shouldUseSmtp =
      emailConfig.emailProvider === "smtp" ||
      !!emailConfig.smtpUser ||
      !!emailConfig.smtpPassword;

    if (
      (!this.mailgun || emailConfig.emailProvider === "smtp") &&
      shouldUseSmtp &&
      emailConfig.smtpHost
    ) {
      const smtpConfig = {
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpSecure,
        name: emailConfig.smtpName,
      };

      if (emailConfig.smtpUser && emailConfig.smtpPassword) {
        smtpConfig.auth = {
          user: emailConfig.smtpUser,
          pass: emailConfig.smtpPassword,
        };
      }

      this.smtpTransporter = nodemailer.createTransport(smtpConfig);
      this.providerName = "smtp";
    }

    if (
      (!this.mailgun &&
        !this.smtpTransporter &&
        emailConfig.postmarkServerToken) ||
      emailConfig.emailProvider === "postmark"
    ) {
      this.postmark = new postmark.ServerClient(
        emailConfig.postmarkServerToken
      );
      if (
        (!this.mailgun && !this.smtpTransporter) ||
        emailConfig.emailProvider === "postmark"
      ) {
        this.providerName = "postmark";
      }
    }

    if (this.mailgun || this.smtpTransporter || this.postmark) {
      this.resend = {
        emails: {
          send: async (payload) => this.sendWithConfiguredProvider(payload),
        },
      };
    } else {
      console.warn(
        "⚠️ No email provider is configured. Email functionality will be disabled."
      );
    }

    this.defaultFrom = emailConfig.defaultFrom;
    this.defaultReplyTo = emailConfig.replyToEmail;
    this.smtpFrom = emailConfig.smtpFrom;

    // Bind methods to preserve 'this' context
    this.sendTemplatedEmail = this.sendTemplatedEmail.bind(this);
    this.sendWelcomeEmail = this.sendWelcomeEmail.bind(this);
  }

  async sendWithConfiguredProvider(payload = {}) {
    if (emailConfig.emailProvider === "mailgun") {
      return this.sendWithMailgun(payload);
    }

    if (emailConfig.emailProvider === "postmark") {
      return this.sendWithPostmark(payload);
    }

    if (emailConfig.emailProvider === "smtp") {
      return this.sendWithSmtp(payload);
    }

    if (this.mailgun) {
      return this.sendWithMailgun(payload);
    }

    if (this.smtpTransporter) {
      return this.sendWithSmtp(payload);
    }

    return this.sendWithPostmark(payload);
  }

  async sendWithPostmark(payload = {}) {
    if (!this.postmark) {
      console.warn("📧 Email service not configured. Skipping email send.");
      return { id: "mock-email-id", status: "skipped", provider: "postmark" };
    }

    const requestBody = await this.buildPostmarkPayload(payload);
    const result = await this.postmark.sendEmail(requestBody);

    return {
      id: result.MessageID,
      messageId: result.MessageID,
      submittedAt: result.SubmittedAt,
      to: result.To,
      errorCode: result.ErrorCode,
      message: result.Message,
      provider: "postmark",
      raw: result,
    };
  }

  async sendWithMailgun(payload = {}) {
    if (!this.mailgun) {
      console.warn("📧 Mailgun is not configured. Skipping email send.");
      return { id: "mock-email-id", status: "skipped", provider: "mailgun" };
    }

    const messageData = await this.buildMailgunPayload(payload);
    const result = await this.mailgun.client.messages.create(
      this.mailgun.domain,
      messageData
    );

    return {
      id: result.id,
      messageId: result.id,
      message: result.message,
      provider: "mailgun",
      raw: result,
    };
  }

  async sendWithSmtp(payload = {}) {
    if (!this.smtpTransporter) {
      console.warn("📧 SMTP is not configured. Skipping email send.");
      return { id: "mock-email-id", status: "skipped", provider: "smtp" };
    }

    const mailOptions = await this.buildSmtpPayload(payload);
    const result = await this.smtpTransporter.sendMail(mailOptions);

    return {
      id: result.messageId,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      response: result.response,
      provider: "smtp",
      raw: result,
    };
  }

  async buildPostmarkPayload(payload = {}) {
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      replyTo,
      headers,
      tag,
      trackOpens,
      messageStream,
    } = payload;

    const postmarkPayload = {
      From: from || this.defaultFrom,
      To: this.normalizeRecipientList(to),
      Subject: subject || "(No Subject)",
      HtmlBody: html || undefined,
      TextBody: text || undefined,
    };

    if (cc?.length) {
      postmarkPayload.Cc = this.normalizeRecipientList(cc);
    }

    if (bcc?.length) {
      postmarkPayload.Bcc = this.normalizeRecipientList(bcc);
    }

    const resolvedReplyTo = replyTo || this.defaultReplyTo;
    if (resolvedReplyTo) {
      postmarkPayload.ReplyTo = resolvedReplyTo;
    }

    if (Array.isArray(headers) && headers.length > 0) {
      postmarkPayload.Headers = headers;
    }

    if (tag) {
      postmarkPayload.Tag = tag;
    }

    if (typeof trackOpens === "boolean") {
      postmarkPayload.TrackOpens = trackOpens;
    }

    if (messageStream) {
      postmarkPayload.MessageStream = messageStream;
    } else {
      postmarkPayload.MessageStream = emailConfig.postmarkMessageStream;
    }

    const preparedAttachments = await this.preparePostmarkAttachments(
      attachments
    );
    if (preparedAttachments.length > 0) {
      postmarkPayload.Attachments = preparedAttachments;
    }

    return postmarkPayload;
  }

  normalizeRecipientList(recipients = []) {
    const list = Array.isArray(recipients) ? recipients : [recipients];

    return list
      .map((recipient) => {
        if (!recipient) {
          return "";
        }

        if (typeof recipient === "string") {
          return recipient.trim();
        }

        if (!recipient.email) {
          return "";
        }

        const normalizedEmail = recipient.email.trim();
        return recipient.name
          ? `${recipient.name} <${normalizedEmail}>`
          : normalizedEmail;
      })
      .filter(Boolean)
      .join(",");
  }

  async preparePostmarkAttachments(attachments = []) {
    const preparedAttachments = [];

    for (const attachment of attachments || []) {
      if (!attachment) {
        continue;
      }

      let contentBuffer = null;
      let contentType =
        attachment.contentType || "application/octet-stream";

      if (attachment.content) {
        contentBuffer = Buffer.isBuffer(attachment.content)
          ? attachment.content
          : Buffer.from(String(attachment.content), "utf8");
      } else if (attachment.path) {
        const response = await fetch(attachment.path);
        if (!response.ok) {
          throw new Error(
            `Failed to download attachment from ${attachment.path}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        contentBuffer = Buffer.from(arrayBuffer);
        contentType =
          attachment.contentType ||
          response.headers.get("content-type") ||
          contentType;
      }

      if (!contentBuffer) {
        continue;
      }

      preparedAttachments.push({
        Name: attachment.filename || "attachment",
        Content: contentBuffer.toString("base64"),
        ContentType: contentType,
      });
    }

    return preparedAttachments;
  }

  async buildMailgunPayload(payload = {}) {
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      replyTo,
      headers,
    } = payload;

    const messageData = {
      from: from || this.defaultFrom,
      to: this.normalizeRecipientArray(to),
      subject: subject || "(No Subject)",
      html: html || undefined,
      text: text || undefined,
    };

    if (cc?.length) {
      messageData.cc = this.normalizeRecipientArray(cc);
    }

    if (bcc?.length) {
      messageData.bcc = this.normalizeRecipientArray(bcc);
    }

    const resolvedReplyTo = replyTo || this.defaultReplyTo;
    if (resolvedReplyTo) {
      messageData["h:Reply-To"] = resolvedReplyTo;
    }

    if (Array.isArray(headers)) {
      for (const header of headers) {
        if (header?.Name && header?.Value) {
          messageData[`h:${header.Name}`] = header.Value;
        }
      }
    }

    const preparedAttachments = await this.prepareMailgunAttachments(
      attachments
    );
    if (preparedAttachments.length > 0) {
      messageData.attachment = preparedAttachments;
    }

    return messageData;
  }

  normalizeRecipientArray(recipients = []) {
    const list = Array.isArray(recipients) ? recipients : [recipients];

    return list
      .map((recipient) => {
        if (!recipient) {
          return "";
        }

        if (typeof recipient === "string") {
          return recipient.trim();
        }

        if (!recipient.email) {
          return "";
        }

        const normalizedEmail = recipient.email.trim();
        return recipient.name
          ? `${recipient.name} <${normalizedEmail}>`
          : normalizedEmail;
      })
      .filter(Boolean);
  }

  async prepareMailgunAttachments(attachments = []) {
    const preparedAttachments = [];

    for (const attachment of attachments || []) {
      if (!attachment) {
        continue;
      }

      if (attachment.content) {
        preparedAttachments.push({
          filename: attachment.filename || "attachment",
          data: Buffer.isBuffer(attachment.content)
            ? attachment.content
            : Buffer.from(String(attachment.content), "utf8"),
          contentType: attachment.contentType || "application/octet-stream",
        });
        continue;
      }

      if (attachment.path) {
        const response = await fetch(attachment.path);
        if (!response.ok) {
          throw new Error(
            `Failed to download attachment from ${attachment.path}`
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        preparedAttachments.push({
          filename: attachment.filename || "attachment",
          data: Buffer.from(arrayBuffer),
          contentType:
            attachment.contentType ||
            response.headers.get("content-type") ||
            "application/octet-stream",
        });
      }
    }

    return preparedAttachments;
  }

  async buildSmtpPayload(payload = {}) {
    const {
      from,
      to,
      cc,
      bcc,
      subject,
      html,
      text,
      attachments,
      replyTo,
      headers,
    } = payload;

    const resolvedFrom =
      !from || from === this.defaultFrom ? this.smtpFrom || this.defaultFrom : from;

    const smtpPayload = {
      from: resolvedFrom,
      to: this.normalizeRecipientList(to),
      subject: subject || "(No Subject)",
      html: html || undefined,
      text: text || undefined,
    };

    if (cc?.length) {
      smtpPayload.cc = this.normalizeRecipientList(cc);
    }

    if (bcc?.length) {
      smtpPayload.bcc = this.normalizeRecipientList(bcc);
    }

    const resolvedReplyTo = replyTo || this.defaultReplyTo;
    if (resolvedReplyTo) {
      smtpPayload.replyTo = resolvedReplyTo;
    }

    if (Array.isArray(headers) && headers.length > 0) {
      smtpPayload.headers = headers.reduce((acc, header) => {
        if (header?.Name && header?.Value) {
          acc[header.Name] = header.Value;
        }
        return acc;
      }, {});
    }

    const preparedAttachments = await this.prepareSmtpAttachments(attachments);
    if (preparedAttachments.length > 0) {
      smtpPayload.attachments = preparedAttachments;
    }

    return smtpPayload;
  }

  async prepareSmtpAttachments(attachments = []) {
    const preparedAttachments = [];

    for (const attachment of attachments || []) {
      if (!attachment) {
        continue;
      }

      if (attachment.content) {
        preparedAttachments.push({
          filename: attachment.filename || "attachment",
          content: attachment.content,
          contentType: attachment.contentType || "application/octet-stream",
        });
        continue;
      }

      if (attachment.path) {
        preparedAttachments.push({
          filename: attachment.filename || "attachment",
          path: attachment.path,
          contentType: attachment.contentType || "application/octet-stream",
        });
      }
    }

    return preparedAttachments;
  }

  async resolveRecipientReference(recipient) {
    if (!recipient) {
      return null;
    }

    if (typeof recipient === "string") {
      return { email: recipient.trim() };
    }

    if (recipient.email) {
      return {
        email: String(recipient.email).trim(),
        name: recipient.name || recipient.fullName,
      };
    }

    if (!recipient.recipientType || !recipient.recipientId) {
      return null;
    }

    let record = null;

    switch (recipient.recipientType) {
      case "SuperUser":
        record = await SuperUser.findById(recipient.recipientId).select(
          "email fullName name"
        );
        break;
      case "Agency":
        record = await Agency.findById(recipient.recipientId).select(
          "email contactPerson companyName"
        );
        break;
      case "PropertyManager":
        record = await PropertyManager.findById(recipient.recipientId).select(
          "email firstName lastName fullName"
        );
        break;
      case "TeamMember":
        record = await TeamMember.findById(recipient.recipientId).select(
          "email fullName name"
        );
        break;
      case "Technician":
        record = await Technician.findById(recipient.recipientId).select(
          "email firstName lastName fullName"
        );
        break;
      default:
        return null;
    }

    if (!record?.email) {
      return null;
    }

    const name =
      record.fullName ||
      record.name ||
      record.contactPerson ||
      record.companyName ||
      `${record.firstName || ""} ${record.lastName || ""}`.trim() ||
      undefined;

    return {
      email: String(record.email).trim(),
      name,
    };
  }

  async resolveRecipientsForDelivery(recipients) {
    const recipientList = Array.isArray(recipients)
      ? recipients
      : recipients
        ? [recipients]
        : [];

    const resolvedRecipients = await Promise.all(
      recipientList.map((recipient) => this.resolveRecipientReference(recipient))
    );

    const deduped = [];
    const seen = new Set();

    for (const recipient of resolvedRecipients) {
      const email = recipient?.email?.trim()?.toLowerCase();
      if (!email || seen.has(email)) {
        continue;
      }

      seen.add(email);
      deduped.push({
        email,
        name: recipient.name,
      });
    }

    return deduped;
  }

  /**
   * Send an email using a template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.templateName - Name of the template to use
   * @param {Object} options.templateData - Data to populate the template
   * @param {string} [options.from] - Sender email (optional)
   * @param {Object} [options.customTemplates] - Custom templates object (optional)
   * @returns {Promise} - Email send result
   */
  async sendTemplatedEmail({
    to,
    templateName,
    templateData,
    from = this.defaultFrom,
    customTemplates = null,
  }) {
    try {
      // Check if template exists in custom templates first, then fall back to default templates
      let template;
      if (customTemplates && customTemplates[templateName]) {
        template = customTemplates[templateName](templateData);
      } else if (emailTemplates[templateName]) {
        template = emailTemplates[templateName](templateData);
      } else {
        throw new Error(`Template "${templateName}" not found`);
      }

      if (!this.resend) {
        console.warn("📧 Email service not configured. Skipping email send.");
        return { id: "mock-email-id", status: "skipped" };
      }

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

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping welcome email for:", user.email);
      return { success: false, message: "Email service not configured" };
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

  buildWebsiteLeadTemplateData(lead) {
    const firstName = String(lead?.firstName || "").trim();
    const lastName = String(lead?.lastName || "").trim();
    const submittedAt = lead?.createdAt
      ? new Date(lead.createdAt).toLocaleString("en-AU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : new Date().toLocaleString("en-AU", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

    return {
      leadId: lead?._id?.toString?.() || String(lead?._id || ""),
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(" ").trim(),
      email: lead?.email || "",
      phone: lead?.phone || "",
      profession: lead?.profession || "",
      message: lead?.message || "",
      source: lead?.source || "website_contact_form",
      sourceLabel:
        lead?.source === "website_bookNow_form" ? "Book Now" : "Contact Us",
      submittedAt,
      supportEmail: emailConfig.supportEmail,
      supportPhone: "03 5906 7723",
    };
  }

  async sendWebsiteContactLeadAcknowledgement(lead) {
    if (!lead?.email) {
      throw new Error(
        "Lead email is required for contact acknowledgement email"
      );
    }

    return await this.sendTemplatedEmail({
      to: lead.email,
      templateName: "websiteLeadContactAcknowledgement",
      templateData: this.buildWebsiteLeadTemplateData(lead),
    });
  }

  async sendWebsiteBookNowLeadAcknowledgement(lead) {
    if (!lead?.email) {
      throw new Error(
        "Lead email is required for book now acknowledgement email"
      );
    }

    return await this.sendTemplatedEmail({
      to: lead.email,
      templateName: "websiteLeadBookNowAcknowledgement",
      templateData: this.buildWebsiteLeadTemplateData(lead),
    });
  }

  async sendWebsiteLeadAdminNotification(lead) {
    if (!emailConfig.supportEmail) {
      throw new Error("Support email is not configured for lead notifications");
    }

    return await this.sendTemplatedEmail({
      to: emailConfig.supportEmail,
      templateName: "websiteLeadAdminNotification",
      templateData: this.buildWebsiteLeadTemplateData(lead),
    });
  }

  /**
   * Send credentials email to new team member
   * @param {Object} teamMember - Team member object
   * @param {string} teamMember.email - Team member's email
   * @param {string} teamMember.name - Team member's name
   * @param {string} password - Team member's password
   * @param {string} [loginUrl] - Login URL for the system
   * @returns {Promise} - Email send result
   */
  async sendTeamMemberCredentialsEmail(teamMember, password, loginUrl = null) {
    if (!teamMember || !teamMember.email || !teamMember.name) {
      throw new Error("Invalid team member data provided for credentials email");
    }

    if (!password) {
      throw new Error("Password is required for team member credentials email");
    }

    console.log("Sending team member credentials email to:", {
      email: teamMember.email,
      name: teamMember.name,
    });

    return await this.sendTemplatedEmail({
      to: teamMember.email,
      templateName: "teamMemberCredentials",
      templateData: {
        name: teamMember.name,
        email: teamMember.email,
        password: password,
        loginUrl: loginUrl,
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

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping password reset OTP email for:", user.email);
      return { success: false, message: "Email service not configured" };
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

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping property manager welcome email for:", propertyManager.email);
      return { success: false, message: "Email service not configured" };
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
      !propertyManager.fullName
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
      fullName: propertyManager.fullName,
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: "propertyManagerCredentials",
      templateData: {
        name: propertyManager.fullName,
        companyName: propertyManager.fullName, // Using fullName as company name for Property Managers
        email: propertyManager.email,
        password: password,
        abn: propertyManager.abn || "N/A",
        region: propertyManager.address?.state || "N/A",
        compliance: "Standard",
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
      !propertyManager.fullName
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
      name: propertyManager.fullName,
      companyName: propertyManager.fullName,
      otpLength: otp.length,
      expirationMinutes,
    });

    return await this.sendTemplatedEmail({
      to: propertyManager.email,
      templateName: "propertyManagerPasswordResetOTP",
      templateData: {
        name: propertyManager.fullName,
        companyName: propertyManager.fullName,
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

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping agency welcome email for:", agency.email);
      return { success: false, message: "Email service not configured" };
    }

    console.log("Sending agency welcome email to:", {
      email: agency.email,
      contactPerson: agency.contactPerson,
      companyName: agency.companyName,
    });

    const rawLoginUrl =
      agency.loginUrl ||
      process.env.FRONTEND_URL ||
      "https://crm.rentalease.com.au";
    const loginUrl = rawLoginUrl.endsWith("/login")
      ? rawLoginUrl
      : `${rawLoginUrl.replace(/\/$/, "")}/login`;

    return await this.sendTemplatedEmail({
      to: agency.email,
      templateName: "agencyWelcome",
      templateData: {
        name: agency.contactPerson,
        contactPerson: agency.contactPerson,
        companyName: agency.companyName,
        email: agency.email,
        loginUrl,
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
   * Send payment link email to agency with subscription details
   * @param {Object} options - Email options
   * @param {string} options.email - Agency's email
   * @param {string} options.contactPerson - Agency's contact person name
   * @param {string} options.companyName - Agency's company name
   * @param {number} options.subscriptionAmount - Monthly subscription amount
   * @param {string} options.paymentLinkUrl - Stripe checkout URL
   * @param {string} options.loginPassword - Login password for the agency
   * @param {string} options.loginUrl - Login URL for the CRM
   * @returns {Promise} - Email send result
   */
  async sendAgencyPaymentLinkEmail({
    email,
    contactPerson,
    companyName,
    subscriptionAmount,
    paymentLinkUrl,
    loginPassword,
    loginUrl
  }) {
    if (!email || !contactPerson || !companyName || !subscriptionAmount || !paymentLinkUrl) {
      throw new Error("Required fields missing for payment link email");
    }

    console.log("Sending agency payment link email to:", {
      email,
      contactPerson,
      companyName,
      subscriptionAmount,
      paymentLinkUrl,
    });

    return await this.sendTemplatedEmail({
      to: email,
      templateName: "agencyPaymentLink",
      templateData: {
        name: contactPerson,
        companyName,
        email,
        subscriptionAmount,
        paymentLinkUrl,
        loginPassword,
        loginUrl,
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

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping technician welcome email for:", technician.email);
      return { success: false, message: "Email service not configured" };
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
   * @returns {Promise} - Email send result
   */
  async sendTechnicianWelcomeEmail(technician) {
    if (
      !technician ||
      !technician.email ||
      !technician.fullName
    ) {
      throw new Error("Invalid technician data provided for welcome email");
    }

    // If Resend is not configured, log and return gracefully
    if (!this.resend) {
      console.warn("📧 Email service not configured. Skipping technician welcome email for:", technician.email);
      return { success: false, message: "Email service not configured" };
    }

    console.log("Sending welcome email to technician:", {
      email: technician.email,
      fullName: technician.fullName,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "technicianWelcome",
      templateData: {
        fullName: technician.fullName,
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

  /**
   * Send invoice email to agency
   * @param {Object} invoice - Invoice object
   * @param {Object} agency - Agency object
   * @returns {Promise} - Email send result
   */
  async sendInvoiceEmail(invoice, agency) {
    if (!invoice || !agency || !agency.email) {
      throw new Error(
        "Invalid invoice or agency data provided for invoice email"
      );
    }

    console.log("Sending invoice email to agency:", {
      email: agency.email,
      companyName: agency.companyName,
      invoiceNumber: invoice.invoiceNumber,
    });

    const templateData = {
      companyName: agency.companyName,
      contactPerson: agency.contactPerson,
      invoiceNumber: invoice.invoiceNumber,
      description: invoice.description,
      items: invoice.items,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      totalCost: invoice.totalCost,
      createdAt: invoice.createdAt,
      sentAt: invoice.sentAt,
      notes: invoice.notes,
    };

    return await this.sendTemplatedEmail({
      to: agency.email,
      templateName: "invoiceEmail",
      templateData,
    });
  }

  async sendCompletedJobDocumentsEmail(recipient, payload) {
    if (!recipient?.email) {
      throw new Error("Recipient email is required for completed job documents");
    }

    const {
      propertyAddress,
      jobType,
      invoice,
      reportUrl,
      agencyName,
      propertyManagerName,
    } = payload;

    const subject = `Completed Job Documents - ${jobType} - ${propertyAddress}`;
    const html = `
      <div>
        <h2>Completed Job Documents</h2>
        <p>Hello ${recipient.name || "there"},</p>
        <p>The completed job documents are ready for review.</p>
        <p><strong>Agency:</strong> ${agencyName || "-"}</p>
        <p><strong>Property:</strong> ${propertyAddress || "-"}</p>
        <p><strong>Service:</strong> ${jobType || "-"}</p>
        ${
          propertyManagerName
            ? `<p><strong>Property Manager:</strong> ${propertyManagerName}</p>`
            : ""
        }
        <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
        <p><strong>Invoice Total:</strong> $${Number(
          invoice.totalCost || 0
        ).toFixed(2)}</p>
        ${
          reportUrl
            ? `<p><strong>Inspection Report:</strong> <a href="${reportUrl}">Open report</a></p>`
            : "<p><strong>Inspection Report:</strong> Not available</p>"
        }
      </div>
    `;

    return await this.sendUserEmail({
      from: this.defaultFrom,
      to: recipient.email,
      subject,
      bodyHtml: html,
    });
  }

  /**
   * Send technician credentials email with login information
   * @param {Object} technician - Technician object
   * @param {string} technician.email - Technician's email
   * @param {string} technician.fullName - Technician's full name
   * @param {string} password - Technician's password
   * @param {Object} owner - Owner object (Agency or SuperUser)
   * @param {string} owner.name - Owner's name
   * @param {string} owner.type - Owner type (Agency or SuperUser)
   * @param {string} loginUrl - Login URL for the system
   * @returns {Promise} - Email send result
   */
  async sendTechnicianCredentialsEmail(
    technician,
    password,
    owner,
    loginUrl = null
  ) {
    if (!technician || !technician.email || !technician.fullName) {
      throw new Error("Invalid technician data provided for credentials email");
    }

    if (!password) {
      throw new Error("Password is required for technician credentials email");
    }

    if (!owner || !owner.name || !owner.type) {
      throw new Error(
        "Invalid owner data provided for technician credentials email"
      );
    }

    console.log("Sending technician credentials email:", {
      email: technician.email,
      fullName: technician.fullName,
      ownerName: owner.name,
      ownerType: owner.type,
    });

    return await this.sendTemplatedEmail({
      to: technician.email,
      templateName: "technicianCredentials",
      templateData: {
        fullName: technician.fullName,
        email: technician.email,
        password: password,
        ownerName: owner.name,
        ownerType: owner.type,
        loginUrl: loginUrl,
      },
    });
  }

  /**
   * Send job creation notification email to all stakeholders
   * @param {Object} recipient - Recipient object
   * @param {string} recipient.email - Recipient's email
   * @param {string} recipient.name - Recipient's name
   * @param {string} recipient.type - Recipient type (SuperUser, Agency, PropertyManager, Technician)
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} creator - Creator object
   * @param {Object} assignedTechnician - Assigned technician object (optional)
   * @returns {Promise} - Email send result
   */
  async sendJobCreationNotificationEmail(
    recipient,
    job,
    property,
    creator,
    assignedTechnician = null
  ) {
    if (!recipient || !recipient.email || !recipient.name || !recipient.type) {
      throw new Error(
        "Invalid recipient data provided for job creation notification email"
      );
    }

    if (!job || !property || !creator) {
      throw new Error(
        "Invalid job, property, or creator data provided for job creation notification email"
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

    console.log("Sending job creation notification email:", {
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      jobId: job.job_id,
      jobType: job.jobType,
      propertyAddress: property.address.fullAddress,
    });

    return await this.sendTemplatedEmail({
      to: recipient.email,
      templateName: "jobCreationNotification",
      templateData: {
        recipientName: recipient.name,
        recipientType: recipient.type,
        jobId: job.job_id,
        propertyAddress: property.address.fullAddress,
        jobType: job.jobType,
        dueDate: formattedDueDate,
        priority: job.priority,
        description: job.description || "",
        creatorName: creator.name,
        creatorType: creator.type,
        assignedTechnician: assignedTechnician
          ? assignedTechnician.fullName
          : null,
      },
    });
  }

  /**
   * Send job assignment notification email to all stakeholders
   * @param {Object} recipient - Recipient object
   * @param {string} recipient.email - Recipient's email
   * @param {string} recipient.name - Recipient's name
   * @param {string} recipient.type - Recipient type (SuperUser, Agency, PropertyManager, Technician)
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} assignedTechnician - Assigned technician object
   * @param {Object} assignedBy - User who assigned the job
   * @returns {Promise} - Email send result
   */
  async sendJobAssignmentNotificationEmail(
    recipient,
    job,
    property,
    assignedTechnician,
    assignedBy
  ) {
    if (!recipient || !recipient.email || !recipient.name || !recipient.type) {
      throw new Error(
        "Invalid recipient data provided for job assignment notification email"
      );
    }

    if (!job || !property || !assignedTechnician || !assignedBy) {
      throw new Error(
        "Invalid job, property, assignedTechnician, or assignedBy data provided for job assignment notification email"
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

    console.log("Sending job assignment notification email:", {
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      jobId: job.job_id,
      jobType: job.jobType,
      propertyAddress: property.address.fullAddress,
      assignedTechnician: assignedTechnician.fullName,
    });

    return await this.sendTemplatedEmail({
      to: recipient.email,
      templateName: "jobAssignmentNotification",
      templateData: {
        recipientName: recipient.name,
        recipientType: recipient.type,
        jobId: job.job_id,
        propertyAddress: property.address.fullAddress,
        jobType: job.jobType,
        dueDate: formattedDueDate,
        priority: job.priority,
        assignedTechnician: assignedTechnician.fullName,
        assignedBy: assignedBy.name,
        assignedByType: assignedBy.type,
      },
    });
  }

  /**
   * Send job completion notification email to all stakeholders
   * @param {Object} recipient - Recipient object
   * @param {string} recipient.email - Recipient's email
   * @param {string} recipient.name - Recipient's name
   * @param {string} recipient.type - Recipient type (SuperUser, Agency, PropertyManager, Technician)
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} completedBy - Technician who completed the job
   * @param {string} completionNotes - Completion notes (optional)
   * @param {number} totalCost - Total cost of the job (optional)
   * @returns {Promise} - Email send result
   */
  async sendJobCompletionNotificationEmail(
    recipient,
    job,
    property,
    completedBy,
    completionNotes = null,
    totalCost = null
  ) {
    if (!recipient || !recipient.email || !recipient.name || !recipient.type) {
      throw new Error(
        "Invalid recipient data provided for job completion notification email"
      );
    }

    if (!job || !property || !completedBy) {
      throw new Error(
        "Invalid job, property, or completedBy data provided for job completion notification email"
      );
    }

    // Format the completion date for display
    const formattedCompletionDate = new Date(
      job.completedAt || new Date()
    ).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    console.log("Sending job completion notification email:", {
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      jobId: job.job_id,
      jobType: job.jobType,
      propertyAddress: property.address.fullAddress,
      completedBy: completedBy.fullName,
    });

    return await this.sendTemplatedEmail({
      to: recipient.email,
      templateName: "jobCompletionNotification",
      templateData: {
        recipientName: recipient.name,
        recipientType: recipient.type,
        jobId: job.job_id,
        propertyAddress: property.address.fullAddress,
        jobType: job.jobType,
        completedBy: completedBy.fullName,
        completionDate: formattedCompletionDate,
        completionNotes: completionNotes,
        totalCost: totalCost,
      },
    });
  }

  /**
   * Send email from user's system email address
   * @param {Object} options - Email options  
   * @returns {Promise} - Email send result
   */
  async sendUserEmail({ from, to, cc, bcc, subject, bodyHtml, bodyText, attachments }) {
    try {
      if (!this.resend) {
        console.warn("📧 Email service not configured. Skipping email send.");
        return { id: "mock-email-id", status: "skipped" };
      }

      const formatRecipient = (recipient) => {
        if (typeof recipient === "string") return recipient;
        if (!recipient?.email) return "";
        return recipient.name
          ? `${recipient.name} <${recipient.email}>`
          : recipient.email;
      };

      const resolveSender = (sender) => {
        if (typeof sender === "string" && isValidEmail(sender)) {
          return sender.trim();
        }

        if (sender?.email && isValidEmail(sender.email)) {
          const normalizedEmail = sender.email.trim();
          return sender.name
            ? `${sender.name} <${normalizedEmail}>`
            : normalizedEmail;
        }

        return this.defaultFrom;
      };

      const resolvedTo = await this.resolveRecipientsForDelivery(to);
      const resolvedCc = await this.resolveRecipientsForDelivery(cc);
      const resolvedBcc = await this.resolveRecipientsForDelivery(bcc);

      if (resolvedTo.length === 0) {
        throw new Error("No valid recipient emails could be resolved");
      }

      const emailData = {
        from: resolveSender(from),
        to: resolvedTo.map(formatRecipient).filter(Boolean),
        subject,
        html: bodyHtml || bodyText,
        text: bodyText || this.stripHtml(bodyHtml),
      };

      if (resolvedCc.length > 0) {
        emailData.cc = resolvedCc.map(formatRecipient).filter(Boolean);
      }

      if (resolvedBcc.length > 0) {
        emailData.bcc = resolvedBcc.map(formatRecipient).filter(Boolean);
      }

      if (attachments && attachments.length > 0) {
        emailData.attachments = attachments.map((attachment) => {
          if (attachment.content) {
            return {
              filename: attachment.filename || "attachment",
              content: attachment.content,
              ...(attachment.contentType
                ? { contentType: attachment.contentType }
                : {}),
            };
          }

          return attachment;
        });
      }

      const senderLabel =
        typeof from === "string"
          ? from
          : from?.email || this.defaultFrom;

      console.log(
        `📤 Sending email from ${senderLabel} to ${resolvedTo.length} recipients`
      );
      const result = await this.resend.emails.send(emailData);
      
      console.log("✅ Email sent successfully:", result.id);
      return result;
    } catch (error) {
      console.error("❌ Error sending user email:", error);
      throw error;
    }
  }

  /**
   * Find user by system email address
   * @param {string} email - System email to search for
   * @returns {Promise} - User object with userType
   */
  async findUserBySystemEmail(email) {
    try {
      const normalizedEmail = email.toLowerCase();
      
      // Check all user types
      const checks = [
        { model: SuperUser, type: 'SuperUser' },
        { model: Agency, type: 'Agency' },
        { model: PropertyManager, type: 'PropertyManager' },
        { model: TeamMember, type: 'TeamMember' },
        { model: Technician, type: 'Technician' }
      ];
      
      for (const { model, type } of checks) {
        const user = await model.findOne({ systemEmail: normalizedEmail });
        if (user) {
          return { ...user.toObject(), userType: type };
        }
      }
      
      return null;
    } catch (error) {
      console.error("❌ Error finding user by system email:", error);
      return null;
    }
  }

  /**
   * Check if email address is internal (@rentalease.com.au)
   * @param {string} email - Email address to check
   * @returns {boolean} - True if internal
   */
  isInternalEmail(email) {
    if (!email || typeof email !== 'string') return false;
    return email.toLowerCase().endsWith('@rentalease.com.au');
  }

  /**
   * Check if all recipients are internal
   * @param {Array} recipients - Array of recipient objects
   * @returns {boolean} - True if all recipients are internal
   */
  areAllRecipientsInternal(recipients) {
    if (!Array.isArray(recipients) || recipients.length === 0) return false;
    return recipients.every(recipient => {
      const email = typeof recipient === 'string' ? recipient : recipient.email;
      return this.isInternalEmail(email);
    });
  }

  /**
   * Deliver email internally (no external service needed)
   * Creates email records directly in database
   * @param {Object} emailData - Email data to deliver
   * @returns {Promise} - Delivery result
   */
  async deliverInternalEmail(emailData) {
    try {
      const Email = (await import('../models/Email.js')).default;
      const EmailThread = (await import('../models/EmailThread.js')).default;
      
      console.log('📨 Delivering internal email internally');
      
      const { from, to, cc = [], bcc = [], subject, bodyHtml, bodyText, attachments = [], inReplyTo, references } = emailData;
      
      // Generate a shared conversation ID and unique message IDs for each record
      const conversationId = `internal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const allRecipients = [...to, ...cc, ...bcc];
      const emailRecords = [];
      
      // Create email record for each recipient (inbox)
      for (const recipient of allRecipients) {
        const recipientUser = await this.findUserBySystemEmail(recipient.email);
        if (!recipientUser) {
          console.warn(`⚠️ Recipient user not found for: ${recipient.email}`);
          continue;
        }
        
        // Generate unique messageId for this specific email record
        const uniqueMessageId = `${conversationId}-inbox-${recipientUser._id}`;
        
        const recipientEmail = await Email.create({
          messageId: uniqueMessageId,
          from,
          to: [recipient],
          cc: cc.filter(ccRecipient => ccRecipient.email !== recipient.email),
          bcc: [], // BCC recipients don't see other BCC recipients
          subject,
          bodyHtml,
          bodyText: bodyText || this.stripHtml(bodyHtml),
          attachments,
          folder: 'inbox',
          isRead: false,
          owner: {
            userId: recipientUser._id,
            userType: recipientUser.userType
          },
          timestamp: new Date(),
          resendStatus: 'delivered', // Mark as delivered since it's internal
          inReplyTo: inReplyTo || undefined,
          references: references || []
        });
        
        emailRecords.push(recipientEmail);
      }
      
      // Create email record for sender (sent)
      const senderUser = await this.findUserBySystemEmail(from.email);
      if (senderUser) {
        // Generate unique messageId for sender's record
        const senderMessageId = `${conversationId}-sent-${senderUser._id}`;
        
        const senderEmail = await Email.create({
          messageId: senderMessageId,
          from,
          to,
          cc,
          bcc,
          subject,
          bodyHtml,
          bodyText: bodyText || this.stripHtml(bodyHtml),
          attachments,
          folder: 'sent',
          isRead: true, // Sender has "read" their own sent email
          owner: {
            userId: senderUser._id,
            userType: senderUser.userType
          },
          timestamp: new Date(),
          resendStatus: 'delivered',
          inReplyTo: inReplyTo || undefined,
          references: references || []
        });
        
        emailRecords.push(senderEmail);
      }
      
      // Create or update threads for all users involved
      const threadPromises = emailRecords.map(async (email) => {
        const thread = await EmailThread.findOrCreateThread(email, {
          userId: email.owner.userId,
          userType: email.owner.userType
        });
        
        email.threadId = thread._id;
        await email.save();
        await thread.addEmail(email);
        
        return thread;
      });
      
      await Promise.all(threadPromises);
      
      console.log(`✅ Internal email delivered to ${emailRecords.length} records`);
      
      return {
        id: conversationId,
        status: 'delivered',
        emailRecords,
        recipientCount: allRecipients.length
      };
      
    } catch (error) {
      console.error('❌ Error delivering internal email:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags from content
   * @param {string} html - HTML content
   * @returns {string} - Plain text
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Send compliance job notification email to all stakeholders
   * @param {Object} recipient - Recipient object
   * @param {string} recipient.email - Recipient's email
   * @param {string} recipient.name - Recipient's name
   * @param {string} recipient.type - Recipient type (SuperUser, Agency, PropertyManager, Technician)
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @returns {Promise} - Email send result
   */
  async sendComplianceJobNotificationEmail(recipient, job, property) {
    console.log("📧 sendComplianceJobNotificationEmail called with:", {
      recipient: recipient
        ? {
            email: recipient.email,
            name: recipient.name,
            type: recipient.type,
          }
        : null,
      jobId: job ? job._id : null,
      propertyId: property ? property._id : null,
    });

    if (!recipient || !recipient.email || !recipient.name || !recipient.type) {
      console.error("❌ Invalid recipient data:", recipient);
      throw new Error(
        "Invalid recipient data provided for compliance job notification email"
      );
    }

    if (!job || !property) {
      throw new Error(
        "Invalid job or property data provided for compliance job notification email"
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

    console.log("Sending compliance job notification email:", {
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      recipientType: recipient.type,
      jobId: job.job_id,
      jobType: job.jobType,
      propertyAddress: property.address.fullAddress,
    });

    return await this.sendTemplatedEmail({
      to: recipient.email,
      templateName: "complianceJobNotification",
      templateData: {
        recipientName: recipient.name,
        recipientType: recipient.type,
        jobId: job.job_id,
        propertyAddress: property.address.fullAddress,
        jobType: job.jobType,
        dueDate: formattedDueDate,
        complianceType: job.jobType,
      },
    });
  }

  /**
   * Send property assignment notification email to property manager
   * @param {Object} propertyManager - Property manager object
   * @param {Object} property - Property object
   * @param {Object} assignedBy - User who assigned the property
   * @param {string} role - Assignment role (Primary, Secondary, etc.)
   */
  async sendPropertyAssignmentEmail(propertyManager, property, assignedBy, role = 'Primary') {
    try {
      console.log('📧 Sending property assignment email to:', propertyManager.email);

      const subject = `New Property Assignment - ${property.address.fullAddress}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">New Property Assignment</h1>
          </div>

          <div style="padding: 30px; background-color: white; margin: 20px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${propertyManager.firstName} ${propertyManager.lastName},</h2>

            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You have been assigned to manage a new property. Here are the details:
            </p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Property Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Address:</td>
                  <td style="padding: 8px 0; color: #333;">${property.address.fullAddress}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Type:</td>
                  <td style="padding: 8px 0; color: #333;">${property.propertyType || 'Not specified'}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Assignment Role:</td>
                  <td style="padding: 8px 0; color: #333;">${role}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned By:</td>
                  <td style="padding: 8px 0; color: #333;">${assignedBy.firstName || assignedBy.businessName || 'System'} ${assignedBy.lastName || ''}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666; font-weight: bold;">Assignment Date:</td>
                  <td style="padding: 8px 0; color: #333;">${new Date().toLocaleDateString()}</td>
                </tr>
              </table>
            </div>

            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #1976d2; margin-top: 0;">What's Next?</h4>
              <ul style="color: #666; line-height: 1.6;">
                <li>Review the property details and compliance requirements</li>
                <li>Schedule any necessary inspections</li>
                <li>Update the property status if needed</li>
                <li>Contact the property owner if required</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://app.rentalease.com.au'}/properties/${property._id}"
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white; padding: 12px 30px; text-decoration: none;
                        border-radius: 25px; font-weight: bold; display: inline-block;">
                View Property Details
              </a>
            </div>

            <p style="color: #666; font-size: 14px; text-align: center; margin-top: 30px;">
              If you have any questions about this assignment, please contact your agency administrator.
            </p>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px;">
            <p>© ${new Date().getFullYear()} RentalEase CRM. All rights reserved.</p>
            <p>This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `;

      if (!this.resend) {
        console.warn("📧 Email service not configured. Skipping email send.");
        return { id: "mock-email-id", status: "skipped" };
      }

      const result = await this.resend.emails.send({
        from: this.defaultFrom,
        to: [propertyManager.email],
        subject: subject,
        html: htmlContent,
      });

      console.log('✅ Property assignment email sent successfully:', result.id);
      return result;
    } catch (error) {
      console.error('❌ Error sending property assignment email:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const emailService = new EmailService();
export default emailService;
