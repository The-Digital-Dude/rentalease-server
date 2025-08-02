import express from "express";
import mongoose from "mongoose";
import Property from "../models/Property.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticatePropertyManager,
  authenticate,
} from "../middleware/auth.middleware.js";
import {
  setDefaultInspectionDates,
  setStateSpecificCompliance,
} from "../utils/propertyHelpers.js";

const router = express.Router();

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
router.post("/", authenticate, async (req, res) => {
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
router.get("/filter-options", authenticate, async (req, res) => {
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

// Get All Properties with Advanced Filtering
router.get("/", authenticate, async (req, res) => {
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
router.get("/:id", authenticate, async (req, res) => {
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
router.put("/:id", authenticate, async (req, res) => {
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
router.delete("/:id", authenticate, async (req, res) => {
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
router.get("/:id/compliance", authenticate, async (req, res) => {
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

// Get Available Agencies for Super Users
router.get("/agencies/available", authenticateSuperUser, async (req, res) => {
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

// Property Assignment System Endpoints

// Assign Property Manager to Property (Agency/SuperUser/PropertyManager only)
router.post("/:id/assign-property-manager", authenticate, async (req, res) => {
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

    // Find property manager
    const propertyManager = await PropertyManager.findById(propertyManagerId);
    if (!propertyManager) {
      return res.status(404).json({
        status: "error",
        message: "Property Manager not found",
      });
    }

    // Check if property manager is owned by the same agency/superuser
    if (
      req.agency &&
      propertyManager.owner.ownerType === "Agency" &&
      propertyManager.owner.ownerId.toString() !== req.agency.id
    ) {
      return res.status(403).json({
        status: "error",
        message: "You can only assign Property Managers owned by your agency.",
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

// Get Available Property Managers for Assignment (Agency/SuperUser/PropertyManager only)
router.get("/available-property-managers", authenticate, async (req, res) => {
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
        "fullName email phone status availabilityStatus assignedProperties"
      )
      .sort({ fullName: 1 });

    res.status(200).json({
      status: "success",
      data: {
        propertyManagers: propertyManagers.map((pm) => ({
          id: pm._id,
          fullName: pm.fullName,
          email: pm.email,
          phone: pm.phone,
          status: pm.status,
          availabilityStatus: pm.availabilityStatus,
          assignedPropertiesCount: pm.assignedProperties.length,
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

// Get Property Assignment Summary (Agency/SuperUser/PropertyManager only)
router.get("/:id/assignment-summary", authenticate, async (req, res) => {
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
      "fullName email phone status availabilityStatus"
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

export default router;
