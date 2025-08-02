import PropertyManagerSecurity from "../utils/propertyManagerSecurity.js";

/**
 * Middleware for PropertyManager security and access control
 */

/**
 * Validate PropertyManager access to a specific resource
 * @param {String} resourceType - Type of resource ('property', 'job', 'contact')
 * @returns {Function} - Express middleware function
 */
export const validatePropertyManagerAccess = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Check if user is a PropertyManager
      if (!req.propertyManager) {
        return res.status(403).json({
          success: false,
          message: "Access denied. PropertyManager authentication required.",
        });
      }

      const propertyManagerId = req.propertyManager.id;
      const resourceId = req.params.id || req.body.resourceId;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: "Resource ID is required for access validation.",
        });
      }

      // Validate access to the specific resource
      const hasAccess = await PropertyManagerSecurity.validateResourceAccess(
        propertyManagerId,
        resourceId,
        resourceType
      );

      if (!hasAccess) {
        // Log the access attempt
        await PropertyManagerSecurity.auditAccess(
          propertyManagerId,
          req.method,
          resourceType,
          resourceId,
          false
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. You don't have permission to access this ${resourceType}.`,
        });
      }

      // Log successful access
      await PropertyManagerSecurity.auditAccess(
        propertyManagerId,
        req.method,
        resourceType,
        resourceId,
        true
      );

      next();
    } catch (error) {
      console.error("PropertyManager access validation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during access validation.",
      });
    }
  };
};

/**
 * Check if PropertyManager can perform a specific action
 * @param {String} action - Action to perform ('read', 'write', 'delete')
 * @param {String} resourceType - Type of resource
 * @returns {Function} - Express middleware function
 */
export const validatePropertyManagerAction = (action, resourceType) => {
  return async (req, res, next) => {
    try {
      // Check if user is a PropertyManager
      if (!req.propertyManager) {
        return res.status(403).json({
          success: false,
          message: "Access denied. PropertyManager authentication required.",
        });
      }

      const propertyManagerId = req.propertyManager.id;

      // Check if PropertyManager can perform the action
      const canPerform = await PropertyManagerSecurity.canPerformAction(
        propertyManagerId,
        action,
        resourceType
      );

      if (!canPerform) {
        // Log the unauthorized action attempt
        await PropertyManagerSecurity.auditAccess(
          propertyManagerId,
          action,
          resourceType,
          req.params.id || "unknown",
          false
        );

        return res.status(403).json({
          success: false,
          message: `Access denied. PropertyManagers cannot ${action} ${resourceType}s.`,
        });
      }

      next();
    } catch (error) {
      console.error("PropertyManager action validation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during action validation.",
      });
    }
  };
};

/**
 * Apply PropertyManager-specific rate limiting
 * @param {String} action - Action being performed
 * @returns {Function} - Express middleware function
 */
export const propertyManagerRateLimit = (action) => {
  return async (req, res, next) => {
    try {
      // Check if user is a PropertyManager
      if (!req.propertyManager) {
        return res.status(403).json({
          success: false,
          message: "Access denied. PropertyManager authentication required.",
        });
      }

      const propertyManagerId = req.propertyManager.id;

      // Check rate limit
      const withinLimit = await PropertyManagerSecurity.checkRateLimit(
        propertyManagerId,
        action
      );

      if (!withinLimit) {
        return res.status(429).json({
          success: false,
          message: "Rate limit exceeded. Please try again later.",
        });
      }

      next();
    } catch (error) {
      console.error("PropertyManager rate limiting error:", error);
      // Allow the request to proceed if rate limiting fails
      next();
    }
  };
};

/**
 * Validate PropertyManager property assignment before allowing operations
 * @returns {Function} - Express middleware function
 */
export const validatePropertyAssignment = async (req, res, next) => {
  try {
    // Check if user is a PropertyManager
    if (!req.propertyManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. PropertyManager authentication required.",
      });
    }

    const propertyManagerId = req.propertyManager.id;
    const propertyId = req.params.id || req.body.propertyId;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "Property ID is required for assignment validation.",
      });
    }

    // Validate property assignment
    const isAssigned = await PropertyManagerSecurity.validatePropertyAssignment(
      propertyManagerId,
      propertyId
    );

    if (!isAssigned) {
      // Log the unauthorized access attempt
      await PropertyManagerSecurity.auditAccess(
        propertyManagerId,
        req.method,
        "property",
        propertyId,
        false
      );

      return res.status(403).json({
        success: false,
        message: "Access denied. You are not assigned to this property.",
      });
    }

    // Log successful access
    await PropertyManagerSecurity.auditAccess(
      propertyManagerId,
      req.method,
      "property",
      propertyId,
      true
    );

    next();
  } catch (error) {
    console.error("Property assignment validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during assignment validation.",
    });
  }
};

/**
 * Create database query filter for PropertyManager access
 * @param {String} resourceType - Type of resource to filter
 * @returns {Function} - Express middleware function
 */
export const createPropertyManagerFilter = (resourceType) => {
  return async (req, res, next) => {
    try {
      // Check if user is a PropertyManager
      if (!req.propertyManager) {
        return next(); // Not a PropertyManager, continue with normal flow
      }

      const propertyManagerId = req.propertyManager.id;

      // Create access filter
      const accessFilter = await PropertyManagerSecurity.createAccessFilter(
        propertyManagerId,
        resourceType
      );

      // Add the filter to the request object
      req.propertyManagerFilter = accessFilter;
      req.isPropertyManagerRequest = true;

      next();
    } catch (error) {
      console.error("PropertyManager filter creation error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during filter creation.",
      });
    }
  };
};

/**
 * Validate PropertyManager ownership
 * @returns {Function} - Express middleware function
 */
export const validatePropertyManagerOwnership = async (req, res, next) => {
  try {
    // Check if user is a PropertyManager
    if (!req.propertyManager) {
      return res.status(403).json({
        success: false,
        message: "Access denied. PropertyManager authentication required.",
      });
    }

    const propertyManagerId = req.propertyManager.id;
    const ownerId = req.params.ownerId || req.body.ownerId;
    const ownerType = req.params.ownerType || req.body.ownerType || "Agency";

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Owner ID is required for ownership validation.",
      });
    }

    // Validate ownership
    const isOwner = await PropertyManagerSecurity.validateOwnership(
      propertyManagerId,
      ownerId,
      ownerType
    );

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. You don't have ownership of this PropertyManager.",
      });
    }

    next();
  } catch (error) {
    console.error("PropertyManager ownership validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during ownership validation.",
    });
  }
};

/**
 * Comprehensive PropertyManager security middleware
 * Combines multiple security checks
 * @param {Object} options - Security options
 * @returns {Function} - Express middleware function
 */
export const propertyManagerSecurity = (options = {}) => {
  const {
    resourceType,
    action,
    requireAssignment = false,
    rateLimitAction,
    validateOwnership = false,
  } = options;

  return async (req, res, next) => {
    try {
      // Check if user is a PropertyManager
      if (!req.propertyManager) {
        return res.status(403).json({
          success: false,
          message: "Access denied. PropertyManager authentication required.",
        });
      }

      const propertyManagerId = req.propertyManager.id;

      // Check rate limiting if specified
      if (rateLimitAction) {
        const withinLimit = await PropertyManagerSecurity.checkRateLimit(
          propertyManagerId,
          rateLimitAction
        );

        if (!withinLimit) {
          return res.status(429).json({
            success: false,
            message: "Rate limit exceeded. Please try again later.",
          });
        }
      }

      // Check action permissions if specified
      if (action && resourceType) {
        const canPerform = await PropertyManagerSecurity.canPerformAction(
          propertyManagerId,
          action,
          resourceType
        );

        if (!canPerform) {
          return res.status(403).json({
            success: false,
            message: `Access denied. PropertyManagers cannot ${action} ${resourceType}s.`,
          });
        }
      }

      // Validate resource access if specified
      if (resourceType && req.params.id) {
        const hasAccess = await PropertyManagerSecurity.validateResourceAccess(
          propertyManagerId,
          req.params.id,
          resourceType
        );

        if (!hasAccess) {
          return res.status(403).json({
            success: false,
            message: `Access denied. You don't have permission to access this ${resourceType}.`,
          });
        }
      }

      // Validate property assignment if required
      if (requireAssignment && req.params.id) {
        const isAssigned =
          await PropertyManagerSecurity.validatePropertyAssignment(
            propertyManagerId,
            req.params.id
          );

        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            message: "Access denied. You are not assigned to this property.",
          });
        }
      }

      // Validate ownership if required
      if (validateOwnership) {
        const ownerId = req.params.ownerId || req.body.ownerId;
        const ownerType =
          req.params.ownerType || req.body.ownerType || "Agency";

        if (ownerId) {
          const isOwner = await PropertyManagerSecurity.validateOwnership(
            propertyManagerId,
            ownerId,
            ownerType
          );

          if (!isOwner) {
            return res.status(403).json({
              success: false,
              message:
                "Access denied. You don't have ownership of this PropertyManager.",
            });
          }
        }
      }

      // Log the access attempt
      await PropertyManagerSecurity.auditAccess(
        propertyManagerId,
        req.method,
        resourceType || "unknown",
        req.params.id || "unknown",
        true
      );

      next();
    } catch (error) {
      console.error("PropertyManager security middleware error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error during security validation.",
      });
    }
  };
};

export default {
  validatePropertyManagerAccess,
  validatePropertyManagerAction,
  propertyManagerRateLimit,
  validatePropertyAssignment,
  createPropertyManagerFilter,
  validatePropertyManagerOwnership,
  propertyManagerSecurity,
};
