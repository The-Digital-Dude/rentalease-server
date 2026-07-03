import mongoose from "mongoose";

const inspectionSubmissionSchema = new mongoose.Schema(
  {
    clientSubmissionId: {
      type: String,
      required: true,
      trim: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
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
      trim: true,
      default: null,
    },
    templateVersion: {
      type: Number,
      default: null,
    },
    formData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    notes: {
      type: String,
      default: "",
    },
    nextComplianceDate: {
      type: String,
      default: null,
    },
    eventLocalTimestamp: {
      type: String,
      default: null,
    },
    eventTimezone: {
      type: String,
      default: null,
    },
    timestampSource: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "uploading_media", "ready_to_finalize", "report_submitted", "completed", "failed"],
      default: "pending",
      index: true,
    },
    mediaUploads: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    inspectionReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InspectionReport",
      default: null,
    },
    reportPdfUrl: {
      type: String,
      default: null,
    },
    completionResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

inspectionSubmissionSchema.index(
  { job: 1, technician: 1, clientSubmissionId: 1 },
  { unique: true, name: "inspection_submission_job_technician_client_unique" }
);

const InspectionSubmission =
  mongoose.models.InspectionSubmission ||
  mongoose.model("InspectionSubmission", inspectionSubmissionSchema);

export default InspectionSubmission;
