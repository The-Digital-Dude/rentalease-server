import mongoose from 'mongoose';

// Function to generate random 6-digit number
const generateJobNumber = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const jobSchema = new mongoose.Schema({
  job_id: {
    type: String,
    unique: true,
    required: true,
    default: function() {
      return `J-${generateJobNumber()}`;
    }
  },
  propertyAddress: {
    type: String,
    required: [true, 'Property address is required'],
    trim: true,
    minlength: [5, 'Property address must be at least 5 characters long']
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    default: null
  },
  jobType: {
    type: String,
    required: [true, 'Job type is required'],
    enum: {
      values: ['Gas', 'Electrical', 'Smoke', 'Repairs', 'Pool Safety', 'Routine Inspection'],
      message: 'Job type must be one of: Gas, Electrical, Smoke, Repairs, Pool Safety, Routine Inspection'
    }
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required'],
    validate: {
      validator: function(value) {
        return value > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  assignedTechnician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null
  },
  status: {
    type: String,
    required: [true, 'Status is required'],
    enum: {
      values: ['Pending', 'Scheduled', 'Completed', 'Overdue'],
      message: 'Status must be one of: Pending, Scheduled, Completed, Overdue'
    },
    default: 'Pending'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  completedAt: {
    type: Date,
    default: null
  },
  estimatedDuration: {
    type: Number, // in hours
    min: [0.5, 'Estimated duration must be at least 0.5 hours'],
    max: [24, 'Estimated duration cannot exceed 24 hours']
  },
  actualDuration: {
    type: Number, // in hours
    min: [0, 'Actual duration cannot be negative']
  },
  cost: {
    materialCost: {
      type: Number,
      default: 0,
      min: [0, 'Material cost cannot be negative']
    },
    laborCost: {
      type: Number,
      default: 0,
      min: [0, 'Labor cost cannot be negative']
    },
    totalCost: {
      type: Number,
      default: 0,
      min: [0, 'Total cost cannot be negative']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [2000, 'Notes cannot exceed 2000 characters']
  },
  owner: {
    ownerType: {
      type: String,
      required: true,
      enum: ['SuperUser', 'PropertyManager']
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'owner.ownerType'
    }
  },
  createdBy: {
    userType: {
      type: String,
      required: true,
      enum: ['SuperUser', 'PropertyManager']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'createdBy.userType'
    }
  },
  lastUpdatedBy: {
    userType: {
      type: String,
      enum: ['SuperUser', 'PropertyManager']
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'lastUpdatedBy.userType'
    }
  }
}, {
  timestamps: true
});

// Index for better query performance
jobSchema.index({ status: 1, dueDate: 1 });
jobSchema.index({ assignedTechnician: 1, status: 1 });
jobSchema.index({ 'owner.ownerType': 1, 'owner.ownerId': 1 });

// Virtual for checking if job is overdue
jobSchema.virtual('isOverdue').get(function() {
  return this.status !== 'Completed' && this.dueDate < new Date();
});

// Pre-save middleware to update status to overdue if needed
jobSchema.pre('save', function(next) {
  if (this.isOverdue && this.status !== 'Completed') {
    this.status = 'Overdue';
  }
  
  // Calculate total cost
  this.cost.totalCost = this.cost.materialCost + this.cost.laborCost;
  
  // Set completedAt date when status changes to Completed
  if (this.status === 'Completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// Method to get full job details with populated fields
jobSchema.methods.getFullDetails = function() {
  return {
    id: this._id,
    job_id: this.job_id,
    propertyAddress: this.propertyAddress,
    jobType: this.jobType,
    dueDate: this.dueDate,
    assignedTechnician: this.assignedTechnician,
    status: this.status,
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
    lastUpdatedBy: this.lastUpdatedBy
  };
};

// Method to get summary details (for list views)
jobSchema.methods.getSummary = function() {
  return {
    id: this._id,
    job_id: this.job_id,
    propertyAddress: this.propertyAddress,
    jobType: this.jobType,
    dueDate: this.dueDate,
    assignedTechnician: this.assignedTechnician,
    status: this.status,
    priority: this.priority,
    isOverdue: this.isOverdue,
    totalCost: this.cost.totalCost,
    createdAt: this.createdAt
  };
};

const Job = mongoose.model('Job', jobSchema);

export default Job; 