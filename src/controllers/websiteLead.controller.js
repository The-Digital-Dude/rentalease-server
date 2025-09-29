import WebsiteLead from "../models/WebsiteLead.js";
import mongoose from "mongoose";

// Helper validation functions
const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);

const isValidPhone = (phone) => /^\+?[0-9()\-\.\s]{7,20}$/.test(phone);

const escapeRegex = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Create a new website lead (PUBLIC ENDPOINT - no auth required)
export const createLead = async (req, res) => {
  try {
    const { firstName, lastName, email, message, phone, profession, source } =
      req.body;

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

    const trimmedPhone = typeof phone === "string" ? phone.trim() : "";

    if (trimmedPhone && !isValidPhone(trimmedPhone)) {
      errors.phone = "Invalid phone format";
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
        message:
          "A lead with this email was already submitted within the last 24 hours",
      });
    }

    // Create new lead
    const newLead = new WebsiteLead({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      message: message.trim(),
      source,
      ...(trimmedPhone ? { phone: trimmedPhone } : {}),
      ...(profession ? { profession: profession.trim() } : {}),
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
          phone: savedLead.phone,
          profession: savedLead.profession,
          status: savedLead.status,
          createdAt: savedLead.createdAt,
          source: savedLead.source,
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
    const searchTerm =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const sortByQuery =
      typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
    const sortOrderQuery = req.query.sortOrder === "asc" ? "asc" : "desc";
    const startDateParam = req.query.startDate;
    const endDateParam = req.query.endDate;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (
      status &&
      ["new", "contacted", "qualified", "converted", "closed"].includes(status)
    ) {
      query.status = status;
    }

    let startDate = null;
    let endDate = null;

    if (typeof startDateParam === "string" && startDateParam.trim()) {
      const parsedStart = new Date(startDateParam);
      if (Number.isNaN(parsedStart.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid startDate parameter",
        });
      }
      startDate = parsedStart;
    }

    if (typeof endDateParam === "string" && endDateParam.trim()) {
      const parsedEnd = new Date(endDateParam);
      if (Number.isNaN(parsedEnd.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid endDate parameter",
        });
      }
      endDate = parsedEnd;
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        status: "error",
        message: "startDate cannot be later than endDate",
      });
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = startDate;
      }
      if (endDate) {
        query.createdAt.$lte = endDate;
      }
    }

    if (searchTerm) {
      const regex = new RegExp(escapeRegex(searchTerm), "i");
      query.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { phone: regex },
        { profession: regex },
        { message: regex },
      ];
    }

    const allowedSortFields = {
      createdAt: "createdAt",
      firstName: "firstName",
      lastName: "lastName",
      email: "email",
      profession: "profession",
      status: "status",
    };

    const sortField = allowedSortFields[sortByQuery] || "createdAt";
    const sortDirection = sortOrderQuery === "asc" ? 1 : -1;
    const sortCriteria = { [sortField]: sortDirection };

    // Get leads with pagination
    const leads = await WebsiteLead.find(query)
      .sort(sortCriteria)
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
    const { status, notes, profession } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid lead ID",
      });
    }

    // Validation
    const errors = {};
    if (
      status &&
      !["new", "contacted", "qualified", "converted", "closed"].includes(status)
    ) {
      errors.status =
        "Invalid status. Must be one of: new, contacted, qualified, converted, closed";
    }
    if (notes && notes.length > 500) {
      errors.notes = "Notes cannot exceed 500 characters";
    }
    if (
      profession &&
      ![
        "Property Manager",
        "Landlord",
        "Tenant",
        "Real Estate Agent",
        "Property Developer",
        "Property Investor",
        "Strata Manager",
        "Building Manager",
        "Facility Manager",
        "Other",
      ].includes(profession)
    ) {
      errors.profession = "Invalid profession value";
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
    if (profession !== undefined)
      updateData.profession = profession ? profession.trim() : null;

    const updatedLead = await WebsiteLead.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

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
        message:
          "Unauthorized. Only SuperUser and Agency can access lead statistics.",
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

    stats.forEach((stat) => {
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
