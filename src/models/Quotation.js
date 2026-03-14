import mongoose from "mongoose";

// Function to generate quotation number
const generateQuotationNumber = () => {
  return `QT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

const quotationSchema = new mongoose.Schema(
  {
    quotationNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return generateQuotationNumber();
      },
    },

    // References
    agency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: [true, "Agency reference is required"],
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property reference is required"],
    },
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

    // Job Request Details
    jobType: {
      type: String,
      required: [true, "Job type is required"],
      enum: {
        values: [
          "Vacant Property Cleaning",
          "Water Connection",
          "Gas Connection",
          "Electricity Connection",
          "Landscaping & Outdoor Maintenance",
          "Pest Control",
          "Grout Cleaning",
          "Removalists",
          "Handyman Services",
          "Painters",
        ],
        message: "Invalid job type selected",
      },
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: function (value) {
          return value > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    attachments: [
      {
        fileName: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number,
          required: true,
        },
        mimeType: {
          type: String,
          required: true,
        },
        cloudinaryId: {
          type: String,
        },
        gcsPath: {
          type: String,
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Quotation Details
    amount: {
      type: Number,
      min: [0, "Amount cannot be negative"],
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    validUntil: {
      type: Date,
      default: function () {
        // Default validity is 7 days from creation
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date;
      },
    },

    // Status Management
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Draft", "Sent", "Accepted", "Rejected", "Expired"],
        message: "Status must be one of: Draft, Sent, Accepted, Rejected, Expired",
      },
      default: "Draft",
    },

    // Timestamps for status changes
    sentAt: {
      type: Date,
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },

    // Generated Job and Invoice references (when accepted)
    generatedJob: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      default: null,
    },
    generatedInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },

    // Agency response details
    agencyResponse: {
      respondedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agency",
        default: null,
      },
      responseDate: {
        type: Date,
        default: null,
      },
      responseNotes: {
        type: String,
        trim: true,
        maxlength: [500, "Response notes cannot exceed 500 characters"],
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
quotationSchema.index({ agency: 1, status: 1 });
quotationSchema.index({ status: 1, createdAt: -1 });
quotationSchema.index({ quotationNumber: 1 });
quotationSchema.index({ validUntil: 1 });

// Pre-save middleware to handle status changes
quotationSchema.pre("save", function (next) {
  // Set sentAt timestamp when status changes to Sent
  if (this.isModified("status") && this.status === "Sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  // Set respondedAt timestamp when status changes to Accepted or Rejected
  if (
    this.isModified("status") &&
    (this.status === "Accepted" || this.status === "Rejected") &&
    !this.respondedAt
  ) {
    this.respondedAt = new Date();
    this.agencyResponse.responseDate = new Date();
  }

  next();
});

// Virtual for checking if quotation is expired
quotationSchema.virtual("isExpired").get(function () {
  return this.validUntil < new Date() && this.status === "Sent";
});

// Method to check if quotation can be responded to
quotationSchema.methods.canRespond = function () {
  return this.status === "Sent" && !this.isExpired;
};

// Method to expire quotation
quotationSchema.methods.expire = function () {
  if (this.status === "Sent" && this.validUntil < new Date()) {
    this.status = "Expired";
    return this.save();
  }
  return Promise.resolve(this);
};

// Static method to find expired quotations
quotationSchema.statics.findExpiredQuotations = function () {
  return this.find({
    status: "Sent",
    validUntil: { $lt: new Date() },
  });
};

// Ensure virtual fields are included in JSON output
quotationSchema.set("toJSON", { virtuals: true });
quotationSchema.set("toObject", { virtuals: true });

const Quotation = mongoose.model("Quotation", quotationSchema);

export default Quotation;