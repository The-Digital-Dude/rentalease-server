/**
 * Compliance Validation Utility
 *
 * Validates next compliance dates based on Australian rental property regulations (2026)
 *
 * Australian Compliance Standards:
 * - Gas Safety: 2 years (Victoria Residential Tenancies Act 2018)
 * - Electrical Safety: 2 years (Victoria, South Australia)
 * - Smoke Alarms: 1 year (QLD, VIC, ACT, TAS require annual testing)
 * - Minimum Safety Standard: 1 year (typical requirement in Victoria)
 *
 * Sources:
 * - https://www.consumer.vic.gov.au/housing/renting/repairs-alterations-safety-and-pets/gas-electrical-and-water-safety-standards/rental-providers-gas-and-electrical-safety
 * - https://landmarkinspections.com.au/blog/what-is-a-rental-property-electrical-safety-inspection-and-why-is-it-necessary/
 * - https://www.pacificsmokealarms.com.au/by-law-in-qld-when-do-smoke-alarms-in-rental-properties-have-to-be-checked/
 */

/**
 * Validate next compliance date based on Australian regulations
 *
 * Ensures the date is:
 * 1. In the future (not past or today)
 * 2. Within reasonable timeframe based on job type (with 6-month buffer for flexibility)
 *
 * @param {Date|string} date - The next compliance date to validate
 * @param {string} jobType - The type of compliance job
 * @throws {Error} If validation fails
 * @returns {boolean} True if valid
 */
export const validateNextComplianceDate = (date, jobType) => {
  const nextDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check 1: Date must be in the future
  if (nextDate <= today) {
    throw new Error('Next compliance date must be in the future');
  }

  // Check 2: Date must be within reasonable timeframe based on Australian regulations
  const maxDate = new Date();

  if (jobType.includes('Gas') || jobType.includes('Electrical')) {
    // Gas and Electrical: 2 years standard (Victoria)
    // Allow up to 2 years + 6 months for flexibility
    maxDate.setFullYear(maxDate.getFullYear() + 2);
    maxDate.setMonth(maxDate.getMonth() + 6);

    if (nextDate > maxDate) {
      throw new Error(
        `Next compliance date cannot be more than 2.5 years in the future for ${jobType}. ` +
        `Australian regulations require 2-year inspection frequency for gas and electrical safety.`
      );
    }
  } else if (jobType.includes('Smoke') || jobType.includes('MinimumSafetyStandard')) {
    // Smoke and MSS: 1 year standard (most states)
    // Allow up to 1 year + 6 months for flexibility
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    maxDate.setMonth(maxDate.getMonth() + 6);

    if (nextDate > maxDate) {
      throw new Error(
        `Next compliance date cannot be more than 18 months in the future for ${jobType}. ` +
        `Australian regulations require annual inspection for smoke alarms and minimum safety standards.`
      );
    }
  } else {
    // Default: 2 years max for other job types
    maxDate.setFullYear(maxDate.getFullYear() + 2);

    if (nextDate > maxDate) {
      throw new Error(
        `Next compliance date cannot be more than 2 years in the future for ${jobType}.`
      );
    }
  }

  return true;
};

/**
 * Get suggested next compliance date based on job type
 *
 * Based on Australian compliance regulations (2026):
 * - Gas Safety: 2 years from completion
 * - Electrical Safety: 2 years from completion
 * - Smoke Alarms: 1 year from completion
 * - Minimum Safety Standard: 1 year from completion
 *
 * @param {string} jobType - The type of compliance job
 * @param {Date} completionDate - The inspection completion date (defaults to today)
 * @returns {Date} Suggested next compliance date
 */
export const getSuggestedComplianceDate = (jobType, completionDate = new Date()) => {
  const suggestedDate = new Date(completionDate);

  if (jobType.includes('Gas')) {
    // Gas safety: 2 years (Victoria Residential Tenancies Act)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 2);
  } else if (jobType.includes('Electrical')) {
    // Electrical safety: 2 years (Victoria, SA regulations)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 2);
  } else if (jobType.includes('Smoke')) {
    // Smoke alarms: 1 year (QLD, VIC, ACT, TAS requirement)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  } else if (jobType.includes('MinimumSafetyStandard')) {
    // MSS: 1 year (typical requirement)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  } else {
    // Default: 1 year for unknown compliance types
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  }

  return suggestedDate;
};

/**
 * Check if a job type is a compliance job
 *
 * @param {string} jobType - The job type to check
 * @returns {boolean} True if this is a compliance job type
 */
export const isComplianceJobType = (jobType) => {
  const complianceTypes = [
    'Gas', 'Gas Safety', 'Gas Safety Check', 'Gas Safety Inspection',
    'Electrical', 'Electrical Safety', 'Electrical Safety Check', 'Electrical Safety Inspection',
    'Smoke', 'Smoke Alarm', 'Smoke Alarm Inspection',
    'MinimumSafetyStandard', 'Minimum Safety Standard'
  ];

  return complianceTypes.some(type => jobType.includes(type));
};

export default {
  validateNextComplianceDate,
  getSuggestedComplianceDate,
  isComplianceJobType,
};
