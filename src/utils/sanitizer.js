import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Create a DOMPurify instance for Node.js environment
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

/**
 * Sanitize HTML input to prevent XSS attacks
 * @param {string} input - The input string to sanitize
 * @param {object} options - DOMPurify options
 * @returns {string} - Sanitized string safe for database storage and display
 */
export const sanitizeHTML = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }

  // Default configuration to strip all HTML tags and scripts
  const defaultOptions = {
    ALLOWED_TAGS: [], // Remove all HTML tags
    ALLOWED_ATTR: [], // Remove all attributes
    KEEP_CONTENT: true, // Keep text content, remove tags
    ...options
  };

  return DOMPurify.sanitize(input, defaultOptions);
};

/**
 * Sanitize all string values in an object recursively
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeHTML(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
};

/**
 * Sanitize specific fields that commonly contain user input
 * @param {object} data - Data object to sanitize
 * @param {string[]} fields - Array of field names to sanitize
 * @returns {object} - Data with sanitized fields
 */
export const sanitizeFields = (data, fields = []) => {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  
  // Common fields that should always be sanitized
  const defaultFields = [
    'name', 'firstName', 'lastName', 'fullName', 'companyName', 
    'contactPerson', 'description', 'notes', 'message', 'comment',
    'title', 'street', 'suburb', 'tenantName', 'landlordName'
  ];

  const fieldsToSanitize = [...new Set([...defaultFields, ...fields])];

  const sanitizeNestedField = (obj, fieldPath) => {
    const keys = fieldPath.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) return;
      current = current[keys[i]];
    }
    
    const finalKey = keys[keys.length - 1];
    if (current[finalKey] && typeof current[finalKey] === 'string') {
      current[finalKey] = sanitizeHTML(current[finalKey]);
    }
  };

  fieldsToSanitize.forEach(field => {
    if (field.includes('.')) {
      // Handle nested fields like 'address.street'
      sanitizeNestedField(sanitized, field);
    } else if (sanitized[field] && typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHTML(sanitized[field]);
    }
  });

  // Handle nested objects for common structures
  if (sanitized.currentTenant) {
    sanitized.currentTenant = sanitizeFields(sanitized.currentTenant, ['name']);
  }
  
  if (sanitized.currentLandlord) {
    sanitized.currentLandlord = sanitizeFields(sanitized.currentLandlord, ['name']);
  }
  
  if (sanitized.address) {
    sanitized.address = sanitizeFields(sanitized.address, ['street', 'suburb']);
  }

  return sanitized;
};

/**
 * Express middleware to sanitize request body
 * @param {object} options - Sanitization options
 * @returns {Function} - Express middleware function
 */
export const sanitizeRequestBody = (options = {}) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeFields(req.body, options.fields || []);
    }
    next();
  };
};

/**
 * Validate that input doesn't contain dangerous patterns after sanitization
 * @param {string} input - Input to validate
 * @returns {boolean} - True if safe, false if dangerous
 */
export const isSafeInput = (input) => {
  if (typeof input !== 'string') {
    return true;
  }

  // Check for common XSS patterns that might survive sanitization
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onload
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /expression\s*\(/gi, // CSS expression
    /url\s*\(/gi, // CSS url() that might contain javascript:
  ];

  return !dangerousPatterns.some(pattern => pattern.test(input));
};

export default {
  sanitizeHTML,
  sanitizeObject,
  sanitizeFields,
  sanitizeRequestBody,
  isSafeInput
};