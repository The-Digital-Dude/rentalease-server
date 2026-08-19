import path from "path";
import PDFDocument from "pdfkit";

export const COMPLETED_JOB_INVOICE_COMPANY = {
  name: "RentalEase Property Services Pty Ltd",
  abn: "53 691 110 639",
  addressLines: ["3/581 Dohertys Road Truganina", "Melbourne, Vic, 3029", "Australia"],
  phone: "03 5906 7723",
  email: "info@rentalease.com.au",
  website: "https://rentalease.com.au/",
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

const GST_RATE = 0.1;
const PAYMENT_DAYS = 30;
const PAGE = { width: 595, height: 842, margin: 40 };

// ── GST helpers ──────────────────────────────────────────────────────────────
// All prices stored in DB are GST-inclusive (gross).
export const netFromGross = (gross = 0) => (gross || 0) / (1 + GST_RATE);
export const gstFromGross = (gross = 0) => (gross || 0) / (1 + GST_RATE) * GST_RATE;

export const formatCurrency = (amount = 0) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(amount || 0);

export const formatInvoiceDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
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
  const parts = String(address).split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return [address];
  if (parts.length === 2) return parts;
  return [parts.slice(0, -1).join(", "), parts[parts.length - 1]];
};

export const getAttentionName = (reviewData = {}) =>
  reviewData.attentionName?.trim() ||
  reviewData.recipients?.to?.[0]?.name?.trim() ||
  reviewData.agencyName?.trim() ||
  "Landlord";

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
  const dueDate = reviewData.dueDate || addDays(invoiceDate, PAYMENT_DAYS) || invoiceDate;
  return { invoiceDate, dueDate };
};

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#39;");

// ── Column layout for line-items table ───────────────────────────────────────
const COL = {
  desc:   { x: PAGE.margin,       w: 220 },
  price:  { x: PAGE.margin + 230, w:  60 },
  qty:    { x: PAGE.margin + 298, w:  40 },
  gst:    { x: PAGE.margin + 346, w:  40 },
  amount: { x: PAGE.margin + 394, w:  82 },
};

// ── Header: logo + company block (left), TAX INVOICE + meta (right) ──────────
const drawHeader = (doc, reviewData, invoice) => {
  const y = PAGE.margin;
  const rightBlockX = 340;

  // Logo
  try {
    doc.image(COMPLETED_JOB_INVOICE_COMPANY.logoPath, PAGE.margin, y, { width: 110 });
  } catch {
    doc.font("Helvetica-Bold").fontSize(18).fillColor("#0f4c81")
      .text("RentalEase", PAGE.margin, y + 4);
  }

  // "TAX INVOICE" heading
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#0f172a")
    .text("TAX INVOICE", rightBlockX, y, { width: 215, align: "right" });

  // Company details
  const companyY = y + 36;
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a")
    .text(COMPLETED_JOB_INVOICE_COMPANY.name, rightBlockX, companyY, { width: 215, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor("#334155");
  let cy = companyY + 14;
  doc.text(COMPLETED_JOB_INVOICE_COMPANY.abn, rightBlockX, cy, { width: 215 });
  cy += 13;
  COMPLETED_JOB_INVOICE_COMPANY.addressLines.forEach((line) => {
    doc.text(line, rightBlockX, cy, { width: 215 });
    cy += 13;
  });

  // Invoice meta grid (date / due date / invoice no)
  const metaY = cy + 6;
  const dates = buildInvoiceReviewDates(invoice, reviewData);
  const metaRows = [
    ["Invoice date:", formatInvoiceDate(dates.invoiceDate), "Invoice no:", String(invoice.invoiceNumber || "Draft")],
    ["Due date:",    formatInvoiceDate(dates.dueDate),      "",            ""],
  ];
  metaRows.forEach(([l1, v1, l2, v2], i) => {
    const ry = metaY + i * 16;
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(l1, rightBlockX, ry, { width: 65 });
    doc.font("Helvetica").fontSize(9).fillColor("#0f172a").text(v1, rightBlockX + 68, ry, { width: 60 });
    if (l2) {
      doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(l2, rightBlockX + 135, ry, { width: 60 });
      doc.font("Helvetica").fontSize(9).fillColor("#0f172a").text(v2, rightBlockX + 198, ry, { width: 60 });
    }
  });

  // Divider
  const dividerY = Math.max(y + 90, metaY + 44);
  doc.moveTo(PAGE.margin, dividerY).lineTo(PAGE.width - PAGE.margin, dividerY).lineWidth(0.5).stroke("#cbd5e1");

  return dividerY + 14;
};

// ── Recipient block: agency + property manager + address ─────────────────────
const drawRecipientBlock = (doc, reviewData) => {
  const startY = doc.y;
  const agencyName = reviewData.agencyName || "Agency";
  const attentionName = getAttentionName(reviewData);
  const propertyAddress = reviewData.propertyAddress || "Property";

  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0f172a")
    .text(agencyName, PAGE.margin, startY, { width: 280 });

  const curY = doc.y + 10;
  doc.font("Helvetica-Oblique").fontSize(9).fillColor("#334155")
    .text(propertyAddress, PAGE.margin, curY, { width: 280 });

  return doc.y + 20;
};

// ── Items table header row ────────────────────────────────────────────────────
const drawTableHeader = (doc, y) => {
  // Header background
  doc.rect(PAGE.margin - 4, y - 4, PAGE.width - PAGE.margin * 2 + 8, 18)
    .fill("#f1f5f9");

  const cols = [
    { label: "DESCRIPTION", x: COL.desc.x,   w: COL.desc.w,   align: "left"  },
    { label: "PRICE",        x: COL.price.x,  w: COL.price.w,  align: "right" },
    { label: "QTY",          x: COL.qty.x,    w: COL.qty.w,    align: "right" },
    { label: "AMOUNT",       x: COL.amount.x, w: COL.amount.w, align: "right" },
  ];
  cols.forEach(({ label, x, w, align }) => {
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0f172a")
      .text(label, x, y, { width: w, align });
  });

  return y + 18;
};

// ── Single item row ───────────────────────────────────────────────────────────
const drawItemRow = (doc, item, y) => {
  // item.amount is gross (GST-inclusive); display net price
  const grossAmount = item.amount || 0;
  const netAmount   = netFromGross(grossAmount);
  const qty         = Number(item.quantity || 1);
  const netRate     = netAmount / qty;

  // Main description
  doc.font("Helvetica").fontSize(9).fillColor("#0f172a")
    .text(item.name || "-", COL.desc.x, y, { width: COL.desc.w });

  // Sub-description (notes field on item if present, or second line of name)
  const subDesc = item.notes || item.subDescription || "";
  let descHeight = doc.currentLineHeight(true);
  if (subDesc) {
    doc.font("Helvetica").fontSize(8).fillColor("#64748b")
      .text(subDesc, COL.desc.x, y + descHeight + 1, { width: COL.desc.w });
    descHeight += doc.currentLineHeight(true) + 1;
  }

  const rowH = Math.max(descHeight + 4, 18);

  doc.font("Helvetica").fontSize(9).fillColor("#0f172a")
    .text(formatCurrency(netRate),   COL.price.x,  y, { width: COL.price.w,  align: "right", lineBreak: false })
    .text(String(qty),               COL.qty.x,    y, { width: COL.qty.w,    align: "right", lineBreak: false })
    .text(formatCurrency(netAmount), COL.amount.x, y, { width: COL.amount.w, align: "right", lineBreak: false });

  return y + rowH + 8;
};

// ── Totals block ─────────────────────────────────────────────────────────────
const drawTotals = (doc, invoice, y) => {
  const grossTotal = invoice.subtotal || 0;
  const netTotal   = netFromGross(grossTotal);
  const gstTotal   = gstFromGross(grossTotal);
  const totalCost  = invoice.totalCost || grossTotal;

  // Totals occupy the right two columns (label + amount)
  // labelX starts at the QTY column so "Net Amount :" has room; value right-aligns in the AMOUNT column
  const totalsLineX = COL.qty.x;
  const totalsLineEnd = PAGE.width - PAGE.margin;
  const labelX = COL.qty.x;
  const labelW = COL.amount.x - COL.qty.x - 8;   // ~88px — fits "Net Amount :"
  const valueX = COL.amount.x;
  const valueW = COL.amount.w;

  // Thin divider above totals
  doc.moveTo(totalsLineX, y).lineTo(totalsLineEnd, y).lineWidth(0.5).stroke("#cbd5e1");
  y += 8;

  const rows = [
    ["Net Amount :", formatCurrency(netTotal)],
    ["GST (10%) :",  formatCurrency(gstTotal)],
  ];
  rows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(9).fillColor("#334155")
      .text(label, labelX, y, { width: labelW, align: "left", lineBreak: false });
    doc.font("Helvetica").fontSize(9).fillColor("#0f172a")
      .text(value, valueX, y, { width: valueW, align: "right", lineBreak: false });
    y += 16;
  });

  // Divider before Total
  doc.moveTo(totalsLineX, y).lineTo(totalsLineEnd, y).lineWidth(0.5).stroke("#cbd5e1");
  y += 6;

  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a")
    .text("Total :", labelX, y, { width: labelW, align: "left", lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a")
    .text(formatCurrency(totalCost), valueX, y, { width: valueW, align: "right", lineBreak: false });

  return y + 24;
};

// ── Payment Information section ───────────────────────────────────────────────
const drawPaymentSection = (doc, invoice, y) => {
  const totalCost = invoice.totalCost || invoice.subtotal || 0;

  doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).lineWidth(0.5).stroke("#cbd5e1");
  y += 14;

  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a")
    .text("PAYMENT INFORMATION", PAGE.margin, y);
  y += 18;

  // Left column: invoice summary
  const leftX  = PAGE.margin;
  const rightX = PAGE.margin + 220;

  doc.font("Helvetica").fontSize(9).fillColor("#334155")
    .text(`Invoice number: ${invoice.invoiceNumber || "Draft"}`, leftX, y)
    .text(`Amount (AUD): ${formatCurrency(totalCost)}`, leftX, y + 14);

  // Right column: bank details with emphasis
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a")
    .text("Please add the invoice number to the payment transfer!", rightX, y, { width: 295 });

  const bankRows = [
    ["Bank account name:",   COMPLETED_JOB_INVOICE_BANK_DETAILS.accountName],
    ["Bank account number:", COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber],
    ["Bank name:",           COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName],
    ["BSB:",                 COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb],
  ];
  let by = y + 14;
  bankRows.forEach(([label, value]) => {
    doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(label, rightX, by, { width: 120 });
    doc.font("Helvetica").fontSize(9).fillColor("#0f172a").text(value, rightX + 124, by, { width: 170 });
    by += 14;
  });

  return Math.max(doc.y, by) + 14;
};

// ── Footer bar ────────────────────────────────────────────────────────────────
const drawFooter = (doc) => {
  const footerY = PAGE.height - 28;
  doc.rect(0, footerY - 4, PAGE.width, 32).fill("#f8fafc");
  doc.moveTo(0, footerY - 5).lineTo(PAGE.width, footerY - 5).lineWidth(0.5).stroke("#e2e8f0");

  const parts = [
    COMPLETED_JOB_INVOICE_COMPANY.name,
    COMPLETED_JOB_INVOICE_COMPANY.abn,
    COMPLETED_JOB_INVOICE_COMPANY.website,
    COMPLETED_JOB_INVOICE_COMPANY.email,
    COMPLETED_JOB_INVOICE_COMPANY.phone,
  ];
  doc.font("Helvetica").fontSize(7.5).fillColor("#64748b")
    .text(parts.join("   ·   "), PAGE.margin, footerY + 2, {
      width: PAGE.width - PAGE.margin * 2,
      align: "center",
    });
};

// ── Main PDF generator ────────────────────────────────────────────────────────
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

    // Header
    let cursorY = drawHeader(doc, reviewData, invoice);

    // Recipient
    doc.y = cursorY;
    cursorY = drawRecipientBlock(doc, reviewData);

    // Items table
    cursorY = drawTableHeader(doc, cursorY);
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    items.forEach((item) => {
      // New page if not enough room for a row (~40px)
      if (cursorY > PAGE.height - PAGE.margin - 140) {
        doc.addPage();
        cursorY = PAGE.margin;
        cursorY = drawTableHeader(doc, cursorY);
      }
      cursorY = drawItemRow(doc, item, cursorY);
    });

    // Thin rule after last item
    doc.moveTo(PAGE.margin, cursorY).lineTo(PAGE.width - PAGE.margin, cursorY)
      .lineWidth(0.3).stroke("#e2e8f0");
    cursorY += 6;

    // Totals
    cursorY = drawTotals(doc, invoice, cursorY);

    // Payment Information
    if (cursorY > PAGE.height - PAGE.margin - 120) { doc.addPage(); cursorY = PAGE.margin; }
    cursorY = drawPaymentSection(doc, invoice, cursorY);

    // Terms
    if (cursorY > PAGE.height - PAGE.margin - 60) { doc.addPage(); cursorY = PAGE.margin; }
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#0f172a").text("Terms and Conditions:", PAGE.margin, cursorY);
    cursorY = doc.y + 6;
    COMPLETED_JOB_INVOICE_TERMS.forEach((term, i) => {
      if (cursorY > PAGE.height - PAGE.margin - 50) { doc.addPage(); cursorY = PAGE.margin; }
      doc.font("Helvetica").fontSize(8).fillColor("#475569")
        .text(`${i + 1}. ${term}`, PAGE.margin, cursorY, {
          width: PAGE.width - PAGE.margin * 2,
          lineGap: 1,
        });
      cursorY = doc.y + 4;
    });

    drawFooter(doc);
    doc.end();
  });
};

// ── Email body builders ───────────────────────────────────────────────────────
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
    <p>The inspection report is also attached.</p>
  `,
  bodyText: [
    "Hello,",
    "",
    `Please find the tax invoice attached for ${propertyAddress}.`,
    `Invoice #: ${invoiceNumber}`,
    `Payment terms: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.paymentTerms}`,
    `Bank: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bankName} | BSB: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.bsb} | Account: ${COMPLETED_JOB_INVOICE_BANK_DETAILS.accountNumber}`,
    "",
    "The inspection report is also attached.",
  ].join("\n"),
});

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
      const gross = item.amount || 0;
      lines.push(
        `- ${item.name || "-"}: ${Number(item.quantity || 0)} x ${formatCurrency(netFromGross(item.rate || gross / Math.max(item.quantity, 1)))} = ${formatCurrency(netFromGross(gross))}`
      );
    });
  }

  const grossTotal = invoice.subtotal || 0;
  lines.push(
    "",
    `Net Amount: ${formatCurrency(netFromGross(grossTotal))}`,
    `GST: ${formatCurrency(gstFromGross(grossTotal))}`,
    `Total: ${formatCurrency(invoice.totalCost || grossTotal)}`
  );

  if (invoice.notes) lines.push("", `Notes: ${invoice.notes}`);
  return lines.join("\n").trim();
};
