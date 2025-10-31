import mongoose from "mongoose";

const propertyLogSchema = new mongoose.Schema(
  {
    // Reference to the property
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },

    // Property address for quick reference (in case property is deleted)
    propertyAddress: {
      type: String,
      required: true,
    },

    // Type of change
    changeType: {
      type: String,
      enum: [
        "created",
        "updated",
        "deleted",
        "agency_changed",
        "tenant_changed",
        "landlord_changed",
        "property_manager_assigned",
        "property_manager_removed",
        "status_changed",
        "compliance_updated",
      ],
      required: true,
    },

    // Who made the change
    changedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      userType: {
        type: String,
        enum: ["SuperUser", "Agency", "PropertyManager", "TeamMember"],
        required: true,
      },
      userName: {
        type: String,
        required: true,
      },
      userEmail: {
        type: String,
        required: true,
      },
    },

    // Description of the change
    description: {
      type: String,
      required: true,
    },

    // Detailed field changes (array of changes)
    changes: [
      {
        field: {
          type: String,
          required: true,
        },
        fieldLabel: {
          type: String, // Human-readable field name
          required: true,
        },
        oldValue: {
          type: mongoose.Schema.Types.Mixed, // Can be any type
        },
        newValue: {
          type: mongoose.Schema.Types.Mixed, // Can be any type
        },
        changeCategory: {
          type: String,
          enum: ["basic", "tenant", "landlord", "agency", "manager", "compliance", "status"],
        },
      },
    ],

    // Snapshot of important data before change (for complex objects)
    previousSnapshot: {
      agency: {
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        email: String,
      },
      tenant: {
        name: String,
        email: String,
        phone: String,
      },
      landlord: {
        name: String,
        email: String,
        phone: String,
      },
      propertyManager: {
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        email: String,
      },
      status: String,
    },

    // IP address and user agent for audit purposes
    metadata: {
      ipAddress: String,
      userAgent: String,
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Indexes for efficient querying
propertyLogSchema.index({ property: 1, createdAt: -1 });
propertyLogSchema.index({ "changedBy.userId": 1, createdAt: -1 });
propertyLogSchema.index({ changeType: 1, createdAt: -1 });

// Static method to create a log entry
propertyLogSchema.statics.createLog = async function (logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error("Error creating property log:", error);
    throw error;
  }
};

// Static method to get logs for a property
propertyLogSchema.statics.getPropertyLogs = async function (
  propertyId,
  options = {}
) {
  const {
    page = 1,
    limit = 50,
    changeType = null,
    startDate = null,
    endDate = null,
  } = options;

  const filter = { property: propertyId };

  if (changeType) {
    filter.changeType = changeType;
  }

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;

  const [logs, totalCount] = await Promise.all([
    this.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter),
  ]);

  return {
    logs,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    },
  };
};

// Static method to get summary of changes for a property
propertyLogSchema.statics.getChangeSummary = async function (propertyId) {
  const summary = await this.aggregate([
    { $match: { property: new mongoose.Types.ObjectId(propertyId) } },
    {
      $group: {
        _id: "$changeType",
        count: { $sum: 1 },
        lastChange: { $max: "$createdAt" },
      },
    },
    {
      $project: {
        changeType: "$_id",
        count: 1,
        lastChange: 1,
        _id: 0,
      },
    },
  ]);

  return summary;
};

const PropertyLog = mongoose.model("PropertyLog", propertyLogSchema);

export default PropertyLog;
