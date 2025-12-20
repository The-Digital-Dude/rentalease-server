import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Models
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import Notification from "../models/Notification.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import TeamMember from "../models/TeamMember.js";
import PropertyManager from "../models/PropertyManager.js";

// Middleware
import { authenticateUserTypes } from "../middleware/auth.middleware.js";

// Services
import websocketService from "../services/websocket.service.js";
import fileUploadService from "../services/fileUpload.service.js";

const router = express.Router();

// Middleware to check if user can access chat features
const chatAccessMiddleware = async (req, res, next) => {
  const { type, id: userId } = req.user;

  // Only Agency, PropertyManager, SuperUser, and TeamMember can access chat
  if (
    !["agency", "property_manager", "super_user", "team_member"].includes(type)
  ) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Chat feature not available for your user type.",
    });
  }

  next();
};

// POST /api/v1/chat/initiate - Agency or PropertyManager initiates new chat session
router.post(
  "/initiate",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { subject, initialMessage, priority = "medium" } = req.body;

      // Only agencies and property managers can initiate chats
      if (!["agency", "property_manager"].includes(userType)) {
        return res.status(403).json({
          success: false,
          message:
            "Only agencies and property managers can initiate chat sessions.",
        });
      }

      // Validate required fields
      if (!initialMessage || initialMessage.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Initial message is required.",
        });
      }

      if (initialMessage.length > 2000) {
        return res.status(400).json({
          success: false,
          message: "Initial message cannot exceed 2000 characters.",
        });
      }

      // Get user details based on type
      let userDetails;
      let displayName;

      if (userType === "agency") {
        const agency = await Agency.findById(userId);
        if (!agency) {
          return res.status(404).json({
            success: false,
            message: "Agency not found.",
          });
        }
        userDetails = {
          userId: agency._id,
          userType: "Agency",
          userName: agency.companyName,
          userEmail: agency.email,
        };
        displayName = agency.companyName;
      } else if (userType === "property_manager") {
        const propertyManager = await PropertyManager.findById(userId);
        if (!propertyManager) {
          return res.status(404).json({
            success: false,
            message: "Property manager not found.",
          });
        }
        userDetails = {
          userId: propertyManager._id,
          userType: "PropertyManager",
          userName: `${propertyManager.firstName} ${propertyManager.lastName}`,
          userEmail: propertyManager.email,
        };
        displayName = `${propertyManager.firstName} ${propertyManager.lastName}`;
      }

      // Check if user has any active chat sessions
      const existingActiveSession = await ChatSession.findOne({
        "initiatedBy.userId": userId,
        status: { $in: ["waiting", "active"] },
      });

      if (existingActiveSession) {
        return res.status(400).json({
          success: false,
          message:
            "You already have an active chat session. Please close it before starting a new one.",
          data: {
            existingSessionId: existingActiveSession._id,
            status: existingActiveSession.status,
          },
        });
      }

      // Create new chat session
      const chatSession = new ChatSession({
        initiatedBy: userDetails,
        subject: subject || "Support Request",
        initialMessage: initialMessage.trim(),
        priority: priority,
        metadata: {
          source: "web",
          userAgent: req.headers["user-agent"],
          ipAddress: req.ip,
        },
      });

      await chatSession.save();

      // Create initial system message
      await ChatMessage.createSystemMessage(
        chatSession._id,
        "session_started",
        `${displayName} started a new chat session.`
      );

      // Create the initial message from user
      const initialChatMessage = new ChatMessage({
        sessionId: chatSession._id,
        sender: userDetails,
        messageType: "text",
        content: {
          text: initialMessage.trim(),
        },
        metadata: {
          deliveryStatus: "delivered",
          clientInfo: {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
            platform: "web",
          },
        },
      });

      await initialChatMessage.save();

      // Get all SuperUsers and active TeamMembers to notify
      // Note: SuperUser doesn't have a status field, so we fetch all SuperUsers
      const [superUsers, teamMembers] = await Promise.all([
        SuperUser.find().select("_id name email"),
        TeamMember.find({ status: "Active" }).select("_id name email"),
      ]);

      // Create notifications for support team
      const allSupportIds = [
        ...superUsers.map((u) => u._id),
        ...teamMembers.map((u) => u._id),
      ];

      if (allSupportIds.length > 0) {
        // Create notifications for SuperUsers
        if (superUsers.length > 0) {
          await Notification.createChatRequestNotification(
            chatSession,
            "SuperUser",
            superUsers.map((u) => u._id)
          );
        }

        // Create notifications for TeamMembers
        if (teamMembers.length > 0) {
          await Notification.createChatRequestNotification(
            chatSession,
            "TeamMember",
            teamMembers.map((u) => u._id)
          );
        }
      }

      // Broadcast to WebSocket clients
      try {
        websocketService.broadcastChatRequest({
          type: "chat_request",
          sessionId: chatSession._id.toString(),
          sessionData: {
            id: chatSession._id.toString(),
            initiatedBy: chatSession.initiatedBy,
            subject: chatSession.subject,
            priority: chatSession.priority,
            createdAt: chatSession.createdAt,
            initialMessage:
              initialMessage.substring(0, 200) +
              (initialMessage.length > 200 ? "..." : ""),
          },
          timestamp: new Date().toISOString(),
        });
        console.log(
          `📡 WebSocket broadcast sent for chat session: ${chatSession._id}`
        );
      } catch (wsError) {
        console.error(
          "❌ Error broadcasting chat request via WebSocket:",
          wsError
        );
        // Don't fail the request if WebSocket broadcast fails
      }

      res.status(201).json({
        success: true,
        message: "Chat session initiated successfully.",
        data: {
          sessionId: chatSession._id,
          status: chatSession.status,
          subject: chatSession.subject,
          createdAt: chatSession.createdAt,
        },
      });
    } catch (error) {
      console.error("Error initiating chat session:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while initiating chat session.",
      });
    }
  }
);

// GET /api/v1/chat/sessions - Get chat sessions (filtered by role)
router.get(
  "/sessions",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { status, limit = 20, page = 1 } = req.query;

      const skip = (page - 1) * limit;
      let query = {};

      // Build query based on user type
      if (userType === "agency" || userType === "property_manager") {
        // Agencies and PropertyManagers can only see their own chat sessions
        query["initiatedBy.userId"] = userId;
      } else if (userType === "super_user") {
        // SuperUsers can see all chat sessions
        // No additional filter needed
      } else if (userType === "team_member") {
        // TeamMembers can only see assigned chats and waiting chats
        query = {
          $or: [{ "assignedTo.userId": userId }, { status: "waiting" }],
        };
      }

      // Add status filter if provided
      if (
        status &&
        ["waiting", "active", "closed", "transferred"].includes(status)
      ) {
        query.status = status;
      }

      // Get sessions with pagination
      const [sessions, totalCount] = await Promise.all([
        ChatSession.find(query)
          .sort({ "metadata.lastActivity": -1, createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit))
          .populate(
            "initiatedBy.userId",
            "companyName contactPerson email firstName lastName"
          )
          .populate("assignedTo.userId", "name email"),
        ChatSession.countDocuments(query),
      ]);

      // Get unread message count for each session
      const sessionsWithUnreadCount = await Promise.all(
        sessions.map(async (session) => {
          const userTypeEnum =
            userType === "agency"
              ? "Agency"
              : userType === "property_manager"
              ? "PropertyManager"
              : userType === "super_user"
              ? "SuperUser"
              : "TeamMember";
          const unreadCount = await ChatMessage.getUnreadCountForUser(
            userId,
            userTypeEnum,
            session._id
          );

          return {
            ...session.toObject(),
            unreadMessageCount: unreadCount,
          };
        })
      );

      res.json({
        success: true,
        data: {
          sessions: sessionsWithUnreadCount,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalCount / limit),
            totalCount: totalCount,
            hasNext: page * limit < totalCount,
            hasPrev: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while fetching chat sessions.",
      });
    }
  }
);

// GET /api/v1/chat/session/:sessionId - Get specific chat session with messages
router.get(
  "/session/:sessionId",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      // Validate sessionId
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      // Get chat session
      const chatSession = await ChatSession.findById(sessionId)
        .populate(
          "initiatedBy.userId",
          "companyName contactPerson email firstName lastName"
        )
        .populate("assignedTo.userId", "name email");

      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found.",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userType === "agency" || userType === "property_manager") {
        hasAccess =
          chatSession.initiatedBy.userId._id.toString() === userId.toString();
      } else if (userType === "super_user") {
        hasAccess = true; // SuperUsers can access all chats
      } else if (userType === "team_member") {
        hasAccess =
          (chatSession.assignedTo.userId &&
            chatSession.assignedTo.userId._id.toString() ===
              userId.toString()) ||
          chatSession.status === "waiting"; // TeamMembers can see waiting chats
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat session.",
        });
      }

      // Get messages for this session
      const messages = await ChatMessage.getMessagesForSession(
        sessionId,
        parseInt(limit),
        parseInt(offset)
      );

      // Mark messages as read by current user
      if (messages.length > 0) {
        const userTypeEnum =
          userType === "agency"
            ? "Agency"
            : userType === "property_manager"
            ? "PropertyManager"
            : userType === "super_user"
            ? "SuperUser"
            : "TeamMember";
        await ChatMessage.markAllAsReadInSession(
          sessionId,
          userId,
          userTypeEnum
        );
      }

      // Get total message count
      const totalMessageCount = await ChatMessage.countDocuments({
        sessionId: sessionId,
        status: "active",
        messageType: { $ne: "typing_start" },
      });

      res.json({
        success: true,
        data: {
          session: chatSession,
          messages: messages,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            totalCount: totalMessageCount,
            hasMore: parseInt(offset) + messages.length < totalMessageCount,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while fetching chat session.",
      });
    }
  }
);

// POST /api/v1/chat/message - Send message in chat session
router.post(
  "/message",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { sessionId, content, messageType = "text" } = req.body;

      // Validate required fields
      if (!sessionId || !content || !content.text) {
        return res.status(400).json({
          success: false,
          message: "Session ID and message content are required.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      // Get chat session
      const chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found.",
        });
      }

      // Check if session is closed
      if (chatSession.status === "closed") {
        return res.status(400).json({
          success: false,
          message: "Cannot send message to a closed chat session.",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userType === "agency" || userType === "property_manager") {
        hasAccess =
          chatSession.initiatedBy.userId.toString() === userId.toString();
      } else if (userType === "super_user" || userType === "team_member") {
        hasAccess =
          (chatSession.assignedTo.userId &&
            chatSession.assignedTo.userId.toString() === userId.toString()) ||
          chatSession.status === "waiting";
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat session.",
        });
      }

      // Get user details
      let senderDetails;
      if (userType === "agency") {
        const agency = await Agency.findById(userId);
        senderDetails = {
          userId: agency._id,
          userType: "Agency",
          userName: agency.companyName,
          userEmail: agency.email,
        };
      } else if (userType === "property_manager") {
        const propertyManager = await PropertyManager.findById(userId);
        senderDetails = {
          userId: propertyManager._id,
          userType: "PropertyManager",
          userName: `${propertyManager.firstName} ${propertyManager.lastName}`,
          userEmail: propertyManager.email,
        };
      } else if (userType === "super_user") {
        const superUser = await SuperUser.findById(userId);
        senderDetails = {
          userId: superUser._id,
          userType: "SuperUser",
          userName: superUser.name,
          userEmail: superUser.email,
        };
      } else if (userType === "team_member") {
        const teamMember = await TeamMember.findById(userId);
        senderDetails = {
          userId: teamMember._id,
          userType: "TeamMember",
          userName: teamMember.name,
          userEmail: teamMember.email || teamMember.systemEmail,
        };
      }

      // Create message
      const chatMessage = new ChatMessage({
        sessionId: chatSession._id,
        sender: senderDetails,
        messageType: messageType,
        content: {
          text: content.text.trim(),
        },
        metadata: {
          deliveryStatus: "delivered",
          clientInfo: {
            userAgent: req.headers["user-agent"],
            ipAddress: req.ip,
            platform: "web",
          },
        },
      });

      await chatMessage.save();

      // Update session activity and message count
      chatSession.metadata.totalMessages += 1;
      await chatSession.updateActivity();

      // Determine recipients for notification
      const recipients = [];

      if (userType === "agency" || userType === "property_manager") {
        // If agency or property manager sent message, notify assigned agent (if any)
        if (chatSession.assignedTo.userId) {
          recipients.push({
            recipientType: chatSession.assignedTo.userType,
            recipientId: chatSession.assignedTo.userId,
          });
        } else {
          // If no agent assigned yet, notify all available support team
          // Note: SuperUser doesn't have a status field, so we fetch all SuperUsers
          const [superUsers, teamMembers] = await Promise.all([
            SuperUser.find().select("_id"),
            TeamMember.find({ status: "Active" }).select("_id"),
          ]);

          recipients.push(
            ...superUsers.map((u) => ({
              recipientType: "SuperUser",
              recipientId: u._id,
            })),
            ...teamMembers.map((u) => ({
              recipientType: "TeamMember",
              recipientId: u._id,
            }))
          );
        }
      } else {
        // If support agent sent message, notify the initiator (agency or property manager)
        recipients.push({
          recipientType: chatSession.initiatedBy.userType,
          recipientId: chatSession.initiatedBy.userId,
        });
      }

      // Create notifications for message recipients
      for (const recipient of recipients) {
        await Notification.createNewMessageNotification(
          chatMessage,
          chatSession,
          recipient.recipientType,
          recipient.recipientId
        );
      }

      // Broadcast message via WebSocket
      websocketService.broadcastChatMessage({
        type: "chat_message",
        sessionId: chatSession._id,
        message: {
          id: chatMessage._id,
          sender: chatMessage.sender,
          content: chatMessage.content,
          messageType: chatMessage.messageType,
          createdAt: chatMessage.createdAt,
        },
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: "Message sent successfully.",
        data: {
          messageId: chatMessage._id,
          createdAt: chatMessage.createdAt,
        },
      });
    } catch (error) {
      console.error("Error sending chat message:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while sending message.",
      });
    }
  }
);

// POST /api/v1/chat/message/attachment - Send message with attachment
router.post(
  "/message/attachment",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  fileUploadService.chatAttachment(),
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { sessionId, text = "" } = req.body;
      const file = req.file;

      // Validate required fields
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          message: "Session ID is required.",
        });
      }

      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Attachment file is required.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      // Get chat session
      const chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) {
        return res.status(400).json({
          success: false,
          message: "Chat session not found.",
        });
      }

      // Check if session is closed
      if (chatSession.status === "closed") {
        return res.status(400).json({
          success: false,
          message: "Cannot send message to a closed chat session.",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userType === "agency" || userType === "property_manager") {
        hasAccess =
          chatSession.initiatedBy.userId.toString() === userId.toString();
      } else if (["super_user", "team_member"].includes(userType)) {
        // Support agents can access any chat
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this chat session.",
        });
      }

      // Upload file to Cloudinary
      let cloudinaryResult;
      try {
        cloudinaryResult = await fileUploadService.uploadToCloudinary(
          file.buffer,
          {
            folder: "chat-attachments",
            resource_type: "auto",
            use_filename: true,
            unique_filename: true,
          }
        );
      } catch (uploadError) {
        console.error("Error uploading file to Cloudinary:", uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload attachment.",
        });
      }

      // Determine message type and attachment type based on MIME type
      let messageType = "file";
      let attachmentType = "document";

      if (file.mimetype.startsWith("image/")) {
        messageType = "image";
        attachmentType = "image";
      } else if (file.mimetype.startsWith("video/")) {
        attachmentType = "video";
      } else if (file.mimetype.startsWith("audio/")) {
        attachmentType = "audio";
      }

      // Map user type to ChatMessage enum format
      const userTypeMap = {
        agency: "Agency",
        super_user: "SuperUser",
        team_member: "TeamMember",
      };

      // Get sender info
      let senderInfo = {
        userId,
        userType: userTypeMap[userType] || userType,
        userName: "",
        userEmail: "",
      };

      if (userType === "agency") {
        const agency = await Agency.findById(userId);
        if (agency) {
          senderInfo.userName = agency.companyName;
          senderInfo.userEmail = agency.email;
        }
      } else if (userType === "property_manager") {
        const propertyManager = await PropertyManager.findById(userId);
        if (propertyManager) {
          senderInfo.userName = `${propertyManager.firstName} ${propertyManager.lastName}`;
          senderInfo.userEmail = propertyManager.email;
        }
      } else if (userType === "super_user") {
        const superUser = await SuperUser.findById(userId);
        if (superUser) {
          senderInfo.userName = superUser.name;
          senderInfo.userEmail = superUser.email;
        }
      } else if (userType === "team_member") {
        const teamMember = await TeamMember.findById(userId);
        if (teamMember) {
          senderInfo.userName = teamMember.name;
          senderInfo.userEmail = teamMember.email;
        }
      }

      // Create chat message with attachment
      const chatMessage = new ChatMessage({
        sessionId: chatSession._id,
        sender: senderInfo,
        messageType,
        content: {
          text: text || `Sent a ${attachmentType}`,
          html: text || `Sent a ${attachmentType}`,
        },
        attachment: {
          type: attachmentType,
          filename: cloudinaryResult.public_id,
          originalName: file.originalname,
          url: cloudinaryResult.secure_url,
          cloudinaryId: cloudinaryResult.public_id,
          size: file.size,
          mimeType: file.mimetype,
        },
      });

      await chatMessage.save();

      // Update session metadata
      chatSession.metadata.lastActivity = new Date();
      chatSession.metadata.totalMessages += 1;
      await chatSession.save();

      // Determine recipients for notifications
      const recipients = [];

      if (userType === "agency" || userType === "property_manager") {
        // If agency or property manager sent message, notify assigned agent (if any)
        if (chatSession.assignedTo.userId) {
          recipients.push({
            recipientType: chatSession.assignedTo.userType,
            recipientId: chatSession.assignedTo.userId,
          });
        } else {
          // If no agent assigned yet, notify all available support team
          // Note: SuperUser doesn't have a status field, so we fetch all SuperUsers
          const [superUsers, teamMembers] = await Promise.all([
            SuperUser.find().select("_id"),
            TeamMember.find({ status: "Active" }).select("_id"),
          ]);

          recipients.push(
            ...superUsers.map((u) => ({
              recipientType: "SuperUser",
              recipientId: u._id,
            })),
            ...teamMembers.map((u) => ({
              recipientType: "TeamMember",
              recipientId: u._id,
            }))
          );
        }
      } else {
        // If support agent sent message, notify the initiator (agency or property manager)
        recipients.push({
          recipientType: chatSession.initiatedBy.userType,
          recipientId: chatSession.initiatedBy.userId,
        });
      }

      // Create notifications for message recipients
      for (const recipient of recipients) {
        await Notification.createNewMessageNotification(
          chatMessage,
          chatSession,
          recipient.recipientType,
          recipient.recipientId
        );
      }

      // Broadcast message via WebSocket
      websocketService.broadcastChatMessage({
        type: "chat_message",
        sessionId: chatSession._id,
        message: {
          id: chatMessage._id,
          sender: chatMessage.sender,
          content: chatMessage.content,
          messageType: chatMessage.messageType,
          attachment: chatMessage.attachment,
          createdAt: chatMessage.createdAt,
        },
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({
        success: true,
        message: "Attachment sent successfully.",
        data: {
          messageId: chatMessage._id,
          attachmentUrl: cloudinaryResult.secure_url,
          createdAt: chatMessage.createdAt,
        },
      });
    } catch (error) {
      console.error("Error sending chat attachment:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while sending attachment.",
      });
    }
  }
);

// PUT /api/v1/chat/session/:sessionId/accept - Accept chat request (SuperUser/TeamMember only)
router.put(
  "/session/:sessionId/accept",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { sessionId } = req.params;

      // Only SuperUser and TeamMember can accept chats
      if (!["super_user", "team_member"].includes(userType)) {
        return res.status(403).json({
          success: false,
          message: "Only support team members can accept chat requests.",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      // Get chat session
      const chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found.",
        });
      }

      // Check if session is in waiting status
      if (chatSession.status !== "waiting") {
        return res.status(400).json({
          success: false,
          message: `Cannot accept chat session. Current status: ${chatSession.status}`,
        });
      }

      // Get support agent details
      let supportAgent;
      if (userType === "super_user") {
        supportAgent = await SuperUser.findById(userId);
      } else {
        supportAgent = await TeamMember.findById(userId);
      }

      if (!supportAgent) {
        return res.status(404).json({
          success: false,
          message: "Support agent not found.",
        });
      }

      // Accept the chat
      await chatSession.acceptChat(supportAgent);

      // Create system message for acceptance
      await ChatMessage.createSystemMessage(
        chatSession._id,
        "session_accepted",
        `${supportAgent.name} has joined the chat and will assist you.`
      );

      // Create notification for initiator (agency or property manager)
      await Notification.createChatAcceptedNotification(
        chatSession,
        supportAgent.name
      );

      // Broadcast acceptance via WebSocket
      websocketService.broadcastChatAccepted({
        type: "chat_accepted",
        sessionId: chatSession._id,
        acceptedBy: {
          id: supportAgent._id,
          name: supportAgent.name,
          userType: userType,
        },
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Chat session accepted successfully.",
        data: {
          sessionId: chatSession._id,
          acceptedBy: supportAgent.name,
          acceptedAt: chatSession.acceptedAt,
        },
      });
    } catch (error) {
      console.error("Error accepting chat session:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while accepting chat session.",
      });
    }
  }
);

// PUT /api/v1/chat/session/:sessionId/close - Close chat session
router.put(
  "/session/:sessionId/close",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  chatAccessMiddleware,
  async (req, res) => {
    try {
      const { id: userId, type: userType } = req.user;
      const { sessionId } = req.params;
      const { reason = "resolved" } = req.body;

      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid session ID.",
        });
      }

      // Get chat session
      const chatSession = await ChatSession.findById(sessionId);
      if (!chatSession) {
        return res.status(404).json({
          success: false,
          message: "Chat session not found.",
        });
      }

      // Check if already closed
      if (chatSession.status === "closed") {
        return res.status(400).json({
          success: false,
          message: "Chat session is already closed.",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userType === "agency" || userType === "property_manager") {
        hasAccess =
          chatSession.initiatedBy.userId.toString() === userId.toString();
      } else if (userType === "super_user") {
        hasAccess = true; // SuperUsers can close any chat
      } else if (userType === "team_member") {
        hasAccess =
          chatSession.assignedTo.userId &&
          chatSession.assignedTo.userId.toString() === userId.toString();
      }

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied to close this chat session.",
        });
      }

      // Get user details for closure
      let closedByUser;
      let closedByName;
      if (userType === "agency") {
        closedByUser = await Agency.findById(userId);
        closedByName = closedByUser.companyName;
      } else if (userType === "property_manager") {
        closedByUser = await PropertyManager.findById(userId);
        closedByName = `${closedByUser.firstName} ${closedByUser.lastName}`;
      } else if (userType === "super_user") {
        closedByUser = await SuperUser.findById(userId);
        closedByName = closedByUser.name;
      } else {
        closedByUser = await TeamMember.findById(userId);
        closedByName = closedByUser.name;
      }

      // Close the chat
      await chatSession.closeChat(closedByUser, reason);

      // Mark all messages in the session as read for all participants
      // This ensures no unread messages remain after session closure
      const allParticipants = [];

      // Add initiator (agency or property manager)
      allParticipants.push({
        userId: chatSession.initiatedBy.userId,
        userType: chatSession.initiatedBy.userType,
      });

      // Add assigned agent if exists
      if (chatSession.assignedTo && chatSession.assignedTo.userId) {
        allParticipants.push({
          userId: chatSession.assignedTo.userId,
          userType: chatSession.assignedTo.userType,
        });
      }

      // Mark all messages as read for each participant
      for (const participant of allParticipants) {
        await ChatMessage.markAllAsReadInSession(
          chatSession._id,
          participant.userId,
          participant.userType
        );
      }

      // Create system message for closure
      await ChatMessage.createSystemMessage(
        chatSession._id,
        "session_closed",
        `Chat session closed by ${closedByName}. Reason: ${reason}`
      );

      // Create notifications for closure
      await Notification.createChatClosedNotification(
        chatSession,
        closedByName,
        reason
      );

      // Broadcast closure via WebSocket
      websocketService.broadcastChatClosed({
        type: "chat_closed",
        sessionId: chatSession._id,
        closedBy: {
          id: closedByUser._id,
          name: closedByName,
          userType: userType,
        },
        reason: reason,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: "Chat session closed successfully.",
        data: {
          sessionId: chatSession._id,
          closedAt: chatSession.closedAt,
          reason: reason,
        },
      });
    } catch (error) {
      console.error("Error closing chat session:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while closing chat session.",
      });
    }
  }
);

// GET /api/v1/chat/stats - Get chat statistics (SuperUser only)
router.get(
  "/stats",
  authenticateUserTypes([
    "agency",
    "property_manager",
    "super_user",
    "team_member",
  ]),
  async (req, res) => {
    try {
      const { type: userType } = req.user;

      // Only SuperUsers can access stats
      if (userType !== "super_user") {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only SuperUsers can view chat statistics.",
        });
      }

      const today = new Date();
      const startOfDay = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() - today.getDay());
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get various statistics
      const [
        totalSessions,
        todaySessions,
        weekSessions,
        monthSessions,
        waitingSessions,
        activeSessions,
        closedSessions,
        avgResponseTime,
        topAgencies,
      ] = await Promise.all([
        ChatSession.countDocuments(),
        ChatSession.countDocuments({ createdAt: { $gte: startOfDay } }),
        ChatSession.countDocuments({ createdAt: { $gte: startOfWeek } }),
        ChatSession.countDocuments({ createdAt: { $gte: startOfMonth } }),
        ChatSession.countDocuments({ status: "waiting" }),
        ChatSession.countDocuments({ status: "active" }),
        ChatSession.countDocuments({ status: "closed" }),
        ChatSession.aggregate([
          {
            $match: {
              "metadata.avgResponseTime": { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              avgResponseTime: { $avg: "$metadata.avgResponseTime" },
            },
          },
        ]),
        ChatSession.aggregate([
          { $group: { _id: "$initiatedBy.userId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "agencies",
              localField: "_id",
              foreignField: "_id",
              as: "agency",
            },
          },
          { $unwind: "$agency" },
          { $project: { companyName: "$agency.companyName", count: 1 } },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalSessions,
            todaySessions,
            weekSessions,
            monthSessions,
          },
          statusBreakdown: {
            waiting: waitingSessions,
            active: activeSessions,
            closed: closedSessions,
          },
          performance: {
            averageResponseTime: avgResponseTime[0]?.avgResponseTime || null,
          },
          topAgencies: topAgencies,
        },
      });
    } catch (error) {
      console.error("Error fetching chat statistics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error while fetching chat statistics.",
      });
    }
  }
);

export default router;
