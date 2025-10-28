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
    systemEmail: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9.-]+@rentalease\.com\.au$/,
        "Must be a valid @rentalease.com.au email",
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
    // compliance: {
    //   type: String,
    //   required: [true, "Compliance level is required"],
    //   enum: {
    //     values: [
    //       "Basic Package",
    //       "Basic Compliance",
    //       "Standard Package",
    //       "Premium Package",
    //       "Full Package",
    //     ],
    //     message: "Please select a valid compliance package",
    //   },
    // },
    outstandingAmount: {
      type: Number,
      default: 0,
      min: [0, "Outstanding amount cannot be negative"],
    },

    // Account Status
    status: {
      type: String,
      enum: ["Active", "Inactive", "Suspended", "Pending"],
      default: "Active",
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
      enum: [
        "trial",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "incomplete",
        "pending_payment",
      ],
      default: "pending_payment",
    },
    planType: {
      type: String,
      enum: ["starter", "pro", "enterprise", "custom"],
      default: "custom",
    },
    subscriptionAmount: {
      type: Number,
      default: 99,
      min: [1, "Subscription amount must be at least $1"],
      max: [100000, "Subscription amount cannot exceed $100,000"],
    },
    stripePriceId: {
      type: String,
      default: null,
    },
    paymentLinkUrl: {
      type: String,
      default: null,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "expired"],
      default: "pending",
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
  return (
    this.subscriptionStatus === "active" || this.subscriptionStatus === "trial"
  );
};

// Method to check if within plan limits
agencySchema.methods.canCreateProperty = function () {
  // With dynamic pricing, we'll use subscription amount to determine limits
  if (!this.hasActiveSubscription()) return false;

  // Base limit calculation on subscription amount (can be adjusted)
  // For now, we'll be generous with limits based on subscription amount
  let propertyLimit;
  if (this.subscriptionAmount < 100) {
    propertyLimit = 50; // Under $100/month = 50 properties
  } else if (this.subscriptionAmount < 200) {
    propertyLimit = 150; // $100-199/month = 150 properties
  } else if (this.subscriptionAmount < 500) {
    propertyLimit = 500; // $200-499/month = 500 properties
  } else {
    propertyLimit = Infinity; // $500+/month = unlimited
  }

  return this.totalProperties < propertyLimit;
};

// Method to get plan limits
agencySchema.methods.getPlanLimits = function () {
  // Dynamic limits based on subscription amount
  let propertyLimit;
  if (this.subscriptionAmount < 100) {
    propertyLimit = 50;
  } else if (this.subscriptionAmount < 200) {
    propertyLimit = 150;
  } else if (this.subscriptionAmount < 500) {
    propertyLimit = 500;
  } else {
    propertyLimit = Infinity;
  }

  return {
    properties: propertyLimit,
    subscriptionAmount: this.subscriptionAmount,
  };
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
