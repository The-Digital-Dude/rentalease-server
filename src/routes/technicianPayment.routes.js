import express from "express";
import mongoose from "mongoose";
import TechnicianPayment from "../models/TechnicianPayment.js";
import { authenticateUserTypes } from "../middleware/auth.middleware.js";
import { getOwnerInfo } from "../utils/authHelpers.js";

const router = express.Router();

// GET - Get all technician payments (with filtering)
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'Technician']), async (req, res) => {
  try {
    const {
      technicianId,
      agencyId,
      status,
      jobType,
      startDate,
      endDate,
      search,
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

    // If user is a technician, only show their own payments
    if (ownerInfo.ownerType === "Technician") {
      filter.technicianId = ownerInfo.ownerId;
    }
    // If user is an agency, only show their payments
    else if (ownerInfo.ownerType === "Agency") {
      filter.agencyId = ownerInfo.ownerId;
    }
    // Super users and team members can see all payments (no additional filter)

    // Add other filters
    if (technicianId && ownerInfo.ownerType !== "Technician") {
      filter.technicianId = technicianId;
    }
    if (agencyId && (ownerInfo.ownerType === "SuperUser" || ownerInfo.ownerType === "TeamMember")) {
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

    // Execute query with pagination and search
    let payments, total;

    if (search && search.trim()) {
      // Use aggregation pipeline for searching populated fields
      const searchRegex = new RegExp(search.trim(), 'i');

      const pipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "technicians",
            localField: "technicianId",
            foreignField: "_id",
            as: "technicianData"
          }
        },
        {
          $lookup: {
            from: "jobs",
            localField: "jobId",
            foreignField: "_id",
            as: "jobData"
          }
        },
        {
          $lookup: {
            from: "properties",
            localField: "jobData.property",
            foreignField: "_id",
            as: "propertyData"
          }
        },
        {
          $lookup: {
            from: "agencies",
            localField: "agencyId",
            foreignField: "_id",
            as: "agencyData"
          }
        },
        {
          $match: {
            $or: [
              { paymentNumber: searchRegex },
              { notes: searchRegex },
              { "technicianData.firstName": searchRegex },
              { "technicianData.lastName": searchRegex },
              { "technicianData.email": searchRegex },
              { "jobData.job_id": searchRegex },
              { "jobData.property": searchRegex }
            ]
          }
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum }
      ];

      const result = await TechnicianPayment.aggregate(pipeline);

      // Get total count for pagination
      const countPipeline = [
        { $match: filter },
        {
          $lookup: {
            from: "technicians",
            localField: "technicianId",
            foreignField: "_id",
            as: "technicianData"
          }
        },
        {
          $lookup: {
            from: "jobs",
            localField: "jobId",
            foreignField: "_id",
            as: "jobData"
          }
        },
        {
          $lookup: {
            from: "properties",
            localField: "jobData.property",
            foreignField: "_id",
            as: "propertyData"
          }
        },
        {
          $match: {
            $or: [
              { paymentNumber: searchRegex },
              { notes: searchRegex },
              { "technicianData.firstName": searchRegex },
              { "technicianData.lastName": searchRegex },
              { "technicianData.email": searchRegex },
              { "jobData.job_id": searchRegex },
              { "propertyData.name": searchRegex },
              { "propertyData.address": searchRegex }
            ]
          }
        },
        { $count: "total" }
      ];

      const countResult = await TechnicianPayment.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;

      // Convert aggregation result to proper TechnicianPayment documents
      payments = result.map(doc => ({
        ...doc,
        technicianId: doc.technicianData[0],
        jobId: {
          ...doc.jobData[0],
          property: doc.propertyData[0]
        },
        agencyId: doc.agencyData[0],
        getSummary: function() {
          return {
            id: this._id,
            paymentNumber: this.paymentNumber,
            technicianId: this.technicianId,
            jobId: this.jobId,
            agencyId: this.agencyId,
            jobType: this.jobType,
            amount: this.amount,
            status: this.status,
            jobCompletedAt: this.jobCompletedAt,
            paymentDate: this.paymentDate,
            notes: this.notes,
            createdAt: this.createdAt
          };
        }
      }));
    } else {
      // Regular query without search
      payments = await TechnicianPayment.find(filter)
        .populate("technicianId", "firstName lastName email phone")
        .populate({
          path: "jobId",
          select: "job_id property jobType dueDate",
          populate: {
            path: "property",
            select: "name address"
          }
        })
        .populate("agencyId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      total = await TechnicianPayment.countDocuments(filter);
    }

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

// GET - Get payments for the authenticated technician (my payments)
router.get("/my-payments", authenticateUserTypes(['Technician']), async (req, res) => {
  try {
    const { status, startDate, endDate, page = 1, limit = 20 } = req.query;

    // Check if user is a technician
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Only technicians can access their payments",
      });
    }

    // Build filter for technician's own payments
    const filter = { technicianId: ownerInfo.ownerId };

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
      .populate("jobId", "job_id property jobType dueDate description")
      .populate("agencyId", "name email")
      .sort({ jobCompletedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await TechnicianPayment.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    // Get status counts for dashboard
    const statusCounts = await TechnicianPayment.aggregate([
      {
        $match: {
          technicianId: new mongoose.Types.ObjectId(ownerInfo.ownerId.toString()),
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "My payments retrieved successfully",
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
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalPayments: total,
        },
      },
    });
  } catch (error) {
    console.error("Get my payments error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "Failed to get my payments",
    });
  }
});

// GET - Get technician payment by ID
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'Technician']), async (req, res) => {
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
      .populate("technicianId", "firstName lastName email phone")
      .populate("jobId", "job_id property jobType dueDate description")
      .populate("agencyId", "name email");

    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Technician payment not found",
      });
    }

    // If user is a technician, check if this is their payment
    if (
      ownerInfo.ownerType === "Technician" &&
      payment.technicianId.toString() !== ownerInfo.ownerId.toString()
    ) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this payment",
      });
    }
    // If user is an agency, check if they own this payment
    else if (
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
router.patch("/:id/status", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
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
    if (!ownerInfo || (ownerInfo.ownerType !== "Agency" && ownerInfo.ownerType !== "SuperUser" && ownerInfo.ownerType !== "TeamMember")) {
      return res.status(403).json({
        status: "error",
        message: "Only agencies, super users, and team members can update payment status",
      });
    }

    const payment = await TechnicianPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        status: "error",
        message: "Technician payment not found",
      });
    }

    // Check if user has access to this payment
    if (ownerInfo.ownerType === "Agency" && payment.agencyId.toString() !== ownerInfo.ownerId.toString()) {
      return res.status(403).json({
        status: "error",
        message: "Access denied to this payment",
      });
    }
    // Super users and team members can update any payment

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
      .populate("technicianId", "firstName lastName email phone")
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
router.get("/technician/:technicianId", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'Technician']), async (req, res) => {
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

    // If user is a technician, they can only view their own payments
    if (ownerInfo.ownerType === "Technician") {
      if (technicianId !== ownerInfo.ownerId.toString()) {
        return res.status(403).json({
          status: "error",
          message: "You can only view your own payments",
        });
      }
    }
    // If user is an agency, only show their payments
    else if (ownerInfo.ownerType === "Agency") {
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
