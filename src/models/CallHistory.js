import mongoose from "mongoose";

const callHistorySchema = new mongoose.Schema(
  {
    callSid: {
      type: String,
      unique: true,
      sparse: true,
    },
    from: {
      type: String,
      required: [true, "From number is required"],
    },
    to: {
      type: String,
      required: [true, "To number is required"],
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "User ID is required"],
    },
    userType: {
      type: String,
      required: [true, "User type is required"],
      enum: ["SuperUser", "TeamMember"],
    },
    duration: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        "initiating",
        "initiated",
        "queued",
        "ringing",
        "answered",
        "in-progress",
        "completed",
        "failed",
        "busy",
        "no-answer",
        "canceled",
      ],
      default: "initiating",
    },
    direction: {
      type: String,
      enum: ["inbound", "outbound"],
      default: "outbound",
    },
    recordingUrl: {
      type: String,
    },
    price: {
      amount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
    retryAttempts: {
      type: Number,
      default: 0,
    },
    originalCallSid: {
      type: String,
    },
    metadata: {
      contactName: String,
      contactRole: String,
      agencyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agency",
      },
      propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
callHistorySchema.index({ userId: 1, createdAt: -1 });
callHistorySchema.index({ contactId: 1, createdAt: -1 });
callHistorySchema.index({ callSid: 1 });
callHistorySchema.index({ status: 1 });
callHistorySchema.index({ "metadata.agencyId": 1 });

// Virtual for formatted duration
callHistorySchema.virtual("formattedDuration").get(function () {
  if (!this.duration) return "0:00";
  const minutes = Math.floor(this.duration / 60);
  const seconds = this.duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
});

// Method to calculate call cost (can be customized based on your pricing)
callHistorySchema.methods.calculateCost = function () {
  // This is a placeholder - actual cost calculation would depend on Twilio pricing
  // and your business model
  const ratePerMinute = 0.0140; // Example rate
  const minutes = Math.ceil(this.duration / 60);
  return minutes * ratePerMinute;
};

const CallHistory = mongoose.model("CallHistory", callHistorySchema);

export default CallHistory;