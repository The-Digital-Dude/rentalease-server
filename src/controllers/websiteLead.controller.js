import WebsiteLead from "../models/WebsiteLead.js";
import mongoose from "mongoose";

// Helper validation functions
const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);

// Create a new website lead (PUBLIC ENDPOINT - no auth required)
export const createLead = async (req, res) => {
  try {
    const { firstName, lastName, email, message } = req.body;

    // Validation
    const errors = {};
    if (!firstName || firstName.trim().length < 2) {
      errors.firstName = "First name is required (min 2 characters)";
    }
    if (!lastName || lastName.trim().length < 2) {
      errors.lastName = "Last name is required (min 2 characters)";
    }
    if (!email) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Invalid email format";
    }
    if (!message || message.trim().length < 10) {
      errors.message = "Message is required (min 10 characters)";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation errors",
        errors,
      });
    }

    // Check for duplicate email in recent submissions (within last 24 hours)
    const recentLead = await WebsiteLead.findOne({
      email: email.toLowerCase(),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    if (recentLead) {
      return res.status(409).json({
        status: "error",
        message: "A lead with this email was already submitted within the last 24 hours",
      });
    }

    // Create new lead
    const newLead = new WebsiteLead({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
    });

    const savedLead = await newLead.save();

    res.status(201).json({
      status: "success",
      message: "Lead submitted successfully",
      data: {
        lead: {
          id: savedLead._id,
          firstName: savedLead.firstName,
          lastName: savedLead.lastName,
          email: savedLead.email,
          status: savedLead.status,
          createdAt: savedLead.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create lead error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to submit lead. Please try again later.",
    });
  }
};

// Get all leads (AUTHENTICATED - SuperUser and Agency only)
export const getLeads = async (req, res) => {
  try {
    // Check authorization
    if (!req.superUser && !req.agency) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. Only SuperUser and Agency can access leads.",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (status && ["new", "contacted", "qualified", "converted", "closed"].includes(status)) {
      query.status = status;
    }

    // Get leads with pagination
    const leads = await WebsiteLead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalLeads = await WebsiteLead.countDocuments(query);
    const totalPages = Math.ceil(totalLeads / limit);

    res.json({
      status: "success",
      data: {
        leads,
        pagination: {
          currentPage: page,
          totalPages,
          totalLeads,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get leads error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to fetch leads",
    });
  }
};

// Get a single lead by ID (AUTHENTICATED - SuperUser and Agency only)
export const getLeadById = async (req, res) => {
  try {
    // Check authorization
    if (!req.superUser && !req.agency) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. Only SuperUser and Agency can access leads.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid lead ID",
      });
    }

    const lead = await WebsiteLead.findById(id);

    if (!lead) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found",
      });
    }

    res.json({
      status: "success",
      data: { lead },
    });
  } catch (error) {
    console.error("Get lead by ID error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to fetch lead",
    });
  }
};

// Update lead status and notes (AUTHENTICATED - SuperUser and Agency only)
export const updateLead = async (req, res) => {
  try {
    // Check authorization
    if (!req.superUser && !req.agency) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. Only SuperUser and Agency can update leads.",
      });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid lead ID",
      });
    }

    // Validation
    const errors = {};
    if (status && !["new", "contacted", "qualified", "converted", "closed"].includes(status)) {
      errors.status = "Invalid status. Must be one of: new, contacted, qualified, converted, closed";
    }
    if (notes && notes.length > 500) {
      errors.notes = "Notes cannot exceed 500 characters";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Validation errors",
        errors,
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes.trim();

    const updatedLead = await WebsiteLead.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedLead) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found",
      });
    }

    res.json({
      status: "success",
      message: "Lead updated successfully",
      data: { lead: updatedLead },
    });
  } catch (error) {
    console.error("Update lead error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to update lead",
    });
  }
};

// Delete a lead (AUTHENTICATED - SuperUser only)
export const deleteLead = async (req, res) => {
  try {
    // Check authorization - only SuperUser can delete leads
    if (!req.superUser) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. Only SuperUser can delete leads.",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid lead ID",
      });
    }

    const deletedLead = await WebsiteLead.findByIdAndDelete(id);

    if (!deletedLead) {
      return res.status(404).json({
        status: "error",
        message: "Lead not found",
      });
    }

    res.json({
      status: "success",
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Delete lead error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to delete lead",
    });
  }
};

// Get lead statistics (AUTHENTICATED - SuperUser and Agency only)
export const getLeadStats = async (req, res) => {
  try {
    // Check authorization
    if (!req.superUser && !req.agency) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. Only SuperUser and Agency can access lead statistics.",
      });
    }

    const stats = await WebsiteLead.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalLeads = await WebsiteLead.countDocuments();
    const recentLeads = await WebsiteLead.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const statusStats = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
      closed: 0,
    };

    stats.forEach(stat => {
      statusStats[stat._id] = stat.count;
    });

    res.json({
      status: "success",
      data: {
        totalLeads,
        recentLeads,
        statusBreakdown: statusStats,
      },
    });
  } catch (error) {
    console.error("Get lead stats error:", error);
    res.status(500).json({
      status: "error",
      message: "Unable to fetch lead statistics",
    });
  }
};