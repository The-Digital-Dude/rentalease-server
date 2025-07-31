import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      recipientType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency", "Technician"],
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
      enum: ["Low", "Medium", "High", "Urgent"],
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

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
