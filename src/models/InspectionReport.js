import mongoose from "mongoose";

const inspectionMediaSchema = new mongoose.Schema(
  {
    fieldId: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    cloudinaryId: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
    },
    size: {
      type: Number,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const inspectionReportSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    property: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    technician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Technician",
      required: true,
      index: true,
    },
    jobType: {
      type: String,
      required: true,
      index: true,
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionTemplate",
    },
    templateVersion: {
      type: Number,
      default: 1,
      index: true,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    sectionsSummary: {
      type: [
        {
          sectionId: String,
          fieldId: String,
          label: String,
          value: mongoose.Schema.Types.Mixed,
          flag: Boolean,
        },
      ],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 4000,
    },
    nextComplianceDate: {
      type: Date,
      required: function() {
        // Only required for compliance job types
        const complianceTypes = [
          'Gas', 'Gas Safety', 'Gas Safety Check', 'Gas Safety Inspection',
          'Electrical', 'Electrical Safety', 'Electrical Safety Check', 'Electrical Safety Inspection',
          'Smoke', 'Smoke Alarm', 'Smoke Alarm Inspection',
          'MinimumSafetyStandard', 'Minimum Safety Standard'
        ];
        return complianceTypes.includes(this.jobType);
      },
      validate: {
        validator: function(value) {
          // If field is not required, allow null/undefined
          if (!value) return !this.isRequired('nextComplianceDate');
          // If value exists, must be in the future
          return value > new Date();
        },
        message: 'Next compliance date must be in the future'
      },
      index: true,
    },
    media: {
      type: [inspectionMediaSchema],
      default: [],
    },
    pdf: {
      url: {
        type: String,
        trim: true,
      },
      cloudinaryId: {
        type: String,
        trim: true,
      },
      gcsPath: {
        type: String,
        trim: true,
      },
      generatedAt: {
        type: Date,
      },
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    submittedBy: {
      userType: {
        type: String,
        default: "Technician",
      },
      userId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },
    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "submitted",
    },
  },
  {
    timestamps: true,
  }
);

inspectionReportSchema.index(
  { job: 1, templateVersion: -1 },
  { unique: false }
);
inspectionReportSchema.index({ property: 1, submittedAt: -1 });
inspectionReportSchema.index({ technician: 1, submittedAt: -1 });

inspectionReportSchema.methods.toSummary = function () {
  return {
    id: this.id,
    job: this.job,
    property: this.property,
    technician: this.technician,
    jobType: this.jobType,
    templateVersion: this.templateVersion,
    submittedAt: this.submittedAt,
    pdf: this.pdf,
    notes: this.notes,
    sectionsSummary: this.sectionsSummary,
  };
};

const InspectionReport = mongoose.model(
  "InspectionReport",
  inspectionReportSchema
);

export default InspectionReport;
