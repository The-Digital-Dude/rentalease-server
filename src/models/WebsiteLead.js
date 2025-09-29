import mongoose from "mongoose";

const websiteLeadSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[0-9()\-\.\s]{7,20}$/, "Please enter a valid phone number"],
    },
    profession: {
      type: String,
      trim: true,
      enum: [
        "Property Manager",
        "Landlord",
        "Tenant",
        "Real Estate Agent",
        "Property Developer",
        "Property Investor",
        "Strata Manager",
        "Building Manager",
        "Facility Manager",
        "Other",
      ],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters long"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "converted", "closed"],
      default: "new",
    },
    source: {
      type: String,
      default: "website_contact_form",
      enum: ["website_contact_form", "website_bookNow_form", "other"],
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
websiteLeadSchema.index({ email: 1 });
websiteLeadSchema.index({ status: 1 });
websiteLeadSchema.index({ profession: 1 });
websiteLeadSchema.index({ createdAt: -1 });

const WebsiteLead = mongoose.model("WebsiteLead", websiteLeadSchema);

export default WebsiteLead;
