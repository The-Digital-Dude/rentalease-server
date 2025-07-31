import express from "express";
import notificationService from "../services/notification.service.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Helper function to get user info from request
const getUserInfo = (req) => {
  // Check for different user types from authentication middleware
  if (req.superUser) {
    return {
      userType: "SuperUser",
      userId: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      userType: "Agency",
      userId: req.agency.id,
    };
  } else if (req.technician) {
    return {
      userType: "Technician",
      userId: req.technician.id,
    };
  } else if (req.user) {
    // Fallback for direct user object
    // Normalize user type capitalization
    let userType = req.user.userType || req.user.type;

    // Handle different capitalization cases
    if (userType === "superUser" || userType === "SuperUser") {
      userType = "SuperUser";
    } else if (userType === "agency" || userType === "Agency") {
      userType = "Agency";
    } else if (userType === "technician" || userType === "Technician") {
      userType = "Technician";
    }

    console.log(userType, "userType...");

    return {
      userType: userType,
      userId: req.user._id || req.user.id,
    };
  }
  return null;
};

// GET - Get notifications for the authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const {
      status = null,
      limit = 50,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = -1,
    } = req.query;

    const options = {
      status: status || null,
      limit: parseInt(limit),
      skip: parseInt(skip),
      sortBy,
      sortOrder: parseInt(sortOrder),
    };

    console.log(userInfo, "UserInfo");

    const notifications = await notificationService.getNotifications(
      userInfo.userType,
      userInfo.userId,
      options
    );

    res.status(200).json({
      status: "success",
      message: "Notifications retrieved successfully",
      data: {
        notifications,
        pagination: {
          limit: options.limit,
          skip: options.skip,
          total: notifications.length,
        },
      },
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve notifications",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// GET - Get unread count for the authenticated user
router.get("/unread-count", authenticate, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    console.log(userInfo, "userInfo...");
    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const unreadCount = await notificationService.getUnreadCount(
      userInfo.userType,
      userInfo.userId
    );

    res.status(200).json({
      status: "success",
      message: "Unread count retrieved successfully",
      data: {
        unreadCount,
      },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve unread count",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// PATCH - Mark a notification as read
router.patch("/:notificationId/read", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const notification = await notificationService.markAsRead(notificationId);

    res.status(200).json({
      status: "success",
      message: "Notification marked as read",
      data: {
        notification: notification.getSummary(),
      },
    });
  } catch (error) {
    console.error("Mark as read error:", error);

    if (error.message === "Notification not found") {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to mark notification as read",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// PATCH - Mark all notifications as read for the authenticated user
router.patch("/mark-all-read", authenticate, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const result = await notificationService.markAllAsRead(
      userInfo.userType,
      userInfo.userId
    );

    res.status(200).json({
      status: "success",
      message: "All notifications marked as read",
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    console.error("Mark all as read error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to mark notifications as read",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// PATCH - Archive a notification
router.patch("/:notificationId/archive", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const notification = await notificationService.archiveNotification(
      notificationId
    );

    res.status(200).json({
      status: "success",
      message: "Notification archived successfully",
      data: {
        notification: notification.getSummary(),
      },
    });
  } catch (error) {
    console.error("Archive notification error:", error);

    if (error.message === "Notification not found") {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to archive notification",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// DELETE - Delete a notification (soft delete by archiving)
router.delete("/:notificationId", authenticate, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const notification = await notificationService.archiveNotification(
      notificationId
    );

    res.status(200).json({
      status: "success",
      message: "Notification deleted successfully",
      data: {
        notification: notification.getSummary(),
      },
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    if (error.message === "Notification not found") {
      return res.status(404).json({
        status: "error",
        message: "Notification not found",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to delete notification",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// POST - Send test notification (for development/testing)
router.post("/test", authenticate, async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    const { title, message, type = "GENERAL" } = req.body;

    if (!title || !message) {
      return res.status(400).json({
        status: "error",
        message: "Title and message are required",
      });
    }

    const notificationData = {
      type,
      title,
      message,
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      priority: "Medium",
    };

    const result = await notificationService.sendNotification(
      [
        {
          recipientType: userInfo.userType,
          recipientId: userInfo.userId,
        },
      ],
      notificationData
    );

    res.status(200).json({
      status: "success",
      message: "Test notification sent successfully",
      data: {
        result,
      },
    });
  } catch (error) {
    console.error("Send test notification error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send test notification",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

export default router;
