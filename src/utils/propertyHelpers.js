/**
 * Property Helper Functions for Australian Compliance
 * Automatically sets default inspection dates based on property type and Australian regulations
 */

/**
 * Calculate default next inspection dates for a new property
 * @param {Object} propertyData - The property data object
 * @returns {Object} - Property data with default inspection dates set
 */
export const setDefaultInspectionDates = (propertyData) => {
  const currentDate = new Date();
  
  // Initialize compliance schedule if not provided
  if (!propertyData.complianceSchedule) {
    propertyData.complianceSchedule = {};
  }
  
  // Gas Compliance (Required for House, Apartment, Townhouse)
  if (['House', 'Apartment', 'Townhouse'].includes(propertyData.propertyType)) {
    if (!propertyData.complianceSchedule.gasCompliance) {
      propertyData.complianceSchedule.gasCompliance = {};
    }
    
    // Set next gas inspection to 30 days from now if not provided
    if (!propertyData.complianceSchedule.gasCompliance.nextInspection) {
      const gasInspectionDate = new Date(currentDate);
      gasInspectionDate.setDate(currentDate.getDate() + 30);
      propertyData.complianceSchedule.gasCompliance.nextInspection = gasInspectionDate;
      propertyData.complianceSchedule.gasCompliance.required = true;
      propertyData.complianceSchedule.gasCompliance.status = 'Due Soon';
    }
  }
  
  // Electrical Safety (All residential properties)
  if (!propertyData.complianceSchedule.electricalSafety) {
    propertyData.complianceSchedule.electricalSafety = {};
  }
  
  if (!propertyData.complianceSchedule.electricalSafety.nextInspection) {
    const electricalInspectionDate = new Date(currentDate);
    electricalInspectionDate.setDate(currentDate.getDate() + 60); // 60 days from now
    propertyData.complianceSchedule.electricalSafety.nextInspection = electricalInspectionDate;
    propertyData.complianceSchedule.electricalSafety.required = true;
    propertyData.complianceSchedule.electricalSafety.status = 'Due Soon';
  }
  
  // Smoke Alarms (Mandatory for all residential properties)
  if (!propertyData.complianceSchedule.smokeAlarms) {
    propertyData.complianceSchedule.smokeAlarms = {};
  }
  
  if (!propertyData.complianceSchedule.smokeAlarms.nextInspection) {
    const smokeAlarmDate = new Date(currentDate);
    smokeAlarmDate.setDate(currentDate.getDate() + 14); // 14 days from now - high priority
    propertyData.complianceSchedule.smokeAlarms.nextInspection = smokeAlarmDate;
    propertyData.complianceSchedule.smokeAlarms.required = true;
    propertyData.complianceSchedule.smokeAlarms.status = 'Due Soon';
  }
  
  // Minimum Safety Standard (set a default reminder if not provided)
  if (!propertyData.complianceSchedule.minimumSafetyStandard) {
    propertyData.complianceSchedule.minimumSafetyStandard = {};
  }

  if (!propertyData.complianceSchedule.minimumSafetyStandard.nextInspection) {
    const minimumSafetyDate = new Date(currentDate);
    minimumSafetyDate.setDate(currentDate.getDate() + 120); // Default to ~4 months ahead
    propertyData.complianceSchedule.minimumSafetyStandard.nextInspection = minimumSafetyDate;
    propertyData.complianceSchedule.minimumSafetyStandard.required = true;
    propertyData.complianceSchedule.minimumSafetyStandard.status = 'Due Soon';
  }
  
  return propertyData;
};

const COMPLIANCE_KEYS = [
  'gasCompliance',
  'electricalSafety',
  'smokeAlarms',
  'minimumSafetyStandard',
];

const cloneEntry = (entry = {}) => ({ ...entry });

const ensureEntryDefaults = (entry = {}) => {
  const nextInspection = entry.nextInspection || null;

  const normalizedEntry = {
    required:
      entry.required !== undefined
        ? entry.required
        : nextInspection !== null,
    status: entry.status ?? 'Not Required',
    nextInspection,
  };

  if (nextInspection) {
    const date = new Date(nextInspection);
    if (!Number.isNaN(date.getTime())) {
      normalizedEntry.status =
        normalizedEntry.status && normalizedEntry.status !== 'Not Required'
          ? normalizedEntry.status
          : determineComplianceStatus(date);
      normalizedEntry.required = true;
    }
  }

  return normalizedEntry;
};

export const normalizeComplianceSchedule = (complianceSchedule = {}) => {
  const normalized = { ...complianceSchedule };

  if (!normalized.minimumSafetyStandard) {
    if (normalized.poolSafety) {
      normalized.minimumSafetyStandard = cloneEntry(normalized.poolSafety);
    } else {
      normalized.minimumSafetyStandard = {
        required: false,
        status: 'Not Required',
        nextInspection: null,
      };
    }
  }

  COMPLIANCE_KEYS.forEach((key) => {
    normalized[key] = ensureEntryDefaults(cloneEntry(normalized[key]));
  });

  delete normalized.poolSafety;

  return normalized;
};

/**
 * Calculate next inspection date based on frequency and last inspection
 * @param {Date} lastInspection - Date of last inspection
 * @param {Number} frequencyMonths - Frequency in months
 * @returns {Date} - Next inspection date
 */
export const calculateNextInspectionDate = (lastInspection, frequencyMonths) => {
  if (!lastInspection) {
    return new Date(); // If no last inspection, due now
  }
  
  const nextDate = new Date(lastInspection);
  nextDate.setMonth(nextDate.getMonth() + frequencyMonths);
  return nextDate;
};

/**
 * Determine compliance status based on next inspection date
 * @param {Date} nextInspectionDate - The next inspection date
 * @returns {String} - Compliance status
 */
export const determineComplianceStatus = (nextInspectionDate) => {
  if (!nextInspectionDate) {
    return 'Due Soon';
  }
  
  const currentDate = new Date();
  const timeDiff = nextInspectionDate.getTime() - currentDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  if (daysDiff < 0) {
    return 'Overdue';
  } else if (daysDiff <= 30) {
    return 'Due Soon';
  } else {
    return 'Compliant';
  }
};

/**
 * Get all upcoming inspections for a property within specified days
 * @param {Object} property - Property object with compliance schedule
 * @param {Number} daysAhead - Number of days to look ahead (default: 30)
 * @returns {Array} - Array of upcoming inspections
 */
export const getUpcomingInspections = (property, daysAhead = 30) => {
  const currentDate = new Date();
  const futureDate = new Date(currentDate.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
  const upcomingInspections = [];
  
  const { complianceSchedule } = property;
  
  // Check gas compliance
  if (complianceSchedule?.gasCompliance?.nextInspection) {
    const nextDate = new Date(complianceSchedule.gasCompliance.nextInspection);
    if (nextDate >= currentDate && nextDate <= futureDate) {
      upcomingInspections.push({
        type: 'Gas Compliance',
        date: nextDate,
        priority: 'High',
        status: determineComplianceStatus(nextDate)
      });
    }
  }
  
  // Check electrical safety
  if (complianceSchedule?.electricalSafety?.nextInspection) {
    const nextDate = new Date(complianceSchedule.electricalSafety.nextInspection);
    if (nextDate >= currentDate && nextDate <= futureDate) {
      upcomingInspections.push({
        type: 'Electrical Safety',
        date: nextDate,
        priority: 'High',
        status: determineComplianceStatus(nextDate)
      });
    }
  }
  
  // Check smoke alarms
  if (complianceSchedule?.smokeAlarms?.nextInspection) {
    const nextDate = new Date(complianceSchedule.smokeAlarms.nextInspection);
    if (nextDate >= currentDate && nextDate <= futureDate) {
      upcomingInspections.push({
        type: 'Smoke Alarms',
        date: nextDate,
        priority: 'High',
        status: determineComplianceStatus(nextDate)
      });
    }
  }

  // Check minimum safety standard
  if (complianceSchedule?.minimumSafetyStandard?.nextInspection) {
    const nextDate = new Date(
      complianceSchedule.minimumSafetyStandard.nextInspection
    );
    if (nextDate >= currentDate && nextDate <= futureDate) {
      upcomingInspections.push({
        type: 'Minimum Safety Standard',
        date: nextDate,
        priority: 'High',
        status: determineComplianceStatus(nextDate)
      });
    }
  }
  
  
  // Sort by date
  return upcomingInspections.sort((a, b) => new Date(a.date) - new Date(b.date));
};

/**
 * Set state-specific compliance requirements
 * @param {Object} propertyData - Property data
 * @param {String} state - Australian state code
 * @returns {Object} - Property data with state-specific compliance settings
 */
export const setStateSpecificCompliance = (propertyData, state) => {
  // For the simplified model, we don't need complex state-specific requirements
  // We'll just ensure all required compliance items are properly set
  
  if (!propertyData.complianceSchedule) {
    propertyData.complianceSchedule = {};
  }
  
  // Ensure gas compliance is required for residential properties
  if (['House', 'Apartment', 'Townhouse'].includes(propertyData.propertyType)) {
    if (!propertyData.complianceSchedule.gasCompliance) {
      propertyData.complianceSchedule.gasCompliance = {};
    }
    propertyData.complianceSchedule.gasCompliance.required = true;
  }
  
  // Ensure electrical safety is required for all properties
  if (!propertyData.complianceSchedule.electricalSafety) {
    propertyData.complianceSchedule.electricalSafety = {};
  }
  propertyData.complianceSchedule.electricalSafety.required = true;
  
  // Ensure smoke alarms are required for all properties
  if (!propertyData.complianceSchedule.smokeAlarms) {
    propertyData.complianceSchedule.smokeAlarms = {};
  }
  propertyData.complianceSchedule.smokeAlarms.required = true;

  // Minimum safety standard inspections are required for residential properties by default
  if (!propertyData.complianceSchedule.minimumSafetyStandard) {
    propertyData.complianceSchedule.minimumSafetyStandard = {};
  }
  propertyData.complianceSchedule.minimumSafetyStandard.required = true;
  
  
  return propertyData;
};
