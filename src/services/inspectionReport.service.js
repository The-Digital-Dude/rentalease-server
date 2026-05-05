import mongoose from "mongoose";
import sharp from "sharp";
import Job from "../models/Job.js";
import Property from "../models/Property.js";
import Technician from "../models/Technician.js";
import InspectionReport from "../models/InspectionReport.js";
import { getTemplateByJobType } from "./inspectionTemplate.service.js";
import fileUploadService from "./fileUpload.service.js";
import buildInspectionReportPdf from "./inspectionReportPdf.service.js";
import notificationService from "./notification.service.js";
import complianceService from "./compliance.service.js";
import { validateNextComplianceDate } from "../utils/complianceValidation.js";
import { resolveNextComplianceDate } from "../utils/inspectionComplianceDate.js";

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
      const photoFields =
        field?.type === "table"
          ? field.columns?.filter(
              (column) =>
                column?.type === "photo" || column?.type === "photo-multi"
            ) || []
          : field?.type === "photo" || field?.type === "photo-multi"
          ? [field]
          : [];

      photoFields.forEach((photoField) => {
        const entries = lookup.get(photoField.id) || [];
        entries.push({
          sectionId: section.id,
          fieldId: photoField.id,
          repeatable: Boolean(section.repeatable || field?.type === "table"),
          label: photoField.label,
        });
        lookup.set(photoField.id, entries);
      });
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

const validateGasReportV3 = (formData = {}, job) => {
  if (job?.status !== "Completed") {
    throw new Error("Gas inspection reports can only be submitted when the job status is Completed");
  }

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

const getInspectionImageValidation = async (file) => {
  if (!file?.mimetype?.startsWith("image/")) {
    return { shouldUpload: true };
  }

  try {
    const metadata = await sharp(file.buffer).metadata();
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
      continue;
    }
    const fieldId = mediaMatch[1];
    const derivedMeta =
      mediaMeta[fieldId] ||
      normalizeMediaMetadata({ [fieldId]: {} }, context.template)[fieldId] ||
      {};
    const label = derivedMeta.label;

    for (const file of fileArray) {
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
      const uploadResult = await fileUploadService.uploadToStorage(file.buffer, {
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
        mimeType: file.mimetype,
        size: file.size,
        metadata: derivedMeta.metadata,
      });
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

  if (isGasTemplateV3(template, normalizedFormData)) {
    gasComplianceOutcome = validateGasReportV3(normalizedFormData, job);
    normalizedFormData["final-declaration"] = {
      ...(normalizedFormData["final-declaration"] || {}),
      "final-compliance-outcome": gasComplianceOutcome,
    };
  }

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
