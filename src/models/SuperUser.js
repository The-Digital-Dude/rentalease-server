import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import emailService from '../services/email.service.js';

const superUserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  systemEmail: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
    match: [/^[a-z0-9.-]+@rentalease\.com\.au$/, 'Must be a valid @rentalease.com.au email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Password won't be included in query results by default
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
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
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
superUserSchema.pre('save', async function (next) {
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
superUserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Post-save middleware to send welcome email
superUserSchema.post('save', async function (doc, next) {
  if (this.isNew) {
    try {
      await emailService.sendWelcomeEmail({
        email: this.email,
        name: this.name
      });
    } catch (error) {
      // Log error but don't fail the save operation
      console.error('Failed to send welcome email:', {
        userId: this._id,
        error: error.message
      });
    }
  }
  next();
});

const SuperUser = mongoose.model('SuperUser', superUserSchema);

export default SuperUser; 