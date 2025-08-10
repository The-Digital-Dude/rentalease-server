import express from "express";
import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";

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
    if (!jobId || !technicianId || !agencyId || !description || !items) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
        details: {
          jobId: !jobId ? "Job ID is required" : null,
          technicianId: !technicianId ? "Technician ID is required" : null,
          agencyId: !agencyId ? "Agency ID is required" : null,
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

    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid technician ID format",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(agencyId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid agency ID format",
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

    // Check if technician exists
    const technician = await Technician.findById(technicianId);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    // Check if agency exists
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
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
      technicianId,
      agencyId,
      description,
      items: items.map((item) => ({
        ...item,
        amount: (item.quantity || 0) * (item.rate || 0),
      })),
      subtotal,
      tax,
      totalCost,
      notes,
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

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
router.get("/job/:jobId", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
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

// PATCH - Send invoice to agency
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

    // Check access permissions (only super users and technicians can send invoices)
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser") {
      hasAccess = true;
    } else if (
      userInfo.type === "Technician" &&
      invoice.technicianId.toString() === userInfo.id
    ) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only super users and the assigned technician can send invoices.",
      });
    }

    // Check if invoice is already sent or paid
    if (invoice.status === "Sent" || invoice.status === "Paid") {
      return res.status(400).json({
        status: "error",
        message: `Invoice cannot be sent. Current status: ${invoice.status}`,
        details: {
          currentStatus: invoice.status,
          allowedStatuses: ["Pending"],
        },
      });
    }

    // Update invoice status to "Sent"
    invoice.status = "Sent";
    invoice.sentAt = new Date();
    await invoice.save();

    // Send email notification to agency
    try {
      const agency = await Agency.findById(invoice.agencyId);
      if (agency) {
        await emailService.sendInvoiceEmail(invoice, agency);
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
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
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
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
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
