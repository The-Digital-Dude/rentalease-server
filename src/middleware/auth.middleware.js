import jwt from "jsonwebtoken";
import SuperUser from "../models/SuperUser.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";

/**
 * Middleware to authenticate and authorize super users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateSuperUser = async (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header is required",
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access token is required",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Check if token is for a super user (not property manager)
    if (decoded.type && decoded.type !== "superUser") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Super user privileges required.",
      });
    }

    // Find the super user in database
    const superUser = await SuperUser.findById(decoded.id);

    if (!superUser) {
      return res.status(401).json({
        status: "error",
        message: "Super user not found",
      });
    }

    // Add super user info to request object
    req.superUser = {
      id: superUser._id,
      name: superUser.name,
      email: superUser.email,
    };

    next();
  } catch (error) {
    console.error("Super user authentication error:", error);
    res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to authenticate agencies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateAgency = async (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header is required",
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access token is required",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Check if token is for an agency
    if (decoded.type !== "agency") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Agency privileges required.",
      });
    }

    // Find the agency in database
    const { default: Agency } = await import("../models/Agency.js");
    const agency = await Agency.findById(decoded.id);

    if (!agency) {
      return res.status(401).json({
        status: "error",
        message: "Agency not found",
      });
    }

    // Check if agency account is active
    if (!agency.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${agency.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Add agency info to request object
    req.agency = {
      id: agency._id,
      companyName: agency.companyName,
      contactPerson: agency.contactPerson,
      email: agency.email,
      status: agency.status,
    };

    next();
  } catch (error) {
    console.error("Agency authentication error:", error);
    res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Generic authentication middleware that can handle both super users and property managers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = async (req, res, next) => {
  console.log("Authenticating user...");
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      console.log("No auth header found");
      return res.status(401).json({
        status: "error",
        message: "Authorization header is required",
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(" ")[1];

    console.log(token, "token from header");
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access token is required",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log(decoded, "decoded token");
    } catch (tokenError) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Handle different user types
    // Check both 'type' and 'userType' fields for compatibility
    const userType = decoded.userType || decoded.type;

    if (userType === "SuperUser" || userType === "superUser") {
      // Find the super user in database
      const superUser = await SuperUser.findById(decoded.id);

      if (!superUser) {
        return res.status(401).json({
          status: "error",
          message: "Super user not found",
        });
      }

      // Add super user info to request object
      req.superUser = {
        id: superUser._id,
        name: superUser.name,
        email: superUser.email,
      };
    } else if (userType === "Agency" || userType === "agency") {
      // Find the agency in database
      const { default: Agency } = await import("../models/Agency.js");
      const agency = await Agency.findById(decoded.id);

      if (!agency) {
        return res.status(401).json({
          status: "error",
          message: "Agency not found",
        });
      }

      // Check if agency account is active
      if (!agency.isActive()) {
        return res.status(401).json({
          status: "error",
          message: `Account is ${agency.status.toLowerCase()}. Please contact support.`,
        });
      }

      // Add agency info to request object
      req.agency = {
        id: agency._id,
        companyName: agency.companyName,
        contactPerson: agency.contactPerson,
        email: agency.email,
        status: agency.status,
      };
    } else if (userType === "Technician" || userType === "technician") {
      // Find the technician in database
      const technician = await Technician.findById(decoded.id);

      if (!technician) {
        return res.status(401).json({
          status: "error",
          message: "Technician not found",
        });
      }

      // Check if technician account is active
      if (technician.status !== "Active") {
        return res.status(401).json({
          status: "error",
          message: `Account is ${technician.status.toLowerCase()}. Please contact your administrator.`,
        });
      }

      // Add technician info to request object
      req.technician = {
        id: technician._id,
        fullName: technician.fullName,
        email: technician.email,
        status: technician.status,
        availabilityStatus: technician.availabilityStatus,
        currentJobs: technician.currentJobs,
        maxJobs: technician.maxJobs,
      };
    } else if (
      userType === "PropertyManager" ||
      userType === "propertyManager"
    ) {
      // Find the property manager in database
      const propertyManager = await PropertyManager.findById(decoded.id);

      if (!propertyManager) {
        return res.status(401).json({
          status: "error",
          message: "Property Manager not found",
        });
      }

      // Check if property manager account is active
      if (propertyManager.status !== "Active") {
        return res.status(401).json({
          status: "error",
          message: `Account is ${propertyManager.status.toLowerCase()}. Please contact your administrator.`,
        });
      }

      // Add property manager info to request object
      req.propertyManager = {
        id: propertyManager._id,
        fullName: propertyManager.fullName,
        email: propertyManager.email,
        status: propertyManager.status,
        availabilityStatus: propertyManager.availabilityStatus,
        assignedProperties: propertyManager.assignedProperties,
      };
    } else {
      return res.status(401).json({
        status: "error",
        message: "Invalid user type",
      });
    }

    // Add decoded token info to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

/**
 * Middleware to authenticate property managers
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticatePropertyManager = async (req, res, next) => {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        status: "error",
        message: "Authorization header is required",
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Access token is required",
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: "error",
        message: "Invalid or expired token",
      });
    }

    // Check if token is for a property manager
    if (decoded.type !== "propertyManager") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Property Manager privileges required.",
      });
    }

    // Find the property manager in database
    const propertyManager = await PropertyManager.findById(decoded.id);

    if (!propertyManager) {
      return res.status(401).json({
        status: "error",
        message: "Property Manager not found",
      });
    }

    // Check if property manager account is active
    if (!propertyManager.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Add property manager info to request object
    req.propertyManager = {
      id: propertyManager._id,
      fullName: propertyManager.fullName,
      email: propertyManager.email,
      status: propertyManager.status,
      availabilityStatus: propertyManager.availabilityStatus,
      assignedProperties: propertyManager.assignedProperties,
    };

    next();
  } catch (error) {
    console.error("Property Manager authentication error:", error);
    res.status(500).json({
      status: "error",
      message: "Authentication failed",
    });
  }
};

export {
  authenticateSuperUser,
  authenticateAgency,
  authenticatePropertyManager,
  authenticate,
};
