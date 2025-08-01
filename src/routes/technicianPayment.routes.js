import express from "express";
import mongoose from "mongoose";
import TechnicianPayment from "../models/TechnicianPayment.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { getOwnerInfo, getCreatorInfo } from "../utils/propertyHelpers.js";

const router = express.Router();

// GET - Get all technician payments (with filtering)
router.get("/", authenticate, async (req, res) => {
  try {
    const {
      technicianId,
      agencyId,
      status,
      jobType,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;

    // Check if user is authorized to view payments
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    // Build filter object
    const filter = {};

    // If user is an agency, only show their payments
    if (ownerInfo.ownerType === "Agency") {
      filter.agencyId = ownerInfo.ownerId;
    }

    // Add other filters
    if (technicianId) {
      filter.technicianId = technicianId;
    }
    if (agencyId && ownerInfo.ownerType === "SuperUser") {
      filter.agencyId = agencyId;
    }
    if (status) {
      filter.status = status;
    }
    if (jobType) {
      filter.jobType = jobType;
    }
    if (startDate || endDate) {
      filter.jobCompletedAt = {};
      if (startDate) {
        filter.jobCompletedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.jobCompletedAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    // Execute query with pagination
    const payments = await TechnicianPayment.find(filter)
      .populate("technicianId", "fullName email phone")
      .populate("jobId", "job_id property jobType dueDate")
      .populate("agencyId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count for pagination
    const total = await TechnicianPayment.countDocuments(filter);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: "success",
      data: {
        payments: payments.map((payment) => payment.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNextPage,
          hasPrevPage,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get technician payments error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to get technician payments",
    });
  }
});

// GET - Get technician payment by ID
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment ID format",
      });
    }

    // Check if user is authorized to view this payment
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    const payment = await TechnicianPayment.findById(id)
      .populate("technicianId", "fullName email phone")
      .populate("jobId", "job_id property jobType dueDate description")
      .populate("agencyId", "name email");

    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Technician payment not found",
      });
    }

    // If user is an agency, check if they own this payment
    if (
      ownerInfo.ownerType === "Agency" &&
      payment.agencyId.toString() !== ownerInfo.ownerId.toString()
    ) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this payment",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        payment: payment.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Get technician payment error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to get technician payment",
    });
  }
});

// PATCH - Update payment status (mark as paid)
router.patch("/:id/status", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment ID format",
      });
    }

    // Check if user is authorized to update this payment
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Agency") {
      return res.status(403).json({
        status: "error",
        message: "Only agencies can update payment status",
      });
    }

    const payment = await TechnicianPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Technician payment not found",
      });
    }

    // Check if agency owns this payment
    if (payment.agencyId.toString() !== ownerInfo.ownerId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this payment",
      });
    }

    // Validate status
    if (!["Pending", "Paid", "Cancelled"].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid status. Must be one of: Pending, Paid, Cancelled",
      });
    }

    // Update payment
    const updateData = {
      status,
      notes: notes || payment.notes,
    };

    // Set payment date if marking as paid
    if (status === "Paid" && !payment.paymentDate) {
      updateData.paymentDate = new Date();
    }

    const updatedPayment = await TechnicianPayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate("technicianId", "fullName email phone")
      .populate("jobId", "job_id property jobType dueDate")
      .populate("agencyId", "name email");

    res.status(200).json({
      status: "success",
      message: "Payment status updated successfully",
      data: {
        payment: updatedPayment.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Update payment status error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to update payment status",
    });
  }
});

// GET - Get payments for a specific technician
router.get("/technician/:technicianId", authenticate, async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(technicianId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid technician ID format",
      });
    }

    // Check if user is authorized
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(403).json({
        status: "error",
        message: "Access denied",
      });
    }

    // Build filter
    const filter = { technicianId };

    // If user is an agency, only show their payments
    if (ownerInfo.ownerType === "Agency") {
      filter.agencyId = ownerInfo.ownerId;
    }

    if (status) {
      filter.status = status;
    }
    if (startDate || endDate) {
      filter.jobCompletedAt = {};
      if (startDate) {
        filter.jobCompletedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.jobCompletedAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const payments = await TechnicianPayment.find(filter)
      .populate("jobId", "job_id property jobType dueDate")
      .populate("agencyId", "name")
      .sort({ jobCompletedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await TechnicianPayment.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      status: "success",
      data: {
        payments: payments.map((payment) => payment.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get technician payments error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to get technician payments",
    });
  }
});

export default router;
