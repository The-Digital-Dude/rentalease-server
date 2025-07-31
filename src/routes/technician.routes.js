import express from "express";
import mongoose from "mongoose";
import Technician from "../models/Technician.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
} from "../middleware/auth.middleware.js";
import Job from "../models/Job.js"; // Added import for Job model

const router = express.Router();

// Helper function to get owner info based on user type
const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: "SuperUser",
      ownerId: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      ownerType: "Agency",
      ownerId: req.agency.id,
    };
  }
  return null;
};

// Helper function to validate owner access
const validateOwnerAccess = (technician, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;

  // Super users can access any technician
  if (ownerInfo.ownerType === "SuperUser") {
    return true;
  }

  // For other users, check if they own the technician
  return (
    technician.owner.ownerType === ownerInfo.ownerType &&
    technician.owner.ownerId.toString() === ownerInfo.ownerId.toString()
  );
};

// CREATE - Add new technician
router.post("/", authenticate, async (req, res) => {
  console.log(req.body, "body");
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
      maxJobs,
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !password) {
      return res.status(400).json({
        status: "error",
        message: "Required fields: firstName, lastName, email, phone, password",
      });
    }

    // Get owner information
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine owner information",
      });
    }

    // Check if technician with same email already exists for this owner
    const existingTechnician = await Technician.findOne({
      email: email.toLowerCase(),
      "owner.ownerType": ownerInfo.ownerType,
      "owner.ownerId": ownerInfo.ownerId,
    });

    if (existingTechnician) {
      return res.status(400).json({
        status: "error",
        message: "Technician with this email already exists",
      });
    }

    // Create new technician
    const technician = new Technician({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      licenseNumber,
      licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      experience: experience || 0,
      hourlyRate: hourlyRate || 0,
      maxJobs: maxJobs || 4,
      address,
      owner: ownerInfo,
    });

    await technician.save();

    res.status(201).json({
      status: "success",
      message: "Technician created successfully",
      data: {
        technician: technician.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Create technician error:", error);
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
      message: "Failed to create technician",
    });
  }
});

// READ - Get all technicians for the authenticated user
router.get("/", authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine owner information",
      });
    }

    // Query parameters for filtering
    const {
      status,
      availabilityStatus,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    let query = {};

    // If super user, show all technicians. If agency, show only their technicians
    if (ownerInfo.ownerType === "SuperUser") {
      // Super users can see all technicians
      query = {};
    } else {
      // Agencies can only see their own technicians
      query = {
        "owner.ownerType": ownerInfo.ownerType,
        "owner.ownerId": ownerInfo.ownerId,
      };
    }

    // Add filters
    if (status) query.status = status;
    if (availabilityStatus) query.availabilityStatus = availabilityStatus;

    // Add search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { licenseNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const technicians = await Technician.find(query)
      .select("-password")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalTechnicians = await Technician.countDocuments(query);

    // Get status counts for dashboard
    let statusCountsMatch = {};
    if (ownerInfo.ownerType === "SuperUser") {
      // Super users can see all technicians
      statusCountsMatch = {};
    } else {
      // Agencies can only see their own technicians
      statusCountsMatch = {
        "owner.ownerType": ownerInfo.ownerType,
        "owner.ownerId": new mongoose.Types.ObjectId(ownerInfo.ownerId),
      };
    }

    const statusCounts = await Technician.aggregate([
      {
        $match: statusCountsMatch,
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Technicians retrieved successfully",
      data: {
        technicians: technicians.map((technician) => technician.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalTechnicians / parseInt(limit)),
          totalItems: totalTechnicians,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + technicians.length < totalTechnicians,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalTechnicians,
        },
      },
    });
  } catch (error) {
    console.error("Get technicians error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve technicians",
    });
  }
});

// READ - Get single technician by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const technician = await Technician.findById(id).select("-password");
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if user has access to this technician
    if (!validateOwnerAccess(technician, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Technician retrieved successfully",
      data: {
        technician: technician.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Get technician by ID error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to retrieve technician",
    });
  }
});

// UPDATE - Update technician
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find technician
    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if user has access to this technician
    if (!validateOwnerAccess(technician, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.owner;
    delete updateData.createdAt;
    delete updateData._id;

    // Handle email uniqueness if email is being updated
    if (updateData.email && updateData.email !== technician.email) {
      const ownerInfo = getOwnerInfo(req);
      const existingTechnician = await Technician.findOne({
        email: updateData.email.toLowerCase(),
        "owner.ownerType": ownerInfo.ownerType,
        "owner.ownerId": ownerInfo.ownerId,
        _id: { $ne: id },
      });

      if (existingTechnician) {
        return res.status(400).json({
          status: "error",
          message: "Technician with this email already exists",
        });
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Handle date fields
    if (updateData.licenseExpiry) {
      updateData.licenseExpiry = new Date(updateData.licenseExpiry);
    }

    // Update technician
    const updatedTechnician = await Technician.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    res.status(200).json({
      status: "success",
      message: "Technician updated successfully",
      data: {
        technician: updatedTechnician.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Update technician error:", error);
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
      message: "Failed to update technician",
    });
  }
});

// DELETE - Delete technician
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if user has access to this technician
    if (!validateOwnerAccess(technician, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    // Check if technician has active jobs
    if (technician.currentJobs > 0) {
      return res.status(400).json({
        status: "error",
        message: "Cannot delete technician with active jobs",
      });
    }

    await Technician.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Technician deleted successfully",
    });
  } catch (error) {
    console.error("Delete technician error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete technician",
    });
  }
});

// PATCH - Update technician status
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required",
      });
    }

    const validStatuses = ["Active", "Inactive", "Suspended", "Pending"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if user has access to this technician
    if (!validateOwnerAccess(technician, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    technician.status = status;
    await technician.save();

    res.status(200).json({
      status: "success",
      message: "Technician status updated successfully",
      data: {
        technician: technician.getSummary(),
      },
    });
  } catch (error) {
    console.error("Update technician status error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update technician status",
    });
  }
});

// PATCH - Update technician availability
router.patch("/:id/availability", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { availabilityStatus } = req.body;

    if (!availabilityStatus) {
      return res.status(400).json({
        status: "error",
        message: "Availability status is required",
      });
    }

    const validStatuses = ["Available", "Busy", "Unavailable", "On Leave"];
    if (!validStatuses.includes(availabilityStatus)) {
      return res.status(400).json({
        status: "error",
        message: `Availability status must be one of: ${validStatuses.join(
          ", "
        )}`,
      });
    }

    const technician = await Technician.findById(id);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if user has access to this technician
    if (!validateOwnerAccess(technician, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    technician.availabilityStatus = availabilityStatus;
    await technician.save();

    res.status(200).json({
      status: "success",
      message: "Technician availability updated successfully",
      data: {
        technician: technician.getSummary(),
      },
    });
  } catch (error) {
    console.error("Update technician availability error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update technician availability",
    });
  }
});

// GET - Get all jobs for the authenticated technician (my jobs)
router.get("/my-jobs", authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Only technicians can access their jobs",
      });
    }

    // Query parameters for filtering
    const {
      jobType,
      status,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = req.query;

    // Build query for jobs assigned to this technician
    let query = {
      assignedTechnician: ownerInfo.ownerId,
    };

    // Add filters
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    // Add date range filter
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { jobType: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const jobs = await Job.find(query)
      .populate(
        "property",
        "address _id propertyType region status currentTenant currentLandlord agency"
      )
      .populate(
        "createdBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .populate(
        "lastUpdatedBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get status counts for dashboard
    const statusCounts = await Job.aggregate([
      {
        $match: {
          assignedTechnician: new mongoose.Types.ObjectId(ownerInfo.ownerId),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "My jobs retrieved successfully",
      data: {
        jobs: jobs.map((job) => job.getFullDetails()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / parseInt(limit)),
          totalItems: totalJobs,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + jobs.length < totalJobs,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalJobs,
        },
      },
    });
  } catch (error) {
    console.error("Get my jobs error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve my jobs",
    });
  }
});

// GET - Get active jobs for the authenticated technician
router.get("/active-jobs", authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Only technicians can access their active jobs",
      });
    }

    // Query parameters for filtering
    const {
      jobType,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = req.query;

    // Build query for active jobs (claimed by technician, not completed, not overdue)
    let query = {
      assignedTechnician: ownerInfo.ownerId,
      status: { $in: ["Pending", "Scheduled"] }, // Active statuses
      dueDate: { $gte: new Date() }, // Due date is not behind (not overdue)
    };

    // Add filters
    if (jobType) query.jobType = jobType;
    if (priority) query.priority = priority;

    // Add date range filter
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { jobType: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const jobs = await Job.find(query)
      .populate(
        "property",
        "address _id propertyType region status currentTenant currentLandlord agency"
      )
      .populate(
        "createdBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .populate(
        "lastUpdatedBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get status counts for dashboard
    const statusCounts = await Job.aggregate([
      {
        $match: {
          assignedTechnician: new mongoose.Types.ObjectId(ownerInfo.ownerId),
          status: { $in: ["Pending", "Scheduled"] },
          dueDate: { $gte: new Date() },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Active jobs retrieved successfully",
      data: {
        jobs: jobs.map((job) => job.getFullDetails()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / parseInt(limit)),
          totalItems: totalJobs,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + jobs.length < totalJobs,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalJobs,
        },
      },
    });
  } catch (error) {
    console.error("Get active jobs error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve active jobs",
    });
  }
});

// GET - Get overdue jobs for the authenticated technician
router.get("/overdue-jobs", authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Only technicians can access their overdue jobs",
      });
    }

    // Query parameters for filtering
    const {
      jobType,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = req.query;

    // Build query for overdue jobs (assigned to technician, due date is behind)
    let query = {
      assignedTechnician: ownerInfo.ownerId,
      dueDate: { $lt: new Date() }, // Due date is behind (overdue)
      status: { $ne: "Completed" }, // Not completed
    };

    // Add filters
    if (jobType) query.jobType = jobType;
    if (priority) query.priority = priority;

    // Add date range filter
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { description: { $regex: search, $options: "i" } },
        { notes: { $regex: search, $options: "i" } },
        { jobType: { $regex: search, $options: "i" } },
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const jobs = await Job.find(query)
      .populate(
        "property",
        "address _id propertyType region status currentTenant currentLandlord agency"
      )
      .populate(
        "createdBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .populate(
        "lastUpdatedBy.userId",
        "name email companyName contactPerson",
        null,
        { strictPopulate: false }
      )
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get status counts for dashboard
    const statusCounts = await Job.aggregate([
      {
        $match: {
          assignedTechnician: new mongoose.Types.ObjectId(ownerInfo.ownerId),
          dueDate: { $lt: new Date() },
          status: { $ne: "Completed" },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Overdue jobs retrieved successfully",
      data: {
        jobs: jobs.map((job) => job.getFullDetails()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / parseInt(limit)),
          totalItems: totalJobs,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + jobs.length < totalJobs,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalJobs,
        },
      },
    });
  } catch (error) {
    console.error("Get overdue jobs error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve overdue jobs",
    });
  }
});

export default router;
