import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import emailService from "../services/email.service.js";

const propertyManagerSchema = new mongoose.Schema(
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
      unique: true, // This automatically creates an index
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

    // Property Management Information
    assignedProperties: [
      {
        propertyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Property",
          required: true,
        },
        assignedDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["Active", "Inactive", "Suspended"],
          default: "Active",
        },
        role: {
          type: String,
          enum: ["Primary", "Secondary", "Backup"],
          default: "Primary",
        },
      },
    ],

    // Availability and Status
    availabilityStatus: {
      type: String,
      enum: ["Available", "Busy", "Unavailable", "On Leave"],
      default: "Available",
    },
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

    // Owner Information (which agency owns/manages them)
    owner: {
      ownerType: {
        type: String,
        required: true,
        enum: ["Agency"],
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

// Pre-save middleware to hash password
propertyManagerSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update fullName
propertyManagerSchema.pre("save", function (next) {
  if (this.isModified("firstName") || this.isModified("lastName")) {
    this.fullName = `${this.firstName} ${this.lastName}`.trim();
  }
  next();
});

// Pre-save middleware to update fullAddress
propertyManagerSchema.pre("save", function (next) {
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

// Pre-save middleware to update property counts
propertyManagerSchema.pre("save", function (next) {
  if (this.isModified("assignedProperties")) {
    // Calculate counts dynamically since we removed the stored fields
    this.totalPropertiesManaged = this.assignedProperties.length;
    this.activePropertiesCount = this.assignedProperties.filter(
      (property) => property.status === "Active"
    ).length;
  }
  next();
});

// Method to compare password
propertyManagerSchema.methods.comparePassword = async function (
  candidatePassword
) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to get full display name
propertyManagerSchema.methods.getDisplayName = function () {
  return this.fullName;
};

// Method to check if account is active
propertyManagerSchema.methods.isActive = function () {
  return this.status === "Active";
};

// Method to check if property manager is available
propertyManagerSchema.methods.isAvailable = function () {
  return this.status === "Active" && this.availabilityStatus === "Available";
};

// Method to update last login
propertyManagerSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  this.lastActive = new Date();
  return await this.save();
};

// Method to assign a property
propertyManagerSchema.methods.assignProperty = async function (
  propertyId,
  role = "Primary"
) {
  // Check if property is already assigned
  const existingAssignment = this.assignedProperties.find(
    (assignment) => assignment.propertyId.toString() === propertyId.toString()
  );

  if (existingAssignment) {
    throw new Error("Property is already assigned to this manager");
  }

  this.assignedProperties.push({
    propertyId: propertyId,
    assignedDate: new Date(),
    status: "Active",
    role: role,
  });

  return await this.save();
};

// Method to remove property assignment
propertyManagerSchema.methods.removePropertyAssignment = async function (
  propertyId
) {
  const propertyIndex = this.assignedProperties.findIndex(
    (assignment) => assignment.propertyId.toString() === propertyId.toString()
  );

  if (propertyIndex === -1) {
    throw new Error("Property assignment not found");
  }

  this.assignedProperties.splice(propertyIndex, 1);
  return await this.save();
};

// Method to update property assignment status
propertyManagerSchema.methods.updatePropertyAssignmentStatus = async function (
  propertyId,
  status
) {
  const assignment = this.assignedProperties.find(
    (assignment) => assignment.propertyId.toString() === propertyId.toString()
  );

  if (!assignment) {
    throw new Error("Property assignment not found");
  }

  assignment.status = status;
  return await this.save();
};

// Method to get active property assignments
propertyManagerSchema.methods.getActivePropertyAssignments = function () {
  return this.assignedProperties.filter(
    (assignment) => assignment.status === "Active"
  );
};

// Method to get property assignment summary
propertyManagerSchema.methods.getPropertyAssignmentSummary = function () {
  const totalProperties = this.assignedProperties.length;
  const activeProperties = this.assignedProperties.filter(
    (assignment) => assignment.status === "Active"
  ).length;

  return {
    totalProperties: totalProperties,
    activeProperties: activeProperties,
    inactiveProperties: totalProperties - activeProperties,
    primaryAssignments: this.assignedProperties.filter(
      (assignment) =>
        assignment.role === "Primary" && assignment.status === "Active"
    ).length,
    secondaryAssignments: this.assignedProperties.filter(
      (assignment) =>
        assignment.role === "Secondary" && assignment.status === "Active"
    ).length,
  };
};

// Method to update rating (placeholder - removed rating fields)
propertyManagerSchema.methods.updateRating = async function (newRating) {
  // Rating functionality removed - this is a placeholder method
  console.log("Rating update requested:", newRating);
  return this;
};

// Method to check if license is valid (placeholder - removed license fields)
propertyManagerSchema.methods.isLicenseValid = function () {
  // License validation removed - this is a placeholder method
  return true;
};

// Method to get full property manager details
propertyManagerSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    assignedProperties: this.assignedProperties,
    availabilityStatus: this.availabilityStatus,
    status: this.status,
    address: this.address,
    owner: this.owner,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    lastActive: this.lastActive,
  };
};

// Method to get summary details (for list views)
propertyManagerSchema.methods.getSummary = function () {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
    assignedProperties: this.assignedProperties,
    availabilityStatus: this.availabilityStatus,
    status: this.status,
    createdAt: this.createdAt,
  };
};

// Post-save middleware to send welcome email
propertyManagerSchema.post("save", async function (doc, next) {
  if (this.isNew) {
    try {
      await emailService.sendPropertyManagerWelcomeEmail({
        email: this.email,
        fullName: this.fullName,
      });

      console.log("Welcome email sent successfully to new property manager:", {
        propertyManagerId: this._id,
        email: this.email,
        fullName: this.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't fail the save operation
      console.error("Failed to send welcome email to property manager:", {
        propertyManagerId: this._id,
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
// Note: email index is automatically created by unique: true constraint
propertyManagerSchema.index({ "owner.ownerType": 1, "owner.ownerId": 1 });
propertyManagerSchema.index({ status: 1, availabilityStatus: 1 });
propertyManagerSchema.index({ "assignedProperties.propertyId": 1 });

// Compound indexes for PropertyManager queries
propertyManagerSchema.index({
  "assignedProperties.propertyId": 1,
  "assignedProperties.status": 1,
});
propertyManagerSchema.index({
  "owner.ownerType": 1,
  "owner.ownerId": 1,
  status: 1,
});
propertyManagerSchema.index({ status: 1, "assignedProperties.propertyId": 1 });

const PropertyManager = mongoose.model(
  "PropertyManager",
  propertyManagerSchema
);

export default PropertyManager;
