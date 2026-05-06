/**
 * Email Controller
 * Handles all email-related operations
 */

import Email from "../models/Email.js";
import EmailThread from "../models/EmailThread.js";
import SuperUser from "../models/SuperUser.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import TeamMember from "../models/TeamMember.js";
import Technician from "../models/Technician.js";
import emailService from "../services/email.service.js";
import fileUploadService from "../services/fileUpload.service.js";
import emailGenerator from "../utils/emailGenerator.js";

class EmailController {
  async uploadEmailAttachments(files = []) {
    const attachments = [];

    for (const file of files) {
      const sanitizedOriginalName = String(file.originalname || "attachment")
        .replace(/[^\w.-]/g, "-");
      const fileName = `${Date.now()}-${sanitizedOriginalName}`;
      const result = await fileUploadService.uploadToStorage(file.buffer, {
        folder: "email-attachments",
        fileName,
        contentType: file.mimetype || "application/octet-stream",
      });

      attachments.push({
        id: result.gcsPath || fileName,
        filename: file.originalname,
        contentType: file.mimetype,
        size: file.size,
        cloudinaryUrl: result.secure_url || result.url,
        cloudinaryPublicId: null,
      });
    }

    return attachments;
  }

  /**
   * Get emails for authenticated user
   * Thinking: Need pagination, filtering, and search to handle large volumes
   */
  async getEmails(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        folder = "inbox",
        unread,
        starred,
        search,
      } = req.query;
      const userId = req.user._id;
      const userType = req.userType;

      console.log(
        `📧 Fetching emails for ${userType} ${userId}, folder: ${folder}`
      );

      const result = await Email.getEmailsForUser(userId, userType, {
        folder,
        page: parseInt(page),
        limit: parseInt(limit),
        unread: unread === "true",
        starred: starred === "true",
        search,
      });

      res.json({
        success: true,
        data: result,
        message: `Retrieved ${result.emails.length} emails`,
      });
    } catch (error) {
      console.error("❌ Error fetching emails:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch emails",
      });
    }
  }

  /**
   * Get email threads (conversations)
   * Thinking: Threading makes email management much cleaner
   */
  async getThreads(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        folder = "inbox",
        unread,
        starred,
        category,
        search,
      } = req.query;
      const userId = req.user._id;
      const userType = req.userType;

      const result = await EmailThread.getThreadsForUser(userId, userType, {
        folder,
        page: parseInt(page),
        limit: parseInt(limit),
        unread: unread === "true",
        starred: starred === "true",
        category,
        search,
      });

      res.json({
        success: true,
        data: result,
        message: `Retrieved ${result.threads.length} threads`,
      });
    } catch (error) {
      console.error("❌ Error fetching threads:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch threads",
      });
    }
  }

  /**
   * Get single email by ID
   */
  async getEmailById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userType = req.userType;

      const email = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
      }).populate("threadId");

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      // Mark as read automatically when viewing
      if (!email.isRead && email.folder === "inbox") {
        await email.markAsRead();
      }

      res.json({
        success: true,
        data: { email },
      });
    } catch (error) {
      console.error("❌ Error fetching email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch email",
      });
    }
  }

  /**
   * Send new email
   * Thinking: This is the core feature - must handle attachments, threading, etc.
   */
  async sendEmail(req, res) {
    try {
      // Parse JSON fields from multipart form data
      const { subject, bodyHtml, bodyText } = req.body;
      let { to, cc, bcc } = req.body;

      // Parse JSON strings if they exist
      if (typeof to === "string") to = JSON.parse(to);
      if (typeof cc === "string") cc = JSON.parse(cc);
      if (typeof bcc === "string") bcc = JSON.parse(bcc);

      const userId = req.user.id;

      // Normalize user type to match model names
      let userType;
      switch (req.user.type) {
        case "superUser":
          userType = "SuperUser";
          break;
        case "agency":
          userType = "Agency";
          break;
        case "propertyManager":
          userType = "PropertyManager";
          break;
        case "teamMember":
          userType = "TeamMember";
          break;
        case "technician":
          userType = "Technician";
          break;
        default:
          userType = req.user.type; // fallback to original
          break;
      }

      // Get actual user from database to access systemEmail
      let user;
      switch (userType) {
        case "SuperUser":
          user = await SuperUser.findById(userId);
          break;
        case "Agency":
          user = await Agency.findById(userId);
          break;
        case "PropertyManager":
          user = await PropertyManager.findById(userId);
          break;
        case "TeamMember":
          user = await TeamMember.findById(userId);
          break;
        case "Technician":
          user = await Technician.findById(userId);
          break;
        default:
          throw new Error(`Unknown user type: ${userType}`);
      }

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Ensure user has system email
      if (!user.systemEmail) {
        // Generate one if they don't have it
        user.systemEmail = await emailGenerator.assignSystemEmail(
          userId,
          userType
        );
      }

      console.log(`📤 Sending email from ${user.systemEmail}`);

      // Prepare sender information
      const from = {
        email: user.systemEmail,
        name:
          user.name ||
          user.fullName ||
          user.companyName ||
          user.firstName + " " + user.lastName,
        userId,
        userType,
      };

      // Process recipients - ensure they are arrays
      const toRecipients = Array.isArray(to) ? to : [to];
      const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
      const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];

      // Handle attachments if any
      let attachments = [];
      if (req.files && req.files.length > 0) {
        console.log(`📎 Processing ${req.files.length} attachments`);
        attachments = await this.uploadEmailAttachments(req.files);
      }

      // Check if all recipients are internal
      const allRecipients = [
        ...toRecipients,
        ...ccRecipients,
        ...bccRecipients,
      ];
      const isInternalOnly =
        emailService.areAllRecipientsInternal(allRecipients);

      let result;

      if (isInternalOnly) {
        console.log("📨 Sending internal email (no external delivery)");

        // Handle internal email delivery
        result = await emailService.deliverInternalEmail({
          from,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject,
          bodyHtml,
          bodyText: bodyText || this.stripHtml(bodyHtml),
          attachments,
        });

        // Return the first email record created (sender's sent copy) for response
        const senderEmailRecord = result.emailRecords.find(
          (record) => record.folder === "sent"
        );

        console.log(
          `✅ Internal email delivered to ${result.recipientCount} recipients`
        );

        res.json({
          success: true,
          data: {
            email: senderEmailRecord,
            messageId: result.id,
            internal: true,
            recipientCount: result.recipientCount,
          },
          message: "Internal email sent successfully",
        });
      } else {
        console.log("📤 Sending external email via Resend");

        // Send via Resend for external recipients
        const resendResult = await emailService.sendUserEmail({
          from,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject,
          bodyHtml,
          bodyText: bodyText || this.stripHtml(bodyHtml),
          attachments: attachments.map((att) => ({
            filename: att.filename,
            path: att.cloudinaryUrl,
          })),
        });

        // Create email record in database (sent folder for sender)
        const email = await Email.create({
          messageId: resendResult.id || `local-${Date.now()}`,
          from,
          to: toRecipients,
          cc: ccRecipients,
          bcc: bccRecipients,
          subject,
          bodyHtml,
          bodyText: bodyText || this.stripHtml(bodyHtml),
          attachments,
          folder: "sent",
          isRead: true,
          owner: { userId, userType },
          resendData: resendResult,
          timestamp: new Date(),
        });

        // Find or create thread
        const thread = await EmailThread.findOrCreateThread(email, {
          userId,
          userType,
        });
        email.threadId = thread._id;
        await email.save();

        // Add email to thread
        await thread.addEmail(email);

        console.log(`✅ External email sent successfully: ${email._id}`);

        res.json({
          success: true,
          data: { email, thread, external: true },
          message: "Email sent successfully",
        });
      }
    } catch (error) {
      console.error("❌ Error sending email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to send email",
      });
    }
  }

  /**
   * Reply to email
   * Handles both internal and external replies
   */
  async replyToEmail(req, res) {
    try {
      const { id } = req.params;
      const { bodyHtml, bodyText, replyAll = false } = req.body;
      const userId = req.user._id || req.user.id;

      // Normalize user type to match model names
      let userType = req.userType || req.user.type;
      switch (userType) {
        case "superUser":
          userType = "SuperUser";
          break;
        case "agency":
          userType = "Agency";
          break;
        case "propertyManager":
          userType = "PropertyManager";
          break;
        case "teamMember":
          userType = "TeamMember";
          break;
        case "technician":
          userType = "Technician";
          break;
        default:
          // Keep as is if already normalized
          break;
      }

      // Get actual user from database to access systemEmail
      let user;
      switch (userType) {
        case "SuperUser":
          user = await SuperUser.findById(userId);
          break;
        case "Agency":
          user = await Agency.findById(userId);
          break;
        case "PropertyManager":
          user = await PropertyManager.findById(userId);
          break;
        case "TeamMember":
          user = await TeamMember.findById(userId);
          break;
        case "Technician":
          user = await Technician.findById(userId);
          break;
        default:
          throw new Error(`Unknown user type: ${userType}`);
      }

      if (!user || !user.systemEmail) {
        return res.status(400).json({
          success: false,
          message: "User system email not found",
        });
      }

      // Get original email
      const originalEmail = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
      });

      if (!originalEmail) {
        return res.status(404).json({
          success: false,
          message: "Original email not found",
        });
      }

      // Prepare sender information
      const from = {
        email: user.systemEmail,
        name:
          user.name ||
          user.fullName ||
          user.companyName ||
          user.firstName + " " + user.lastName,
        userId,
        userType,
      };

      // Prepare reply recipients
      const to = [originalEmail.from];
      const cc = replyAll
        ? [
            ...originalEmail.to.filter((r) => r.email !== user.systemEmail),
            ...(originalEmail.cc || []).filter(
              (r) => r.email !== user.systemEmail
            ),
          ]
        : [];

      // Create reply subject
      const subject = originalEmail.subject.startsWith("Re:")
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`;

      // Add quoted text to body
      const quotedText = `<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; color: #666;">
        On ${new Date(originalEmail.timestamp).toLocaleString()}, ${
        originalEmail.from.name || originalEmail.from.email
      } wrote:<br>
        ${originalEmail.bodyHtml || originalEmail.bodyText}
      </div>`;

      const finalBodyHtml = bodyHtml + quotedText;

      // Handle attachments if any
      let attachments = [];
      if (req.files && req.files.length > 0) {
        console.log(`📎 Processing ${req.files.length} reply attachments`);
        attachments = await this.uploadEmailAttachments(req.files);
      }

      // Check if all recipients are internal
      const allRecipients = [...to, ...cc];
      const isInternalOnly =
        emailService.areAllRecipientsInternal(allRecipients);

      if (isInternalOnly) {
        console.log("📨 Sending internal reply");

        // Handle internal email reply
        const result = await emailService.deliverInternalEmail({
          from,
          to,
          cc,
          bcc: [],
          subject,
          bodyHtml: finalBodyHtml,
          bodyText: bodyText || this.stripHtml(finalBodyHtml),
          attachments,
          inReplyTo: originalEmail.messageId,
          references: [
            ...(originalEmail.references || []),
            originalEmail.messageId,
          ],
        });

        // Update the email records with threading information
        for (const emailRecord of result.emailRecords) {
          emailRecord.inReplyTo = originalEmail.messageId;
          emailRecord.references = [
            ...(originalEmail.references || []),
            originalEmail.messageId,
          ];
          await emailRecord.save();
        }

        const senderEmailRecord = result.emailRecords.find(
          (record) => record.folder === "sent"
        );

        console.log(
          `✅ Internal reply delivered to ${result.recipientCount} recipients`
        );

        res.json({
          success: true,
          data: {
            email: senderEmailRecord,
            messageId: result.id,
            internal: true,
            recipientCount: result.recipientCount,
          },
          message: "Reply sent successfully",
        });
      } else {
        console.log("📤 Sending external reply via Resend");

        // Send external reply via Resend
        const resendResult = await emailService.sendUserEmail({
          from,
          to,
          cc,
          subject,
          bodyHtml: finalBodyHtml,
          bodyText: bodyText || this.stripHtml(finalBodyHtml),
          attachments: attachments.map((att) => ({
            filename: att.filename,
            path: att.cloudinaryUrl,
          })),
        });

        // Create email record for sender
        const email = await Email.create({
          messageId: resendResult.id || `reply-${Date.now()}`,
          from,
          to,
          cc,
          subject,
          bodyHtml: finalBodyHtml,
          bodyText: bodyText || this.stripHtml(finalBodyHtml),
          attachments,
          folder: "sent",
          isRead: true,
          owner: { userId, userType },
          resendData: resendResult,
          inReplyTo: originalEmail.messageId,
          references: [
            ...(originalEmail.references || []),
            originalEmail.messageId,
          ],
          timestamp: new Date(),
        });

        // Find or create thread (should use existing thread)
        const thread = await EmailThread.findOrCreateThread(email, {
          userId,
          userType,
        });
        email.threadId = thread._id;
        await email.save();

        // Add email to thread
        await thread.addEmail(email);

        console.log(`✅ External reply sent successfully: ${email._id}`);

        res.json({
          success: true,
          data: { email, thread, external: true },
          message: "Reply sent successfully",
        });
      }
    } catch (error) {
      console.error("❌ Error replying to email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to reply to email",
      });
    }
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const { isRead = true } = req.body;
      const userId = req.user._id;
      const userType = req.userType;

      const email = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      email.isRead = isRead;
      await email.save();

      // Update thread unread count
      if (email.threadId) {
        const thread = await EmailThread.findById(email.threadId);
        if (thread) {
          await thread.updateStats();
        }
      }

      res.json({
        success: true,
        data: { email },
        message: `Email marked as ${isRead ? "read" : "unread"}`,
      });
    } catch (error) {
      console.error("❌ Error updating email read status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to update email status",
      });
    }
  }

  /**
   * Save email as draft
   */
  async saveDraft(req, res) {
    try {
      const { to, cc, bcc, subject, bodyHtml, bodyText } = req.body;

      // Get user info from middleware (set by authenticate middleware)
      const userId = req.user.id || req.user._id; // JWT has 'id' field
      let userType = req.user.type;

      // Normalize user type to match model names
      switch (req.user.type) {
        case "superUser":
          userType = "SuperUser";
          break;
        case "agency":
          userType = "Agency";
          break;
        case "propertyManager":
          userType = "PropertyManager";
          break;
        case "technician":
          userType = "Technician";
          break;
        default:
          userType = req.user.type;
      }

      console.log(`💾 Saving draft for ${userType} ${userId}`);

      // Handle file attachments from multipart
      const attachments = [];
      if (req.files && req.files.length > 0) {
        // Process file uploads with the shared storage service
        for (const file of req.files) {
          try {
            const [uploadedAttachment] = await this.uploadEmailAttachments([file]);
            attachments.push(uploadedAttachment);
          } catch (uploadError) {
            console.error("❌ Attachment upload failed:", uploadError);
            // Continue with other attachments
          }
        }
      }

      // Parse recipients
      const parsedTo = typeof to === "string" ? JSON.parse(to) : to;
      const parsedCc = cc ? (typeof cc === "string" ? JSON.parse(cc) : cc) : [];
      const parsedBcc = bcc
        ? typeof bcc === "string"
          ? JSON.parse(bcc)
          : bcc
        : [];

      // Create draft email record
      const draftEmail = new Email({
        messageId: `draft-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        from: {
          email: req.user.email,
          name: req.user.name || req.user.email,
          userId: userId, // Use the extracted userId
          userType: userType,
        },
        to: parsedTo,
        cc: parsedCc,
        bcc: parsedBcc,
        subject: subject || "(No Subject)",
        bodyHtml,
        bodyText:
          bodyText || (bodyHtml ? bodyHtml.replace(/<[^>]*>/g, "").trim() : ""),
        attachments,
        folder: "drafts",
        isRead: false,
        owner: { userId, userType },
        timestamp: new Date(),
      });

      await draftEmail.save();

      res.json({
        success: true,
        data: { email: draftEmail },
        message: "Draft saved successfully",
      });
    } catch (error) {
      console.error("❌ Error saving draft:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to save draft",
      });
    }
  }

  /**
   * Toggle email star
   */
  async toggleStar(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userType = req.userType;

      const email = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      await email.toggleStar();

      res.json({
        success: true,
        data: { email },
        message: `Email ${email.isStarred ? "starred" : "unstarred"}`,
      });
    } catch (error) {
      console.error("❌ Error toggling star:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to toggle star",
      });
    }
  }

  /**
   * Delete email (move to trash)
   */
  async deleteEmail(req, res) {
    try {
      const { id } = req.params;
      const { permanent = false } = req.query;
      const userId = req.user._id;
      const userType = req.userType;

      const email = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found",
        });
      }

      if (permanent) {
        // Permanent delete
        await email.remove();
        res.json({
          success: true,
          message: "Email permanently deleted",
        });
      } else {
        // Soft delete (move to trash)
        await email.softDelete(userId);
        res.json({
          success: true,
          data: { email },
          message: "Email moved to trash",
        });
      }
    } catch (error) {
      console.error("❌ Error deleting email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete email",
      });
    }
  }

  /**
   * Restore email from trash
   */
  async restoreEmail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      const userType = req.userType;

      const email = await Email.findOne({
        _id: id,
        "owner.userId": userId,
        "owner.userType": userType,
        folder: "trash",
      });

      if (!email) {
        return res.status(404).json({
          success: false,
          message: "Email not found in trash",
        });
      }

      // Restore to sent folder for our transactional email system
      email.folder = "sent";
      email.deletedAt = undefined;
      email.deletedBy = undefined;
      await email.save();

      res.json({
        success: true,
        data: { email },
        message: "Email restored to sent folder",
      });
    } catch (error) {
      console.error("❌ Error restoring email:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to restore email",
      });
    }
  }

  /**
   * Search emails
   */
  async searchEmails(req, res) {
    try {
      const { q, page = 1, limit = 50 } = req.query;
      const userId = req.user._id;
      const userType = req.userType;

      if (!q) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      const result = await Email.searchEmails(userId, userType, q, {
        page: parseInt(page),
        limit: parseInt(limit),
      });

      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalResults} results for "${q}"`,
      });
    } catch (error) {
      console.error("❌ Error searching emails:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to search emails",
      });
    }
  }

  /**
   * Handle Resend webhook for incoming emails
   * Thinking: This is how we receive emails sent to @rentalease.com.au
   */
  async handleResendWebhook(req, res) {
    try {
      // Verify webhook signature (security)
      const signature =
        req.headers["svix-signature"] || req.headers["webhook-signature"];

      // TODO: Implement signature verification
      // const isValid = await emailService.verifyWebhookSignature(req.body, signature);

      const { type, data } = req.body;
      console.log(`📨 Received webhook: ${type}`);

      switch (type) {
        case "email.received":
          await this.processIncomingEmail(data);
          break;

        case "email.delivered":
          await this.updateEmailStatus(data.email_id, "delivered");
          break;

        case "email.opened":
          await this.updateEmailStatus(data.email_id, "opened");
          break;

        case "email.bounced":
          await this.handleBouncedEmail(data);
          break;

        case "email.complained":
          await this.handleComplaintEmail(data);
          break;

        default:
          console.log(`⚠️ Unhandled webhook type: ${type}`);
      }

      res.json({ success: true, received: true });
    } catch (error) {
      console.error("❌ Webhook error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Webhook processing failed",
      });
    }
  }

  /**
   * Process incoming email from webhook
   */
  async processIncomingEmail(data) {
    try {
      const {
        from,
        to,
        subject,
        html,
        text,
        message_id,
        in_reply_to,
        references,
      } = data;

      console.log(
        `📥 Processing incoming email from ${from.email} to ${to[0].email}`
      );

      // Find the recipient user
      const recipientEmail = to[0].email.toLowerCase();
      const recipient = await emailService.findUserBySystemEmail(
        recipientEmail
      );

      if (!recipient) {
        console.warn(`⚠️ No user found for email: ${recipientEmail}`);
        return;
      }

      // Create email record
      const email = await Email.create({
        messageId: message_id,
        from: {
          email: from.email,
          name: from.name,
        },
        to: [
          {
            email: recipientEmail,
            name: recipient.name || recipient.fullName || recipient.companyName,
            userId: recipient._id,
            userType: recipient.userType,
          },
        ],
        subject,
        bodyHtml: html,
        bodyText: text,
        folder: "inbox",
        isRead: false,
        owner: {
          userId: recipient._id,
          userType: recipient.userType,
        },
        inReplyTo: in_reply_to,
        references: references || [],
        timestamp: new Date(),
      });

      // Handle threading
      const thread = await EmailThread.findOrCreateThread(email, {
        userId: recipient._id,
        userType: recipient.userType,
      });

      email.threadId = thread._id;
      await email.save();
      await thread.addEmail(email);

      // Send real-time notification via WebSocket
      if (global.io) {
        global.io.to(`user-${recipient._id}`).emit("new_email", {
          email,
          thread,
        });
      }

      console.log(`✅ Incoming email processed: ${email._id}`);
    } catch (error) {
      console.error("❌ Error processing incoming email:", error);
      throw error;
    }
  }

  /**
   * Update email status from webhook
   */
  async updateEmailStatus(messageId, status) {
    try {
      const email = await Email.findOne({ messageId });
      if (email) {
        email.resendStatus = status;
        await email.save();
        console.log(`✅ Updated email ${messageId} status to ${status}`);
      }
    } catch (error) {
      console.error("❌ Error updating email status:", error);
    }
  }

  /**
   * Handle bounced email
   */
  async handleBouncedEmail(data) {
    try {
      const { email_id, bounce_type, bounce_message } = data;

      const email = await Email.findOne({ messageId: email_id });
      if (email) {
        email.resendStatus = "bounced";
        email.resendData = { ...email.resendData, bounce_type, bounce_message };
        await email.save();

        console.warn(`⚠️ Email bounced: ${email_id}, type: ${bounce_type}`);

        // TODO: Notify sender about bounce
      }
    } catch (error) {
      console.error("❌ Error handling bounced email:", error);
    }
  }

  /**
   * Handle complaint (spam report)
   */
  async handleComplaintEmail(data) {
    try {
      const { email_id, complained_at } = data;

      const email = await Email.findOne({ messageId: email_id });
      if (email) {
        email.resendStatus = "complained";
        email.resendData = { ...email.resendData, complained_at };
        await email.save();

        console.warn(`⚠️ Email marked as spam: ${email_id}`);

        // TODO: Handle spam complaint (maybe block sender)
      }
    } catch (error) {
      console.error("❌ Error handling complaint:", error);
    }
  }

  /**
   * Helper: Strip HTML tags from text
   */
  stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>/g, "").trim();
  }

  /**
   * Simple general-purpose send email function
   * Can be reused across multiple frontend modules
   * Takes email recipient(s) as part of the request body
   * Supports optional attachments
   */
  async sendGeneralEmail(req, res) {
    try {
      console.log("📧 Received send-general request");
      console.log("Files:", req.files ? req.files.length : 0);

      let { to, cc, subject, html } = req.body;

      // Parse JSON fields from multipart form data (when attachments are sent)
      if (typeof to === "string") {
        try {
          to = JSON.parse(to);
        } catch (e) {
          // If parsing fails, treat as single email string
          // It's already a string, so we can use it as-is
        }
      }
      if (typeof cc === "string") {
        try {
          cc = JSON.parse(cc);
        } catch (e) {
          // Keep single cc string as-is if it was not JSON encoded
        }
      }

      // Validation
      const errors = {};

      if (!subject || subject.trim().length === 0) {
        errors.subject = "Subject is required";
      }

      if (!html || html.trim().length === 0) {
        errors.html = "Email body (html) is required";
      }

      if (!to) {
        errors.to = "Recipient email(s) required";
      } else {
        // Handle both single email string and array of emails
        const emails = Array.isArray(to) ? to : [to];

        if (emails.length === 0) {
          errors.to = "At least one recipient email is required";
        } else {
          // Validate email format
          const emailRegex = /^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/;
          const invalidEmails = emails.filter(
            (email) => !emailRegex.test(email)
          );
          if (invalidEmails.length > 0) {
            errors.to = `Invalid email format: ${invalidEmails.join(", ")}`;
          }
        }
      }

      if (cc) {
        const ccEmails = Array.isArray(cc) ? cc : [cc];
        const emailRegex = /^\w+([-.]?\w+)*@\w+([-.]?\w+)*(\.\w{2,3})+$/;
        const invalidCcEmails = ccEmails.filter(
          (email) => email && !emailRegex.test(email)
        );
        if (invalidCcEmails.length > 0) {
          errors.cc = `Invalid CC email format: ${invalidCcEmails.join(", ")}`;
        }
      }

      if (Object.keys(errors).length > 0) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed",
          details: errors,
        });
      }

      // Authorization check - only superuser and team member can access
      if (!req.superUser && !req.teamMember) {
        return res.status(403).json({
          status: "error",
          message:
            "Unauthorized - only superusers and team members can send general emails",
        });
      }

      // Normalize to array for consistent handling
      const recipients = Array.isArray(to) ? to : [to];
      const ccRecipients = cc
        ? Array.isArray(cc)
          ? cc.filter(Boolean)
          : [cc].filter(Boolean)
        : [];

      // Handle attachments if any
      let attachments = [];
      if (req.files && req.files.length > 0) {
        console.log(
          `📎 Processing ${req.files.length} attachments for general email`
        );

        try {
          attachments = await this.uploadEmailAttachments(req.files);

          for (const attachment of attachments) {
            console.log(
              `Uploaded file: ${attachment.filename} (${attachment.size} bytes)`
            );
            console.log(`✅ File uploaded: ${attachment.cloudinaryUrl}`);
          }
        } catch (uploadError) {
          console.error("❌ Error uploading attachments:", uploadError);
          throw new Error(
            `Failed to upload attachments: ${uploadError.message}`
          );
        }
      }

      // Prepare email data
      const emailData = {
        from: emailService.defaultFrom,
        to: recipients,
        cc: ccRecipients,
        subject: subject.trim(),
        html: html.trim(), // Ensure HTML is trimmed
      };

      // Add attachments if any
      if (attachments.length > 0) {
        emailData.attachments = attachments.map((attachment) => ({
          filename: attachment.filename,
          path: attachment.cloudinaryUrl,
        }));
      }

      // Log email data before sending
      console.log("Sending email with data:", JSON.stringify(emailData, null, 2));

      // Send email using Resend
      const resendResult = await emailService.resend.emails.send(emailData);

      // Log resend result
      console.log("Resend response:", JSON.stringify(resendResult, null, 2));

      // Check for errors returned by Resend itself
      if (resendResult.error) {
        console.error("❌ Resend API error:", resendResult.error);
        return res.status(resendResult.error.statusCode || 500).json({
          status: "error",
          message: "Failed to send email via Resend",
          details: resendResult.error.message,
        });
      }

      res.json({
        status: "success",
        message: "Email sent successfully",
        data: {
          recipients: recipients,
          cc: ccRecipients,
          subject: subject.trim(),
          attachmentCount: attachments.length,
          resendMessageId: resendResult.id,
        },
      });
    } catch (error) {
      console.error("❌ Send general email error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        status: "error",
        message: "Failed to send email",
        details: error.message,
        error: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    }
  }
}

export default new EmailController();
