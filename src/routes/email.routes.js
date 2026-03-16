/**
 * Email Routes
 * All email-related API endpoints
 */

import express from "express";
import multer from "multer";
import { authenticate } from "../middleware/auth.middleware.js";
import emailController from "../controllers/email.controller.js";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 5 // Max 5 files per email
  },
  fileFilter: (req, file, cb) => {
    // Security: Block potentially dangerous file types
    const blockedTypes = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (blockedTypes.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed for security reasons`));
    }
    
    cb(null, true);
  }
});

// ============================================
// EMAIL OPERATIONS
// ============================================

/**
 * GET /api/v1/emails
 * Get emails for authenticated user
 * Query params: page, limit, folder, unread, starred, search
 */
router.get("/", authenticate, emailController.getEmails);

/**
 * GET /api/v1/emails/threads
 * Get email threads (conversations)
 * Query params: page, limit, unread, starred, category, search
 */
router.get("/threads", authenticate, emailController.getThreads);

/**
 * GET /api/v1/emails/search
 * Search emails
 * Query params: q (search query), page, limit
 */
router.get("/search", authenticate, emailController.searchEmails);

/**
 * GET /api/v1/emails/:id
 * Get single email by ID
 */
router.get("/:id", authenticate, emailController.getEmailById);

/**
 * POST /api/v1/emails/send
 * Send new email
 * Body: to[], cc[], bcc[], subject, bodyHtml, bodyText
 * Files: attachments (multipart/form-data)
 */
router.post(
  "/send",
  authenticate,
  upload.array("attachments", 5),
  emailController.sendEmail
);

/**
 * POST /api/v1/emails/send-general
 * Simple general-purpose send email with optional attachments
 * Body: to (string or array), subject (string), html (string)
 * Files: attachments (multipart/form-data) - optional
 * Can be reused across multiple frontend modules
 */
router.post(
  "/send-general",
  authenticate,
  upload.array("attachments", 5),
  emailController.sendGeneralEmail
);

/**
 * POST /api/v1/emails/draft
 * Save email as draft
 * Body: to[], cc[], bcc[], subject, bodyHtml, bodyText
 * Files: attachments (multipart/form-data)
 */
router.post(
  "/draft",
  authenticate,
  upload.array("attachments", 5),
  emailController.saveDraft
);

/**
 * POST /api/v1/emails/:id/reply
 * Reply to email
 * Body: bodyHtml, bodyText, replyAll (boolean)
 */
router.post(
  "/:id/reply",
  authenticate,
  upload.array("attachments", 5),
  emailController.replyToEmail
);

/**
 * PUT /api/v1/emails/:id/read
 * Mark email as read/unread
 * Body: isRead (boolean)
 */
router.put("/:id/read", authenticate, emailController.markAsRead);

/**
 * PUT /api/v1/emails/:id/star
 * Toggle email star
 */
router.put("/:id/star", authenticate, emailController.toggleStar);

/**
 * DELETE /api/v1/emails/:id
 * Delete email (soft delete by default)
 * Query params: permanent (boolean)
 */
router.delete("/:id", authenticate, emailController.deleteEmail);

/**
 * PUT /api/v1/emails/:id/restore
 * Restore email from trash
 */
router.put("/:id/restore", authenticate, emailController.restoreEmail);

// ============================================
// THREAD OPERATIONS
// ============================================

/**
 * GET /api/v1/emails/threads/:id
 * Get single thread with all emails
 */
router.get("/threads/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userType = req.userType;
    
    const thread = await EmailThread.findOne({
      _id: id,
      "owner.userId": userId,
      "owner.userType": userType
    }).populate({
      path: "emailIds",
      options: { sort: { timestamp: 1 } }
    });
    
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found"
      });
    }
    
    res.json({
      success: true,
      data: { thread }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch thread"
    });
  }
});

/**
 * PUT /api/v1/emails/threads/:id/read
 * Mark entire thread as read
 */
router.put("/threads/:id/read", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userType = req.userType;
    
    const thread = await EmailThread.findOne({
      _id: id,
      "owner.userId": userId,
      "owner.userType": userType
    });
    
    if (!thread) {
      return res.status(404).json({
        success: false,
        message: "Thread not found"
      });
    }
    
    await thread.markAsRead();
    
    res.json({
      success: true,
      data: { thread },
      message: "Thread marked as read"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark thread as read"
    });
  }
});

// ============================================
// WEBHOOK ENDPOINTS (No authentication)
// ============================================

/**
 * POST /api/v1/emails/webhook/resend
 * Handle incoming emails and status updates from Resend
 * This endpoint is called by Resend's webhook system
 */
router.post("/webhook/resend", emailController.handleResendWebhook);

// ============================================
// UTILITY ENDPOINTS
// ============================================

/**
 * GET /api/v1/emails/stats
 * Get email statistics for user
 */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.userType;
    
    const stats = await Email.aggregate([
      {
        $match: {
          "owner.userId": userId,
          "owner.userType": userType,
          deletedAt: { $exists: false }
        }
      },
      {
        $group: {
          _id: "$folder",
          count: { $sum: 1 },
          unread: {
            $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] }
          }
        }
      }
    ]);
    
    const folderStats = stats.reduce((acc, stat) => {
      acc[stat._id] = {
        total: stat.count,
        unread: stat.unread
      };
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        folders: folderStats,
        total: stats.reduce((sum, s) => sum + s.count, 0),
        totalUnread: stats.reduce((sum, s) => sum + s.unread, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch stats"
    });
  }
});

/**
 * POST /api/v1/emails/migrate
 * One-time migration to assign system emails to existing users
 * Only accessible by SuperUser
 */
router.post("/migrate", authenticate, async (req, res) => {
  try {
    // Check if user is SuperUser
    if (req.userType !== "SuperUser") {
      return res.status(403).json({
        success: false,
        message: "Only SuperUsers can run email migration"
      });
    }
    
    const emailGenerator = require("../utils/emailGenerator.js").default;
    const results = await emailGenerator.migrateExistingUsers();
    
    res.json({
      success: true,
      data: results,
      message: "Email migration completed"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Migration failed"
    });
  }
});

export default router;
