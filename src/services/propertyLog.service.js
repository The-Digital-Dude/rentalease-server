import PropertyLog from "../models/PropertyLog.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";

class PropertyLogService {
  /**
   * Get user information from the request object
   */
  getUserInfo(req) {
    let userId, userType, userName, userEmail;

    if (req.superUser) {
      userId = req.superUser.id;
      userType = "SuperUser";
      userName = req.superUser.name || "Super User";
      userEmail = req.superUser.email;
    } else if (req.agency) {
      userId = req.agency.id;
      userType = "Agency";
      userName = req.agency.companyName || "Agency";
      userEmail = req.agency.email;
    } else if (req.propertyManager) {
      userId = req.propertyManager.id;
      userType = "PropertyManager";
      userName = req.propertyManager.fullName || "Property Manager";
      userEmail = req.propertyManager.email;
    } else if (req.user) {
      userId = req.user.id;
      userType = req.user.type || "TeamMember";
      userName = req.user.name || req.user.email;
      userEmail = req.user.email;
    } else {
      userId = null;
      userType = "System";
      userName = "System";
      userEmail = "system@rentalease.com.au";
    }

    return { userId, userType, userName, userEmail };
  }

  /**
   * Get metadata from the request
   */
  getMetadata(req) {
    return {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
      timestamp: new Date(),
    };
  }

  /**
   * Format value for display
   */
  formatValue(value) {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "object") {
      if (value.name) return value.name;
      if (value.fullAddress) return value.fullAddress;
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Get field label (human-readable name)
   */
  getFieldLabel(fieldPath) {
    const labels = {
      "address.street": "Street Address",
      "address.suburb": "Suburb",
      "address.state": "State",
      "address.postcode": "Postcode",
      "address.fullAddress": "Full Address",
      propertyType: "Property Type",
      agency: "Agency",
      assignedPropertyManager: "Property Manager",
      assignedTeamMember: "Team Member",
      region: "Region",
      "currentTenant.name": "Tenant Name",
      "currentTenant.email": "Tenant Email",
      "currentTenant.phone": "Tenant Phone",
      "currentLandlord.name": "Landlord Name",
      "currentLandlord.email": "Landlord Email",
      "currentLandlord.phone": "Landlord Phone",
      status: "Property Status",
      isActive: "Active Status",
    };

    return labels[fieldPath] || fieldPath;
  }

  /**
   * Get change category for a field
   */
  getChangeCategory(fieldPath) {
    if (fieldPath.startsWith("currentTenant")) return "tenant";
    if (fieldPath.startsWith("currentLandlord")) return "landlord";
    if (fieldPath.includes("agency")) return "agency";
    if (fieldPath.includes("PropertyManager")) return "manager";
    if (fieldPath.includes("compliance")) return "compliance";
    if (fieldPath === "status" || fieldPath === "isActive") return "status";
    return "basic";
  }

  /**
   * Create a snapshot of important property data
   */
  async createSnapshot(property) {
    const snapshot = {
      status: property.status,
    };

    // Add agency info
    if (property.agency) {
      const agency = await Agency.findById(property.agency).select(
        "companyName email"
      );
      if (agency) {
        snapshot.agency = {
          id: agency._id,
          name: agency.companyName,
          email: agency.email,
        };
      }
    }

    // Add tenant info
    if (property.currentTenant) {
      snapshot.tenant = {
        name: property.currentTenant.name,
        email: property.currentTenant.email,
        phone: property.currentTenant.phone,
      };
    }

    // Add landlord info
    if (property.currentLandlord) {
      snapshot.landlord = {
        name: property.currentLandlord.name,
        email: property.currentLandlord.email,
        phone: property.currentLandlord.phone,
      };
    }

    // Add property manager info
    if (property.assignedPropertyManager) {
      const pm = await PropertyManager.findById(
        property.assignedPropertyManager
      ).select("firstName lastName email");
      if (pm) {
        snapshot.propertyManager = {
          id: pm._id,
          name: `${pm.firstName} ${pm.lastName}`,
          email: pm.email,
        };
      }
    }

    return snapshot;
  }

  /**
   * Compare two objects and return differences
   */
  getObjectDifferences(oldObj, newObj, prefix = "") {
    const changes = [];

    const allKeys = new Set([
      ...Object.keys(oldObj || {}),
      ...Object.keys(newObj || {}),
    ]);

    for (const key of allKeys) {
      const fieldPath = prefix ? `${prefix}.${key}` : key;
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      // Skip internal fields
      if (
        key === "_id" ||
        key === "__v" ||
        key === "createdAt" ||
        key === "updatedAt"
      ) {
        continue;
      }

      // Handle nested objects
      if (
        typeof oldValue === "object" &&
        typeof newValue === "object" &&
        oldValue !== null &&
        newValue !== null &&
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue)
      ) {
        // Check if it's a MongoDB ObjectId
        if (oldValue._id || newValue._id) {
          if (String(oldValue._id || oldValue) !== String(newValue._id || newValue)) {
            changes.push({
              field: fieldPath,
              fieldLabel: this.getFieldLabel(fieldPath),
              oldValue: this.formatValue(oldValue),
              newValue: this.formatValue(newValue),
              changeCategory: this.getChangeCategory(fieldPath),
            });
          }
        } else {
          // Recursively check nested objects
          const nestedChanges = this.getObjectDifferences(
            oldValue,
            newValue,
            fieldPath
          );
          changes.push(...nestedChanges);
        }
      } else {
        // Direct comparison for primitive values
        const oldStr = String(oldValue);
        const newStr = String(newValue);

        if (oldStr !== newStr) {
          changes.push({
            field: fieldPath,
            fieldLabel: this.getFieldLabel(fieldPath),
            oldValue: this.formatValue(oldValue),
            newValue: this.formatValue(newValue),
            changeCategory: this.getChangeCategory(fieldPath),
          });
        }
      }
    }

    return changes;
  }

  /**
   * Determine the change type based on the changes
   */
  determineChangeType(changes) {
    if (!changes || changes.length === 0) return "updated";

    // Check for specific change types
    const hasAgencyChange = changes.some((c) => c.changeCategory === "agency");
    const hasTenantChange = changes.some((c) => c.changeCategory === "tenant");
    const hasLandlordChange = changes.some(
      (c) => c.changeCategory === "landlord"
    );
    const hasManagerChange = changes.some((c) => c.changeCategory === "manager");
    const hasStatusChange = changes.some((c) => c.changeCategory === "status");

    if (hasAgencyChange) return "agency_changed";
    if (hasTenantChange) return "tenant_changed";
    if (hasLandlordChange) return "landlord_changed";
    if (hasManagerChange) {
      // Check if manager was added or removed
      const managerChange = changes.find((c) => c.changeCategory === "manager");
      if (
        managerChange.newValue === "N/A" ||
        managerChange.newValue === "null"
      ) {
        return "property_manager_removed";
      }
      return "property_manager_assigned";
    }
    if (hasStatusChange) return "status_changed";

    return "updated";
  }

  /**
   * Generate a human-readable description
   */
  generateDescription(changeType, changes, userName) {
    const changeCount = changes.length;

    switch (changeType) {
      case "created":
        return `Property created by ${userName}`;
      case "agency_changed":
        const agencyChange = changes.find((c) => c.changeCategory === "agency");
        return `Agency changed from "${agencyChange.oldValue}" to "${agencyChange.newValue}" by ${userName}`;
      case "tenant_changed":
        return `Tenant information updated by ${userName}`;
      case "landlord_changed":
        return `Landlord information updated by ${userName}`;
      case "property_manager_assigned":
        const pmChange = changes.find((c) => c.changeCategory === "manager");
        return `Property manager assigned: ${pmChange.newValue} by ${userName}`;
      case "property_manager_removed":
        return `Property manager removed by ${userName}`;
      case "status_changed":
        const statusChange = changes.find((c) => c.changeCategory === "status");
        return `Status changed from "${statusChange.oldValue}" to "${statusChange.newValue}" by ${userName}`;
      default:
        return `${changeCount} field${
          changeCount !== 1 ? "s" : ""
        } updated by ${userName}`;
    }
  }

  /**
   * Log property creation
   */
  async logPropertyCreation(property, req) {
    try {
      const userInfo = this.getUserInfo(req);
      const metadata = this.getMetadata(req);
      const snapshot = await this.createSnapshot(property);

      const logData = {
        property: property._id,
        propertyAddress: property.address?.fullAddress || "Unknown Address",
        changeType: "created",
        changedBy: userInfo,
        description: `Property created by ${userInfo.userName}`,
        changes: [],
        previousSnapshot: {},
        metadata,
      };

      return await PropertyLog.createLog(logData);
    } catch (error) {
      console.error("Error logging property creation:", error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Log property update
   */
  async logPropertyUpdate(oldProperty, newProperty, req) {
    try {
      const userInfo = this.getUserInfo(req);
      const metadata = this.getMetadata(req);

      // Create snapshot of old property state
      const previousSnapshot = await this.createSnapshot(oldProperty);

      // Get differences
      const changes = this.getObjectDifferences(
        oldProperty.toObject(),
        newProperty.toObject()
      );

      // If no changes detected, don't create a log
      if (changes.length === 0) {
        return null;
      }

      // Determine change type
      const changeType = this.determineChangeType(changes);

      // Generate description
      const description = this.generateDescription(
        changeType,
        changes,
        userInfo.userName
      );

      const logData = {
        property: newProperty._id,
        propertyAddress:
          newProperty.address?.fullAddress || "Unknown Address",
        changeType,
        changedBy: userInfo,
        description,
        changes,
        previousSnapshot,
        metadata,
      };

      return await PropertyLog.createLog(logData);
    } catch (error) {
      console.error("Error logging property update:", error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Log property deletion
   */
  async logPropertyDeletion(property, req) {
    try {
      const userInfo = this.getUserInfo(req);
      const metadata = this.getMetadata(req);
      const previousSnapshot = await this.createSnapshot(property);

      const logData = {
        property: property._id,
        propertyAddress: property.address?.fullAddress || "Unknown Address",
        changeType: "deleted",
        changedBy: userInfo,
        description: `Property deleted by ${userInfo.userName}`,
        changes: [],
        previousSnapshot,
        metadata,
      };

      return await PropertyLog.createLog(logData);
    } catch (error) {
      console.error("Error logging property deletion:", error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }
}

// Create and export a singleton instance
const propertyLogService = new PropertyLogService();
export default propertyLogService;
