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

