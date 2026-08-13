import { readFile } from "fs/promises";
import path from "path";
import { bucket } from "../config/gcs.js";
import Job from "../models/Job.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import emailService from "./email.service.js";
import notificationService from "./notification.service.js";
import {
  buildCompletedDocumentsHtml,
  buildCompletedDocumentsText,
  buildInvoiceReviewDates,
  generateCompletedJobInvoicePdfBuffer,
} from "./completedJobInvoiceTemplate.js";

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
    [
      {
        path: "property",
        select: "address",
      },
      {
        path: "latestInspectionReport",
        select: "pdf",
      },
    ]
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

  const validManagers = propertyManagers.filter((m) => isValidEmail(m.email));
  const toRecipients = dedupeRecipients(
    validManagers.length > 0
      ? validManagers.map((manager) => ({
          email: manager.email,
          name: formatRecipientName(manager),
        }))
      : agency?.email
        ? [{ email: agency.email, name: agency.contactPerson || agency.companyName }]
        : []
  );

  const resolvedReportFile =
    job?.reportFile || job?.latestInspectionReport?.pdf?.url || null;
  const reportSource = job?.reportFile
    ? "job"
    : job?.latestInspectionReport?.pdf?.url
      ? "latestInspectionReport"
      : null;
  const dates = buildInvoiceReviewDates(invoice, {});
  // Invoice is formally addressed to the Agency (the billed party)
  const attentionName =
    agency?.contactPerson ||
    agency?.companyName ||
    "Landlord";

  return {
    propertyAddress: job?.property?.address?.fullAddress || "Property",
    jobType: job?.jobType || "",
    jobNumber: job?.job_id || "",
    agencyName: agency?.companyName || "",
    attentionName,
    invoiceDate: dates.invoiceDate,
    dueDate: dates.dueDate,
    reportFile: resolvedReportFile,
    reportSource,
    hasReport: Boolean(resolvedReportFile),
    recipients: {
      to: toRecipients,
      cc: [],
      bcc: [],
    },
  };
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
  invoiceNumber,
}) => ({
  subject: `Tax Invoice - ${jobType} - ${propertyAddress}`,
  bodyHtml: `
    <p>Hello,</p>
    <p>Please find the tax invoice and inspection report attached for your records.</p>
    <p><strong>Invoice #:</strong> ${invoiceNumber || "Draft"}</p>
  `,
  bodyText:
    `Hello,\n\nPlease find the tax invoice and inspection report attached for your records.\nInvoice #: ${
      invoiceNumber || "Draft"
    }`,
});

export const sendCompletedJobInvoiceDocuments = async ({
  invoice,
  to = [],
  cc = [],
  bcc = [],
  subject,
  bodyHtml,
  bodyText,
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

  const invoicePdfPromise = generateCompletedJobInvoicePdfBuffer({
    invoice,
    reviewData,
    job: {
      description: invoice.description,
      jobType: reviewData.jobType,
      reportFile: reviewData.reportFile,
    },
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
      filename: `invoice-${invoice.invoiceNumber}.pdf`,
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

// Sends only the inspection report PDF (no invoice) to PM → agency fallback.
// Used for auto-send on report submission.
export const sendCompletedJobReport = async ({ job, property, sentBy = null }) => {
  const reportUrl = job.reportFile || job.latestInspectionReport?.pdf?.url || null;
  if (!reportUrl) {
    throw new Error("No inspection report available to send");
  }

  // Resolve recipients: active PMs on the property → agency fallback
  const Agency = (await import("../models/Agency.js")).default;
  const propertyManagers = property?._id
    ? await PropertyManager.find({
        "assignedProperties.propertyId": property._id,
        "assignedProperties.status": "Active",
      }).select("firstName lastName fullName email")
    : [];

  const validManagers = propertyManagers.filter((m) => isValidEmail(m.email));
  let toRecipients = dedupeRecipients(
    validManagers.map((m) => ({ email: m.email, name: formatRecipientName(m) }))
  );

  if (!toRecipients.length) {
    const agencyId = job.agencyId || job.owner?.ownerId;
    if (agencyId) {
      const agency = await Agency.findById(agencyId).select("companyName contactPerson email");
      if (agency?.email && isValidEmail(agency.email)) {
        toRecipients = [{ email: agency.email, name: agency.contactPerson || agency.companyName }];
      }
    }
  }

  if (!toRecipients.length) {
    throw new Error("No valid recipient found for inspection report (no PM or agency email)");
  }

  const reportAttachment = await fetchAttachmentFromUrl(
    reportUrl,
    `inspection-report-${job.job_id || job._id}.pdf`
  );

  const propertyAddress = property?.address?.fullAddress || "Property";
  const subject = `Inspection Report - ${job.jobType} - ${propertyAddress}`;
  const bodyHtml = `<p>Hello,</p><p>Please find the inspection report attached for <strong>${propertyAddress}</strong>.</p>`;

  await emailService.sendUserEmail({
    from: emailService.defaultFrom,
    to: toRecipients,
    subject,
    bodyHtml,
    bodyText: `Hello,\n\nPlease find the inspection report attached for ${propertyAddress}.`,
    attachments: reportAttachment ? [reportAttachment] : [],
  });

  console.log("[Report Email] Inspection report sent", {
    jobId: job._id,
    recipients: toRecipients.map((r) => r.email),
    sentBy: sentBy?.name || sentBy?.id || "system",
    timestamp: new Date().toISOString(),
  });
};
