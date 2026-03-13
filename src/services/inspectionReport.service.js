import mongoose from "mongoose";
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

const NEXT_COMPLIANCE_FIELD_IDS = [
  "next-inspection-date",
  "certification-next-inspection-due",
  "next-service-due",
];

const resolveNextComplianceDate = (template, formData = {}, nextComplianceDate) => {
  if (nextComplianceDate) {
    return nextComplianceDate;
  }

  if (!template?.sections?.length) {
    return nextComplianceDate;
  }

  for (const section of template.sections) {
    const sectionResponses = formData[section.id];
    if (!sectionResponses || typeof sectionResponses !== "object") {
      continue;
    }

    for (const fieldId of NEXT_COMPLIANCE_FIELD_IDS) {
      if (sectionResponses[fieldId]) {
        return sectionResponses[fieldId];
      }
    }
  }

  return nextComplianceDate;
};

const buildSectionsSummary = (template, formData = {}) => {
  if (!template?.sections?.length) {
    return [];
  }

  const summary = [];
  template.sections.forEach((section) => {
    const sectionResponses = formData[section.id] || {};
    section.fields.forEach((field) => {
      if (sectionResponses[field.id] !== undefined) {
        summary.push({
          sectionId: section.id,
          fieldId: field.id,
          label: field.question || field.label,
          value: sectionResponses[field.id],
          flag:
            field.type === "boolean" && sectionResponses[field.id] === false,
        });
      }
    });
  });
  return summary;
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
    const label = mediaMeta[fieldId]?.label;

    for (const file of fileArray) {
      const publicId = `inspection-reports/job-${context.jobId}-${fieldId}-${Date.now()}`;
      const uploadResult = await fileUploadService.uploadToCloudinary(file.buffer, {
        folder: "inspection-reports",
        public_id: publicId,
        resource_type: "auto",
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
        url: uploadResult.secure_url,
        cloudinaryId: uploadResult.public_id,
        mimeType: file.mimetype,
        size: file.size,
        metadata: mediaMeta[fieldId]?.metadata,
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
  const resolvedNextComplianceDate = resolveNextComplianceDate(
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
  const mediaMetadata = parseMediaMeta(mediaMeta);
  
  console.log("[Inspection Submit] Uploading inspection media files", {
    filesCount: Array.isArray(files) ? files.length : Object.keys(files || {}).length,
  });
  const mediaUploads = await uploadInspectionMedia(files, mediaMetadata, {
    jobId: job._id,
    propertyId: property._id,
  });
  console.log("[Inspection Submit] Media uploads completed", {
    uploadsCount: mediaUploads.length,
  });

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

  console.log("[Inspection Submit] Uploading PDF to Cloudinary");
  const pdfUpload = await fileUploadService.uploadToCloudinary(pdfBuffer, {
    folder: "inspection-reports",
    public_id: `inspection-reports/job-${job._id}-report-${report._id}`,
    resource_type: "auto",
    tags: [
      `job-${job._id}`,
      `property-${property._id}`,
      "inspection-report",
    ],
  });
  console.log("[Inspection Submit] PDF uploaded to Cloudinary", {
    url: pdfUpload.secure_url,
  });

  report.pdf = {
    url: pdfUpload.secure_url,
    cloudinaryId: pdfUpload.public_id,
    generatedAt: new Date(),
  };
  await report.save();
  console.log("[Inspection Submit] Report saved with PDF reference");

  job.reportFile = pdfUpload.secure_url;
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
