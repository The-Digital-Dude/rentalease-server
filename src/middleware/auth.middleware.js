import jwt from "jsonwebtoken";
import SuperUser from "../models/SuperUser.js";

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

    // Handle different user types
    if (decoded.type === "superUser") {
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
    } else if (decoded.type === "agency") {
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

export { authenticateSuperUser, authenticateAgency, authenticate };
