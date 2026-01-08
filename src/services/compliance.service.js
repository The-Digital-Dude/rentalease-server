import Property from '../models/Property.js';

/**
 * Map job type to compliance field in Property.complianceSchedule
 *
 * Based on RentalEase CRM job types for Australian property compliance
 */
const getComplianceTypeFromJobType = (jobType) => {
  const mapping = {
    // Gas compliance jobs
    'Gas': 'gasCompliance',
    'Gas Safety': 'gasCompliance',
    'Gas Safety Check': 'gasCompliance',
    'Gas Safety Inspection': 'gasCompliance',

    // Electrical safety jobs
    'Electrical': 'electricalSafety',
    'Electrical Safety': 'electricalSafety',
    'Electrical Safety Check': 'electricalSafety',
    'Electrical Safety Inspection': 'electricalSafety',

    // Smoke alarm jobs
    'Smoke': 'smokeAlarms',
    'Smoke Alarm': 'smokeAlarms',
    'Smoke Alarm Inspection': 'smokeAlarms',

    // Minimum Safety Standard jobs
    'MinimumSafetyStandard': 'minimumSafetyStandard',
    'Minimum Safety Standard': 'minimumSafetyStandard',
  };

  return mapping[jobType] || null;
};

/**
 * Calculate compliance status based on next inspection date
 *
 * Status Rules:
 * - Compliant: 30+ days until next inspection
 * - Due Soon: 0-30 days until next inspection
 * - Overdue: Next inspection date has passed
 *
 * @param {Date|string} nextInspectionDate - The next scheduled inspection date
 * @returns {string} Status: "Compliant", "Due Soon", or "Overdue"
 */
const calculateComplianceStatus = (nextInspectionDate) => {
  if (!nextInspectionDate) return 'Due Soon';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const inspectionDate = new Date(nextInspectionDate);
  inspectionDate.setHours(0, 0, 0, 0);

  const daysDifference = Math.ceil((inspectionDate - now) / (1000 * 60 * 60 * 24));

  if (daysDifference < 0) {
    return 'Overdue';
  } else if (daysDifference <= 30) {
    return 'Due Soon';
  } else {
    return 'Compliant';
  }
};

/**
 * Update property compliance schedule after inspection completion
 *
 * This function is called when a technician completes an inspection and provides
 * the next compliance date. It updates the appropriate compliance field in the
 * Property model based on the job type.
 *
 * @param {string|ObjectId} propertyId - The property ID to update
 * @param {string} jobType - The type of job (e.g., "Gas Safety Inspection")
 * @param {Date|string} nextComplianceDate - The next compliance inspection date
 * @returns {Promise<object|null>} Update result or null if not a compliance job
 * @throws {Error} If property not found or update fails
 */
export const updatePropertyCompliance = async (propertyId, jobType, nextComplianceDate) => {
  try {
    console.log(`[Compliance Service] Updating compliance for property ${propertyId}, jobType: ${jobType}`);

    // Get compliance type from job type
    const complianceType = getComplianceTypeFromJobType(jobType);
    if (!complianceType) {
      console.warn(`[Compliance Service] Job type "${jobType}" is not a compliance type - skipping update`);
      return null;
    }

    // Find property
    const property = await Property.findById(propertyId);
    if (!property) {
      throw new Error(`Property ${propertyId} not found`);
    }

    // Calculate status based on next inspection date
    const status = calculateComplianceStatus(nextComplianceDate);

    // Build update data for the specific compliance type
    const updateData = {
      [`complianceSchedule.${complianceType}.nextInspection`]: new Date(nextComplianceDate),
      [`complianceSchedule.${complianceType}.status`]: status,
      [`complianceSchedule.${complianceType}.lastUpdated`]: new Date(),
    };

    console.log(`[Compliance Service] Updating ${complianceType}:`, {
      status,
      nextInspection: nextComplianceDate,
      propertyAddress: property.address,
    });

    // Update property with new compliance information
    const updatedProperty = await Property.findByIdAndUpdate(
      propertyId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    console.log(`[Compliance Service] ✓ Successfully updated property compliance`);

    return {
      propertyId: updatedProperty._id,
      complianceType,
      nextInspection: nextComplianceDate,
      status,
      updated: true,
    };
  } catch (error) {
    console.error(`[Compliance Service] ✗ Error updating property compliance:`, error.message);
    throw error;
  }
};

/**
 * Get suggested next compliance date based on job type
 *
 * Based on Australian compliance regulations (2026):
 * - Gas Safety: 2 years (Victoria Residential Tenancies Act)
 * - Electrical Safety: 2 years (Victoria, South Australia)
 * - Smoke Alarms: 1 year (QLD, VIC, ACT, TAS requirement)
 * - Minimum Safety Standard: 1 year (typical requirement)
 *
 * @param {string} jobType - The type of compliance job
 * @param {Date} completionDate - The inspection completion date (defaults to today)
 * @returns {Date} Suggested next compliance date
 */
export const getSuggestedComplianceDate = (jobType, completionDate = new Date()) => {
  const suggestedDate = new Date(completionDate);

  if (jobType.includes('Gas')) {
    // Gas safety: 2 years (Victoria regulations)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 2);
  } else if (jobType.includes('Electrical')) {
    // Electrical safety: 2 years (Victoria regulations)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 2);
  } else if (jobType.includes('Smoke')) {
    // Smoke alarms: 1 year (most Australian states require annual testing)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  } else if (jobType.includes('MinimumSafetyStandard')) {
    // Minimum Safety Standard: 1 year (typical requirement)
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  } else {
    // Default: 1 year for unknown compliance types
    suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
  }

  return suggestedDate;
};

export default {
  updatePropertyCompliance,
  getComplianceTypeFromJobType,
  calculateComplianceStatus,
  getSuggestedComplianceDate,
};
