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
