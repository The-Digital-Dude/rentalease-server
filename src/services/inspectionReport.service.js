import mongoose from "mongoose";
import sharp from "sharp";
import fs from "fs/promises";
import Job from "../models/Job.js";
import Property from "../models/Property.js";
import Technician from "../models/Technician.js";
import InspectionReport from "../models/InspectionReport.js";
import Invoice from "../models/Invoice.js";
import { getTemplateByJobType } from "./inspectionTemplate.service.js";
import fileUploadService from "./fileUpload.service.js";
import buildInspectionReportPdf from "./inspectionReportPdf.service.js";
import notificationService from "./notification.service.js";
import complianceService from "./compliance.service.js";
import {
  buildDefaultCompletedJobInvoiceEmailPayload,
  sendCompletedJobInvoiceDocuments,
} from "./completedJobInvoice.service.js";
import { AUTOMATED_COMPLETED_JOB_DOCUMENTS_ENABLED } from "../config/features.js";
import { validateNextComplianceDate } from "../utils/complianceValidation.js";
import { resolveNextComplianceDate } from "../utils/inspectionComplianceDate.js";
import { resolveEventTimestamp } from "../utils/timezone.js";

const normalizeFormData = (formData) => {
  if (!formData) {
    return {};
  }

  if (typeof formData === "string") {
    try {
      return JSON.parse(formData);
    } catch (error) {
      throw new Error("Invalid formData JSON payload");
    }
  }

  return formData;
};

const parseMediaMeta = (meta) => {
  if (!meta) {
    return {};
  }
  if (typeof meta === "string") {
    try {
      return JSON.parse(meta);
    } catch (error) {
      throw new Error("Invalid media metadata JSON payload");
    }
  }
  return meta;
};

const buildPhotoFieldContextLookup = (template) => {
  const lookup = new Map();

  (template?.sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (field?.type === "table") {
        (field.columns || []).forEach((column) => {
          if (column?.type !== "photo" && column?.type !== "photo-multi") {
            return;
          }

          const entries = lookup.get(column.id) || [];
          entries.push({
            sectionId: section.id,
            fieldId: column.id,
            repeatable: true,
            label: column.label,
          });
          lookup.set(column.id, entries);
        });
      }

      if (field?.type === "photo" || field?.type === "photo-multi") {
        const entries = lookup.get(field.id) || [];
        entries.push({
          sectionId: section.id,
          fieldId: field.id,
          repeatable: Boolean(section.repeatable),
          label: field.label,
        });
        lookup.set(field.id, entries);
      }
    });
  });

  return lookup;
};

const derivePhotoFieldContext = (lookup, rawFieldId) => {
  if (!rawFieldId) {
    return null;
  }

  if (lookup.has(rawFieldId)) {
    return lookup.get(rawFieldId)[0];
  }

  const fieldIdMatchers = [
    /^(.+)-(\d+)$/,
    /^(.+)\.(\d+)$/,
    /^(.+)\[(\d+)\]$/,
    /^(.+?)-(\d+)-(.+)$/,
    /^(.+?)\.(\d+)\.(.+)$/,
  ];

  for (const matcher of fieldIdMatchers) {
    const match = rawFieldId.match(matcher);
    if (!match) {
      continue;
    }

    let candidateFieldIds = [];
    let itemIndex;

    if (match.length === 3) {
      candidateFieldIds = [match[1]];
      itemIndex = Number.parseInt(match[2], 10);
    } else if (match.length === 4) {
      candidateFieldIds = [match[3], `${match[1]}-${match[3]}`];
      itemIndex = Number.parseInt(match[2], 10);
    }

    for (const candidateFieldId of candidateFieldIds) {
      const matches = lookup.get(candidateFieldId);
      if (!matches?.length) {
        continue;
      }

      const preferredMatch =
        matches.find((entry) => entry.repeatable) || matches[0];

      return {
        ...preferredMatch,
        itemIndex: Number.isInteger(itemIndex) ? itemIndex : undefined,
      };
    }
  }

  return null;
};

const normalizeMediaMetadata = (mediaMeta = {}, template) => {
  const lookup = buildPhotoFieldContextLookup(template);
  const normalized = {};

  Object.entries(mediaMeta || {}).forEach(([rawFieldId, entry = {}]) => {
    const derivedContext = derivePhotoFieldContext(lookup, rawFieldId);
    const metadata =
      entry?.metadata && typeof entry.metadata === "object"
        ? { ...entry.metadata }
        : {};

    normalized[rawFieldId] = {
      ...entry,
      label: entry?.label || derivedContext?.label || rawFieldId,
      metadata: {
        ...metadata,
        sectionId: metadata.sectionId || derivedContext?.sectionId,
        itemIndex: metadata.itemIndex ?? derivedContext?.itemIndex,
      },
    };
  });

  return normalized;
};

const isRequiredPhotoField = (field = {}) =>
  field.required && (field.type === "photo" || field.type === "photo-multi");

const hasUploadedFieldMedia = (mediaUploads = [], fieldId, itemIndex) =>
  mediaUploads.some((item) => {
    const metadata = item?.metadata || {};
    const metadataItemIndex =
      metadata.itemIndex === undefined || metadata.itemIndex === null
        ? undefined
        : Number.parseInt(metadata.itemIndex, 10);
    const itemIndexMatches =
      itemIndex === undefined || metadataItemIndex === itemIndex;

    if (metadata.fieldId === fieldId) {
      return itemIndexMatches;
    }

    if (item.fieldId === fieldId) {
      return itemIndexMatches;
    }

    if (itemIndex !== undefined && item.fieldId === `${fieldId}-${itemIndex}`) {
      return true;
    }

    return (
      item.fieldId?.includes(fieldId) &&
      itemIndexMatches
    );
  });

const validateRequiredPhotoUploads = (template, formData = {}, mediaUploads = []) => {
  const missing = [];

  (template?.sections || []).forEach((section) => {
    const requiredPhotoFields = (section.fields || []).filter(isRequiredPhotoField);
    if (!requiredPhotoFields.length) {
      return;
    }

    if (section.repeatable) {
      const sectionItems = Array.isArray(formData[section.id])
        ? formData[section.id]
        : [];

      sectionItems.forEach((_, itemIndex) => {
        requiredPhotoFields.forEach((field) => {
          if (!hasUploadedFieldMedia(mediaUploads, field.id, itemIndex)) {
            missing.push(
              `${section.itemLabel || section.title || "Item"} ${itemIndex + 1}: ${field.label || field.id}`
            );
          }
        });
      });
      return;
    }

    (section.fields || []).forEach((field) => {
      if (field.type !== "table") {
        return;
      }

      const requiredColumnPhotoFields = (field.columns || []).filter(isRequiredPhotoField);
      if (!requiredColumnPhotoFields.length) {
        return;
      }

      const rows = Array.isArray(formData[section.id]?.[field.id])
        ? formData[section.id][field.id]
        : [];

      rows.forEach((_, itemIndex) => {
        requiredColumnPhotoFields.forEach((column) => {
          if (!hasUploadedFieldMedia(mediaUploads, column.id, itemIndex)) {
            missing.push(
              `${field.label || section.title || "Item"} ${itemIndex + 1}: ${column.label || column.id}`
            );
          }
        });
      });
    });

    requiredPhotoFields.forEach((field) => {
      if (!hasUploadedFieldMedia(mediaUploads, field.id)) {
        missing.push(`${section.title || "Inspection"}: ${field.label || field.id}`);
      }
    });
  });

  if (missing.length) {
    throw new Error(
      `Required inspection photos missing: ${missing.slice(0, 8).join(", ")}${
        missing.length > 8 ? "..." : ""
      }`
    );
  }
};

const LEGACY_GAS_SECTION_IDS = new Set([
  "gas-installation",
  "appliance-1",
  "appliance-2",
  "appliance-3",
  "compliance-declaration",
]);

const GAS_V3_SECTION_IDS = new Set([
  "property-details",
  "technician-details",
  "lp-gas-checklist",
  "general-gas-checks",
  "gas-appliances",
  "rectification-works-required",
  "final-declaration",
]);

const GAS_V3_APPLIANCE_SAFETY_FIELDS = [
  "installation-gastight",
  "accessible-for-servicing",
  "isolation-valve-provided",
  "electrically-safe",
  "evidence-of-certification",
  "adequately-restrained",
  "adequate-room-ventilation",
  "clearances-compliant",
  "cowl-chimney-flue-good",
  "flue-correctly-installed",
  "no-scorching-overheating",
];

const GAS_V3_REQUIRED_APPLIANCE_FIELDS = [
  "appliance-location",
  "appliance-type",
  "appliance-name",
  "room-sealed-appliance",
  "appliance-photo",
  ...GAS_V3_APPLIANCE_SAFETY_FIELDS,
  "heat-exchanger-satisfactory",
  "appliance-cleaned",
  "gas-supply-burner-pressure-correct",
  "burner-flame-normal",
  "operating-correctly",
];

const isGasTemplateV3 = (template, formData = {}) => {
  if (template?.jobType !== "Gas") {
    return false;
  }

  if ((template?.version ?? 1) >= 3) {
    return true;
  }

  return !Object.keys(formData || {}).some((sectionId) =>
    LEGACY_GAS_SECTION_IDS.has(sectionId)
  );
};

const ensureRequiredValue = (value, message) => {
  const isEmptyArray = Array.isArray(value) && value.length === 0;
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    isEmptyArray
  ) {
    throw new Error(message);
  }
};

const isConditionMet = (value, condition = {}) => {
  if (!condition || typeof condition !== "object") {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(condition, "equals")) {
    return value === condition.equals;
  }

  if (Object.prototype.hasOwnProperty.call(condition, "notEquals")) {
    return value !== condition.notEquals;
  }

  return false;
};

const validateConditionallyRequiredFields = (template, formData = {}) => {
  (template?.sections || []).forEach((section) => {
    const sectionResponses = formData[section.id];

    if (section.repeatable && Array.isArray(sectionResponses)) {
      sectionResponses.forEach((itemResponses = {}, itemIndex) => {
        (section.fields || []).forEach((field) => {
          const requiredWhen = field?.metadata?.requiredWhen;
          if (!requiredWhen) {
            return;
          }

          if (!isConditionMet(itemResponses?.[requiredWhen.fieldId], requiredWhen)) {
            return;
          }

          ensureRequiredValue(
            itemResponses?.[field.id],
            `${section.itemLabel || section.title || "Item"} ${itemIndex + 1} field "${field.id}" is required`
          );
        });
      });
      return;
    }

    if (
      !sectionResponses ||
      typeof sectionResponses !== "object" ||
      Array.isArray(sectionResponses)
    ) {
      return;
    }

    (section.fields || []).forEach((field) => {
      const requiredWhen = field?.metadata?.requiredWhen;
      if (!requiredWhen) {
        return;
      }

      if (!isConditionMet(sectionResponses?.[requiredWhen.fieldId], requiredWhen)) {
        return;
      }

      ensureRequiredValue(
        sectionResponses?.[field.id],
        `Field "${field.id}" is required when "${requiredWhen.fieldId}" is "${requiredWhen.equals}"`
      );
    });
  });
};

const calculateGasComplianceOutcome = (formData = {}) => {
  const generalChecks = formData["general-gas-checks"] || {};
  const rectification = formData["rectification-works-required"] || {};
  const appliances = Array.isArray(formData["gas-appliances"])
    ? formData["gas-appliances"]
    : [];

  if (generalChecks["gas-pressure-test-result"] === "fail") {
    return "unsafe";
  }

  if (rectification["risk-level"] === "immediate-unsafe") {
    return "unsafe";
  }

  const hasUnsafeAppliance = appliances.some(
    (appliance) => appliance?.["co-spillage-test"] === "fail"
  );
  if (hasUnsafeAppliance) {
    return "unsafe";
  }

  const hasNonCompliantAppliance = appliances.some((appliance) =>
    GAS_V3_APPLIANCE_SAFETY_FIELDS.some((fieldId) => appliance?.[fieldId] === "no")
  );

  if (hasNonCompliantAppliance) {
    return "non-compliant";
  }

  return "compliant";
};

const normalizeMssStandardAnswer = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase();

const isCompliantMssStandardAnswer = (answer) =>
  ["yes", "na", "n/a", "not_applicable", "not-applicable"].includes(answer);

const isMssComplianceQuestion = (field) => {
  if (!["yes-no", "yes-no-na"].includes(field?.type)) {
    return false;
  }

  const label = String(field.label || "").trim().toLowerCase();
  return (
    !label.includes("are minimum standards met for this section") &&
    !label.startsWith("minimum standards:") &&
    !label.startsWith("room overall:")
  );
};

const getMinimumSafetyStandardFieldIds = (template, formData = {}) => {
  const fieldIds = new Set();

  (template?.sections || []).forEach((section) => {
    (section.fields || []).forEach((field) => {
      if (!field?.id) {
        return;
      }

      if (isMssComplianceQuestion(field)) {
        fieldIds.add(`${section.id}.${field.id}`);
      }
    });
  });

  if (fieldIds.size > 0) {
    return fieldIds;
  }

  Object.entries(formData || {}).forEach(([sectionId, sectionData]) => {
    if (!sectionData || typeof sectionData !== "object" || Array.isArray(sectionData)) {
      return;
    }

    Object.keys(sectionData).forEach((fieldId) => {
      if (fieldId.endsWith("-standard")) {
        fieldIds.add(`${sectionId}.${fieldId}`);
      }
    });
  });

  return fieldIds;
};

const calculateMinimumSafetyStandardOutcome = (formData = {}, template = null) => {
  const standardFieldIds = getMinimumSafetyStandardFieldIds(template, formData);

  if (standardFieldIds.size === 0) {
    return "compliant";
  }

  for (const fieldKey of standardFieldIds) {
    const [sectionId, fieldId] = fieldKey.split(".");
    const answer = normalizeMssStandardAnswer(formData?.[sectionId]?.[fieldId]);

    if (!isCompliantMssStandardAnswer(answer)) {
      return "non-compliant";
    }
  }

  return "compliant";
};

const validateGasReportV3 = (formData = {}, job) => {
  const propertyDetails = formData["property-details"] || {};
  const technicianDetails = formData["technician-details"] || {};
  const lpGasChecklist = formData["lp-gas-checklist"] || {};
  const generalChecks = formData["general-gas-checks"] || {};
  const rectification = formData["rectification-works-required"] || {};
  const finalDeclaration = formData["final-declaration"] || {};
  const appliances = Array.isArray(formData["gas-appliances"])
    ? formData["gas-appliances"]
    : [];

  ["site-address", "suburb", "state", "postcode", "property-type"].forEach((fieldId) =>
    ensureRequiredValue(propertyDetails[fieldId], `Property field "${fieldId}" is required`)
  );
  ["technician-full-name", "licence-registration-number", "business-name", "inspection-date", "inspection-time"].forEach((fieldId) =>
    ensureRequiredValue(technicianDetails[fieldId], `Technician field "${fieldId}" is required`)
  );
  ["lp-gas-cylinders", "gas-leakage-test"].forEach((fieldId) =>
    ensureRequiredValue(lpGasChecklist[fieldId], `LP gas checklist field "${fieldId}" is required`)
  );
  ensureRequiredValue(
    generalChecks["gas-pressure-test-result"],
    'General gas check field "gas-pressure-test-result" is required'
  );

  if (generalChecks["gas-pressure-test-result"] === "pass") {
    ensureRequiredValue(
      generalChecks["pressure-loss-5-min"],
      'Pressure loss is required when gas pressure test result is "pass"'
    );
  }

  if (!appliances.length) {
    throw new Error("At least one gas appliance must be included in the report");
  }

  appliances.forEach((appliance, index) => {
    GAS_V3_REQUIRED_APPLIANCE_FIELDS.forEach((fieldId) =>
      ensureRequiredValue(
        appliance?.[fieldId],
        `Gas appliance ${index + 1} field "${fieldId}" is required`
      )
    );

    if (appliance?.["appliance-location"] === "other") {
      ensureRequiredValue(
        appliance?.["appliance-location-other"],
        `Gas appliance ${index + 1} other location is required`
      );
    }

    if (appliance?.["appliance-type"] === "other") {
      ensureRequiredValue(
        appliance?.["appliance-type-other"],
        `Gas appliance ${index + 1} other appliance type is required`
      );
    }

    if (appliance?.["room-sealed-appliance"] === "yes") {
      ensureRequiredValue(
        appliance?.["negative-pressure-present"],
        `Gas appliance ${index + 1} negative pressure result is required`
      );
      ensureRequiredValue(
        appliance?.["co-spillage-test"],
        `Gas appliance ${index + 1} CO spillage test result is required`
      );
    }
  });

  ensureRequiredValue(rectification["issues-identified"], 'Rectification field "issues-identified" is required');
  if (rectification["issues-identified"] === "yes") {
    ensureRequiredValue(rectification["issue-description"], "Issue description is required when issues are identified");
    ensureRequiredValue(rectification["risk-level"], "Risk level is required when issues are identified");
  }

  ["technician-signature", "sign-off-date", "sign-off-time"].forEach((fieldId) =>
    ensureRequiredValue(finalDeclaration[fieldId], `Final declaration field "${fieldId}" is required`)
  );

  return calculateGasComplianceOutcome(formData);
};

const validateGasReportMediaUploads = (formData = {}, mediaUploads = []) => {
  const hasFieldMedia = (fieldId, itemIndex) =>
    mediaUploads.some((item) => {
      if (item.fieldId === fieldId) {
        return itemIndex === undefined || item.metadata?.itemIndex === itemIndex;
      }

      if (item.fieldId === `${fieldId}-${itemIndex}`) {
        return true;
      }

      return (
        item.fieldId?.includes(fieldId) &&
        (itemIndex === undefined || item.metadata?.itemIndex === itemIndex)
      );
    });

  if (!hasFieldMedia("gas-meter-photo")) {
    throw new Error('General gas checks require an uploaded "gas-meter-photo" image');
  }

  const appliances = Array.isArray(formData["gas-appliances"])
    ? formData["gas-appliances"]
    : [];

  appliances.forEach((_, index) => {
    if (!hasFieldMedia("appliance-photo", index)) {
      throw new Error(`Gas appliance ${index + 1} requires an uploaded appliance photo`);
    }
  });
};

const buildSectionsSummary = (template, formData = {}) => {
  if (!template?.sections?.length) {
    return [];
  }

  const summary = [];
  template.sections.forEach((section) => {
    const sectionResponses = formData[section.id];

    if (section.repeatable && Array.isArray(sectionResponses)) {
      sectionResponses.forEach((itemResponses = {}, index) => {
        section.fields.forEach((field) => {
          if (itemResponses[field.id] !== undefined) {
            summary.push({
              sectionId: `${section.id}[${index}]`,
              fieldId: field.id,
              label: `${section.itemLabel || section.title || "Item"} ${index + 1}: ${field.question || field.label}`,
              value: itemResponses[field.id],
              flag:
                field.type === "boolean" && itemResponses[field.id] === false,
            });
          }
        });
      });
      return;
    }

    const normalizedSectionResponses = sectionResponses || {};
    section.fields.forEach((field) => {
      if (normalizedSectionResponses[field.id] !== undefined) {
        summary.push({
          sectionId: section.id,
          fieldId: field.id,
          label: field.question || field.label,
          value: normalizedSectionResponses[field.id],
          flag:
            field.type === "boolean" && normalizedSectionResponses[field.id] === false,
        });
      }
    });
  });
  return summary;
};

const getUploadedFileInput = (file) => file?.buffer || file?.path;

const readUploadedFileBuffer = async (file) => {
  if (file?.buffer) {
    return file.buffer;
  }

  if (file?.path) {
    return fs.readFile(file.path);
  }

  throw new Error("Uploaded file data is unavailable");
};

const cleanupInspectionTempFile = async (file) => {
  if (!file?.path) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("[Inspection Submit] Failed to delete temporary upload file", {
        path: file.path,
        originalname: file.originalname,
        error: error.message,
      });
    }
  }
};

const cleanupInspectionTempFiles = async (files = []) => {
  const fileList = Array.isArray(files)
    ? files
    : files?.path || files?.buffer
      ? [files]
      : Object.values(files || {}).flat();
  await Promise.all(fileList.map((file) => cleanupInspectionTempFile(file)));
};

const getInspectionImageValidation = async (file) => {
  if (!file?.mimetype?.startsWith("image/")) {
    return { shouldUpload: true };
  }

  if (
    fileUploadService.isHeicUpload({
      contentType: file.mimetype,
      fileName: file.originalname,
    })
  ) {
    return { shouldUpload: true };
  }

  try {
    const metadata = await sharp(getUploadedFileInput(file)).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width <= 1 || height <= 1) {
      return {
        shouldUpload: false,
        reason: "placeholder-image",
        width,
        height,
      };
    }

    return {
      shouldUpload: true,
      width,
      height,
    };
  } catch (error) {
    console.warn("[Inspection Submit] Failed to inspect uploaded image metadata", {
      fieldname: file?.fieldname,
      originalname: file?.originalname,
      mimetype: file?.mimetype,
      size: file?.size,
      error: error.message,
    });

    return { shouldUpload: true };
  }
};

const uploadInspectionMedia = async (files = {}, mediaMeta = {}, context = {}) => {
  const uploads = [];

  const fileGroups = Array.isArray(files)
    ? files.reduce((acc, file) => {
        acc[file.fieldname] = acc[file.fieldname] || [];
        acc[file.fieldname].push(file);
        return acc;
      }, {})
    : files;

  const entries = Object.entries(fileGroups);

  for (const [fieldKey, fileArray] of entries) {
    const mediaMatch = fieldKey.match(/^media__(.+)$/);
    if (!mediaMatch) {
      await cleanupInspectionTempFiles(fileArray);
      continue;
    }
    const fieldId = mediaMatch[1];
    const derivedMeta =
      mediaMeta[fieldId] ||
      normalizeMediaMetadata({ [fieldId]: {} }, context.template)[fieldId] ||
      {};
    const label = derivedMeta.label;

    for (const file of fileArray) {
      try {
        const imageValidation = await getInspectionImageValidation(file);
        if (!imageValidation.shouldUpload) {
          console.warn("[Inspection Submit] Skipping placeholder inspection image", {
            fieldId,
            label: label || file.originalname,
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            width: imageValidation.width,
            height: imageValidation.height,
            reason: imageValidation.reason,
          });
          continue;
        }

        const fileName = `job-${context.jobId}-${fieldId}-${Date.now()}-${file.originalname}`;
        const uploadBuffer = await readUploadedFileBuffer(file);
        const uploadResult = await fileUploadService.uploadToStorage(uploadBuffer, {
          folder: "inspection-reports",
          fileName,
          contentType: file.mimetype,
          public_id: `inspection-reports/job-${context.jobId}-${fieldId}-${Date.now()}`,
          tags: [
            `job-${context.jobId}`,
            `property-${context.propertyId}`,
            "inspection-report",
            `field-${fieldId}`,
          ],
        });

        uploads.push({
          fieldId,
          label: label || file.originalname,
          url: uploadResult.secure_url || uploadResult.url,
          cloudinaryId: uploadResult.public_id,
          gcsPath: uploadResult.gcsPath,
          mimeType: uploadResult.contentType || file.mimetype,
          size: file.size,
          metadata: derivedMeta.metadata,
        });
      } finally {
        await cleanupInspectionTempFile(file);
      }
    }
  }

  return uploads;
};

export const submitInspectionReport = async ({
  jobId,
  technicianId,
  jobType,
  templateVersion,
  formData,
  notes,
  files,
  mediaMeta,
  nextComplianceDate,
  eventLocalTimestamp,
  eventTimezone,
  timestampSource,
}) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new Error("Invalid job id");
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new Error("Job not found");
  }

  if (!job.assignedTechnician) {
    throw new Error("Job does not have an assigned technician");
  }

  if (job.assignedTechnician.toString() !== technicianId.toString()) {
    throw new Error("Technician is not assigned to this job");
  }

  const property = await Property.findById(job.property);
  if (!property) {
    throw new Error("Property not found for job");
  }

  const technician = await Technician.findById(technicianId);
  if (!technician) {
    throw new Error("Technician not found");
  }

  const resolvedEventTimestamp = resolveEventTimestamp({
    eventLocalTimestamp,
    eventTimezone,
    timestampSource,
  });

  const template = await getTemplateByJobType(jobType || job.jobType);
  if (!template) {
    throw new Error("No inspection template configured for this job type");
  }

  if (templateVersion && template.version !== Number(templateVersion)) {
    console.warn(
      "Template version mismatch. Using latest active template.",
      {
        expected: templateVersion,
        actual: template.version,
        jobType: template.jobType,
      }
    );
  }

  const normalizedFormData = normalizeFormData(formData);
  let gasComplianceOutcome = null;
  let minimumSafetyStandardOutcome = null;

  if (isGasTemplateV3(template, normalizedFormData)) {
    gasComplianceOutcome = validateGasReportV3(normalizedFormData, job);
    normalizedFormData["final-declaration"] = {
      ...(normalizedFormData["final-declaration"] || {}),
      "final-compliance-outcome": gasComplianceOutcome,
    };
  }

  if (template.jobType === "MinimumSafetyStandard") {
    minimumSafetyStandardOutcome = calculateMinimumSafetyStandardOutcome(
      normalizedFormData,
      template
    );
    normalizedFormData["final-declaration"] = {
      ...(normalizedFormData["final-declaration"] || {}),
      "final-compliance-outcome": minimumSafetyStandardOutcome,
    };
  }

  validateConditionallyRequiredFields(template, normalizedFormData);

  let resolvedNextComplianceDate = resolveNextComplianceDate(
    template,
    normalizedFormData,
    nextComplianceDate
  );

  // Validate nextComplianceDate for compliance job types
  const complianceJobTypes = [
    'Gas', 'Gas Safety', 'Gas Safety Check', 'Gas Safety Inspection',
    'Electrical', 'Electrical Safety', 'Electrical Safety Check', 'Electrical Safety Inspection',
    'Smoke', 'Smoke Alarm', 'Smoke Alarm Inspection',
    'MinimumSafetyStandard', 'Minimum Safety Standard'
  ];

  if (complianceJobTypes.includes(template.jobType)) {
    if (!resolvedNextComplianceDate) {
      const suggestedComplianceDate =
        complianceService.getSuggestedComplianceDate?.(template.jobType);
      if (suggestedComplianceDate) {
        resolvedNextComplianceDate = suggestedComplianceDate
          .toISOString()
          .split("T")[0];
      }
    }

    if (!resolvedNextComplianceDate) {
      throw new Error(`Next compliance date is required for ${template.jobType} inspections`);
    }

    // Validate against Australian regulations
    validateNextComplianceDate(resolvedNextComplianceDate, template.jobType);
    console.log("[Inspection Submit] Next compliance date validated", {
      jobType: template.jobType,
      nextComplianceDate: resolvedNextComplianceDate,
    });
  }

  console.log("[Inspection Submit] Form data normalized and media metadata parsing started");
  const mediaMetadata = normalizeMediaMetadata(parseMediaMeta(mediaMeta), template);
  
  console.log("[Inspection Submit] Uploading inspection media files", {
    filesCount: Array.isArray(files) ? files.length : Object.keys(files || {}).length,
  });
  const mediaUploads = await uploadInspectionMedia(files, mediaMetadata, {
    jobId: job._id,
    propertyId: property._id,
    template,
  });
  console.log("[Inspection Submit] Media uploads completed", {
    uploadsCount: mediaUploads.length,
  });

  validateRequiredPhotoUploads(template, normalizedFormData, mediaUploads);

  if (gasComplianceOutcome) {
    validateGasReportMediaUploads(normalizedFormData, mediaUploads);
  }

  console.log("[Inspection Submit] Building sections summary");
  const sectionsSummary = buildSectionsSummary(template, normalizedFormData);

  console.log("[Inspection Submit] Creating inspection report document");
  const report = await InspectionReport.create({
    job: job._id,
    property: property._id,
    technician: technicianId,
    jobType: template.jobType,
    templateId: template._id,
    templateVersion: template.version,
    formData: normalizedFormData,
    sectionsSummary,
    media: mediaUploads,
    notes,
    nextComplianceDate: resolvedNextComplianceDate ? new Date(resolvedNextComplianceDate) : null,
    submittedAt: resolvedEventTimestamp.eventAt,
    submittedTimezone: resolvedEventTimestamp.eventTimezone,
    submittedLocalInput: resolvedEventTimestamp.eventLocalInput,
    submittedTimestampSource: resolvedEventTimestamp.timestampSource,
    submittedServerReceivedAt: resolvedEventTimestamp.serverReceivedAt,
    submittedBy: {
      userType: "Technician",
      userId: technicianId,
    },
  });
  console.log("[Inspection Submit] Report document created", {
    reportId: report._id,
  });

  console.log("[Inspection Submit] Starting PDF generation", {
    templateType: template.jobType,
    templateVersion: template.version,
  });
  const pdfStartTime = Date.now();
  
  // Add timeout wrapper for PDF generation (5 minutes max)
  const PDF_GENERATION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
  const pdfBuffer = await Promise.race([
    buildInspectionReportPdf({
      report,
      template,
      job,
      property,
      technician,
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("PDF generation timeout after 5 minutes")),
        PDF_GENERATION_TIMEOUT
      )
    ),
  ]);
  
  const pdfDuration = Date.now() - pdfStartTime;
  console.log("[Inspection Submit] PDF generation completed", {
    duration: `${pdfDuration}ms`,
    bufferSize: pdfBuffer.length,
  });

  console.log("[Inspection Submit] Uploading PDF to GCS");
  const pdfUpload = await fileUploadService.uploadToGCS(pdfBuffer, {
    folder: "inspection-reports",
    fileName: `job-${job._id}-report-${report._id}.pdf`,
    contentType: "application/pdf",
  });
  console.log("[Inspection Submit] PDF uploaded to GCS", {
    url: pdfUpload.url,
  });

  report.pdf = {
    url: pdfUpload.url,
    cloudinaryId: pdfUpload.cloudinaryId || undefined,
    gcsPath: pdfUpload.gcsPath,
    generatedAt: new Date(),
  };
  await report.save();
  console.log("[Inspection Submit] Report saved with PDF reference");

  job.reportFile = pdfUpload.url;
  job.latestInspectionReport = report._id;
  job.inspectionReports = job.inspectionReports || [];
  job.inspectionReports.push(report._id);
  await job.save();
  console.log("[Inspection Submit] Job updated with report reference");

  if (
    AUTOMATED_COMPLETED_JOB_DOCUMENTS_ENABLED &&
    job.status === "Completed" &&
    job.invoice
  ) {
    try {
      const invoice = await Invoice.findById(job.invoice);
      if (invoice && invoice.status === "Draft") {
        const autoSendPayload = buildDefaultCompletedJobInvoiceEmailPayload({
          jobType: job.jobType,
          propertyAddress: property.address?.fullAddress || "Property",
          invoiceNumber: invoice.invoiceNumber,
        });

        await sendCompletedJobInvoiceDocuments({
          invoice,
          subject: autoSendPayload.subject,
          bodyHtml: autoSendPayload.bodyHtml,
          bodyText: autoSendPayload.bodyText,
          sentBy: {
            id: technician._id?.toString?.() || technicianId?.toString?.(),
            name:
              technician.fullName ||
              `${technician.firstName || ""} ${technician.lastName || ""}`.trim() ||
              technician.email ||
              "Technician",
            type: "Technician",
          },
        });

        console.log("[Inspection Submit] Auto-sent completed job invoice after report submission", {
          jobId: job._id,
          reportId: report._id,
          invoiceId: invoice._id,
        });
      }
    } catch (autoSendError) {
      console.error("[Inspection Submit] Failed to auto-send completed job invoice after report submission", {
        jobId: job._id,
        reportId: report._id,
        invoiceId: job.invoice,
        error: autoSendError.message,
      });
    }
  }

  // Update property compliance schedule if nextComplianceDate is provided
  if (resolvedNextComplianceDate) {
    try {
      console.log("[Inspection Submit] Updating property compliance schedule");
      const complianceUpdate = await complianceService.updatePropertyCompliance(
        property._id,
        template.jobType,
        resolvedNextComplianceDate
      );

      if (complianceUpdate) {
        console.log("[Inspection Submit] ✓ Property compliance updated successfully", {
          complianceType: complianceUpdate.complianceType,
          nextInspection: complianceUpdate.nextInspection,
          status: complianceUpdate.status,
        });
      }
    } catch (complianceError) {
      // Log error but don't fail the inspection submission
      // Graceful degradation: inspection succeeded even if compliance update failed
      console.error("[Inspection Submit] ✗ Failed to update property compliance", {
        propertyId: property._id,
        jobType: template.jobType,
        error: complianceError.message,
      });
    }
  }

  // Notify stakeholders about the new inspection report
  notificationService
    .sendInspectionReportNotification(report, job, property, technician)
    .catch((error) =>
      console.error("Failed to send inspection report notifications", error)
    );

  return {
    report,
    pdf: report.pdf,
    job,
  };
};

export default submitInspectionReport;

export { cleanupInspectionTempFiles };
