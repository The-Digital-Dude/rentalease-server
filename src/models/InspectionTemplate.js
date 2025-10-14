import mongoose from "mongoose";

const fieldOptionSchema = new mongoose.Schema(
  {
    value: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const fieldSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "text",
        "textarea",
        "number",
        "boolean",
        "select",
        "multi-select",
        "date",
        "time",
        "photo",
        "photo-multi",
        "rating",
        "signature",
        "checkbox-group",
        "yes-no",
        "yes-no-na",
        "pass-fail",
      ],
    },
    required: {
      type: Boolean,
      default: false,
    },
    placeholder: String,
    helpText: String,
    options: [fieldOptionSchema],
    min: Number,
    max: Number,
    step: Number,
    defaultValue: mongoose.Schema.Types.Mixed,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    fields: {
      type: [fieldSchema],
      default: [],
      validate: {
        validator: function (fields) {
          return Array.isArray(fields) && fields.length > 0;
        },
        message: "Each section must contain at least one field",
      },
    },
  },
  { _id: false }
);

const inspectionTemplateSchema = new mongoose.Schema(
  {
    jobType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    sections: {
      type: [sectionSchema],
      default: [],
      validate: {
        validator: function (sections) {
          return Array.isArray(sections) && sections.length > 0;
        },
        message: "Inspection templates require at least one section",
      },
    },
    lastUpdatedBy: {
      userType: String,
      userId: mongoose.Schema.Types.ObjectId,
      at: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  }
);

inspectionTemplateSchema.index({ jobType: 1, version: -1 }, { unique: true });

inspectionTemplateSchema.methods.toClient = function () {
  const template = this.toObject({ getters: true, virtuals: false });
  delete template._id;
  delete template.__v;
  return {
    id: this.id,
    jobType: template.jobType,
    title: template.title,
    version: template.version,
    isActive: template.isActive,
    metadata: template.metadata || {},
    sections: template.sections,
    updatedAt: template.updatedAt,
  };
};

const InspectionTemplate = mongoose.model(
  "InspectionTemplate",
  inspectionTemplateSchema
);

export default InspectionTemplate;
