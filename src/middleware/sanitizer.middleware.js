import { sanitizeFields, isSafeInput } from '../utils/sanitizer.js';

/**
 * Middleware to sanitize all incoming request data to prevent XSS attacks
 * This middleware should be applied to all routes that handle user input
 */
export const sanitizeInput = (options = {}) => {
  return (req, res, next) => {
    try {
      // Sanitize request body
      if (req.body && typeof req.body === 'object') {
        req.body = sanitizeFields(req.body, options.fields || []);
        
        // Additional validation for critical fields
        const criticalStringFields = extractStringFields(req.body);
        for (const [path, value] of criticalStringFields) {
          if (!isSafeInput(value)) {
            console.error(`🚨 SECURITY ALERT: Dangerous input detected in ${path}: ${value.substring(0, 100)}...`);
            return res.status(400).json({
              status: 'error',
              message: 'Invalid input detected. Please remove any HTML tags or scripts.',
              field: path
            });
          }
        }
      }

      // Sanitize query parameters (create new object since query is read-only)
      if (req.query && typeof req.query === 'object') {
        const sanitizedQuery = sanitizeFields(req.query, options.fields || []);
        Object.keys(req.query).forEach(key => {
          if (sanitizedQuery[key] !== undefined) {
            req.query[key] = sanitizedQuery[key];
          }
        });
      }

      // Sanitize URL parameters (create new object since params might be read-only)
      if (req.params && typeof req.params === 'object') {
        const sanitizedParams = sanitizeFields(req.params, options.fields || []);
        Object.keys(req.params).forEach(key => {
          if (sanitizedParams[key] !== undefined) {
            req.params[key] = sanitizedParams[key];
          }
        });
      }

      console.log(`🛡️ Input sanitized for ${req.method} ${req.path}`);
      next();
    } catch (error) {
      console.error('❌ Sanitization middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Input validation failed'
      });
    }
  };
};

/**
 * Extract all string fields from an object with their paths for validation
 * @param {object} obj - Object to extract string fields from
 * @param {string} prefix - Current path prefix
 * @returns {Array} - Array of [path, value] pairs for string fields
 */
function extractStringFields(obj, prefix = '') {
  const stringFields = [];
  
  if (obj === null || obj === undefined) {
    return stringFields;
  }

  if (typeof obj === 'string') {
    return [[prefix, obj]];
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const currentPath = prefix ? `${prefix}[${index}]` : `[${index}]`;
      stringFields.push(...extractStringFields(item, currentPath));
    });
    return stringFields;
  }

  if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      stringFields.push(...extractStringFields(value, currentPath));
    });
  }

  return stringFields;
}

/**
 * Enhanced sanitization middleware for property-related routes
 * Includes specific validation for property management fields
 */
export const sanitizePropertyInput = () => {
  const propertyFields = [
    'address.street',
    'address.suburb', 
    'currentTenant.name',
    'currentLandlord.name',
    'notes',
    'description'
  ];

  return sanitizeInput({ fields: propertyFields });
};

/**
 * Enhanced sanitization middleware for user-related routes
 * Includes specific validation for user management fields
 */
export const sanitizeUserInput = () => {
  const userFields = [
    'name',
    'firstName', 
    'lastName',
    'companyName',
    'contactPerson',
    'description',
    'notes',
    'message'
  ];

  return sanitizeInput({ fields: userFields });
};

/**
 * Enhanced sanitization middleware for job-related routes
 * Includes specific validation for job management fields
 */
export const sanitizeJobInput = () => {
  const jobFields = [
    'description',
    'notes',
    'jobType',
    'title',
    'specialInstructions',
    'completionNotes'
  ];

  return sanitizeInput({ fields: jobFields });
};

export default {
  sanitizeInput,
  sanitizePropertyInput,
  sanitizeUserInput,
  sanitizeJobInput
};