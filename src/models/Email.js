import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    // Message identification
    messageId: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmailThread",
      index: true
    },

    // Participants
    from: {
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      name: String,
      userId: mongoose.Schema.Types.ObjectId,
      userType: {
        type: String,
        enum: ["SuperUser", "Agency", "PropertyManager", "TeamMember", "Technician"]
      }
    },
    to: [{
      email: {
        type: String,
        required: true,
        lowercase: true
      },
      name: String,
      userId: mongoose.Schema.Types.ObjectId,
      userType: {
        type: String,
        enum: ["SuperUser", "Agency", "PropertyManager", "TeamMember", "Technician"]
      }
    }],
    cc: [{
      email: String,
      name: String,
      userId: mongoose.Schema.Types.ObjectId,
      userType: String
    }],
    bcc: [{
      email: String,
      name: String,
      userId: mongoose.Schema.Types.ObjectId,
      userType: String
    }],

    // Content
    subject: {
      type: String,
      required: true
    },
    bodyText: String,
    bodyHtml: String,
    preview: {
      type: String,
      maxlength: 200
    },

    // Metadata
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    isStarred: {
      type: Boolean,
      default: false,
      index: true
    },
    isImportant: {
      type: Boolean,
      default: false
    },
    folder: {
      type: String,
      default: "inbox",
      enum: ["inbox", "sent", "drafts", "trash", "spam", "archive"],
      index: true
    },
    labels: [String],
    priority: {
      type: String,
      enum: ["high", "normal", "low"],
      default: "normal"
    },

    // Attachments
    attachments: [{
      id: String,
      filename: String,
      contentType: String,
      size: Number,
      cloudinaryUrl: String,
      cloudinaryPublicId: String
    }],

    // Email threading
    inReplyTo: String,
    references: [String],

    // Owner information (for access control)
    owner: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
      },
      userType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency", "PropertyManager", "TeamMember", "Technician"]
      }
    },

    // Resend specific data
    resendData: mongoose.Schema.Types.Mixed,
    resendStatus: {
      type: String,
      enum: ["sent", "delivered", "opened", "clicked", "bounced", "complained"],
      default: "sent"
    },

    // Soft delete
    deletedAt: Date,
    deletedBy: mongoose.Schema.Types.ObjectId
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
emailSchema.index({ "owner.userId": 1, timestamp: -1 });
emailSchema.index({ "owner.userId": 1, folder: 1, timestamp: -1 });
emailSchema.index({ "from.email": 1 });
emailSchema.index({ "to.email": 1 });
emailSchema.index({ subject: "text", bodyText: "text" }); // Text search
emailSchema.index({ threadId: 1, timestamp: 1 });

// Virtual for full name
emailSchema.virtual("fromFullName").get(function () {
  return this.from.name || this.from.email;
});

// Method to mark as read
emailSchema.methods.markAsRead = async function () {
  if (!this.isRead) {
    this.isRead = true;
    await this.save();
  }
  return this;
};

// Method to toggle star
emailSchema.methods.toggleStar = async function () {
  this.isStarred = !this.isStarred;
  await this.save();
  return this;
};

// Method to move to folder
emailSchema.methods.moveToFolder = async function (folder) {
  const validFolders = ["inbox", "sent", "drafts", "trash", "spam", "archive"];
  if (validFolders.includes(folder)) {
    this.folder = folder;
    await this.save();
  }
  return this;
};

// Method to soft delete
emailSchema.methods.softDelete = async function (userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  this.folder = "trash";
  await this.save();
  return this;
};

// Static method to get emails for a user
emailSchema.statics.getEmailsForUser = async function (userId, userType, options = {}) {
  const {
    folder = "inbox",
    page = 1,
    limit = 50,
    unread = undefined,
    starred = undefined,
    search = "",
    sortBy = "timestamp",
    sortOrder = "desc"
  } = options;

  const query = {
    "owner.userId": userId,
    "owner.userType": userType,
    folder,
    deletedAt: { $exists: false }
  };

  if (unread !== undefined) query.isRead = !unread;
  if (starred !== undefined) query.isStarred = starred;
  if (search) {
    query.$text = { $search: search };
  }

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const emails = await this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate("threadId");

  const count = await this.countDocuments(query);

  return {
    emails,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    totalEmails: count,
    unreadCount: await this.countDocuments({ ...query, isRead: false })
  };
};

// Static method to search emails
emailSchema.statics.searchEmails = async function (userId, userType, searchQuery, options = {}) {
  const { page = 1, limit = 50 } = options;

  const query = {
    "owner.userId": userId,
    "owner.userType": userType,
    deletedAt: { $exists: false },
    $or: [
      { subject: { $regex: searchQuery, $options: "i" } },
      { bodyText: { $regex: searchQuery, $options: "i" } },
      { "from.email": { $regex: searchQuery, $options: "i" } },
      { "from.name": { $regex: searchQuery, $options: "i" } },
      { "to.email": { $regex: searchQuery, $options: "i" } },
      { "to.name": { $regex: searchQuery, $options: "i" } }
    ]
  };

  const emails = await this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const count = await this.countDocuments(query);

  return {
    emails,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    totalResults: count
  };
};

// Generate preview text from body
emailSchema.pre("save", function (next) {
  if (this.bodyText && !this.preview) {
    this.preview = this.bodyText.substring(0, 200).replace(/\s+/g, " ").trim();
    if (this.bodyText.length > 200) {
      this.preview += "...";
    }
  }
  next();
});

const Email = mongoose.model("Email", emailSchema);

export default Email;