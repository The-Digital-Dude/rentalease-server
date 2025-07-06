const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const emailService = require('../services/email.service');

const propertyManagerSchema = new mongoose.Schema({
  // Company Information
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    minlength: [2, 'Company name must be at least 2 characters long']
  },
  abn: {
    type: String,
    required: [true, 'ABN is required'],
    trim: true,
    unique: true,
    match: [/^\d{11}$/, 'ABN must be 11 digits']
  },
  
  // Contact Information
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true,
    minlength: [2, 'Contact person name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  
  // Business Information
  region: {
    type: String,
    required: [true, 'Region is required'],
    trim: true,
    enum: {
      values: ['Sydney Metro', 'Melbourne Metro', 'Brisbane Metro', 'Perth Metro', 'Adelaide Metro', 'Darwin Metro', 'Hobart Metro', 'Canberra Metro', 'Regional NSW', 'Regional VIC', 'Regional QLD', 'Regional WA', 'Regional SA', 'Regional NT', 'Regional TAS'],
      message: 'Please select a valid region'
    }
  },
  compliance: {
    type: String,
    required: [true, 'Compliance level is required'],
    enum: {
      values: ['Basic Package', 'Standard Package', 'Premium Package', 'Full Package'],
      message: 'Please select a valid compliance package'
    }
  },
  outstandingAmount: {
    type: Number,
    default: 0,
    min: [0, 'Outstanding amount cannot be negative']
  },
  
  // Account Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Suspended', 'Pending'],
    default: 'Pending'
  },
  
  // Authentication Information
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Password won't be included in query results by default
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  
  // Password reset OTP fields
  resetPasswordOTP: {
    type: String,
    default: null
  },
  resetPasswordOTPExpires: {
    type: Date,
    default: null
  },
  resetPasswordOTPAttempts: {
    type: Number,
    default: 0
  },
  
  // Additional metadata
  properties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property' // Reference to properties they manage
  }],
  totalProperties: {
    type: Number,
    default: 0
  },
  joinedDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
propertyManagerSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
propertyManagerSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get full display name
propertyManagerSchema.methods.getDisplayName = function () {
  return `${this.companyName} - ${this.contactPerson}`;
};

// Method to check if account is active
propertyManagerSchema.methods.isActive = function () {
  return this.status === 'Active';
};

// Method to update last login
propertyManagerSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return await this.save();
};

// Post-save middleware to send welcome email
propertyManagerSchema.post('save', async function (doc, next) {
  if (this.isNew) {
    try {
      await emailService.sendPropertyManagerWelcomeEmail({
        email: this.email,
        name: this.contactPerson,
        companyName: this.companyName
      });
    } catch (error) {
      // Log error but don't fail the save operation
      console.error('Failed to send welcome email:', {
        propertyManagerId: this._id,
        error: error.message
      });
    }
  }
  next();
});

// Create indexes for better query performance
propertyManagerSchema.index({ email: 1 });
propertyManagerSchema.index({ abn: 1 });
propertyManagerSchema.index({ status: 1 });
propertyManagerSchema.index({ region: 1 });
propertyManagerSchema.index({ companyName: 1 });

const PropertyManager = mongoose.model('PropertyManager', propertyManagerSchema);

module.exports = PropertyManager; 