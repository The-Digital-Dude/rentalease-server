import InspectionTemplate from "../models/InspectionTemplate.js";
import defaultInspectionTemplates, { createMinimumSafetyStandardTemplate } from "../config/inspectionTemplates.js";

export const ensureDefaultTemplates = async () => {
  for (const template of defaultInspectionTemplates) {
    await InspectionTemplate.findOneAndUpdate(
      { jobType: template.jobType, version: template.version },
      template,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  // Clean up old template versions that are no longer needed
  await cleanupOldTemplateVersions();
};

export const cleanupOldTemplateVersions = async () => {
  // Deactivate legacy template versions that should no longer be selectable
  const jobTypes = ["Gas", "Electrical", "Smoke"];

  for (const jobType of jobTypes) {
    await InspectionTemplate.updateMany(
      { jobType, version: 1 },
      { isActive: false }
    );
  }

  // The smoke inspection now has a dedicated smoke-only template at version 3.
  // Ensure any older smoke templates remain in the database for historical
  // reports but are hidden from technicians completing new jobs.
  await InspectionTemplate.updateMany(
    { jobType: "Smoke", version: { $lt: 3 } },
    { isActive: false }
  );

  // Electrical inspections have moved to a dedicated electrical-only template
  // at version 3. Keep older templates for historical reports only.
  await InspectionTemplate.updateMany(
    { jobType: "Electrical", version: { $lt: 3 } },
    { isActive: false }
  );

  console.log(
    "Deactivated legacy inspection templates: version 1 for Gas/Electrical/Smoke, versions <3 for Smoke, versions <3 for Electrical"
  );
};

export const getTemplateByJobType = async (jobType, options = {}) => {
  if (!jobType) {
    throw new Error("jobType is required");
  }

  // For MinimumSafetyStandard, generate dynamic template based on room counts
  if (jobType === "MinimumSafetyStandard") {
    const { bedroomCount = 1, bathroomCount = 1 } = options;
    return createMinimumSafetyStandardTemplate(bedroomCount, bathroomCount);
  }

  const template = await InspectionTemplate.findOne({
    jobType,
    isActive: true,
  })
    .sort({ version: -1 })
    .lean();

  return template;
};

export const listTemplates = async (filters = {}) => {
  const query = { ...filters };

  if (filters.isActive === undefined) {
    query.isActive = true;
  }

  const templates = await InspectionTemplate.find(query)
    .sort({ jobType: 1, version: -1 })
    .lean();

  return templates;
};

// Function to prefill template with job, property, and technician data
export const prefillTemplateWithJobData = (template, job, property, technician) => {
  if (!template || !job) {
    return template;
  }

  const inspectorName = `${technician?.firstName || ''} ${technician?.lastName || ''}`.trim();
  const currentDate = new Date().toISOString().split('T')[0];

  const prefillMap = {
    // Inspector/Technician information
    'inspector-name': inspectorName,
    'inspector-details-name': inspectorName,
    'technician-name': inspectorName,
    'electrical-safety-check-completed-by': inspectorName,
    'certification-electrician-name': inspectorName,
    'license-number': technician?.licenseNumber || '',
    'inspector-details-license': technician?.licenseNumber || '',
    'registration-number': technician?.registrationNumber || '',
    'licence-registration-number': technician?.licenseNumber || '',
    'certification-licence-number': technician?.licenseNumber || '',

    // Property information
    'property-address': property?.address || '',
    'property-location': property?.address || '',
    'property-type': property?.propertyType || '',
    'property-id': property?._id?.toString() || '',
    'bedroom-count': property?.bedroomCount || '',
    'bathroom-count': property?.bathroomCount || '',

    // Job information
    'job-id': job?.job_id || '',
    'job-type': job?.jobType || '',
    'inspection-date': currentDate,
    'report-date': currentDate,
    'completion-date': currentDate,
    'signed-date': currentDate,

    // Contact information
    'contact-email': property?.contactEmail || technician?.email || '',
    'contact-phone': property?.contactPhone || technician?.phone || '',

    // Service dates - set next service to 12 months from now
    'next-service-due': new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

    // Company information
    'inspector-details-company': 'RentalEase Property Services Pty Ltd',
    'company-name': 'RentalEase Property Services Pty Ltd',
  };

  // Deep clone the template to avoid modifying the original
  const prefilledTemplate = JSON.parse(JSON.stringify(template));

  // Recursively prefill fields in all sections
  const prefillFields = (fields) => {
    return fields.map(field => {
      if (prefillMap[field.id]) {
        return {
          ...field,
          defaultValue: prefillMap[field.id]
        };
      }
      return field;
    });
  };

  if (prefilledTemplate.sections) {
    prefilledTemplate.sections = prefilledTemplate.sections.map(section => ({
      ...section,
      fields: prefillFields(section.fields || [])
    }));
  }

  return prefilledTemplate;
};

export const serializeTemplate = (template) => {
  if (!template) {
    return null;
  }

  const plainTemplate =
    typeof template.toObject === "function"
      ? template.toObject({ getters: true, virtuals: false })
      : { ...template };

  const {
    _id,
    __v,
    createdAt,
    updatedAt,
    sections = [],
    ...rest
  } = plainTemplate;

  const normalizedSections = sections.map((section = {}) => {
    const { fields = [], ...sectionRest } = section;

    const normalizedFields = fields.map((field = {}) => ({
      ...field,
      question: field.question || field.label || "",
    }));

    return {
      ...sectionRest,
      fields: normalizedFields,
    };
  });

  return {
    id: _id?.toString(),
    ...rest,
    sections: normalizedSections,
    updatedAt,
    createdAt,
  };
};
