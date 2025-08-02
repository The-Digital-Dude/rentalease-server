import express from "express";
import mongoose from "mongoose";
import PropertyManager from "../models/PropertyManager.js";
import jwt from "jsonwebtoken";
import emailService from "../services/email.service.js";
import {
  generateOTP,
  generateOTPExpiration,
  isOTPExpired,
  hashOTP,
  verifyOTP,
} from "../utils/otpGenerator.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Register Property Manager (Only Agency and SuperUser can create Property Managers)
router.post("/register", authenticate, async (req, res) => {
  try {
    // Check if user has permission to create property managers
    if (!req.superUser && !req.agency) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only Super Users and Agencies can create Property Managers.",
      });
    }

    console.log(req.agency, "req agency");

    const { firstName, lastName, email, phone, password, address } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        status: "error",
        message:
          "First name, last name, email, phone, and password are required",
      });
    }

    // Check if property manager already exists by email
    const existingPropertyManager = await PropertyManager.findOne({
      email: email.toLowerCase(),
    });
    if (existingPropertyManager) {
      return res.status(400).json({
        status: "error",
        message: "Property Manager with this email already exists",
      });
    }

    // Determine owner information
    let owner;
    if (req.superUser) {
      owner = {
        ownerType: "SuperUser",
        ownerId: req.superUser.id,
      };
    } else if (req.agency) {
      owner = {
        ownerType: "Agency",
        ownerId: req.agency.id,
      };
    }

    // Create new property manager
    const propertyManager = new PropertyManager({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      address,
      owner,
      status: "Pending", // Default status, can be activated by admin
    });

    await propertyManager.save();

    // Send credentials email to property manager
    try {
      await emailService.sendPropertyManagerCredentialsEmail(
        {
          email: propertyManager.email,
          fullName: propertyManager.fullName,
        },
        password,
        process.env.FRONTEND_URL || "https://rentalease-crm.com/login"
      );

      console.log("Property Manager credentials email sent successfully:", {
        propertyManagerId: propertyManager._id,
        email: propertyManager.email,
        fullName: propertyManager.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error(
        "Failed to send property manager credentials email:",
        emailError
      );
      // Continue with response even if email fails
    }

    console.log("Property Manager created successfully:", {
      propertyManagerId: propertyManager._id,
      fullName: propertyManager.fullName,
      email: propertyManager.email,
      createdBy: req.superUser ? req.superUser.email : req.agency.email,
      credentialsEmailSent: "Credentials email sent with login information",
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      status: "success",
      message:
        "Property Manager registered successfully. Credentials email has been sent.",
      data: {
        propertyManager: {
          id: propertyManager._id,
          firstName: propertyManager.firstName,
          lastName: propertyManager.lastName,
          fullName: propertyManager.fullName,
          email: propertyManager.email,
          phone: propertyManager.phone,
          address: propertyManager.address,
          status: propertyManager.status,
          owner: propertyManager.owner,
          assignedProperties: propertyManager.assignedProperties,
          createdAt: propertyManager.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Property Manager registration error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during registration",
    });
  }
});

// Login Property Manager
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Find property manager and select password
    const propertyManager = await PropertyManager.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!propertyManager) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Check if account is active
    if (!propertyManager.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Check password
    const isPasswordValid = await propertyManager.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Update last login
    await propertyManager.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: propertyManager._id,
        type: "propertyManager",
        email: propertyManager.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        token,
        propertyManager: {
          id: propertyManager._id,
          firstName: propertyManager.firstName,
          lastName: propertyManager.lastName,
          fullName: propertyManager.fullName,
          email: propertyManager.email,
          phone: propertyManager.phone,
          address: propertyManager.address,
          status: propertyManager.status,
          availabilityStatus: propertyManager.availabilityStatus,
          assignedProperties: propertyManager.assignedProperties,
          owner: propertyManager.owner,
          lastLogin: propertyManager.lastLogin,
          createdAt: propertyManager.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Property Manager login error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login",
    });
  }
});

// Forgot Password - Property Manager
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({
      email: email.toLowerCase(),
    });

    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found with this email address",
      });
    }

    // Check if account is active
    if (!propertyManager.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiration = generateOTPExpiration();
    const hashedOTP = hashOTP(otp);

    // Update property manager with OTP details
    propertyManager.resetPasswordOTP = hashedOTP;
    propertyManager.resetPasswordOTPExpires = otpExpiration;
    propertyManager.resetPasswordOTPAttempts = 0;

    await propertyManager.save();

    // Send OTP email
    try {
      await emailService.sendPropertyManagerPasswordResetOTP(
        propertyManager,
        otp,
        10
      );

      console.log("Property Manager password reset OTP sent successfully:", {
        propertyManagerId: propertyManager._id,
        email: propertyManager.email,
        fullName: propertyManager.fullName,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error(
        "Failed to send property manager password reset OTP:",
        emailError
      );

      // Reset OTP fields on email failure
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(500).json({
        status: "error",
        message: "Failed to send password reset email. Please try again later.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Password reset OTP has been sent to your email address",
      data: {
        email: propertyManager.email,
      },
    });
  } catch (error) {
    console.error("Property Manager forgot password error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing password reset request",
    });
  }
});

// Reset Password - Property Manager
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Email, OTP, and new password are required",
      });
    }

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({
      email: email.toLowerCase(),
    });

    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found with this email address",
      });
    }

    // Check if OTP exists and is not expired
    if (
      !propertyManager.resetPasswordOTP ||
      !propertyManager.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        status: "error",
        message: "No password reset request found. Please request a new OTP.",
      });
    }

    if (isOTPExpired(propertyManager.resetPasswordOTPExpires)) {
      // Clear expired OTP
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new password reset.",
      });
    }

    // Check OTP attempts
    if (propertyManager.resetPasswordOTPAttempts >= 3) {
      // Clear OTP after max attempts
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message:
          "Too many failed attempts. Please request a new password reset.",
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, propertyManager.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempts
      propertyManager.resetPasswordOTPAttempts += 1;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message: `Invalid OTP. ${
          3 - propertyManager.resetPasswordOTPAttempts
        } attempts remaining.`,
      });
    }

    // Update the property manager's password
    propertyManager.password = newPassword; // This will be hashed by the pre-save middleware
    propertyManager.resetPasswordOTP = null;
    propertyManager.resetPasswordOTPExpires = null;
    propertyManager.resetPasswordOTPAttempts = 0;

    await propertyManager.save();

    console.log("Property Manager password reset successful:", {
      propertyManagerId: propertyManager._id,
      email: propertyManager.email,
      fullName: propertyManager.fullName,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message:
        "Password has been reset successfully. You can now login with your new password.",
      data: {
        email: propertyManager.email,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Property Manager reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while resetting password",
    });
  }
});

// Verify OTP Only (without password reset) - Property Manager
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Email and OTP are required",
      });
    }

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({
      email: email.toLowerCase(),
    });

    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found with this email address",
      });
    }

    // Check if OTP exists and is not expired
    if (
      !propertyManager.resetPasswordOTP ||
      !propertyManager.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        status: "error",
        message: "No OTP request found. Please request a new OTP.",
      });
    }

    if (isOTPExpired(propertyManager.resetPasswordOTPExpires)) {
      // Clear expired OTP
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Check OTP attempts
    if (propertyManager.resetPasswordOTPAttempts >= 3) {
      // Clear OTP after max attempts
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, propertyManager.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempts
      propertyManager.resetPasswordOTPAttempts += 1;
      await propertyManager.save();

      return res.status(400).json({
        status: "error",
        message: `Invalid OTP. ${
          3 - propertyManager.resetPasswordOTPAttempts
        } attempts remaining.`,
      });
    }

    console.log("Property Manager OTP verified successfully:", {
      propertyManagerId: propertyManager._id,
      email: propertyManager.email,
      fullName: propertyManager.fullName,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "OTP verified successfully",
      data: {
        email: propertyManager.email,
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Property Manager verify OTP error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while verifying OTP",
    });
  }
});

// Get Property Manager Profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    // Check if user is a property manager
    if (!req.propertyManager) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Property Manager privileges required.",
      });
    }

    // Property manager info is already available in req.propertyManager from middleware
    const propertyManager = await PropertyManager.findById(
      req.propertyManager.id
    );

    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        propertyManager: {
          id: propertyManager._id,
          firstName: propertyManager.firstName,
          lastName: propertyManager.lastName,
          fullName: propertyManager.fullName,
          email: propertyManager.email,
          phone: propertyManager.phone,
          address: propertyManager.address,
          status: propertyManager.status,
          availabilityStatus: propertyManager.availabilityStatus,
          assignedProperties: propertyManager.assignedProperties,
          owner: propertyManager.owner,
          lastLogin: propertyManager.lastLogin,
          createdAt: propertyManager.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get property manager profile error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching profile",
    });
  }
});

// Update Property Manager Profile
router.patch("/profile", authenticate, async (req, res) => {
  try {
    // Check if user is a property manager
    if (!req.propertyManager) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Property Manager privileges required.",
      });
    }

    const { firstName, lastName, phone, address, availabilityStatus } =
      req.body;

    // Find property manager
    const propertyManager = await PropertyManager.findById(
      req.propertyManager.id
    );
    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found",
      });
    }

    // Store original values for logging
    const originalValues = {
      firstName: propertyManager.firstName,
      lastName: propertyManager.lastName,
      phone: propertyManager.phone,
      address: propertyManager.address,
      availabilityStatus: propertyManager.availabilityStatus,
    };

    // Validate and update fields if provided
    if (firstName !== undefined) {
      if (!firstName || firstName.trim().length < 2) {
        return res.status(400).json({
          status: "error",
          message: "First name must be at least 2 characters long",
        });
      }
      propertyManager.firstName = firstName.trim();
    }

    if (lastName !== undefined) {
      if (!lastName || lastName.trim().length < 2) {
        return res.status(400).json({
          status: "error",
          message: "Last name must be at least 2 characters long",
        });
      }
      propertyManager.lastName = lastName.trim();
    }

    if (phone !== undefined) {
      if (!phone || !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        return res.status(400).json({
          status: "error",
          message: "Please enter a valid phone number",
        });
      }
      propertyManager.phone = phone.trim();
    }

    if (address !== undefined) {
      propertyManager.address = address;
    }

    if (availabilityStatus !== undefined) {
      const validStatuses = ["Available", "Busy", "Unavailable", "On Leave"];
      if (!validStatuses.includes(availabilityStatus)) {
        return res.status(400).json({
          status: "error",
          message: "Please select a valid availability status",
        });
      }
      propertyManager.availabilityStatus = availabilityStatus;
    }

    // Update timestamp
    propertyManager.lastUpdated = new Date();

    // Save updated property manager
    await propertyManager.save();

    console.log("Property Manager profile updated:", {
      propertyManagerId: propertyManager._id,
      updatedBy: propertyManager.email,
      originalValues,
      newValues: {
        firstName: propertyManager.firstName,
        lastName: propertyManager.lastName,
        phone: propertyManager.phone,
        address: propertyManager.address,
        availabilityStatus: propertyManager.availabilityStatus,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        propertyManager: {
          id: propertyManager._id,
          firstName: propertyManager.firstName,
          lastName: propertyManager.lastName,
          fullName: propertyManager.fullName,
          email: propertyManager.email,
          phone: propertyManager.phone,
          address: propertyManager.address,
          status: propertyManager.status,
          availabilityStatus: propertyManager.availabilityStatus,
          assignedProperties: propertyManager.assignedProperties,
          owner: propertyManager.owner,
          lastLogin: propertyManager.lastLogin,
          createdAt: propertyManager.createdAt,
          lastUpdated: propertyManager.lastUpdated,
        },
      },
    });
  } catch (error) {
    console.error("Update property manager profile error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred while updating profile",
    });
  }
});

export default router;
