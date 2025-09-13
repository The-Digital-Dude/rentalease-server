import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  // Reference to the chat session
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatSession',
    required: true,
    index: true
  },
  
  // Message sender information
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'sender.userType'
    },
    userType: {
      type: String,
      required: true,
      enum: ['Agency', 'SuperUser', 'TeamMember', 'System']
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
  
  // Message type and content
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'system', 'typing_start', 'typing_stop'],
    default: 'text'
  },
  
  content: {
    text: {
      type: String,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    html: {
      type: String,
      maxlength: [3000, 'HTML content cannot exceed 3000 characters']
    }
  },
  
  // File/attachment information
  attachment: {
    type: {
      type: String,
      enum: ['image', 'document', 'video', 'audio'],
      default: null
    },
    filename: {
      type: String,
      default: null
    },
    originalName: {
      type: String,
      default: null
    },
    url: {
      type: String,
      default: null
    },
    cloudinaryId: {
      type: String,
      default: null
    },
    size: {
      type: Number,
      default: null
    },
    mimeType: {
      type: String,
      default: null
    }
  },
  
  // Message metadata
  metadata: {
    // For system messages
    systemAction: {
      type: String,
      enum: ['session_started', 'session_accepted', 'session_closed', 'agent_joined', 'agent_left', 'session_transferred'],
      default: null
    },
    
    // For tracking message status
    deliveryStatus: {
      type: String,
      enum: ['sent', 'delivered', 'failed'],
      default: 'sent'
    },
    
    // Read receipts
    readBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['Agency', 'SuperUser', 'TeamMember'],
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Message threading (for replies)
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null
    },
    
    // Editing information
    edited: {
      isEdited: {
        type: Boolean,
        default: false
      },
      editedAt: {
        type: Date,
        default: null
      },
      originalContent: {
        type: String,
        default: null
      }
    },
    
    // Message reactions/emoji
    reactions: [{
      emoji: {
        type: String,
        required: true
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      userType: {
        type: String,
        enum: ['Agency', 'SuperUser', 'TeamMember'],
        required: true
      },
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Client information for debugging
    clientInfo: {
      userAgent: String,
      ipAddress: String,
      platform: String
    }
  },
  
  // Message status
  status: {
    type: String,
    enum: ['active', 'deleted', 'flagged'],
    default: 'active'
  },
  
  // Deletion information (soft delete)
  deletedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    userType: {
      type: String,
      enum: ['Agency', 'SuperUser', 'TeamMember'],
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    },
    deleteReason: {
      type: String,
      maxlength: [200, 'Delete reason cannot exceed 200 characters'],
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
chatMessageSchema.index({ sessionId: 1, createdAt: 1 });
chatMessageSchema.index({ 'sender.userId': 1, createdAt: -1 });
chatMessageSchema.index({ sessionId: 1, messageType: 1 });
chatMessageSchema.index({ createdAt: -1 });

// Index for read status queries
chatMessageSchema.index({ 
  sessionId: 1, 
  'metadata.readBy.userId': 1, 
  'metadata.readBy.readAt': 1 
});

// Virtual to check if message is read by specific user
chatMessageSchema.virtual('isReadBy').get(function() {
  return (userId, userType) => {
    return this.metadata.readBy.some(
      read => read.userId.toString() === userId.toString() && read.userType === userType
    );
  };
});

// Virtual to get message preview (truncated content)
chatMessageSchema.virtual('preview').get(function() {
  if (this.messageType === 'text' && this.content.text) {
    return this.content.text.length > 100 
      ? this.content.text.substring(0, 100) + '...' 
      : this.content.text;
  }
  if (this.messageType === 'image') {
    return '📷 Image';
  }
  if (this.messageType === 'file') {
    return `📎 ${this.attachment.originalName || 'File'}`;
  }
  if (this.messageType === 'system') {
    return this.content.text || 'System message';
  }
  return '';
});

// Pre-save middleware to validate content
chatMessageSchema.pre('save', function(next) {
  // Ensure at least one type of content exists for non-typing messages
  if (this.messageType !== 'typing_start' && this.messageType !== 'typing_stop') {
    if (!this.content.text && !this.content.html && !this.attachment.url) {
      return next(new Error('Message must have text content or attachment'));
    }
  }
  
  // Validate system messages
  if (this.messageType === 'system' && !this.metadata.systemAction) {
    return next(new Error('System messages must have a systemAction'));
  }
  
  next();
});

// Method to mark message as read by user
chatMessageSchema.methods.markAsRead = async function(userId, userType) {
  // Check if already marked as read by this user
  const alreadyRead = this.metadata.readBy.some(
    read => read.userId.toString() === userId.toString() && read.userType === userType
  );
  
  if (!alreadyRead) {
    this.metadata.readBy.push({
      userId: userId,
      userType: userType,
      readAt: new Date()
    });
    await this.save();
  }
  
  return this;
};

// Method to add reaction to message
chatMessageSchema.methods.addReaction = async function(emoji, userId, userType) {
  // Check if user already reacted with this emoji
  const existingReaction = this.metadata.reactions.find(
    reaction => reaction.userId.toString() === userId.toString() 
      && reaction.userType === userType 
      && reaction.emoji === emoji
  );
  
  if (!existingReaction) {
    this.metadata.reactions.push({
      emoji: emoji,
      userId: userId,
      userType: userType,
      addedAt: new Date()
    });
    await this.save();
  }
  
  return this;
};

// Method to remove reaction from message
chatMessageSchema.methods.removeReaction = async function(emoji, userId, userType) {
  this.metadata.reactions = this.metadata.reactions.filter(
    reaction => !(
      reaction.userId.toString() === userId.toString() 
      && reaction.userType === userType 
      && reaction.emoji === emoji
    )
  );
  await this.save();
  return this;
};

// Method to edit message content
chatMessageSchema.methods.editMessage = async function(newContent) {
  // Store original content before editing
  if (!this.metadata.edited.isEdited) {
    this.metadata.edited.originalContent = this.content.text;
  }
  
  this.content.text = newContent;
  this.metadata.edited.isEdited = true;
  this.metadata.edited.editedAt = new Date();
  
  await this.save();
  return this;
};

// Method to soft delete message
chatMessageSchema.methods.softDelete = async function(deletedBy, deleteReason = '') {
  this.status = 'deleted';
  this.deletedBy = {
    userId: deletedBy._id,
    userType: deletedBy.constructor.modelName,
    deletedAt: new Date(),
    deleteReason: deleteReason
  };
  await this.save();
  return this;
};

// Static method to get messages for a session
chatMessageSchema.statics.getMessagesForSession = async function(sessionId, limit = 50, offset = 0) {
  const messages = await this.find({ 
    sessionId: sessionId, 
    status: 'active',
    messageType: { $ne: 'typing_start' } // Exclude typing indicators
  })
    .sort({ createdAt: 1 })
    .skip(offset)
    .limit(limit)
    .populate('metadata.replyTo', 'content.text sender.userName createdAt');
  
  // Manually populate sender.userId based on userType to avoid System model error
  for (const message of messages) {
    if (message.sender.userType !== 'System') {
      // Determine the model to use for population based on userType
      let modelName;
      switch (message.sender.userType) {
        case 'Agency':
          modelName = 'Agency';
          break;
        case 'SuperUser':
          modelName = 'SuperUser';
          break;
        case 'TeamMember':
          modelName = 'TeamMember';
          break;
        default:
          continue; // Skip population for unknown types
      }
      
      try {
        const Model = mongoose.model(modelName);
        const user = await Model.findById(message.sender.userId).select('name email companyName');
        if (user) {
          message.sender.userId = user;
        }
      } catch (error) {
        console.log(`Could not populate ${modelName} for message ${message._id}`);
      }
    }
  }
  
  return messages;
};

// Static method to get unread message count for user
chatMessageSchema.statics.getUnreadCountForUser = function(userId, userType, sessionId = null) {
  const query = {
    status: 'active',
    'sender.userId': { $ne: userId }, // Don't count own messages
    'metadata.readBy': {
      $not: {
        $elemMatch: {
          userId: userId,
          userType: userType
        }
      }
    }
  };
  
  if (sessionId) {
    query.sessionId = sessionId;
  }
  
  return this.countDocuments(query);
};

// Static method to create system message
chatMessageSchema.statics.createSystemMessage = function(sessionId, systemAction, text) {
  return this.create({
    sessionId: sessionId,
    sender: {
      userId: new mongoose.Types.ObjectId(), // Dummy ID for system
      userType: 'System',
      userName: 'System',
      userEmail: 'system@rentalease.com.au'
    },
    messageType: 'system',
    content: {
      text: text
    },
    metadata: {
      systemAction: systemAction,
      deliveryStatus: 'delivered'
    }
  });
};

// Static method to mark all messages in session as read by user
chatMessageSchema.statics.markAllAsReadInSession = async function(sessionId, userId, userType) {
  const messages = await this.find({
    sessionId: sessionId,
    status: 'active',
    'sender.userId': { $ne: userId }, // Don't mark own messages
    'metadata.readBy': {
      $not: {
        $elemMatch: {
          userId: userId,
          userType: userType
        }
      }
    }
  });
  
  for (const message of messages) {
    await message.markAsRead(userId, userType);
  }
  
  return messages.length;
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;