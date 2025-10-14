import InspectionTemplate from "../models/InspectionTemplate.js";
import defaultInspectionTemplates from "../config/inspectionTemplates.js";

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
  // Deactivate Gas Safety Inspection Version 1 (keep only Version 2)
  await InspectionTemplate.findOneAndUpdate(
    { jobType: "Gas", version: 1 },
    { isActive: false },
    { new: true }
  );

  console.log("Cleaned up old Gas Safety Inspection template versions");
};

export const getTemplateByJobType = async (jobType) => {
  if (!jobType) {
    throw new Error("jobType is required");
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

  const { _id, __v, createdAt, updatedAt, ...rest } = template;
  return {
    id: _id?.toString(),
    ...rest,
    updatedAt,
    createdAt,
  };
};

