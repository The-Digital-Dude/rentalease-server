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

const router = express.Router();

// Routes accessible by agencies and super users
router.post(
  "/",
  authenticateUserTypes(["agency", "super_user", "property_manager"]),
  createQuotationRequest
);

router.get(
  "/",
  authenticateUserTypes(["agency", "super_user", "property_manager"]),
  getQuotations
);

router.get(
  "/stats",
  authenticateAdminLevel,
  getQuotationStats
);

router.get(
  "/:id",
  authenticateUserTypes(["agency", "super_user", "property_manager"]),
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

// Routes accessible only by agencies
router.post(
  "/:id/respond",
  authenticateAgency,
  respondToQuotation
);

// Delete route - agencies can delete draft quotations, super users can delete any
router.delete(
  "/:id",
  authenticateUserTypes(["agency", "super_user", "property_manager"]),
  deleteQuotation
);

export default router;