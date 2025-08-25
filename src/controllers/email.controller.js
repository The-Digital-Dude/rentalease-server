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
import emailGenerator from "../utils/emailGenerator.js";
import cloudinary from "../config/cloudinary.js";

class EmailController {
  /**
   * Get emails for authenticated user
   * Thinking: Need pagination, filtering, and search to handle large volumes
   */
  async getEmails(req, res) {
    try {
      const { page = 1, limit = 50, folder = 'inbox', unread, starred, search } = req.query;
      const userId = req.user._id;
      const userType = req.userType;
      
      console.log(`📧 Fetching emails for ${userType} ${userId}, folder: ${folder}`);
      
      const result = await Email.getEmailsForUser(userId, userType, {
        folder,
        page: parseInt(page),
        limit: parseInt(limit),
        unread: unread === 'true',
        starred: starred === 'true',
        search
      });
      
      res.json({
        success: true,
        data: result,
        message: `Retrieved ${result.emails.length} emails`
      });
    } catch (error) {
      console.error('❌ Error fetching emails:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch emails'
      });
    }
  }

  /**
   * Get email threads (conversations)
   * Thinking: Threading makes email management much cleaner
   */
  async getThreads(req, res) {
    try {
      const { page = 1, limit = 50, unread, starred, category, search } = req.query;
      const userId = req.user._id;
      const userType = req.userType;
      
      const result = await EmailThread.getThreadsForUser(userId, userType, {
        page: parseInt(page),
        limit: parseInt(limit),
        unread: unread === 'true',
        starred: starred === 'true',
        category,
        search
      });
      
      res.json({
        success: true,
        data: result,
        message: `Retrieved ${result.threads.length} threads`
      });
    } catch (error) {
      console.error('❌ Error fetching threads:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch threads'
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
        'owner.userId': userId,
        'owner.userType': userType
      }).populate('threadId');
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }
      
      // Mark as read automatically when viewing
      if (!email.isRead && email.folder === 'inbox') {
        await email.markAsRead();
      }
      
      res.json({
        success: true,
        data: { email }
      });
    } catch (error) {
      console.error('❌ Error fetching email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch email'
      });
    }
  }

  /**
   * Send new email
   * Thinking: This is the core feature - must handle attachments, threading, etc.
   */
  async sendEmail(req, res) {
    try {
      const { to, cc, bcc, subject, bodyHtml, bodyText } = req.body;
      const userId = req.user.id;
      const userType = req.user.type === 'superUser' ? 'SuperUser' : req.user.type;
      
      // Get actual user from database to access systemEmail
      let user;
      switch (userType) {
        case 'SuperUser':
          user = await SuperUser.findById(userId);
          break;
        case 'Agency':
          user = await Agency.findById(userId);
          break;
        case 'PropertyManager':
          user = await PropertyManager.findById(userId);
          break;
        case 'TeamMember':
          user = await TeamMember.findById(userId);
          break;
        case 'Technician':
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
        user.systemEmail = await emailGenerator.assignSystemEmail(userId, userType);
      }
      
      console.log(`📤 Sending email from ${user.systemEmail}`);
      
      // Prepare sender information
      const from = {
        email: user.systemEmail,
        name: user.name || user.fullName || user.companyName || user.firstName + ' ' + user.lastName,
        userId,
        userType
      };
      
      // Process recipients - ensure they are arrays
      const toRecipients = Array.isArray(to) ? to : [to];
      const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
      const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];
      
      // Handle attachments if any
      let attachments = [];
      if (req.files && req.files.length > 0) {
        console.log(`📎 Processing ${req.files.length} attachments`);
        
        for (const file of req.files) {
          // Upload to Cloudinary
          const result = await cloudinary.uploader.upload(file.path, {
            resource_type: 'auto',
            folder: 'email-attachments',
            public_id: `${Date.now()}-${file.originalname}`
          });
          
          attachments.push({
            id: result.public_id,
            filename: file.originalname,
            contentType: file.mimetype,
            size: file.size,
            cloudinaryUrl: result.secure_url,
            cloudinaryPublicId: result.public_id
          });
        }
      }
      
      // Send via Resend
      const resendResult = await emailService.sendUserEmail({
        from,
        to: toRecipients,
        cc: ccRecipients,
        bcc: bccRecipients,
        subject,
        bodyHtml,
        bodyText: bodyText || this.stripHtml(bodyHtml),
        attachments: attachments.map(att => ({
          filename: att.filename,
          path: att.cloudinaryUrl
        }))
      });
      
      // Create email record in database
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
        folder: 'sent',
        isRead: true,
        owner: { userId, userType },
        resendData: resendResult,
        timestamp: new Date()
      });
      
      // Find or create thread
      const thread = await EmailThread.findOrCreateThread(email, { userId, userType });
      email.threadId = thread._id;
      await email.save();
      
      // Add email to thread
      await thread.addEmail(email);
      
      console.log(`✅ Email sent successfully: ${email._id}`);
      
      res.json({
        success: true,
        data: { email, thread },
        message: 'Email sent successfully'
      });
    } catch (error) {
      console.error('❌ Error sending email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to send email'
      });
    }
  }

  /**
   * Reply to email
   * Thinking: Must maintain thread context
   */
  async replyToEmail(req, res) {
    try {
      const { id } = req.params;
      const { bodyHtml, bodyText, replyAll = false } = req.body;
      const userId = req.user._id;
      const userType = req.userType;
      const user = req.user;
      
      // Get original email
      const originalEmail = await Email.findOne({
        _id: id,
        'owner.userId': userId,
        'owner.userType': userType
      });
      
      if (!originalEmail) {
        return res.status(404).json({
          success: false,
          message: 'Original email not found'
        });
      }
      
      // Prepare reply recipients
      const to = [originalEmail.from];
      const cc = replyAll ? [...originalEmail.to.filter(r => r.email !== user.systemEmail), ...originalEmail.cc] : [];
      
      // Create reply subject
      const subject = originalEmail.subject.startsWith('Re:') 
        ? originalEmail.subject 
        : `Re: ${originalEmail.subject}`;
      
      // Add quoted text to body
      const quotedText = `<br><br><div style="border-left: 2px solid #ccc; padding-left: 10px; color: #666;">
        On ${new Date(originalEmail.timestamp).toLocaleString()}, ${originalEmail.from.name || originalEmail.from.email} wrote:<br>
        ${originalEmail.bodyHtml || originalEmail.bodyText}
      </div>`;
      
      const finalBodyHtml = bodyHtml + quotedText;
      
      // Send the reply using the main sendEmail logic
      req.body = {
        to,
        cc,
        subject,
        bodyHtml: finalBodyHtml,
        bodyText: bodyText || this.stripHtml(bodyHtml)
      };
      
      // Set email threading headers
      req.body.inReplyTo = originalEmail.messageId;
      req.body.references = [...(originalEmail.references || []), originalEmail.messageId];
      
      // Call sendEmail with modified request
      await this.sendEmail(req, res);
    } catch (error) {
      console.error('❌ Error replying to email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to reply to email'
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
        'owner.userId': userId,
        'owner.userType': userType
      });
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
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
        message: `Email marked as ${isRead ? 'read' : 'unread'}`
      });
    } catch (error) {
      console.error('❌ Error updating email read status:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update email status'
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
        'owner.userId': userId,
        'owner.userType': userType
      });
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }
      
      await email.toggleStar();
      
      res.json({
        success: true,
        data: { email },
        message: `Email ${email.isStarred ? 'starred' : 'unstarred'}`
      });
    } catch (error) {
      console.error('❌ Error toggling star:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to toggle star'
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
        'owner.userId': userId,
        'owner.userType': userType
      });
      
      if (!email) {
        return res.status(404).json({
          success: false,
          message: 'Email not found'
        });
      }
      
      if (permanent) {
        // Permanent delete
        await email.remove();
        res.json({
          success: true,
          message: 'Email permanently deleted'
        });
      } else {
        // Soft delete (move to trash)
        await email.softDelete(userId);
        res.json({
          success: true,
          data: { email },
          message: 'Email moved to trash'
        });
      }
    } catch (error) {
      console.error('❌ Error deleting email:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete email'
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
          message: 'Search query is required'
        });
      }
      
      const result = await Email.searchEmails(userId, userType, q, {
        page: parseInt(page),
        limit: parseInt(limit)
      });
      
      res.json({
        success: true,
        data: result,
        message: `Found ${result.totalResults} results for "${q}"`
      });
    } catch (error) {
      console.error('❌ Error searching emails:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to search emails'
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
      const signature = req.headers['svix-signature'] || req.headers['webhook-signature'];
      
      // TODO: Implement signature verification
      // const isValid = await emailService.verifyWebhookSignature(req.body, signature);
      
      const { type, data } = req.body;
      console.log(`📨 Received webhook: ${type}`);
      
      switch (type) {
        case 'email.received':
          await this.processIncomingEmail(data);
          break;
          
        case 'email.delivered':
          await this.updateEmailStatus(data.email_id, 'delivered');
          break;
          
        case 'email.opened':
          await this.updateEmailStatus(data.email_id, 'opened');
          break;
          
        case 'email.bounced':
          await this.handleBouncedEmail(data);
          break;
          
        case 'email.complained':
          await this.handleComplaintEmail(data);
          break;
          
        default:
          console.log(`⚠️ Unhandled webhook type: ${type}`);
      }
      
      res.json({ success: true, received: true });
    } catch (error) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Webhook processing failed'
      });
    }
  }

  /**
   * Process incoming email from webhook
   */
  async processIncomingEmail(data) {
    try {
      const { from, to, subject, html, text, message_id, in_reply_to, references } = data;
      
      console.log(`📥 Processing incoming email from ${from.email} to ${to[0].email}`);
      
      // Find the recipient user
      const recipientEmail = to[0].email.toLowerCase();
      const recipient = await emailService.findUserBySystemEmail(recipientEmail);
      
      if (!recipient) {
        console.warn(`⚠️ No user found for email: ${recipientEmail}`);
        return;
      }
      
      // Create email record
      const email = await Email.create({
        messageId: message_id,
        from: {
          email: from.email,
          name: from.name
        },
        to: [{
          email: recipientEmail,
          name: recipient.name || recipient.fullName || recipient.companyName,
          userId: recipient._id,
          userType: recipient.userType
        }],
        subject,
        bodyHtml: html,
        bodyText: text,
        folder: 'inbox',
        isRead: false,
        owner: {
          userId: recipient._id,
          userType: recipient.userType
        },
        inReplyTo: in_reply_to,
        references: references || [],
        timestamp: new Date()
      });
      
      // Handle threading
      const thread = await EmailThread.findOrCreateThread(email, {
        userId: recipient._id,
        userType: recipient.userType
      });
      
      email.threadId = thread._id;
      await email.save();
      await thread.addEmail(email);
      
      // Send real-time notification via WebSocket
      if (global.io) {
        global.io.to(`user-${recipient._id}`).emit('new_email', {
          email,
          thread
        });
      }
      
      console.log(`✅ Incoming email processed: ${email._id}`);
    } catch (error) {
      console.error('❌ Error processing incoming email:', error);
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
      console.error('❌ Error updating email status:', error);
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
        email.resendStatus = 'bounced';
        email.resendData = { ...email.resendData, bounce_type, bounce_message };
        await email.save();
        
        console.warn(`⚠️ Email bounced: ${email_id}, type: ${bounce_type}`);
        
        // TODO: Notify sender about bounce
      }
    } catch (error) {
      console.error('❌ Error handling bounced email:', error);
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
        email.resendStatus = 'complained';
        email.resendData = { ...email.resendData, complained_at };
        await email.save();
        
        console.warn(`⚠️ Email marked as spam: ${email_id}`);
        
        // TODO: Handle spam complaint (maybe block sender)
      }
    } catch (error) {
      console.error('❌ Error handling complaint:', error);
    }
  }

  /**
   * Helper: Strip HTML tags from text
   */
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }
}

export default new EmailController();