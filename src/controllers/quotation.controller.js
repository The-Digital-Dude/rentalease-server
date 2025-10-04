import mongoose from "mongoose";
import Quotation from "../models/Quotation.js";
import Job from "../models/Job.js";
import Invoice from "../models/Invoice.js";
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import notificationService from "../services/notification.service.js";
import emailService from "../services/email.service.js";

const getAgencyDisplayName = (agency) => {
  if (!agency) {
    return "The agency";
  }

  if (typeof agency === "string") {
    return agency;
  }

  return (
    agency.companyName ||
    agency.contactPerson ||
    agency.email ||
    agency.name ||
    "The agency"
  );
};

const getPropertyDisplayName = (property) => {
  if (!property) {
    return "the property";
  }

  if (typeof property === "string") {
    return property;
  }

  if (property.address) {
    if (typeof property.address === "string") {
      return property.address;
    }

    if (property.address.fullAddress) {
      return property.address.fullAddress;
    }

    const { street, suburb, state, postcode } = property.address;
    const parts = [street, suburb, state, postcode].filter(Boolean);
    if (parts.length) {
      return parts.join(", ");
    }
  }

  return property.title || property.name || "the property";
};

const addRecipient = (recipients, seen, recipientType, recipientId) => {
  if (!recipientId) {
    return;
  }

  const key = `${recipientType}:${recipientId.toString()}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  recipients.push({ recipientType, recipientId });
};

// Helper function to get user info based on request
const getUserInfo = (req) => {
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
  } else if (req.propertyManager) {
    return {
      userType: "PropertyManager",
      userId: req.propertyManager.id,
    };
  }
  return null;
};

// @desc    Create quotation request
// @route   POST /api/v1/quotations
// @access  Agency, Property Manager (assigned to property)
export const createQuotationRequest = async (req, res) => {
  try {
    const { jobType, property, dueDate, description, status = "Sent" } = req.body;

    // Validate required fields
    if (!jobType || !property || !dueDate || !description) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: jobType, property, dueDate, description",
      });
    }

    // Validate status
    if (!["Draft", "Sent"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'Draft' or 'Sent'",
      });
    }

    // Get user info
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    // For agencies, use their own ID. For super users, require agencyId in body. For property managers, use their agency
    let agencyId;
    if (userInfo.userType === "Agency") {
      agencyId = userInfo.userId;
    } else if (userInfo.userType === "SuperUser") {
      agencyId = req.body.agencyId;
      if (!agencyId) {
        return res.status(400).json({
          success: false,
          message: "Agency ID is required when creating quotation as SuperUser",
        });
      }
    } else if (userInfo.userType === "PropertyManager") {
      agencyId = req.propertyManager.owner.ownerId;

      // Verify property is assigned to this property manager
      const activePropertyIds = req.propertyManager.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId.toString());

      if (!activePropertyIds.includes(property)) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Property not assigned to you",
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: "Only agencies, property managers, and super users can create quotation requests",
      });
    }

    // Verify property belongs to the agency
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    // Verify agency exists
    const agencyDoc = await Agency.findById(agencyId);
    if (!agencyDoc) {
      return res.status(404).json({
        success: false,
        message: "Agency not found",
      });
    }

    // Check for existing quotation for same property and job type (within 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const existingQuotation = await Quotation.findOne({
      agency: agencyId,
      property: property,
      jobType: jobType,
      status: { $in: ["Draft", "Sent"] },
      createdAt: { $gte: thirtyDaysAgo },
    });

    if (existingQuotation) {
      return res.status(400).json({
        success: false,
        message: "A quotation request for this job type already exists for this property",
      });
    }

    // Create quotation
    const quotation = new Quotation({
      agency: agencyId,
      property: property,
      jobType: jobType,
      dueDate: new Date(dueDate),
      description: description,
      createdBy: userInfo,
      status: status,
    });

    await quotation.save();

    // Populate the quotation for response
    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      });

    // Send notification to all SuperUsers
    const superUsers = await mongoose.model("SuperUser").find({});
    const recipients = superUsers.map(user => ({
      recipientType: "SuperUser",
      recipientId: user._id,
    }));

    if (recipients.length > 0) {
      await notificationService.sendNotification(
        recipients,
        {
          type: "QUOTATION_REQUESTED",
          title: "New Quotation Request",
          message: `${agencyDoc.companyName} has requested a quotation for ${jobType} at ${propertyDoc.title}`,
          data: {
            quotationId: quotation._id,
            agencyId: agencyId,
            propertyId: property,
            jobType: jobType,
          },
        },
        ["notification", "email"]
      );
    }

    res.status(201).json({
      success: true,
      message: "Quotation request created successfully",
      data: populatedQuotation,
    });
  } catch (error) {
    console.error("Error creating quotation request:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get quotations (filtered by user role)
// @route   GET /api/v1/quotations
// @access  SuperUser, Agency
export const getQuotations = async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const { status, page = 1, limit = 10 } = req.query;
    let filter = {};

    // Apply role-based filtering
    if (userInfo.userType === "Agency") {
      filter.agency = userInfo.userId;
    } else if (userInfo.userType === "PropertyManager") {
      // Property managers can only see quotations for their assigned properties
      const activePropertyIds = req.propertyManager.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId);
      filter.property = { $in: activePropertyIds };
    }
    // SuperUsers can see all quotations

    // Apply status filter if provided
    if (status) {
      filter.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const quotations = await Quotation.find(filter)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      })
      .populate("createdBy.userId", "companyName email contactPerson")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Quotation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get single quotation
// @route   GET /api/v1/quotations/:id
// @access  SuperUser, Agency (own quotations only)
export const getQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const quotation = await Quotation.findById(id)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      })
      .populate("createdBy.userId", "companyName email contactPerson")
      .populate("generatedJob")
      .populate("generatedInvoice");

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Check permissions
    if (userInfo.userType === "Agency" && quotation.agency._id.toString() !== userInfo.userId) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    } else if (userInfo.userType === "PropertyManager") {
      // Property managers can only access quotations for their assigned properties
      const activePropertyIds = req.propertyManager.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId.toString());

      if (!activePropertyIds.includes(quotation.property._id.toString())) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    res.status(200).json({
      success: true,
      data: quotation,
    });
  } catch (error) {
    console.error("Error fetching quotation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Update quotation (add pricing and notes)
// @route   PUT /api/v1/quotations/:id
// @access  SuperUser
export const updateQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, notes, validUntil } = req.body;

    // Only SuperUsers can update quotations
    if (!req.superUser) {
      return res.status(403).json({
        success: false,
        message: "Only SuperUsers can update quotations",
      });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Can only update Draft or Sent quotations (before pricing)
    if (quotation.status !== "Draft" && quotation.status !== "Sent") {
      return res.status(400).json({
        success: false,
        message: "Can only update draft or pending quotations",
      });
    }

    // If quotation is already priced, don't allow updates
    if (quotation.amount && quotation.amount > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot update quotation that already has pricing",
      });
    }

    // Update fields
    if (amount !== undefined) quotation.amount = amount;
    if (notes !== undefined) quotation.notes = notes;
    if (validUntil !== undefined) quotation.validUntil = new Date(validUntil);

    await quotation.save();

    const updatedQuotation = await Quotation.findById(id)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      });

    res.status(200).json({
      success: true,
      message: "Quotation updated successfully",
      data: updatedQuotation,
    });
  } catch (error) {
    console.error("Error updating quotation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Send quotation to agency
// @route   POST /api/v1/quotations/:id/send
// @access  SuperUser
export const sendQuotation = async (req, res) => {
  try {
    const { id } = req.params;

    // Only SuperUsers can send quotations
    if (!req.superUser) {
      return res.status(403).json({
        success: false,
        message: "Only SuperUsers can send quotations",
      });
    }

    const quotation = await Quotation.findById(id)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Can only send Draft or Sent quotations with amount set
    if (quotation.status !== "Draft" && quotation.status !== "Sent") {
      return res.status(400).json({
        success: false,
        message: "Can only send draft or pending quotations",
      });
    }

    if (!quotation.amount || quotation.amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quotation amount must be set before sending",
      });
    }

    // Update quotation status
    quotation.status = "Sent";
    quotation.sentAt = new Date();
    await quotation.save();

    const propertyManagersForProperty = await notificationService.getPropertyManagersForProperty(
      quotation.property._id
    );

    const recipients = [];
    const seenRecipients = new Set();

    addRecipient(
      recipients,
      seenRecipients,
      "Agency",
      quotation.agency._id
    );

    // Include assigned property manager (if any)
    if (quotation.property.assignedPropertyManager) {
      addRecipient(
        recipients,
        seenRecipients,
        "PropertyManager",
        quotation.property.assignedPropertyManager._id ||
          quotation.property.assignedPropertyManager
      );
    }

    // Include any other property managers actively assigned to this property
    propertyManagersForProperty.forEach((propertyManager) => {
      addRecipient(
        recipients,
        seenRecipients,
        "PropertyManager",
        propertyManager._id
      );
    });

    if (recipients.length > 0) {
      const propertyLabel = getPropertyDisplayName(quotation.property);
      await notificationService.sendNotification(
        recipients,
        {
          type: "QUOTATION_RECEIVED",
          title: "Quotation Received",
          message: `You have received a quotation for ${quotation.jobType} at ${propertyLabel}. Amount: $${quotation.amount}`,
          data: {
            quotationId: quotation._id,
            amount: quotation.amount,
            jobType: quotation.jobType,
            propertyId: quotation.property._id,
          },
        },
        ["notification", "email"]
      );
    }

    res.status(200).json({
      success: true,
      message: "Quotation sent successfully",
      data: quotation,
    });
  } catch (error) {
    console.error("Error sending quotation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Respond to quotation (accept/reject)
// @route   POST /api/v1/quotations/:id/respond
// @access  Agency
export const respondToQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, responseNotes } = req.body; // action: 'accept' or 'reject'

    const isAgencyUser = Boolean(req.agency);
    const isPropertyManagerUser = Boolean(req.propertyManager);

    if (!isAgencyUser && !isPropertyManagerUser) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Agency or Property Manager privileges required.",
      });
    }

    if (!action || !["accept", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be either 'accept' or 'reject'",
      });
    }

    const quotation = await Quotation.findById(id)
      .populate("agency", "companyName email contactPerson")
      .populate({
        path: "property",
        select: "title address assignedPropertyManager",
        populate: {
          path: "assignedPropertyManager",
          select: "firstName lastName email phone status"
        }
      });

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Check if agency owns this quotation
    const quotationAgencyId = quotation.agency._id ? quotation.agency._id.toString() : quotation.agency.toString();
    if (isAgencyUser) {
      const requestingAgencyId = req.agency.id?.toString();
      if (quotationAgencyId !== requestingAgencyId) {
        return res.status(403).json({
          success: false,
          message: "You can only respond to your own quotations",
        });
      }
    }

    if (isPropertyManagerUser) {
      const assignedManager = quotation.property?.assignedPropertyManager;
      const assignedManagerId = assignedManager
        ? (assignedManager._id || assignedManager)?.toString()
        : null;
      const requestingManagerId = req.propertyManager.id?.toString();

      if (!assignedManagerId || assignedManagerId !== requestingManagerId) {
        return res.status(403).json({
          success: false,
          message:
            "You can only respond to quotations for properties assigned to you",
        });
      }
    }

    // Check if quotation has pricing available
    if (!quotation.amount || quotation.amount <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "This quotation does not yet have pricing information. Please contact support to update the quotation before responding.",
      });
    }

    // Check if quotation can be responded to
    if (!quotation.canRespond()) {
      return res.status(400).json({
        success: false,
        message: "This quotation cannot be responded to (either not sent or expired)",
      });
    }

    // Update quotation status
    quotation.status = action === "accept" ? "Accepted" : "Rejected";
    const responderAgencyId = req.agency?.id
      ? req.agency.id
      : quotationAgencyId;
    quotation.agencyResponse.respondedBy = responderAgencyId;
    quotation.agencyResponse.responseDate = new Date();
    quotation.agencyResponse.responseNotes = responseNotes || "";

    if (action === "accept") {
      // Generate Job and Invoice when accepted
      const newJob = new Job({
        property: quotation.property._id,
        jobCategory: "beyond-compliance",
        jobType: quotation.jobType,
        dueDate: quotation.dueDate,
        description: quotation.description,
        status: "Pending",
        quotation: quotation._id,
        owner: {
          ownerType: "Agency",
          ownerId: quotation.agency._id,
        },
        createdBy: {
          userType: "Agency",
          userId: quotation.agency._id,
        },
      });

      await newJob.save();
      quotation.generatedJob = newJob._id;

      // Generate Invoice
      const newInvoice = new Invoice({
        jobId: newJob._id,
        agencyId: quotation.agency._id,
        quotationId: quotation._id,
        jobCategory: "beyond-compliance",
        description: `${quotation.jobType} service at ${quotation.property.title}`,
        items: [{
          name: quotation.jobType,
          quantity: 1,
          rate: quotation.amount,
          amount: quotation.amount,
        }],
        subtotal: quotation.amount,
        totalCost: quotation.amount,
        status: "Pending",
        // technicianId omitted for beyond-compliance - will be set when technician is assigned
      });

      await newInvoice.save();
      quotation.generatedInvoice = newInvoice._id;

      // Update job with invoice reference
      newJob.invoice = newInvoice._id;
      newJob.hasInvoice = true;
      await newJob.save();
    }

    await quotation.save();

    // Send notification to SuperUsers
    const superUsers = await mongoose.model("SuperUser").find({});
    const recipients = [];
    const seenRecipients = new Set();

    superUsers.forEach((user) => {
      addRecipient(recipients, seenRecipients, "SuperUser", user._id);
    });

    addRecipient(recipients, seenRecipients, "Agency", quotation.agency._id);

    if (recipients.length > 0) {
      const propertyLabel = getPropertyDisplayName(quotation.property);
      const agencyLabel = getAgencyDisplayName(quotation.agency);
      await notificationService.sendNotification(
        recipients,
        {
          type: action === "accept" ? "QUOTATION_ACCEPTED" : "QUOTATION_REJECTED",
          title: `Quotation ${action === "accept" ? "Accepted" : "Rejected"}`,
          message: `${agencyLabel} has ${action}ed the quotation for ${quotation.jobType} at ${propertyLabel}`,
          data: {
            quotationId: quotation._id,
            agencyId: quotation.agency._id,
            propertyId: quotation.property._id,
            jobType: quotation.jobType,
            action: action,
            generatedJobId: quotation.generatedJob,
            generatedInvoiceId: quotation.generatedInvoice,
          },
        },
        ["notification", "email"]
      );
    }

    // Notify property managers involved with this property about the response
    const propertyManagerRecipients = [];
    const propertyManagerSet = new Set();
    const propertyManagersForProperty = await notificationService.getPropertyManagersForProperty(
      quotation.property._id
    );

    const includePropertyManager = (manager) => {
      if (!manager) {
        return;
      }

      const id = manager._id || manager;
      if (!id) {
        return;
      }

      const key = id.toString();
      if (propertyManagerSet.has(key)) {
        return;
      }

      propertyManagerSet.add(key);
      propertyManagerRecipients.push({
        recipientType: "PropertyManager",
        recipientId: id,
      });
    };

    includePropertyManager(quotation.property.assignedPropertyManager);
    propertyManagersForProperty.forEach(includePropertyManager);

    if (propertyManagerRecipients.length > 0) {
      const propertyLabel = getPropertyDisplayName(quotation.property);
      const agencyLabel = getAgencyDisplayName(quotation.agency);
      await notificationService.sendNotification(
        propertyManagerRecipients,
        {
          type: action === "accept" ? "QUOTATION_ACCEPTED" : "QUOTATION_REJECTED",
          title: `Quotation ${action === "accept" ? "Accepted" : "Rejected"}`,
          message: `The quotation for ${quotation.jobType} at ${propertyLabel} has been ${action}ed by ${agencyLabel}.`,
          data: {
            quotationId: quotation._id,
            agencyId: quotation.agency._id,
            propertyId: quotation.property._id,
            jobType: quotation.jobType,
            action: action,
            generatedJobId: quotation.generatedJob,
            generatedInvoiceId: quotation.generatedInvoice,
          },
        },
        ["notification", "email"]
      );
    }

    res.status(200).json({
      success: true,
      message: `Quotation ${action}ed successfully`,
      data: quotation,
    });
  } catch (error) {
    console.error("Error responding to quotation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/v1/quotations/:id
// @access  SuperUser, Agency (own quotations only, draft status only)
export const deleteQuotation = async (req, res) => {
  try {
    const { id } = req.params;
    const userInfo = getUserInfo(req);

    if (!userInfo) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      });
    }

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: "Quotation not found",
      });
    }

    // Check permissions
    if (userInfo.userType === "Agency") {
      if (quotation.agency.toString() !== userInfo.userId) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own quotations",
        });
      }
      // Agencies can only delete Draft quotations
      if (quotation.status !== "Draft") {
        return res.status(400).json({
          success: false,
          message: "You can only delete draft quotations",
        });
      }
    } else if (userInfo.userType === "PropertyManager") {
      // Property managers can only delete quotations for their assigned properties
      const activePropertyIds = req.propertyManager.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId.toString());

      if (!activePropertyIds.includes(quotation.property.toString())) {
        return res.status(403).json({
          success: false,
          message: "You can only delete quotations for your assigned properties",
        });
      }
      // Property managers can only delete Draft quotations
      if (quotation.status !== "Draft") {
        return res.status(400).json({
          success: false,
          message: "You can only delete draft quotations",
        });
      }
    }

    await Quotation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Quotation deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting quotation:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// @desc    Get quotation statistics
// @route   GET /api/v1/quotations/stats
// @access  SuperUser
export const getQuotationStats = async (req, res) => {
  try {
    // Only SuperUsers can view stats
    if (!req.superUser) {
      return res.status(403).json({
        success: false,
        message: "Only SuperUsers can view quotation statistics",
      });
    }

    const stats = await Quotation.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const monthlyStats = await Quotation.aggregate([
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1 },
      },
      {
        $limit: 12,
      },
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusStats: stats,
        monthlyStats: monthlyStats,
      },
    });
  } catch (error) {
    console.error("Error fetching quotation stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
