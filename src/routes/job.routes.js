import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import Staff from "../models/Staff.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
} from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import Property from "../models/Property.js";

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

// Helper function to get creator info based on user type
const getCreatorInfo = (req) => {
  if (req.superUser) {
    return {
      userType: "SuperUser",
      userId: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      userType: "Agency",
      userId: req.agency.id,
    };
  }
  return null;
};

// Helper function to validate owner access
const validateOwnerAccess = (job, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;

  return (
    job.owner.ownerType === ownerInfo.ownerType &&
    job.owner.ownerId.toString() === ownerInfo.ownerId.toString()
  );
};

// Helper function to check if user can fully edit job (only super users)
const canFullyEditJob = (req) => {
  return !!req.superUser;
};

// Helper function to get user information for email notifications
const getUserInfo = (req) => {
  if (req.superUser) {
    return {
      name: req.superUser.name,
      type: "SuperUser",
    };
  } else if (req.agency) {
    return {
      name: req.agency.contactPerson,
      type: "Agency",
    };
  }
  return null;
};

// Helper function to send job assignment email
const sendJobAssignmentNotification = async (technician, job, assignedBy) => {
  try {
    await emailService.sendJobAssignmentEmail(technician, job, assignedBy);
    console.log("Job assignment email sent successfully:", {
      jobId: job.job_id,
      technicianEmail: technician.email,
      technicianName: technician.fullName,
      assignedBy: assignedBy.name,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log error but don't fail the assignment
    console.error("Failed to send job assignment email:", {
      jobId: job.job_id,
      technicianEmail: technician.email,
      technicianName: technician.fullName,
      assignedBy: assignedBy.name,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// CREATE - Add new job
router.post("/", authenticate, async (req, res) => {
  try {
    const {
      property,
      jobType,
      dueDate,
      assignedTechnician,
      description,
      priority,
      estimatedDuration,
      notes,
    } = req.body;

    // Validate required fields
    if (!property || !jobType || !dueDate) {
      return res.status(400).json({
        status: "error",
        message:
          "Please provide all required fields: Property, Job Type, and Due Date",
        details: {
          property: !property ? "Property reference is required" : null,
          jobType: !jobType ? "Job type is required" : null,
          dueDate: !dueDate ? "Due date is required" : null,
        },
      });
    }

    // Get owner and creator information
    const ownerInfo = getOwnerInfo(req);
    const creatorInfo = getCreatorInfo(req);

    if (!ownerInfo || !creatorInfo) {
      return res.status(400).json({
        status: "error",
        message: "Unable to process your request. Please try logging in again.",
        details: {
          auth: "User authentication information is missing or invalid",
        },
      });
    }

    // Start a session for transaction if we have an assigned technician
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let technician = null;
      // Convert string "null" to actual null
      const technicianId =
        assignedTechnician === "null" || !assignedTechnician
          ? null
          : assignedTechnician;

      if (technicianId) {
        technician = await Staff.findOne({
          _id: technicianId,
          "owner.ownerType": ownerInfo.ownerType,
          "owner.ownerId": ownerInfo.ownerId,
        }).session(session);

        if (!technician) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            status: "error",
            message: "Technician not found",
            details: {
              assignedTechnician:
                "The selected technician was not found or does not belong to your organization",
            },
          });
        }
      }

      // Create new job
      const job = new Job({
        property,
        jobType,
        dueDate: new Date(dueDate),
        assignedTechnician: technicianId,
        description,
        priority: priority || "Medium",
        estimatedDuration,
        notes,
        owner: ownerInfo,
        createdBy: creatorInfo,
        lastUpdatedBy: creatorInfo,
        status: technicianId ? "Scheduled" : "Pending",
      });

      await job.save({ session });

      // Update technician's job count if assigned
      if (technician) {
        technician.currentJobs = (technician.currentJobs || 0) + 1;
        technician.availabilityStatus =
          technician.currentJobs >= 4 ? "Busy" : "Available";
        await technician.save({ session });
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "fullName tradeType phone email availabilityStatus"
      );

      // Send email notification to technician if job was assigned during creation
      if (technician) {
        const assignedBy = getUserInfo(req);
        if (assignedBy) {
          // Send email notification asynchronously (don't wait for it)
          sendJobAssignmentNotification(technician, job, assignedBy);
        }
      }

      // Send notification to agency and super users about job creation
      try {
        const property = await Property.findById(property).populate("address");
        const creator = getUserInfo(req);

        if (property && creator) {
          // Send notification asynchronously (don't wait for it)
          notificationService.sendJobCreationNotification(
            job,
            property,
            creator
          );
        }
      } catch (notificationError) {
        // Log error but don't fail the job creation
        console.error("Failed to send job creation notification:", {
          jobId: job._id,
          error: notificationError.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(201).json({
        status: "success",
        message: "Job created successfully",
        data: {
          job: job.getFullDetails(),
        },
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      session.endSession();

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

      // Handle duplicate job error
      if (error.name === "DuplicateJobError") {
        return res.status(409).json({
          status: "error",
          message: error.message,
          details: {
            duplicate:
              "A job of this type already exists for this property on the specified date",
          },
        });
      }

      throw error;
    }
  } catch (error) {
    console.error("Create job error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to create job. Please try again later.",
      details: {
        general: "An unexpected error occurred while processing your request",
      },
    });
  }
});

// READ - Get all jobs for the authenticated user
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
      jobType,
      status,
      assignedTechnician,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "dueDate",
      sortOrder = "asc",
    } = req.query;

    // Build query
    let query = {};

    // If super user, show all jobs. If agency, show only their jobs
    if (ownerInfo.ownerType === "SuperUser") {
      // Super users can see all jobs
      query = {};
    } else {
      // Agencies can only see their own jobs
      query = {
        "owner.ownerType": ownerInfo.ownerType,
        "owner.ownerId": ownerInfo.ownerId,
      };
    }

    // Add filters
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    if (assignedTechnician) query.assignedTechnician = assignedTechnician;
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
      ];
    }
    if (req.query.property) {
      query.property = req.query.property;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const jobs = await Job.find(query)
      .populate("property", "address _id")
      .populate(
        "assignedTechnician",
        "fullName tradeType phone email availabilityStatus"
      )
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get status counts for dashboard
    let statusCountsMatch = {};
    if (ownerInfo.ownerType === "SuperUser") {
      // Super users can see all jobs
      statusCountsMatch = {};
    } else {
      // Agencies can only see their own jobs
      statusCountsMatch = {
        "owner.ownerType": ownerInfo.ownerType,
        "owner.ownerId": new mongoose.Types.ObjectId(ownerInfo.ownerId),
      };
    }

    const statusCounts = await Job.aggregate([
      {
        $match: statusCountsMatch,
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Jobs retrieved successfully",
      data: {
        jobs: jobs.map((job) => job.getSummary()),
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
    console.error("Get jobs error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve jobs",
    });
  }
});

// READ - Get specific job by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(id)
      .populate(
        "assignedTechnician",
        "fullName tradeType phone email availabilityStatus serviceRegions"
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
      );

    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You do not have permission to view this job.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Job retrieved successfully",
      data: {
        job: job.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Get job error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve job",
    });
  }
});

// UPDATE - Update job (full edit only for super users)
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You do not have permission to edit this job.",
      });
    }

    // Check if user can fully edit job (only super users)
    const canFullEdit = canFullyEditJob(req);

    // Define fields that only super users can edit
    const superUserOnlyFields = [
      "assignedTechnician",
      "jobType",
      "dueDate",
      "status",
    ];

    // If not a super user, restrict certain field updates
    if (!canFullEdit) {
      for (const field of superUserOnlyFields) {
        if (updates.hasOwnProperty(field)) {
          return res.status(403).json({
            status: "error",
            message: `Only super users can modify ${field}. Contact your administrator.`,
          });
        }
      }
    }

    // Start a session for transaction if technician assignment is changing
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Store the current assigned technician before update
      const previousTechnician = job.assignedTechnician;
      const newTechnician = updates.assignedTechnician;

      // Validate assigned technician if being updated
      if (
        updates.hasOwnProperty("assignedTechnician") &&
        updates.assignedTechnician
      ) {
        const ownerInfo = getOwnerInfo(req);
        const technician = await Staff.findOne({
          _id: updates.assignedTechnician,
          "owner.ownerType": ownerInfo.ownerType,
          "owner.ownerId": ownerInfo.ownerId,
        }).session(session);

        if (!technician) {
          await session.abortTransaction();
          session.endSession();
          return res.status(400).json({
            status: "error",
            message:
              "Assigned technician not found or does not belong to your organization",
          });
        }
      }

      // Update allowed fields
      const allowedUpdates = canFullEdit
        ? [
            "property",
            "jobType",
            "dueDate",
            "assignedTechnician",
            "status",
            "description",
            "priority",
            "estimatedDuration",
            "actualDuration",
            "cost",
            "notes",
          ]
        : ["description", "priority", "estimatedDuration", "cost", "notes"];

      allowedUpdates.forEach((field) => {
        if (updates.hasOwnProperty(field)) {
          if (field === "cost") {
            // Handle nested cost object
            if (updates.cost.materialCost !== undefined)
              job.cost.materialCost = updates.cost.materialCost;
            if (updates.cost.laborCost !== undefined)
              job.cost.laborCost = updates.cost.laborCost;
          } else {
            job[field] = updates[field];
          }
        }
      });

      // Update lastUpdatedBy
      job.lastUpdatedBy = getCreatorInfo(req);

      await job.save({ session });

      // Handle technician job count updates
      if (canFullEdit && updates.hasOwnProperty("assignedTechnician")) {
        // If technician was removed (unassigned)
        if (previousTechnician && (!newTechnician || newTechnician === null)) {
          const prevTech = await Staff.findById(previousTechnician).session(
            session
          );
          if (prevTech) {
            prevTech.currentJobs = Math.max(0, (prevTech.currentJobs || 0) - 1);
            prevTech.availabilityStatus =
              prevTech.currentJobs < 4 ? "Available" : "Busy";
            await prevTech.save({ session });
          }
        }
        // If technician was assigned to a previously unassigned job
        else if (!previousTechnician && newTechnician) {
          const newTech = await Staff.findById(newTechnician).session(session);
          if (newTech) {
            newTech.currentJobs = (newTech.currentJobs || 0) + 1;
            newTech.availabilityStatus =
              newTech.currentJobs >= 4 ? "Busy" : "Available";
            await newTech.save({ session });
          }
        }
        // If technician was changed from one to another
        else if (
          previousTechnician &&
          newTechnician &&
          previousTechnician.toString() !== newTechnician.toString()
        ) {
          // Decrease previous technician's job count
          const prevTech = await Staff.findById(previousTechnician).session(
            session
          );
          if (prevTech) {
            prevTech.currentJobs = Math.max(0, (prevTech.currentJobs || 0) - 1);
            prevTech.availabilityStatus =
              prevTech.currentJobs < 4 ? "Available" : "Busy";
            await prevTech.save({ session });
          }

          // Increase new technician's job count
          const newTech = await Staff.findById(newTechnician).session(session);
          if (newTech) {
            newTech.currentJobs = (newTech.currentJobs || 0) + 1;
            newTech.availabilityStatus =
              newTech.currentJobs >= 4 ? "Busy" : "Available";
            await newTech.save({ session });
          }
        }
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "fullName tradeType phone email"
      );

      // Send email notification for technician assignments during updates
      if (canFullEdit && updates.hasOwnProperty("assignedTechnician")) {
        const assignedBy = getUserInfo(req);
        if (assignedBy) {
          // If technician was assigned to a previously unassigned job
          if (!previousTechnician && newTechnician) {
            const newTech = await Staff.findById(newTechnician);
            if (newTech) {
              sendJobAssignmentNotification(newTech, job, assignedBy);
            }
          }
          // If technician was changed from one to another (reassignment)
          else if (
            previousTechnician &&
            newTechnician &&
            previousTechnician.toString() !== newTechnician.toString()
          ) {
            const newTech = await Staff.findById(newTechnician);
            if (newTech) {
              sendJobAssignmentNotification(newTech, job, assignedBy);
            }
          }
        }
      }

      res.status(200).json({
        status: "success",
        message: "Job updated successfully",
        data: {
          job: job.getFullDetails(),
        },
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error("Update job error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update job",
    });
  }
});

// DELETE - Delete job (only super users)
router.delete("/:id", authenticateSuperUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Super users can delete any job, but let's still check ownership for data integrity
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to delete this job.",
      });
    }

    await Job.findByIdAndDelete(id);

    res.status(200).json({
      status: "success",
      message: "Job deleted successfully",
      data: {
        deletedJobId: id,
      },
    });
  } catch (error) {
    console.error("Delete job error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete job",
    });
  }
});

// PATCH - Update job status (quick status updates)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required",
      });
    }

    const validStatuses = ["Pending", "Scheduled", "Completed", "Overdue"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: "error",
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to update this job.",
      });
    }

    // Only super users can change status to certain values
    if (!canFullyEditJob(req) && ["Scheduled", "Overdue"].includes(status)) {
      return res.status(403).json({
        status: "error",
        message: "Only super users can set status to Scheduled or Overdue",
      });
    }

    job.status = status;
    job.lastUpdatedBy = getCreatorInfo(req);

    await job.save();

    res.status(200).json({
      status: "success",
      message: "Job status updated successfully",
      data: {
        job: job.getSummary(),
      },
    });
  } catch (error) {
    console.error("Update job status error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update job status",
    });
  }
});

// PATCH - Assign job to technician (super users only)
router.patch("/:id/assign", authenticateSuperUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId } = req.body;

    // Validate MongoDB ObjectId
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(technicianId)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID or technician ID format",
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to assign this job.",
      });
    }

    // Find the technician
    const technician = await Staff.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if technician belongs to the same organization
    if (
      technician.owner.ownerType !== job.owner.ownerType ||
      technician.owner.ownerId.toString() !== job.owner.ownerId.toString()
    ) {
      return res.status(400).json({
        status: "error",
        message: "Technician does not belong to the same organization",
      });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update job
      job.assignedTechnician = technicianId;
      job.status = "Scheduled";
      job.lastUpdatedBy = getCreatorInfo(req);
      await job.save({ session });

      // Update technician's status
      technician.currentJobs = (technician.currentJobs || 0) + 1;
      technician.availabilityStatus =
        technician.currentJobs >= 4 ? "Busy" : "Available";
      await technician.save({ session });

      console.log("Technician:", technician);

      // Commit the transaction
      await session.commitTransaction();

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "fullName tradeType phone email availabilityStatus"
      );

      // Send email notification to the assigned technician
      const assignedBy = getUserInfo(req);
      if (assignedBy) {
        sendJobAssignmentNotification(technician, job, assignedBy);
      }

      res.status(200).json({
        status: "success",
        message: "Job assigned successfully",
        data: {
          job: job.getFullDetails(),
          technician: {
            id: technician._id,
            fullName: technician.fullName,
            currentJobs: technician.currentJobs,
            availabilityStatus: technician.availabilityStatus,
          },
        },
      });
    } catch (error) {
      // If an error occurred, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      session.endSession();
    }
  } catch (error) {
    console.error("Assign job error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to assign job",
    });
  }
});

export default router;
