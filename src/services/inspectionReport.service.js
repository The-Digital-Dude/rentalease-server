import mongoose from "mongoose";
import Job from "../models/Job.js";
import Property from "../models/Property.js";
import Technician from "../models/Technician.js";
import InspectionReport from "../models/InspectionReport.js";
import { getTemplateByJobType } from "./inspectionTemplate.service.js";
import fileUploadService from "./fileUpload.service.js";
import buildInspectionReportPdf from "./inspectionReportPdf.service.js";
import notificationService from "./notification.service.js";

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
          label: field.label,
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
  const mediaMetadata = parseMediaMeta(mediaMeta);
  const mediaUploads = await uploadInspectionMedia(files, mediaMetadata, {
    jobId: job._id,
    propertyId: property._id,
  });

  const sectionsSummary = buildSectionsSummary(template, normalizedFormData);

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
    submittedBy: {
      userType: "Technician",
      userId: technicianId,
    },
  });

  const pdfBuffer = await buildInspectionReportPdf({
    report,
    template,
    job,
    property,
    technician,
  });

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

  report.pdf = {
    url: pdfUpload.secure_url,
    cloudinaryId: pdfUpload.public_id,
    generatedAt: new Date(),
  };
  await report.save();

  job.reportFile = pdfUpload.secure_url;
  job.latestInspectionReport = report._id;
  job.inspectionReports = job.inspectionReports || [];
  job.inspectionReports.push(report._id);
  await job.save();

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
