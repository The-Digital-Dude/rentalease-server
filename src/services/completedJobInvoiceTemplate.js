import path from "path";
import PDFDocument from "pdfkit";

export const COMPLETED_JOB_INVOICE_COMPANY = {
  name: "RentalEase Property Services Pty Ltd",
  abn: "63 625 625 872",
  addressLines: ["3/581 Dohertys Road", "Truganina VIC 3029"],
  phone: "03 5906 7723",
  email: "info@rentalease.com.au",
  tagline: "Property Compliance and Billing",
  logoPath: path.join(process.cwd(), "assets", "rentalease-logo.png"),
};

export const COMPLETED_JOB_INVOICE_BANK_DETAILS = {
  accountName: "RENTALEASE Pty Ltd",
  bankName: "CBA",
  bsb: "063779",
  accountNumber: "10578573",
  paymentTerms: "30 Days",
};

export const COMPLETED_JOB_INVOICE_TERMS = [
  "Our work comes with a 24-month workmanship warranty.",
  "No call-out charge applies if a second visit is required within 24 months from the date of work and our workmanship is at fault.",
  "If the issue is not related to our workmanship, call-out and rectification charges will apply and must be paid before fixes are carried out.",
  "If the invoice is not paid within 50 days, the responsibility for payment falls upon the landlord. If the landlord does not pay, the agency is responsible for payment and is legally obligated to do so.",
  "Failure to make payment may result in late payment fees and legal action.",
  "Interest on overdue invoices accrues daily from the due date until payment at a rate of 2.5% per calendar month, compounded monthly at the Contractor's discretion, after as well as before any judgment.",
  "If the Client defaults in payment of any invoice when due for fifty days (50), the Client shall indemnify the Contractor from and against all costs and disbursements incurred in pursuing the debt, including legal costs on a solicitor and own client basis and the Contractor's collection agency costs.",
  "Without prejudice to any other remedies the Contractor may have, if at any time the Client breaches any obligation under these terms and conditions, including payment obligations, the Contractor may suspend or terminate the supply of goods or services and is not liable for loss or damage arising from that action.",
];

const PAYMENT_DAYS = 30;
const PAGE = {
  width: 595,
  height: 842,
  margin: 36,
};

export const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount || 0);

export const formatInvoiceDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
};

export const addDays = (value, days) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date;
};

export const formatAddressLines = (address = "") => {
  if (!address) return ["Property"];
  const parts = String(address)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) return [address];
  if (parts.length === 2) return parts;
  return [parts.slice(0, -1).join(", "), parts[parts.length - 1]];
};

export const getAttentionName = (reviewData = {}) => {
  return (
    reviewData.attentionName?.trim() ||
    reviewData.recipients?.to?.[0]?.name?.trim() ||
    reviewData.agencyName?.trim() ||
    "Landlord"
  );
};

export const getWorksAuthorisedBy = (reviewData = {}) =>
  `Works authorised by ${getAttentionName(reviewData)} on behalf of the Landlord`;

export const getReportStatusLabel = (reviewData = {}, job = {}) => {
  if (reviewData.reportFile) {
    return job.reportFile ? "Available" : "Available from latest inspection report";
  }

  return "Missing";
};

export const buildInvoiceReviewDates = (invoice, reviewData = {}) => {
  const invoiceDate = reviewData.invoiceDate || invoice.createdAt;
  const dueDate =
    reviewData.dueDate || addDays(invoiceDate, PAYMENT_DAYS) || invoiceDate;

  return {
    invoiceDate,
    dueDate,
  };
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const textLines = (doc, text, options = {}) => {
  const startY = doc.y;
  doc.text(text, options);
  return doc.y - startY;
};

const drawLabelValueRow = (doc, label, value, x, y, labelWidth = 110, valueWidth = 220) => {
  doc
    .fontSize(9)
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .text(label, x, y, { width: labelWidth });
  doc
    .fontSize(9)
    .fillColor("#0f172a")
    .font("Helvetica")
    .text(value, x + labelWidth + 10, y, { width: valueWidth, lineGap: 1 });
};

const drawSectionBox = (doc, x, y, width, height, options = {}) => {
  const fillColor = options.fillColor || "#ffffff";
  const borderColor = options.borderColor || "#dbe4ee";
  doc.save();
  doc.roundedRect(x, y, width, height, 12).fillAndStroke(fillColor, borderColor);
  doc.restore();
};

const drawInvoiceHeader = (doc, reviewData, invoice) => {
  const headerY = PAGE.margin;
  const headerHeight = 110;
  const logoWidth = 115;
  const logoHeight = 28;
  const rightX = PAGE.width - PAGE.margin - 170;

  drawSectionBox(doc, PAGE.margin, headerY, PAGE.width - PAGE.margin * 2, headerHeight, {
    fillColor: "#ffffff",
    borderColor: "#ffffff",
  });

  try {
    doc.image(COMPLETED_JOB_INVOICE_COMPANY.logoPath, PAGE.margin + 2, headerY + 6, {
      width: logoWidth,
      height: logoHeight,
    });
  } catch {
    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("#0f4c81")
      .text("RentalEase", PAGE.margin + 2, headerY + 10);
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text(COMPLETED_JOB_INVOICE_COMPANY.name, PAGE.margin + 2, headerY + 42, {
      width: 250,
    });
  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor("#334155")
    .text(`A.B.N : ${COMPLETED_JOB_INVOICE_COMPANY.abn}`, PAGE.margin + 2, headerY + 58)
    .text(COMPLETED_JOB_INVOICE_COMPANY.addressLines[0], PAGE.margin + 2, headerY + 70)
    .text(COMPLETED_JOB_INVOICE_COMPANY.addressLines[1], PAGE.margin + 2, headerY + 82)
    .text(COMPLETED_JOB_INVOICE_COMPANY.phone, PAGE.margin + 2, headerY + 94);

  doc
    .font("Helvetica")
    .fontSize(8.8)
    .fillColor("#334155")
    .text(COMPLETED_JOB_INVOICE_COMPANY.email, PAGE.margin + 2, headerY + 106);

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#0f4c81")
    .text("TAX INVOICE", rightX, headerY + 2, { width: 170, align: "right" });

  const invoiceMetaY = headerY + 26;
  drawLabelValueRow(doc, "Invoice No:", invoice.invoiceNumber || "Draft", rightX - 30, invoiceMetaY, 78, 110);
  drawLabelValueRow(
    doc,
    "Invoice Date:",
    formatInvoiceDate(reviewData.invoiceDate || invoice.createdAt),
    rightX - 30,
    invoiceMetaY + 18,
    78,
    110
  );
  drawLabelValueRow(
    doc,
    "Due Date:",
    formatInvoiceDate(reviewData.dueDate || addDays(reviewData.invoiceDate || invoice.createdAt, PAYMENT_DAYS)),
    rightX - 30,
    invoiceMetaY + 36,
    78,
    110
  );

  doc
    .moveTo(PAGE.margin, headerY + headerHeight + 2)
    .lineTo(PAGE.width - PAGE.margin, headerY + headerHeight + 2)
    .stroke("#dbe4ee");

  return headerY + headerHeight + 14;
};

const drawRecipientBlock = (doc, reviewData, job, startY) => {
  const boxWidth = (PAGE.width - PAGE.margin * 2 - 12) / 2;
  const boxHeight = 124;
  const attentionName = getAttentionName(reviewData);
  const propertyAddress = reviewData.propertyAddress || "Property";
  const addressLines = formatAddressLines(propertyAddress);
  const recipientName = reviewData.agencyName || "Agency";

  drawSectionBox(doc, PAGE.margin, startY, boxWidth, boxHeight);
  drawSectionBox(doc, PAGE.margin + boxWidth + 12, startY, boxWidth, boxHeight);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text(recipientName, PAGE.margin + 14, startY + 12, {
      width: boxWidth - 28,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#64748b")
    .text("SERVICE ADDRESS", PAGE.margin + 14, startY + 32);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#1e293b");

  let addressY = startY + 46;
  addressLines.forEach((line) => {
    doc.text(line, PAGE.margin + 14, addressY, { width: boxWidth - 28 });
    addressY += 14;
  });

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor("#334155")
    .text(`For attention of: ${attentionName}`, PAGE.margin + 14, startY + 92, {
      width: boxWidth - 28,
    });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#475569")
    .text(getWorksAuthorisedBy(reviewData), PAGE.margin + 14, startY + 108, {
      width: boxWidth - 28,
    });

  const summaryX = PAGE.margin + boxWidth + 26;
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#64748b")
    .text("DESCRIPTION", summaryX, startY + 12);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#0f172a")
    .text(job.description || job.jobType || "Completed job invoice", summaryX, startY + 30, {
      width: boxWidth - 40,
      lineGap: 2,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#64748b")
    .text("TOTAL", summaryX + boxWidth - 100, startY + 12, {
      width: 80,
      align: "right",
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor("#0f4c81")
    .text(formatCurrency(invoice.totalCost), summaryX + boxWidth - 135, startY + 26, {
      width: 120,
      align: "right",
    });

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  if (items.length > 0) {
    let itemY = startY + 62;
    items.slice(0, 4).forEach((item) => {
      doc
        .font("Helvetica")
        .fontSize(8.4)
        .fillColor("#334155")
        .text(`${item.name || "-"}`, summaryX, itemY, { width: boxWidth - 28 });
      doc
        .font("Helvetica")
        .fontSize(8.4)
        .fillColor("#475569")
        .text(
          `${Number(item.quantity || 0)} x ${formatCurrency(item.rate || 0)} = ${formatCurrency(item.amount || 0)}`,
          summaryX,
          itemY + 10,
          { width: boxWidth - 28 }
        );
      itemY += 26;
    });
  }

  const totalsStartY = startY + boxHeight - 52;
  doc
    .moveTo(summaryX, totalsStartY - 4)
    .lineTo(summaryX + boxWidth - 36, totalsStartY - 4)
    .stroke("#e2e8f0");

  drawLabelValueRow(doc, "SUBTOTAL", formatCurrency(invoice.subtotal || 0), summaryX, totalsStartY, 72, 130);
  drawLabelValueRow(doc, "GST", formatCurrency(invoice.tax || 0), summaryX, totalsStartY + 16, 72, 130);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0f4c81")
    .text("TOTAL", summaryX, totalsStartY + 32, { width: 72 });
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#0f4c81")
    .text(formatCurrency(invoice.totalCost || 0), summaryX + 72, totalsStartY + 32, {
      width: 130,
      align: "right",
    });

  return startY + boxHeight + 14;
};

const drawHowToPaySection = (doc, startY) => {
  const sectionHeight = 118;
  drawSectionBox(doc, PAGE.margin, startY, PAGE.width - PAGE.margin * 2, sectionHeight);

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text("HOW TO PAY", PAGE.margin + 14, startY + 12);

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#334155")
    .text("We accept payment by: Bank transfer", PAGE.margin + 14, startY + 30);

  const leftX = PAGE.margin + 14;
  const rightX = PAGE.margin + 250;
  const bankRows = [
    ["Name:", COMPLETED_JOB_INVOICE_BANK_DETAILS.accountName],
    ["Bank:", COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName],
    ["BSB:", COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb],
    ["Account Number:", COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber],
    ["Payment Terms:", `Payment terms are ${COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms}`],
  ];

  let rowY = startY + 48;
  bankRows.forEach(([label, value], index) => {
    const x = index < 3 ? leftX : rightX;
    const y = index < 3 ? rowY + index * 18 : rowY + (index - 3) * 18;
    drawLabelValueRow(doc, label, value, x, y, 90, 180);
  });

  return startY + sectionHeight + 14;
};

const drawTermsSection = (doc, startY) => {
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#0f172a")
    .text("Terms and conditions:", PAGE.margin, startY);

  let y = startY + 18;
  COMPLETED_JOB_INVOICE_TERMS.forEach((term, index) => {
    const prefix = `${index + 1}. `;
    const textWidth = PAGE.width - PAGE.margin * 2 - 14;
    const availableHeight = doc.page.height - PAGE.margin - y;
    if (availableHeight < 60) {
      doc.addPage();
      y = PAGE.margin;
    }

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#334155")
      .text(`${prefix}${term}`, PAGE.margin + 6, y, {
        width: textWidth,
        lineGap: 2,
      });
    y = doc.y + 4;
  });

  return y + 10;
};

const drawFooter = (doc, y) => {
  if (y > doc.page.height - PAGE.margin - 28) {
    doc.addPage();
    y = PAGE.margin;
  }

  doc
    .moveTo(PAGE.margin, y)
    .lineTo(PAGE.width - PAGE.margin, y)
    .stroke("#dbe4ee");
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#64748b")
    .text("Generated by RentalEase CRM", PAGE.margin, y + 8);
  doc
    .text(`Generated on ${formatInvoiceDate(new Date().toISOString())}`, PAGE.margin, y + 8, {
      width: PAGE.width - PAGE.margin * 2,
      align: "right",
    });
};

export const buildCompletedJobInvoiceEmailPayload = ({
  jobType,
  propertyAddress,
  invoiceNumber,
}) => ({
  subject: `Tax Invoice - ${jobType} - ${propertyAddress}`,
  bodyHtml: `
    <p>Hello,</p>
    <p>Please find the tax invoice attached for <strong>${escapeHtml(propertyAddress)}</strong>.</p>
    <p><strong>Invoice #:</strong> ${escapeHtml(invoiceNumber)}</p>
    <p><strong>Payment terms:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms)}</p>
    <p><strong>Bank:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName)} | <strong>BSB:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb)} | <strong>Account:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber)}</p>
    <p>Please also see the inspection report attached to the completed job documents.</p>
  `,
  bodyText: [
    "Hello,",
    "",
    `Please find the tax invoice attached for ${propertyAddress}.`,
    `Invoice #: ${invoiceNumber}`,
    `Payment terms: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms}`,
    `Bank: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName} | BSB: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb} | Account: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber}`,
    "",
    "Please also see the inspection report attached to the completed job documents.",
  ].join("\n"),
});

export const generateCompletedJobInvoicePdfBuffer = async ({
  invoice,
  reviewData = {},
  job = {},
}) => {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#0f172a");
    let cursorY = drawInvoiceHeader(doc, reviewData, invoice);
    cursorY = drawRecipientBlock(doc, reviewData, job, cursorY);
    cursorY = drawHowToPaySection(doc, cursorY);
    cursorY = drawTermsSection(doc, cursorY);
    if (invoice.notes) {
      if (cursorY > doc.page.height - PAGE.margin - 60) {
        doc.addPage();
        cursorY = PAGE.margin;
      }
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor("#0f172a")
        .text("Notes", PAGE.margin, cursorY);
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#334155")
        .text(invoice.notes, PAGE.margin, cursorY + 16, {
          width: PAGE.width - PAGE.margin * 2,
          lineGap: 2,
        });
      cursorY = doc.y + 8;
    }
    drawFooter(doc, cursorY + 8);
    doc.end();
  });
};

export const buildCompletedDocumentsHtml = ({
  customBodyHtml,
  invoice,
  reviewData,
}) => {
  const dates = buildInvoiceReviewDates(invoice, reviewData);
  const propertyAddress = reviewData?.propertyAddress || "Property";
  const attentionName = getAttentionName(reviewData);
  const reportStatus = getReportStatusLabel(reviewData, { reportFile: reviewData?.reportFile });

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      ${customBodyHtml || ""}
      <h2 style="margin:24px 0 12px;">Tax Invoice</h2>
      <p><strong>Invoice #:</strong> ${escapeHtml(invoice.invoiceNumber || "Draft")}</p>
      <p><strong>Invoice Date:</strong> ${escapeHtml(formatInvoiceDate(dates.invoiceDate))}</p>
      <p><strong>Due Date:</strong> ${escapeHtml(formatInvoiceDate(dates.dueDate))}</p>
      <p><strong>Property:</strong> ${escapeHtml(propertyAddress)}</p>
      <p><strong>Attention:</strong> ${escapeHtml(attentionName)}</p>
      <p><strong>Inspection Report:</strong> ${escapeHtml(reportStatus)}</p>
      <p><strong>Payment Terms:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms)}</p>
      <p><strong>Bank:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName)} | <strong>BSB:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb)} | <strong>Account:</strong> ${escapeHtml(COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber)}</p>
    </div>
  `;
};

export const buildCompletedDocumentsText = ({
  customBodyText,
  invoice,
  reviewData,
}) => {
  const dates = buildInvoiceReviewDates(invoice, reviewData);
  const lines = [
    customBodyText || "",
    "",
    "Tax Invoice",
    `Invoice #: ${invoice.invoiceNumber || "Draft"}`,
    `Invoice Date: ${formatInvoiceDate(dates.invoiceDate)}`,
    `Due Date: ${formatInvoiceDate(dates.dueDate)}`,
    `Property: ${reviewData?.propertyAddress || "Property"}`,
    `Attention: ${getAttentionName(reviewData)}`,
    `Inspection Report: ${getReportStatusLabel(reviewData, { reportFile: reviewData?.reportFile })}`,
    `Payment Terms: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms}`,
    `Bank: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName} | BSB: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb} | Account: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber}`,
  ];

  if (invoice.items?.length) {
    lines.push("", "Invoice Items:");
    invoice.items.forEach((item) => {
      lines.push(
        `- ${item.name || "-"}: ${Number(item.quantity || 0)} x ${formatCurrency(
          item.rate || 0
        )} = ${formatCurrency(item.amount || 0)}`
      );
    });
  }

  lines.push(
    "",
    `Subtotal: ${formatCurrency(invoice.subtotal || 0)}`,
    `GST: ${formatCurrency(invoice.tax || 0)}`,
    `Total: ${formatCurrency(invoice.totalCost || 0)}`
  );

  if (invoice.notes) {
    lines.push("", `Notes: ${invoice.notes}`);
  }

  return lines.join("\n").trim();
};
