import express from "express";
import {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStats,
} from "../controllers/websiteLead.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public route - Create new lead from website contact form
router.post("/", createLead);

// Authenticated routes - SuperUser and Agency access only
router.get("/", authenticate, getLeads);
router.get("/stats", authenticate, getLeadStats);
router.get("/:id", authenticate, getLeadById);
router.put("/:id", authenticate, updateLead);
router.delete("/:id", authenticate, deleteLead);

export default router;