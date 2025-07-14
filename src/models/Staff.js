import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  // Basic Information
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  tradeType: {
    type: String,
    required: [true, 'Trade type is required'],
    enum: {
      values: [
        'Plumber',
        'Electrician',
        'Carpenter',
        'Painter',
        'Cleaner',
        'Gardener',
        'Handyman',
        'HVAC Technician',
        'Pest Control',
        'Locksmith',
        'Flooring Specialist',
        'Appliance Repair',
        'Other'
      ],
      message: 'Please select a valid trade type'
    }
  },
  
  // Contact Information
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  
  // Availability and Schedule
  availabilityStatus: {
    type: String,
    required: [true, 'Availability status is required'],
    enum: {
      values: ['Available', 'Unavailable', 'Busy', 'On Leave'],
      message: 'Please select a valid availability status'
    },
    default: 'Available'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  
  // Service Regions
  serviceRegions: {
    type: [{
      type: String,
      enum: ['North', 'South', 'East', 'West', 'Central']
    }],
    required: [true, 'At least one service region is required'],
    validate: {
      validator: function(regions) {
        return regions && regions.length > 0;
      },
      message: 'At least one service region must be selected'
    }
  },
  
  // Documents
  licensingDocuments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    // Legacy field for backward compatibility
    path: String,
    
    // Cloudinary specific fields
    cloudinaryId: String,
    cloudinaryUrl: String,
    cloudinaryVersion: String
  }],
  insuranceDocuments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadDate: {
      type: Date,
      default: Date.now
    },
    // Legacy field for backward compatibility
    path: String,
    
    // Cloudinary specific fields
    cloudinaryId: String,
    cloudinaryUrl: String,
    cloudinaryVersion: String
  }],
  
  // Polymorphic Reference - Staff can belong to either SuperUser or PropertyManager
  owner: {
    ownerType: {
      type: String,
      required: [true, 'Owner type is required'],
      enum: ['SuperUser', 'PropertyManager']
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Owner ID is required'],
      refPath: 'owner.ownerType'
    }
  },
  
  // Status and Metadata
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Terminated'],
    default: 'Active'
  },
  currentJobs: {
    type: Number,
    default: 0,
    min: [0, 'Current jobs cannot be negative']
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  totalJobs: {
    type: Number,
    default: 0
  },
  completedJobs: {
    type: Number,
    default: 0
  },
  
  // Additional Information
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  hourlyRate: {
    type: Number,
    min: [0, 'Hourly rate cannot be negative']
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastActiveDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to update timestamps
staffSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance Methods
staffSchema.methods.getFullDetails = function() {
  return {
    id: this._id,
    fullName: this.fullName,
    tradeType: this.tradeType,
    phone: this.phone,
    email: this.email,
    availabilityStatus: this.availabilityStatus,
    startDate: this.startDate,
    serviceRegions: this.serviceRegions,
    status: this.status,
    currentJobs: this.currentJobs,
    rating: this.rating,
    totalJobs: this.totalJobs,
    completedJobs: this.completedJobs,
    hourlyRate: this.hourlyRate,
    notes: this.notes,
    owner: this.owner,
    licensingDocuments: this.licensingDocuments,
    insuranceDocuments: this.insuranceDocuments,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastActiveDate: this.lastActiveDate
  };
};

staffSchema.methods.updateAvailability = async function(status) {
  this.availabilityStatus = status;
  this.lastActiveDate = Date.now();
  return await this.save();
};

staffSchema.methods.incrementJobCount = async function(completed = false) {
  this.totalJobs += 1;
  if (completed) {
    this.completedJobs += 1;
  }
  return await this.save();
};

staffSchema.methods.calculateCompletionRate = function() {
  if (this.totalJobs === 0) return 0;
  return (this.completedJobs / this.totalJobs) * 100;
};

// Static Methods
staffSchema.statics.findByOwner = function(ownerType, ownerId) {
  return this.find({
    'owner.ownerType': ownerType,
    'owner.ownerId': ownerId
  });
};

staffSchema.statics.findByTradeType = function(tradeType, ownerType = null, ownerId = null) {
  const query = { tradeType };
  if (ownerType && ownerId) {
    query['owner.ownerType'] = ownerType;
    query['owner.ownerId'] = ownerId;
  }
  return this.find(query);
};

staffSchema.statics.findByRegion = function(regions, ownerType = null, ownerId = null) {
  const query = {
    serviceRegions: { $in: Array.isArray(regions) ? regions : [regions] }
  };
  if (ownerType && ownerId) {
    query['owner.ownerType'] = ownerType;
    query['owner.ownerId'] = ownerId;
  }
  return this.find(query);
};

staffSchema.statics.findAvailable = function(ownerType = null, ownerId = null) {
  const query = {
    availabilityStatus: 'Available',
    status: 'Active'
  };
  if (ownerType && ownerId) {
    query['owner.ownerType'] = ownerType;
    query['owner.ownerId'] = ownerId;
  }
  return this.find(query);
};

// Indexes for better performance
staffSchema.index({ 'owner.ownerType': 1, 'owner.ownerId': 1 });
staffSchema.index({ tradeType: 1 });
staffSchema.index({ availabilityStatus: 1 });
staffSchema.index({ serviceRegions: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ email: 1 });

// Compound indexes for common queries
staffSchema.index({ 'owner.ownerType': 1, 'owner.ownerId': 1, status: 1 });
staffSchema.index({ tradeType: 1, availabilityStatus: 1 });
staffSchema.index({ serviceRegions: 1, availabilityStatus: 1 });

const Staff = mongoose.model('Staff', staffSchema);

export default Staff; 