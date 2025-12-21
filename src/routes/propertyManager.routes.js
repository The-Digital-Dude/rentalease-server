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
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    // Access already validated by authenticateUserTypes middleware

    const {
      page = 1,
      limit = 10,
      status,
      availabilityStatus,
      search,
      agencyId,
      sortBy = "createdAt",
      sortOrder = "desc",
      includeArchived = false,
      onlyArchived = false,
    } = req.query;

    // Build filter object
    const filter = {};

    // Agency can only see their own PropertyManagers
    if (req.agency) {
      console.log(req.agency, "req agency....");
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    } else if (agencyId) {
      // Super users and team members can filter by specific agency
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = agencyId;
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

    // Handle archived filter
    if (onlyArchived === "true" || onlyArchived === true) {
      filter.isArchived = true;
    } else if (includeArchived !== "true" && includeArchived !== true) {
      // Default: exclude archived items
      filter.isArchived = { $ne: true };
    }
    // If includeArchived is true, don't filter by isArchived (show all)

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    // Execute query
    const propertyManagers = await PropertyManager.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select("-password -otp -otpExpiry")
      .populate("owner.ownerId", "companyName email phone");

    const total = await PropertyManager.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Calculate summary statistics
    // For summary, we need to count without archived filter to get accurate totals
    const baseFilter = { ...filter };
    delete baseFilter.isArchived;
    
    const summary = {
      total: total,
      active: await PropertyManager.countDocuments({
        ...baseFilter,
        status: "Active",
        isArchived: { $ne: true },
      }),
      inactive: await PropertyManager.countDocuments({
        ...baseFilter,
        status: "Inactive",
        isArchived: { $ne: true },
      }),
      available: await PropertyManager.countDocuments({
        ...baseFilter,
        availabilityStatus: "Available",
        isArchived: { $ne: true },
      }),
      busy: await PropertyManager.countDocuments({
        ...baseFilter,
        availabilityStatus: "Busy",
        isArchived: { $ne: true },
      }),
      unavailable: await PropertyManager.countDocuments({
        ...baseFilter,
        availabilityStatus: "Unavailable",
        isArchived: { $ne: true },
      }),
      archived: await PropertyManager.countDocuments({
        ...baseFilter,
        isArchived: true,
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

// Update PropertyManager (Agency/SuperUser/TeamMember only)
router.patch("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, address } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, email, and phone are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    // Build filter object
    const filter = { _id: id };

    // Agency can only update their own PropertyManagers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id.toString();
    }

    // Check if property manager exists and user has permission
    const existingPropertyManager = await PropertyManager.findOne(filter);
    if (!existingPropertyManager) {
      return res.status(404).json({
        success: false,
        message: "PropertyManager not found or you don't have permission to update it",
      });
    }

    // Check if email is already in use by another property manager
    const emailExists = await PropertyManager.findOne({
      email,
      _id: { $ne: id }
    });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: "Email address is already in use by another property manager",
      });
    }

    // Prepare update data
    const updateData = {
      firstName,
      lastName,
      email,
      phone,
      updatedAt: new Date()
    };

    // Update address if provided
    if (address) {
      updateData.address = {
        street: address.street || existingPropertyManager.address?.street,
        suburb: address.suburb || existingPropertyManager.address?.suburb,
        state: address.state || existingPropertyManager.address?.state,
        postcode: address.postcode || existingPropertyManager.address?.postcode,
      };

      // Create fullAddress if all components are available
      if (updateData.address.street && updateData.address.suburb && updateData.address.state && updateData.address.postcode) {
        updateData.address.fullAddress = `${updateData.address.street}, ${updateData.address.suburb}, ${updateData.address.state} ${updateData.address.postcode}`;
      }
    }

    const propertyManager = await PropertyManager.findOneAndUpdate(
      filter,
      updateData,
      { new: true, runValidators: true }
    ).select("-password -otp -otpExpiry");

    res.status(200).json({
      success: true,
      message: "PropertyManager updated successfully",
      data: {
        propertyManager,
      },
    });
  } catch (error) {
    console.error("Error updating PropertyManager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update PropertyManager",
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

// Archive PropertyManager (Agency/SuperUser only)
router.delete("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser && !req.teamMember) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency, SuperUser, and TeamMember can archive PropertyManagers.",
      });
    }

    const { id } = req.params;

    // Build filter
    const filter = { _id: id };

    // Agency can only archive their own PropertyManagers
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

    // Check if already archived
    if (propertyManager.isArchived) {
      return res.status(400).json({
        success: false,
        message: "PropertyManager is already archived",
      });
    }

    // Archive the property manager instead of deleting
    propertyManager.isArchived = true;
    propertyManager.archivedAt = new Date();
    await propertyManager.save();

    res.status(200).json({
      success: true,
      message: "PropertyManager archived successfully",
      data: {
        propertyManagerId: propertyManager._id,
        archivedAt: propertyManager.archivedAt,
      },
    });
  } catch (error) {
    console.error("Error archiving PropertyManager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive PropertyManager",
      error: error.message,
    });
  }
});

// Restore Archived PropertyManager (Agency/SuperUser only)
router.post("/:id/restore", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    // Check if user is Agency or SuperUser
    if (!req.agency && !req.superUser && !req.teamMember) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Agency, SuperUser, and TeamMember can restore PropertyManagers.",
      });
    }

    const { id } = req.params;

    // Build filter
    const filter = { _id: id };

    // Agency can only restore their own PropertyManagers
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

    // Check if property manager is archived
    if (!propertyManager.isArchived) {
      return res.status(400).json({
        success: false,
        message: "PropertyManager is not archived",
      });
    }

    // Restore the property manager
    propertyManager.isArchived = false;
    propertyManager.archivedAt = null;
    await propertyManager.save();

    res.status(200).json({
      success: true,
      message: "PropertyManager restored successfully",
      data: {
        propertyManager: {
          id: propertyManager._id,
          firstName: propertyManager.firstName,
          lastName: propertyManager.lastName,
          email: propertyManager.email,
          status: propertyManager.status,
        },
        restoredAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error restoring PropertyManager:", error);
    res.status(500).json({
      success: false,
      message: "Failed to restore PropertyManager",
      error: error.message,
    });
  }
});

export default router;
