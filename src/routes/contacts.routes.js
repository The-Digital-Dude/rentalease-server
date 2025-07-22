import express from "express";
import {
  getContacts,
  getContactById,
  createContact,
  updateContact,
  deleteContact,
} from "../controllers/contacts.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// List all contacts for current user (superuser: all, agency: own)
router.get("/", authenticate, getContacts);

// Get a single contact by ID
router.get("/:id", authenticate, getContactById);

// Create a new contact
router.post("/", authenticate, createContact);

// Update a contact
router.put("/:id", authenticate, updateContact);

// Delete a contact
router.delete("/:id", authenticate, deleteContact);

export default router;
