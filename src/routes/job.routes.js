import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import Invoice from "../models/Invoice.js";
import TechnicianPayment from "../models/TechnicianPayment.js";
import InspectionReport from "../models/InspectionReport.js";
import {
  authenticateAdminLevel,
  authenticateAgency,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import fileUploadService from "../services/fileUpload.service.js";
import { sanitizeJobInput } from "../middleware/sanitizer.middleware.js";

const router = express.Router();

const getTechnicianMaxJobs = (technician) => {
  if (!technician) {
    return 4;
  }

  const { maxJobs } = technician;
  return typeof maxJobs === "number" && !Number.isNaN(maxJobs) ? maxJobs : 4;
};

// Helper function to get owner info based on user type
const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: "SuperUser",
      ownerId: req.superUser.id,
    };
  } else if (req.teamMember) {
    return {
      ownerType: "TeamMember",
      ownerId: req.teamMember.id,
    };
  } else if (req.agency) {
    return {
      ownerType: "Agency",
      ownerId: req.agency.id,
    };
  } else if (req.propertyManager) {
    // Property Manager should see jobs from their agency but limited to assigned properties
    return {
      ownerType: req.propertyManager.owner.ownerType,
      ownerId: req.propertyManager.owner.ownerId,
      propertyManagerId: req.propertyManager.id,
      assignedProperties: req.propertyManager.assignedProperties,
    };
  } else if (req.technician) {
    return {
      ownerType: "Technician",
      ownerId: req.technician.id,
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
  } else if (req.teamMember) {
    return {
      userType: "TeamMember",
      userId: req.teamMember.id,
    };
  } else if (req.agency) {
    return {
      userType: "Agency",
      userId: req.agency.id,
    };
  } else if (req.propertyManager) {
    return {
      userType: "PropertyManager",
      userId: req.propertyManager.id,
    };
  } else if (req.technician) {
    return {
      userType: "Technician",
      userId: req.technician.id,
    };
  }
  return null;
};

// Helper function to validate owner access
const validateOwnerAccess = (job, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;

  // Super users can access any job
  if (ownerInfo.ownerType === "SuperUser") {
    return true;
  }

  // Technicians can access jobs that are:
  // 1. Assigned to them
  // 2. Pending (unassigned) jobs from their organization
  if (ownerInfo.ownerType === "Technician") {
    return true;
  }

  // Property Managers can access jobs for their assigned properties
  if (ownerInfo.propertyManagerId) {
    const activePropertyIds = ownerInfo.assignedProperties
      .filter(assignment => assignment.status === 'Active')
      .map(assignment => assignment.propertyId.toString());

    return activePropertyIds.includes(job.property.toString());
  }

  // For agencies, check if they own the job
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
  } else if (req.technician) {
    return {
      name: `${req.technician.firstName} ${req.technician.lastName}`,
      type: "Technician",
    };
  }
  return null;
};

// CREATE - Add new job
router.post(
  "/",
  sanitizeJobInput(),
  authenticateUserTypes([
    "SuperUser",
    "TeamMember",
    "Agency",
    "PropertyManager",
  ]),
  async (req, res) => {
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
          message:
            "Unable to process your request. Please try logging in again.",
          details: {
            auth: "User authentication information is missing or invalid",
          },
        });
      }

      let technician = null;
      // Convert string "null" to actual null
      const technicianId =
        assignedTechnician === "null" || !assignedTechnician
          ? null
          : assignedTechnician;

      if (technicianId) {
        technician = await Technician.findById(technicianId);

        if (!technician) {
          return res.status(400).json({
            status: "error",
            message: "Technician not found",
            details: {
              assignedTechnician: "The selected technician was not found",
            },
          });
        }

        const technicianMaxJobs = getTechnicianMaxJobs(technician);
        const technicianCurrentJobs = technician.currentJobs || 0;

        if (technicianCurrentJobs >= technicianMaxJobs) {
          return res.status(400).json({
            status: "error",
            message:
              "The technician has reached their job limit and cannot take more assignments right now.",
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

      await job.save();

      // Update technician's job count if assigned
      if (technician) {
        technician.currentJobs = (technician.currentJobs || 0) + 1;
        const technicianMaxJobs = getTechnicianMaxJobs(technician);
        technician.availabilityStatus =
          technician.currentJobs >= technicianMaxJobs
            ? "Busy"
            : "Available";
        await technician.save();
      }

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "firstName lastName phone email availabilityStatus"
      );

      // Send comprehensive notifications for job creation
      try {
        const property = await Property.findById(job.property).populate(
          "address"
        );
        const creator = getUserInfo(req);

        if (property && creator) {
          // Send job creation notification to all stakeholders
          await notificationService.sendJobCreationNotification(
            job,
            property,
            creator
          );

          // If technician was assigned during creation, send assignment notification
          if (technician) {
            const assignedBy = getUserInfo(req);
            if (assignedBy) {
              await notificationService.sendJobAssignmentNotification(
                job,
                property,
                technician,
                assignedBy
              );
            }
          }
        }
      } catch (notificationError) {
        // Log error but don't fail the job creation
        console.error("Failed to send job notifications:", {
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
      // Handle validation errors in main catch block
    } catch (error) {
      console.error("Create job error:", error);

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

      res.status(500).json({
        status: "error",
        message: "Unable to create job. Please try again later.",
        details: {
          general: "An unexpected error occurred while processing your request",
        },
      });
    }
  }
);

// READ - Get all jobs for the authenticated user
router.get(
  "/",
  authenticateUserTypes([
    "SuperUser",
    "TeamMember",
    "Agency",
    "PropertyManager",
    "Technician",
  ]),
  async (req, res) => {
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

      // If super user, show all jobs. If agency, show only their jobs. If property manager, show jobs for assigned properties only
      if (ownerInfo.ownerType === "SuperUser") {
        // Super users can see all jobs
        query = {};
      } else if (ownerInfo.propertyManagerId) {
        // Property Manager: filter by assigned properties only
        const activePropertyIds = ownerInfo.assignedProperties
          .filter(assignment => assignment.status === 'Active')
          .map(assignment => assignment.propertyId);

        query = {
          property: { $in: activePropertyIds }
        };
      } else {
        // Agencies and other user types can only see their own jobs
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

      // Store base query without search for aggregation
      const baseQuery = { ...query };

      // Add comprehensive search functionality
      if (search) {
        // Create a more comprehensive search that includes job_id, status, jobType, and populated fields
        const searchRegex = { $regex: search, $options: "i" };

        // Basic text fields search
        const textSearchFields = [
          { description: searchRegex },
          { notes: searchRegex },
          { jobType: searchRegex },
          { status: searchRegex },
          { priority: searchRegex },
        ];

        // Search for job_id with or without 'J-' prefix
        const cleanSearch = search.replace(/^(j-|#)/i, ""); // Remove J- or # prefix
        if (/^\d+$/.test(cleanSearch)) {
          // If search is numeric, search both with and without J- prefix
          textSearchFields.push(
            { job_id: { $regex: `J-${cleanSearch}`, $options: "i" } },
            { job_id: { $regex: cleanSearch, $options: "i" } }
          );
        } else {
          // If search contains letters, search job_id as is
          textSearchFields.push({ job_id: searchRegex });
        }

        // For non-aggregation query, add $or to existing query
        query.$or = textSearchFields;
      }
      if (req.query.property) {
        query.property = req.query.property;
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      let jobs;

      // If search is provided, we need to do a more complex aggregation to search in populated fields
      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        const cleanSearch = search.replace(/^(j-|#)/i, "");

        jobs = await Job.aggregate([
          // Match the base query first (without $or search conditions)
          { $match: baseQuery },
          // Lookup property data
          {
            $lookup: {
              from: "properties",
              localField: "property",
              foreignField: "_id",
              as: "propertyData",
            },
          },
          // Lookup technician data
          {
            $lookup: {
              from: "technicians",
              localField: "assignedTechnician",
              foreignField: "_id",
              as: "technicianData",
            },
          },
          // Add search conditions that include populated fields
          {
            $match: {
              $or: [
                { description: searchRegex },
                { notes: searchRegex },
                { jobType: searchRegex },
                { status: searchRegex },
                { priority: searchRegex },
                // Job ID search with flexible prefix handling
                ...(/^\d+$/.test(cleanSearch)
                  ? [
                      { job_id: { $regex: `J-${cleanSearch}`, $options: "i" } },
                      { job_id: { $regex: cleanSearch, $options: "i" } },
                    ]
                  : [{ job_id: searchRegex }]),
                // Property address search
                { "propertyData.address.street": searchRegex },
                { "propertyData.address.suburb": searchRegex },
                { "propertyData.address.state": searchRegex },
                { "propertyData.address.postcode": searchRegex },
                { "propertyData.address.fullAddress": searchRegex },
                // Technician name search (using $expr to handle arrays from $lookup)
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $concat: [
                          {
                            $ifNull: [
                              {
                                $arrayElemAt: ["$technicianData.firstName", 0],
                              },
                              "",
                            ],
                          },
                          " ",
                          {
                            $ifNull: [
                              { $arrayElemAt: ["$technicianData.lastName", 0] },
                              "",
                            ],
                          },
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
                // Individual technician field searches (using $arrayElemAt to handle arrays)
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $ifNull: [
                          { $arrayElemAt: ["$technicianData.firstName", 0] },
                          "",
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $ifNull: [
                          { $arrayElemAt: ["$technicianData.lastName", 0] },
                          "",
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
              ],
            },
          },
          // Sort
          { $sort: { [sortBy]: sortOrder === "desc" ? -1 : 1 } },
          // Pagination
          { $skip: skip },
          { $limit: parseInt(limit) },
          // Reshape the data to match the original structure
          {
            $addFields: {
              property: { $arrayElemAt: ["$propertyData", 0] },
              assignedTechnician: { $arrayElemAt: ["$technicianData", 0] },
            },
          },
          // Remove the temporary lookup arrays
          {
            $project: {
              propertyData: 0,
              technicianData: 0,
            },
          },
        ]);

        // For aggregated results, we can't convert to full Mongoose documents
        // but we need to call getSummary() manually for each job
        jobs = jobs.map((job) => {
          // Create a mock job document for calling getSummary
          const mockJob = {
            _id: job._id,
            job_id: job.job_id,
            property: job.property,
            jobType: job.jobType,
            dueDate: job.dueDate,
            shift: job.shift,
            scheduledStartTime: job.scheduledStartTime,
            scheduledEndTime: job.scheduledEndTime,
            assignedTechnician: job.assignedTechnician,
            status: job.status,
            reportFile: job.reportFile,
            hasInvoice: job.hasInvoice,
            invoice: job.invoice,
            priority: job.priority,
            isOverdue: job.isOverdue,
            cost: job.cost || { totalCost: 0 },
            createdAt: job.createdAt,
            getSummary: function () {
              // Transform assignedTechnician data for frontend compatibility
              let transformedTechnician = null;
              if (this.assignedTechnician) {
                transformedTechnician = {
                  id: this.assignedTechnician._id || this.assignedTechnician.id,
                  name:
                    this.assignedTechnician.fullName ||
                    `${this.assignedTechnician.firstName || ""} ${
                      this.assignedTechnician.lastName || ""
                    }`.trim(),
                  tradeType: this.assignedTechnician.tradeType || "Technician",
                };
              }

              return {
                id: this._id,
                job_id: this.job_id,
                property: this.property,
                jobType: this.jobType,
                dueDate: this.dueDate,
                shift: this.shift,
                scheduledStartTime: this.scheduledStartTime,
                scheduledEndTime: this.scheduledEndTime,
                assignedTechnician: transformedTechnician,
                status: this.status,
                reportFile: this.reportFile,
                hasInvoice: this.hasInvoice,
                invoice: this.invoice,
                priority: this.priority,
                isOverdue: this.isOverdue,
                totalCost: this.cost.totalCost,
                createdAt: this.createdAt,
              };
            },
          };
          return mockJob;
        });
      } else {
        // Execute normal query without search
        jobs = await Job.find(query)
          .populate("property", "address _id")
          .populate(
            "assignedTechnician",
            "firstName lastName phone email availabilityStatus"
          )
          .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
          .skip(skip)
          .limit(parseInt(limit));
      }

      // Get total count for pagination
      let totalJobs;
      if (search) {
        // For search queries, we need to count using the same aggregation logic
        const searchRegex = { $regex: search, $options: "i" };
        const cleanSearch = search.replace(/^(j-|#)/i, "");

        const countResult = await Job.aggregate([
          { $match: baseQuery },
          {
            $lookup: {
              from: "properties",
              localField: "property",
              foreignField: "_id",
              as: "propertyData",
            },
          },
          {
            $lookup: {
              from: "technicians",
              localField: "assignedTechnician",
              foreignField: "_id",
              as: "technicianData",
            },
          },
          {
            $match: {
              $or: [
                { description: searchRegex },
                { notes: searchRegex },
                { jobType: searchRegex },
                { status: searchRegex },
                { priority: searchRegex },
                ...(/^\d+$/.test(cleanSearch)
                  ? [
                      { job_id: { $regex: `J-${cleanSearch}`, $options: "i" } },
                      { job_id: { $regex: cleanSearch, $options: "i" } },
                    ]
                  : [{ job_id: searchRegex }]),
                { "propertyData.address.street": searchRegex },
                { "propertyData.address.suburb": searchRegex },
                { "propertyData.address.state": searchRegex },
                { "propertyData.address.postcode": searchRegex },
                { "propertyData.address.fullAddress": searchRegex },
                // Technician name search (using $expr to handle arrays from $lookup)
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $concat: [
                          {
                            $ifNull: [
                              {
                                $arrayElemAt: ["$technicianData.firstName", 0],
                              },
                              "",
                            ],
                          },
                          " ",
                          {
                            $ifNull: [
                              { $arrayElemAt: ["$technicianData.lastName", 0] },
                              "",
                            ],
                          },
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
                // Individual technician field searches (using $arrayElemAt to handle arrays)
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $ifNull: [
                          { $arrayElemAt: ["$technicianData.firstName", 0] },
                          "",
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $ifNull: [
                          { $arrayElemAt: ["$technicianData.lastName", 0] },
                          "",
                        ],
                      },
                      regex: search,
                      options: "i",
                    },
                  },
                },
              ],
            },
          },
          { $count: "total" },
        ]);

        totalJobs = countResult.length > 0 ? countResult[0].total : 0;
      } else {
        totalJobs = await Job.countDocuments(query);
      }

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
  }
);

// GET - Get available (unassigned) jobs for super users and technicians
router.get(
  "/available-jobs",
  authenticateUserTypes(["Technician"]),
  async (req, res) => {
    try {
      const ownerInfo = getOwnerInfo(req);
      if (!ownerInfo) {
        return res.status(400).json({
          status: "error",
          message: "Unable to determine owner information",
        });
      }

      // Only allow super users and technicians to access available jobs
      if (
        ownerInfo.ownerType !== "SuperUser" &&
        ownerInfo.ownerType !== "Technician"
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. Only super users and technicians can view available jobs.",
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
        property,
        region,
        propertyType,
        page = 1,
        limit = 10,
        sortBy = "dueDate",
        sortOrder = "asc",
        minPriority,
        maxPriority,
        estimatedDuration,
        costRange,
      } = req.query;

      // Build query for unassigned jobs
      let query = {
        $or: [
          { assignedTechnician: { $exists: false } }, // Jobs where field doesn't exist
          { assignedTechnician: null }, // Jobs where field is null
          { assignedTechnician: { $in: [null, undefined] } }, // Jobs where field is null or undefined
        ],
      };

      // Add filters
      if (jobType) query.jobType = jobType;
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (property) query.property = property;
      if (region) query.region = region;
      if (propertyType) query.propertyType = propertyType;
      if (estimatedDuration)
        query.estimatedDuration = { $gte: parseInt(estimatedDuration) };

      // Add date range filter
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      // Add priority range filter
      if (minPriority || maxPriority) {
        query.priority = {};
        if (minPriority) query.priority.$gte = minPriority;
        if (maxPriority) query.priority.$lte = maxPriority;
      }

      // Add cost range filter
      if (costRange) {
        const [minCost, maxCost] = costRange.split("-").map(Number);
        if (!isNaN(minCost) || !isNaN(maxCost)) {
          query.$or = [
            {
              "cost.materialCost": {
                $gte: minCost || 0,
                $lte: maxCost || Number.MAX_SAFE_INTEGER,
              },
            },
            {
              "cost.laborCost": {
                $gte: minCost || 0,
                $lte: maxCost || Number.MAX_SAFE_INTEGER,
              },
            },
          ];
        }
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

      // Populate agency details for properties and job owners
      for (let job of jobs) {
        // Populate property agency details
        if (job.property && job.property.agency) {
          await job.populate(
            "property.agency",
            "companyName contactPerson email phone"
          );
        }

        // Populate job owner agency details
        if (job.owner && job.owner.ownerType === "Agency") {
          const { default: Agency } = await import("../models/Agency.js");
          const agency = await Agency.findById(job.owner.ownerId);
          if (agency) {
            job.owner.agencyDetails = {
              companyName: agency.companyName,
              contactPerson: agency.contactPerson,
              email: agency.email,
              phone: agency.phone,
              status: agency.status,
            };
          }
        }
      }

      // Get total count for pagination
      const totalJobs = await Job.countDocuments(query);

      // Get status counts for dashboard
      const statusCounts = await Job.aggregate([
        {
          $match: {
            $or: [
              { assignedTechnician: { $exists: false } },
              { assignedTechnician: null },
              { assignedTechnician: { $in: [null, undefined] } },
            ],
            ...(ownerInfo.ownerType === "Technician" && {
              $or: [
                {
                  "owner.ownerType": "Agency",
                  "owner.ownerId": new mongoose.Types.ObjectId(
                    ownerInfo.ownerId
                  ),
                },
                { "owner.ownerType": "SuperUser" },
              ],
            }),
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Get job type counts
      const jobTypeCounts = await Job.aggregate([
        {
          $match: {
            $or: [
              { assignedTechnician: { $exists: false } },
              { assignedTechnician: null },
              { assignedTechnician: { $in: [null, undefined] } },
            ],
            ...(ownerInfo.ownerType === "Technician" && {
              $or: [
                {
                  "owner.ownerType": "Agency",
                  "owner.ownerId": new mongoose.Types.ObjectId(
                    ownerInfo.ownerId
                  ),
                },
                { "owner.ownerType": "SuperUser" },
              ],
            }),
          },
        },
        { $group: { _id: "$jobType", count: { $sum: 1 } } },
      ]);

      // Get priority counts
      const priorityCounts = await Job.aggregate([
        {
          $match: {
            $or: [
              { assignedTechnician: { $exists: false } },
              { assignedTechnician: null },
              { assignedTechnician: { $in: [null, undefined] } },
            ],
            ...(ownerInfo.ownerType === "Technician" && {
              $or: [
                {
                  "owner.ownerType": "Agency",
                  "owner.ownerId": new mongoose.Types.ObjectId(
                    ownerInfo.ownerId
                  ),
                },
                { "owner.ownerType": "SuperUser" },
              ],
            }),
          },
        },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]);

      res.status(200).json({
        status: "success",
        message: "Available jobs retrieved successfully",
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
            jobTypeCounts: jobTypeCounts.reduce((acc, item) => {
              acc[item._id] = item.count;
              return acc;
            }, {}),
            priorityCounts: priorityCounts.reduce((acc, item) => {
              acc[item._id] = item.count;
              return acc;
            }, {}),
            totalAvailableJobs: totalJobs,
          },
          filters: {
            availableJobTypes: [
              "Gas",
              "Electrical",
              "Smoke",
              "Repairs",
              "Pool Safety",
              "Routine Inspection",
            ],
            availableStatuses: ["Pending", "Scheduled", "Completed", "Overdue"],
            availablePriorities: ["Low", "Medium", "High", "Urgent"],
            availableSortFields: [
              "dueDate",
              "createdAt",
              "updatedAt",
              "priority",
              "status",
              "jobType",
            ],
            availableSortOrders: ["asc", "desc"],
          },
        },
      });
    } catch (error) {
      console.error("Get available jobs error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve available jobs",
      });
    }
  }
);

// READ - Get specific job by ID
router.get(
  "/:id",
  authenticateUserTypes([
    "SuperUser",
    "TeamMember",
    "Agency",
    "PropertyManager",
    "Technician",
  ]),
  async (req, res) => {
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
          "property",
          "address _id propertyType region status currentTenant currentLandlord agency"
        )
        .populate(
          "assignedTechnician",
          "firstName lastName phone email availabilityStatus serviceRegions"
        )
        .populate({
          path: "latestInspectionReport",
          select: "jobType submittedAt pdf",
        })
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

      // Populate agency details for the property
      if (job.property && job.property.agency) {
        await job.populate(
          "property.agency",
          "companyName contactPerson email phone"
        );
      }

      // Check if user has access to this job
      if (!validateOwnerAccess(job, req)) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. You do not have permission to view this job.",
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
  }
);

// UPDATE - Update job (full edit only for super users)
router.put(
  "/:id",
  sanitizeJobInput(),
  authenticateUserTypes([
    "SuperUser",
    "TeamMember",
    "Agency",
    "PropertyManager",
    "Technician",
  ]),
  async (req, res) => {
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
          message:
            "Access denied. You do not have permission to edit this job.",
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

      try {
        // Store the current assigned technician before update
        const previousTechnician = job.assignedTechnician;
        const newTechnician = updates.assignedTechnician;

        // Validate assigned technician if being updated
        if (
          updates.hasOwnProperty("assignedTechnician") &&
          updates.assignedTechnician
        ) {
          const technician = await Technician.findById(
            updates.assignedTechnician
          );

          if (!technician) {
            return res.status(400).json({
              status: "error",
              message: "Assigned technician not found",
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

        await job.save();

        // Handle technician job count updates
        if (canFullEdit && updates.hasOwnProperty("assignedTechnician")) {
          // If technician was removed (unassigned)
          if (
            previousTechnician &&
            (!newTechnician || newTechnician === null)
          ) {
            const prevTech = await Technician.findById(previousTechnician);
            if (prevTech) {
              prevTech.currentJobs = Math.max(
                0,
                (prevTech.currentJobs || 0) - 1
              );
              const prevTechMaxJobs = getTechnicianMaxJobs(prevTech);
              prevTech.availabilityStatus =
                prevTech.currentJobs < prevTechMaxJobs
                  ? "Available"
                  : "Busy";
              await prevTech.save();
            }
          }
          // If technician was assigned to a previously unassigned job
          else if (!previousTechnician && newTechnician) {
            const newTech = await Technician.findById(newTechnician);
            if (newTech) {
              newTech.currentJobs = (newTech.currentJobs || 0) + 1;
              const newTechMaxJobs = getTechnicianMaxJobs(newTech);
              newTech.availabilityStatus =
                newTech.currentJobs >= newTechMaxJobs
                  ? "Busy"
                  : "Available";
              await newTech.save();
            }
          }
          // If technician was changed from one to another
          else if (
            previousTechnician &&
            newTechnician &&
            previousTechnician.toString() !== newTechnician.toString()
          ) {
            // Decrease previous technician's job count
            const prevTech = await Technician.findById(previousTechnician);
            if (prevTech) {
              prevTech.currentJobs = Math.max(
                0,
                (prevTech.currentJobs || 0) - 1
              );
              const prevTechMaxJobs = getTechnicianMaxJobs(prevTech);
              prevTech.availabilityStatus =
                prevTech.currentJobs < prevTechMaxJobs
                  ? "Available"
                  : "Busy";
              await prevTech.save();
            }

            // Increase new technician's job count
            const newTech = await Technician.findById(newTechnician);
            if (newTech) {
              newTech.currentJobs = (newTech.currentJobs || 0) + 1;
              const newTechMaxJobs = getTechnicianMaxJobs(newTech);
              newTech.availabilityStatus =
                newTech.currentJobs >= newTechMaxJobs
                  ? "Busy"
                  : "Available";
              await newTech.save();
            }
          }
        }

        // Populate technician details for response
        await job.populate(
          "assignedTechnician",
          "firstName lastName phone email"
        );

        // Send notifications for technician assignments during updates
        if (canFullEdit && updates.hasOwnProperty("assignedTechnician")) {
          const assignedBy = getUserInfo(req);
          if (assignedBy) {
            try {
              // Get property details for notification
              const property = await Property.findById(job.property).populate(
                "address"
              );

              // If technician was assigned to a previously unassigned job
              if (!previousTechnician && newTechnician) {
                const newTech = await Technician.findById(newTechnician);
                if (newTech) {
                  // Send comprehensive job assignment notification
                  await notificationService.sendJobAssignmentNotification(
                    job,
                    property,
                    newTech,
                    assignedBy
                  );
                }
              }
              // If technician was changed from one to another (reassignment)
              else if (
                previousTechnician &&
                newTechnician &&
                previousTechnician.toString() !== newTechnician.toString()
              ) {
                const newTech = await Technician.findById(newTechnician);
                if (newTech) {
                  // Send comprehensive job assignment notification
                  await notificationService.sendJobAssignmentNotification(
                    job,
                    property,
                    newTech,
                    assignedBy
                  );
                }
              }
            } catch (notificationError) {
              // Log error but don't fail the job update
              console.error("Failed to send job assignment notifications:", {
                jobId: job._id,
                error: notificationError.message,
                timestamp: new Date().toISOString(),
              });
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
        // If an error occurred, log it and re-throw
        console.error("Error during job update:", error);
        throw error;
      }
    } catch (error) {
      console.error("Update job error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to update job",
      });
    }
  }
);

// DELETE - Delete job (only super users)
router.delete(
  "/:id",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
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
  }
);

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

    // Store previous status to check for completion
    const previousStatus = job.status;

    job.status = status;
    job.lastUpdatedBy = getCreatorInfo(req);

    // If job is being marked as completed and has an assigned technician
    if (
      status === "Completed" &&
      previousStatus !== "Completed" &&
      job.assignedTechnician
    ) {
      const technician = await Technician.findById(job.assignedTechnician);
      if (technician) {
        technician.completedJobs = (technician.completedJobs || 0) + 1;
        technician.currentJobs = Math.max(0, (technician.currentJobs || 0) - 1);
        const technicianMaxJobs = getTechnicianMaxJobs(technician);
        technician.availabilityStatus =
          technician.currentJobs < technicianMaxJobs
            ? "Available"
            : "Busy";
        await technician.save();
      }
    }

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
router.patch("/:id/assign", authenticateAdminLevel, async (req, res) => {
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
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Technicians are independent contractors and can be assigned to any job
    // No organization validation needed - any authenticated user can assign any technician

    const technicianMaxJobs = getTechnicianMaxJobs(technician);
    const technicianCurrentJobs = technician.currentJobs || 0;

    if (technicianCurrentJobs >= technicianMaxJobs) {
      return res.status(400).json({
        status: "error",
        message:
          "The technician has reached their job limit and cannot take more assignments right now.",
      });
    }

    try {
      // Update job
      job.assignedTechnician = technicianId;
      job.status = "Scheduled";
      job.lastUpdatedBy = getCreatorInfo(req);
      await job.save();

      // Update technician's status
      technician.currentJobs = technicianCurrentJobs + 1;
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? "Busy" : "Available";
      await technician.save();

      console.log("Technician:", technician);

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "firstName lastName phone email availabilityStatus"
      );
      // fullName is now handled by virtual field in technician model

      // Send notifications to the assigned technician, agency, and super users
      const assignedBy = getUserInfo(req);
      if (assignedBy) {
        try {
          // Get property details for notification
          const property = await Property.findById(job.property).populate(
            "address"
          );

          // Send comprehensive job assignment notification
          await notificationService.sendJobAssignmentNotification(
            job,
            property,
            technician,
            assignedBy
          );
        } catch (notificationError) {
          // Log error but don't fail the job assignment
          console.error("Failed to send job assignment notifications:", {
            jobId: job._id,
            technicianId: technician._id,
            error: notificationError.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(200).json({
        status: "success",
        message: "Job assigned successfully",
        data: {
          job: job.getFullDetails(),
          technician: {
            id: technician._id,
            fullName: technician.fullName, // Virtual field
            currentJobs: technician.currentJobs,
            availabilityStatus: technician.availabilityStatus,
          },
        },
      });
    } catch (error) {
      // If an error occurred, log it and re-throw
      console.error("Error during job assignment:", error);
      throw error;
    }
  } catch (error) {
    console.error("Assign job error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to assign job",
    });
  }
});

// PATCH - Claim job (technicians can claim available jobs)
router.patch(
  "/:id/claim",
  authenticateUserTypes(["Technician"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid job ID format",
        });
      }

      // Check if user is a technician
      const ownerInfo = getOwnerInfo(req);
      if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
        return res.status(403).json({
          status: "error",
          message: "Only technicians can claim jobs",
        });
      }

      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({
          status: "error",
          message: "Job not found",
        });
      }

      // Check if job is available for claiming (unassigned)
      if (job.assignedTechnician) {
        return res.status(400).json({
          status: "error",
          message: "This job is already assigned to a technician",
        });
      }

      // Check if technician has access to this job (belongs to their organization)
      if (!validateOwnerAccess(job, req)) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. You do not have permission to claim this job.",
        });
      }

      // Find the technician
      const technician = await Technician.findById(ownerInfo.ownerId);
      if (!technician) {
        return res.status(404).json({
          status: "error",
          message: "Technician not found",
        });
      }

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      // Check if technician is available (not too busy)
      if (technicianCurrentJobs >= technicianMaxJobs) {
        return res.status(400).json({
          status: "error",
          message:
            "You are currently too busy to take on more jobs. Please complete some existing jobs first.",
        });
      }

      // Update job - assign to the claiming technician and set status to Scheduled
      job.assignedTechnician = ownerInfo.ownerId;
      job.status = "Scheduled";
      job.lastUpdatedBy = getCreatorInfo(req);
      await job.save();

      // Update technician's job count and availability status
      technician.currentJobs = technicianCurrentJobs + 1;
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? "Busy" : "Available";
      await technician.save();

      // Populate technician details for response
      await job.populate(
        "assignedTechnician",
        "firstName lastName phone email availabilityStatus"
      );

      // Send in-app notifications to technician, agency, and super users
      const claimedBy = getUserInfo(req);
      if (claimedBy) {
        try {
          // Get property details for notification
          const property = await Property.findById(job.property).populate(
            "address"
          );

          // Send comprehensive job assignment notification
          await notificationService.sendJobAssignmentNotification(
            job,
            property,
            technician,
            claimedBy
          );
        } catch (notificationError) {
          // Log error but don't fail the job claim
          console.error("Failed to send job assignment notifications:", {
            jobId: job._id,
            technicianId: technician._id,
            error: notificationError.message,
            timestamp: new Date().toISOString(),
          });
        }
      }

      res.status(200).json({
        status: "success",
        message: "Job claimed successfully",
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
      console.error("Claim job error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to claim job",
      });
    }
  }
);

// PATCH - Complete job (technicians can complete their assigned jobs with report file and invoice)
router.patch(
  "/:id/complete",
  authenticate,
  fileUploadService.single("reportFile"),
  async (req, res) => {
    console.log(req.body, "req.body");
    console.log(req.file, "req.file");
    const { hasInvoice, invoiceData } = req.body;
    console.log(invoiceData, "invoiceData");

    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid job ID format",
        });
      }

      // Check if user is a technician or superuser
      const ownerInfo = getOwnerInfo(req);
      if (
        !ownerInfo ||
        (ownerInfo.ownerType !== "Technician" &&
          ownerInfo.ownerType !== "Superuser")
      ) {
        return res.status(403).json({
          status: "error",
          message: "Only technicians or superusers can complete jobs",
        });
      }

      const job = await Job.findById(id);
      if (!job) {
        return res.status(404).json({
          status: "error",
          message: "Job not found",
        });
      }

      // Check if technician is assigned to this job
      if (
        !job.assignedTechnician ||
        job.assignedTechnician.toString() !== ownerInfo.ownerId.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message: "Access denied. You can only complete jobs assigned to you.",
        });
      }

      if (job.status === "Completed") {
        return res.status(400).json({
          status: "error",
          message: "Job is already completed",
        });
      }

      // Check if job due date is today or in the past (allows completion on due date and after)
      const today = new Date();
      const jobDueDate = new Date(job.dueDate);

      // Set both dates to start of day for comparison
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const dueDateStart = new Date(
        jobDueDate.getFullYear(),
        jobDueDate.getMonth(),
        jobDueDate.getDate()
      );

      const isDueDateOrAfter = dueDateStart <= todayStart;

      if (!isDueDateOrAfter) {
        return res.status(400).json({
          status: "error",
          message: "Job can only be completed on or after its due date",
          details: {
            jobDueDate: jobDueDate.toDateString(),
            today: today.toDateString(),
          },
        });
      }

      try {
        let reportFileUrl = null;
        let invoiceId = null;
        let inspectionReportId = req.body.inspectionReportId;
        let inspectionReport = null;

        if (inspectionReportId) {
          if (!mongoose.Types.ObjectId.isValid(inspectionReportId)) {
            return res.status(400).json({
              status: "error",
              message: "Invalid inspection report id",
            });
          }

          inspectionReport = await InspectionReport.findById(
            inspectionReportId
          );
          if (!inspectionReport) {
            return res.status(404).json({
              status: "error",
              message: "Inspection report not found",
            });
          }

          if (inspectionReport.job.toString() !== job._id.toString()) {
            return res.status(400).json({
              status: "error",
              message: "Inspection report does not belong to this job",
            });
          }

          if (
            inspectionReport.technician.toString() !==
            ownerInfo.ownerId.toString()
          ) {
            return res.status(403).json({
              status: "error",
              message: "Access denied to the inspection report",
            });
          }

          if (!inspectionReport.pdf?.url) {
            return res.status(400).json({
              status: "error",
              message: "Inspection report is missing generated PDF",
            });
          }

          reportFileUrl = inspectionReport.pdf.url;
        }

        // Handle report file upload if provided
        if (!reportFileUrl && req.file) {
          try {
            const cloudinaryResult = await fileUploadService.uploadToCloudinary(
              req.file.buffer,
              {
                public_id: `job-reports/job-${job._id}-${Date.now()}`,
                resource_type: "auto",
                folder: "job-reports",
                tags: [`job-${job._id}`, "report"],
              }
            );
            reportFileUrl = cloudinaryResult.secure_url;
          } catch (uploadError) {
            console.error("Failed to upload report file:", uploadError);
            return res.status(500).json({
              status: "error",
              message: "Failed to upload report file",
              details: uploadError.message,
            });
          }
        }

        // Handle invoice creation if requested
        if (hasInvoice === "true" && invoiceData) {
          try {
            let parsedInvoiceData;
            if (typeof invoiceData === "string") {
              parsedInvoiceData = JSON.parse(invoiceData);
            } else {
              parsedInvoiceData = invoiceData;
            }

            // Validate invoice data
            if (
              !parsedInvoiceData.description ||
              !parsedInvoiceData.items ||
              parsedInvoiceData.items.length === 0
            ) {
              return res.status(400).json({
                status: "error",
                message:
                  "Invalid invoice data. Description and items are required.",
              });
            }

            // Get agency ID from job owner
            let agencyId;
            if (job.owner.ownerType === "Agency") {
              agencyId = job.owner.ownerId;
            } else {
              // If job is owned by SuperUser, we need to get the agency from the property
              const property = await Property.findById(job.property);
              if (property && property.agency) {
                agencyId = property.agency;
              } else {
                return res.status(400).json({
                  status: "error",
                  message:
                    "Cannot create invoice: No agency associated with this job",
                });
              }
            }

            // Create invoice
            const newInvoiceData = {
              jobId: job._id,
              technicianId: job.assignedTechnician,
              agencyId: agencyId,
              description: parsedInvoiceData.description,
              items: parsedInvoiceData.items.map((item) => ({
                name: item.name,
                quantity: parseFloat(item.quantity),
                rate: parseFloat(item.rate),
                amount: parseFloat(item.amount),
              })),
              tax: parseFloat(parsedInvoiceData.tax || 0),
              notes: parsedInvoiceData.notes || "",
            };

            const invoice = new Invoice(newInvoiceData);
            await invoice.save();
            invoiceId = invoice._id;
          } catch (invoiceError) {
            console.error("Failed to create invoice:", invoiceError);
            return res.status(500).json({
              status: "error",
              message: "Failed to create invoice",
              details: invoiceError.message,
            });
          }
        }

        // Update job status to "Completed" and set completion timestamp
        const updateData = {
          status: "Completed",
          completedAt: new Date(),
          lastUpdatedBy: getCreatorInfo(req),
          reportFile: reportFileUrl,
          hasInvoice: hasInvoice === "true",
          invoice: invoiceId,
        };

        const updatedJob = await Job.findByIdAndUpdate(job._id, updateData, {
          runValidators: false,
          new: true,
        });

        // Update technician's job count and availability status
        const technician = await Technician.findById(ownerInfo.ownerId);
        if (technician) {
          technician.currentJobs = Math.max(
            0,
            (technician.currentJobs || 0) - 1
          );
          technician.completedJobs = (technician.completedJobs || 0) + 1;
          const technicianMaxJobs = getTechnicianMaxJobs(technician);
          technician.availabilityStatus =
            technician.currentJobs < technicianMaxJobs
              ? "Available"
              : "Busy";
          await technician.save();
        }

        // Create technician payment for completed job
        let technicianPaymentCreated = false;
        let technicianPaymentData = null;

        try {
          // Get agency ID from job owner
          let agencyId;
          if (job.owner.ownerType === "Agency") {
            agencyId = job.owner.ownerId;
          } else {
            // If job is owned by SuperUser, get agency from property
            const property = await Property.findById(job.property);
            if (property && property.agency) {
              agencyId = property.agency;
            }
          }

          if (agencyId) {
            // Get payment amount based on job type
            const paymentAmount = TechnicianPayment.getPaymentAmountByJobType(
              job.jobType
            );

            // Create technician payment
            const technicianPayment = new TechnicianPayment({
              technicianId: job.assignedTechnician,
              jobId: job._id,
              agencyId: agencyId,
              jobType: job.jobType,
              amount: paymentAmount,
              jobCompletedAt: new Date(),
              createdBy: {
                userType: "System",
                userId: job.assignedTechnician, // Using technician ID as system user
              },
            });

            await technicianPayment.save();
            technicianPaymentCreated = true;
            technicianPaymentData = technicianPayment.getSummary();

            console.log("✅ Technician payment created successfully:", {
              paymentNumber: technicianPayment.paymentNumber,
              jobId: job._id,
              technicianId: job.assignedTechnician,
              jobType: job.jobType,
              amount: paymentAmount,
              timestamp: new Date().toISOString(),
            });
          } else {
            console.warn(
              "⚠️ No agency found for job, skipping technician payment creation:",
              {
                jobId: job._id,
                jobOwner: job.owner,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } catch (paymentError) {
          // Log error but don't fail the job completion
          console.error("❌ Failed to create technician payment:", {
            jobId: job._id,
            technicianId: job.assignedTechnician,
            error: paymentError.message,
            timestamp: new Date().toISOString(),
          });
        }

        // Transaction handling removed for standalone MongoDB compatibility

        // Populate references for response
        await updatedJob.populate([
          {
            path: "assignedTechnician",
            select: "firstName lastName phone email availabilityStatus",
          },
          {
            path: "invoice",
            select: "invoiceNumber description totalCost status",
          },
        ]);

        // Send completion notifications
        const completedBy = getUserInfo(req);
        if (completedBy) {
          try {
            // Get property details for notification
            const property = await Property.findById(
              updatedJob.property
            ).populate("address");

            // Send comprehensive job completion notification
            await notificationService.sendJobCompletionNotification(
              updatedJob,
              property,
              technician,
              completionNotes,
              totalCost
            );
          } catch (notificationError) {
            // Log error but don't fail the job completion
            console.error("Failed to send job completion notifications:", {
              jobId: updatedJob._id,
              technicianId: technician._id,
              error: notificationError.message,
              timestamp: new Date().toISOString(),
            });
          }
        }

        res.status(200).json({
          status: "success",
          message: "Job completed successfully",
          data: {
            job: updatedJob.getFullDetails(),
            technician: technician
              ? {
                  id: technician._id,
                  fullName: technician.fullName,
                  currentJobs: technician.currentJobs,
                  availabilityStatus: technician.availabilityStatus,
                }
              : null,
            completionDetails: {
              completedAt: updatedJob.completedAt,
              completedBy: completedBy,
              dueDate: updatedJob.dueDate,
              reportFile: reportFileUrl,
              inspectionReportId:
                inspectionReport?.id || inspectionReportId || null,
              invoiceCreated: !!invoiceId,
              invoiceId: invoiceId,
            },
            technicianPayment: technicianPaymentCreated
              ? {
                  created: true,
                  payment: technicianPaymentData,
                  message: `Technician payment of $${technicianPaymentData.amount} created for ${job.jobType} job`,
                }
              : {
                  created: false,
                  message:
                    "No technician payment created (no agency associated with job)",
                },
          },
        });
      } catch (error) {
        throw error;
      }
    } catch (error) {
      console.error("Complete job error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to complete job",
      });
    }
  }
);

// UTILITY - Recalculate technician job statistics (Super users only)
router.patch(
  "/utility/recalculate-technician-stats",
  authenticateAdminLevel,
  async (req, res) => {
    try {
      console.log("Starting technician stats recalculation...");

      // Get all technicians
      const technicians = await Technician.find({});
      const results = [];

      for (const technician of technicians) {
        // Count completed jobs for this technician
        const completedJobsCount = await Job.countDocuments({
          assignedTechnician: technician._id,
          status: "Completed",
        });

        // Count current active jobs (non-completed jobs)
        const currentJobsCount = await Job.countDocuments({
          assignedTechnician: technician._id,
          status: { $in: ["Pending", "Scheduled", "Overdue"] },
        });

        // Update technician stats
        const oldCompleted = technician.completedJobs || 0;
        const oldCurrent = technician.currentJobs || 0;

        technician.completedJobs = completedJobsCount;
        technician.currentJobs = currentJobsCount;
        const technicianMaxJobs = getTechnicianMaxJobs(technician);
        technician.availabilityStatus =
          currentJobsCount < technicianMaxJobs ? "Available" : "Busy";

        await technician.save();

        results.push({
          technicianId: technician._id,
          fullName: technician.fullName,
          completedJobs: {
            old: oldCompleted,
            new: completedJobsCount,
            fixed: oldCompleted !== completedJobsCount,
          },
          currentJobs: {
            old: oldCurrent,
            new: currentJobsCount,
            fixed: oldCurrent !== currentJobsCount,
          },
        });
      }

      const fixedCount = results.filter(
        (r) => r.completedJobs.fixed || r.currentJobs.fixed
      ).length;

      console.log(
        `Technician stats recalculation completed. Fixed ${fixedCount} technicians.`
      );

      res.status(200).json({
        status: "success",
        message: `Technician statistics recalculated successfully. Fixed ${fixedCount} technicians.`,
        data: {
          totalTechnicians: technicians.length,
          fixedTechnicians: fixedCount,
          results: results,
        },
      });
    } catch (error) {
      console.error("Recalculate technician stats error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to recalculate technician statistics",
      });
    }
  }
);

export default router;
