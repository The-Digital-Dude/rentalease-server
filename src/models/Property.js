import mongoose from "mongoose";

const propertySchema = new mongoose.Schema(
  {
    // Basic Property Information
    address: {
      street: {
        type: String,
        required: [true, "Street address is required"],
        trim: true,
      },
      suburb: {
        type: String,
        required: [true, "Suburb is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"],
      },
      postcode: {
        type: String,
        required: [true, "Postcode is required"],
        match: [/^\d{4}$/, "Postcode must be 4 digits"],
      },
      fullAddress: {
        type: String,
        trim: true,
      },
    },

    // Basic property details (set automatically)
    propertyType: {
      type: String,
      default: "House",
      enum: ["House", "Apartment", "Townhouse", "Commercial", "Other"],
    },

    // Property Management
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: [true, "Agency is required"],
    },
    assignedPropertyManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyManager",
    },
    assignedTeamMember: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeamMember",
    },

    region: {
      type: String,
      required: [true, "Region is required"],
      enum: [
        "Sydney Metro",
        "Melbourne Metro",
        "Brisbane Metro",
        "Perth Metro",
        "Adelaide Metro",
        "Darwin Metro",
        "Hobart Metro",
        "Canberra Metro",
        "Regional NSW",
        "Regional VIC",
        "Regional QLD",
        "Regional WA",
        "Regional SA",
        "Regional NT",
        "Regional TAS",
      ],
    },

    // Tenant Information
    currentTenant: {
      name: {
        type: String,
        required: [true, "Tenant name is required"],
      },
      email: {
        type: String,
        required: [true, "Tenant email is required"],
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
      phone: {
        type: String,
        required: [true, "Tenant phone is required"],
        match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
      },
    },

    // Landlord Information
    currentLandlord: {
      name: {
        type: String,
        required: [true, "Landlord name is required"],
      },
      email: {
        type: String,
        required: [true, "Landlord email is required"],
        match: [
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
          "Please enter a valid email",
        ],
      },
      phone: {
        type: String,
        required: [true, "Landlord phone is required"],
        match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
      },
    },

    // Australian Compliance & Inspection Requirements
    complianceSchedule: {
      gasCompliance: {
        nextInspection: Date,
        required: {
          type: Boolean,
          default: true,
        },
        status: {
          type: String,
          enum: ["Compliant", "Due Soon", "Overdue", "Not Required"],
          default: "Due Soon",
        },
      },

      electricalSafety: {
        nextInspection: Date,
        required: {
          type: Boolean,
          default: true,
        },
        status: {
          type: String,
          enum: ["Compliant", "Due Soon", "Overdue", "Not Required"],
          default: "Due Soon",
        },
      },

      smokeAlarms: {
        nextInspection: Date,
        required: {
          type: Boolean,
          default: true,
        },
        status: {
          type: String,
          enum: ["Compliant", "Due Soon", "Overdue", "Not Required"],
          default: "Due Soon",
        },
      },

      poolSafety: {
        nextInspection: Date,
        required: {
          type: Boolean,
          default: false,
        },
        status: {
          type: String,
          enum: ["Compliant", "Due Soon", "Overdue", "Not Required"],
          default: "Not Required",
        },
      },
    },

    // Additional Information
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: "",
    },

    hasDoubt: {
      type: Boolean,
      default: false,
    },

    // Metadata
    isActive: {
      type: Boolean,
      default: true,
    },

    // Property Creation Info
    createdBy: {
      userType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency", "PropertyManager"],
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: "createdBy.userType",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for full address
propertySchema.virtual("fullAddressString").get(function () {
  return `${this.address.street}, ${this.address.suburb} ${this.address.state} ${this.address.postcode}`;
});

// Pre-save middleware to populate fullAddress
propertySchema.pre("save", function (next) {
  this.address.fullAddress = `${this.address.street}, ${this.address.suburb} ${this.address.state} ${this.address.postcode}`;
  next();
});

// Method to check if any compliance is overdue
propertySchema.methods.hasOverdueCompliance = function () {
  const now = new Date();
  const compliance = this.complianceSchedule;

  return (
    (compliance.gasCompliance.nextInspection &&
      compliance.gasCompliance.nextInspection < now) ||
    (compliance.electricalSafety.nextInspection &&
      compliance.electricalSafety.nextInspection < now) ||
    (compliance.smokeAlarms.nextInspection &&
      compliance.smokeAlarms.nextInspection < now) ||
    (compliance.poolSafety.required &&
      compliance.poolSafety.nextInspection &&
      compliance.poolSafety.nextInspection < now)
  );
};

// Method to get compliance summary
propertySchema.methods.getComplianceSummary = function () {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let compliant = 0;
  let dueSoon = 0;
  let overdue = 0;
  let total = 0;

  const inspections = [
    this.complianceSchedule.gasCompliance,
    this.complianceSchedule.electricalSafety,
    this.complianceSchedule.smokeAlarms,
  ];

  if (this.complianceSchedule.poolSafety.required) {
    inspections.push(this.complianceSchedule.poolSafety);
  }

  inspections.forEach((inspection) => {
    if (inspection.nextInspection) {
      total++;
      if (inspection.nextInspection < now) {
        overdue++;
      } else if (inspection.nextInspection <= thirtyDaysFromNow) {
        dueSoon++;
      } else {
        compliant++;
      }
    }
  });

  return {
    total,
    compliant,
    dueSoon,
    overdue,
    complianceScore: total > 0 ? Math.round((compliant / total) * 100) : 100,
  };
};

// Post-save middleware to update agency totalProperties count
propertySchema.post('save', async function() {
  if (this.isNew && this.agency) {
    try {
      // Import Agency model dynamically to avoid circular dependency
      const Agency = mongoose.model('Agency');
      
      // Count active properties for this agency
      const activePropertiesCount = await mongoose.model('Property').countDocuments({
        agency: this.agency,
        isActive: true
      });
      
      // Update agency's totalProperties count
      await Agency.findByIdAndUpdate(this.agency, {
        totalProperties: activePropertiesCount
      });
      
      console.log(`Updated agency ${this.agency} totalProperties to ${activePropertiesCount}`);
    } catch (error) {
      console.error('Error updating agency totalProperties:', error);
    }
  }
});

// Post-remove middleware to update agency totalProperties count
propertySchema.post('remove', async function() {
  if (this.agency) {
    try {
      // Import Agency model dynamically to avoid circular dependency
      const Agency = mongoose.model('Agency');
      
      // Count active properties for this agency
      const activePropertiesCount = await mongoose.model('Property').countDocuments({
        agency: this.agency,
        isActive: true
      });
      
      // Update agency's totalProperties count
      await Agency.findByIdAndUpdate(this.agency, {
        totalProperties: activePropertiesCount
      });
      
      console.log(`Updated agency ${this.agency} totalProperties to ${activePropertiesCount}`);
    } catch (error) {
      console.error('Error updating agency totalProperties:', error);
    }
  }
});

// Post-findOneAndUpdate middleware to handle isActive changes
propertySchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.agency) {
    try {
      // Import Agency model dynamically to avoid circular dependency
      const Agency = mongoose.model('Agency');
      
      // Count active properties for this agency
      const activePropertiesCount = await mongoose.model('Property').countDocuments({
        agency: doc.agency,
        isActive: true
      });
      
      // Update agency's totalProperties count
      await Agency.findByIdAndUpdate(doc.agency, {
        totalProperties: activePropertiesCount
      });
      
      console.log(`Updated agency ${doc.agency} totalProperties to ${activePropertiesCount}`);
    } catch (error) {
      console.error('Error updating agency totalProperties:', error);
    }
  }
});

// Indexes for better query performance
propertySchema.index({ agency: 1 });
propertySchema.index({ assignedPropertyManager: 1 });
propertySchema.index({ "address.state": 1, "address.suburb": 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ "complianceSchedule.gasCompliance.nextInspection": 1 });
propertySchema.index({
  "complianceSchedule.electricalSafety.nextInspection": 1,
});
propertySchema.index({ "complianceSchedule.smokeAlarms.nextInspection": 1 });
propertySchema.index({ region: 1 });

// Compound indexes for PropertyManager queries
propertySchema.index({ assignedPropertyManager: 1, isActive: 1 });
propertySchema.index({ agency: 1, assignedPropertyManager: 1 });

const Property = mongoose.model("Property", propertySchema);

export default Property;
