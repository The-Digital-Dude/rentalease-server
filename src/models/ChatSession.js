import mongoose from 'mongoose';

const chatSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    default: () => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  
  // Who initiated the chat (Agency)
  initiatedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Agency',
      required: true
    },
    userType: {
      type: String,
      enum: ['Agency'],
      default: 'Agency',
      required: true
    },
    userName: {
      type: String,
      required: true
    },
    userEmail: {
      type: String,
      required: true
    }
  },
  
  // Who is handling the chat (SuperUser or TeamMember)
  assignedTo: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'assignedTo.userType',
      default: null
    },
    userType: {
      type: String,
      enum: ['SuperUser', 'TeamMember'],
      default: null
    },
    userName: {
      type: String,
      default: null
    },
    userEmail: {
      type: String,
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    }
  },
  
  // Session status
  status: {
    type: String,
    enum: ['waiting', 'active', 'closed', 'transferred'],
    default: 'waiting'
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // Chat subject/title (optional)
  subject: {
    type: String,
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters'],
    default: 'Support Request'
  },
  
  // Initial message from agency
  initialMessage: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Initial message cannot exceed 2000 characters']
  },
  
  // Session metadata
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile'],
      default: 'web'
    },
    userAgent: String,
    ipAddress: String,
    
    // Chat statistics
    totalMessages: {
      type: Number,
      default: 1 // Initial message counts as 1
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    firstResponseTime: {
      type: Number, // in seconds
      default: null
    },
    avgResponseTime: {
      type: Number, // in seconds
      default: null
    }
  },
  
  // Session timing
  startedAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  
  // Closure information
  closedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    userType: {
      type: String,
      enum: ['Agency', 'SuperUser', 'TeamMember', 'System'],
      default: null
    }
  },
  closureReason: {
    type: String,
    enum: ['resolved', 'abandoned', 'transferred', 'timeout', 'user_closed'],
    default: null
  },
  
  // Transfer history (if chat was transferred)
  transferHistory: [{
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    fromUserType: {
      type: String,
      enum: ['SuperUser', 'TeamMember'],
      required: true
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    toUserType: {
      type: String,
      enum: ['SuperUser', 'TeamMember'],
      required: true
    },
    transferReason: {
      type: String,
      maxlength: [500, 'Transfer reason cannot exceed 500 characters']
    },
    transferredAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Satisfaction rating (optional)
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5,
      default: null
    },
    feedback: {
      type: String,
      maxlength: [1000, 'Feedback cannot exceed 1000 characters'],
      default: null
    },
    ratedAt: {
      type: Date,
      default: null
    }
  },
  
  // Tags for categorization
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
chatSessionSchema.index({ 'initiatedBy.userId': 1, status: 1 });
chatSessionSchema.index({ 'assignedTo.userId': 1, status: 1 });
chatSessionSchema.index({ status: 1, createdAt: -1 });
chatSessionSchema.index({ sessionId: 1 });
chatSessionSchema.index({ 'metadata.lastActivity': 1 });

// Virtual for session duration
chatSessionSchema.virtual('duration').get(function() {
  if (this.closedAt && this.startedAt) {
    return Math.round((this.closedAt - this.startedAt) / 1000); // in seconds
  }
  return null;
});

// Virtual for time since last activity
chatSessionSchema.virtual('timeSinceLastActivity').get(function() {
  return Math.round((Date.now() - this.metadata.lastActivity) / 1000); // in seconds
});

// Pre-save middleware to update lastActivity
chatSessionSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.metadata.lastActivity = new Date();
  }
  next();
});

// Method to accept chat session
chatSessionSchema.methods.acceptChat = async function(supportAgent) {
  this.assignedTo = {
    userId: supportAgent._id,
    userType: supportAgent.constructor.modelName,
    userName: supportAgent.name,
    userEmail: supportAgent.email || supportAgent.systemEmail,
    assignedAt: new Date()
  };
  this.status = 'active';
  this.acceptedAt = new Date();
  return await this.save();
};

// Method to close chat session
chatSessionSchema.methods.closeChat = async function(closedBy, reason = 'resolved') {
  this.status = 'closed';
  this.closedAt = new Date();
  this.closedBy = {
    userId: closedBy._id,
    userType: closedBy.constructor.modelName
  };
  this.closureReason = reason;
  return await this.save();
};

// Method to transfer chat session
chatSessionSchema.methods.transferChat = async function(fromAgent, toAgent, reason = '') {
  // Add to transfer history
  this.transferHistory.push({
    fromUserId: fromAgent._id,
    fromUserType: fromAgent.constructor.modelName,
    toUserId: toAgent._id,
    toUserType: toAgent.constructor.modelName,
    transferReason: reason,
    transferredAt: new Date()
  });
  
  // Update assignment
  this.assignedTo = {
    userId: toAgent._id,
    userType: toAgent.constructor.modelName,
    userName: toAgent.name,
    userEmail: toAgent.email || toAgent.systemEmail,
    assignedAt: new Date()
  };
  
  this.status = 'active'; // Keep as active after transfer
  return await this.save();
};

// Method to update activity timestamp
chatSessionSchema.methods.updateActivity = async function() {
  this.metadata.lastActivity = new Date();
  return await this.save();
};

// Method to add rating
chatSessionSchema.methods.addRating = async function(score, feedback = '') {
  this.rating = {
    score: score,
    feedback: feedback,
    ratedAt: new Date()
  };
  return await this.save();
};

// Static method to get waiting chats
chatSessionSchema.statics.getWaitingChats = function() {
  return this.find({ status: 'waiting' })
    .sort({ createdAt: 1 }) // FIFO - first in, first out
    .populate('initiatedBy.userId', 'companyName contactPerson email');
};

// Static method to get active chats for a support agent
chatSessionSchema.statics.getActiveChatsForAgent = function(agentId) {
  return this.find({ 
    'assignedTo.userId': agentId, 
    status: 'active' 
  })
    .sort({ 'metadata.lastActivity': -1 })
    .populate('initiatedBy.userId', 'companyName contactPerson email');
};

// Static method to get chat history for an agency
chatSessionSchema.statics.getChatHistoryForAgency = function(agencyId, limit = 20) {
  return this.find({ 'initiatedBy.userId': agencyId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('assignedTo.userId', 'name email');
};

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;