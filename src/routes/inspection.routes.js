import express from "express";
import mongoose from "mongoose";
import {
  authenticateUserTypes,
  authenticate,
} from "../middleware/auth.middleware.js";
import fileUploadService from "../services/fileUpload.service.js";
import {
  listTemplates,
  getTemplateByJobType,
  serializeTemplate,
  cleanupOldTemplateVersions,
  prefillTemplateWithJobData,
} from "../services/inspectionTemplate.service.js";
import { submitInspectionReport } from "../services/inspectionReport.service.js";
import InspectionReport from "../models/InspectionReport.js";
import Property from "../models/Property.js";
import PropertyManager from "../models/PropertyManager.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";

const router = express.Router();

const ensureValidObjectId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error(`${label || "ID"} is not valid`);
    error.statusCode = 400;
    throw error;
  }
};

const propertyManagerOwnsProperty = async (propertyManager, propertyId) => {
  if (!propertyManager) return false;
  const assignment = propertyManager.assignedProperties.find(
    (prop) =>
      prop.status === "Active" &&
      prop.propertyId.toString() === propertyId.toString()
  );
  return Boolean(assignment);
};

router.get(
  "/templates",
  authenticateUserTypes(["Technician", "SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const templates = await listTemplates();
      res.status(200).json({
        status: "success",
        data: templates.map(serializeTemplate),
      });
    } catch (error) {
      console.error("List inspection templates error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to load inspection templates",
      });
    }
  }
);

// Get job-specific template with prefilled data
router.get(
  "/jobs/:jobId/template",
  authenticateUserTypes(["Technician", "SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      ensureValidObjectId(jobId, "Job ID");

      // Fetch job with property and technician data
      const job = await Job.findById(jobId)
        .populate('property')
        .populate('assignedTechnician');

      if (!job) {
        return res.status(404).json({
          status: "error",
          message: "Job not found",
        });
      }

      // Check if technician has access to this job
      if (req.technician && job.assignedTechnician?._id.toString() !== req.technician.id.toString()) {
        return res.status(403).json({
          status: "error",
          message: "Access denied. You are not assigned to this job.",
        });
      }

      // Get the template for this job type
      const options = {};
      if (job.property?.bedroomCount) options.bedroomCount = job.property.bedroomCount;
      if (job.property?.bathroomCount) options.bathroomCount = job.property.bathroomCount;

      const template = await getTemplateByJobType(job.jobType, options);
      if (!template) {
        return res.status(404).json({
          status: "error",
          message: `No template configured for job type ${job.jobType}`,
        });
      }

      // Prefill template with job data
      const prefilledTemplate = prefillTemplateWithJobData(
        template,
        job,
        job.property,
        job.assignedTechnician
      );

      res.status(200).json({
        status: "success",
        data: {
          template: serializeTemplate(prefilledTemplate),
          job: {
            id: job._id,
            job_id: job.job_id,
            jobType: job.jobType,
            status: job.status,
            dueDate: job.dueDate,
          },
          property: job.property ? {
            id: job.property._id,
            address: job.property.address,
            propertyType: job.property.propertyType,
            bedroomCount: job.property.bedroomCount,
            bathroomCount: job.property.bathroomCount,
          } : null,
          technician: job.assignedTechnician ? {
            id: job.assignedTechnician._id,
            firstName: job.assignedTechnician.firstName,
            lastName: job.assignedTechnician.lastName,
            email: job.assignedTechnician.email,
            phone: job.assignedTechnician.phone,
            licenseNumber: job.assignedTechnician.licenseNumber,
          } : null,
        },
      });
    } catch (error) {
      console.error("Get job template error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to load job template",
      });
    }
  }
);

router.get(
  "/templates/:jobType",
  authenticateUserTypes(["Technician", "SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { jobType } = req.params;
      const { bedroomCount, bathroomCount } = req.query;

      const options = {};
      if (bedroomCount) options.bedroomCount = parseInt(bedroomCount);
      if (bathroomCount) options.bathroomCount = parseInt(bathroomCount);

      const template = await getTemplateByJobType(jobType, options);
      if (!template) {
        return res.status(404).json({
          status: "error",
          message: `No template configured for job type ${jobType}`,
        });
      }
      res.status(200).json({
        status: "success",
        data: serializeTemplate(template),
      });
    } catch (error) {
      console.error("Get inspection template error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to load inspection template",
      });
    }
  }
);

router.post(
  "/jobs/:jobId",
  authenticateUserTypes(["Technician"]),
  fileUploadService.inspectionReports(),
  async (req, res) => {
    const startTime = Date.now();
    const { jobId } = req.params;
    
    try {
      console.log("[Inspection Submit] Request received", {
        jobId,
        timestamp: new Date().toISOString(),
        filesCount: req.files?.length || 0,
      });

      const technicianId = req.technician.id;
      const {
        jobType,
        templateVersion,
        formData,
        notes,
        mediaMeta,
        nextComplianceDate,
      } = req.body;

      console.log("[Inspection Submit] Starting report submission", {
        jobId,
        technicianId,
        jobType,
        templateVersion,
        hasFormData: !!formData,
        hasNotes: !!notes,
        hasMediaMeta: !!mediaMeta,
        hasNextComplianceDate: !!nextComplianceDate,
      });

      const { report, pdf } = await submitInspectionReport({
        jobId,
        technicianId,
        jobType,
        templateVersion,
        formData,
        notes,
        files: req.files || [],
        mediaMeta,
        nextComplianceDate,
      });

      console.log("[Inspection Submit] Report created, populating references", {
        reportId: report._id,
      });

      await report.populate([
        { path: "job", select: "job_id jobType status" },
        {
          path: "technician",
          select: "firstName lastName email phone",
        },
      ]);

      const duration = Date.now() - startTime;
      console.log("[Inspection Submit] Successfully completed", {
        reportId: report._id,
        duration: `${duration}ms`,
      });

      res.status(201).json({
        status: "success",
        message: "Inspection report submitted successfully",
        data: {
          report: report.toSummary(),
          pdf,
        },
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error("[Inspection Submit] Error occurred", {
        jobId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
      });
      
      res.status(error.statusCode || 500).json({
        status: "error",
        message: error.message || "Failed to submit inspection report",
      });
    }
  }
);

router.get(
  "/properties/:propertyId",
  authenticateUserTypes(["SuperUser", "PropertyManager"]),
  async (req, res) => {
    try {
      const { propertyId } = req.params;
      ensureValidObjectId(propertyId, "Property id");

      const property = await Property.findById(propertyId);
      if (!property) {
        return res.status(404).json({
          status: "error",
          message: "Property not found",
        });
      }

      if (req.propertyManager) {
        const manager = await PropertyManager.findById(req.propertyManager.id);
        const hasAccess = await propertyManagerOwnsProperty(
          manager,
          propertyId
        );
        if (!hasAccess) {
          return res.status(403).json({
            status: "error",
            message:
              "Access denied. You do not have permission to view this property's inspections.",
          });
        }
      }

      const {
        page = 1,
        limit = 20,
        jobType,
        startDate,
        endDate,
      } = req.query;

      const query = { property: propertyId };
      if (jobType) {
        query.jobType = jobType;
      }
      if (startDate || endDate) {
        query.submittedAt = {};
        if (startDate) query.submittedAt.$gte = new Date(startDate);
        if (endDate) query.submittedAt.$lte = new Date(endDate);
      }

      const skip = (Number(page) - 1) * Number(limit);

      const [reports, total] = await Promise.all([
        InspectionReport.find(query)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate({
            path: "technician",
            select: "firstName lastName email phone",
          }),
        InspectionReport.countDocuments(query),
      ]);

      res.status(200).json({
        status: "success",
        data: {
          total,
          page: Number(page),
          limit: Number(limit),
          reports: reports.map((report) => report.toSummary()),
        },
      });
    } catch (error) {
      console.error("List property inspections error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to load inspection history",
      });
    }
  }
);

router.get(
  "/:reportId",
  authenticate,
  async (req, res) => {
    try {
      const { reportId } = req.params;
      ensureValidObjectId(reportId, "Inspection report id");

      const report = await InspectionReport.findById(reportId)
        .populate({
          path: "job",
          select: "job_id jobType property assignedTechnician status",
        })
        .populate({
          path: "technician",
          select: "firstName lastName email phone",
        });

      if (!report) {
        return res.status(404).json({
          status: "error",
          message: "Inspection report not found",
        });
      }

      // Authorization: Technicians can view their own reports, property managers limited to assigned properties
      if (req.technician) {
        if (report.technician.toString() !== req.technician.id.toString()) {
          return res.status(403).json({
            status: "error",
            message: "Access denied to this report",
          });
        }
      }

      if (req.propertyManager) {
        const manager = await PropertyManager.findById(req.propertyManager.id);
        const hasAccess = await propertyManagerOwnsProperty(
          manager,
          report.property
        );
        if (!hasAccess) {
          return res.status(403).json({
            status: "error",
            message: "Access denied to this report",
          });
        }
      }

      res.status(200).json({
        status: "success",
        data: {
          report: report.toSummary(),
          pdf: report.pdf,
          formData: report.formData,
          media: report.media,
        },
      });
    } catch (error) {
      console.error("Get inspection report error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to load inspection report",
      });
    }
  }
);

// Cleanup old template versions (manual trigger)
router.post(
  "/templates/cleanup",
  authenticateUserTypes(["SuperUser"]),
  async (req, res) => {
    try {
      await cleanupOldTemplateVersions();
      res.json({
        status: "success",
        message: "Old template versions cleaned up successfully",
      });
    } catch (error) {
      console.error("Template cleanup error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to cleanup old template versions",
      });
    }
  }
);

export default router;
