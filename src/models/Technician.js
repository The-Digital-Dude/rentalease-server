import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import emailService from "../services/email.service.js";

const technicianSchema = new mongoose.Schema(
  {
    // Personal Information
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
    },

    // Contact Information
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

    // Work Information
    experience: {
      type: Number, // in years
      min: [0, "Experience cannot be negative"],
      default: 0,
    },
    availabilityStatus: {
      type: String,
      enum: ["Available", "Busy", "Unavailable", "On Leave"],
      default: "Available",
    },
    currentJobs: {
      type: Number,
      default: 0,
      min: [0, "Current jobs cannot be negative"],
    },
    maxJobs: {
      type: Number,
      default: 4,
      min: [1, "Maximum jobs must be at least 1"],
    },

    // Job Management
    assignedJobs: [
      {
        jobId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Job",
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["Active", "Completed", "Cancelled"],
          default: "Active",
        },
      },
    ],

    // Performance Metrics
    completedJobs: {
      type: Number,
      default: 0,
      min: [0, "Completed jobs cannot be negative"],
    },
    averageRating: {
      type: Number,
      min: [0, "Rating cannot be negative"],
      max: [5, "Rating cannot exceed 5"],
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: [0, "Total ratings cannot be negative"],
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

    // Owner Information (who manages this technician)
    owner: {
      ownerType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency"],
      },
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "owner.ownerType",
      },
    },

    // Address Information
    address: {
      street: {
        type: String,
        trim: true,
      },
      suburb: {
        type: String,
        trim: true,
      },
      state: {
        type: String,
        trim: true,
      },
      postcode: {
        type: String,
        trim: true,
      },
      fullAddress: {
        type: String,
        trim: true,
      },
    },

    // Profile Image Information
    profileImage: {
      cloudinaryId: {
        type: String,
        default: null,
      },
      cloudinaryUrl: {
        type: String,
        default: null,
      },
      uploadDate: {
        type: Date,
        default: null,
      },
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
    lastActive: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual field for fullName - computed from firstName + lastName
technicianSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`.trim();
});

// Ensure virtual fields are serialized
technicianSchema.set('toJSON', { virtuals: true });
technicianSchema.set('toObject', { virtuals: true });

// Pre-save middleware to hash password
technicianSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// fullName is now handled by virtual field above

// Pre-save middleware to update fullAddress
technicianSchema.pre("save", function (next) {
  if (
    this.isModified("address.street") ||
    this.isModified("address.suburb") ||
    this.isModified("address.state") ||
    this.isModified("address.postcode")
  ) {
    const addressParts = [
      this.address.street,
      this.address.suburb,
      this.address.state,
      this.address.postcode,
    ].filter(Boolean);
    this.address.fullAddress = addressParts.join(", ");
  }
  next();
});

// Method to compare password
technicianSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get full display name
technicianSchema.methods.getDisplayName = function () {
  return this.fullName;
};

// Method to check if account is active
technicianSchema.methods.isActive = function () {
  return this.status === "Active";
};

// Method to check if technician is available for new jobs
technicianSchema.methods.isAvailableForJobs = function () {
  return (
    this.status === "Active" &&
    this.availabilityStatus === "Available" &&
    this.currentJobs < this.maxJobs
  );
};

// Method to update last login
technicianSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  this.lastActive = new Date();
  return await this.save();
};

// Method to update availability status based on current jobs
technicianSchema.methods.updateAvailabilityStatus = async function () {
  if (this.currentJobs >= this.maxJobs) {
    this.availabilityStatus = "Busy";
  } else if (this.currentJobs === 0) {
    this.availabilityStatus = "Available";
  }
  return await this.save();
};

// Method to assign a job
technicianSchema.methods.assignJob = async function (jobId) {
  if (!this.isAvailableForJobs()) {
    throw new Error("Technician is not available for new jobs");
  }

  this.assignedJobs.push({
    jobId: jobId,
    assignedDate: new Date(),
    status: "Active",
  });
  this.currentJobs += 1;
  await this.updateAvailabilityStatus();
  return await this.save();
};

// Method to complete a job
technicianSchema.methods.completeJob = async function (jobId) {
  const jobIndex = this.assignedJobs.findIndex(
    (job) =>
      job.jobId.toString() === jobId.toString() && job.status === "Active"
  );

  if (jobIndex === -1) {
    throw new Error("Job not found or already completed");
  }

  this.assignedJobs[jobIndex].status = "Completed";
  this.currentJobs = Math.max(0, this.currentJobs - 1);
  this.completedJobs += 1;
  await this.updateAvailabilityStatus();
  return await this.save();
};

// Method to get active jobs
technicianSchema.methods.getActiveJobs = function () {
  return this.assignedJobs.filter((job) => job.status === "Active");
};

// Method to get job summary
technicianSchema.methods.getJobSummary = function () {
  return {
    totalJobs: this.assignedJobs.length,
    activeJobs: this.getActiveJobs().length,
    completedJobs: this.completedJobs,
    currentJobs: this.currentJobs,
    maxJobs: this.maxJobs,
    availabilityStatus: this.availabilityStatus,
  };
};

// Method to update rating
technicianSchema.methods.updateRating = async function (newRating) {
  if (newRating < 0 || newRating > 5) {
    throw new Error("Rating must be between 0 and 5");
  }

  const totalRating = this.averageRating * this.totalRatings + newRating;
  this.totalRatings += 1;
  this.averageRating = totalRating / this.totalRatings;
  return await this.save();
};

// Method to get full technician details
technicianSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    experience: this.experience,
    hourlyRate: this.hourlyRate,
    availabilityStatus: this.availabilityStatus,
    currentJobs: this.currentJobs,
    maxJobs: this.maxJobs,
    assignedJobs: this.assignedJobs,
    completedJobs: this.completedJobs,
    averageRating: this.averageRating,
    totalRatings: this.totalRatings,
    status: this.status,
    address: this.address,
    licenseNumber: this.licenseNumber,
    licenseExpiry: this.licenseExpiry,
    owner: this.owner,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    lastActive: this.lastActive,
  };
};

// Method to get summary details (for list views)
technicianSchema.methods.getSummary = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    experience: this.experience,
    hourlyRate: this.hourlyRate,
    availabilityStatus: this.availabilityStatus,
    currentJobs: this.currentJobs,
    maxJobs: this.maxJobs,
    completedJobs: this.completedJobs,
    averageRating: this.averageRating,
    status: this.status,
    address: this.address,
    licenseNumber: this.licenseNumber,
    licenseExpiry: this.licenseExpiry,
    createdAt: this.createdAt,
  };
};

// Post-save middleware to send welcome email
technicianSchema.post("save", async function (doc, next) {
  if (this.isNew) {
    try {
      await emailService.sendTechnicianWelcomeEmail({
        email: this.email,
        fullName: this.fullName,
      });

      console.log("Welcome email sent successfully to new technician:", {
        technicianId: this._id,
        email: this.email,
        fullName: this.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail the save operation
      console.error("Failed to send welcome email to technician:", {
        technicianId: this._id,
        email: this.email,
        fullName: this.fullName,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
  next();
});

// Indexes for better query performance
technicianSchema.index({ email: 1 });
technicianSchema.index({ "owner.ownerType": 1, "owner.ownerId": 1 });

technicianSchema.index({ availabilityStatus: 1, currentJobs: 1 });
technicianSchema.index({ status: 1, availabilityStatus: 1 });

const Technician = mongoose.model("Technician", technicianSchema);

export default Technician;
