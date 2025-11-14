import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      recipientType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency", "Technician", "PropertyManager", "TeamMember"],
      },
      recipientId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "recipient.recipientType",
      },
    },
    type: {
      type: String,
      required: true,
      enum: [
        "JOB_CREATED",
        "JOB_ASSIGNED",
        "JOB_COMPLETED",
        "COMPLIANCE_DUE",
        "SYSTEM_ALERT",
        "GENERAL",
        "CHAT_REQUEST",
        "NEW_CHAT_MESSAGE",
        "CHAT_ACCEPTED",
        "CHAT_TRANSFERRED",
        "CHAT_CLOSED",
        "QUOTATION_REQUESTED",
        "QUOTATION_RECEIVED",
        "QUOTATION_ACCEPTED",
        "QUOTATION_REJECTED",
        "PROPERTY_ASSIGNED",
        "INSPECTION_REPORT_SUBMITTED",
      ],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      required: true,
      enum: ["Unread", "Read", "Archived"],
      default: "Unread",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent", "Normal"],
      default: "Medium",
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
notificationSchema.index({
  "recipient.recipientType": 1,
  "recipient.recipientId": 1,
});
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for PropertyManager notifications
notificationSchema.index({
  "recipient.recipientType": 1,
  "recipient.recipientId": 1,
  status: 1,
});
notificationSchema.index({ "recipient.recipientType": 1, createdAt: -1 });
notificationSchema.index({ type: 1, "recipient.recipientType": 1, status: 1 });

// Method to mark notification as read
notificationSchema.methods.markAsRead = async function () {
  this.status = "Read";
  this.readAt = new Date();
  return await this.save();
};

// Method to archive notification
notificationSchema.methods.archive = async function () {
  this.status = "Archived";
  return await this.save();
};

// Method to get notification summary
notificationSchema.methods.getSummary = function () {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    status: this.status,
    priority: this.priority,
    createdAt: this.createdAt,
    readAt: this.readAt,
    data: this.data,
  };
};

// Static method to get unread count for a recipient
notificationSchema.statics.getUnreadCount = async function (
  recipientType,
  recipientId
) {
  return await this.countDocuments({
    "recipient.recipientType": recipientType,
    "recipient.recipientId": recipientId,
    status: "Unread",
  });
};

// Static method to get notifications for a recipient
notificationSchema.statics.getNotificationsForRecipient = async function (
  recipientType,
  recipientId,
  options = {}
) {
  const {
    status = null,
    limit = 50,
    skip = 0,
    sortBy = "createdAt",
    sortOrder = -1,
  } = options;

  const query = {
    "recipient.recipientType": recipientType,
    "recipient.recipientId": recipientId,
  };

  if (status) {
    query.status = status;
  }

  return await this.find(query)
    .sort({ [sortBy]: sortOrder })
    .limit(limit)
    .skip(skip);
};

// Static method to create chat request notification for support team
notificationSchema.statics.createChatRequestNotification = async function (
  chatSession,
  recipientType = 'SuperUser', // Can be 'SuperUser' or 'TeamMember'
  recipientIds = []
) {
  const notifications = [];
  
  for (const recipientId of recipientIds) {
    const notification = await this.create({
      recipient: {
        recipientType: recipientType,
        recipientId: recipientId
      },
      type: 'CHAT_REQUEST',
      title: 'New Chat Request',
      message: `${chatSession.initiatedBy.userName} from ${chatSession.initiatedBy.userEmail} has started a new chat session.`,
      data: {
        sessionId: chatSession._id,
        sessionTitle: chatSession.subject,
        agencyName: chatSession.initiatedBy.userName,
        agencyEmail: chatSession.initiatedBy.userEmail,
        priority: chatSession.priority,
        initialMessage: chatSession.initialMessage.substring(0, 200) + (chatSession.initialMessage.length > 200 ? '...' : '')
      },
      priority: chatSession.priority === 'urgent' ? 'Urgent' : 'High'
    });
    notifications.push(notification);
  }
  
  return notifications;
};

// Static method to create new message notification
notificationSchema.statics.createNewMessageNotification = async function (
  chatMessage,
  chatSession,
  recipientType,
  recipientId
) {
  return await this.create({
    recipient: {
      recipientType: recipientType,
      recipientId: recipientId
    },
    type: 'NEW_CHAT_MESSAGE',
    title: 'New Chat Message',
    message: `${chatMessage.sender.userName}: ${chatMessage.content.text ? chatMessage.content.text.substring(0, 100) : 'Sent an attachment'}${chatMessage.content.text && chatMessage.content.text.length > 100 ? '...' : ''}`,
    data: {
      sessionId: chatSession._id,
      messageId: chatMessage._id,
      senderName: chatMessage.sender.userName,
      senderEmail: chatMessage.sender.userEmail,
      messageType: chatMessage.messageType,
      hasAttachment: !!chatMessage.attachment.url
    },
    priority: 'Medium'
  });
};

// Static method to create chat accepted notification
notificationSchema.statics.createChatAcceptedNotification = async function (
  chatSession,
  agentName
) {
  return await this.create({
    recipient: {
      recipientType: 'Agency',
      recipientId: chatSession.initiatedBy.userId
    },
    type: 'CHAT_ACCEPTED',
    title: 'Chat Request Accepted',
    message: `${agentName} has joined your chat and will assist you shortly.`,
    data: {
      sessionId: chatSession._id,
      agentName: agentName,
      acceptedAt: chatSession.acceptedAt
    },
    priority: 'Medium'
  });
};

// Static method to create chat closed notification
notificationSchema.statics.createChatClosedNotification = async function (
  chatSession,
  closedByName,
  closureReason
) {
  const recipients = [];
  
  // Notify agency
  recipients.push({
    recipientType: 'Agency',
    recipientId: chatSession.initiatedBy.userId
  });
  
  // Notify assigned agent if different from who closed it
  if (chatSession.assignedTo.userId && 
      chatSession.assignedTo.userId.toString() !== chatSession.closedBy.userId.toString()) {
    recipients.push({
      recipientType: chatSession.assignedTo.userType,
      recipientId: chatSession.assignedTo.userId
    });
  }
  
  const notifications = [];
  
  for (const recipient of recipients) {
    const notification = await this.create({
      recipient: recipient,
      type: 'CHAT_CLOSED',
      title: 'Chat Session Closed',
      message: `Your chat session has been closed by ${closedByName}. Reason: ${closureReason || 'No reason provided'}.`,
      data: {
        sessionId: chatSession._id,
        closedBy: closedByName,
        closureReason: closureReason,
        closedAt: chatSession.closedAt,
        duration: chatSession.duration
      },
      priority: 'Low'
    });
    notifications.push(notification);
  }
  
  return notifications;
};

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
