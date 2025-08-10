import express from "express";
import PropertyManager from "../models/PropertyManager.js";
import {
  authenticate,
  authenticateAgency,
  authenticateSuperUser,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Get all PropertyManagers (Agency/SuperUser only)
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    // Access already validated by authenticateUserTypes middleware

    const {
      page = 1,
      limit = 10,
      status,
      availabilityStatus,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build filter object
    const filter = {};

    // Agency can only see their own PropertyManagers
    if (req.agency) {
      console.log(req.agency, "req agency....");
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    if (status) {
      filter.status = status;
    }

    if (availabilityStatus) {
      filter.availabilityStatus = availabilityStatus;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute query
    const propertyManagers = await PropertyManager.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password -otp -otpExpiry");

    const total = await PropertyManager.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Calculate summary statistics
    const summary = {
      total: total,
      active: await PropertyManager.countDocuments({
        ...filter,
        status: "Active",
      }),
      inactive: await PropertyManager.countDocuments({
        ...filter,
        status: "Inactive",
      }),
      available: await PropertyManager.countDocuments({
        ...filter,
        availabilityStatus: "Available",
      }),
      busy: await PropertyManager.countDocuments({
        ...filter,
        availabilityStatus: "Busy",
      }),
      unavailable: await PropertyManager.countDocuments({
        ...filter,
        availabilityStatus: "Unavailable",
      }),
    };

    res.status(200).json({
      success: true,
      data: {
        propertyManagers,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: totalPages,
        },
        summary,
      },
    });
  } catch (error) {
    console.error("Error fetching PropertyManagers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch PropertyManagers",
      error: error.message,
    });
  }
});

// Get PropertyManager by ID (Agency/SuperUser only)
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency and SuperUser can view PropertyManager details.",
      });
    }

    const { id } = req.params;

    // Build filter
    const filter = { _id: id };

    // Agency can only see their own PropertyManagers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    const propertyManager = await PropertyManager.findOne(filter)
      .select("-password -otp -otpExpiry")
      .populate(
        "assignedProperties.propertyId",
        "address propertyType region isActive"
      );

    if (!propertyManager) {
      return res.status(404).json({
        success: false,
        message: "PropertyManager not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        propertyManager,
      },
    });
  } catch (error) {
    console.error("Error fetching PropertyManager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch PropertyManager",
      error: error.message,
    });
  }
});

// Update PropertyManager status (Agency/SuperUser only)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency and SuperUser can update PropertyManager status.",
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["Active", "Inactive", "Suspended"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required (Active, Inactive, Suspended)",
      });
    }

    // Build filter
    const filter = { _id: id };

    // Agency can only update their own PropertyManagers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    const propertyManager = await PropertyManager.findOneAndUpdate(
      filter,
      { status },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpiry");

    if (!propertyManager) {
      return res.status(404).json({
        success: false,
        message: "PropertyManager not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "PropertyManager status updated successfully",
      data: {
        propertyManager,
      },
    });
  } catch (error) {
    console.error("Error updating PropertyManager status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update PropertyManager status",
      error: error.message,
    });
  }
});

// Update PropertyManager availability status (Agency/SuperUser only)
router.patch("/:id/availability", authenticate, async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency and SuperUser can update PropertyManager availability.",
      });
    }

    const { id } = req.params;
    const { availabilityStatus } = req.body;

    if (
      !availabilityStatus ||
      !["Available", "Busy", "Unavailable", "On Leave"].includes(
        availabilityStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Valid availability status is required (Available, Busy, Unavailable, On Leave)",
      });
    }

    // Build filter
    const filter = { _id: id };

    // Agency can only update their own PropertyManagers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    const propertyManager = await PropertyManager.findOneAndUpdate(
      filter,
      { availabilityStatus },
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpiry");

    if (!propertyManager) {
      return res.status(404).json({
        success: false,
        message: "PropertyManager not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "PropertyManager availability updated successfully",
      data: {
        propertyManager,
      },
    });
  } catch (error) {
    console.error("Error updating PropertyManager availability:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update PropertyManager availability",
      error: error.message,
    });
  }
});

// Delete PropertyManager (Agency/SuperUser only)
router.delete("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency and SuperUser can delete PropertyManagers.",
      });
    }

    const { id } = req.params;

    // Build filter
    const filter = { _id: id };

    // Agency can only delete their own PropertyManagers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    const propertyManager = await PropertyManager.findOne(filter);

    if (!propertyManager) {
      return res.status(404).json({
        success: false,
        message: "PropertyManager not found",
      });
    }

    // Check if PropertyManager has any active assignments
    if (propertyManager.assignedProperties.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete PropertyManager with active property assignments. Please remove all assignments first.",
      });
    }

    await PropertyManager.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "PropertyManager deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting PropertyManager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete PropertyManager",
      error: error.message,
    });
  }
});

export default router;
