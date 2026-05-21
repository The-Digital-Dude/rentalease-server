import express from "express";
import { readFile } from "fs/promises";
import mongoose from "mongoose";
import path from "path";
import PDFDocument from "pdfkit";
import { bucket } from "../config/gcs.js";
import Invoice from "../models/Invoice.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import {
  authenticateSuperUser,
  authenticateAgency,
  authenticate,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import { getAgencyServicePriceForJobType } from "../utils/agencyPricing.js";
import fileUploadService from "../services/fileUpload.service.js";

const router = express.Router();

// Helper function to get user info for audit trails
const getUserInfo = (req) => {
  if (req.superUser) {
    return {
      name: req.superUser.name,
      type: "SuperUser",
      id: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      name: req.agency.companyName,
      type: "Agency",
      id: req.agency.id,
    };
  } else if (req.technician) {
    return {
      name: `${req.technician.firstName} ${req.technician.lastName}`,
      type: "Technician",
      id: req.technician.id,
    };
  } else if (req.propertyManager) {
    return {
      name: req.propertyManager.fullName,
      type: "PropertyManager",
      id: req.propertyManager.id,
      assignedProperties: req.propertyManager.assignedProperties,
    };
  } else if (req.teamMember) {
    return {
      name: req.teamMember.fullName || req.teamMember.name || req.teamMember.email,
      type: "TeamMember",
      id: req.teamMember.id,
    };
  }
  return null;
};

// Helper function to validate invoice items
const validateInvoiceItems = (items) => {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return { isValid: false, error: "At least one item is required" };
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item.name || item.name.trim().length === 0) {
      return { isValid: false, error: `Item ${i + 1}: Name is required` };
    }

    if (!item.quantity || item.quantity <= 0) {
      return {
        isValid: false,
        error: `Item ${i + 1}: Quantity must be greater than 0`,
      };
    }

    if (!item.rate || item.rate < 0) {
      return {
        isValid: false,
        error: `Item ${i + 1}: Rate cannot be negative`,
      };
    }
  }

  return { isValid: true };
};

// Helper function to calculate invoice totals
const calculateInvoiceTotals = (items, tax = 0) => {
  const subtotal = items.reduce((sum, item) => {
    const amount = (item.quantity || 0) * (item.rate || 0);
    return sum + amount;
  }, 0);

  const totalCost = subtotal + (tax || 0);

  return { subtotal, totalCost };
};

const isValidEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const stripHtml = (value = "") => value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const formatRecipientName = (recipient = {}) => {
  if (recipient.name) return recipient.name;
  if (recipient.fullName) return recipient.fullName;
  const fullName = `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim();
  return fullName || undefined;
};

const dedupeRecipients = (recipients = []) => {
  const seen = new Set();
  return recipients.filter((recipient) => {
    const email = recipient?.email?.trim?.().toLowerCase();
    if (!email || seen.has(email)) return false;
    seen.add(email);
    return true;
  });
};

const normalizeCompletedJobInvoiceStatus = (invoice) => {
  if (!invoice) {
    return invoice;
  }

  if (invoice.status === "Pending") {
    invoice.status = "Sent";
    if (!invoice.sentAt) {
      invoice.sentAt = invoice.updatedAt || invoice.createdAt || new Date();
    }
  }

  return invoice;
};

const normalizeCompletedJobInvoiceQuery = (query = {}) => {
  const normalizedQuery = { ...query };

  if (normalizedQuery.status === "Pending") {
    normalizedQuery.status = "Sent";
  }

  return normalizedQuery;
};

const normalizeStatusCounts = (statusCounts = []) =>
  statusCounts.reduce((acc, item) => {
    const statusKey = item._id === "Pending" ? "Sent" : item._id;
    acc[statusKey] = (acc[statusKey] || 0) + item.count;
    return acc;
  }, {});

const normalizeRecipientList = (recipients = []) =>
  dedupeRecipients(
    (Array.isArray(recipients) ? recipients : [])
      .map((recipient) => {
        if (typeof recipient === "string") {
          return { email: recipient.trim().toLowerCase() };
        }

        if (recipient?.email) {
          return {
            email: recipient.email.trim().toLowerCase(),
            name: recipient.name?.trim?.() || undefined,
          };
        }

        return null;
      })
      .filter((recipient) => recipient?.email && isValidEmail(recipient.email))
  );

const resolveAgencyForJob = async (job) => {
  if (job.owner?.ownerType === "Agency") {
    return Agency.findById(job.owner.ownerId);
  }

  if (job.property) {
    const populatedJob = await job.populate({
      path: "property",
      select: "agency",
    });

    if (populatedJob.property?.agency) {
      return Agency.findById(populatedJob.property.agency);
    }
  }

  return null;
};

const buildInvoicePopulateConfig = () => [
  {
    path: "jobId",
    select: "job_id jobType property dueDate status",
    populate: {
      path: "property",
      select: "address assignedPropertyManager agency",
      populate: [
        {
          path: "assignedPropertyManager",
          select: "firstName lastName fullName email phone",
        },
        {
          path: "agency",
          select: "companyName contactPerson email phone",
        },
      ],
    },
  },
  { path: "technicianId", select: "firstName lastName email phone" },
  { path: "agencyId", select: "companyName contactPerson email phone" },
];

const buildInvoiceReviewData = async (invoice) => {
  const job = await Job.findById(invoice.jobId).populate(
    "property",
    "address reportFile"
  );
  const agency = await Agency.findById(invoice.agencyId).select(
    "companyName contactPerson email"
  );

  const propertyManagers = job?.property?._id
    ? await PropertyManager.find({
        "assignedProperties.propertyId": job.property._id,
        "assignedProperties.status": "Active",
      }).select("firstName lastName fullName email")
    : [];

  const toRecipients = dedupeRecipients([
    agency?.email
      ? {
          email: agency.email,
          name: agency.contactPerson || agency.companyName,
        }
      : null,
    ...propertyManagers.map((manager) => ({
      email: manager.email,
      name: formatRecipientName(manager),
    })),
  ].filter(Boolean));

  return {
    propertyAddress: job?.property?.address?.fullAddress || "Property",
    jobType: job?.jobType || "",
    jobNumber: job?.job_id || "",
    agencyName: agency?.companyName || "",
    reportFile: job?.reportFile || null,
    hasReport: Boolean(job?.reportFile),
    recipients: {
      to: toRecipients,
      cc: [],
      bcc: [],
    },
  };
};

const buildCompletedDocumentsHtml = ({ customBodyHtml, invoice, reviewData }) => {
  const itemsHtml = (invoice.items || [])
    .map(
      (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #dbe3ea;">${item.name}</td>
          <td style="padding:8px;border:1px solid #dbe3ea;text-align:right;">${Number(item.quantity || 0).toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #dbe3ea;text-align:right;">$${Number(item.rate || 0).toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #dbe3ea;text-align:right;">$${Number(item.amount || 0).toFixed(2)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div>${customBodyHtml || ""}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #dbe3ea;" />
    <div style="font-family:Arial,sans-serif;color:#1f2937;">
      <h3 style="margin:0 0 12px;">Completed Job Documents</h3>
      <p><strong>Property:</strong> ${reviewData.propertyAddress}</p>
      <p><strong>Service:</strong> ${reviewData.jobType || "-"}</p>
      <p><strong>Job ID:</strong> ${reviewData.jobNumber || "-"}</p>
      <p><strong>Invoice #:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Invoice Total:</strong> $${Number(invoice.totalCost || 0).toFixed(2)}</p>
      <p><strong>Inspection Report:</strong> ${
        reviewData.reportFile
          ? `<a href="${reviewData.reportFile}">Open report</a>`
          : "Not available"
      }</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #dbe3ea;text-align:left;background:#f8fafc;">Item</th>
            <th style="padding:8px;border:1px solid #dbe3ea;text-align:right;background:#f8fafc;">Qty</th>
            <th style="padding:8px;border:1px solid #dbe3ea;text-align:right;background:#f8fafc;">Rate</th>
            <th style="padding:8px;border:1px solid #dbe3ea;text-align:right;background:#f8fafc;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <p style="margin-top:16px;"><strong>Subtotal:</strong> $${Number(invoice.subtotal || 0).toFixed(2)}</p>
      <p><strong>Tax:</strong> $${Number(invoice.tax || 0).toFixed(2)}</p>
      <p><strong>Total:</strong> $${Number(invoice.totalCost || 0).toFixed(2)}</p>
      ${invoice.notes ? `<p><strong>Notes:</strong> ${invoice.notes}</p>` : ""}
    </div>
  `;
};

const buildCompletedDocumentsText = ({ customBodyText, invoice, reviewData }) => {
  const lines = [
    customBodyText || "",
    "",
    "Completed Job Documents",
    `Property: ${reviewData.propertyAddress}`,
    `Service: ${reviewData.jobType || "-"}`,
    `Job ID: ${reviewData.jobNumber || "-"}`,
    `Invoice #: ${invoice.invoiceNumber}`,
    `Invoice Total: $${Number(invoice.totalCost || 0).toFixed(2)}`,
    `Inspection Report: ${reviewData.reportFile || "Not available"}`,
    "",
    "Invoice Items:",
    ...(invoice.items || []).map(
      (item) =>
        `- ${item.name}: ${Number(item.quantity || 0).toFixed(2)} x $${Number(
          item.rate || 0
        ).toFixed(2)} = $${Number(item.amount || 0).toFixed(2)}`
    ),
    "",
    `Subtotal: $${Number(invoice.subtotal || 0).toFixed(2)}`,
    `Tax: $${Number(invoice.tax || 0).toFixed(2)}`,
    `Total: $${Number(invoice.totalCost || 0).toFixed(2)}`,
  ];

  if (invoice.notes) {
    lines.push(`Notes: ${invoice.notes}`);
  }

  return lines.join("\n").trim();
};

const generateInvoicePdfBuffer = async ({ invoice, reviewData }) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(24).fillColor("#0f172a").text("Rentalease Invoice", {
      align: "left",
    });
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor("#475569");
    doc.text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Status: ${invoice.status}`);
    doc.text(`Job Number: ${reviewData.jobNumber || "-"}`);
    doc.text(`Service: ${reviewData.jobType || "-"}`);
    doc.text(`Property: ${reviewData.propertyAddress || "-"}`);
    if (reviewData.agencyName) {
      doc.text(`Agency: ${reviewData.agencyName}`);
    }

    doc.moveDown(1);
    doc.fontSize(16).fillColor("#0f172a").text("Description");
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor("#111827").text(invoice.description || "-", {
      lineGap: 3,
    });

    doc.moveDown(1);
    doc.fontSize(16).fillColor("#0f172a").text("Items");
    doc.moveDown(0.4);

    const columns = {
      item: 50,
      qty: 280,
      rate: 350,
      amount: 450,
    };

    doc.fontSize(10).fillColor("#64748b");
    doc.text("Item", columns.item, doc.y);
    doc.text("Qty", columns.qty, doc.y - 12);
    doc.text("Rate", columns.rate, doc.y - 12);
    doc.text("Amount", columns.amount, doc.y - 12);
    doc.moveDown(0.6);
    doc.strokeColor("#cbd5e1").moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);

    doc.fontSize(11).fillColor("#111827");
    for (const item of invoice.items || []) {
      const startY = doc.y;
      doc.text(item.name || "-", columns.item, startY, { width: 200 });
      doc.text(`${Number(item.quantity || 0)}`, columns.qty, startY);
      doc.text(`$${Number(item.rate || 0).toFixed(2)}`, columns.rate, startY);
      doc.text(
        `$${Number(item.amount || 0).toFixed(2)}`,
        columns.amount,
        startY
      );
      doc.moveDown(0.8);
    }

    doc.moveDown(0.8);
    doc.strokeColor("#cbd5e1").moveTo(300, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor("#111827");
    doc.text(`Subtotal: $${Number(invoice.subtotal || 0).toFixed(2)}`, 330);
    doc.text(`Tax: $${Number(invoice.tax || 0).toFixed(2)}`, 330);
    doc.font("Helvetica-Bold").text(
      `Total: $${Number(invoice.totalCost || 0).toFixed(2)}`,
      330
    );
    doc.font("Helvetica");

    if (invoice.notes) {
      doc.moveDown(1.2);
      doc.fontSize(16).fillColor("#0f172a").text("Notes");
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor("#111827").text(invoice.notes, { lineGap: 3 });
    }

    doc.end();
  });
};

const extractGcsPathFromUrl = (value) => {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    const parsedUrl = value.startsWith("http://") || value.startsWith("https://")
      ? new URL(value)
      : new URL(value, "http://localhost");
    const pathname = parsedUrl.pathname || "";
    const gcsPath = parsedUrl.searchParams.get("path");

    if (
      gcsPath &&
      (pathname.endsWith("/api/v1/files/pdf") ||
        pathname.endsWith("/api/v1/files/object"))
    ) {
      return gcsPath;
    }
  } catch {
    return null;
  }

  return null;
};

const inferContentTypeFromFilename = (filename = "") => {
  const normalized = filename.toLowerCase();
  if (normalized.endsWith(".pdf")) return "application/pdf";
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  return "application/octet-stream";
};

const fetchAttachmentFromUrl = async (url, fallbackFilename) => {
  if (!url) return null;

  const gcsPath = extractGcsPathFromUrl(url);
  if (gcsPath) {
    const [buffer] = await bucket.file(gcsPath).download();
    return {
      filename:
        fallbackFilename || gcsPath.split("/").pop() || "attachment.pdf",
      content: buffer,
      contentType: inferContentTypeFromFilename(
        fallbackFilename || gcsPath
      ),
    };
  }

  const normalizedPath = String(url).trim();
  if (
    normalizedPath.startsWith("uploads/") ||
    normalizedPath.startsWith("/uploads/")
  ) {
    const relativePath = normalizedPath.replace(/^\/+/, "");
    const absolutePath = path.resolve(process.cwd(), relativePath);
    const buffer = await readFile(absolutePath);

    return {
      filename:
        fallbackFilename || path.basename(relativePath) || "attachment.pdf",
      content: buffer,
      contentType: inferContentTypeFromFilename(
        fallbackFilename || relativePath
      ),
    };
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download attachment from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const contentType =
    response.headers.get("content-type") || "application/octet-stream";
  const filenameFromUrl = url.split("?")[0].split("/").pop();
  const extensionFromType =
    contentType === "application/pdf"
      ? ".pdf"
      : contentType.startsWith("image/")
      ? `.${contentType.split("/")[1]}`
      : "";

  return {
    filename:
      fallbackFilename ||
      filenameFromUrl ||
      `attachment${extensionFromType || ""}`,
    content: Buffer.from(arrayBuffer),
    contentType,
  };
};

export const sendCompletedJobInvoiceDocuments = async ({
  invoice,
  to = [],
  cc = [],
  bcc = [],
  subject,
  bodyHtml,
  bodyText,
  uploadedInvoiceAttachment = null,
  sentBy = null,
}) => {
  normalizeCompletedJobInvoiceStatus(invoice);
  const reviewData = await buildInvoiceReviewData(invoice);

  if (!reviewData.hasReport) {
    throw new Error("Inspection report is required before sending documents");
  }

  const normalizedTo = normalizeRecipientList(
    to.length ? to : reviewData.recipients.to
  );
  const normalizedCc = normalizeRecipientList(cc);
  const normalizedBcc = normalizeRecipientList(bcc);

  if (!normalizedTo.length) {
    throw new Error("At least one valid recipient is required");
  }

  const invoicePdfPromise = uploadedInvoiceAttachment
    ? Promise.resolve(uploadedInvoiceAttachment.buffer)
    : generateInvoicePdfBuffer({
        invoice,
        reviewData,
      });

  const reportAttachmentPromise = fetchAttachmentFromUrl(
    reviewData.reportFile,
    `inspection-report-${reviewData.jobNumber || invoice.invoiceNumber}.pdf`
  ).catch((reportAttachmentError) => {
    console.warn("Unable to attach inspection report to invoice email:", {
      invoiceId: invoice._id?.toString?.(),
      jobId: invoice.jobId?._id?.toString?.() || invoice.jobId?.toString?.(),
      reportFile: reviewData.reportFile,
      error: reportAttachmentError.message,
    });
    return null;
  });

  const [invoicePdfBuffer, reportAttachment] = await Promise.all([
    invoicePdfPromise,
    reportAttachmentPromise,
  ]);

  const attachments = [
    {
      filename:
        uploadedInvoiceAttachment?.originalname ||
        `invoice-${invoice.invoiceNumber}.pdf`,
      content: invoicePdfBuffer,
      contentType: "application/pdf",
    },
    ...(reportAttachment ? [reportAttachment] : []),
  ];

  await emailService.sendUserEmail({
    from: emailService.defaultFrom,
    to: normalizedTo,
    cc: normalizedCc,
    bcc: normalizedBcc,
    subject: String(subject).trim(),
    bodyHtml: buildCompletedDocumentsHtml({
      customBodyHtml: String(bodyHtml),
      invoice,
      reviewData,
    }),
    bodyText: buildCompletedDocumentsText({
      customBodyText: bodyText ? String(bodyText) : stripHtml(String(bodyHtml)),
      invoice,
      reviewData,
    }),
    attachments,
  });

  invoice.status = "Sent";
  invoice.sentAt = new Date();
  await invoice.save();

  if (sentBy) {
    // Notifications should not block the API response for a completed send.
    Promise.resolve()
      .then(async () => {
      await notificationService.sendInvoiceSentNotification(invoice, sentBy);
      })
      .catch((notificationError) => {
        console.error(
          "Failed to send invoice sent notification:",
          notificationError
        );
      });
  }

  return {
    invoice,
    reviewData,
  };
};

// POST - Create new invoice
router.post("/", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const {
      jobId,
      technicianId,
      agencyId,
      description,
      items,
      tax = 0,
      notes,
    } = req.body;

    // Validate required fields
    if (!jobId || !description || !items) {
      return res.status(400).json({
        status: "error",
        message: "Please provide all required fields",
        details: {
          jobId: !jobId ? "Job ID is required" : null,
          description: !description ? "Description is required" : null,
          items: !items ? "Items are required" : null,
        },
      });
    }

    // Validate MongoDB ObjectIds
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    // Validate invoice items
    const itemValidation = validateInvoiceItems(items);
    if (!itemValidation.isValid) {
      return res.status(400).json({
        status: "error",
        message: itemValidation.error,
      });
    }

    // Check if job exists and is completed
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    if (job.status !== "Completed") {
      return res.status(400).json({
        status: "error",
        message: "Invoice can only be created for completed jobs",
        details: {
          jobStatus: job.status,
          requiredStatus: "Completed",
        },
      });
    }

    const resolvedTechnicianId =
      technicianId || job.assignedTechnician?.toString?.() || job.assignedTechnician;
    if (!resolvedTechnicianId || !mongoose.Types.ObjectId.isValid(resolvedTechnicianId)) {
      return res.status(400).json({
        status: "error",
        message: "A valid technician is required to create an invoice for this job",
      });
    }

    // Check if technician exists
    const technician = await Technician.findById(resolvedTechnicianId);
    if (!technician) {
      return res.status(404).json({
        status: "error",
        message: "Technician not found",
      });
    }

    const resolvedAgency =
      agencyId && mongoose.Types.ObjectId.isValid(agencyId)
        ? await Agency.findById(agencyId)
        : await resolveAgencyForJob(job);

    const agency = resolvedAgency;
    if (!agency) {
      return res.status(400).json({
        status: "error",
        message: "An agency is required to create an invoice for this job",
      });
    }

    // Check if invoice already exists for this job
    const existingInvoice = await Invoice.findOne({ jobId });
    if (existingInvoice) {
      return res.status(409).json({
        status: "error",
        message: "Invoice already exists for this job",
        details: {
          existingInvoiceId: existingInvoice._id,
          existingInvoiceNumber: existingInvoice.invoiceNumber,
        },
      });
    }

    // Calculate totals
    const { subtotal, totalCost } = calculateInvoiceTotals(items, tax);

    // Create invoice with calculated amounts
    const invoiceData = {
      jobId,
      technicianId: technician._id,
      agencyId: agency._id,
      description,
      items: items.map((item) => ({
        ...item,
        amount: (item.quantity || 0) * (item.rate || 0),
      })),
      subtotal,
      tax,
      totalCost,
      notes,
      status: "Draft",
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    job.hasInvoice = true;
    job.invoice = invoice._id;
    await job.save();

    // Populate references for response
    await invoice.populate(buildInvoicePopulateConfig());

    // Send notification to agency about new invoice
    try {
      const userInfo = getUserInfo(req);
      if (userInfo) {
        await notificationService.sendInvoiceCreatedNotification(
          invoice,
          job,
          technician,
          agency,
          userInfo
        );
      }
    } catch (notificationError) {
      console.error(
        "Failed to send invoice creation notification:",
        notificationError
      );
    }

    res.status(201).json({
      status: "success",
      message: "Invoice created successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Create invoice error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: "error",
        message: "Please check the form for errors",
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {}),
      });
    }

    res.status(500).json({
      status: "error",
      message: "Failed to create invoice",
    });
  }
});

// GET - Get invoice for specific job
router.get("/job/:jobId", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { jobId } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid job ID format",
      });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found",
      });
    }

    // Find invoice for the job
    const invoice = await Invoice.findOne({ jobId }).populate(
      buildInvoicePopulateConfig()
    );

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found for this job",
      });
    }

    normalizeCompletedJobInvoiceStatus(invoice);

    // Check access permissions
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser") {
      hasAccess = true;
    } else if (
      userInfo.type === "Agency" &&
      invoice.agencyId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (
      userInfo.type === "Technician" &&
      invoice.technicianId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (userInfo.type === "PropertyManager") {
      // Check if Property Manager has access to the property associated with the job
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId.toString());
      const jobPropertyId = invoice.jobId.property.toString();
      hasAccess = assignedPropertyIds.includes(jobPropertyId);
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to view this invoice.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Invoice retrieved successfully",
      data: {
        invoice: invoice.getFullDetails(),
        reviewData: await buildInvoiceReviewData(invoice),
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoice",
    });
  }
});

router.post(
  "/job/:jobId/generate-draft",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { jobId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid job ID format",
        });
      }

      const job = await Job.findById(jobId).populate(
        "assignedTechnician",
        "firstName lastName email phone"
      );

      if (!job) {
        return res.status(404).json({
          status: "error",
          message: "Job not found",
        });
      }

      if (job.status !== "Completed") {
        return res.status(400).json({
          status: "error",
          message: "Draft invoices can only be generated for completed jobs",
        });
      }

      const existingInvoice = await Invoice.findOne({ jobId });
      if (existingInvoice) {
        normalizeCompletedJobInvoiceStatus(existingInvoice);
        return res.status(409).json({
          status: "error",
          message: "Invoice already exists for this job",
          data: {
            invoice: existingInvoice.getFullDetails(),
          },
        });
      }

      if (!job.assignedTechnician?._id && !job.assignedTechnician) {
        return res.status(400).json({
          status: "error",
          message:
            "Cannot generate invoice because no technician is assigned to this job",
        });
      }

      const agency = await resolveAgencyForJob(job);
      if (!agency) {
        return res.status(400).json({
          status: "error",
          message: "No agency is associated with this job",
        });
      }

      const servicePrice = getAgencyServicePriceForJobType(agency, job.jobType);
      if (!servicePrice) {
        return res.status(400).json({
          status: "error",
          message:
            "No agency service pricing is configured for this completed job type",
        });
      }

      const items = [
        {
          name: servicePrice.serviceType,
          quantity: 1,
          rate: servicePrice.price,
          amount: servicePrice.price,
        },
      ];

      const { subtotal, totalCost } = calculateInvoiceTotals(items, 0);

      const invoice = new Invoice({
        jobId: job._id,
        technicianId:
          job.assignedTechnician._id || job.assignedTechnician,
        agencyId: agency._id,
        description: `${servicePrice.serviceType} for completed job ${job.job_id}`,
        items,
        subtotal,
        tax: 0,
        totalCost,
        notes: `Manually generated draft invoice for completed job ${job.job_id}.`,
        status: "Draft",
      });

      await invoice.save();

      job.hasInvoice = true;
      job.invoice = invoice._id;
      await job.save();

      await invoice.populate(buildInvoicePopulateConfig());

      return res.status(201).json({
        status: "success",
        message: "Draft invoice generated successfully",
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    } catch (error) {
      console.error("Generate draft invoice error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to generate draft invoice",
      });
    }
  }
);

router.patch("/:invoiceId", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { description, items, tax = 0, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    normalizeCompletedJobInvoiceStatus(invoice);

    if (invoice.status === "Sent" || invoice.status === "Paid") {
      return res.status(400).json({
        status: "error",
        message: "Sent or paid invoices cannot be edited",
      });
    }

    const itemValidation = validateInvoiceItems(items);
    if (!itemValidation.isValid) {
      return res.status(400).json({
        status: "error",
        message: itemValidation.error,
      });
    }

    const { subtotal, totalCost } = calculateInvoiceTotals(items, Number(tax || 0));

    invoice.description = description;
    invoice.items = items.map((item) => ({
      ...item,
      amount: (item.quantity || 0) * (item.rate || 0),
    }));
    invoice.tax = Number(tax || 0);
    invoice.subtotal = subtotal;
    invoice.totalCost = totalCost;
    invoice.notes = notes || "";

    await invoice.save();

    return res.status(200).json({
      status: "success",
      message: "Invoice updated successfully",
      data: {
        invoice: invoice.getFullDetails(),
      },
    });
  } catch (error) {
    console.error("Update invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update invoice",
    });
  }
});

router.patch(
  "/:invoiceId/status",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const { invoiceId } = req.params;
      const { status, paymentMethod = null, paymentReference = "" } = req.body;

      if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice ID format",
        });
      }

      if (!status || !["Draft", "Sent", "Paid"].includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid invoice status",
        });
      }

      const invoice = await Invoice.findById(invoiceId).populate(
        buildInvoicePopulateConfig()
      );

      if (!invoice) {
        return res.status(404).json({
          status: "error",
          message: "Invoice not found",
        });
      }

      normalizeCompletedJobInvoiceStatus(invoice);

      invoice.status = status;

      if (status === "Paid") {
        invoice.paymentMethod = paymentMethod || invoice.paymentMethod || "Other";
        invoice.paymentReference = paymentReference || invoice.paymentReference || "";
      }

      await invoice.save();

      return res.status(200).json({
        status: "success",
        message: `Invoice marked as ${status}`,
        data: {
          invoice: invoice.getFullDetails(),
          reviewData: await buildInvoiceReviewData(invoice),
        },
      });
    } catch (error) {
      console.error("Update invoice status error:", error);
      return res.status(500).json({
        status: "error",
        message: "Failed to update invoice status",
      });
    }
  }
);

// PATCH - Send invoice to agency and property managers
router.patch(
  "/:invoiceId/send",
  authenticate,
  fileUploadService.array("attachments", 5),
  async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const parseRecipientField = (value, fallback = []) => {
      if (!value) return fallback;
      if (Array.isArray(value)) return value;
      if (typeof value === "string") {
        try {
          return JSON.parse(value);
        } catch {
          return fallback;
        }
      }
      return fallback;
    };

    const to = parseRecipientField(req.body.to, []);
    const cc = parseRecipientField(req.body.cc, []);
    const bcc = parseRecipientField(req.body.bcc, []);
    const subject = req.body.subject;
    const bodyHtml = req.body.bodyHtml;
    const bodyText = req.body.bodyText;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(invoiceId).populate(
      buildInvoicePopulateConfig()
    );

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    // Check access permissions (only super users and team members can send invoices)
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser" || userInfo.type === "TeamMember") {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. Only super users and team members can send invoices.",
      });
    }

    // Check if invoice is already sent or paid
    if (invoice.status === "Sent" || invoice.status === "Paid") {
      return res.status(409).json({
        status: "error",
        message: `Invoice cannot be sent. Current status: ${invoice.status}`,
        details: {
          currentStatus: invoice.status,
          allowedStatuses: ["Draft"],
        },
        data: {
          invoice: invoice.getFullDetails(),
        },
      });
    }

    if (!subject || !String(subject).trim()) {
      return res.status(400).json({
        status: "error",
        message: "Email subject is required",
      });
    }

    if (!bodyHtml || !String(bodyHtml).trim()) {
      return res.status(400).json({
        status: "error",
        message: "Email body is required",
      });
    }

    try {
      const uploadedInvoiceAttachment = Array.isArray(req.files)
        ? req.files.find((file) => file.mimetype === "application/pdf")
        : null;

      const { reviewData } = await sendCompletedJobInvoiceDocuments({
        invoice,
        to,
        cc,
        bcc,
        subject,
        bodyHtml,
        bodyText,
        uploadedInvoiceAttachment,
        sentBy: userInfo,
      });

      res.status(200).json({
        status: "success",
        message: "Invoice sent successfully",
        data: {
          invoice: invoice.getFullDetails(),
          reviewData,
        },
      });
    } catch (emailError) {
      console.error("Failed to send invoice email:", emailError);
      const message =
        emailError?.message === "Inspection report is required before sending documents"
          ? emailError.message
          : emailError?.message === "At least one valid recipient is required"
            ? emailError.message
            : "Failed to send completed job documents";

      const statusCode =
        message === "Failed to send completed job documents" ? 500 : 400;

      return res.status(statusCode).json({
        status: "error",
        message,
      });
    }
  } catch (error) {
    console.error("Send invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send invoice",
    });
  }
  }
);

// GET - Get all invoices (with filtering and pagination)
router.get("/", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const userInfo = getUserInfo(req);
    if (!userInfo) {
      return res.status(400).json({
        status: "error",
        message: "Unable to determine user information",
      });
    }

    // Query parameters
    const {
      status,
      technicianId,
      agencyId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query based on user type
    let query = {};

    if (userInfo.type === "Agency") {
      query.agencyId = userInfo.id;
    } else if (userInfo.type === "Technician") {
      query.technicianId = userInfo.id;
    } else if (userInfo.type === "PropertyManager") {
      // Property Managers can only see invoices for properties they manage
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId);
      // We need to find jobs that belong to the assigned properties, then get invoices for those jobs
      const jobsForProperties = await Job.find({ property: { $in: assignedPropertyIds } }).select('_id');
      const jobIds = jobsForProperties.map(job => job._id);
      query.jobId = { $in: jobIds };
    }
    // Super users can see all invoices

    // Add filters
    if (status) query.status = status;
    if (technicianId) query.technicianId = technicianId;
    if (agencyId) query.agencyId = agencyId;

    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const normalizedQuery = normalizeCompletedJobInvoiceQuery(query);
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const invoices = await Invoice.find(normalizedQuery)
      .populate(buildInvoicePopulateConfig())
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalInvoices = await Invoice.countDocuments(normalizedQuery);

    // Get status counts for dashboard
    const statusCounts = await Invoice.aggregate([
      { $match: normalizedQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    res.status(200).json({
      status: "success",
      message: "Invoices retrieved successfully",
      data: {
        invoices: invoices.map((invoice) => {
          normalizeCompletedJobInvoiceStatus(invoice);
          return invoice.getSummary();
        }),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalInvoices / parseInt(limit)),
          totalItems: totalInvoices,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + invoices.length < totalInvoices,
          hasPrevPage: parseInt(page) > 1,
        },
        statistics: {
          statusCounts: normalizeStatusCounts(statusCounts),
          totalInvoices,
        },
      },
    });
  } catch (error) {
    console.error("Get invoices error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoices",
    });
  }
});

// GET - Get specific invoice by ID
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember', 'Agency', 'PropertyManager']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid invoice ID format",
      });
    }

    const invoice = await Invoice.findById(id).populate(
      buildInvoicePopulateConfig()
    );

    if (!invoice) {
      return res.status(404).json({
        status: "error",
        message: "Invoice not found",
      });
    }

    normalizeCompletedJobInvoiceStatus(invoice);

    // Check access permissions
    const userInfo = getUserInfo(req);
    let hasAccess = false;

    if (userInfo.type === "SuperUser") {
      hasAccess = true;
    } else if (
      userInfo.type === "Agency" &&
      invoice.agencyId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (
      userInfo.type === "Technician" &&
      invoice.technicianId.toString() === userInfo.id
    ) {
      hasAccess = true;
    } else if (userInfo.type === "PropertyManager") {
      // Check if Property Manager has access to the property associated with the job
      const assignedPropertyIds = userInfo.assignedProperties.map(prop => prop.propertyId.toString());
      const jobPropertyId = invoice.jobId.property.toString();
      hasAccess = assignedPropertyIds.includes(jobPropertyId);
    }

    if (!hasAccess) {
      return res.status(403).json({
        status: "error",
        message:
          "Access denied. You do not have permission to view this invoice.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Invoice retrieved successfully",
      data: {
        invoice: invoice.getFullDetails(),
        reviewData: await buildInvoiceReviewData(invoice),
      },
    });
  } catch (error) {
    console.error("Get invoice error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve invoice",
    });
  }
});

export default router;
