import express from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import { getAgencyServicePriceForJobType } from "../utils/agencyPricing.js";

const router = express.Router();

// Helper function to get user info for audit trails
const getUserInfo = (req) => {
  if (req.superUser) {
    return {
      name: req.superUser.name,
      type: "SuperUser",
      id: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      name: req.agency.companyName,
      type: "Agency",
      id: req.agency.id,
    };
  } else if (req.technician) {
    return {
      name: `${req.technician.firstName} ${req.technician.lastName}`,
      type: "Technician",
      id: req.technician.id,
    };
  } else if (req.propertyManager) {
    return {
      name: req.propertyManager.fullName,
      type: "PropertyManager",
      id: req.propertyManager.id,
      assignedProperties: req.propertyManager.assignedProperties,
    };
  } else if (req.teamMember) {
    return {
      name: req.teamMember.fullName || req.teamMember.name || req.teamMember.email,
      type: "TeamMember",
      id: req.teamMember.id,
    };
  }
  return null;
};

// Helper function to validate invoice items
const validateInvoiceItems = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: "At least one item is required" };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item.name || item.name.trim().length === 0) {
      return { isValid: false, error: `Item ${i + 1}: Name is required` };
    }

    if (!item.quantity || item.quantity <= 0) {
      return {
        isValid: false,
        error: `Item ${i + 1}: Quantity must be greater than 0`,
      };
    }

    if (!item.rate || item.rate < 0) {
      return {
        isValid: false,
        error: `Item ${i + 1}: Rate cannot be negative`,
      };
    }
  }

  return { isValid: true };
};

// Helper function to calculate invoice totals
const calculateInvoiceTotals = (items, tax = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const amount = (item.quantity || 0) * (item.rate || 0);
    return sum + amount;
  }, 0);

  const totalCost = subtotal + (tax || 0);

  return { subtotal, totalCost };
};

const resolveAgencyForJob = async (job) => {
  if (job.owner?.ownerType === "Agency") {
    return Agency.findById(job.owner.ownerId);
  }

  if (job.property) {
    const populatedJob = await job.populate({
      path: "property",
      select: "agency",
    });

    if (populatedJob.property?.agency) {
      return Agency.findById(populatedJob.property.agency);
    }
  }

  return null;
};

// POST - Create new invoice
router.post("/", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const {
      jobId,
      technicianId,
      agencyId,
      description,
      items,
      tax = 0,
      notes,
    } = req.body;

    // Validate required fields
    if (!jobId || !description || !items) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
        details: {
          jobId: !jobId ? "Job ID is required" : null,
          description: !description ? "Description is required" : null,
          items: !items ? "Items are required" : null,
        },
      });
    }

    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    // Validate invoice items
    const itemValidation = validateInvoiceItems(items);
    if (!itemValidation.isValid) {
      return res.status(400).json({
        status: "error",
        message: itemValidation.error,
      });
    }

    // Check if job exists and is completed
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    if (job.status !== "Completed") {
      return res.status(400).json({
        status: "error",
        message: "Invoice can only be created for completed jobs",
        details: {
          jobStatus: job.status,
          requiredStatus: "Completed",
        },
      });
    }

    const resolvedTechnicianId =
      technicianId || job.assignedTechnician?.toString?.() || job.assignedTechnician;
    if (!resolvedTechnicianId || !mongoose.Types.ObjectId.isValid(resolvedTechnicianId)) {
      return res.status(400).json({
        status: "error",
        message: "A valid technician is required to create an invoice for this job",
      });
    }

    // Check if technician exists
    const technician = await Technician.findById(resolvedTechnicianId);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    const resolvedAgency =
      agencyId && mongoose.Types.ObjectId.isValid(agencyId)
        ? await Agency.findById(agencyId)
        : await resolveAgencyForJob(job);

    const agency = resolvedAgency;
    if (!agency) {
      return res.status(400).json({
        status: "error",
        message: "An agency is required to create an invoice for this job",
      });
    }

    // Check if invoice already exists for this job
    const existingInvoice = await Invoice.findOne({ jobId });
    if (existingInvoice) {
      return res.status(409).json({
        status: "error",
        message: "Invoice already exists for this job",
        details: {
          existingInvoiceId: existingInvoice._id,
          existingInvoiceNumber: existingInvoice.invoiceNumber,
        },
      });
    }

    // Calculate totals
    const { subtotal, totalCost } = calculateInvoiceTotals(items, tax);

    // Create invoice with calculated amounts
    const invoiceData = {
      jobId,
      technicianId: technician._id,
      agencyId: agency._id,
      description,
      items: items.map((item) => ({
        ...item,
        amount: (item.quantity || 0) * (item.rate || 0),
      })),
      subtotal,
      tax,
      totalCost,
      notes,
      status: "Draft",
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    job.hasInvoice = true;
    job.invoice = invoice._id;
    await job.save();

    // Populate references for response
    await invoice.populate([
      { path: "jobId", select: "job_id jobType property" },
      { path: "technicianId", select: "firstName lastName email" },
      { path: "agencyId", select: "companyName contactPerson email" },
    ]);

    // Send notification to agency about new invoice
    try {
      const userInfo = getUserInfo(req);
      if (userInfo) {
        await notificationService.sendInvoiceCreatedNotification(
          invoice,
          job,
          technician,
          agency,
          userInfo
        );
      }
    } catch (notificationError) {
      console.error(
        "Failed to send invoice creation notification:",
        notificationError
      );
    }

    res.status(201).json({
      status: "success",
      message: "Invoice created successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Create invoice error:", error);

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
      message: "Failed to create invoice",
    });
  }
});

// GET - Get invoice for specific job
router.get("/job/:jobId", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { jobId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Find invoice for the job
    const invoice = await Invoice.findOne({ jobId }).populate([
      { path: "jobId", select: "job_id jobType property dueDate status" },
      { path: "technicianId", select: "firstName lastName email phone" },
      { path: "agencyId", select: "companyName contactPerson email phone" },
    ]);

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found for this job",
      });
    }

    // Check access permissions
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser") {
      hasAccess = true;
    } else if (
      userInfo.type === "Agency" &&
      invoice.agencyId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (
      userInfo.type === "Technician" &&
      invoice.technicianId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (userInfo.type === "PropertyManager") {
      // Check if Property Manager has access to the property associated with the job
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId.toString());
      const jobPropertyId = invoice.jobId.property.toString();
      hasAccess = assignedPropertyIds.includes(jobPropertyId);
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to view this invoice.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Invoice retrieved successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoice",
    });
  }
});

router.post(
  "/job/:jobId/generate-draft",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid job ID format",
        });
      }

      const job = await Job.findById(jobId).populate(
        "assignedTechnician",
        "firstName lastName email phone"
      );

      if (!job) {
        return res.status(404).json({
          status: "error",
          message: "Job not found",
        });
      }

      if (job.status !== "Completed") {
        return res.status(400).json({
          status: "error",
          message: "Draft invoices can only be generated for completed jobs",
        });
      }

      const existingInvoice = await Invoice.findOne({ jobId });
      if (existingInvoice) {
        return res.status(409).json({
          status: "error",
          message: "Invoice already exists for this job",
          data: {
            invoice: existingInvoice.getFullDetails(),
          },
        });
      }

      if (!job.assignedTechnician?._id && !job.assignedTechnician) {
        return res.status(400).json({
          status: "error",
          message:
            "Cannot generate invoice because no technician is assigned to this job",
        });
      }

      const agency = await resolveAgencyForJob(job);
      if (!agency) {
        return res.status(400).json({
          status: "error",
          message: "No agency is associated with this job",
        });
      }

      const servicePrice = getAgencyServicePriceForJobType(agency, job.jobType);
      if (!servicePrice) {
        return res.status(400).json({
          status: "error",
          message:
            "No agency service pricing is configured for this completed job type",
        });
      }

      const items = [
        {
          name: servicePrice.serviceType,
          quantity: 1,
          rate: servicePrice.price,
          amount: servicePrice.price,
        },
      ];

      const { subtotal, totalCost } = calculateInvoiceTotals(items, 0);

      const invoice = new Invoice({
        jobId: job._id,
        technicianId:
          job.assignedTechnician._id || job.assignedTechnician,
        agencyId: agency._id,
        description: `${servicePrice.serviceType} for completed job ${job.job_id}`,
        items,
        subtotal,
        tax: 0,
        totalCost,
        notes: `Manually generated draft invoice for completed job ${job.job_id}.`,
        status: "Draft",
      });

      await invoice.save();

      job.hasInvoice = true;
      job.invoice = invoice._id;
      await job.save();

      await invoice.populate([
        { path: "jobId", select: "job_id jobType property dueDate status" },
        { path: "technicianId", select: "firstName lastName email phone" },
        { path: "agencyId", select: "companyName contactPerson email phone" },
      ]);

      return res.status(201).json({
        status: "success",
        message: "Draft invoice generated successfully",
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Generate draft invoice error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to generate draft invoice",
      });
    }
  }
);

router.patch("/:invoiceId", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { description, items, tax = 0, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    if (invoice.status === "Sent" || invoice.status === "Paid") {
      return res.status(400).json({
        status: "error",
        message: "Sent or paid invoices cannot be edited",
      });
    }

    const itemValidation = validateInvoiceItems(items);
    if (!itemValidation.isValid) {
      return res.status(400).json({
        status: "error",
        message: itemValidation.error,
      });
    }

    const { subtotal, totalCost } = calculateInvoiceTotals(items, Number(tax || 0));

    invoice.description = description;
    invoice.items = items.map((item) => ({
      ...item,
      amount: (item.quantity || 0) * (item.rate || 0),
    }));
    invoice.tax = Number(tax || 0);
    invoice.subtotal = subtotal;
    invoice.totalCost = totalCost;
    invoice.notes = notes || "";

    await invoice.save();

    return res.status(200).json({
      status: "success",
      message: "Invoice updated successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update invoice",
    });
  }
});

// PATCH - Send invoice to agency and property managers
router.patch("/:invoiceId/send", authenticate, async (req, res) => {
  try {
    const { invoiceId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(invoiceId).populate([
      { path: "jobId", select: "job_id jobType property" },
      { path: "technicianId", select: "firstName lastName email" },
      { path: "agencyId", select: "companyName contactPerson email" },
    ]);

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    // Check access permissions (only super users and team members can send invoices)
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser" || userInfo.type === "TeamMember") {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only super users and team members can send invoices.",
      });
    }

    // Check if invoice is already sent or paid
    if (invoice.status === "Sent" || invoice.status === "Paid") {
      return res.status(400).json({
        status: "error",
        message: `Invoice cannot be sent. Current status: ${invoice.status}`,
        details: {
          currentStatus: invoice.status,
          allowedStatuses: ["Draft", "Pending"],
        },
      });
    }

    // Update invoice status to "Sent"
    invoice.status = "Sent";
    invoice.sentAt = new Date();
    await invoice.save();

    const job = await Job.findById(invoice.jobId).populate(
      "property",
      "address"
    );
    const propertyManagers = job?.property?._id
      ? await PropertyManager.find({
          "assignedProperties.propertyId": job.property._id,
          "assignedProperties.status": "Active",
        }).select("firstName lastName email")
      : [];

    // Send email notification to agency and property managers
    try {
      const agency = await Agency.findById(invoice.agencyId);
      if (agency) {
        await emailService.sendInvoiceEmail(invoice, agency);

        const reportUrl = job?.reportFile || null;
        const propertyAddress = job?.property?.address?.fullAddress || "Property";
        const propertyManagerName = propertyManagers
          .map((manager) => `${manager.firstName || ""} ${manager.lastName || ""}`.trim())
          .filter(Boolean)
          .join(", ");

        await emailService.sendCompletedJobDocumentsEmail(
          {
            email: agency.email,
            name: agency.contactPerson || agency.companyName,
          },
          {
            propertyAddress,
            jobType: job?.jobType,
            invoice,
            reportUrl,
            agencyName: agency.companyName,
            propertyManagerName,
          }
        );

        for (const manager of propertyManagers) {
          if (!manager.email) continue;
          await emailService.sendCompletedJobDocumentsEmail(
            {
              email: manager.email,
              name: `${manager.firstName || ""} ${manager.lastName || ""}`.trim(),
            },
            {
              propertyAddress,
              jobType: job?.jobType,
              invoice,
              reportUrl,
              agencyName: agency.companyName,
              propertyManagerName,
            }
          );
        }
      }
    } catch (emailError) {
      console.error("Failed to send invoice email:", emailError);
    }

    // Send in-app notification
    try {
      if (userInfo) {
        await notificationService.sendInvoiceSentNotification(
          invoice,
          userInfo
        );
      }
    } catch (notificationError) {
      console.error(
        "Failed to send invoice sent notification:",
        notificationError
      );
    }

    res.status(200).json({
      status: "success",
      message: "Invoice sent successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Send invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send invoice",
    });
  }
});

// GET - Get all invoices (with filtering and pagination)
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine user information",
      });
    }

    // Query parameters
    const {
      status,
      technicianId,
      agencyId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query based on user type
    let query = {};

    if (userInfo.type === "Agency") {
      query.agencyId = userInfo.id;
    } else if (userInfo.type === "Technician") {
      query.technicianId = userInfo.id;
    } else if (userInfo.type === "PropertyManager") {
      // Property Managers can only see invoices for properties they manage
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId);
      // We need to find jobs that belong to the assigned properties, then get invoices for those jobs
      const jobsForProperties = await Job.find({ property: { $in: assignedPropertyIds } }).select('_id');
      const jobIds = jobsForProperties.map(job => job._id);
      query.jobId = { $in: jobIds };
    }
    // Super users can see all invoices

    // Add filters
    if (status) query.status = status;
    if (technicianId) query.technicianId = technicianId;
    if (agencyId) query.agencyId = agencyId;

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const invoices = await Invoice.find(query)
      .populate([
        { path: "jobId", select: "job_id jobType property" },
        { path: "technicianId", select: "firstName lastName email" },
        { path: "agencyId", select: "companyName contactPerson" },
      ])
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalInvoices = await Invoice.countDocuments(query);

    // Get status counts for dashboard
    const statusCounts = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Invoices retrieved successfully",
      data: {
        invoices: invoices.map((invoice) => invoice.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalInvoices / parseInt(limit)),
          totalItems: totalInvoices,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + invoices.length < totalInvoices,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalInvoices,
        },
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoices",
    });
  }
});

// GET - Get specific invoice by ID
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(id).populate([
      { path: "jobId", select: "job_id jobType property dueDate status" },
      { path: "technicianId", select: "firstName lastName email phone" },
      { path: "agencyId", select: "companyName contactPerson email phone" },
    ]);

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    // Check access permissions
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser") {
      hasAccess = true;
    } else if (
      userInfo.type === "Agency" &&
      invoice.agencyId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (
      userInfo.type === "Technician" &&
      invoice.technicianId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (userInfo.type === "PropertyManager") {
      // Check if Property Manager has access to the property associated with the job
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId.toString());
      const jobPropertyId = invoice.jobId.property.toString();
      hasAccess = assignedPropertyIds.includes(jobPropertyId);
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to view this invoice.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Invoice retrieved successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoice",
    });
  }
});

export default router;
