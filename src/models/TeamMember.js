import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const teamMemberSchema = new mongoose.Schema({
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperUser',
    required: [true, 'CreatedBy is required']
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SuperUser',
  },
  agency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agency',
    required: false // Optional - SuperUsers can create team members without agency
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
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
  }
}, {
  timestamps: true
});

// Pre-save middleware to hash password
teamMemberSchema.pre('save', async function (next) {
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
teamMemberSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to update last login
teamMemberSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return await this.save();
};

// Note: Credentials email is sent directly from the route handler
// to ensure we have access to the plain password before it gets hashed

// Add index for email for faster queries
teamMemberSchema.index({ email: 1 });

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);

export default TeamMember;