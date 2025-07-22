import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
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
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, "Please enter a valid phone number"],
    },
    notes: {
      type: String,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      default: "",
    },
    preferredContact: {
      type: String,
      enum: ["Email", "Phone"],
      default: "Email",
    },
    owner: {
      ownerType: {
        type: String,
        required: [true, "Owner type is required"],
        enum: ["SuperUser", "Agency"],
      },
      ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: [true, "Owner ID is required"],
        refPath: "owner.ownerType",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries by owner
contactSchema.index({ "owner.ownerType": 1, "owner.ownerId": 1 });
contactSchema.index({ email: 1 });

const Contact = mongoose.model("Contact", contactSchema);

export default Contact;
