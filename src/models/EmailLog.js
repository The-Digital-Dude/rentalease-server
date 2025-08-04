import mongoose from "mongoose";
import crypto from "crypto";

const emailLogSchema = new mongoose.Schema(
  {
    // Property Information
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
    },
    propertyAddress: {
      type: String,
      required: [true, "Property address is required"],
    },

    // Tenant Information
    tenantEmail: {
      type: String,
      required: [true, "Tenant email is required"],
    },
    tenantName: {
      type: String,
      required: [true, "Tenant name is required"],
    },

    // Compliance Information
    complianceType: {
      type: String,
      required: [true, "Compliance type is required"],
      enum: ["gasCompliance", "electricalSafety", "smokeAlarms", "poolSafety"],
    },
    jobType: {
      type: String,
      required: [true, "Job type is required"],
    },
    inspectionDate: {
      type: Date,
      required: [true, "Inspection date is required"],
    },

    // Email Information
    emailSentAt: {
      type: Date,
      default: Date.now,
    },
    emailStatus: {
      type: String,
      required: [true, "Email status is required"],
      enum: ["sent", "failed", "skipped"],
    },
    emailResult: {
      type: mongoose.Schema.Types.Mixed, // Store email service response
    },
    trackingKey: {
      type: String,
      required: [true, "Tracking key is required"],
      unique: true,
    },

    // Verification Token Information
    verificationToken: {
      type: String,
      required: [true, "Verification token is required"],
      unique: true,
    },
    tokenExpiresAt: {
      type: Date,
      required: [true, "Token expiration date is required"],
    },
    tokenUsed: {
      type: Boolean,
      default: false,
    },
    tokenUsedAt: {
      type: Date,
    },

    // Additional Information
    cronJobRun: {
      type: String,
      default: "complianceCronJob",
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
emailLogSchema.index({ propertyId: 1 });
emailLogSchema.index({ tenantEmail: 1 });
emailLogSchema.index({ emailSentAt: -1 });
emailLogSchema.index({ trackingKey: 1 });
emailLogSchema.index({ emailStatus: 1 });
emailLogSchema.index({ complianceType: 1 });
emailLogSchema.index({ verificationToken: 1 });
emailLogSchema.index({ tokenExpiresAt: 1 });

// Compound indexes for common queries
emailLogSchema.index({ propertyId: 1, emailSentAt: -1 });
emailLogSchema.index({ tenantEmail: 1, emailSentAt: -1 });
emailLogSchema.index({ emailStatus: 1, emailSentAt: -1 });

// Generate verification token
emailLogSchema.statics.generateVerificationToken = function () {
  return crypto.randomBytes(32).toString("hex");
};

// Method to get email statistics
emailLogSchema.statics.getEmailStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$emailStatus",
        count: { $sum: 1 },
        lastSent: { $max: "$emailSentAt" },
      },
    },
  ]);

  return stats.reduce((acc, stat) => {
    acc[stat._id] = {
      count: stat.count,
      lastSent: stat.lastSent,
    };
    return acc;
  }, {});
};

// Method to get email history for a property
emailLogSchema.statics.getPropertyEmailHistory = async function (
  propertyId,
  limit = 50
) {
  return await this.find({ propertyId })
    .sort({ emailSentAt: -1 })
    .limit(limit)
    .select("-__v");
};

// Method to get email history for a tenant
emailLogSchema.statics.getTenantEmailHistory = async function (
  tenantEmail,
  limit = 50
) {
  return await this.find({ tenantEmail })
    .sort({ emailSentAt: -1 })
    .limit(limit)
    .select("-__v");
};

// Method to check if email was recently sent
emailLogSchema.statics.wasEmailRecentlySent = async function (
  propertyId,
  complianceType,
  inspectionDate
) {
  // Create a 2-month window around the inspection date
  const twoMonthsInMs = 60 * 24 * 60 * 60 * 1000; // 60 days
  const startOfWindow = new Date(inspectionDate.getTime() - twoMonthsInMs);
  const endOfWindow = new Date(inspectionDate.getTime() + twoMonthsInMs);

  // Check if any email was sent within this 2-month window
  const existingLog = await this.findOne({
    propertyId: propertyId,
    complianceType: complianceType,
    emailSentAt: { $gte: startOfWindow, $lte: endOfWindow },
    emailStatus: "sent",
  });

  return existingLog !== null;
};

// Method to verify token
emailLogSchema.statics.verifyToken = async function (token) {
  try {
    const emailLog = await this.findOne({
      verificationToken: token,
      tokenExpiresAt: { $gt: new Date() },
      tokenUsed: false,
    });

    if (!emailLog) {
      return {
        valid: false,
        reason: "Token not found, expired, or already used",
      };
    }

    return {
      valid: true,
      emailLog: emailLog,
      reason: "Token is valid",
    };
  } catch (error) {
    return { valid: false, reason: "Error verifying token" };
  }
};

// Method to mark token as used
emailLogSchema.statics.markTokenAsUsed = async function (token) {
  try {
    const result = await this.updateOne(
      { verificationToken: token },
      {
        tokenUsed: true,
        tokenUsedAt: new Date(),
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    return false;
  }
};

// Method to get active tokens (not expired, not used)
emailLogSchema.statics.getActiveTokens = async function () {
  return await this.find({
    tokenExpiresAt: { $gt: new Date() },
    tokenUsed: false,
  }).select(
    "verificationToken tenantEmail propertyAddress jobType tokenExpiresAt"
  );
};

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

export default EmailLog;
