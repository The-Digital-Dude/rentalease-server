/**
 * Smoke Alarm Compliance Service
 * Implements Australian AS 3786 standards and RTA VIC 2021 requirements
 */

/**
 * Calculate the age of a smoke alarm from manufacture date
 * @param {string} manufactureDate - ISO date string
 * @returns {number} Age in years
 */
const calculateAlarmAge = (manufactureDate) => {
  if (!manufactureDate) return null;

  const mfd = new Date(manufactureDate);
  const now = new Date();
  const ageInYears = (now - mfd) / (1000 * 60 * 60 * 24 * 365.25);

  return Math.floor(ageInYears);
};

/**
 * Check if smoke alarm is expired (>10 years)
 * @param {string} manufactureDate - ISO date string
 * @returns {boolean} True if expired
 */
const isAlarmExpired = (manufactureDate) => {
  const age = calculateAlarmAge(manufactureDate);
  return age !== null && age >= 10;
};

/**
 * Validate individual smoke alarm compliance
 * @param {Object} alarmData - Individual alarm data from form
 * @returns {Object} Compliance result with status and reasons
 */
const validateAlarmCompliance = (alarmData) => {
  const issues = [];
  const recommendations = [];

  // Age and expiry checks
  const manufactureDate = alarmData['manufacture-date'] || alarmData.manufactureDate;
  if (!manufactureDate || alarmData['manufacture-date-not-readable']) {
    issues.push('manufacture-date-unknown');
    recommendations.push('Determine manufacture date or replace alarm');
  } else if (isAlarmExpired(manufactureDate)) {
    issues.push('expired');
    recommendations.push('Replace alarm immediately - exceeds 10-year limit');
  }

  // Functional testing checks
  if (alarmData['push-test-result'] === 'fail') {
    issues.push('failed-test');
    recommendations.push('Repair or replace non-functional alarm');
  }

  // Sound level checks (AS 3786 requires minimum 85dB at 3m)
  if (alarmData['sound-level-db'] && alarmData['sound-level-db'] < 85) {
    issues.push('insufficient-volume');
    recommendations.push('Check alarm function - volume below 85dB minimum');
  }

  // Power source checks
  if (alarmData['power-source'] === 'mains-240v') {
    if (alarmData['mains-led-on'] === 'no') {
      issues.push('no-power');
      recommendations.push('Check mains power supply to alarm');
    }
  } else if (alarmData['battery-present'] === 'no') {
    issues.push('no-battery');
    recommendations.push('Install battery in alarm');
  }

  // Positioning checks (AS 3786 clearance requirements)
  if (alarmData['clearances-ok'] === 'no') {
    issues.push('poor-positioning');

    const distances = [];
    if (alarmData['distance-to-wall'] && alarmData['distance-to-wall'] < 50) {
      distances.push('wall clearance < 50cm');
    }
    if (alarmData['distance-to-corner'] && alarmData['distance-to-corner'] < 60) {
      distances.push('corner clearance < 60cm');
    }
    if (alarmData['distance-to-fan'] && alarmData['distance-to-fan'] < 150) {
      distances.push('fan/vent clearance < 150cm');
    }

    if (distances.length > 0) {
      recommendations.push(`Reposition alarm: ${distances.join(', ')}`);
    } else {
      recommendations.push('Ensure proper clearances per AS 3786');
    }
  }

  // Physical condition checks
  const condition = alarmData['physical-condition'] || [];
  if (!condition.includes('securely-mounted')) {
    issues.push('mounting-issue');
    recommendations.push('Secure alarm mounting');
  }

  if (condition.includes('obstructed')) {
    issues.push('obstructed');
    recommendations.push('Remove obstructions from alarm');
  }

  if (condition.includes('plate-missing')) {
    issues.push('damaged');
    recommendations.push('Replace missing mounting plate');
  }

  // Interconnection checks (where applicable)
  if (alarmData.interconnection === 'hard-wired' || alarmData.interconnection === 'wireless-rf') {
    if (alarmData['interconnected-all-sound'] === 'no') {
      issues.push('interconnection-failure');
      recommendations.push('Repair interconnection between alarms');
    }
  }

  // Battery-specific checks
  if (alarmData['battery-replaced-today'] === 'yes') {
    if (!alarmData['battery-expiry']) {
      recommendations.push('Record battery expiry date');
    }
  } else if (alarmData['power-source'] === 'battery-9v') {
    // Recommend battery replacement if no recent replacement
    recommendations.push('Consider battery replacement if over 12 months old');
  }

  // Determine overall compliance status
  const isCompliant = issues.length === 0;

  return {
    isCompliant,
    status: isCompliant ? 'compliant' : 'non-compliant',
    issues,
    recommendations,
    autoCalculatedAge: calculateAlarmAge(manufactureDate),
    isExpired: isAlarmExpired(manufactureDate),
  };
};

/**
 * Validate property-level smoke alarm coverage (AS 3786 / RTA VIC requirements)
 * @param {Object} coverageData - Property coverage check data
 * @param {Array} alarmRecords - Array of alarm data
 * @returns {Object} Coverage compliance result
 */
const validatePropertyCoverage = (coverageData, alarmRecords = []) => {
  const issues = [];
  const recommendations = [];

  // Check required locations per AS 3786
  if (coverageData['hallway-bedrooms-present'] === 'no') {
    issues.push('missing-hallway-bedroom');
    recommendations.push('Install smoke alarm in hallway serving bedrooms');
  }

  if (coverageData['between-sleeping-areas'] === 'no') {
    issues.push('missing-between-sleeping');
    recommendations.push('Install smoke alarm between sleeping areas and remainder of storey');
  }

  if (coverageData['every-storey-covered'] === 'no') {
    issues.push('missing-storey-coverage');
    recommendations.push('Install smoke alarm on every storey');
  }

  if (coverageData['attached-garage'] === 'no' && coverageData['attached-garage'] !== 'na') {
    issues.push('missing-garage');
    recommendations.push('Install smoke alarm in attached garage with internal access');
  }

  // Check for missing locations
  if (coverageData['any-locations-missing'] === 'yes') {
    issues.push('missing-required-locations');
    if (coverageData['missing-locations']) {
      recommendations.push(`Install alarms in: ${coverageData['missing-locations']}`);
    } else {
      recommendations.push('Install alarms in all required locations');
    }
  }

  // Minimum alarm count check (at least 1 per storey)
  const storeyCount = (coverageData['storeys-covered'] || []).length;
  const alarmCount = alarmRecords.length;

  if (alarmCount < storeyCount) {
    issues.push('insufficient-alarm-count');
    recommendations.push(`Minimum ${storeyCount} alarms required for ${storeyCount} storey(s)`);
  }

  // Check for kitchen proximity (AS 3786 guidelines)
  const kitchenAlarms = alarmRecords.filter(alarm =>
    alarm.location === 'kitchen' || alarm['location-other']?.toLowerCase().includes('kitchen')
  );

  if (kitchenAlarms.length > 0) {
    recommendations.push('Verify kitchen alarm positioning - must not cause nuisance activation');
  }

  const isCompliant = issues.length === 0;

  return {
    isCompliant,
    issues,
    recommendations,
    requiredStoreyCoverage: storeyCount,
    actualAlarmCount: alarmCount,
  };
};

/**
 * Generate overall compliance assessment for the entire property
 * @param {Object} inspectionData - Complete inspection form data
 * @returns {Object} Overall compliance result
 */
const assessOverallCompliance = (inspectionData) => {
  const alarmRecords = inspectionData['alarm-records'] || [];
  const coverageData = inspectionData;

  // Validate each individual alarm
  const alarmResults = alarmRecords.map(alarm => ({
    alarmId: alarm['alarm-id'],
    location: alarm.location,
    ...validateAlarmCompliance(alarm),
  }));

  // Validate property coverage
  const coverageResult = validatePropertyCoverage(coverageData, alarmRecords);

  // Count compliance statistics
  const totalAlarms = alarmResults.length;
  const compliantAlarms = alarmResults.filter(r => r.isCompliant).length;
  const nonCompliantAlarms = totalAlarms - compliantAlarms;

  // Collect all issues and recommendations
  const allIssues = [
    ...coverageResult.issues,
    ...alarmResults.flatMap(r => r.issues),
  ];

  const allRecommendations = [
    ...coverageResult.recommendations,
    ...alarmResults.flatMap(r => r.recommendations),
  ];

  // Determine overall compliance
  const isOverallCompliant = allIssues.length === 0;

  // Generate compliance summary
  const summary = {
    totalAlarms,
    compliantAlarms,
    nonCompliantAlarms,
    coverageCompliant: coverageResult.isCompliant,
    overallCompliant: isOverallCompliant,
  };

  // Generate next service date (12 months from inspection)
  const nextServiceDate = new Date();
  nextServiceDate.setFullYear(nextServiceDate.getFullYear() + 1);

  // Generate work orders for non-compliant items
  const workOrders = [];

  // Add coverage-related work orders
  coverageResult.recommendations.forEach(rec => {
    workOrders.push({
      issue: rec,
      location: 'Property-wide',
      priority: 'urgent',
      category: 'coverage',
    });
  });

  // Add alarm-specific work orders
  alarmResults.forEach(result => {
    if (!result.isCompliant) {
      result.recommendations.forEach(rec => {
        workOrders.push({
          issue: rec,
          location: result.location,
          priority: result.issues.includes('expired') || result.issues.includes('failed-test') ? 'urgent' : 'standard',
          category: 'alarm-specific',
          alarmId: result.alarmId,
        });
      });
    }
  });

  return {
    summary,
    isOverallCompliant,
    alarmResults,
    coverageResult,
    allIssues,
    allRecommendations,
    workOrders,
    nextServiceDate: nextServiceDate.toISOString().split('T')[0],
    assessmentDate: new Date().toISOString(),
    standardsApplied: ['AS 3786:2014', 'RTA VIC 2021'],
  };
};

/**
 * Generate compliance report text matching the demo format
 * @param {Object} complianceResult - Result from assessOverallCompliance
 * @returns {string} Formatted compliance text
 */
const generateComplianceReportText = (complianceResult) => {
  const { summary, isOverallCompliant, workOrders } = complianceResult;

  if (isOverallCompliant) {
    return `All ${summary.totalAlarms} smoke alarms are compliant with AS 3786 and RTA VIC 2021 requirements. Property meets all mandatory smoke alarm coverage requirements.`;
  }

  const expiredAlarms = workOrders.filter(wo => wo.issue.includes('expired') || wo.issue.includes('Replace alarm'));
  const otherIssues = workOrders.filter(wo => !wo.issue.includes('expired') && !wo.issue.includes('Replace alarm'));

  let text = '';

  if (expiredAlarms.length > 0) {
    if (expiredAlarms.length === 1) {
      text += `One (1) expired smoke alarm was identified. `;
    } else {
      text += `${expiredAlarms.length} expired smoke alarms were identified. `;
    }
    text += `Replacement ${expiredAlarms.length === 1 ? 'is' : 'are'} required immediately to restore compliance.`;
  }

  if (otherIssues.length > 0) {
    if (text) text += '\n\n';
    text += `Additional compliance issues identified: ${otherIssues.map(wo => wo.issue.toLowerCase()).join(', ')}.`;
  }

  if (summary.nonCompliantAlarms > 0 && summary.compliantAlarms > 0) {
    text += `\n\n${summary.compliantAlarms} of ${summary.totalAlarms} alarms are currently compliant.`;
  }

  return text || 'Non-compliance issues identified. See recommendations for required actions.';
};

export {
  calculateAlarmAge,
  isAlarmExpired,
  validateAlarmCompliance,
  validatePropertyCoverage,
  assessOverallCompliance,
  generateComplianceReportText,
};