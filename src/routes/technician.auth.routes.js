import express from "express";
import jwt from "jsonwebtoken";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import { authenticate } from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import { generateOTP } from "../utils/otpGenerator.js";
import fileUpload from "../services/fileUpload.service.js";

const router = express.Router();

// Helper function to generate JWT token
const generateToken = (technician) => {
  return jwt.sign(
    {
      id: technician._id,
      email: technician.email,
      fullName: technician.fullName,
      userType: "Technician",
      ownerType: technician.owner.ownerType,
      ownerId: technician.owner.ownerId,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// REGISTER - Create new technician account
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      licenseNumber,
      licenseExpiry,
      experience,
      hourlyRate,
      address,
      ownerType,
      ownerId,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !ownerType ||
      !ownerId
    ) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
        details: {
          firstName: !firstName ? "First name is required" : null,
          lastName: !lastName ? "Last name is required" : null,
          email: !email ? "Email is required" : null,
          phone: !phone ? "Phone number is required" : null,
          password: !password ? "Password is required" : null,
          ownerType: !ownerType ? "Owner type is required" : null,
          ownerId: !ownerId ? "Owner ID is required" : null,
        },
      });
    }

    // Check if technician already exists
    const existingTechnician = await Technician.findOne({ email });
    if (existingTechnician) {
      return res.status(409).json({
        status: "error",
        message: "A technician with this email already exists",
      });
    }

    // Create new technician
    const technician = new Technician({
      firstName,
      lastName,
      email,
      phone,
      password,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      experience: experience || 0,
      hourlyRate: hourlyRate || 0,
      address,
      owner: {
        ownerType,
        ownerId,
      },
    });

    await technician.save();

    // Send credentials email to technician
    try {
      // Get owner details for email
      let ownerDetails = { name: "System Administrator", type: "SuperUser" };

      if (ownerType === "Agency") {
        const agency = await Agency.findById(ownerId);
        if (agency) {
          ownerDetails = { name: agency.contactPerson, type: "Agency" };
        }
      } else if (ownerType === "SuperUser") {
        const superUser = await SuperUser.findById(ownerId);
        if (superUser) {
          ownerDetails = {
            name: superUser.fullName || "Super User",
            type: "SuperUser",
          };
        }
      }

      await emailService.sendTechnicianCredentialsEmail(
        technician,
        password,
        ownerDetails,
        process.env.FRONTEND_URL || "https://rentalease-client.vercel.app/login"
      );

      console.log("Technician credentials email sent successfully:", {
        technicianId: technician._id,
        email: technician.email,
        fullName: technician.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error("Failed to send technician credentials email:", emailError);
      // Continue with response even if email fails
    }

    // Generate token
    const token = generateToken(technician);

    console.log("Technician created successfully:", {
      technicianId: technician._id,
      fullName: technician.fullName,
      email: technician.email,
      ownerType: ownerType,
      ownerId: ownerId,
      credentialsEmailSent: "Credentials email sent with login information",
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      status: "success",
      message:
        "Technician account created successfully. Credentials email has been sent.",
      data: {
        technician: {
          id: technician._id,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          status: technician.status,
          owner: technician.owner,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Technician registration error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "error",
        message: "Please check the form for errors",
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {}),
      });
    }

    res.status(500).json({
      status: "error",
      message: "Unable to create technician account. Please try again later.",
    });
  }
});

// LOGIN - Technician login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email and password",
        details: {
          email: !email ? "Email is required" : null,
          password: !password ? "Password is required" : null,
        },
      });
    }

    // Find technician and include password for comparison
    const technician = await Technician.findOne({ email }).select("+password");
    if (!technician) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (technician.status !== "Active") {
      return res.status(401).json({
        status: "error",
        message: "Account is not active. Please contact your administrator.",
      });
    }

    // Compare password
    const isPasswordValid = await technician.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    // Update last login
    await technician.updateLastLogin();

    // Generate token
    const token = generateToken(technician);

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        technician: {
          id: technician._id,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          status: technician.status,
          availabilityStatus: technician.availabilityStatus,
          currentJobs: technician.currentJobs,
          maxJobs: technician.maxJobs,
          owner: technician.owner,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Technician login error:", error);
    res.status(500).json({
      status: "error",
      message: "Login failed. Please try again later.",
    });
  }
});

// GET PROFILE - Get technician profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    const technician = await Technician.findById(req.user.id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Profile retrieved successfully",
      data: {
        technician: {
          id: technician._id,
          firstName: technician.firstName,
          lastName: technician.lastName,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          licenseNumber: technician.licenseNumber,
          licenseExpiry: technician.licenseExpiry,
          experience: technician.experience,
          hourlyRate: technician.hourlyRate,
          availabilityStatus: technician.availabilityStatus,
          currentJobs: technician.currentJobs,
          maxJobs: technician.maxJobs,
          completedJobs: technician.completedJobs,
          averageRating: technician.averageRating,
          totalRatings: technician.totalRatings,
          status: technician.status,
          address: technician.address,
          profileImage: technician.profileImage,
          documents: technician.documents,
          owner: technician.owner,
          createdAt: technician.createdAt,
          lastLogin: technician.lastLogin,
          lastActive: technician.lastActive,
        },
      },
    });
  } catch (error) {
    console.error("Get technician profile error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve profile. Please try again later.",
    });
  }
});

// UPDATE PROFILE - Update technician profile
router.put("/profile", authenticate, async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    const {
      firstName,
      lastName,
      phone,
      licenseNumber,
      licenseExpiry,
      experience,
      hourlyRate,
      address,
    } = req.body;

    const technician = await Technician.findById(req.user.id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Update fields
    if (firstName) technician.firstName = firstName;
    if (lastName) technician.lastName = lastName;
    if (phone) technician.phone = phone;
    if (licenseNumber !== undefined) technician.licenseNumber = licenseNumber;
    if (licenseExpiry !== undefined)
      technician.licenseExpiry = licenseExpiry ? new Date(licenseExpiry) : null;
    if (experience !== undefined) technician.experience = experience;
    if (hourlyRate !== undefined) technician.hourlyRate = hourlyRate;
    if (address) technician.address = address;

    technician.lastUpdated = new Date();
    await technician.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        technician: {
          id: technician._id,
          firstName: technician.firstName,
          lastName: technician.lastName,
          fullName: technician.fullName,
          email: technician.email,
          phone: technician.phone,
          licenseNumber: technician.licenseNumber,
          licenseExpiry: technician.licenseExpiry,
          experience: technician.experience,
          hourlyRate: technician.hourlyRate,
          availabilityStatus: technician.availabilityStatus,
          currentJobs: technician.currentJobs,
          maxJobs: technician.maxJobs,
          completedJobs: technician.completedJobs,
          averageRating: technician.averageRating,
          totalRatings: technician.totalRatings,
          status: technician.status,
          address: technician.address,
          profileImage: technician.profileImage,
          documents: technician.documents,
          owner: technician.owner,
          createdAt: technician.createdAt,
          lastLogin: technician.lastLogin,
          lastActive: technician.lastActive,
        },
      },
    });
  } catch (error) {
    console.error("Update technician profile error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "error",
        message: "Please check the form for errors",
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {}),
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to update profile. Please try again later.",
    });
  }
});

// CHANGE PASSWORD - Change technician password
router.put("/change-password", authenticate, async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please provide current and new password",
      });
    }

    const technician = await Technician.findById(req.user.id).select(
      "+password"
    );
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await technician.comparePassword(
      currentPassword
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        status: "error",
        message: "Current password is incorrect",
      });
    }

    // Update password
    technician.password = newPassword;
    await technician.save();

    res.status(200).json({
      status: "success",
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to change password. Please try again later.",
    });
  }
});

// UPLOAD PROFILE IMAGE - Upload technician profile image
router.post("/profile/image", authenticate, fileUpload.single('profileImage'), async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Please select an image to upload",
      });
    }

    // Validate file type (additional check)
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid file type. Only JPG, JPEG, and PNG images are allowed.",
      });
    }

    const technician = await Technician.findById(req.user.id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    try {
      // Delete old profile image if exists
      if (technician.profileImage && technician.profileImage.cloudinaryId) {
        await fileUpload.deleteFromCloudinary(technician.profileImage.cloudinaryId);
      }

      // Upload new image to Cloudinary
      const cloudinaryResult = await fileUpload.uploadToCloudinary(req.file.buffer, {
        public_id: `technician-${req.user.id}-profile-${Date.now()}`,
        folder: "technician-profiles",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" },
          { fetch_format: "auto" }
        ]
      });

      // Update technician with new profile image
      technician.profileImage = {
        cloudinaryId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
        uploadDate: new Date()
      };
      
      technician.lastUpdated = new Date();
      await technician.save();

      res.status(200).json({
        status: "success",
        message: "Profile image updated successfully",
        data: {
          profileImage: technician.profileImage
        }
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      res.status(500).json({
        status: "error",
        message: "Failed to upload image. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Upload profile image error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to upload profile image. Please try again later.",
    });
  }
});

// DELETE PROFILE IMAGE - Remove technician profile image
router.delete("/profile/image", authenticate, async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    const technician = await Technician.findById(req.user.id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    if (!technician.profileImage || !technician.profileImage.cloudinaryId) {
      return res.status(400).json({
        status: "error",
        message: "No profile image to delete",
      });
    }

    try {
      // Delete image from Cloudinary
      await fileUpload.deleteFromCloudinary(technician.profileImage.cloudinaryId);
      
      // Remove profile image from technician
      technician.profileImage = {
        cloudinaryId: null,
        cloudinaryUrl: null,
        uploadDate: null
      };
      
      technician.lastUpdated = new Date();
      await technician.save();

      res.status(200).json({
        status: "success",
        message: "Profile image deleted successfully",
      });
    } catch (deleteError) {
      console.error("Cloudinary delete error:", deleteError);
      res.status(500).json({
        status: "error",
        message: "Failed to delete image. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Delete profile image error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete profile image. Please try again later.",
    });
  }
});

// FORGOT PASSWORD - Send password reset OTP
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    const technician = await Technician.findOne({ email });
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "No technician found with this email address",
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update technician with OTP
    technician.resetPasswordOTP = otp;
    technician.resetPasswordOTPExpires = otpExpiry;
    technician.resetPasswordOTPAttempts = 0;
    await technician.save();

    // Send password reset email
    try {
      await emailService.sendTechnicianPasswordResetOTP(technician, otp);
      console.log("Password reset OTP sent successfully to technician:", {
        technicianId: technician._id,
        email: technician.email,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      // Don't fail the request if email fails
    }

    res.status(200).json({
      status: "success",
      message: "Password reset OTP sent to your email",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send password reset OTP. Please try again later.",
    });
  }
});

// RESET PASSWORD - Reset password with OTP
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Please provide email, OTP, and new password",
      });
    }

    const technician = await Technician.findOne({ email });
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "No technician found with this email address",
      });
    }

    // Check if OTP is valid and not expired
    if (
      !technician.resetPasswordOTP ||
      technician.resetPasswordOTP !== otp ||
      technician.resetPasswordOTPExpires < new Date()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP",
      });
    }

    // Update password and clear OTP
    technician.password = newPassword;
    technician.resetPasswordOTP = null;
    technician.resetPasswordOTPExpires = null;
    technician.resetPasswordOTPAttempts = 0;
    await technician.save();

    res.status(200).json({
      status: "success",
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to reset password. Please try again later.",
    });
  }
});

// GET JOBS - Get technician's assigned jobs
router.get("/jobs", authenticate, async (req, res) => {
  try {
    // Check if user is a technician
    if (req.user.userType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Technician account required.",
      });
    }

    const technician = await Technician.findById(req.user.id).populate({
      path: "assignedJobs.jobId",
      populate: {
        path: "property",
        select: "address",
      },
    });

    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Jobs retrieved successfully",
      data: {
        jobSummary: technician.getJobSummary(),
        assignedJobs: technician.assignedJobs,
      },
    });
  } catch (error) {
    console.error("Get technician jobs error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve jobs. Please try again later.",
    });
  }
});

export default router;
