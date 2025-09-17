import express from "express";
import { authenticate, authenticateUserTypes } from "../middleware/auth.middleware.js";
import Property from "../models/Property.js";
import PropertyManager from "../models/PropertyManager.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import Job from "../models/Job.js";

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

// State to region mapping
const STATE_TO_REGION_MAP = {
  NSW: ["Sydney Metro", "Regional NSW"],
  VIC: ["Melbourne Metro", "Regional VIC"],
  QLD: ["Brisbane Metro", "Regional QLD"],
  WA: ["Perth Metro", "Regional WA"],
  SA: ["Adelaide Metro", "Regional SA"],
  TAS: ["Hobart Metro", "Regional TAS"],
  NT: ["Darwin Metro", "Regional NT"],
  ACT: ["Canberra Metro"]
};

// Helper function to normalize state
const normalizeState = (state) => {
  if (!state) return "";
  return state.toUpperCase().trim();
};

// Helper function to get regions for a state
const getRegionsForState = (state) => {
  const normalizedState = normalizeState(state);
  return STATE_TO_REGION_MAP[normalizedState] || [];
};

// Get regional statistics
router.get("/stats", authenticateUserTypes(['super_user', 'team_member']), async (req, res) => {
  try {
    const { region, state } = req.query;

    // Build filters
    let propertyFilter = {};
    let technicianFilter = {};
    let propertyManagerFilter = {};
    let agencyFilter = {};

    if (region && region !== "all") {
      propertyFilter.region = region;
      agencyFilter.region = region;
    }

    if (state && state !== "all") {
      const normalizedState = normalizeState(state);
      technicianFilter["address.state"] = new RegExp(`^${normalizedState}$`, 'i');
      propertyManagerFilter["address.state"] = new RegExp(`^${normalizedState}$`, 'i');

      // If state is provided but no region, get all regions for that state
      if (!region || region === "all") {
        const stateRegions = getRegionsForState(normalizedState);
        if (stateRegions.length > 0) {
          propertyFilter.region = { $in: stateRegions };
          agencyFilter.region = { $in: stateRegions };
        }
      }
    }

    // Get counts in parallel
    const [
      totalProperties,
      activeProperties,
      totalTechnicians,
      availableTechnicians,
      totalPropertyManagers,
      activePropertyManagers,
      totalAgencies,
      activeAgencies,
      totalJobs,
      activeJobs,
      completedJobs,
      overdueJobs
    ] = await Promise.all([
      Property.countDocuments(propertyFilter),
      Property.countDocuments({ ...propertyFilter, isActive: true }),
      Technician.countDocuments(technicianFilter),
      Technician.countDocuments({ ...technicianFilter, availabilityStatus: "Available" }),
      PropertyManager.countDocuments(propertyManagerFilter),
      PropertyManager.countDocuments({ ...propertyManagerFilter, status: "Active" }),
      Agency.countDocuments(agencyFilter),
      Agency.countDocuments({ ...agencyFilter, status: "Active" }),
      // For jobs, we need to populate property and filter by region
      region || state ?
        Job.countDocuments().populate('property').then(jobs =>
          jobs.filter(job => {
            if (!job.property) return false;
            if (region && region !== "all") return job.property.region === region;
            if (state && state !== "all") {
              const stateRegions = getRegionsForState(normalizeState(state));
              return stateRegions.includes(job.property.region);
            }
            return true;
          }).length
        ) : Job.countDocuments(),
      // Similar for active jobs
      region || state ?
        Job.countDocuments({ status: { $in: ["Pending", "In Progress", "Assigned"] } }).populate('property').then(jobs =>
          jobs.filter(job => {
            if (!job.property) return false;
            if (region && region !== "all") return job.property.region === region;
            if (state && state !== "all") {
              const stateRegions = getRegionsForState(normalizeState(state));
              return stateRegions.includes(job.property.region);
            }
            return true;
          }).length
        ) : Job.countDocuments({ status: { $in: ["Pending", "In Progress", "Assigned"] } }),
      // Completed jobs
      region || state ?
        Job.countDocuments({ status: "Completed" }).populate('property').then(jobs =>
          jobs.filter(job => {
            if (!job.property) return false;
            if (region && region !== "all") return job.property.region === region;
            if (state && state !== "all") {
              const stateRegions = getRegionsForState(normalizeState(state));
              return stateRegions.includes(job.property.region);
            }
            return true;
          }).length
        ) : Job.countDocuments({ status: "Completed" }),
      // Overdue jobs
      region || state ?
        Job.countDocuments({ status: { $ne: "Completed" }, dueDate: { $lt: new Date() } }).populate('property').then(jobs =>
          jobs.filter(job => {
            if (!job.property) return false;
            if (region && region !== "all") return job.property.region === region;
            if (state && state !== "all") {
              const stateRegions = getRegionsForState(normalizeState(state));
              return stateRegions.includes(job.property.region);
            }
            return true;
          }).length
        ) : Job.countDocuments({ status: { $ne: "Completed" }, dueDate: { $lt: new Date() } })
    ]);

    // Get regional breakdown
    const regionBreakdown = {};
    for (const validRegion of VALID_REGIONS) {
      const count = await Property.countDocuments({ region: validRegion });
      if (count > 0) {
        regionBreakdown[validRegion] = count;
      }
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalProperties,
          activeProperties,
          totalTechnicians,
          availableTechnicians,
          totalPropertyManagers,
          activePropertyManagers,
          totalAgencies,
          activeAgencies,
          totalJobs,
          activeJobs,
          completedJobs,
          overdueJobs
        },
        regionBreakdown,
        filters: {
          region: region || "all",
          state: state || "all"
        }
      }
    });

  } catch (error) {
    console.error("Error fetching regional stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching regional statistics",
      error: error.message
    });
  }
});

// Get properties by region/state
router.get("/properties", authenticateUserTypes(['super_user', 'team_member']), async (req, res) => {
  try {
    const { region, state, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (region && region !== "all") {
      filter.region = region;
    }

    if (state && state !== "all") {
      const normalizedState = normalizeState(state);
      const stateRegions = getRegionsForState(normalizedState);
      if (stateRegions.length > 0 && (!region || region === "all")) {
        filter.region = { $in: stateRegions };
      }
    }

    const [properties, total] = await Promise.all([
      Property.find(filter)
        .populate("agency", "companyName email phone")
        .populate("assignedPropertyManager", "firstName lastName email phone")
        .select("address propertyType region status currentTenant agency assignedPropertyManager createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Property.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        properties: properties.map(property => ({
          id: property._id,
          address: property.address?.fullAddress || "N/A",
          propertyType: property.propertyType,
          region: property.region,
          status: property.status,
          tenantName: property.currentTenant?.name || "Vacant",
          tenantEmail: property.currentTenant?.email || "N/A",
          agency: property.agency ? {
            name: property.agency.companyName,
            email: property.agency.email,
            phone: property.agency.phone
          } : null,
          propertyManager: property.assignedPropertyManager ? {
            name: `${property.assignedPropertyManager.firstName} ${property.assignedPropertyManager.lastName}`,
            email: property.assignedPropertyManager.email,
            phone: property.assignedPropertyManager.phone
          } : null,
          createdAt: property.createdAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + properties.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error fetching regional properties:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching properties",
      error: error.message
    });
  }
});

// Get property managers by state
router.get("/property-managers", authenticateUserTypes(['super_user', 'team_member']), async (req, res) => {
  try {
    const { state, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (state && state !== "all") {
      const normalizedState = normalizeState(state);
      filter["address.state"] = new RegExp(`^${normalizedState}$`, 'i');
    }

    const [propertyManagers, total] = await Promise.all([
      PropertyManager.find(filter)
        .select("firstName lastName email phone address status assignedProperties createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PropertyManager.countDocuments(filter)
    ]);

    // Get property counts for each manager
    const managersWithCounts = await Promise.all(
      propertyManagers.map(async (manager) => {
        const propertyCount = await Property.countDocuments({
          assignedPropertyManager: manager._id
        });

        return {
          id: manager._id,
          name: `${manager.firstName} ${manager.lastName}`,
          email: manager.email,
          phone: manager.phone,
          address: manager.address?.fullAddress || "N/A",
          state: manager.address?.state || "N/A",
          region: manager.address ? getRegionsForState(normalizeState(manager.address.state))[0] || "N/A" : "N/A",
          status: manager.status,
          propertyCount,
          createdAt: manager.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        propertyManagers: managersWithCounts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + propertyManagers.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error fetching regional property managers:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching property managers",
      error: error.message
    });
  }
});

// Get technicians by state
router.get("/technicians", authenticateUserTypes(['super_user', 'team_member']), async (req, res) => {
  try {
    const { state, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    let filter = {};

    if (state && state !== "all") {
      const normalizedState = normalizeState(state);
      filter["address.state"] = new RegExp(`^${normalizedState}$`, 'i');
    }

    const [technicians, total] = await Promise.all([
      Technician.find(filter)
        .select("firstName lastName email phone address availabilityStatus status experience totalRatings averageRating completedJobs currentJobs createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Technician.countDocuments(filter)
    ]);

    const techniciansWithDetails = technicians.map(technician => ({
      id: technician._id,
      name: `${technician.firstName} ${technician.lastName}`,
      email: technician.email,
      phone: technician.phone,
      address: technician.address?.fullAddress || "N/A",
      state: technician.address?.state || "N/A",
      region: technician.address ? getRegionsForState(normalizeState(technician.address.state))[0] || "N/A" : "N/A",
      availabilityStatus: technician.availabilityStatus,
      status: technician.status,
      experience: technician.experience || 0,
      rating: technician.averageRating || 0,
      totalRatings: technician.totalRatings || 0,
      completedJobs: technician.completedJobs || 0,
      currentJobs: technician.currentJobs || 0,
      createdAt: technician.createdAt
    }));

    res.json({
      success: true,
      data: {
        technicians: techniciansWithDetails,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          total,
          hasNext: skip + technicians.length < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error("Error fetching regional technicians:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching technicians",
      error: error.message
    });
  }
});

export default router;