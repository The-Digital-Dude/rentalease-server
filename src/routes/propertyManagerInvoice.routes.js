import express from "express";
import mongoose from "mongoose";
import PropertyManagerInvoice from "../models/PropertyManagerInvoice.js";
import Property from "../models/Property.js";
import PropertyManager from "../models/PropertyManager.js";
import Agency from "../models/Agency.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";

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
  } else if (req.propertyManager) {
    return {
      name: req.propertyManager.fullName,
      type: "PropertyManager",
      id: req.propertyManager.id,
      assignedProperties: req.propertyManager.assignedProperties,
    };
  } else if (req.teamMember) {
    return {
      name:
        req.teamMember.fullName ||
        `${req.teamMember.firstName} ${req.teamMember.lastName}`,
      type: "TeamMember",
      id: req.teamMember.id,
    };
  }
  return null;
};

// POST - Create new PropertyManagerInvoice
router.post(
  "/",
  // authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { propertyId, description, amount, dueDate, notes } = req.body;

      // Validate required fields
      if (!propertyId || !description || !amount || !dueDate) {
        return res.status(400).json({
          status: "error",
          message: "Please provide all required fields",
          details: {
            propertyId: !propertyId ? "Property ID is required" : null,
            description: !description ? "Description is required" : null,
            amount: !amount ? "Amount is required" : null,
            dueDate: !dueDate ? "Due date is required" : null,
          },
        });
      }

      // Validate MongoDB ObjectIds
      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID format",
        });
      }

      // Validate amount
      if (isNaN(amount) || amount < 0) {
        return res.status(400).json({
          status: "error",
          message: "Amount must be a non-negative number",
        });
      }

      // Validate due date
      const dueDateObj = new Date(dueDate);
      if (isNaN(dueDateObj.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid due date format",
        });
      }

      // Check if property exists and populate necessary fields
      const property = await Property.findById(propertyId).populate(
        "assignedPropertyManager agency"
      );
      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      // Ensure property has a property manager assigned
      if (!property.assignedPropertyManager) {
        return res.status(400).json({
          status: "error",
          message: "Property does not have a property manager assigned",
        });
      }

      // Ensure property has an agency assigned
      if (!property.agency) {
        return res.status(400).json({
          status: "error",
          message: "Property does not have an agency assigned",
        });
      }

      const propertyManagerId = property.assignedPropertyManager._id;
      const agencyId = property.agency._id;

      // Create invoice
      const invoiceData = {
        propertyId,
        propertyManagerId,
        agencyId,
        description,
        amount,
        dueDate: dueDateObj,
        notes,
      };

      const invoice = new PropertyManagerInvoice(invoiceData);
      await invoice.save();

      // Populate references for response
      await invoice.populate([
        { path: "propertyId", select: "address propertyType region" },
        { path: "propertyManagerId", select: "firstName lastName email phone" },
        { path: "agencyId", select: "companyName contactPerson email" },
      ]);

      res.status(201).json({
        status: "success",
        message: "Property Manager Invoice created successfully",
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Create property manager invoice error:", error);

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
        message: "Failed to create property manager invoice",
      });
    }
  }
);

// GET - Get all PropertyManagerInvoices (with filtering and pagination)
router.get(
  "/",
  // authenticateUserTypes([
  //   "SuperUser",
  //   "TeamMember",
  //   "Agency",
  //   "PropertyManager",
  // ]),
  async (req, res) => {
    try {
      // Query parameters
      const {
        status,
        propertyId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query from provided filters only (no user context)
      let query = {};

      // Add filters
      if (status) query.status = status;
      if (propertyId) query.propertyId = propertyId;

      // Add date range filter
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const invoices = await PropertyManagerInvoice.find(query)
        .populate([
          { path: "propertyId", select: "address propertyType region" },
          {
            path: "propertyManagerId",
            select: "firstName lastName email phone",
          },
          { path: "agencyId", select: "companyName contactPerson" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalInvoices = await PropertyManagerInvoice.countDocuments(query);

      // Get status counts for dashboard
      const statusCounts = await PropertyManagerInvoice.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Calculate total amount
      const amountStats = await PropertyManagerInvoice.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $ne: ["$status", "Paid"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoices retrieved successfully",
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
            totalAmount: amountStats[0]?.totalAmount || 0,
            paidAmount: amountStats[0]?.paidAmount || 0,
            pendingAmount: amountStats[0]?.pendingAmount || 0,
          },
        },
      });
    } catch (error) {
      console.error("Get property manager invoices error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve property manager invoices",
      });
    }
  }
);

// GET - Get PropertyManagerInvoices by Property Manager ID
router.get(
  "/property-manager/:propertyManagerId",
  // authenticateUserTypes([
  //   "SuperUser",
  //   "TeamMember",
  //   "Agency",
  //   "PropertyManager",
  // ]),
  async (req, res) => {
    try {
      const { propertyManagerId } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(propertyManagerId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property manager ID format",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userInfo.type === "SuperUser" || userInfo.type === "TeamMember") {
        hasAccess = true;
      } else if (
        userInfo.type === "PropertyManager" &&
        propertyManagerId === userInfo.id
      ) {
        hasAccess = true;
      } else if (userInfo.type === "Agency") {
        // Check if the property manager belongs to the agency
        const propertyManager = await PropertyManager.findById(
          propertyManagerId
        );
        if (
          propertyManager &&
          propertyManager.owner.ownerType === "Agency" &&
          propertyManager.owner.ownerId.toString() === userInfo.id
        ) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. You do not have permission to view these invoices.",
        });
      }

      // Query parameters
      const {
        status,
        propertyId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query
      let query = { propertyManagerId };

      // Add filters
      if (status) query.status = status;
      if (propertyId) query.propertyId = propertyId;

      // Add date range filter
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const invoices = await PropertyManagerInvoice.find(query)
        .populate([
          { path: "propertyId", select: "address propertyType region" },
          {
            path: "propertyManagerId",
            select: "firstName lastName email phone",
          },
          { path: "agencyId", select: "companyName contactPerson" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalInvoices = await PropertyManagerInvoice.countDocuments(query);

      // Get status counts
      const statusCounts = await PropertyManagerInvoice.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Calculate total amount
      const amountStats = await PropertyManagerInvoice.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $ne: ["$status", "Paid"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      res.status(200).json({
        status: "success",
        message:
          "Property Manager Invoices retrieved successfully for property manager",
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
            totalAmount: amountStats[0]?.totalAmount || 0,
            paidAmount: amountStats[0]?.paidAmount || 0,
            pendingAmount: amountStats[0]?.pendingAmount || 0,
          },
        },
      });
    } catch (error) {
      console.error("Get invoices by property manager error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve invoices by property manager",
      });
    }
  }
);

// GET - Get PropertyManagerInvoices by Agency ID
router.get(
  "/agency/:agencyId",
  // authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { agencyId } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(agencyId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid agency ID format",
        });
      }

      // Check access permissions
      let hasAccess = false;

      if (userInfo.type === "SuperUser" || userInfo.type === "TeamMember") {
        hasAccess = true;
      } else if (userInfo.type === "Agency" && agencyId === userInfo.id) {
        hasAccess = true;
      }

      if (!hasAccess) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. You do not have permission to view these invoices.",
        });
      }

      // Query parameters
      const {
        status,
        propertyId,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Build query
      let query = { agencyId };

      // Add filters
      if (status) query.status = status;
      if (propertyId) query.propertyId = propertyId;

      // Add date range filter
      if (startDate || endDate) {
        query.dueDate = {};
        if (startDate) query.dueDate.$gte = new Date(startDate);
        if (endDate) query.dueDate.$lte = new Date(endDate);
      }

      // Calculate pagination
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const invoices = await PropertyManagerInvoice.find(query)
        .populate([
          { path: "propertyId", select: "address propertyType region" },
          {
            path: "propertyManagerId",
            select: "firstName lastName email phone",
          },
          { path: "agencyId", select: "companyName contactPerson" },
        ])
        .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit));

      // Get total count
      const totalInvoices = await PropertyManagerInvoice.countDocuments(query);

      // Get status counts
      const statusCounts = await PropertyManagerInvoice.aggregate([
        { $match: query },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      // Calculate total amount
      const amountStats = await PropertyManagerInvoice.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            paidAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0],
              },
            },
            pendingAmount: {
              $sum: {
                $cond: [{ $ne: ["$status", "Paid"] }, "$amount", 0],
              },
            },
          },
        },
      ]);

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoices retrieved successfully for agency",
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
            totalAmount: amountStats[0]?.totalAmount || 0,
            paidAmount: amountStats[0]?.paidAmount || 0,
            pendingAmount: amountStats[0]?.pendingAmount || 0,
          },
        },
      });
    } catch (error) {
      console.error("Get invoices by agency error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve invoices by agency",
      });
    }
  }
);

// GET - Get specific PropertyManagerInvoice by ID
router.get(
  "/:id",
  // authenticateUserTypes([
  //   "SuperUser",
  //   "TeamMember",
  //   "Agency",
  //   "PropertyManager",
  // ]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice ID format",
        });
      }

      const invoice = await PropertyManagerInvoice.findById(id).populate([
        { path: "propertyId", select: "address propertyType region agency" },
        { path: "propertyManagerId", select: "firstName lastName email phone" },
        { path: "agencyId", select: "companyName contactPerson email phone" },
      ]);

      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Property Manager Invoice not found",
        });
      }

      // Public access: no user checks

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoice retrieved successfully",
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Get property manager invoice error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to retrieve property manager invoice",
      });
    }
  }
);

// PUT - Update PropertyManagerInvoice
router.put(
  "/:id",
  // authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { description, amount, dueDate, notes, status } = req.body;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice ID format",
        });
      }

      const invoice = await PropertyManagerInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Property Manager Invoice not found",
        });
      }

      // Public access: no user checks

      // Prepare update data
      const updateData = {};

      if (description !== undefined) updateData.description = description;
      if (amount !== undefined) {
        if (isNaN(amount) || amount < 0) {
          return res.status(400).json({
            status: "error",
            message: "Amount must be a non-negative number",
          });
        }
        updateData.amount = amount;
      }
      if (dueDate !== undefined) {
        const dueDateObj = new Date(dueDate);
        if (isNaN(dueDateObj.getTime())) {
          return res.status(400).json({
            status: "error",
            message: "Invalid due date format",
          });
        }
        updateData.dueDate = dueDateObj;
      }
      if (notes !== undefined) updateData.notes = notes;
      if (status !== undefined) {
        if (!["Pending", "Sent", "Paid"].includes(status)) {
          return res.status(400).json({
            status: "error",
            message: "Status must be one of: Pending, Sent, Paid",
          });
        }
        updateData.status = status;

        // Update timestamps based on status
        if (status === "Sent" && !invoice.sentAt) {
          updateData.sentAt = new Date();
        }
        if (status === "Paid" && !invoice.paidAt) {
          updateData.paidAt = new Date();
        }
      }

      // Update the invoice
      const updatedInvoice = await PropertyManagerInvoice.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true,
          runValidators: true,
        }
      ).populate([
        { path: "propertyId", select: "address propertyType region" },
        { path: "propertyManagerId", select: "firstName lastName email phone" },
        { path: "agencyId", select: "companyName contactPerson email" },
      ]);

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoice updated successfully",
        data: {
          invoice: updatedInvoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Update property manager invoice error:", error);

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
        message: "Failed to update property manager invoice",
      });
    }
  }
);

// PATCH - Update PropertyManagerInvoice status
router.patch(
  "/:id/status",
  // authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, paymentMethod, paymentReference } = req.body;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice ID format",
        });
      }

      if (!status || !["Pending", "Sent", "Paid"].includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Valid status is required (Pending, Sent, Paid)",
        });
      }

      const invoice = await PropertyManagerInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Property Manager Invoice not found",
        });
      }

      // Public access: no user checks

      // Update status
      invoice.status = status;

      // Update timestamps based on status
      if (status === "Sent" && !invoice.sentAt) {
        invoice.sentAt = new Date();
      }
      if (status === "Paid" && !invoice.paidAt) {
        invoice.paidAt = new Date();
        if (paymentMethod) invoice.paymentMethod = paymentMethod;
        if (paymentReference) invoice.paymentReference = paymentReference;
      }

      await invoice.save();

      // Populate references for response
      await invoice.populate([
        { path: "propertyId", select: "address propertyType region" },
        { path: "propertyManagerId", select: "firstName lastName email phone" },
        { path: "agencyId", select: "companyName contactPerson email" },
      ]);

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoice status updated successfully",
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Update property manager invoice status error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to update property manager invoice status",
      });
    }
  }
);

// DELETE - Delete PropertyManagerInvoice
router.delete(
  "/:id",
  // authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice ID format",
        });
      }

      const invoice = await PropertyManagerInvoice.findById(id);
      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Property Manager Invoice not found",
        });
      }

      // Public access: no user checks

      // Prevent deletion of paid invoices
      if (invoice.status === "Paid") {
        return res.status(400).json({
          status: "error",
          message: "Cannot delete paid invoices",
        });
      }

      await PropertyManagerInvoice.findByIdAndDelete(id);

      res.status(200).json({
        status: "success",
        message: "Property Manager Invoice deleted successfully",
      });
    } catch (error) {
      console.error("Delete property manager invoice error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to delete property manager invoice",
      });
    }
  }
);

export default router;
