/**
 * Authentication Helper Functions
 * Shared utilities for handling user authentication and authorization
 */

/**
 * Get owner info based on user type from request
 * @param {Object} req - Express request object
 * @returns {Object|null} - Owner info object or null
 */
export const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: "SuperUser",
      ownerId: req.superUser.id,
    };
  } else if (req.teamMember) {
    return {
      ownerType: "TeamMember",
      ownerId: req.teamMember.id,
    };
  } else if (req.agency) {
    return {
      ownerType: "Agency",
      ownerId: req.agency.id,
    };
  } else if (req.technician) {
    return {
      ownerType: "Technician",
      ownerId: req.technician.id,
    };
  } else if (req.propertyManager) {
    return {
      ownerType: "PropertyManager",
      ownerId: req.propertyManager.id,
    };
  }
  return null;
};

/**
 * Get creator info based on user type from request
 * @param {Object} req - Express request object
 * @returns {Object|null} - Creator info object or null
 */
export const getCreatorInfo = (req) => {
  if (req.superUser) {
    return {
      userType: "SuperUser",
      userId: req.superUser.id,
    };
  } else if (req.teamMember) {
    return {
      userType: "TeamMember",
      userId: req.teamMember.id,
    };
  } else if (req.agency) {
    return {
      userType: "Agency",
      userId: req.agency.id,
    };
  } else if (req.technician) {
    return {
      userType: "Technician",
      userId: req.technician.id,
    };
  } else if (req.propertyManager) {
    return {
      userType: "PropertyManager",
      userId: req.propertyManager.id,
    };
  }
  return null;
};

/**
 * Get user information for notifications
 * @param {Object} req - Express request object
 * @returns {Object|null} - User info object or null
 */
export const getUserInfo = (req) => {
  if (req.superUser) {
    return {
      name: req.superUser.name,
      type: "SuperUser",
    };
  } else if (req.teamMember) {
    return {
      name: req.teamMember.name,
      type: "TeamMember",
    };
  } else if (req.agency) {
    return {
      name: req.agency.contactPerson,
      type: "Agency",
    };
  } else if (req.technician) {
    return {
      name: req.technician.fullName,
      type: "Technician",
    };
  } else if (req.propertyManager) {
    return {
      name: req.propertyManager.fullName,
      type: "PropertyManager",
    };
  }
  return null;
};

/**
 * Validate owner access for a resource
 * @param {Object} resource - Resource object with owner property
 * @param {Object} req - Express request object
 * @returns {Boolean} - Whether user has access
 */
export const validateOwnerAccess = (resource, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;

  // Super users and team members can access any resource
  if (ownerInfo.ownerType === "SuperUser" || ownerInfo.ownerType === "TeamMember") {
    return true;
  }

  // For agencies, check if they own the resource
  return (
    resource.owner.ownerType === ownerInfo.ownerType &&
    resource.owner.ownerId.toString() === ownerInfo.ownerId.toString()
  );
};

/**
 * Check if user can fully edit a resource (only super users)
 * @param {Object} req - Express request object
 * @returns {Boolean} - Whether user can fully edit
 */
export const canFullyEditResource = (req) => {
  return !!(req.superUser || req.teamMember);
};
