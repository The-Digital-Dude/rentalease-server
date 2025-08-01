import mongoose from "mongoose";

const invoiceItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
      maxlength: [200, "Item name cannot exceed 200 characters"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.01, "Quantity must be greater than 0"],
    },
    rate: {
      type: Number,
      required: [true, "Rate is required"],
      min: [0, "Rate cannot be negative"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
  },
  { _id: true }
);

// Pre-save middleware to calculate item amount
invoiceItemSchema.pre("save", function (next) {
  if (this.quantity && this.rate) {
    this.amount = this.quantity * this.rate;
  }
  next();
});

const invoiceSchema = new mongoose.Schema(
  {
    // References
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: [true, "Technician ID is required"],
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
        return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      },
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // Items and Costs
    items: {
      type: [invoiceItemSchema],
      required: [true, "At least one item is required"],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Invoice must have at least one item",
      },
    },

    // Cost Calculations
    subtotal: {
      type: Number,
      required: true,
      min: [0, "Subtotal cannot be negative"],
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    totalCost: {
      type: Number,
      required: true,
      min: [0, "Total cost cannot be negative"],
      default: 0,
    },

    // Status and Timestamps
    status: {
      type: String,
      enum: {
        values: ["Pending", "Sent", "Paid"],
        message: "Status must be one of: Pending, Sent, Paid",
      },
      default: "Pending",
    },

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },

    // Additional Information
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },

    // Payment Information
    paymentMethod: {
      type: String,
      enum: ["Bank Transfer", "Credit Card", "Cash", "Check", "Other"],
      default: null,
    },
    paymentReference: {
      type: String,
      trim: true,
      maxlength: [100, "Payment reference cannot exceed 100 characters"],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
invoiceSchema.index({ jobId: 1 });
invoiceSchema.index({ technicianId: 1 });
invoiceSchema.index({ agencyId: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
invoiceSchema.pre("save", function (next) {
  // Calculate subtotal from items
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce(
      (sum, item) => sum + (item.amount || 0),
      0
    );
  }

  // Calculate total cost (subtotal + tax)
  this.totalCost = this.subtotal + (this.tax || 0);

  // Set sentAt timestamp when status changes to "Sent"
  if (this.status === "Sent" && !this.sentAt) {
    this.sentAt = new Date();
  }

  // Set paidAt timestamp when status changes to "Paid"
  if (this.status === "Paid" && !this.paidAt) {
    this.paidAt = new Date();
  }

  next();
});

// Method to get full invoice details
invoiceSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    invoiceNumber: this.invoiceNumber,
    jobId: this.jobId,
    technicianId: this.technicianId,
    agencyId: this.agencyId,
    description: this.description,
    items: this.items,
    subtotal: this.subtotal,
    tax: this.tax,
    totalCost: this.totalCost,
    status: this.status,
    notes: this.notes,
    paymentMethod: this.paymentMethod,
    paymentReference: this.paymentReference,
    createdAt: this.createdAt,
    sentAt: this.sentAt,
    paidAt: this.paidAt,
    updatedAt: this.updatedAt,
  };
};

// Method to get summary details (for list views)
invoiceSchema.methods.getSummary = function () {
  return {
    id: this._id,
    invoiceNumber: this.invoiceNumber,
    jobId: this.jobId,
    technicianId: this.technicianId,
    agencyId: this.agencyId,
    description: this.description,
    totalCost: this.totalCost,
    status: this.status,
    createdAt: this.createdAt,
    sentAt: this.sentAt,
  };
};

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = function () {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Static method to calculate totals for items
invoiceSchema.statics.calculateItemTotals = function (items) {
  if (!items || items.length === 0) {
    return { subtotal: 0, totalCost: 0 };
  }

  const subtotal = items.reduce((sum, item) => {
    const amount = (item.quantity || 0) * (item.rate || 0);
    return sum + amount;
  }, 0);

  return { subtotal, totalCost: subtotal };
};

const Invoice = mongoose.model("Invoice", invoiceSchema);

export default Invoice;
