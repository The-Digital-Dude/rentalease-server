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
        enum: ["SuperUser", "Agency"],
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

// Indexes for better query performance
propertySchema.index({ agency: 1 });
propertySchema.index({ "address.state": 1, "address.suburb": 1 });
propertySchema.index({ status: 1 });
propertySchema.index({ "complianceSchedule.gasCompliance.nextInspection": 1 });
propertySchema.index({
  "complianceSchedule.electricalSafety.nextInspection": 1,
});
propertySchema.index({ "complianceSchedule.smokeAlarms.nextInspection": 1 });
propertySchema.index({ region: 1 });

const Property = mongoose.model("Property", propertySchema);

export default Property;
