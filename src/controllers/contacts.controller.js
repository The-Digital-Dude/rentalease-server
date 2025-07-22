import Contact from "../models/Contact.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import mongoose from "mongoose";

// Helper validation functions
const isValidEmail = (email) =>
  /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
const isValidPhone = (phone) => /^\+?[\d\s\-\(\)]+$/.test(phone);

// List all contacts for current user (superuser: all, agency: own)
export const getContacts = async (req, res) => {
  try {
    let query = {};
    if (req.superUser) {
      // SuperUser: can see all contacts
    } else if (req.agency) {
      query = { "owner.ownerType": "Agency", "owner.ownerId": req.agency.id };
    } else {
      return res.status(403).json({ status: "error", message: "Unauthorized" });
    }
    const contacts = await Contact.find(query).sort({ createdAt: -1 });
    res.json({ status: "success", data: { contacts } });
  } catch (error) {
    console.error("Get contacts error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Unable to fetch contacts" });
  }
};

// Get a single contact by ID
export const getContactById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid contact ID" });
    }
    const contact = await Contact.findById(id);
    if (!contact)
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found" });
    if (req.superUser) {
      return res.json({ status: "success", data: { contact } });
    } else if (req.agency) {
      if (
        contact.owner.ownerType !== "Agency" ||
        String(contact.owner.ownerId) !== String(req.agency.id)
      ) {
        return res
          .status(403)
          .json({ status: "error", message: "Access denied" });
      }
      return res.json({ status: "success", data: { contact } });
    } else {
      return res.status(403).json({ status: "error", message: "Unauthorized" });
    }
  } catch (error) {
    console.error("Get contact by ID error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Unable to fetch contact" });
  }
};

// Create a new contact
export const createContact = async (req, res) => {
  try {
    const { name, role, email, phone, notes, preferredContact } = req.body;
    const errors = {};
    if (!name || name.trim().length < 2)
      errors.name = "Name is required (min 2 chars)";
    if (!role) errors.role = "Role is required";
    if (!email) errors.email = "Email is required";
    else if (!isValidEmail(email)) errors.email = "Invalid email format";
    if (!phone) errors.phone = "Phone is required";
    else if (!isValidPhone(phone)) errors.phone = "Invalid phone format";
    if (preferredContact && !["Email", "Phone"].includes(preferredContact))
      errors.preferredContact = "Preferred contact must be Email or Phone";
    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Validation failed",
          details: errors,
        });
    }
    let owner = {};
    if (req.superUser) {
      owner = { ownerType: "SuperUser", ownerId: req.superUser.id };
    } else if (req.agency) {
      owner = { ownerType: "Agency", ownerId: req.agency.id };
    } else {
      return res.status(403).json({ status: "error", message: "Unauthorized" });
    }
    // Check for duplicate email for this owner
    const existing = await Contact.findOne({
      email: email.toLowerCase(),
      "owner.ownerType": owner.ownerType,
      "owner.ownerId": owner.ownerId,
    });
    if (existing) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Contact with this email already exists for this owner",
        });
    }
    const contact = new Contact({
      name: name.trim(),
      role,
      email: email.toLowerCase(),
      phone: phone.trim(),
      notes: notes || "",
      preferredContact: preferredContact || "Email",
      owner,
    });
    await contact.save();
    res
      .status(201)
      .json({
        status: "success",
        message: "Contact created",
        data: { contact },
      });
  } catch (error) {
    console.error("Create contact error:", error);
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res
        .status(400)
        .json({
          status: "error",
          message: "Validation failed",
          details: validationErrors,
        });
    }
    res
      .status(500)
      .json({ status: "error", message: "Unable to create contact" });
  }
};

// Update a contact
export const updateContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid contact ID" });
    }
    const contact = await Contact.findById(id);
    if (!contact)
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found" });
    if (req.superUser) {
      // SuperUser: can update any contact
    } else if (req.agency) {
      if (
        contact.owner.ownerType !== "Agency" ||
        String(contact.owner.ownerId) !== String(req.agency.id)
      ) {
        return res
          .status(403)
          .json({ status: "error", message: "Access denied" });
      }
    } else {
      return res.status(403).json({ status: "error", message: "Unauthorized" });
    }
    const { name, role, email, phone, notes, preferredContact } = req.body;
    const errors = {};
    if (name !== undefined && name.trim().length < 2)
      errors.name = "Name must be at least 2 characters";
    if (email !== undefined && !isValidEmail(email))
      errors.email = "Invalid email format";
    if (phone !== undefined && !isValidPhone(phone))
      errors.phone = "Invalid phone format";
    if (
      preferredContact !== undefined &&
      !["Email", "Phone"].includes(preferredContact)
    )
      errors.preferredContact = "Preferred contact must be Email or Phone";
    if (Object.keys(errors).length > 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Validation failed",
          details: errors,
        });
    }
    // Check for duplicate email if updating email
    if (email && email !== contact.email) {
      const existing = await Contact.findOne({
        email: email.toLowerCase(),
        "owner.ownerType": contact.owner.ownerType,
        "owner.ownerId": contact.owner.ownerId,
        _id: { $ne: id },
      });
      if (existing) {
        return res
          .status(400)
          .json({
            status: "error",
            message: "Contact with this email already exists for this owner",
          });
      }
    }
    if (name !== undefined) contact.name = name.trim();
    if (role !== undefined) contact.role = role;
    if (email !== undefined) contact.email = email.toLowerCase();
    if (phone !== undefined) contact.phone = phone.trim();
    if (notes !== undefined) contact.notes = notes;
    if (preferredContact !== undefined)
      contact.preferredContact = preferredContact;
    await contact.save();
    res.json({
      status: "success",
      message: "Contact updated",
      data: { contact },
    });
  } catch (error) {
    console.error("Update contact error:", error);
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res
        .status(400)
        .json({
          status: "error",
          message: "Validation failed",
          details: validationErrors,
        });
    }
    res
      .status(500)
      .json({ status: "error", message: "Unable to update contact" });
  }
};

// Delete a contact
export const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ status: "error", message: "Invalid contact ID" });
    }
    const contact = await Contact.findById(id);
    if (!contact)
      return res
        .status(404)
        .json({ status: "error", message: "Contact not found" });
    if (req.superUser) {
      // SuperUser: can delete any contact
    } else if (req.agency) {
      if (
        contact.owner.ownerType !== "Agency" ||
        String(contact.owner.ownerId) !== String(req.agency.id)
      ) {
        return res
          .status(403)
          .json({ status: "error", message: "Access denied" });
      }
    } else {
      return res.status(403).json({ status: "error", message: "Unauthorized" });
    }
    await contact.deleteOne();
    res.json({ status: "success", message: "Contact deleted" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Unable to delete contact" });
  }
};
