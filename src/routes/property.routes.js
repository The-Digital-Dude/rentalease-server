import express from "express";
import mongoose from "mongoose";
import Property from "../models/Property.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import Job from "../models/Job.js";
import EmailLog from "../models/EmailLog.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticatePropertyManager,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import {
  setDefaultInspectionDates,
  setStateSpecificCompliance,
} from "../utils/propertyHelpers.js";
import bookingNotificationService from "../services/bookingNotification.service.js";
import fileUploadService from "../services/fileUpload.service.js";
import { sanitizePropertyInput, sanitizeInput } from "../middleware/sanitizer.middleware.js";

const router = express.Router();

// Public route to get all properties compliance summary (no auth required)
router.get("/compliance", async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find active properties with compliance schedules
    const properties = await Property.find({ isActive: true })
      .select("address complianceSchedule")
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const complianceList = properties.map((property) => {
      const compliance = property.complianceSchedule;
      const now = new Date();
      const thirtyDaysFromNow = new Date(
        now.getTime() + 30 * 24 * 60 * 60 * 1000
      );

      let dueSoon = 0;
      let overdue = 0;
      let compliant = 0;
      let totalCompliance = 0;

      Object.values(compliance).forEach((comp) => {
        if (comp.required && comp.nextInspection) {
          totalCompliance++;
          const inspectionDate = new Date(comp.nextInspection);

          if (inspectionDate < now) {
            overdue++;
          } else if (inspectionDate <= thirtyDaysFromNow) {
            dueSoon++;
          } else {
            compliant++;
          }
        }
      });

      return {
        propertyAddress: property.address.fullAddress,
        complianceSummary: {
          totalCompliance,
          dueSoon,
          overdue,
          compliant,
          complianceScore:
            totalCompliance > 0
              ? Math.round((compliant / totalCompliance) * 100)
              : 100,
        },
        nextInspection:
          compliance.gasCompliance.nextInspection ||
          compliance.electricalSafety.nextInspection ||
          compliance.smokeAlarms.nextInspection ||
          (compliance.poolSafety.required
            ? compliance.poolSafety.nextInspection
            : null),
      };
    });

    // Get total count for pagination
    const totalProperties = await Property.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      message: "Properties compliance summary retrieved successfully",
      data: {
        properties: complianceList,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalProperties / parseInt(limit)),
          totalProperties,
          limit: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching properties compliance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Public route to get property compliance schedule (no auth required)
router.get("/compliance/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;

    // Validate property ID format
    if (!propertyId || propertyId.length !== 24) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID format",
      });
    }

    // Find property and select only compliance schedule and basic info
    const property = await Property.findById(propertyId)
      .select("address complianceSchedule isActive")
      .lean();

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (!property.isActive) {
      return res.status(404).json({
        success: false,
        message: "Property is not active",
      });
    }

    // Format compliance schedule for public display
    const complianceSchedule = {
      propertyAddress: property.address.fullAddress,
      isActive: property.isActive,
      compliance: {
        gasCompliance: {
          required: property.complianceSchedule.gasCompliance.required,
          status: property.complianceSchedule.gasCompliance.status,
          nextInspection:
            property.complianceSchedule.gasCompliance.nextInspection,
          dueDate: property.complianceSchedule.gasCompliance.nextInspection
            ? new Date(property.complianceSchedule.gasCompliance.nextInspection)
                .toISOString()
                .split("T")[0]
            : null,
        },
        electricalSafety: {
          required: property.complianceSchedule.electricalSafety.required,
          status: property.complianceSchedule.electricalSafety.status,
          nextInspection:
            property.complianceSchedule.electricalSafety.nextInspection,
          dueDate: property.complianceSchedule.electricalSafety.nextInspection
            ? new Date(
                property.complianceSchedule.electricalSafety.nextInspection
              )
                .toISOString()
                .split("T")[0]
            : null,
        },
        smokeAlarms: {
          required: property.complianceSchedule.smokeAlarms.required,
          status: property.complianceSchedule.smokeAlarms.status,
          nextInspection:
            property.complianceSchedule.smokeAlarms.nextInspection,
          dueDate: property.complianceSchedule.smokeAlarms.nextInspection
            ? new Date(property.complianceSchedule.smokeAlarms.nextInspection)
                .toISOString()
                .split("T")[0]
            : null,
        },
        poolSafety: {
          required: property.complianceSchedule.poolSafety.required,
          status: property.complianceSchedule.poolSafety.status,
          nextInspection: property.complianceSchedule.poolSafety.nextInspection,
          dueDate: property.complianceSchedule.poolSafety.nextInspection
            ? new Date(property.complianceSchedule.poolSafety.nextInspection)
                .toISOString()
                .split("T")[0]
            : null,
        },
      },
    };

    // Calculate compliance summary
    const now = new Date();
    const thirtyDaysFromNow = new Date(
      now.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    let totalCompliance = 0;
    let dueSoon = 0;
    let overdue = 0;
    let compliant = 0;

    Object.values(complianceSchedule.compliance).forEach((compliance) => {
      if (compliance.required && compliance.nextInspection) {
        totalCompliance++;
        const inspectionDate = new Date(compliance.nextInspection);

        if (inspectionDate < now) {
          overdue++;
        } else if (inspectionDate <= thirtyDaysFromNow) {
          dueSoon++;
        } else {
          compliant++;
        }
      }
    });

    // Add summary to response
    complianceSchedule.summary = {
      totalCompliance,
      dueSoon,
      overdue,
      compliant,
      complianceScore:
        totalCompliance > 0
          ? Math.round((compliant / totalCompliance) * 100)
          : 100,
    };

    res.status(200).json({
      success: true,
      message: "Property compliance schedule retrieved successfully",
      data: complianceSchedule,
    });
  } catch (error) {
    console.error("Error fetching property compliance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Public route to handle tenant booking requests (no auth required)
router.post("/book-inspection", sanitizeInput(), async (req, res) => {
  try {
    const { propertyId, complianceType, selectedDate, selectedShift, token } =
      req.body;

    // Validate required fields
    if (
      !propertyId ||
      !complianceType ||
      !selectedDate ||
      !selectedShift ||
      !token
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: propertyId, complianceType, selectedDate, selectedShift, token",
      });
    }

    // Validate property ID format
    if (!mongoose.Types.ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID format",
      });
    }

    // Validate compliance type
    const validComplianceTypes = [
      "gasCompliance",
      "electricalSafety",
      "smokeAlarms",
      "poolSafety",
    ];
    if (!validComplianceTypes.includes(complianceType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid compliance type",
      });
    }

    // Validate selected shift
    const validShifts = ["morning", "afternoon", "evening"];
    if (!validShifts.includes(selectedShift)) {
      return res.status(400).json({
        success: false,
        message: "Invalid shift selection",
      });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use YYYY-MM-DD",
      });
    }

    // Debug: Check token details
    console.log("🔍 Token verification debug:");
    console.log("Token:", token);

    // Check if token exists at all
    const tokenExists = await EmailLog.findOne({ verificationToken: token });
    console.log("Token exists in database:", !!tokenExists);

    if (tokenExists) {
      console.log("Token details:", {
        tokenUsed: tokenExists.tokenUsed,
        tokenExpiresAt: tokenExists.tokenExpiresAt,
        isExpired: tokenExists.tokenExpiresAt < new Date(),
        emailStatus: tokenExists.emailStatus,
        tenantEmail: tokenExists.tenantEmail,
        propertyId: tokenExists.propertyId,
        complianceType: tokenExists.complianceType,
      });
    }

    // Verify the token
    const tokenVerification = await EmailLog.verifyToken(token);
    console.log("Token verification result:", tokenVerification);

    if (!tokenVerification.valid) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token",
        reason: tokenVerification.reason,
      });
    }

    const emailLog = tokenVerification.emailLog;

    // Verify the token matches the property and compliance type
    if (emailLog.propertyId.toString() !== propertyId) {
      return res.status(400).json({
        success: false,
        message: "Token does not match the property",
      });
    }

    if (emailLog.complianceType !== complianceType) {
      return res.status(400).json({
        success: false,
        message: "Token does not match the compliance type",
      });
    }

    // Find the property
    const property = await Property.findById(propertyId).populate(
      "agency assignedPropertyManager"
    );
    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    if (!property.isActive) {
      return res.status(400).json({
        success: false,
        message: "Property is not active",
      });
    }

    // Parse the selected date and create inspection time
    const inspectionDate = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Validate that the selected date is not in the past
    if (inspectionDate < today) {
      return res.status(400).json({
        success: false,
        message: "Selected date cannot be in the past",
      });
    }

    // Set the inspection time based on the selected shift
    let inspectionTime;
    switch (selectedShift) {
      case "morning":
        inspectionTime = new Date(inspectionDate);
        inspectionTime.setHours(9, 0, 0, 0); // 9:00 AM
        break;
      case "afternoon":
        inspectionTime = new Date(inspectionDate);
        inspectionTime.setHours(14, 0, 0, 0); // 2:00 PM
        break;
      case "evening":
        inspectionTime = new Date(inspectionDate);
        inspectionTime.setHours(17, 0, 0, 0); // 5:00 PM
        break;
      default:
        inspectionTime = new Date(inspectionDate);
        inspectionTime.setHours(10, 0, 0, 0); // Default to 10:00 AM
    }

    // Map compliance type to job type
    const complianceToJobType = {
      gasCompliance: "Gas",
      electricalSafety: "Electrical",
      smokeAlarms: "Smoke",
      poolSafety: "Pool Safety",
    };

    const jobType = complianceToJobType[complianceType] || "Routine Inspection";

    // Create the job
    const jobData = {
      property: propertyId,
      jobType: jobType,
      dueDate: inspectionTime,
      shift: selectedShift,
      description: `${jobType} inspection for ${property.address.fullAddress}`,
      priority: "Medium",
      status: "Pending",
      estimatedDuration: 1, // 1 hour
      notes: `Tenant booking via email link. Original inspection date: ${emailLog.inspectionDate.toLocaleDateString()}. Tenant: ${
        emailLog.tenantName
      } (${emailLog.tenantEmail}). Scheduled for ${selectedShift} shift.`,
      owner: {
        ownerType: "Agency",
        ownerId: property.agency._id,
      },
      createdBy: {
        userType: "Agency",
        userId: property.agency._id,
      },
    };

    const job = new Job(jobData);
    await job.save();

    // Mark the token as used
    await EmailLog.markTokenAsUsed(token);

    // Update the property's compliance schedule with the new inspection date
    const complianceField = `complianceSchedule.${complianceType}.nextInspection`;
    await Property.findByIdAndUpdate(propertyId, {
      [complianceField]: inspectionTime,
    });

    // Populate the job with related data for response
    await job.populate("property");

    // Send booking notifications to all relevant parties
    try {
      const notificationResults =
        await bookingNotificationService.sendBookingNotifications(
          job,
          property,
          emailLog
        );

      console.log("📧 Booking notifications sent:", {
        jobId: job.job_id,
        totalNotifications: Object.keys(notificationResults).length,
        errors: notificationResults.errors.length,
      });
    } catch (notificationError) {
      // Log error but don't fail the booking
      console.error(
        "❌ Failed to send booking notifications:",
        notificationError.message
      );
    }

    res.status(201).json({
      success: true,
      message: "Inspection booking successful",
      data: {
        jobId: job._id,
        propertyAddress: property.address.fullAddress,
        jobType: job.jobType,
        scheduledDate: job.dueDate,
        selectedShift: selectedShift,
        tenantName: emailLog.tenantName,
        tenantEmail: emailLog.tenantEmail,
        complianceType: complianceType,
        bookingConfirmedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error creating inspection booking:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Valid regions enum
const VALID_REGIONS = [
  "Sydney Metro",
  "Melbourne Metro",
  "Brisbane Metro",
  "Perth Metro",
  "Adelaide Metro",
  "Darwin Metro",
  "Hobart Metro",
  "Canberra Metro",
  "Regional NSW",
  "Regional VIC",
  "Regional QLD",
  "Regional WA",
  "Regional SA",
  "Regional NT",
  "Regional TAS",
];

// Valid property types
const VALID_PROPERTY_TYPES = [
  "House",
  "Apartment",
  "Unit",
  "Townhouse",
  "Villa",
  "Duplex",
  "Studio",
  "Penthouse",
  "Commercial",
  "Industrial",
  "Retail",
  "Office",
  "Warehouse",
  "Land",
  "Other",
];

// Valid property statuses
const VALID_PROPERTY_STATUSES = [
  "Active",
  "Inactive",
  "Under Maintenance",
  "Vacant",
  "Rented",
  "For Sale",
  "Sold",
  "Under Construction",
  "Pending",
];

// Valid Australian states
const VALID_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "NT", "ACT"];

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
  } else if (req.propertyManager) {
    return {
      userType: "PropertyManager",
      userId: req.propertyManager.id,
    };
  }
  return null;
};

// Helper function to get agency filter based on user type
const getAgencyFilter = (req) => {
  if (req.superUser) {
    // Super users can access all properties
    return {};
  } else if (req.agency) {
    // Agencies can only access their own properties
    return { agency: req.agency.id };
  } else if (req.propertyManager) {
    // Property managers can only access properties they're assigned to as the assignedPropertyManager
    return { assignedPropertyManager: req.propertyManager.id };
  }
  return null;
};

// Helper function to determine region based on state and suburb
const getRegionFromStateAndSuburb = (state, suburb) => {
  // Simple mapping - in real app you might want a more sophisticated lookup
  const majorCities = {
    NSW: [
      "Sydney",
      "Newcastle",
      "Wollongong",
      "Parramatta",
      "Liverpool",
      "Blacktown",
    ],
    VIC: ["Melbourne", "Geelong", "Ballarat", "Bendigo"],
    QLD: ["Brisbane", "Gold Coast", "Sunshine Coast", "Townsville", "Cairns"],
    WA: ["Perth", "Fremantle", "Rockingham", "Joondalup"],
    SA: ["Adelaide", "Mount Gambier"],
    TAS: ["Hobart", "Launceston"],
    NT: ["Darwin", "Alice Springs"],
    ACT: ["Canberra"],
  };

  const stateCities = majorCities[state] || [];
  const isMetro = stateCities.some(
    (city) =>
      suburb.toLowerCase().includes(city.toLowerCase()) ||
      city.toLowerCase().includes(suburb.toLowerCase())
  );

  if (isMetro) {
    switch (state) {
      case "NSW":
        return "Sydney Metro";
      case "VIC":
        return "Melbourne Metro";
      case "QLD":
        return "Brisbane Metro";
      case "WA":
        return "Perth Metro";
      case "SA":
        return "Adelaide Metro";
      case "TAS":
        return "Hobart Metro";
      case "NT":
        return "Darwin Metro";
      case "ACT":
        return "Canberra Metro";
      default:
        return `Regional ${state}`;
    }
  } else {
    return `Regional ${state}`;
  }
};

// Create Property
router.post("/", sanitizePropertyInput(), authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    const {
      address,
      currentTenant,
      currentLandlord,
      complianceSchedule,
      notes,
    } = req.body;

    // Validate required fields
    if (
      !address ||
      !address.street ||
      !address.suburb ||
      !address.state ||
      !address.postcode
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Complete address (street, suburb, state, postcode) is required",
      });
    }

    if (
      !currentTenant ||
      !currentTenant.name ||
      !currentTenant.email ||
      !currentTenant.phone
    ) {
      return res.status(400).json({
        status: "error",
        message: "Complete tenant information (name, email, phone) is required",
      });
    }

    if (
      !currentLandlord ||
      !currentLandlord.name ||
      !currentLandlord.email ||
      !currentLandlord.phone
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Complete landlord information (name, email, phone) is required",
      });
    }

    // Validate state
    if (!VALID_STATES.includes(address.state)) {
      return res.status(400).json({
        status: "error",
        message: "Please select a valid Australian state",
      });
    }

    // Validate postcode (4 digits)
    if (!/^\d{4}$/.test(address.postcode)) {
      return res.status(400).json({
        status: "error",
        message: "Postcode must be 4 digits",
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(currentTenant.email)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid tenant email address",
      });
    }

    if (!emailRegex.test(currentLandlord.email)) {
      return res.status(400).json({
        status: "error",
        message: "Please enter a valid landlord email address",
      });
    }

    // Set agency and property manager based on user type
    let agencyId;
    let assignedPropertyManagerId;

    if (req.superUser) {
      // Super users must provide an agency ID when creating properties
      const { agencyId: providedAgencyId } = req.body;

      if (!providedAgencyId) {
        return res.status(400).json({
          status: "error",
          message:
            "Agency ID is required for super users when creating properties",
        });
      }

      // Validate that the agency exists
      const agency = await Agency.findById(providedAgencyId);
      if (!agency) {
        return res.status(400).json({
          status: "error",
          message: "Invalid agency ID provided",
        });
      }

      agencyId = providedAgencyId;
    } else if (req.agency) {
      agencyId = req.agency.id;
    } else if (req.propertyManager) {
      // Property managers can create properties and become the assigned manager
      // Automatically get agency ID from PropertyManager's owner information
      if (
        !req.propertyManager.owner ||
        req.propertyManager.owner.ownerType !== "Agency"
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "PropertyManager must be owned by an Agency to create properties",
        });
      }

      // Validate that the agency exists
      const agency = await Agency.findById(req.propertyManager.owner.ownerId);
      if (!agency) {
        return res.status(400).json({
          status: "error",
          message: "Associated agency not found",
        });
      }

      agencyId = req.propertyManager.owner.ownerId;
      assignedPropertyManagerId = req.propertyManager.id;
    }

    // Get creator info
    const creatorInfo = getCreatorInfo(req);
    if (!creatorInfo) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Determine region automatically
    const region = getRegionFromStateAndSuburb(address.state, address.suburb);

    // Prepare property data with defaults
    let propertyData = {
      address,
      propertyType: "House", // Default from form
      agency: agencyId,
      region,
      currentTenant,
      currentLandlord,
      complianceSchedule: complianceSchedule || {},
      notes: notes || "",
      createdBy: creatorInfo,
    };

    // Add assigned property manager if provided
    if (assignedPropertyManagerId) {
      propertyData.assignedPropertyManager = assignedPropertyManagerId;
    }

    // Set default inspection dates if not provided
    propertyData = setDefaultInspectionDates(propertyData);

    // Set state-specific compliance requirements
    propertyData = setStateSpecificCompliance(propertyData, address.state);

    // Create the property
    const property = new Property(propertyData);
    await property.save();

    // If property manager is assigned, add property to their assignedProperties array
    if (assignedPropertyManagerId) {
      const propertyManager = await PropertyManager.findById(
        assignedPropertyManagerId
      );
      if (propertyManager) {
        await propertyManager.assignProperty(property._id, "Primary");
      }
    }

    // Populate agency and property manager details for response
    await property.populate("agency", "companyName contactPerson email phone");
    if (property.assignedPropertyManager) {
      await property.populate(
        "assignedPropertyManager",
        "firstName lastName email phone"
      );
    }

    res.status(201).json({
      status: "success",
      message: "Property created successfully",
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          agency: property.agency,
          assignedPropertyManager: property.assignedPropertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Create property error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      status: "error",
      message: "An error occurred while creating the property",
    });
  }
});

// Get Filter Options for Properties
router.get("/filter-options", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Get unique values from database for dynamic filters
    const filter = { ...agencyFilter, isActive: true };

    const [regions, propertyTypes, statuses, states] = await Promise.all([
      Property.distinct("region", filter),
      Property.distinct("propertyType", filter),
      Property.distinct("status", filter),
      Property.distinct("address.state", filter),
    ]);

    res.status(200).json({
      status: "success",
      data: {
        regions: ["All Regions", ...regions.sort()],
        propertyTypes: ["All Types", ...propertyTypes.sort()],
        statuses: ["All Status", ...statuses.sort()],
        states: states.sort(),
        validOptions: {
          regions: VALID_REGIONS,
          propertyTypes: VALID_PROPERTY_TYPES,
          statuses: VALID_PROPERTY_STATUSES,
          states: VALID_STATES,
        },
      },
    });
  } catch (error) {
    console.error("Get filter options error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching filter options",
    });
  }
});

// Get Available Agencies for Super Users
router.get("/agencies/available", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { status = "Active", region } = req.query;

    // Build filter object
    const filter = { status };
    if (region) filter.region = region;

    // Get active agencies
    const agencies = await Agency.find(filter)
      .select(
        "id companyName contactPerson email phone region compliance status"
      )
      .sort({ companyName: 1 });

    res.status(200).json({
      status: "success",
      data: {
        agencies: agencies.map((agency) => ({
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
        })),
        totalCount: agencies.length,
      },
    });
  } catch (error) {
    console.error("Get available agencies error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching available agencies",
    });
  }
});

// Get Available Property Managers for Assignment (Agency/SuperUser/PropertyManager only)
router.get("/available-property-managers", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    // Check if user has permission (Agency, SuperUser, or PropertyManager)
    if (!req.superUser && !req.agency && !req.propertyManager) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only Super Users, Agencies, and Property Managers can view available Property Managers.",
      });
    }

    const { status = "Active", availabilityStatus = "Available" } = req.query;

    // Build filter object
    const filter = { status };
    if (availabilityStatus !== "All") {
      filter.availabilityStatus = availabilityStatus;
    }

    // Add owner filter for agencies and property managers
    if (req.agency) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.agency.id;
    } else if (req.propertyManager) {
      filter["owner.ownerType"] = "Agency";
      filter["owner.ownerId"] = req.propertyManager.owner.ownerId;
    }

    // Get available property managers
    const propertyManagers = await PropertyManager.find(filter)
      .select(
        "firstName lastName email phone status availabilityStatus assignedProperties"
      )
      .sort({ firstName: 1 });

    res.status(200).json({
      status: "success",
      data: {
        propertyManagers: propertyManagers.map((pm) => ({
          id: pm._id,
          fullName: `${pm.firstName} ${pm.lastName}`,
          email: pm.email,
          phone: pm.phone,
          status: pm.status,
          availabilityStatus: pm.availabilityStatus,
          assignedPropertiesCount: pm.assignedProperties.length,
          createdAt: pm.createdAt,
        })),
        totalCount: propertyManagers.length,
      },
    });
  } catch (error) {
    console.error("Get available property managers error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching available property managers",
    });
  }
});

// Get All Properties with Advanced Filtering
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  console.log(req.pr);
  try {
    const {
      propertyType,
      region,
      state,
      status,
      page = 1,
      limit = 10,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;
    console.log(req.propertyManager);

    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Build filter object
    const filter = { ...agencyFilter, isActive: true };

    // Property Type filter
    if (propertyType && propertyType !== "All Types") {
      filter.propertyType = propertyType;
    }

    // Region filter
    if (region && region !== "All Regions") {
      filter.region = region;
    }

    // Status filter
    if (status && status !== "All Status") {
      filter.status = status;
    }

    // State filter
    if (state) {
      filter["address.state"] = state;
    }

    // Advanced search functionality
    if (search && search.trim()) {
      const searchRegex = { $regex: search.trim(), $options: "i" };
      filter.$or = [
        { "address.street": searchRegex },
        { "address.suburb": searchRegex },
        { "address.fullAddress": searchRegex },
        { "currentTenant.name": searchRegex },
        { "currentTenant.email": searchRegex },
        { "currentLandlord.name": searchRegex },
        { "currentLandlord.email": searchRegex },
        { "agency.companyName": searchRegex },
        { "assignedPropertyManager.fullName": searchRegex },
        { "assignedPropertyManager.email": searchRegex },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObject = {};
    sortObject[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get properties with pagination and sorting
    const properties = await Property.find(filter)
      .populate("agency", "companyName contactPerson email phone")
      .populate("assignedPropertyManager", "firstName lastName email phone")
      .sort(sortObject)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Property.countDocuments(filter);

    res.status(200).json({
      status: "success",
      data: {
        properties: properties.map((property) => ({
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          region: property.region,
          status: property.status,
          agency: property.agency,
          assignedPropertyManager: property.assignedPropertyManager,
          currentTenant: property.currentTenant,
          currentLandlord: property.currentLandlord,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt,
          updatedAt: property.updatedAt,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
        filters: {
          applied: {
            propertyType: propertyType || "All Types",
            region: region || "All Regions",
            status: status || "All Status",
            search: search || "",
          },
        },
      },
    });
  } catch (error) {
    console.error("Get properties error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching properties",
    });
  }
});

// Get Single Property
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...agencyFilter };
    const property = await Property.findOne(filter)
      .populate("agency", "companyName contactPerson email phone")
      .populate("assignedPropertyManager", "firstName lastName email phone");

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          region: property.region,
          agency: property.agency,
          assignedPropertyManager: property.assignedPropertyManager,
          currentTenant: property.currentTenant,
          currentLandlord: property.currentLandlord,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          documents: property.documents?.map((document) => ({
            id: document._id,
            name: document.name,
            type: document.type,
            size: document.size,
            url: document.url,
            cloudinaryId: document.cloudinaryId,
            uploadDate: document.uploadDate,
          })),
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt,
          updatedAt: property.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Get property error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the property",
    });
  }
});

// Update Property
router.put("/:id", sanitizePropertyInput(), authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    const { id } = req.params;
    const { address, currentTenant, complianceSchedule, notes } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...agencyFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    // Validate address if provided
    if (address) {
      if (
        !address.street ||
        !address.suburb ||
        !address.state ||
        !address.postcode
      ) {
        return res.status(400).json({
          status: "error",
          message:
            "Complete address (street, suburb, state, postcode) is required",
        });
      }

      if (!VALID_STATES.includes(address.state)) {
        return res.status(400).json({
          status: "error",
          message: "Please select a valid Australian state",
        });
      }

      if (!/^\d{4}$/.test(address.postcode)) {
        return res.status(400).json({
          status: "error",
          message: "Postcode must be 4 digits",
        });
      }
    }

    // Validate tenant if provided
    if (currentTenant) {
      if (!currentTenant.name || !currentTenant.email || !currentTenant.phone) {
        return res.status(400).json({
          status: "error",
          message:
            "Complete tenant information (name, email, phone) is required",
        });
      }

      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(currentTenant.email)) {
        return res.status(400).json({
          status: "error",
          message: "Please enter a valid email address",
        });
      }
    }

    // Update fields if provided
    if (address) {
      property.address = address;
      // Update region if address state/suburb changed
      property.region = getRegionFromStateAndSuburb(
        address.state,
        address.suburb
      );
    }
    if (currentTenant) property.currentTenant = currentTenant;
    if (complianceSchedule)
      property.complianceSchedule = {
        ...property.complianceSchedule,
        ...complianceSchedule,
      };
    if (notes !== undefined) property.notes = notes;

    await property.save();

    // Populate agency and property manager details for response
    await property.populate("agency", "companyName contactPerson email phone");
    if (property.assignedPropertyManager) {
      await property.populate(
        "assignedPropertyManager",
        "fullName email phone"
      );
    }

    res.status(200).json({
      status: "success",
      message: "Property updated successfully",
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          agency: property.agency,
          assignedPropertyManager: property.assignedPropertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          updatedAt: property.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Update property error:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        status: "error",
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      status: "error",
      message: "An error occurred while updating the property",
    });
  }
});

// Delete Property
router.delete("/:id", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...agencyFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    // Soft delete by setting isActive to false
    property.isActive = false;
    await property.save();

    res.status(200).json({
      status: "success",
      message: "Property deleted successfully",
      data: {
        propertyId: id,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Delete property error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the property",
    });
  }
});

// Get Property Compliance Summary
router.get("/:id/compliance", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Get agency filter based on user type
    const agencyFilter = getAgencyFilter(req);
    if (agencyFilter === null) {
      return res.status(401).json({
        status: "error",
        message: "Authentication required",
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...agencyFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    const complianceSummary = property.getComplianceSummary();
    const hasOverdue = property.hasOverdueCompliance();

    res.status(200).json({
      status: "success",
      data: {
        propertyId: id,
        fullAddress: property.fullAddressString,
        complianceSummary,
        hasOverdueCompliance: hasOverdue,
        complianceSchedule: property.complianceSchedule,
      },
    });
  } catch (error) {
    console.error("Get property compliance error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching property compliance",
    });
  }
});

// Property Assignment System Endpoints

// Assign Property Manager to Property (Agency/SuperUser/PropertyManager only)
router.post("/:id/assign-property-manager", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']), async (req, res) => {
  try {
    const { id } = req.params;
    const { propertyManagerId, role = "Primary" } = req.body;

    // Check if user has permission (Agency, SuperUser, or PropertyManager)
    if (!req.superUser && !req.agency && !req.propertyManager) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only Super Users, Agencies, and Property Managers can assign Property Managers.",
      });
    }

    console.log("Current user info:", {
      userType: req.superUser
        ? "SuperUser"
        : req.agency
        ? "Agency"
        : req.propertyManager
        ? "PropertyManager"
        : "Unknown",
      agencyId: req.agency?.id,
      agencyIdType: typeof req.agency?.id,
    });

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(propertyManagerId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property manager ID",
      });
    }

    // Find property with access control
    const agencyFilter = getAgencyFilter(req);
    const filter = { _id: id, isActive: true, ...agencyFilter };

    console.log("Property search filter:", {
      id: id,
      agencyFilter: agencyFilter,
      finalFilter: filter,
    });

    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    console.log("Property found:", {
      id: property._id,
      agency: property.agency,
      agencyType: typeof property.agency,
      propertyAgencyString: property.agency.toString(),
    });

    // Find property manager
    const propertyManager = await PropertyManager.findById(propertyManagerId);
    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found",
      });
    }

    console.log("Property Manager found:", {
      id: propertyManager._id,
      name: `${propertyManager.firstName} ${propertyManager.lastName}`,
      owner: propertyManager.owner,
      ownerId: propertyManager.owner?.ownerId,
      ownerIdType: typeof propertyManager.owner?.ownerId,
      ownerIdString: propertyManager.owner?.ownerId?.toString(),
    });

    console.log("Agency comparison:", {
      propertyAgency: property.agency.toString(),
      propertyManagerOwnerId: propertyManager.owner.ownerId.toString(),
      currentUserAgencyId: req.agency?.id?.toString(),
      propertyManagerOwnerMatch:
        property.agency.toString() === propertyManager.owner.ownerId.toString(),
      currentUserAgencyMatch: req.agency
        ? property.agency.toString() === req.agency.id.toString()
        : false,
    });

    // Check if property manager is owned by the same agency/superuser
    if (
      req.agency &&
      propertyManager.owner.ownerType === "Agency" &&
      propertyManager.owner.ownerId.toString() !== req.agency.id.toString()
    ) {
      console.log("Agency ownership check failed:", {
        agencyId: req.agency.id,
        agencyIdType: typeof req.agency.id,
        propertyManagerOwnerId: propertyManager.owner.ownerId,
        propertyManagerOwnerIdType: typeof propertyManager.owner.ownerId,
        comparison:
          propertyManager.owner.ownerId.toString() !== req.agency.id.toString(),
        agencyIdString: req.agency.id.toString(),
        propertyManagerOwnerIdString: propertyManager.owner.ownerId.toString(),
      });
      return res.status(403).json({
        status: "error",
        message: "You can only assign Property Managers owned by your agency.",
      });
    }

    // Check if the property belongs to the current user's agency
    if (req.agency && property.agency.toString() !== req.agency.id.toString()) {
      console.log("Property doesn't belong to current user's agency:", {
        propertyAgency: property.agency.toString(),
        currentUserAgencyId: req.agency.id.toString(),
        match: property.agency.toString() === req.agency.id.toString(),
      });
      return res.status(403).json({
        status: "error",
        message:
          "You can only assign Property Managers to properties owned by your agency.",
      });
    }

    // Additional check: Ensure the property belongs to the same agency as the property manager's owner
    if (
      req.agency &&
      propertyManager.owner.ownerType === "Agency" &&
      property.agency.toString() !== propertyManager.owner.ownerId.toString()
    ) {
      console.log("Property agency mismatch:", {
        propertyAgency: property.agency.toString(),
        propertyManagerOwnerId: propertyManager.owner.ownerId.toString(),
        match:
          property.agency.toString() ===
          propertyManager.owner.ownerId.toString(),
      });
      return res.status(403).json({
        status: "error",
        message:
          "You can only assign Property Managers to properties from their agency.",
      });
    }

    // Property managers can only assign themselves to properties from their agency
    if (req.propertyManager && propertyManagerId !== req.propertyManager.id) {
      return res.status(403).json({
        status: "error",
        message: "Property Managers can only assign themselves to properties.",
      });
    }

    if (
      req.propertyManager &&
      property.agency.toString() !==
        req.propertyManager.owner.ownerId.toString()
    ) {
      return res.status(403).json({
        status: "error",
        message:
          "Property Managers can only assign themselves to properties from their agency.",
      });
    }

    // Check if property manager is already assigned to this property
    const existingAssignment = propertyManager.assignedProperties.find(
      (assignment) => assignment.propertyId.toString() === id
    );

    if (existingAssignment) {
      return res.status(400).json({
        status: "error",
        message: "Property Manager is already assigned to this property",
      });
    }

    console.log("Property manager assignment check:", {
      propertyManagerId: propertyManager._id.toString(),
      propertyId: id,
      existingAssignment: existingAssignment ? "Yes" : "No",
      currentAssignedPropertyManager:
        property.assignedPropertyManager?.toString() || "None",
    });

    // Assign property manager to property
    property.assignedPropertyManager = propertyManagerId;
    await property.save();

    // Add property to property manager's assigned properties
    await propertyManager.assignProperty(id, role);

    console.log("Property Manager assigned to property:", {
      propertyId: id,
      propertyManagerId: propertyManagerId,
      assignedBy: req.superUser ? req.superUser.email : req.agency.email,
      role: role,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "Property Manager assigned successfully",
      data: {
        propertyId: id,
        propertyManagerId: propertyManagerId,
        role: role,
        assignedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Assign property manager error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while assigning property manager",
    });
  }
});

// Unassign Property Manager from Property (Agency/SuperUser/PropertyManager only)
router.delete(
  "/:id/assign-property-manager",
  authenticate,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { propertyManagerId } = req.body;

      // Check if user has permission (Agency, SuperUser, or PropertyManager)
      if (!req.superUser && !req.agency && !req.propertyManager) {
        return res.status(403).json({
          status: "error",
          message:
            "Access denied. Only Super Users, Agencies, and Property Managers can unassign Property Managers.",
        });
      }

      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(propertyManagerId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property manager ID",
        });
      }

      // Find property with access control
      const agencyFilter = getAgencyFilter(req);
      const filter = { _id: id, isActive: true, ...agencyFilter };
      const property = await Property.findOne(filter);

      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      // Check if property manager is assigned to this property
      if (property.assignedPropertyManager?.toString() !== propertyManagerId) {
        return res.status(400).json({
          status: "error",
          message: "Property Manager is not assigned to this property",
        });
      }

      // Property managers can only unassign themselves from properties from their agency
      if (req.propertyManager && propertyManagerId !== req.propertyManager.id) {
        return res.status(403).json({
          status: "error",
          message:
            "Property Managers can only unassign themselves from properties.",
        });
      }

      if (
        req.propertyManager &&
        property.agency.toString() !==
          req.propertyManager.owner.ownerId.toString()
      ) {
        return res.status(403).json({
          status: "error",
          message:
            "Property Managers can only unassign themselves from properties from their agency.",
        });
      }

      // Find property manager
      const propertyManager = await PropertyManager.findById(propertyManagerId);
      if (!propertyManager) {
        return res.status(404).json({
          status: "error",
          message: "Property Manager not found",
        });
      }

      // Remove property manager from property
      property.assignedPropertyManager = null;
      await property.save();

      // Remove property from property manager's assigned properties
      await propertyManager.removePropertyAssignment(id);

      console.log("Property Manager unassigned from property:", {
        propertyId: id,
        propertyManagerId: propertyManagerId,
        unassignedBy: req.superUser ? req.superUser.email : req.agency.email,
        timestamp: new Date().toISOString(),
      });

      res.status(200).json({
        status: "success",
        message: "Property Manager unassigned successfully",
        data: {
          propertyId: id,
          propertyManagerId: propertyManagerId,
          unassignedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Unassign property manager error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while unassigning property manager",
      });
    }
  }
);

// Get Property Assignment Summary (Agency/SuperUser/PropertyManager only)
router.get("/:id/assignment-summary", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user has permission (Agency, SuperUser, or PropertyManager)
    if (!req.superUser && !req.agency && !req.propertyManager) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only Super Users, Agencies, and Property Managers can view assignment summaries.",
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid property ID",
      });
    }

    // Find property with access control
    const agencyFilter = getAgencyFilter(req);
    const filter = { _id: id, isActive: true, ...agencyFilter };
    const property = await Property.findOne(filter).populate(
      "assignedPropertyManager",
      "firstName lastName email phone status availabilityStatus"
    );

    if (!property) {
      return res.status(404).json({
        status: "error",
        message: "Property not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        propertyId: id,
        fullAddress: property.fullAddressString,
        fullName: property.assignedPropertyManager
          ? `${property.assignedPropertyManager.firstName} ${property.assignedPropertyManager.lastName}`
          : null,
        assignedPropertyManager: property.assignedPropertyManager,
        assignmentStatus: property.assignedPropertyManager
          ? "Assigned"
          : "Unassigned",
      },
    });
  } catch (error) {
    console.error("Get property assignment summary error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching assignment summary",
    });
  }
});

// Upload Document to Property
router.post(
  "/:id/documents",
  authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']),
  fileUploadService.single('document'),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID",
        });
      }

      const agencyFilter = getAgencyFilter(req);
      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const filter = { _id: id, isActive: true, ...agencyFilter };
      const property = await Property.findOne(filter);

      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          status: "error",
          message: "No file uploaded",
        });
      }

      const cloudinaryResult = await fileUploadService.uploadToCloudinary(
        req.file.buffer,
        {
          folder: `properties/${id}/documents`,
          public_id: req.file.originalname,
        }
      );

      const document = {
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: cloudinaryResult.secure_url,
        cloudinaryId: cloudinaryResult.public_id,
        uploadDate: new Date(),
      };

      property.documents.push(document);
      await property.save();

      res.status(200).json({
        status: "success",
        message: "Document uploaded successfully",
        data: { property },
      });
    } catch (error) {
      console.error("Upload document error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while uploading the document",
      });
    }
  }
);

// Delete Document from Property
router.delete(
  "/:id/documents/:documentId",
  authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency']),
  async (req, res) => {
    try {
      const { id, documentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(documentId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid document ID",
        });
      }

      const agencyFilter = getAgencyFilter(req);
      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const filter = { _id: id, isActive: true, ...agencyFilter };
      const property = await Property.findOne(filter);

      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      // Find the document to delete
      const documentIndex = property.documents.findIndex(
        (doc) => doc._id.toString() === documentId
      );

      if (documentIndex === -1) {
        return res.status(404).json({
          status: "error",
          message: "Document not found",
        });
      }

      const documentToDelete = property.documents[documentIndex];

      // Delete from Cloudinary if it has a cloudinaryId
      if (documentToDelete.cloudinaryId) {
        try {
          await fileUploadService.deleteFromCloudinary(documentToDelete.cloudinaryId);
        } catch (cloudinaryError) {
          console.warn("Failed to delete from Cloudinary:", cloudinaryError);
          // Continue with database deletion even if Cloudinary deletion fails
        }
      }

      // Remove document from array
      property.documents.splice(documentIndex, 1);
      await property.save();

      res.status(200).json({
        status: "success",
        message: "Document deleted successfully",
        data: {
          property: {
            id: property._id,
            documents: property.documents?.map((document) => ({
              id: document._id,
              name: document.name,
              type: document.type,
              size: document.size,
              url: document.url,
              cloudinaryId: document.cloudinaryId,
              uploadDate: document.uploadDate,
            })),
          }
        },
      });
    } catch (error) {
      console.error("Delete document error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while deleting the document",
      });
    }
  }
);

// Toggle Property Doubt Status
router.patch(
  "/:id/toggle-doubt",
  authenticateUserTypes(["SuperUser", "TeamMember", "Agency"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID",
        });
      }

      const agencyFilter = getAgencyFilter(req);
      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const filter = { _id: id, isActive: true, ...agencyFilter };
      const property = await Property.findOne(filter);

      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      property.hasDoubt = !property.hasDoubt;
      await property.save();

      res.status(200).json({
        status: "success",
        message: "Property doubt status toggled successfully",
        data: { property },
      });
    } catch (error) {
      console.error("Toggle doubt status error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while toggling the doubt status",
      });
    }
  }
);

// Assign Team Member to Property
router.post(
  "/:id/assign-team-member",
  authenticateUserTypes(["SuperUser", "Agency"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { teamMemberId } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid property ID",
        });
      }

      if (!mongoose.Types.ObjectId.isValid(teamMemberId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid team member ID",
        });
      }

      const agencyFilter = getAgencyFilter(req);
      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      const filter = { _id: id, isActive: true, ...agencyFilter };
      const property = await Property.findOne(filter);

      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      property.assignedTeamMember = teamMemberId;
      await property.save();

      res.status(200).json({
        status: "success",
        message: "Team member assigned successfully",
        data: { property },
      });
    } catch (error) {
      console.error("Assign team member error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while assigning the team member",
      });
    }
  }
);

// Get Compliance Report Data
router.get(
  "/reports/compliance",
  authenticateUserTypes(["SuperUser", "Agency"]),
  async (req, res) => {
    try {
      const { groupBy = "agency" } = req.query;
      const agencyFilter = getAgencyFilter(req);

      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      let aggregation;

      if (groupBy === "all") {
        // When groupBy is "all", return all properties with their compliance data
        aggregation = [
          {
            $match: { ...agencyFilter, isActive: true },
          },
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "property",
              as: "jobs",
            },
          },
          {
            $project: {
              _id: 1,
              name: { $concat: ["$address.street", ", ", "$address.suburb"] },
              type: "property",
              totalJobs: { $size: "$jobs" },
              completedJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $eq: ["$$this.status", "Completed"] }
                  }
                }
              },
              overdueJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $eq: ["$$this.status", "Overdue"] }
                  }
                }
              },
            },
          },
          {
            $project: {
              _id: 0,
              id: "$_id",
              name: 1,
              type: 1,
              totalJobs: 1,
              completedJobs: 1,
              overdueJobs: 1,
              compliantJobs: {
                $subtract: ["$completedJobs", "$overdueJobs"],
              },
              complianceRate: {
                $cond: [
                  { $eq: ["$totalJobs", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$completedJobs", "$totalJobs"] },
                      100,
                    ],
                  },
                ],
              },
              avgCompletionTime: 2.4, // Static value for now
            },
          },
        ];
      } else {
        // Original grouping logic for agency, region, property
        const groupField = groupBy === "agency" ? "$agency" :
                           groupBy === "region" ? "$address.state" :
                           "$_id";

        aggregation = [
          {
            $match: { ...agencyFilter, isActive: true },
          },
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "property",
              as: "jobs",
            },
          },
          {
            $unwind: {
              path: "$jobs",
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $group: {
              _id: groupField,
              totalJobs: { $sum: { $cond: [{ $ifNull: ["$jobs", false] }, 1, 0] } },
              completedJobs: {
                $sum: {
                  $cond: [{ $eq: ["$jobs.status", "Completed"] }, 1, 0],
                },
              },
              overdueJobs: {
                $sum: {
                  $cond: [{ $eq: ["$jobs.status", "Overdue"] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              id: "$_id",
              name: { $ifNull: ["$_id", "Unknown"] },
              type: groupBy,
              totalJobs: "$totalJobs",
              completedJobs: "$completedJobs",
              overdueJobs: "$overdueJobs",
              compliantJobs: {
                $subtract: ["$completedJobs", "$overdueJobs"],
              },
              complianceRate: {
                $cond: [
                  { $eq: ["$totalJobs", 0] },
                  0,
                  {
                    $multiply: [
                      { $divide: ["$completedJobs", "$totalJobs"] },
                      100,
                    ],
                  },
                ],
              },
              avgCompletionTime: 2.4, // Static value for now
            },
          },
        ];
      }

      const data = await Property.aggregate(aggregation);

      res.status(200).json({
        status: "success",
        data,
      });
    } catch (error) {
      console.error("Get compliance report error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while fetching the compliance report",
      });
    }
  }
);

// Get Revenue Report Data
router.get(
  "/reports/revenue",
  authenticateUserTypes(["SuperUser", "Agency"]),
  async (req, res) => {
    try {
      const { groupBy = "agency", period = "month" } = req.query;
      const agencyFilter = getAgencyFilter(req);

      if (agencyFilter === null) {
        return res.status(401).json({
          status: "error",
          message: "Authentication required",
        });
      }

      // This is a simplified example. A real implementation would require
      // more complex date filtering and aggregation.
      const aggregation = [
        {
          $match: { ...agencyFilter, isActive: true },
        },
        {
          $lookup: {
            from: "jobs",
            localField: "_id",
            foreignField: "property",
            as: "jobs",
          },
        },
        {
          $unwind: "$jobs",
        },
        {
          $match: {
            "jobs.status": "Completed",
          },
        },
        {
          $group: {
            _id: `${groupBy}`,
            amount: { $sum: "$jobs.cost.totalCost" },
            jobCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            period: period,
            [groupBy]: "$_id",
            amount: "$amount",
            jobCount: "$jobCount",
            avgJobValue: { $divide: ["$amount", "$jobCount"] },
          },
        },
      ];

      const data = await Property.aggregate(aggregation);

      res.status(200).json({
        status: "success",
        data,
      });
    } catch (error) {
      console.error("Get revenue report error:", error);
      res.status(500).json({
        status: "error",
        message: "An error occurred while fetching the revenue report",
      });
    }
  }
);

export default router;
