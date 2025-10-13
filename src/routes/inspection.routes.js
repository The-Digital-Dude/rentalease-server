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
} from "../services/inspectionTemplate.service.js";
import { submitInspectionReport } from "../services/inspectionReport.service.js";
import InspectionReport from "../models/InspectionReport.js";
import Property from "../models/Property.js";
import PropertyManager from "../models/PropertyManager.js";

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

router.get(
  "/templates/:jobType",
  authenticateUserTypes(["Technician", "SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { jobType } = req.params;
      const template = await getTemplateByJobType(jobType);
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
  fileUploadService.any(),
  async (req, res) => {
    try {
      const { jobId } = req.params;
      const technicianId = req.technician.id;
      const {
        jobType,
        templateVersion,
        formData,
        notes,
        mediaMeta,
      } = req.body;

      const { report, pdf } = await submitInspectionReport({
        jobId,
        technicianId,
        jobType,
        templateVersion,
        formData,
        notes,
        files: req.files || [],
        mediaMeta,
      });

      await report.populate([
        { path: "job", select: "job_id jobType status" },
        {
          path: "technician",
          select: "firstName lastName email phone",
        },
      ]);

      res.status(201).json({
        status: "success",
        message: "Inspection report submitted successfully",
        data: {
          report: report.toSummary(),
          pdf,
        },
      });
    } catch (error) {
      console.error("Submit inspection report error:", error);
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

export default router;
