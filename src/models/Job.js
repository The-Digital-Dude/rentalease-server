import mongoose from "mongoose";

// Function to generate random 6-digit number
const generateJobNumber = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const jobSchema = new mongoose.Schema(
  {
    job_id: {
      type: String,
      unique: true,
      required: true,
      default: function () {
        return `J-${generateJobNumber()}`;
      },
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: [true, "Property reference is required"],
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
          "Pool Safety",
          "Routine Inspection",
        ],
        message:
          "Job type must be one of: Gas, Electrical, Smoke, Repairs, Pool Safety, Routine Inspection",
      },
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: function (value) {
          // Allow past due dates for completed jobs
          if (this.status === "Completed") {
            return true;
          }
          return value > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening"],
      default: "morning",
    },
    scheduledStartTime: {
      type: Date,
      default: null,
    },
    scheduledEndTime: {
      type: Date,
      default: null,
    },
    assignedTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      default: null,
    },
    status: {
      type: String,
      required: [true, "Status is required"],
      enum: {
        values: ["Pending", "Scheduled", "Completed", "Overdue", "Cancelled"],
        message:
          "Status must be one of: Pending, Scheduled, Completed, Overdue, Cancelled",
      },
      default: "Pending",
    },
    reportFile: {
      type: String,
      default: null,
    },
    hasInvoice: {
      type: Boolean,
      default: false,
    },
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      default: null,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    estimatedDuration: {
      type: Number, // in hours
      min: [0.5, "Estimated duration must be at least 0.5 hours"],
      max: [24, "Estimated duration cannot exceed 24 hours"],
    },
    actualDuration: {
      type: Number, // in hours
      min: [0, "Actual duration cannot be negative"],
    },
    cost: {
      materialCost: {
        type: Number,
        default: 0,
        min: [0, "Material cost cannot be negative"],
      },
      laborCost: {
        type: Number,
        default: 0,
        min: [0, "Labor cost cannot be negative"],
      },
      totalCost: {
        type: Number,
        default: 0,
        min: [0, "Total cost cannot be negative"],
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
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
    lastUpdatedBy: {
      userType: {
        type: String,
        enum: ["SuperUser", "Agency", "Technician"],
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "lastUpdatedBy.userType",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
jobSchema.index({ status: 1, dueDate: 1 });
jobSchema.index({ assignedTechnician: 1, status: 1 });
jobSchema.index({ "owner.ownerType": 1, "owner.ownerId": 1 });

// Index for better query performance
jobSchema.index({ property: 1, jobType: 1, dueDate: 1 });

// Virtual for checking if job is overdue
jobSchema.virtual("isOverdue").get(function () {
  return this.status !== "Completed" && this.dueDate < new Date();
});

// Pre-save middleware to check for duplicates and update status
jobSchema.pre("save", async function (next) {
  // Check for duplicate jobs (same property, job type, and date)
  if (this.isNew) {
    const startOfDay = new Date(this.dueDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(this.dueDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingJob = await this.constructor.findOne({
      property: this.property,
      jobType: this.jobType,
      dueDate: { $gte: startOfDay, $lte: endOfDay },
      _id: { $ne: this._id }, // Exclude current job if updating
    });

    if (existingJob) {
      const error = new Error(
        `A ${
          this.jobType
        } job already exists for this property on ${startOfDay.toDateString()}`
      );
      error.name = "DuplicateJobError";
      return next(error);
    }
  }

  // Update status to overdue if needed
  if (this.isOverdue && this.status !== "Completed") {
    this.status = "Overdue";
  }

  // Calculate total cost
  this.cost.totalCost = this.cost.materialCost + this.cost.laborCost;

  // Set completedAt date when status changes to Completed
  if (this.status === "Completed" && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

// Method to get full job details with populated fields
jobSchema.methods.getFullDetails = function () {
  return {
    id: this._id,
    job_id: this.job_id,
    property: this.property,
    jobType: this.jobType,
    dueDate: this.dueDate,
    shift: this.shift,
    scheduledStartTime: this.scheduledStartTime,
    scheduledEndTime: this.scheduledEndTime,
    assignedTechnician: this.assignedTechnician,
    status: this.status,
    reportFile: this.reportFile,
    hasInvoice: this.hasInvoice,
    invoice: this.invoice,
    description: this.description,
    priority: this.priority,
    completedAt: this.completedAt,
    estimatedDuration: this.estimatedDuration,
    actualDuration: this.actualDuration,
    cost: this.cost,
    notes: this.notes,
    isOverdue: this.isOverdue,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    owner: this.owner,
    createdBy: this.createdBy,
    lastUpdatedBy: this.lastUpdatedBy,
  };
};

// Method to get summary details (for list views)
jobSchema.methods.getSummary = function () {
  // Transform assignedTechnician data for frontend compatibility
  let transformedTechnician = null;
  if (this.assignedTechnician) {
    transformedTechnician = {
      id: this.assignedTechnician._id || this.assignedTechnician.id,
      name: this.assignedTechnician.fullName || 
            `${this.assignedTechnician.firstName || ''} ${this.assignedTechnician.lastName || ''}`.trim(),
      tradeType: this.assignedTechnician.tradeType || 'Technician',
    };
  }

  return {
    id: this._id,
    job_id: this.job_id,
    property: this.property,
    jobType: this.jobType,
    dueDate: this.dueDate,
    completedAt: this.completedAt,
    shift: this.shift,
    scheduledStartTime: this.scheduledStartTime,
    scheduledEndTime: this.scheduledEndTime,
    assignedTechnician: transformedTechnician,
    status: this.status,
    reportFile: this.reportFile,
    hasInvoice: this.hasInvoice,
    invoice: this.invoice,
    priority: this.priority,
    isOverdue: this.isOverdue,
    totalCost: this.cost.totalCost,
    createdAt: this.createdAt,
  };
};

// Static method to check for duplicate jobs
jobSchema.statics.checkForDuplicate = async function (
  propertyId,
  jobType,
  dueDate,
  excludeJobId = null
) {
  const startOfDay = new Date(dueDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dueDate);
  endOfDay.setHours(23, 59, 59, 999);

  const query = {
    property: propertyId,
    jobType: jobType,
    dueDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ["Pending", "Scheduled", "Overdue"] },
  };

  if (excludeJobId) {
    query._id = { $ne: excludeJobId };
  }

  return await this.findOne(query);
};

const Job = mongoose.model("Job", jobSchema);

export default Job;
