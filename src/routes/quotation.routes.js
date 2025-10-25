import express from "express";
import {
  createQuotationRequest,
  getQuotations,
  getQuotation,
  updateQuotation,
  sendQuotation,
  respondToQuotation,
  deleteQuotation,
  getQuotationStats,
} from "../controllers/quotation.controller.js";
import {
  authenticateAdminLevel,
  authenticateAgency,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import fileUploadService from "../services/fileUpload.service.js";

const router = express.Router();

// Routes accessible by agencies and super users
router.post(
  "/",
  authenticateUserTypes(["agency", "super_user", "property_manager", "team_member"]),
  fileUploadService.array("attachments", 10), // Allow up to 10 files
  createQuotationRequest
);

router.get(
  "/",
  authenticateUserTypes(["agency", "super_user", "property_manager", "team_member"]),
  getQuotations
);

router.get(
  "/stats",
  authenticateAdminLevel,
  getQuotationStats
);

router.get(
  "/:id",
  authenticateUserTypes(["agency", "super_user", "property_manager", "team_member"]),
  getQuotation
);

// Routes accessible only by super users
router.put(
  "/:id",
  authenticateAdminLevel,
  updateQuotation
);

router.post(
  "/:id/send",
  authenticateAdminLevel,
  sendQuotation
);

router.post(
  "/:id/respond",
  authenticateUserTypes(["agency", "property_manager"]),
  respondToQuotation
);

// Delete route - agencies can delete draft quotations, super users can delete any
router.delete(
  "/:id",
  authenticateUserTypes(["agency", "super_user", "property_manager", "team_member"]),
  deleteQuotation
);

export default router;
