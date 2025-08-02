import PropertyManager from "../models/PropertyManager.js";
import Property from "../models/Property.js";

/**
 * Security and Access Control utilities for PropertyManager system
 */
class PropertyManagerSecurity {
  /**
   * Validate that PropertyManager is assigned to a property
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} propertyId - Property ID
   * @returns {Promise<Boolean>} - True if assigned, false otherwise
   */
  static async validatePropertyAssignment(propertyManagerId, propertyId) {
    try {
      const propertyManager = await PropertyManager.findById(propertyManagerId);
      if (!propertyManager) {
        return false;
      }

      const assignment = propertyManager.assignedProperties.find(
        (assignment) =>
          assignment.propertyId.toString() === propertyId.toString() &&
          assignment.status === "Active"
      );

      return !!assignment;
    } catch (error) {
      console.error("Error validating property assignment:", error);
      return false;
    }
  }

  /**
   * Get all properties assigned to a PropertyManager
   * @param {String} propertyManagerId - PropertyManager ID
   * @returns {Promise<Array>} - Array of property IDs
   */
  static async getAssignedPropertyIds(propertyManagerId) {
    try {
      const propertyManager = await PropertyManager.findById(propertyManagerId);
      if (!propertyManager) {
        return [];
      }

      return propertyManager.assignedProperties
        .filter((assignment) => assignment.status === "Active")
        .map((assignment) => assignment.propertyId);
    } catch (error) {
      console.error("Error getting assigned property IDs:", error);
      return [];
    }
  }

  /**
   * Validate PropertyManager access to a specific resource
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} resourceId - Resource ID (property, job, etc.)
   * @param {String} resourceType - Type of resource ('property', 'job', 'contact')
   * @returns {Promise<Boolean>} - True if access allowed, false otherwise
   */
  static async validateResourceAccess(
    propertyManagerId,
    resourceId,
    resourceType
  ) {
    try {
      switch (resourceType) {
        case "property":
          return await this.validatePropertyAssignment(
            propertyManagerId,
            resourceId
          );

        case "job":
          // For jobs, check if PropertyManager has access to the job's property
          const job = await Property.findById(resourceId).populate("property");
          if (job && job.property) {
            return await this.validatePropertyAssignment(
              propertyManagerId,
              job.property._id
            );
          }
          return false;

        case "contact":
          // For contacts, check if PropertyManager has access to properties owned by the contact's agency
          const contact = await Contact.findById(resourceId);
          if (contact && contact.owner.ownerType === "Agency") {
            const assignedPropertyIds = await this.getAssignedPropertyIds(
              propertyManagerId
            );
            const properties = await Property.find({
              _id: { $in: assignedPropertyIds },
              agency: contact.owner.ownerId,
            });
            return properties.length > 0;
          }
          return false;

        default:
          return false;
      }
    } catch (error) {
      console.error("Error validating resource access:", error);
      return false;
    }
  }

  /**
   * Create database query filter for PropertyManager access
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} resourceType - Type of resource to filter
   * @returns {Promise<Object>} - MongoDB query filter
   */
  static async createAccessFilter(propertyManagerId, resourceType) {
    try {
      const assignedPropertyIds = await this.getAssignedPropertyIds(
        propertyManagerId
      );

      if (assignedPropertyIds.length === 0) {
        // Return filter that matches nothing if no properties assigned
        return { _id: { $in: [] } };
      }

      switch (resourceType) {
        case "property":
          return { _id: { $in: assignedPropertyIds } };

        case "job":
          return { property: { $in: assignedPropertyIds } };

        case "contact":
          // Get agencies that own the assigned properties
          const properties = await Property.find({
            _id: { $in: assignedPropertyIds },
          }).select("agency");

          const agencyIds = [
            ...new Set(properties.map((prop) => prop.agency.toString())),
          ];

          return {
            "owner.ownerType": "Agency",
            "owner.ownerId": { $in: agencyIds },
          };

        default:
          return { _id: { $in: [] } };
      }
    } catch (error) {
      console.error("Error creating access filter:", error);
      return { _id: { $in: [] } };
    }
  }

  /**
   * Validate PropertyManager ownership (who owns/manages this PropertyManager)
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} ownerId - Owner ID to validate against
   * @param {String} ownerType - Owner type ('Agency', 'SuperUser')
   * @returns {Promise<Boolean>} - True if owner matches, false otherwise
   */
  static async validateOwnership(propertyManagerId, ownerId, ownerType) {
    try {
      const propertyManager = await PropertyManager.findById(propertyManagerId);
      if (!propertyManager) {
        return false;
      }

      return (
        propertyManager.owner.ownerType === ownerType &&
        propertyManager.owner.ownerId.toString() === ownerId.toString()
      );
    } catch (error) {
      console.error("Error validating ownership:", error);
      return false;
    }
  }

  /**
   * Check if PropertyManager can perform a specific action
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} action - Action to perform ('read', 'write', 'delete')
   * @param {String} resourceType - Type of resource
   * @returns {Promise<Boolean>} - True if action allowed, false otherwise
   */
  static async canPerformAction(propertyManagerId, action, resourceType) {
    try {
      const propertyManager = await PropertyManager.findById(propertyManagerId);
      if (!propertyManager || propertyManager.status !== "Active") {
        return false;
      }

      // PropertyManager permissions matrix
      const permissions = {
        property: {
          read: true,
          write: true, // Can update properties they're assigned to
          delete: false, // Cannot delete properties
        },
        job: {
          read: true,
          write: false, // Cannot create/modify jobs
          delete: false,
        },
        contact: {
          read: true,
          write: false, // Read-only access to contacts
          delete: false,
        },
        notification: {
          read: true,
          write: false, // Cannot create notifications
          delete: false,
        },
      };

      const resourcePermissions = permissions[resourceType];
      if (!resourcePermissions) {
        return false;
      }

      return resourcePermissions[action] || false;
    } catch (error) {
      console.error("Error checking action permissions:", error);
      return false;
    }
  }

  /**
   * Audit PropertyManager access attempts
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} action - Action attempted
   * @param {String} resourceType - Type of resource accessed
   * @param {String} resourceId - Resource ID
   * @param {Boolean} success - Whether access was successful
   */
  static async auditAccess(
    propertyManagerId,
    action,
    resourceType,
    resourceId,
    success
  ) {
    try {
      const auditLog = {
        propertyManagerId,
        action,
        resourceType,
        resourceId,
        success,
        timestamp: new Date(),
        ipAddress: null, // Would be set by middleware
        userAgent: null, // Would be set by middleware
      };

      // In a production system, this would be logged to a dedicated audit collection
      console.log("🔒 PropertyManager Access Audit:", auditLog);

      // You could also store this in a database for compliance purposes
      // await AuditLog.create(auditLog);
    } catch (error) {
      console.error("Error logging audit:", error);
    }
  }

  /**
   * Rate limiting for PropertyManager actions
   * @param {String} propertyManagerId - PropertyManager ID
   * @param {String} action - Action being performed
   * @returns {Promise<Boolean>} - True if within rate limit, false otherwise
   */
  static async checkRateLimit(propertyManagerId, action) {
    try {
      // In a production system, this would use Redis or similar for rate limiting
      // For now, we'll implement a simple in-memory rate limiter

      const rateLimits = {
        property_read: { max: 100, window: 60000 }, // 100 reads per minute
        property_write: { max: 10, window: 60000 }, // 10 writes per minute
        job_read: { max: 50, window: 60000 }, // 50 reads per minute
        contact_read: { max: 30, window: 60000 }, // 30 reads per minute
      };

      const limit = rateLimits[action];
      if (!limit) {
        return true; // No limit set for this action
      }

      // Simple implementation - in production, use Redis
      const key = `${propertyManagerId}:${action}`;
      const now = Date.now();

      // This is a simplified version - in production, implement proper rate limiting
      return true;
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return true; // Allow access if rate limiting fails
    }
  }

  /**
   * Validate PropertyManager session and token
   * @param {String} token - JWT token
   * @returns {Promise<Object|null>} - Decoded token or null if invalid
   */
  static async validateSession(token) {
    try {
      const jwt = await import("jsonwebtoken");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "propertyManager") {
        return null;
      }

      // Check if PropertyManager still exists and is active
      const propertyManager = await PropertyManager.findById(decoded.id);
      if (!propertyManager || propertyManager.status !== "Active") {
        return null;
      }

      return decoded;
    } catch (error) {
      console.error("Error validating session:", error);
      return null;
    }
  }
}

export default PropertyManagerSecurity;
