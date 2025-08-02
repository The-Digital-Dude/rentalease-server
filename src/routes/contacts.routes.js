import express from "express";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
  sendEmailToContact,
} from "../controllers/contacts.controller.js";
import {
  authenticate,
  authenticatePropertyManager,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// List all contacts for current user (superuser: all, agency: own, propertyManager: read-only)
router.get("/", authenticate, getContacts);

// Get a single contact by ID (propertyManager: read-only)
router.get("/:id", authenticate, getContactById);

// Create a new contact (SuperUser and Agency only)
router.post("/", authenticate, createContact);

// Update a contact (SuperUser and Agency only)
router.put("/:id", authenticate, updateContact);

// Delete a contact (SuperUser and Agency only)
router.delete("/:id", authenticate, deleteContact);

// Send custom email to a contact (SuperUser and Agency only)
router.post("/:id/send-email", authenticate, sendEmailToContact);

export default router;
