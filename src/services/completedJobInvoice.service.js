import { readFile } from "fs/promises";
import path from "path";
import PDFDocument from "pdfkit";
import { bucket } from "../config/gcs.js";
import Job from "../models/Job.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import emailService from "./email.service.js";
import notificationService from "./notification.service.js";

const isValidEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const formatRecipientName = (recipient = {}) => {
  if (recipient.name) return recipient.name;
  if (recipient.fullName) return recipient.fullName;
  const fullName =
    `${recipient.firstName || ""} ${recipient.lastName || ""}`.trim();
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

export const normalizeCompletedJobInvoiceStatus = (invoice) => {
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

export const buildInvoiceReviewData = async (invoice) => {
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

  const toRecipients = dedupeRecipients(
    [
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
    ].filter(Boolean)
  );

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
    const parsedUrl =
      value.startsWith("http://") || value.startsWith("https://")
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

export const buildDefaultCompletedJobInvoiceEmailPayload = ({
  jobType,
  propertyAddress,
}) => ({
  subject: `Completed Job Documents - ${jobType} - ${propertyAddress}`,
  bodyHtml: `
    <p>Hello,</p>
    <p>The technician has completed this job. Please find the invoice and inspection report attached for your records.</p>
  `,
  bodyText:
    "Hello,\n\nThe technician has completed this job. Please find the invoice and inspection report attached for your records.",
});

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
