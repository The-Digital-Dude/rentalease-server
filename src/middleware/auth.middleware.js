const jwt = require('jsonwebtoken');
const SuperUser = require('../models/SuperUser');

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
        status: 'error',
        message: 'Authorization header is required'
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    // Check if token is for a super user (not property manager)
    if (decoded.type && decoded.type !== 'superUser') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Super user privileges required.'
      });
    }

    // Find the super user in database
    const superUser = await SuperUser.findById(decoded.id);
    
    if (!superUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Super user not found'
      });
    }

    // Add super user info to request object
    req.superUser = {
      id: superUser._id,
      name: superUser.name,
      email: superUser.email
    };

    next();
  } catch (error) {
    console.error('Super user authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
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
        status: 'error',
        message: 'Authorization header is required'
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    // Check if token is for a property manager
    if (decoded.type !== 'propertyManager') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. Property manager privileges required.'
      });
    }

    // Find the property manager in database
    const PropertyManager = require('../models/PropertyManager');
    const propertyManager = await PropertyManager.findById(decoded.id);
    
    if (!propertyManager) {
      return res.status(401).json({
        status: 'error',
        message: 'Property manager not found'
      });
    }

    // Check if property manager account is active
    if (!propertyManager.isActive()) {
      return res.status(401).json({
        status: 'error',
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`
      });
    }

    // Add property manager info to request object
    req.propertyManager = {
      id: propertyManager._id,
      companyName: propertyManager.companyName,
      contactPerson: propertyManager.contactPerson,
      email: propertyManager.email,
      status: propertyManager.status
    };

    next();
  } catch (error) {
    console.error('Property manager authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
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
        status: 'error',
        message: 'Authorization header is required'
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired token'
      });
    }

    // Add decoded token info to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Authentication failed'
    });
  }
};

module.exports = {
  authenticateSuperUser,
  authenticatePropertyManager,
  authenticate
}; 