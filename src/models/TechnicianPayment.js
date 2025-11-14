import mongoose from "mongoose";

// Function to generate random 6-digit payment number
const generatePaymentNumber = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const technicianPaymentSchema = new mongoose.Schema(
  {
    paymentNumber: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `TP-${generatePaymentNumber()}`;
      },
    },
    technicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: [true, "Technician ID is required"],
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: [true, "Job ID is required"],
    },
    agencyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agency",
      required: [true, "Agency ID is required"],
    },
    jobType: {
      type: String,
      required: [true, "Job type is required"],
      enum: {
        values: [
          "Gas",
          "Electrical",
          "Smoke",
          "Repairs",
          "Routine Inspection",
          "MinimumSafetyStandard",
        ],
        message:
          "Job type must be one of: Gas, Electrical, Smoke, Repairs, Routine Inspection, MinimumSafetyStandard",
      },
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
    },
    jobCompletedAt: {
      type: Date,
      required: [true, "Job completion date is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Paid", "Cancelled"],
      default: "Pending",
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    createdBy: {
      userType: {
        type: String,
        required: true,
        enum: ["SuperUser", "Agency", "System"],
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "createdBy.userType",
        required: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
technicianPaymentSchema.index({ technicianId: 1, status: 1 });
technicianPaymentSchema.index({ jobId: 1 });
technicianPaymentSchema.index({ agencyId: 1, status: 1 });
technicianPaymentSchema.index({ jobCompletedAt: 1 });

// Method to get full payment details
technicianPaymentSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    paymentNumber: this.paymentNumber,
    technicianId: this.technicianId,
    jobId: this.jobId,
    agencyId: this.agencyId,
    jobType: this.jobType,
    amount: this.amount,
    jobCompletedAt: this.jobCompletedAt,
    status: this.status,
    paymentDate: this.paymentDate,
    notes: this.notes,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Method to get summary details
technicianPaymentSchema.methods.getSummary = function () {
  return {
    id: this._id,
    paymentNumber: this.paymentNumber,
    technicianId: this.technicianId,
    jobId: this.jobId,
    jobType: this.jobType,
    amount: this.amount,
    status: this.status,
    jobCompletedAt: this.jobCompletedAt,
    paymentDate: this.paymentDate,
    createdAt: this.createdAt,
  };
};

// Static method to get payment amount by job type
technicianPaymentSchema.statics.getPaymentAmountByJobType = function (jobType) {
  const paymentRates = {
    Gas: 50,
    Electrical: 80,
    Smoke: 60,
    Repairs: 70, // Default rate for other job types
    "Routine Inspection": 70,
  };

  return paymentRates[jobType] || 70; // Default to 70 if job type not found
};

const TechnicianPayment = mongoose.model(
  "TechnicianPayment",
  technicianPaymentSchema
);

export default TechnicianPayment;
