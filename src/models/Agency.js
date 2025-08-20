import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import emailService from "../services/email.service.js";

const agencySchema = new mongoose.Schema(
  {
    // Company Information
    companyName: {
      type: String,
      required: [true, "Company name is required"],
      trim: true,
      minlength: [2, "Company name must be at least 2 characters long"],
    },
    abn: {
      type: String,
      required: [true, "ABN is required"],
      trim: true,
      unique: true,
      match: [/^\d{11}$/, "ABN must be 11 digits"],
    },

    // Contact Information
    contactPerson: {
      type: String,
      required: [true, "Contact person name is required"],
      trim: true,
      minlength: [2, "Contact person name must be at least 2 characters long"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
    },

    // Business Information
    region: {
      type: String,
      required: [true, "Region is required"],
    },
    compliance: {
      type: String,
      required: [true, "Compliance level is required"],
      enum: {
        values: [
          "Basic Package",
          "Basic Compliance",
          "Standard Package",
          "Premium Package",
          "Full Package",
        ],
        message: "Please select a valid compliance package",
      },
    },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: [0, "Outstanding amount cannot be negative"],
    },

    // Account Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Pending"],
      default: "Pending",
    },

    // Authentication Information
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Password won't be included in query results by default
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
    lastLogin: {
      type: Date,
      default: null,
    },

    // Password reset OTP fields
    resetPasswordOTP: {
      type: String,
      default: null,
    },
    resetPasswordOTPExpires: {
      type: Date,
      default: null,
    },
    resetPasswordOTPAttempts: {
      type: Number,
      default: 0,
    },

    // Subscription Information
    stripeCustomerId: {
      type: String,
      default: null,
    },
    subscriptionId: {
      type: String,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["trial", "active", "past_due", "canceled", "unpaid", "incomplete"],
      default: null,
    },
    planType: {
      type: String,
      enum: ["starter", "pro", "enterprise"],
      default: null,
    },
    billingPeriod: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    subscriptionStartDate: {
      type: Date,
      default: null,
    },
    subscriptionEndDate: {
      type: Date,
      default: null,
    },
    trialEndsAt: {
      type: Date,
      default: null,
    },

    // Additional metadata
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property", // Reference to properties they manage
      },
    ],
    totalProperties: {
      type: Number,
      default: 0,
    },
    joinedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to hash password
agencySchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
agencySchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get full display name
agencySchema.methods.getDisplayName = function () {
  return `${this.companyName} - ${this.contactPerson}`;
};

// Method to check if account is active
agencySchema.methods.isActive = function () {
  return this.status === "Active";
};

// Method to check if subscription is active
agencySchema.methods.hasActiveSubscription = function () {
  return this.subscriptionStatus === "active" || this.subscriptionStatus === "trial";
};

// Method to check if within plan limits
agencySchema.methods.canCreateProperty = function () {
  if (!this.planType) return false;
  
  const limits = {
    starter: 50,
    pro: 150,
    enterprise: Infinity
  };
  
  return this.totalProperties < limits[this.planType];
};

// Method to get plan limits
agencySchema.methods.getPlanLimits = function () {
  const limits = {
    starter: { properties: 50 },
    pro: { properties: 150 },
    enterprise: { properties: Infinity }
  };
  
  return limits[this.planType] || limits.starter;
};

// Method to update last login
agencySchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  return await this.save();
};

// Post-save middleware to send welcome email
agencySchema.post("save", async function (doc, next) {
  if (this.isNew) {
    try {
      await emailService.sendAgencyWelcomeEmail({
        email: this.email,
        contactPerson: this.contactPerson,
        companyName: this.companyName,
      });

      console.log("Welcome email sent successfully to new agency:", {
        agencyId: this._id,
        email: this.email,
        companyName: this.companyName,
        contactPerson: this.contactPerson,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail the save operation
      console.error("Failed to send welcome email to agency:", {
        agencyId: this._id,
        email: this.email,
        companyName: this.companyName,
        contactPerson: this.contactPerson,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

// Add index for email for faster queries
agencySchema.index({ email: 1 });

const Agency = mongoose.model("Agency", agencySchema);

export default Agency;
