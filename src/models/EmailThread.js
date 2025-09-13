import mongoose from "mongoose";

const emailThreadSchema = new mongoose.Schema(
  {
    // Thread information
    subject: {
      type: String,
      required: true
    },
    
    // Participants in the thread
    participants: [{
      email: {
        type: String,
        lowercase: true
      },
      name: String,
      userId: mongoose.Schema.Types.ObjectId,
      userType: {
        type: String,
        enum: ["SuperUser", "Agency", "PropertyManager", "TeamMember", "Technician"]
      }
    }],

    // Email references
    emailIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Email"
    }],

    // Thread metadata
    emailCount: {
      type: Number,
      default: 0
    },
    unreadCount: {
      type: Number,
      default: 0,
      index: true
    },
    lastActivity: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastMessage: {
      preview: String,
      from: {
        email: String,
        name: String
      },
      timestamp: Date
    },

    // Thread properties
    hasAttachments: {
      type: Boolean,
      default: false
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
    isPinned: {
      type: Boolean,
      default: false
    },
    isMuted: {
      type: Boolean,
      default: false
    },

    // Labels and categories
    labels: [String],
    category: {
      type: String,
      enum: ["personal", "work", "system", "notification", "other"],
      default: "other"
    },

    // Owner information
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

    // Related entities (optional)
    relatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job"
    },
    relatedProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property"
    },
    relatedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice"
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
emailThreadSchema.index({ "owner.userId": 1, lastActivity: -1 });
emailThreadSchema.index({ "owner.userId": 1, unreadCount: 1 });
emailThreadSchema.index({ "participants.email": 1 });
emailThreadSchema.index({ subject: "text" });

// Method to add email to thread
emailThreadSchema.methods.addEmail = async function (email) {
  // Add email ID if not already present
  if (!this.emailIds.includes(email._id)) {
    this.emailIds.push(email._id);
    this.emailCount += 1;
  }

  // Update last activity
  this.lastActivity = email.timestamp;

  // Update last message preview
  this.lastMessage = {
    preview: email.preview || email.bodyText?.substring(0, 100),
    from: {
      email: email.from.email,
      name: email.from.name
    },
    timestamp: email.timestamp
  };

  // Update unread count if email is unread and in inbox
  if (!email.isRead && email.folder === "inbox") {
    this.unreadCount += 1;
  }

  // Update hasAttachments flag
  if (email.attachments && email.attachments.length > 0) {
    this.hasAttachments = true;
  }

  // Add participants if not already present
  const allParticipants = [email.from, ...email.to, ...(email.cc || [])];
  for (const participant of allParticipants) {
    const exists = this.participants.some(p => p.email === participant.email);
    if (!exists && participant.email) {
      this.participants.push({
        email: participant.email,
        name: participant.name,
        userId: participant.userId,
        userType: participant.userType
      });
    }
  }

  await this.save();
  return this;
};

// Method to mark thread as read
emailThreadSchema.methods.markAsRead = async function () {
  if (this.unreadCount > 0) {
    // Mark all emails in thread as read
    await mongoose.model("Email").updateMany(
      {
        threadId: this._id,
        isRead: false
      },
      { isRead: true }
    );
    
    this.unreadCount = 0;
    await this.save();
  }
  return this;
};

// Method to toggle star
emailThreadSchema.methods.toggleStar = async function () {
  this.isStarred = !this.isStarred;
  
  // Also star/unstar all emails in thread
  await mongoose.model("Email").updateMany(
    { threadId: this._id },
    { isStarred: this.isStarred }
  );
  
  await this.save();
  return this;
};

// Method to soft delete thread
emailThreadSchema.methods.softDelete = async function (userId) {
  this.deletedAt = new Date();
  this.deletedBy = userId;
  
  // Also soft delete all emails in thread
  await mongoose.model("Email").updateMany(
    { threadId: this._id },
    {
      deletedAt: new Date(),
      deletedBy: userId,
      folder: "trash"
    }
  );
  
  await this.save();
  return this;
};

// Static method to get threads for a user
emailThreadSchema.statics.getThreadsForUser = async function (userId, userType, options = {}) {
  const {
    folder = "inbox",
    page = 1,
    limit = 50,
    unread = undefined,
    starred = undefined,
    search = "",
    sortBy = "lastActivity",
    sortOrder = "desc",
    category = undefined
  } = options;

  // First, find email IDs that match the folder and owner
  const Email = mongoose.model("Email");
  const emailsInFolder = await Email.find({
    "owner.userId": userId,
    "owner.userType": userType,
    folder: folder,
    deletedAt: { $exists: false }
  }).select("_id threadId");

  // Get unique thread IDs from these emails
  const threadIds = [...new Set(emailsInFolder.filter(e => e.threadId).map(e => e.threadId))];

  const query = {
    _id: { $in: threadIds },
    "owner.userId": userId,
    "owner.userType": userType,
    deletedAt: { $exists: false }
  };

  if (unread !== undefined) {
    query.unreadCount = unread ? { $gt: 0 } : 0;
  }
  if (starred !== undefined) query.isStarred = starred;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { subject: { $regex: search, $options: "i" } },
      { "participants.email": { $regex: search, $options: "i" } },
      { "participants.name": { $regex: search, $options: "i" } }
    ];
  }

  const sort = {};
  sort[sortBy] = sortOrder === "asc" ? 1 : -1;

  const threads = await this.find(query)
    .sort(sort)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .populate({
      path: "emailIds",
      options: { sort: { timestamp: -1 }, limit: 1 }
    });

  const count = await this.countDocuments(query);

  return {
    threads,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    totalThreads: count,
    unreadThreads: await this.countDocuments({ ...query, unreadCount: { $gt: 0 } })
  };
};

// Static method to find or create thread
emailThreadSchema.statics.findOrCreateThread = async function (email, owner) {
  let thread = null;

  // If email is a reply, find the existing thread
  if (email.inReplyTo) {
    const parentEmail = await mongoose.model("Email").findOne({
      messageId: email.inReplyTo
    });
    
    if (parentEmail && parentEmail.threadId) {
      thread = await this.findById(parentEmail.threadId);
    }
  }

  // If no thread found, check for similar subject
  if (!thread) {
    // Remove Re:, Fwd:, etc. from subject for matching
    const cleanSubject = email.subject
      .replace(/^(Re:|Fwd:|Fw:)\s*/gi, "")
      .trim();
    
    // Look for recent thread with same subject and participants
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7); // Within last 7 days
    
    thread = await this.findOne({
      "owner.userId": owner.userId,
      "owner.userType": owner.userType,
      subject: { $regex: cleanSubject, $options: "i" },
      lastActivity: { $gte: recentDate },
      deletedAt: { $exists: false }
    });
  }

  // Create new thread if none found
  if (!thread) {
    thread = await this.create({
      subject: email.subject,
      participants: [email.from, ...email.to, ...(email.cc || [])],
      emailIds: [],
      owner: owner,
      lastActivity: email.timestamp,
      emailCount: 0,
      unreadCount: 0,
      hasAttachments: email.attachments && email.attachments.length > 0
    });
  }

  return thread;
};

// Update thread statistics
emailThreadSchema.methods.updateStats = async function () {
  const emails = await mongoose.model("Email").find({
    threadId: this._id,
    deletedAt: { $exists: false }
  });

  this.emailCount = emails.length;
  this.unreadCount = emails.filter(e => !e.isRead && e.folder === "inbox").length;
  this.hasAttachments = emails.some(e => e.attachments && e.attachments.length > 0);
  
  if (emails.length > 0) {
    const lastEmail = emails.sort((a, b) => b.timestamp - a.timestamp)[0];
    this.lastActivity = lastEmail.timestamp;
    this.lastMessage = {
      preview: lastEmail.preview || lastEmail.bodyText?.substring(0, 100),
      from: {
        email: lastEmail.from.email,
        name: lastEmail.from.name
      },
      timestamp: lastEmail.timestamp
    };
  }

  await this.save();
  return this;
};

const EmailThread = mongoose.model("EmailThread", emailThreadSchema);

export default EmailThread;