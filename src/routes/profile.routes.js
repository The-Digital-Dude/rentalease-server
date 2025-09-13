import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import fileUpload from "../services/fileUpload.service.js";
import SuperUser from "../models/SuperUser.js";
import Agency from "../models/Agency.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";

const router = express.Router();

// Helper function to get the appropriate model based on user type
const getUserModel = (userType) => {
  const models = {
    SuperUser: SuperUser,
    superUser: SuperUser, // Add lowercase version too
    Agency: Agency,
    agency: Agency,
    Technician: Technician,
    technician: Technician,
    PropertyManager: PropertyManager,
    propertyManager: PropertyManager,
    property_manager: PropertyManager,
  };
  return models[userType] || null;
};

// GET PROFILE - Get current user's profile
router.get("/profile", authenticate, async (req, res) => {
  try {
    console.log("Profile route - req.user:", req.user);
    const userType = req.user.userType || req.user.type;
    const Model = getUserModel(userType);
    if (!Model) {
      console.log("No model found for userType:", userType);
      return res.status(400).json({
        status: "error",
        message: "Invalid user type",
      });
    }

    const user = await Model.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Normalize userType for consistent frontend handling
    const normalizedUserType = userType === "superUser" ? "SuperUser" : userType;

    res.status(200).json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name || user.agency_name || user.technician_name || user.propertyManager_name,
          email: user.email,
          userType: normalizedUserType,
          avatar: user.avatar || user.profileImage?.url || null,
          phone: user.phone || user.phone_number || null,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch profile",
    });
  }
});

// UPDATE PROFILE - Update user's basic information
router.patch("/profile", authenticate, async (req, res) => {
  try {
    const userType = req.user.userType || req.user.type;
    const Model = getUserModel(userType);
    if (!Model) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user type",
      });
    }

    const { name, phone } = req.body;
    const updateData = {};

    // Handle name update based on user type
    if (name) {
      switch (userType) {
        case "SuperUser":
          updateData.name = name;
          break;
        case "Agency":
          updateData.agency_name = name;
          break;
        case "Technician":
          updateData.technician_name = name;
          break;
        case "PropertyManager":
          updateData.propertyManager_name = name;
          break;
      }
    }

    // Handle phone update based on user type
    if (phone) {
      if (userType === "SuperUser" || userType === "superUser") {
        updateData.phone = phone;
      } else {
        updateData.phone_number = phone;
      }
    }

    const user = await Model.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Normalize userType for consistent frontend handling
    const normalizedUserType = userType === "superUser" ? "SuperUser" : userType;

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name || user.agency_name || user.technician_name || user.propertyManager_name,
          email: user.email,
          userType: normalizedUserType,
          avatar: user.avatar || user.profileImage?.url || null,
          phone: user.phone || user.phone_number || null,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update profile",
    });
  }
});

// UPLOAD AVATAR - Upload or update user avatar
router.post("/profile/avatar", authenticate, fileUpload.single("avatar"), async (req, res) => {
  try {
    const userType = req.user.userType || req.user.type;
    const Model = getUserModel(userType);
    if (!Model) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user type",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "Please select an image to upload",
      });
    }

    // Validate file type
    const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid file type. Only JPG, JPEG, PNG, and WebP images are allowed.",
      });
    }

    const user = await Model.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Delete old avatar if exists
    if (user.avatar && user.avatar.cloudinaryId) {
      await fileUpload.deleteFromCloudinary(user.avatar.cloudinaryId);
    } else if (user.profileImage && user.profileImage.cloudinaryId) {
      await fileUpload.deleteFromCloudinary(user.profileImage.cloudinaryId);
    }

    // Upload new avatar to Cloudinary
    const cloudinaryResult = await fileUpload.uploadToCloudinary(req.file.buffer, {
      public_id: `${userType.toLowerCase()}-${req.user.id}-avatar-${Date.now()}`,
      folder: "user-avatars",
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    // Update user with new avatar
    const avatarData = {
      url: cloudinaryResult.secure_url,
      cloudinaryId: cloudinaryResult.public_id,
    };

    // Update based on user type model structure
    if (req.user.userType === "Technician") {
      user.profileImage = avatarData;
    } else {
      user.avatar = avatarData;
    }

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Avatar uploaded successfully",
      data: {
        avatar: cloudinaryResult.secure_url,
      },
    });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to upload avatar",
    });
  }
});

// DELETE AVATAR - Remove user's avatar
router.delete("/profile/avatar", authenticate, async (req, res) => {
  try {
    const userType = req.user.userType || req.user.type;
    const Model = getUserModel(userType);
    if (!Model) {
      return res.status(400).json({
        status: "error",
        message: "Invalid user type",
      });
    }

    const user = await Model.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    // Delete avatar from Cloudinary if exists
    if (user.avatar && user.avatar.cloudinaryId) {
      await fileUpload.deleteFromCloudinary(user.avatar.cloudinaryId);
      user.avatar = null;
    } else if (user.profileImage && user.profileImage.cloudinaryId) {
      await fileUpload.deleteFromCloudinary(user.profileImage.cloudinaryId);
      user.profileImage = null;
    }

    await user.save();

    res.status(200).json({
      status: "success",
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete avatar",
    });
  }
});

export default router;