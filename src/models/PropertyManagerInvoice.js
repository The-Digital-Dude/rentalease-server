import mongoose from "mongoose";

const propertyManagerInvoiceSchema = new mongoose.Schema(
  {
    // References
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property ID is required"],
    },
    propertyManagerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PropertyManager",
      required: [true, "Property Manager ID is required"],
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: [true, "Agency ID is required"],
    },

    // Invoice Details
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `PM-INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Amount
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },

    // Due Date
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },

    // Status and Timestamps
    status: {
      type: String,
      enum: {
        values: ["Pending", "Accepted", "Rejected"],
        message: "Status must be one of: Pending, Accepted, Rejected",
      },
      default: "Pending",
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
    rejectedAt: {
      type: Date,
      default: null,
    },

    // Additional Information
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
propertyManagerInvoiceSchema.index({ propertyId: 1 });
propertyManagerInvoiceSchema.index({ propertyManagerId: 1 });
propertyManagerInvoiceSchema.index({ agencyId: 1 });
propertyManagerInvoiceSchema.index({ status: 1 });
propertyManagerInvoiceSchema.index({ dueDate: 1 });
propertyManagerInvoiceSchema.index({ createdAt: -1 });

// Compound indexes for common queries
propertyManagerInvoiceSchema.index({ propertyManagerId: 1, status: 1 });
propertyManagerInvoiceSchema.index({ agencyId: 1, status: 1 });
propertyManagerInvoiceSchema.index({ propertyId: 1, status: 1 });

// Pre-save middleware to set timestamps
propertyManagerInvoiceSchema.pre("save", function (next) {
  // Set acceptedAt timestamp when status changes to "Accepted"
  if (this.status === "Accepted" && !this.acceptedAt) {
    this.acceptedAt = new Date();
  }

  // Set rejectedAt timestamp when status changes to "Rejected"
  if (this.status === "Rejected" && !this.rejectedAt) {
    this.rejectedAt = new Date();
  }

  next();
});

// Method to get full invoice details
propertyManagerInvoiceSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    invoiceNumber: this.invoiceNumber,
    propertyId: this.propertyId,
    propertyManagerId: this.propertyManagerId,
    agencyId: this.agencyId,
    description: this.description,
    amount: this.amount,
    dueDate: this.dueDate,
    status: this.status,
    notes: this.notes,
    createdAt: this.createdAt,
    acceptedAt: this.acceptedAt,
    rejectedAt: this.rejectedAt,
    updatedAt: this.updatedAt,
  };
};

// Method to get summary details (for list views)
propertyManagerInvoiceSchema.methods.getSummary = function () {
  return {
    id: this._id,
    invoiceNumber: this.invoiceNumber,
    propertyId: this.propertyId,
    propertyManagerId: this.propertyManagerId,
    agencyId: this.agencyId,
    description: this.description,
    amount: this.amount,
    dueDate: this.dueDate,
    status: this.status,
    createdAt: this.createdAt,
    acceptedAt: this.acceptedAt,
    rejectedAt: this.rejectedAt,
  };
};

// Static method to generate invoice number
propertyManagerInvoiceSchema.statics.generateInvoiceNumber = function () {
  return `PM-INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Method to check if invoice is overdue
propertyManagerInvoiceSchema.methods.isOverdue = function () {
  return this.status === "Pending" && new Date() > this.dueDate;
};

const PropertyManagerInvoice = mongoose.model(
  "PropertyManagerInvoice",
  propertyManagerInvoiceSchema
);

export default PropertyManagerInvoice;
