import PDFDocument from "pdfkit";
import fetch from "node-fetch";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import { bucket } from "../config/gcs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAND_PRIMARY = "#2F5D7C";
const COLORS = {
  primary: BRAND_PRIMARY,
  primaryAccent: "#5C86A5",
  primarySoft: "#EEF4F7",
  text: "#1F2933",
  textSecondary: "#52606D",
  border: "#D7E2EA",
  success: "#2F855A",
  error: "#C0565B",
  warning: "#D69E2E",
  neutralBackground: "#F8FBFC",
  successSoft: "#E8F6EE",
  errorSoft: "#FCEBEC",
};

const PAGE = {
  margin: 60,
  headerHeight: 50,
  footerHeight: 40,
  content: {
    width: 595.28 - 60 * 2, // A4 width (595.28) minus left and right margins
  },
};

// Global page counter
let currentPageNumber = 1;

const ensurePageSpace = (doc, required = 80) => {
  const footerSpace = PAGE.footerHeight + 20;
  const currentY = doc.y;
  const pageHeight = doc.page.height;
  const availableSpace = pageHeight - currentY - PAGE.margin - footerSpace;

  // If we have enough space, continue on current page
  if (required <= availableSpace) {
    return false; // No page break needed
  }

  // Only add new page if we're not already at the top
  if (currentY > PAGE.margin + PAGE.headerHeight + 20) {
    // Add page number to current page before creating new one
    drawPageFooter(doc, currentPageNumber);

    doc.addPage();
    currentPageNumber++; // Increment page counter

    // Add header to new page and set starting Y position
    const startY = drawPageHeader(doc);
    doc.y = startY;
    doc.fillColor(COLORS.text);
    return true; // Page break occurred
  }

  return false;
};

const drawRoomDetailTable = (doc, title, rows = [], options = {}) => {
  if (!rows.length) {
    return;
  }

  // Calculate required space more accurately
  const headerSpace = 50;
  const minRowHeight = 24;
  const estimatedRowSpace = rows.length * minRowHeight;
  const totalRequired = headerSpace + estimatedRowSpace;

  ensurePageSpace(doc, Math.min(totalRequired, 200));

  if (title) {
    drawSectionHeader(doc, title);
  }

  const tableX = PAGE.margin;
  const tableWidth = doc.page.width - PAGE.margin * 2;
  const questionWidth = Math.floor(tableWidth * 0.65); // 65% for questions
  const answerWidth = tableWidth - questionWidth;
  const headerHeight = options.hideHeaders ? 0 : 26;

  // Draw table header (unless hideHeaders option is true)
  if (!options.hideHeaders) {
    const headerY = doc.y;
    doc
      .rect(tableX, headerY, questionWidth, headerHeight)
      .fill(COLORS.primaryAccent)
      .stroke(COLORS.border);

    doc
      .rect(tableX + questionWidth, headerY, answerWidth, headerHeight)
      .fill(COLORS.primaryAccent)
      .stroke(COLORS.border);

    // Header text
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("Item", tableX + 15, headerY + 8, {
        width: questionWidth - 30,
        align: "left",
      });

    doc.text("Result", tableX + questionWidth + 15, headerY + 8, {
      width: answerWidth - 30,
      align: "left",
    });

    doc.y = headerY + headerHeight;
  }

  const questionTextOptions = {
    width: questionWidth - 30,
    align: "left",
    lineGap: 2,
  };
  const answerTextOptions = {
    width: answerWidth - 30,
    align: "left",
    lineGap: 2,
  };

  // Draw data rows
  rows.forEach((row, index) => {
    const question = row.label || row.question || "";
    const answer = row.value ?? row.answer ?? "—";

    // Calculate row height based on content
    doc.font("Helvetica-Bold").fontSize(10);
    const questionHeight = doc.heightOfString(question, questionTextOptions);
    doc.font("Helvetica").fontSize(10);
    const answerHeight = doc.heightOfString(String(answer), answerTextOptions);
    const contentHeight = Math.max(questionHeight, answerHeight);
    const rowHeight = Math.max(26, contentHeight + 12);

    // Check if we need a new page for this row
    ensurePageSpace(doc, rowHeight + 10);

    const rowY = doc.y;
    const fillColor = index % 2 === 0 ? "white" : COLORS.primarySoft;

    // Draw row background
    doc
      .rect(tableX, rowY, questionWidth, rowHeight)
      .fill(fillColor)
      .stroke(COLORS.border);

    doc
      .rect(tableX + questionWidth, rowY, answerWidth, rowHeight)
      .fill(fillColor)
      .stroke(COLORS.border);

    // Add text content
    const questionTop = rowY + Math.max(6, (rowHeight - questionHeight) / 2);
    const answerTop = rowY + Math.max(6, (rowHeight - answerHeight) / 2);

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(question, tableX + 15, questionTop, questionTextOptions);

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(
        String(answer),
        tableX + questionWidth + 15,
        answerTop,
        answerTextOptions
      );

    doc.y = rowY + rowHeight;
  });

  doc.y += 6; // Space after table
};

const getReportTitle = (template, job) => {
  const jobType = template?.jobType || job?.jobType;

  const titleMap = {
    MinimumSafetyStandard: "Minimum Safety Standard Report",
    Electrical: "Electrical and Smoke Alarm Report",
    Gas: "Gas Compliance Report",
    Smoke: "Smoke Compliance Report",
  };

  return titleMap[jobType] || "Inspection Report";
};

const getComplianceStandards = (template, job) => {
  const jobType = template?.jobType || job?.jobType;

  const standardsMap = {
    MinimumSafetyStandard: [
      "Residential Tenancies Regulations 2021",
      "Building Code of Australia",
      "Australian Standards AS/NZS 3000",
    ],
    Electrical: [
      "AS/NZS 3000 Wiring Rules",
      "AS/NZS 3017:2022 Electrical Installations",
      "Residential Tenancies Regulations 2021",
    ],
    Gas: [
      "AS 4575 Gas installations",
      "AS 3786:2014 Gas appliances",
      "Residential Tenancies Regulations 2021",
    ],
    Smoke: [
      "AS/NZS 3017:2022 Smoke alarms",
      "AS 3786:2014 Installation requirements",
      "Residential Tenancies Regulations 2021",
    ],
  };

  return standardsMap[jobType] || ["Residential Tenancies Regulations 2021"];
};

const formatDisplayDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatNumericDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-AU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const REPORT_STATUS_CANDIDATES = [
  "overall-status",
  "overall-compliance",
  "combined-compliance-status",
  "overall-property-compliance",
  "overall-smoke-compliance",
  "overall-gas-compliance",
  "overall-assessment",
  "electrical-outcome",
  "smoke-outcome",
  "compliance-status",
];

const stripMarkdownPrefix = (value = "") =>
  String(value).replace(/^[\s>*\-•]+/, "").trim();

const normalizeStatusLabel = (value) => {
  if (!value && value !== false) {
    return "Pending";
  }

  const raw = stripMarkdownPrefix(String(value));
  const lower = raw.toLowerCase();

  const statusLabelMap = {
    compliant: "Compliant",
    "fully-compliant": "Compliant",
    "compliant-with-minor-issues": "Compliant",
    "all-compliant": "Compliant",
    satisfactory: "Compliant",
    pass: "Compliant",
    "no-faults": "Compliant",
    "non-compliant": "Non-Compliant",
    "non-compliant-work-required": "Non-Compliant",
    "non-compliant-urgent": "Non-Compliant",
    "issues-identified": "Non-Compliant",
    "faults-identified": "Non-Compliant",
    "repairs-required": "Non-Compliant",
    "replacements-required": "Non-Compliant",
    "urgent-work-required": "Non-Compliant",
    unsafe: "Non-Compliant",
    fail: "Non-Compliant",
    meets: "Compliant",
    does_not_meet: "Non-Compliant",
    "does-not-meet": "Non-Compliant",
    satisfactory: "Compliant",
    unsatisfactory: "Non-Compliant",
  };

  if (statusLabelMap[lower]) {
    return statusLabelMap[lower];
  }

  if (lower.includes("non-compliant") || lower.includes("unsafe")) {
    return "Non-Compliant";
  }

  if (lower.includes("compliant") || lower.includes("satisfactory")) {
    return "Compliant";
  }

  return raw;
};

const isNonCompliantStatus = (value) =>
  normalizeStatusLabel(value).toLowerCase() === "non-compliant";

const getPropertyAddress = (property) =>
  property?.address?.fullAddress ||
  property?.address?.street ||
  property?.fullAddress ||
  property?.address ||
  "N/A";

const humanizeKey = (value = "") =>
  String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const stringifySummaryValue = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object")) {
      return value.join(", ");
    }

    return value
      .map((item) => {
        if (!item || typeof item !== "object") {
          return String(item || "");
        }

        return Object.entries(item)
          .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
          .map(([key, entryValue]) => `${humanizeKey(key)}: ${entryValue}`)
          .join(" | ");
      })
      .filter(Boolean)
      .join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined && entryValue !== null && entryValue !== "")
      .map(([key, entryValue]) => `${humanizeKey(key)}: ${entryValue}`)
      .join(" | ");
  }

  return String(value).trim();
};

const dedupeItems = (items = []) =>
  [...new Set(items.map((item) => stripMarkdownPrefix(item)).filter(Boolean))];

const extractSummaryInsights = ({ report, template, job, technician }) => {
  const formData = report?.formData || {};
  const sections = template?.sections || [];
  const fieldDefinitions = new Map();

  sections.forEach((section) => {
    (section.fields || []).forEach((field) => {
      fieldDefinitions.set(`${section.id}.${field.id}`, {
        sectionTitle: section.title || humanizeKey(section.id),
        fieldLabel: field.label || humanizeKey(field.id),
        fieldType: field.type,
      });
    });
  });

  const foundStatuses = [];
  const recommendations = [];
  const urgentRectifications = [];
  const ongoingIssues = [];
  let hasExplicitNonCompliance = false;
  let hasExplicitCompliance = false;

  Object.entries(formData).forEach(([sectionId, sectionData]) => {
    if (!sectionData || typeof sectionData !== "object") {
      return;
    }

    Object.entries(sectionData).forEach(([fieldId, rawValue]) => {
      const definition =
        fieldDefinitions.get(`${sectionId}.${fieldId}`) || {};
      const label = definition.fieldLabel || humanizeKey(fieldId);
      const fieldType = definition.fieldType || "";
      const lowerKey = `${sectionId}.${fieldId}`.toLowerCase();

      if (REPORT_STATUS_CANDIDATES.includes(fieldId)) {
        foundStatuses.push(rawValue);
      }

      if (
        /(overall|compliance|outcome|status|assessment|result)/i.test(lowerKey)
      ) {
        const normalized = normalizeStatusLabel(rawValue);
        if (normalized === "Non-Compliant") {
          hasExplicitNonCompliance = true;
        }
        if (normalized === "Compliant") {
          hasExplicitCompliance = true;
        }
      }

      if (Array.isArray(rawValue) && rawValue.every((item) => item && typeof item === "object")) {
        if (
          lowerKey.includes("rectification") ||
          lowerKey.includes("remedial") ||
          lowerKey.includes("actions") ||
          lowerKey.includes("work-order")
        ) {
          rawValue.forEach((row) => {
            const issue = stringifySummaryValue(row);
            if (!issue) {
              return;
            }
            const priority = String(row.priority || row.severity || "").toLowerCase();
            const issueText = priority
              ? `${issue} (${humanizeKey(priority)})`
              : issue;
            if (priority.includes("urgent") || priority.includes("mandatory")) {
              urgentRectifications.push(issueText);
            } else {
              recommendations.push(issueText);
            }
          });
        }
        return;
      }

      const value = stringifySummaryValue(rawValue);
      if (!value) {
        return;
      }

      if (
        /(ongoing|tenant.*issue|pm.*issue|property.*issue)/i.test(lowerKey) &&
        value.toLowerCase() !== "no"
      ) {
        ongoingIssues.push(`${label}: ${value}`);
      }

      if (
        /(comment|comments|note|notes|recommendation|recommendations|follow-up|action)/i.test(
          lowerKey
        )
      ) {
        const itemText = `${label}: ${value}`;
        if (
          isNonCompliantStatus(value) ||
          /urgent|mandatory|immediate|non-compliant|repair|required/i.test(value)
        ) {
          hasExplicitNonCompliance = true;
          urgentRectifications.push(itemText);
        } else {
          recommendations.push(itemText);
        }
      }

      if (
        /(rectification|remedial|issue)/i.test(lowerKey) &&
        /urgent|mandatory|immediate|non-compliant|repair|required/i.test(value)
      ) {
        hasExplicitNonCompliance = true;
        urgentRectifications.push(`${label}: ${value}`);
      }
    });
  });

  (report?.sectionsSummary || []).forEach((item) => {
    if (!item?.flag) {
      return;
    }

    hasExplicitNonCompliance = true;
    const summaryText = [item.label, item.value].filter(Boolean).join(": ");
    if (summaryText) {
      urgentRectifications.push(summaryText);
    }
  });

  const statusSource = foundStatuses.find((entry) => entry !== undefined && entry !== null && entry !== "");
  let reportStatus = normalizeStatusLabel(statusSource || job?.status);

  if (reportStatus !== "Compliant" && reportStatus !== "Non-Compliant") {
    if (hasExplicitNonCompliance || urgentRectifications.length) {
      reportStatus = "Non-Compliant";
    } else if (hasExplicitCompliance || recommendations.length) {
      reportStatus = "Compliant";
    } else {
      reportStatus = "Compliant";
    }
  }

  return {
    reportStatus,
    recommendations: dedupeItems(recommendations).slice(0, 8),
    urgentRectifications: dedupeItems(urgentRectifications).slice(0, 8),
    ongoingIssues: dedupeItems(ongoingIssues).slice(0, 4),
    technicianName:
      `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
      "N/A",
    technicianLicense: technician?.licenseNumber || "N/A",
  };
};

const drawSummaryList = (doc, title, items = [], options = {}) => {
  if (!items.length) {
    return;
  }

  const {
    backgroundColor = COLORS.primarySoft,
    titleColor = COLORS.primary,
    bodyColor = COLORS.text,
  } = options;
  const boxX = PAGE.margin;
  const boxWidth = doc.page.width - PAGE.margin * 2;
  const titleOptions = {
    width: boxWidth - 32,
  };
  const itemOptions = {
    width: boxWidth - 36,
    lineGap: 2,
  };

  doc.font("Helvetica-Bold").fontSize(11);
  const titleHeight = doc.heightOfString(title, titleOptions);

  doc.font("Helvetica").fontSize(10);
  const itemHeights = items.map((item) =>
    doc.heightOfString(`• ${item}`, itemOptions)
  );
  const itemsHeight = itemHeights.reduce((sum, height) => sum + height, 0);
  const contentHeight = 14 + titleHeight + 8 + itemsHeight;
  const boxHeight = Math.max(60, contentHeight + 14);

  ensurePageSpace(doc, boxHeight + 16);
  const boxY = doc.y;

  doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 12).fill(backgroundColor);
  doc
    .fillColor(titleColor)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(title, boxX + 16, boxY + 14, titleOptions);

  let lineY = boxY + 14 + titleHeight + 8;
  items.forEach((item, index) => {
    doc
      .fillColor(bodyColor)
      .font("Helvetica")
      .fontSize(10)
      .text(`• ${item}`, boxX + 18, lineY, itemOptions);
    lineY += itemHeights[index];
  });

  doc.fillColor(COLORS.text);
  doc.y = boxY + boxHeight + 8;
};

const drawPageHeader = (doc) => {
  const headerY = 20;
  const headerHeight = PAGE.headerHeight;

  // Header background line
  doc
    .moveTo(PAGE.margin, headerY + headerHeight - 5)
    .lineTo(doc.page.width - PAGE.margin, headerY + headerHeight - 5)
    .stroke(COLORS.border);

  // RentalEase Logo (left side)
  try {
    const logoPath = path.join(
      __dirname,
      "../../assets/reports/cover-pages/logo-report-header.png"
    );
    doc.image(logoPath, PAGE.margin, headerY, {
      width: 120,
      height: 30,
    });
  } catch (error) {
    console.error("Logo not found, using text fallback:", error);
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor(COLORS.primary)
      .text("RentalEase", PAGE.margin, headerY + 8);
  }

  // Company address (right side)
  const addressX = doc.page.width - PAGE.margin - 200;
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text("3/581 Dohertys Road", addressX, headerY + 2, {
      align: "right",
      width: 200,
    })
    .text("Truganina VIC 3029", addressX, headerY + 14, {
      align: "right",
      width: 200,
    })
    .text("ABN 63 625 625 872", addressX, headerY + 26, {
      align: "right",
      width: 200,
    });

  return headerY + headerHeight + 10; // Return the Y position after header
};

// Footer function for all pages except cover
const drawPageFooter = (doc, pageNumber) => {
  const footerY = doc.page.height - PAGE.footerHeight - 10;

  // Footer top line
  doc
    .moveTo(PAGE.margin, footerY - 5)
    .lineTo(doc.page.width - PAGE.margin, footerY - 5)
    .stroke(COLORS.border);

  // Page number (left side)
  doc
    .fillColor(COLORS.textSecondary)
    .fontSize(10)
    .font("Helvetica")
    .text(`Page ${pageNumber}`, PAGE.margin, footerY + 10);

  // Contact icons (right side)
  const iconSize = 20;
  const iconSpacing = 35;
  const iconsStartX = doc.page.width - PAGE.margin - iconSpacing * 2 - iconSize;

  // Phone icon
  const phoneX = iconsStartX;
  drawContactIcon(
    doc,
    phoneX,
    footerY + 5,
    iconSize,
    "phone",
    "tel:0359067723"
  );

  // Website icon
  const websiteX = phoneX + iconSpacing;
  drawContactIcon(
    doc,
    websiteX,
    footerY + 5,
    iconSize,
    "website",
    "https://www.rentalease.com.au/"
  );

  // Email icon
  const emailX = websiteX + iconSpacing;
  drawContactIcon(
    doc,
    emailX,
    footerY + 5,
    iconSize,
    "email",
    "mailto:info@rentalease.com.au"
  );
};

// Helper function to draw contact icons with links
const drawContactIcon = (doc, x, y, size, type, link) => {
  // Create clickable area
  doc.link(x, y, size, size, link);

  // Draw circular background
  doc.circle(x + size / 2, y + size / 2, size / 2).fill(COLORS.primary);

  // Draw icon using geometric shapes instead of Unicode
  doc.fillColor("white");

  switch (type) {
    case "phone":
      // Draw phone shape with lines
      const phoneX = x + size / 2;
      const phoneY = y + size / 2;
      doc
        .roundedRect(phoneX - 4, phoneY - 5, 8, 10, 2)
        .fill()
        .rect(phoneX - 2, phoneY - 3, 4, 1)
        .fill()
        .rect(phoneX - 1.5, phoneY + 2, 3, 1)
        .fill();
      break;
    case "website":
      // Draw globe with lines
      const globeX = x + size / 2;
      const globeY = y + size / 2;
      doc
        .circle(globeX, globeY, 6)
        .stroke()
        .moveTo(globeX - 6, globeY)
        .lineTo(globeX + 6, globeY)
        .stroke()
        .moveTo(globeX, globeY - 6)
        .lineTo(globeX, globeY + 6)
        .stroke();
      break;
    case "email":
      // Draw envelope shape
      const envX = x + size / 2;
      const envY = y + size / 2;
      doc
        .rect(envX - 6, envY - 4, 12, 8)
        .fill()
        .moveTo(envX - 6, envY - 4)
        .lineTo(envX, envY + 1)
        .lineTo(envX + 6, envY - 4)
        .stroke()
        .strokeColor("white")
        .lineWidth(1);
      break;
  }
};

const drawProfessionalCoverPage = (
  doc,
  { property, job, technician, report, template }
) => {
  const reportTitle = getReportTitle(template, job);
  const jobType = template?.jobType || job?.jobType;

  // Select appropriate cover image based on job type
  let coverImagePath;
  switch (jobType) {
    case "Gas":
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/gas_safety_report_cover_page.jpg"
      );
      break;
    case "GasSmoke":
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/gas_smoke_combined_report_cover_page.jpg"
      );
      break;
    case "Electrical":
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/electrical_safety_report_cover_page.jpg"
      );
      break;
    case "Smoke":
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/smoke_alarm_safety_report_cover_page.jpg"
      );
      break;
    case "MinimumSafetyStandard":
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/minimum_standard_report_cover_page.jpg"
      );
      break;
    default:
      // Default to gas safety cover for any other report types
      coverImagePath = path.join(
        __dirname,
        "../../assets/reports/cover-pages/gas_safety_report_cover_page.jpg"
      );
      break;
  }

  // Use the appropriate cover image for the report type
  try {
    doc.image(coverImagePath, 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
    });
  } catch (error) {
    console.error(
      `Cover image not found for ${jobType} report, using fallback:`,
      error
    );
    // Fallback to gradient background
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(COLORS.primary);

    // Add decorative accent
    doc.rect(0, 0, doc.page.width, 180).fill(COLORS.primaryAccent);

    // Add title
    doc
      .fillColor("white")
      .fontSize(30)
      .font("Helvetica-Bold")
      .text(reportTitle, 60, 250, {
        width: doc.page.width - 120,
        align: "left",
        lineGap: 10,
      });
  }

  // Prepare the next page for report content
  doc.addPage();
  currentPageNumber++;

  const startY = drawPageHeader(doc);
  doc.y = startY;
  doc.fillColor(COLORS.text);
};

// New function to draw property details section on page 2
const drawPropertyDetailsSection = (
  doc,
  { property, job, technician, report, template }
) => {
  doc.fillColor(COLORS.text);
  const propertyAddress = getPropertyAddress(property);
  const inspectionDate = formatDisplayDate(report?.submittedAt || job?.dueDate);
  const summaryInsights = extractSummaryInsights({
    report,
    template,
    job,
    technician,
  });
  const reportTitle = getReportTitle(template, job);
  const statusColor = isNonCompliantStatus(summaryInsights.reportStatus)
    ? COLORS.error
    : COLORS.success;
  const statusBackground = isNonCompliantStatus(summaryInsights.reportStatus)
    ? COLORS.errorSoft
    : COLORS.successSoft;

  doc.y += 8;
  doc
    .fillColor(COLORS.primary)
    .fontSize(20)
    .font("Helvetica-Bold")
    .text(reportTitle, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      align: "center",
    });

  doc.y += 10;

  const pillWidth = 170;
  const pillHeight = 30;
  const pillX = PAGE.margin + (doc.page.width - PAGE.margin * 2 - pillWidth) / 2;
  const pillY = doc.y;

  doc.roundedRect(pillX, pillY, pillWidth, pillHeight, 15).fill(statusBackground);
  doc
    .fillColor(statusColor)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(summaryInsights.reportStatus, pillX, pillY + 9, {
      width: pillWidth,
      align: "center",
    });

  doc.y = pillY + pillHeight + 10;

  const tableWidth = doc.page.width - PAGE.margin * 2;
  const labelWidth = Math.floor(tableWidth * 0.34);
  const valueWidth = tableWidth - labelWidth;

  const details = [
    { label: "Address", value: propertyAddress },
    {
      label: "Technician Details",
      value: `${summaryInsights.technicianName} | Licence: ${summaryInsights.technicianLicense}`,
    },
    { label: "Assessment", value: summaryInsights.reportStatus },
    { label: "Inspection Date", value: inspectionDate },
  ];

  let rowY = doc.y;
  details.forEach((detail, index) => {
    const labelOptions = {
      width: labelWidth - 20,
      lineGap: 2,
    };
    const valueOptions = {
      width: valueWidth - 20,
      lineGap: 2,
    };
    doc.font("Helvetica-Bold").fontSize(11);
    const labelHeight = doc.heightOfString(`${detail.label}:`, labelOptions);
    doc.font("Helvetica").fontSize(11);
    const valueHeight = doc.heightOfString(String(detail.value), valueOptions);
    const rowHeight = Math.max(28, Math.max(labelHeight, valueHeight) + 10);

    if (index % 2 === 0) {
      doc
        .rect(PAGE.margin, rowY - 3, tableWidth, rowHeight)
        .fill(COLORS.neutralBackground);
    }

    doc
      .fillColor(COLORS.text)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(`${detail.label}:`, PAGE.margin + 10, rowY + 4, labelOptions);

    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(11)
      .font("Helvetica")
      .text(
        detail.value,
        PAGE.margin + labelWidth + 10,
        rowY + 4,
        valueOptions
      );

    rowY += rowHeight;
  });

  doc.y = rowY + 4;

  if (isNonCompliantStatus(summaryInsights.reportStatus)) {
    drawSummaryList(
      doc,
      "Urgent / Mandatory Rectifications",
      summaryInsights.urgentRectifications.length
        ? summaryInsights.urgentRectifications
        : ["Non-compliance recorded. Review technician comments below."],
      {
        backgroundColor: COLORS.errorSoft,
        titleColor: COLORS.error,
      }
    );
  }

  drawSummaryList(
    doc,
    isNonCompliantStatus(summaryInsights.reportStatus)
      ? "Recommendations From Tradie"
      : "Recommendations",
    summaryInsights.recommendations.length
      ? summaryInsights.recommendations
      : ["No additional recommendations recorded."],
    {
      backgroundColor: isNonCompliantStatus(summaryInsights.reportStatus)
        ? "#FFF6E6"
        : COLORS.successSoft,
      titleColor: isNonCompliantStatus(summaryInsights.reportStatus)
        ? COLORS.warning
        : COLORS.success,
    }
  );

  if (summaryInsights.ongoingIssues.length) {
    drawSummaryList(doc, "Ongoing Issues Raised On Site", summaryInsights.ongoingIssues);
  }
};

// New function to draw checks conducted and outcomes section
const drawChecksAndOutcomesSection = async (
  doc,
  { template, report, job, property, technician }
) => {
  ensurePageSpace(doc, 100);

  drawSectionHeader(doc, "Checks Conducted And Outcomes");

  const tableWidth = doc.page.width - PAGE.margin * 2;
  const checkWidth = Math.floor(tableWidth * 0.7);
  const outcomeWidth = tableWidth - checkWidth;

  // Table header
  const headerY = doc.y;
  const headerHeight = 30;

  // Header background
  doc
    .rect(PAGE.margin, headerY, checkWidth, headerHeight)
    .fill("#FF6B4A")
    .stroke();

  doc
    .rect(PAGE.margin + checkWidth, headerY, outcomeWidth, headerHeight)
    .fill("#FF6B4A")
    .stroke();

  // Header text
  doc
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text("Check Type", PAGE.margin + 10, headerY + 8);

  doc.text("Outcome", PAGE.margin + checkWidth + 10, headerY + 8);

  doc.y = headerY + headerHeight;

  // Get inspection outcomes from the report
  const sectionsSummary = report.sectionsSummary || [];

  if (sectionsSummary.length > 0) {
    sectionsSummary.forEach((item, index) => {
      const rowY = doc.y;
      const rowHeight = 30;

      // Alternate row background
      if (index % 2 === 0) {
        doc
          .rect(PAGE.margin, rowY, tableWidth, rowHeight)
          .fill(COLORS.neutralBackground);
      }

      // Check type
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica")
        .text(item.label || "Check", PAGE.margin + 15, rowY + 8, {
          width: checkWidth - 30,
        });

      // Outcome
      let outcomeText = "Pass";
      if (item.flag) {
        outcomeText = "Fault(s) Identified";
      } else if (typeof item.value === "boolean") {
        outcomeText = item.value ? "Pass" : "Fault(s) Identified";
      } else if (item.value) {
        outcomeText = String(item.value);
      }

      doc
        .fillColor(item.flag ? COLORS.error : COLORS.success)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(outcomeText, PAGE.margin + checkWidth + 15, rowY + 8, {
          width: outcomeWidth - 30,
        });

      doc.y += rowHeight;
    });
  } else {
    // Fallback if no summary data
    const defaultChecks = [
      { check: getReportTitle(template, job), outcome: "Pass" },
    ];

    defaultChecks.forEach((item, index) => {
      const rowY = doc.y;
      const rowHeight = 30;

      if (index % 2 === 0) {
        doc
          .rect(PAGE.margin, rowY, tableWidth, rowHeight)
          .fill(COLORS.neutralBackground);
      }

      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica")
        .text(item.check, PAGE.margin + 15, rowY + 8, {
          width: checkWidth - 30,
        });

      doc
        .fillColor(COLORS.success)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(item.outcome, PAGE.margin + checkWidth + 15, rowY + 8, {
          width: outcomeWidth - 30,
        });

      doc.y += rowHeight;
    });
  }

  doc.y += 30;
};

const drawSignatureFromData = async (
  doc,
  signatureData,
  x,
  y,
  maxWidth = 200,
  maxHeight = 80
) => {
  if (!signatureData || typeof signatureData !== "string") {
    return;
  }

  try {
    // If it's a base64 data URL, extract the base64 part
    const base64Data = signatureData.startsWith("data:")
      ? signatureData.split(",")[1]
      : signatureData;

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Add the signature image to the PDF
    doc.image(imageBuffer, x, y, {
      fit: [maxWidth, maxHeight],
      align: "center",
    });
  } catch (error) {
    console.error("Error drawing signature:", error);
    // Fallback: draw a text placeholder
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Oblique")
      .text("[Digital Signature]", x, y + maxHeight / 2);
  }
};

const drawDeclarationSection = async (
  doc,
  { template, job, technician, report }
) => {
  ensurePageSpace(doc, 200);

  drawSectionHeader(doc, "Declaration and Certification");

  const reportTitle = getReportTitle(template, job);
  const inspectorName =
    `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
    "Inspector";
  // Declaration text
  const declarationText = `This ${reportTitle.toLowerCase()} summarises the inspection findings and certifies that the attending technician has performed the required checks and recommendations recorded below.`;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(declarationText, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      lineGap: 3,
    });

  doc.y += 20;
  // List compliance standards
  const complianceStandards = getComplianceStandards(template, job);
  complianceStandards.forEach((standard) => {
    doc.fontSize(10).text(`• ${standard}`, PAGE.margin + 20, doc.y);
    doc.y += 16;
  });

  doc.y += 10;

  // Professional certification statement
  const certificationText = `I certify that this inspection has been conducted by a qualified inspector and the information contained in this report is true and accurate to the best of my knowledge at the time of inspection.`;

  doc.fontSize(10).text(certificationText, PAGE.margin, doc.y, {
    width: doc.page.width - PAGE.margin * 2,
    lineGap: 3,
  });

  doc.y += 30;

  // Ensure space for the entire inspector certification section
  const certificationSectionHeight = 120; // Header + box + margins
  ensurePageSpace(doc, certificationSectionHeight);

  // Signature area
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(COLORS.text)
    .text("Inspector Certification:", PAGE.margin, doc.y);

  doc.y += 20;

  // Look for signature data in form responses
  const formData = report?.formData || {};
  let signatureData = null;

  console.log(
    "[PDF] Looking for signature data in formData:",
    Object.keys(formData)
  );

  // Check all sections for signature fields
  Object.keys(formData).forEach((sectionId) => {
    const sectionData = formData[sectionId] || {};
    Object.keys(sectionData).forEach((fieldId) => {
      const fieldValue = sectionData[fieldId];
      const fieldType = typeof fieldValue;
      const fieldPreview =
        fieldType === "string" ? fieldValue.substring(0, 50) : fieldValue;
      console.log(
        `[PDF] Checking field ${sectionId}.${fieldId}:`,
        fieldType,
        fieldPreview
      );

      if (
        fieldId.includes("signature") &&
        fieldType === "string" &&
        fieldValue &&
        fieldValue.startsWith("data:")
      ) {
        signatureData = fieldValue;
        console.log(
          "[PDF] Found signature data:",
          signatureData.substring(0, 100)
        );
      }
    });
  });

  console.log(
    "[PDF] Final signatureData:",
    signatureData ? "Found" : "Not found"
  );

  // Signature box
  const boxY = doc.y;

  if (signatureData) {
    // Draw larger box to accommodate signature
    doc.roundedRect(PAGE.margin, boxY, 400, 100, 8).stroke(COLORS.border);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLORS.textSecondary)
      .text("Inspector Name:", PAGE.margin + 10, boxY + 10)
      .text(inspectorName, PAGE.margin + 10, boxY + 25)
      .text("Date:", PAGE.margin + 10, boxY + 40)
      .text(
        formatDisplayDate(report?.submittedAt || new Date()),
        PAGE.margin + 80,
        boxY + 40
      );

    // Draw actual signature
    await drawSignatureFromData(
      doc,
      signatureData,
      PAGE.margin + 250,
      boxY + 10,
      140,
      70
    );

    doc.y = boxY + 110;
  } else {
    // Original smaller box
    doc.roundedRect(PAGE.margin, boxY, 300, 60, 8).stroke(COLORS.border);

    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(COLORS.textSecondary)
      .text("Inspector Name:", PAGE.margin + 10, boxY + 10)
      .text(inspectorName, PAGE.margin + 10, boxY + 25)
      .text("Date:", PAGE.margin + 10, boxY + 40)
      .text(
        formatDisplayDate(report?.submittedAt || new Date()),
        PAGE.margin + 80,
        boxY + 40
      );

    // Digital signature indicator (fallback)
    doc
      .fillColor(COLORS.success)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("✓ Digitally Certified", PAGE.margin + 320, boxY + 25);

    doc.y = boxY + 80;
  }
};

const drawGasHazardsSection = (doc) => {
  const sectionTitle = "Gas Installation Hazards and Compliance";
  const bulletPoints = [
    "the gas distribution company if the installation uses natural gas, or",
    "the gas retailer if the installation uses LPG.",
  ];

  const requiredSpace = 220;
  ensurePageSpace(doc, requiredSpace);

  drawSectionHeader(doc, sectionTitle);

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(
      "Gas Safety (Gas Installation) Regulations 2018 — Part 3, Division 3, Section 21",
      PAGE.margin,
      doc.y,
      {
        width: doc.page.width - PAGE.margin * 2,
        lineGap: 3,
      }
    );

  doc.y += 18;

  const narrative =
    "If a gasfitter finds a dangerous defect in a gas installation, they must act immediately to make it safe and notify the property owner and occupier. If it’s not possible or reasonable for the gasfitter to fix the issue themselves, they must promptly notify Energy Safe Victoria. They must also inform:";

  // Calculate text height to properly advance y position
  const narrativeHeight = doc.heightOfString(narrative, {
    width: doc.page.width - PAGE.margin * 2,
  });

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(narrative, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      lineGap: 3,
    });

  doc.y += narrativeHeight + 20;

  bulletPoints.forEach((point) => {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica")
      .text(`• ${point}`, PAGE.margin + 15, doc.y, {
        width: doc.page.width - PAGE.margin * 2 - 15,
        lineGap: 3,
      });
    doc.y += 8;
  });

  const conclusionText =
    "This ensures that any hazardous situation is reported and addressed quickly, keeping the property safe and compliant.";
  const conclusionHeight = doc.heightOfString(conclusionText, {
    width: doc.page.width - PAGE.margin * 2,
  });

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(conclusionText, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      lineGap: 3,
    });

  doc.y += conclusionHeight + 30;
};

const drawNextStepsSection = (doc, { template, job, report }) => {
  const jobType = template?.jobType || job?.jobType;

  ensurePageSpace(doc, 180);
  drawSectionHeader(doc, "Next Compliance Schedule");

  // Calculate next inspection dates based on job type
  const getNextInspectionDate = (jobType) => {
    const inspectionDate = new Date(report?.submittedAt || new Date());
    const nextDate = new Date(inspectionDate);

    switch (jobType) {
      case "Gas":
        nextDate.setFullYear(nextDate.getFullYear() + 2); // 24 months
        break;
      case "GasSmoke":
        nextDate.setFullYear(nextDate.getFullYear() + 1); // 12 months (smoke alarms need annual checks)
        break;
      case "Electrical":
        nextDate.setFullYear(nextDate.getFullYear() + 2); // 24 months
        break;
      case "Smoke":
        nextDate.setFullYear(nextDate.getFullYear() + 1); // 12 months
        break;
      case "MinimumSafetyStandard":
        nextDate.setFullYear(nextDate.getFullYear() + 1); // 12 months
        break;
      default:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
    }

    return formatDisplayDate(nextDate);
  };

  const nextInspectionDate = getNextInspectionDate(jobType);

  // Next inspection information
  doc
    .fillColor(COLORS.text)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text("Next Inspection Due:", PAGE.margin, doc.y);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(COLORS.textSecondary)
    .text(nextInspectionDate, PAGE.margin + 150, doc.y - 14);

  doc.y += 25;

  const narrativeMap = {
    Electrical:
      "This electrical safety check has been completed in line with the Residential Tenancies Regulations 2021 and AS/NZS 3019: Electrical Installations — Periodic Verification. It ensures the property's electrical system is safe and free from damage or deterioration that could pose a risk. Any defects or safety concerns identified during the inspection are reported for corrective action.",
    Gas: "This gas safety check has been completed in line with the Residential Tenancies Regulations 2021 and AS/NZS 5601.1: Gas Installations. It confirms appliances, pipework, and ventilation are operating safely and documents any defects that require corrective action.",
    GasSmoke:
      "This combined gas and smoke safety inspection follows the Residential Tenancies Regulations 2021, AS/NZS 5601.1: Gas Installations, and AS 3786: Smoke Alarms. It verifies that both gas systems and smoke alarms remain safe, compliant, and supported by documented follow-up actions where required.",
    Smoke:
      "This smoke alarm safety inspection has been completed in accordance with the Residential Tenancies Regulations 2021 and AS 3786: Smoke Alarms. It confirms alarms are correctly installed, powered, and positioned to alert occupants in the event of a fire.",
    MinimumSafetyStandard:
      "This minimum safety standards inspection has been carried out to satisfy the Residential Tenancies Regulations 2021 minimum housing standards. It confirms the property remains fit for occupancy and records any areas that require remedial action to maintain compliance.",
  };

  const narrative = narrativeMap[jobType];
  if (narrative) {
    const movedToNewPage = ensurePageSpace(doc, 140);
    if (movedToNewPage) {
      drawSectionHeader(doc, "Next Compliance Schedule");
    }
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica")
      .text(narrative, PAGE.margin, doc.y, {
        width: doc.page.width - PAGE.margin * 2,
        lineGap: 3,
      });

    doc.y += 20;
  }
};

const drawMinimumStandardStatusTable = (
  doc,
  title,
  rows,
  sectionData,
  {
    commentsLabel = "Comments",
    meetsLabel = "Meets",
    doesNotMeetLabel = "D/N Meet"
  } = {}
) => {
  if (!rows.length) {
    return;
  }

  ensurePageSpace(doc, 50 + rows.length * 12);
  drawSectionHeader(doc, title);

  const tableX = PAGE.margin;
  const tableWidth = doc.page.width - PAGE.margin * 2; // Match section header width
  const labelWidth = Math.min(200, tableWidth * 0.35); // Reduced label width
  const statusWidth = 70; // Reduced status column width
  const actionWidth = tableWidth - labelWidth - statusWidth * 2; // Larger comments column
  const headerHeight = 20; // Reduced header height
  const cellPadding = 4; // Minimal padding for very compact layout
  const rowMinHeight = 18; // Much smaller row height

  // Header row - Modern unified design
  const headerY = doc.y;

  // Draw header background with modern styling
  doc
    .rect(tableX, headerY, tableWidth, headerHeight)
    .fill("#f8f9fa")
    .strokeColor("#dee2e6")
    .lineWidth(1)
    .stroke();

  // Draw vertical dividers for header
  const dividerColor = "#dee2e6";
  doc.strokeColor(dividerColor).lineWidth(1);

  doc
    .moveTo(tableX + labelWidth, headerY)
    .lineTo(tableX + labelWidth, headerY + headerHeight)
    .stroke();

  doc
    .moveTo(tableX + labelWidth + statusWidth, headerY)
    .lineTo(tableX + labelWidth + statusWidth, headerY + headerHeight)
    .stroke();

  doc
    .moveTo(tableX + labelWidth + statusWidth * 2, headerY)
    .lineTo(tableX + labelWidth + statusWidth * 2, headerY + headerHeight)
    .stroke();

  // Header text with better vertical centering
  const headerTextY = headerY + (headerHeight - 10) / 2;
  doc.fillColor("#495057").font("Helvetica-Bold").fontSize(10);

  doc.text("Area", tableX + cellPadding, headerTextY, {
    width: labelWidth - cellPadding * 2,
    align: "left",
  });

  doc.text(meetsLabel, tableX + labelWidth, headerTextY, {
    width: statusWidth,
    align: "center",
  });

  doc.text(doesNotMeetLabel, tableX + labelWidth + statusWidth, headerTextY, {
    width: statusWidth,
    align: "center",
  });

  doc.text(
    commentsLabel,
    tableX + labelWidth + statusWidth * 2 + cellPadding,
    headerTextY,
    {
      width: actionWidth - cellPadding * 2,
      align: "left",
    }
  );

  // Reset text formatting for data rows
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(9.5);
  doc.y = headerY + headerHeight;

  rows.forEach((row, index) => {
    ensurePageSpace(doc, 30);
    const status = sectionData?.[row.id];
    const comments =
      sectionData?.[`${row.id}-comments`] ??
      sectionData?.[`${row.id}-action`] ??
      "";

    const meetsText =
      status === "meets" ? "Yes" : status === "not_applicable" ? "N/A" : "";
    const doesNotMeetText = status === "does_not_meet" ? "Yes" : "";
    const commentText =
      status === "not_applicable" && !comments ? "N/A" : comments || "";

    // Calculate row height based on content
    const labelHeight = doc.heightOfString(String(row.label || ""), {
      width: labelWidth - cellPadding * 2,
    });
    const commentHeight = doc.heightOfString(String(commentText || ""), {
      width: actionWidth - cellPadding * 2,
    });

    // Use minimum height or content height + minimal padding
    const contentHeight = Math.max(labelHeight, commentHeight);
    const rowHeight = Math.max(rowMinHeight, contentHeight + cellPadding);

    // Alternating row colors for modern look (subtle zebra striping)
    const rowBgColor = index % 2 === 0 ? "#ffffff" : "#f8f9fa";

    // Draw row background and borders
    doc
      .rect(tableX, doc.y, tableWidth, rowHeight)
      .fill(rowBgColor)
      .strokeColor("#dee2e6")
      .lineWidth(1)
      .stroke();

    // Draw vertical dividers
    doc.strokeColor("#dee2e6").lineWidth(1);

    doc
      .moveTo(tableX + labelWidth, doc.y)
      .lineTo(tableX + labelWidth, doc.y + rowHeight)
      .stroke();

    doc
      .moveTo(tableX + labelWidth + statusWidth, doc.y)
      .lineTo(tableX + labelWidth + statusWidth, doc.y + rowHeight)
      .stroke();

    doc
      .moveTo(tableX + labelWidth + statusWidth * 2, doc.y)
      .lineTo(tableX + labelWidth + statusWidth * 2, doc.y + rowHeight)
      .stroke();

    const currentRowY = doc.y;

    // Calculate vertical centering for text
    const labelTextY = currentRowY + (rowHeight - labelHeight) / 2;
    const statusTextY = currentRowY + (rowHeight - 10) / 2; // 10 is approx font height
    const commentTextY = currentRowY + (rowHeight - commentHeight) / 2;

    // Area label - vertically centered
    doc
      .fillColor("#212529")
      .font("Helvetica")
      .fontSize(9.5)
      .text(row.label, tableX + cellPadding, labelTextY, {
        width: labelWidth - cellPadding * 2,
        align: "left",
      });

    // Meets - vertically centered
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .text(meetsText, tableX + labelWidth, statusTextY, {
        width: statusWidth,
        align: "center",
      });

    // Does Not Meet - vertically centered
    doc.text(doesNotMeetText, tableX + labelWidth + statusWidth, statusTextY, {
      width: statusWidth,
      align: "center",
    });

    // Comments - vertically centered
    doc
      .font("Helvetica")
      .fontSize(9.5)
      .text(
        String(commentText || ""),
        tableX + labelWidth + statusWidth * 2 + cellPadding,
        commentTextY,
        {
          width: actionWidth - cellPadding * 2,
          align: "left",
        }
      );

    doc.y += rowHeight;
  });

  doc.y += 8; // Add consistent spacing after table
};

const drawPresenceTable = (
  doc,
  title,
  rows,
  sectionData,
  { actionLabel = "Action" } = {}
) => {
  if (!rows.length) {
    return;
  }

  ensurePageSpace(doc, 120 + rows.length * 32);
  drawSectionHeader(doc, title);

  const tableX = PAGE.margin;
  const tableWidth = doc.page.width - PAGE.margin * 2;
  const labelWidth = Math.min(240, tableWidth * 0.4);
  const presenceWidth = 110;
  const actionWidth = tableWidth - labelWidth - presenceWidth * 2;
  const headerHeight = 26;

  // Header row - Draw backgrounds first
  const headerY = doc.y;

  // Draw all header backgrounds
  doc
    .rect(tableX, headerY, labelWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + labelWidth, headerY, presenceWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(
      tableX + labelWidth + presenceWidth,
      headerY,
      presenceWidth,
      headerHeight
    )
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(
      tableX + labelWidth + presenceWidth * 2,
      headerY,
      actionWidth,
      headerHeight
    )
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Now draw text with white color
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10);

  // Fixture column header
  doc.text("Fixture", tableX + 10, headerY + 8, {
    width: labelWidth - 20,
    align: "left",
  });

  // Present column header
  doc.text("Present", tableX + labelWidth + 10, headerY + 8, {
    width: presenceWidth - 20,
    align: "center",
  });

  // Not Present column header
  doc.text(
    "Not Present",
    tableX + labelWidth + presenceWidth + 10,
    headerY + 8,
    {
      width: presenceWidth - 20,
      align: "center",
    }
  );

  // Action column header
  doc.text(
    actionLabel,
    tableX + labelWidth + presenceWidth * 2 + 10,
    headerY + 8,
    {
      width: actionWidth - 20,
      align: "left",
    }
  );

  // Reset text formatting for data rows
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
  doc.y = headerY + headerHeight;

  rows.forEach((row) => {
    ensurePageSpace(doc, 80);
    const value = sectionData?.[row.id];
    const action = sectionData?.[`${row.id}-action`] || "";

    const presentText =
      value === "present" ? "Yes" : value === "not_applicable" ? "N/A" : "";
    const notPresentText = value === "not_present" ? "Yes" : "";
    const actionText = value === "not_applicable" && !action ? "N/A" : action;

    const actionHeight = doc.heightOfString(String(actionText || ""), {
      width: actionWidth - 14,
    });
    const rowHeight = Math.max(20, actionHeight + 8);

    doc
      .rect(tableX, doc.y, labelWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth, doc.y, presenceWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(
        tableX + labelWidth + presenceWidth,
        doc.y,
        presenceWidth,
        rowHeight
      )
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(
        tableX + labelWidth + presenceWidth * 2,
        doc.y,
        actionWidth,
        rowHeight
      )
      .fill("white")
      .stroke(COLORS.border);

    const currentRowY = doc.y;
    const textVerticalCenter = currentRowY + (rowHeight - 10) / 2;

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .text(row.label, tableX + 10, textVerticalCenter, {
        width: labelWidth - 12,
      });

    doc
      .font("Helvetica")
      .text(presentText, tableX + labelWidth, textVerticalCenter, {
        width: presenceWidth,
        align: "center",
      });

    doc.text(
      notPresentText,
      tableX + labelWidth + presenceWidth,
      textVerticalCenter,
      {
        width: presenceWidth,
        align: "center",
      }
    );

    doc.text(
      String(actionText || ""),
      tableX + labelWidth + presenceWidth * 2 + 10,
      textVerticalCenter,
      {
        width: actionWidth - 14,
      }
    );

    doc.y += rowHeight;
  });

  doc.y += 16;
};

const drawPropertyDetails = (doc, { property, job, technician, report }) => {
  const rows = [
    {
      label: "Property Address",
      value:
        property?.address?.fullAddress ||
        property?.address?.street ||
        property?.address ||
        "N/A",
    },
    {
      label: "Inspection Date",
      value: formatDisplayDate(report?.submittedAt || job?.dueDate),
    },
    {
      label: "Inspector",
      value:
        `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
        "N/A",
    },
  ];

  drawRoomDetailTable(
    doc,
    "Property Report Summary",
    rows.map((row) => ({
      question: row.label,
      answer: row.value,
    }))
  );
};

const mapCoverageValue = (value) => {
  const displayMap = {
    included: "Included",
    "not-included": "Not included",
    "not-inspected": "Not inspected",
  };
  return displayMap[value] || "Not specified";
};

const mapInspectionStatus = (value) => {
  const displayMap = {
    satisfactory: "Satisfactory",
    unsatisfactory: "Unsatisfactory",
    "not-inspected": "Not inspected",
  };
  return displayMap[value] || "Not specified";
};

const mapTestingStatus = (value) => {
  const displayMap = {
    pass: "Pass",
    fail: "Fail",
    "not-tested": "Not tested",
  };
  return displayMap[value] || "Not specified";
};

const mapYesNoValue = (value) => {
  if (value === "yes" || value === true) return "Yes";
  if (value === "no" || value === false) return "No";
  if (value === "na" || value === "not-applicable") return "Not applicable";
  return "Not specified";
};

const mapOutcomeValue = (value) => {
  const displayMap = {
    "no-faults": "No faults identified",
    "faults-identified": "Faults identified",
    "repairs-required": "Repairs required",
    satisfactory: "Satisfactory - No faults identified",
    "minor-faults": "Minor faults identified - rectified",
    "major-faults": "Major faults identified - repairs required",
    unsafe: "Unsafe conditions found",
  };
  return displayMap[value] || "Pending";
};

const getOutcomeColor = (value) => {
  switch (value) {
    case "no-faults":
    case "satisfactory":
      return COLORS.success;
    case "faults-identified":
    case "minor-faults":
      return COLORS.warning;
    case "repairs-required":
    case "major-faults":
    case "unsafe":
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

const mapSelectOptionLabel = (field = {}, value) => {
  if (!field || !Array.isArray(field.options)) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const labels = value
      .map(
        (entry) =>
          field.options.find((option) => option.value === entry)?.label || entry
      )
      .filter(Boolean);
    return labels.length ? labels.join(", ") : undefined;
  }

  return field.options.find((option) => option.value === value)?.label;
};

const mapFieldValue = (field = {}, rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return "Not specified";
  }

  const { type } = field;

  switch (type) {
    case "yes-no":
    case "yes-no-na":
      return mapYesNoValue(rawValue);
    case "pass-fail":
    case "pass-fail-na":
      return mapTestingStatus(rawValue);
    case "select":
      return mapSelectOptionLabel(field, rawValue) || String(rawValue);
    case "multi-select":
      return (
        mapSelectOptionLabel(field, rawValue) ||
        (Array.isArray(rawValue) ? rawValue.join(", ") : String(rawValue))
      );
    case "boolean":
    case "checkbox":
      return rawValue ? "Yes" : "No";
    case "date":
      return formatDisplayDate(rawValue);
    case "time":
      return String(rawValue);
    case "number":
      return String(rawValue);
    case "textarea":
    case "text":
      return String(rawValue);
    default:
      if (Array.isArray(rawValue)) {
        return rawValue.join(", ");
      }
      return String(rawValue);
  }
};

const drawOutcomeBadges = (doc, outcomes = []) => {
  if (!outcomes.length) {
    return;
  }

  const availableWidth = doc.page.width - PAGE.margin * 2;
  const badgeWidth =
    (availableWidth - (outcomes.length - 1) * 16) / outcomes.length;
  const y = doc.y;

  outcomes.forEach((outcome, index) => {
    const x = PAGE.margin + index * (badgeWidth + 16);
    const color = getOutcomeColor(outcome.valueKey);

    doc
      .roundedRect(x, y, badgeWidth, 46, 10)
      .fill(color)
      .fillColor("white")
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(outcome.title, x + 16, y + 10, {
        width: badgeWidth - 32,
      })
      .font("Helvetica")
      .fontSize(10)
      .text(mapOutcomeValue(outcome.valueKey), x + 16, y + 26, {
        width: badgeWidth - 32,
      });
  });

  doc.y = y + 62;
};

const drawStatusList = (
  doc,
  title,
  items = [],
  valueMapper = (value) => value
) => {
  if (!items.length) {
    return;
  }

  const estimatedHeight = items.length * 20 + 80;
  ensurePageSpace(doc, estimatedHeight);
  drawSectionHeader(doc, title);

  const labelWidth = 240;
  const valueWidth = doc.page.width - PAGE.margin * 2 - labelWidth - 20;
  let cursorY = doc.y;

  items.forEach((item, index) => {
    const label = item.label || "";
    const mappedValue = valueMapper(item.value, item, index);
    const textValue = mappedValue || "Not specified";

    const labelOptions = {
      width: labelWidth,
      align: "left",
      lineGap: 2,
    };
    const valueOptions = {
      width: valueWidth,
      align: "left",
      lineGap: 2,
    };

    doc.font("Helvetica-Bold").fontSize(10);
    const labelHeight = doc.heightOfString(label, labelOptions);
    doc.font("Helvetica").fontSize(10);
    const valueHeight = doc.heightOfString(String(textValue), valueOptions);
    const rowHeight = Math.max(24, Math.max(labelHeight, valueHeight) + 8);

    ensurePageSpace(doc, rowHeight + 10);

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(label, PAGE.margin, cursorY, labelOptions);

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(10)
      .text(
        String(textValue),
        PAGE.margin + labelWidth + 10,
        cursorY,
        valueOptions
      );

    cursorY += rowHeight;
  });

  doc.y = cursorY + 8;
};

const drawSmokeAlarmTable = (doc, alarms = []) => {
  if (!alarms.length) {
    return;
  }

  const tableTopMargin = 30;
  ensurePageSpace(doc, alarms.length * 30 + tableTopMargin + 80);
  drawSectionHeader(doc, "Smoke Alarm Inventory");

  const startX = PAGE.margin;
  const startY = doc.y;

  // Adjust column widths to fit page better and prevent overflow
  const availableWidth = doc.page.width - PAGE.margin * 2;
  const columnDefinitions = [
    {
      id: "voltage",
      label: "Voltage",
      width: Math.floor(availableWidth * 0.15),
    },
    { id: "status", label: "Status", width: Math.floor(availableWidth * 0.25) },
    {
      id: "location",
      label: "Location",
      width: Math.floor(availableWidth * 0.3),
    },
    { id: "level", label: "Level", width: Math.floor(availableWidth * 0.15) },
    {
      id: "expiration",
      label: "Expiration",
      width: Math.floor(availableWidth * 0.15),
    },
  ];

  const totalWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);

  // Header - Draw background first
  doc
    .rect(startX, startY, totalWidth, 24)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Draw header text with white color
  doc.fillColor("white").font("Helvetica-Bold").fontSize(10);

  let columnX = startX;
  columnDefinitions.forEach((column) => {
    doc.text(column.label, columnX + 8, startY + 7, {
      width: column.width - 16,
      align: "center",
    });
    columnX += column.width;
  });

  doc.font("Helvetica").fontSize(10);
  let rowY = startY + 24;

  alarms.forEach((row, index) => {
    ensurePageSpace(doc, 60);

    doc
      .rect(startX, rowY, totalWidth, 24)
      .fill(index % 2 === 0 ? COLORS.primarySoft : "white")
      .stroke(COLORS.border);

    columnX = startX;

    columnDefinitions.forEach((column) => {
      let value = row[column.id];
      if (!value) {
        value = "—";
      }
      if (column.id === "expiration") {
        value = formatNumericDate(value);
      }

      // Truncate long text to prevent overflow
      let displayValue = String(value);
      if (displayValue.length > 15) {
        displayValue = displayValue.substring(0, 12) + "...";
      }

      doc
        .fillColor(COLORS.text)
        .fontSize(9) // Reduce font size slightly for better fit
        .text(displayValue, columnX + 4, rowY + 7, {
          width: column.width - 8,
          ellipsis: true,
        });

      columnX += column.width;
    });

    rowY += 24;
  });

  doc.y = rowY + 16;
};

const drawCertificationBlock = (doc, certification = {}) => {
  const rows = [
    {
      label: "Electrical safety check completed by",
      value:
        certification["certification-electrician-name"] ||
        certification["inspector-name"] ||
        certification.technicianName ||
        "—",
    },
    {
      label: "Licence/registration number",
      value:
        certification["certification-licence-number"] ||
        certification["license-number"] ||
        certification.technicianLicense ||
        "—",
    },
    {
      label: "Inspection date",
      value:
        formatDisplayDate(certification["certification-inspection-date"]) ||
        formatDisplayDate(certification["inspection-date"]),
    },
    {
      label: "Next inspection due",
      value:
        formatDisplayDate(certification["certification-next-inspection-due"]) ||
        "—",
    },
    {
      label: "Signed at",
      value: certification["certification-signed-at"] || "—",
    },
  ];

  drawRoomDetailTable(
    doc,
    "Electrical Safety Check Certification",
    rows.map((row) => ({
      question: row.label,
      answer: row.value,
    })),
    { hideHeaders: true }
  );

  if (certification["certification-notes"]) {
    ensurePageSpace(doc, 80);
    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Certification notes", PAGE.margin, doc.y);

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(10)
      .text(
        String(certification["certification-notes"]),
        PAGE.margin,
        doc.y + 14,
        {
          width: doc.page.width - PAGE.margin * 2,
        }
      );

    doc.y += 60;
  }
};

const renderElectricalSmokeReport = async (
  doc,
  { report, template, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};
  const findSectionDefinition = (id) =>
    template.sections?.find((section) => section.id === id);

  const summarySection = getSectionValues("inspection-summary");
  const technicianFullName =
    `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
    "Technician";
  const technicianLicense =
    technician?.licenseNumber || summarySection["license-number"];

  const certificationSection = {
    technicianName: technicianFullName,
    technicianLicense,
    ...summarySection,
    ...getSectionValues("certification"),
    ...getSectionValues("technician-signoff"),
  };

  const propertyAddress =
    property?.address?.fullAddress ||
    property?.address?.street ||
    property?.address ||
    "N/A";

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 8;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      const photoHeight = 220;
      const totalPhotoSpace = photoHeight + 25;

      ensurePageSpace(doc, totalPhotoSpace);

      const result = await processImageForPdf(
        {
          imageUrl: mediaItem.imageBuffer || mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        },
        doc,
        PAGE.margin,
        doc.y,
        400,
        photoHeight
      );

      doc.y += result.height + 8;

      // Add photo caption if available
      if (mediaItem.metadata?.caption) {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(9)
          .font("Helvetica")
          .text(mediaItem.metadata.caption, PAGE.margin, doc.y, {
            width: 400,
            align: "left",
          });
        doc.y += 6;
      }
    }

    doc.y += 2; // Extra spacing after photo section
  };

  const summaryRows = [
    {
      label: "Property Address",
      value: propertyAddress,
    },
    {
      label: "Inspection Date",
      value:
        formatDisplayDate(summarySection["inspection-date"]) ||
        formatDisplayDate(report.submittedAt),
    },
    {
      label: "Inspector",
      value: summarySection["inspector-name"] || technicianFullName || "N/A",
    },
    {
      label: "Licence/registration number",
      value: summarySection["license-number"] || technicianLicense || "N/A",
    },
    {
      label: "Previous safety check",
      value:
        formatDisplayDate(summarySection["previous-inspection-date"]) ||
        "Not recorded",
    },
  ];

  drawRoomDetailTable(
    doc,
    "Property Report Summary",
    summaryRows.map((row) => ({
      label: row.label,
      value: row.value,
    }))
  );
  await renderSectionPhotos("inspection-summary", "Property Overview");

  const outcomeBadges = [];
  if (summarySection["electrical-outcome"]) {
    outcomeBadges.push({
      title: "Electrical Safety Check",
      valueKey: summarySection["electrical-outcome"],
    });
  }
  if (summarySection["smoke-outcome"]) {
    outcomeBadges.push({
      title: "Smoke Alarm Check",
      valueKey: summarySection["smoke-outcome"],
    });
  }
  if (outcomeBadges.length) {
    drawOutcomeBadges(doc, outcomeBadges);
  }

  if (summarySection["summary-notes"]) {
    ensurePageSpace(doc, 120);
    drawSectionHeader(doc, "Comments on Next Steps");

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(10)
      .text(String(summarySection["summary-notes"]), PAGE.margin, doc.y, {
        width: doc.page.width - PAGE.margin * 2,
        lineGap: 3,
      });

    doc.y += 16;
  }

  if (summarySection["contact-email"] || summarySection["contact-phone"]) {
    const contactRows = [
      {
        label: "Email",
        value: summarySection["contact-email"] || "—",
      },
      {
        label: "Phone",
        value: summarySection["contact-phone"] || "—",
      },
    ];
    drawRoomDetailTable(
      doc,
      "Contact Information",
      contactRows.map((row) => ({
        label: row.label,
        value: row.value,
      })),
      { hideHeaders: true }
    );
    await renderSectionPhotos("contact", "Contact Details");
  }

  const renderStatusSection = (sectionId, mapper, noteFieldIds = []) => {
    const sectionDefinition = findSectionDefinition(sectionId);
    if (!sectionDefinition) {
      return;
    }

    const responses = getSectionValues(sectionId);
    const statusFieldTypes = new Set([
      "select",
      "yes-no",
      "yes-no-na",
      "pass-fail",
      "boolean",
      "text",
      "number",
      "date",
      "time",
      "multi-select",
      "checkbox",
    ]);

    const items = (sectionDefinition.fields || [])
      .filter(
        (field) =>
          !noteFieldIds.includes(field.id) &&
          statusFieldTypes.has(field.type || "")
      )
      .map((field) => ({
        label: field.label,
        value: responses[field.id],
        field,
      }));

    if (items.length) {
      drawStatusList(
        doc,
        sectionDefinition.title || sectionId,
        items,
        mapper || ((value, item) => mapFieldValue(item.field, value))
      );
    }

    noteFieldIds.forEach((noteId) => {
      const noteValue = responses[noteId];
      const noteField = (sectionDefinition.fields || []).find(
        (field) => field.id === noteId
      );
      const formattedNote = noteField
        ? mapFieldValue(noteField, noteValue)
        : noteValue;

      if (formattedNote && formattedNote !== "Not specified") {
        ensurePageSpace(doc, 80);
        doc
          .fillColor(COLORS.textSecondary)
          .font("Helvetica")
          .fontSize(10)
          .text(String(formattedNote), PAGE.margin, doc.y, {
            width: doc.page.width - PAGE.margin * 2,
            lineGap: 2,
          });
        doc.y += 16;
      }
    });
  };

  renderStatusSection(
    "electrical-installations",
    (value, item) => mapFieldValue(item.field, value),
    ["installation-comments"]
  );
  await renderSectionPhotos(
    "electrical-installations",
    "Electrical Installations"
  );
  renderStatusSection(
    "safety-testing",
    (value, item) => mapFieldValue(item.field, value),
    ["testing-comments"]
  );
  await renderSectionPhotos("safety-testing", "Safety Testing");
  renderStatusSection(
    "compliance-assessment",
    (value, item) => mapFieldValue(item.field, value),
    ["compliance-comments"]
  );
  await renderSectionPhotos("compliance-assessment", "Compliance Assessment");
  renderStatusSection(
    "remedial-actions",
    (value, item) => mapFieldValue(item.field, value),
    ["actions-description", "follow-up-details"]
  );
  await renderSectionPhotos("remedial-actions", "Remedial Actions");

  renderStatusSection("extent-of-installation", mapCoverageValue, [
    "extent-notes",
  ]);
  renderStatusSection("visual-inspection", mapInspectionStatus, [
    "visual-notes",
  ]);
  renderStatusSection("testing-polarity", mapTestingStatus, ["polarity-notes"]);
  renderStatusSection("testing-earth", mapTestingStatus, [
    "earth-continuity-notes",
  ]);

  const rcdValues = getSectionValues("rcd-testing");
  const rcdDefinition = findSectionDefinition("rcd-testing");
  if (rcdDefinition) {
    const rcdStatusItems = (rcdDefinition.fields || [])
      .filter((field) => field.id === "rcd-test-result")
      .map((field) => ({ label: field.label, value: rcdValues[field.id] }));

    if (rcdStatusItems.length) {
      drawStatusList(
        doc,
        rcdDefinition.title || "RCD testing",
        rcdStatusItems,
        mapTestingStatus
      );
    }

    const rcdNotes = rcdValues["rcd-notes"];
    if (rcdNotes) {
      ensurePageSpace(doc, 80);
      doc
        .fillColor(COLORS.textSecondary)
        .font("Helvetica")
        .fontSize(10)
        .text(String(rcdNotes), PAGE.margin, doc.y, {
          width: doc.page.width - PAGE.margin * 2,
        });
      doc.y += 16;
    }
  }

  const smokeDefinition = findSectionDefinition("smoke-alarms");
  const smokeSection = getSectionValues("smoke-alarms");
  if (smokeDefinition) {
    const smokeComplianceItems = smokeDefinition.fields
      .filter((field) =>
        ["smoke-alarms-operational", "next-smoke-check-due"].includes(field.id)
      )
      .map((field) => ({ label: field.label, value: smokeSection[field.id] }));

    if (smokeComplianceItems.length) {
      drawStatusList(
        doc,
        smokeDefinition.title || "Smoke alarm compliance",
        smokeComplianceItems,
        (value, _item, index) => {
          if (index === 1) {
            return formatDisplayDate(value);
          }
          return mapYesNoValue(value);
        }
      );
    }

    const alarmRecords = Array.isArray(smokeSection["smoke-alarm-records"])
      ? smokeSection["smoke-alarm-records"]
      : [];
    drawSmokeAlarmTable(doc, alarmRecords);

    if (smokeSection["smoke-notes"]) {
      ensurePageSpace(doc, 80);
      doc
        .fillColor(COLORS.textSecondary)
        .font("Helvetica")
        .fontSize(10)
        .text(String(smokeSection["smoke-notes"]), PAGE.margin, doc.y, {
          width: doc.page.width - PAGE.margin * 2,
        });
      doc.y += 16;
    }
  }

  drawCertificationBlock(doc, certificationSection);
};

const renderGasReport = async (
  doc,
  { template, report, job, property, technician }
) => {
  const isGasV3Template =
    (template?.version ?? 1) >= 3 &&
    template?.sections?.some((section) => section.id === "gas-appliances" && section.repeatable);

  if (isGasV3Template) {
    await renderGasReportV3(doc, {
      template,
      report,
      job,
      property,
      technician,
    });
    return;
  }

  const getSectionValues = (id) => report.formData?.[id] || {};

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 18;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      const photoHeight = 220;
      const totalPhotoSpace = photoHeight + 25;

      ensurePageSpace(doc, totalPhotoSpace);

      const result = await processImageForPdf(
        {
          imageUrl: mediaItem.imageBuffer || mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        },
        doc,
        PAGE.margin,
        doc.y,
        400,
        photoHeight
      );

      doc.y += result.height + 8;

      // Add photo caption if available
      if (mediaItem.metadata?.caption || mediaItem.label) {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(9)
          .font("Helvetica")
          .text(
            mediaItem.metadata?.caption || mediaItem.label || "",
            PAGE.margin,
            doc.y,
            {
              width: 400,
              align: "left",
            }
          );
        doc.y += 6;
      }
    }

    doc.y += 2; // Extra spacing after photo section
  };

  // Property Details Summary
  const propertyDetails = getSectionValues("property-details") || {};
  const propertyAddress =
    property?.address?.fullAddress || property?.address?.street || "N/A";
  const inspectionDate = formatDisplayDate(report?.submittedAt || job?.dueDate);
  const inspectorName =
    `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
    "Inspector Name Not Available";

  const summaryRows = [
    {
      label: "Property Address",
      value: propertyAddress,
    },
    {
      label: "Inspection Date",
      value: inspectionDate,
    },
    {
      label: "Inspector",
      value: inspectorName,
    },
    {
      label: "Inspector License",
      value: propertyDetails["license-number"] || "N/A",
    },
    {
      label: "Gas Installation Type",
      value: propertyDetails["installation-type"] || "N/A",
    },
  ];

  await renderSectionPhotos("property-details", "Property Overview");

  if (!template?.sections?.length) {
    return;
  }

  for (const section of template.sections) {
    const responses = report.formData?.[section.id] || {};

    ensurePageSpace(doc, 120);

    if (section.id === "gas-installation") {
      drawGasInstallationSection(doc, section, responses);
      await renderSectionPhotos(section.id, "Gas Installation");
    } else if (section.id.startsWith("appliance-")) {
      drawApplianceSection(doc, section, responses);
      await renderSectionPhotos(section.id, section.title || "Appliance");
    } else if (section.id === "final-declaration") {
      drawComplianceDeclaration(
        doc,
        section,
        responses,
        report,
        "Testing Status"
      );
    } else {
      const genericTitle =
        section.title === "Property Details"
          ? "Inspector Details"
          : section.title;
      drawSectionHeader(doc, genericTitle);

      // Create table rows for section fields
      const sectionRows = [];
      for (const field of section.fields) {
        const value = responses[field.id];
        if (field.type !== "photo" && field.type !== "photo-multi") {
          const formattedValue = formatValue(value, field.type);
          sectionRows.push({
            label: field.label,
            value: formattedValue || "N/A",
          });
        }
      }

      if (sectionRows.length > 0) {
        const tableOptions =
          section.id === "compliance-declaration" ? { hideHeaders: true } : {};
        drawRoomDetailTable(doc, null, sectionRows, tableOptions);
      }

      await renderSectionPhotos(section.id, section.title || "Section");
    }
  }
};

const renderGasSmokeReport = async (
  doc,
  { template, report, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 18;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      ensurePageSpace(doc, 240);

      try {
        const imageBuffer = await loadImageBuffer({
          imageUrl: mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        });
        doc.image(imageBuffer, {
          fit: [(PAGE.content?.width || 595.28 - PAGE.margin * 2) * 0.4, 200],
          align: "left",
        });
        doc.y += 220;
      } catch (error) {
        console.error("Error loading image:", error);
        doc
          .fillColor(COLORS.text)
          .fontSize(10)
          .text(
            `Image could not be loaded: ${mediaItem.filename || "Unknown"}`,
            PAGE.margin,
            doc.y
          );
        doc.y += 15;
      }
    }

    doc.y += 10;
  };

  // Section 1: Inspection Details
  const inspectionDetails = getSectionValues("inspection-details");
  if (inspectionDetails && Object.keys(inspectionDetails).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("INSPECTION DETAILS", PAGE.margin, doc.y);
    doc.y += 20;

    const detailsRows = [
      ["Inspection Date", formatValue(inspectionDetails["inspection-date"])],
      ["Inspection Time", formatValue(inspectionDetails["inspection-time"])],
      ["Next Service Due", formatValue(inspectionDetails["next-service-due"])],
    ].filter(([, value]) => value && value !== "N/A");

    if (detailsRows.length > 0) {
      drawRoomDetailTable(doc, null, detailsRows);
    }

    await renderSectionPhotos("inspection-details", "Inspection Details");
  }

  // Section 2: Gas Installation Assessment
  const gasInstallation = getSectionValues("gas-installation");
  if (gasInstallation && Object.keys(gasInstallation).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("GAS INSTALLATION ASSESSMENT", PAGE.margin, doc.y);
    doc.y += 20;

    const gasRows = [
      [
        "Gas Meter Accessible",
        formatValue(gasInstallation["gas-meter-accessible"]),
      ],
      ["Gas Shut-off Valve", formatValue(gasInstallation["gas-shutoff-valve"])],
      [
        "Gas Piping Condition",
        formatValue(gasInstallation["gas-piping-condition"]),
      ],
      ["Gas Leakage Test", formatValue(gasInstallation["gas-leakage-test"])],
      [
        "Number of Appliances",
        formatValue(gasInstallation["gas-appliances-count"]),
      ],
      [
        "Appliances Condition",
        formatValue(gasInstallation["gas-appliances-condition"]),
      ],
      [
        "Ventilation Adequate",
        formatValue(gasInstallation["gas-ventilation-adequate"]),
      ],
      [
        "Safety Compliance",
        formatValue(gasInstallation["gas-safety-compliance"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (gasRows.length > 0) {
      drawRoomDetailTable(doc, null, gasRows);
    }

    if (gasInstallation["gas-inspection-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Gas Inspection Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(gasInstallation["gas-inspection-comments"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("gas-installation", "Gas Installation");
  }

  // Section 3: Smoke Alarm Assessment
  const smokeAssessment = getSectionValues("smoke-alarm-assessment");
  if (smokeAssessment && Object.keys(smokeAssessment).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("SMOKE ALARM ASSESSMENT", PAGE.margin, doc.y);
    doc.y += 20;

    const smokeRows = [
      ["Alarms Present", formatValue(smokeAssessment["smoke-alarms-present"])],
      [
        "Locations Compliant",
        formatValue(smokeAssessment["alarm-locations-compliant"]),
      ],
      [
        "Alarms Interconnected",
        formatValue(smokeAssessment["alarms-interconnected"]),
      ],
      ["Total Alarm Count", formatValue(smokeAssessment["alarm-count-total"])],
      [
        "Functional Alarms",
        formatValue(smokeAssessment["alarms-tested-functional"]),
      ],
      [
        "Power Source Compliant",
        formatValue(smokeAssessment["power-source-compliant"]),
      ],
      ["Age Compliance", formatValue(smokeAssessment["alarm-age-compliance"])],
      [
        "Overall Compliance",
        formatValue(smokeAssessment["smoke-alarm-compliance"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (smokeRows.length > 0) {
      drawRoomDetailTable(doc, null, smokeRows);
    }

    if (smokeAssessment["smoke-inspection-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Smoke Alarm Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(
          smokeAssessment["smoke-inspection-comments"],
          PAGE.margin,
          doc.y,
          {
            width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
          }
        );
      doc.y += 20;
    }

    await renderSectionPhotos(
      "smoke-alarm-assessment",
      "Smoke Alarm Assessment"
    );
  }

  // Section 4: Individual Alarm Records Table
  const alarmRecords = getSectionValues("individual-alarm-records");
  if (
    alarmRecords &&
    alarmRecords["alarm-records"] &&
    Array.isArray(alarmRecords["alarm-records"])
  ) {
    const records = alarmRecords["alarm-records"];

    if (records.length > 0) {
      ensurePageSpace(doc, 200);

      doc
        .fillColor(COLORS.primary)
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("INDIVIDUAL SMOKE ALARM RECORDS", PAGE.margin, doc.y);
      doc.y += 20;

      // Create table headers
      const headers = [
        "ID",
        "Location",
        "Brand",
        "Model",
        "Type",
        "Power",
        "Mfg Date",
        "Expiry",
        "Test",
        "Status",
      ];

      // Create table data
      const tableData = records.map((record) => [
        record["alarm-id"] || "",
        (record.location === "other"
          ? record["location-other"]
          : record.location) || "",
        record.brand || "",
        record.model || "",
        record["alarm-type"] || "",
        record["power-source"] || "",
        formatDate(record["manufacture-date"]),
        formatDate(record["expiry-date"]),
        record["push-test-result"] || "",
        record["compliance-status"] || "",
      ]);

      // Draw the table
      drawTable(doc, headers, tableData, {
        columnWidths: [30, 60, 50, 50, 40, 50, 55, 55, 40, 60],
        headerFontSize: 8,
        cellFontSize: 7,
        rowHeight: 25,
        headerHeight: 30,
      });

      // Add individual alarm comments if any
      records.forEach((record, index) => {
        if (record["alarm-comments"]) {
          ensurePageSpace(doc, 50);
          doc.y += 10;
          doc
            .fillColor(COLORS.text)
            .fontSize(9)
            .font("Helvetica-Bold")
            .text(
              `Alarm ${record["alarm-id"] || index + 1} Comments:`,
              PAGE.margin,
              doc.y
            );
          doc.y += 12;
          doc
            .font("Helvetica")
            .fontSize(8)
            .text(record["alarm-comments"], PAGE.margin, doc.y, {
              width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
            });
          doc.y += 15;
        }
      });
    }

    await renderSectionPhotos("individual-alarm-records", "Alarm Records");
  }

  // Section 5: Actions Taken
  const actionsTaken = getSectionValues("actions-taken");
  if (actionsTaken && Object.keys(actionsTaken).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("ACTIONS TAKEN", PAGE.margin, doc.y);
    doc.y += 20;

    const actionsRows = [
      ["Gas Repairs", formatArrayValue(actionsTaken["gas-repairs-performed"])],
      [
        "Smoke Actions",
        formatArrayValue(actionsTaken["smoke-actions-performed"]),
      ],
      ["Follow-up Required", formatValue(actionsTaken["follow-up-required"])],
    ].filter(([, value]) => value && value !== "N/A");

    if (actionsRows.length > 0) {
      drawRoomDetailTable(doc, null, actionsRows);
    }

    if (actionsTaken["materials-supplied"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Materials Supplied:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(actionsTaken["materials-supplied"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    if (actionsTaken["follow-up-details"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Follow-up Details:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(actionsTaken["follow-up-details"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("actions-taken", "Actions Taken");
  }

  // Section 6: Compliance Summary
  const complianceSummary = getSectionValues("compliance-summary");
  if (complianceSummary && Object.keys(complianceSummary).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("COMPLIANCE SUMMARY", PAGE.margin, doc.y);
    doc.y += 20;

    const summaryRows = [
      [
        "Gas Compliance",
        formatValue(complianceSummary["overall-gas-compliance"]),
      ],
      [
        "Smoke Compliance",
        formatValue(complianceSummary["overall-smoke-compliance"]),
      ],
      [
        "Combined Status",
        formatValue(complianceSummary["combined-compliance-status"]),
      ],
      [
        "Certificate Issued",
        formatValue(complianceSummary["compliance-certificate-issued"]),
      ],
      [
        "Valid Until",
        formatValue(complianceSummary["certificate-valid-until"]),
      ],
      [
        "Landlord Notification",
        formatValue(complianceSummary["landlord-notification-required"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (summaryRows.length > 0) {
      drawRoomDetailTable(doc, null, summaryRows);
    }

    if (complianceSummary["summary-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Summary Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(complianceSummary["summary-comments"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("compliance-summary", "Compliance Summary");
  }

  // Section 7: Certification
  const certification = getSectionValues("certification");
  if (certification && Object.keys(certification).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("TECHNICIAN CERTIFICATION", PAGE.margin, doc.y);
    doc.y += 20;

    const certRows = [
      [
        "Testing Status",
        certification["technician-declaration"] ? "Yes" : "No",
      ],
      ["Gasfitter License", formatValue(certification["gasfitter-license"])],
      ["Electrical License", formatValue(certification["electrical-license"])],
      ["Completion Date", formatValue(certification["completion-date"])],
    ].filter(([, value]) => value && value !== "N/A");

    if (certRows.length > 0) {
      drawRoomDetailTable(doc, null, certRows);
    }

    // Add signature if present
    if (certification["technician-signature"]) {
      ensurePageSpace(doc, 120);
      doc.y += 15;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Technician Signature:", PAGE.margin, doc.y);
      doc.y += 10;

      // Draw signature image if available, otherwise draw signature line
      if (certification["technician-signature"].startsWith("data:")) {
        await drawSignatureFromData(
          doc,
          certification["technician-signature"],
          PAGE.margin,
          doc.y,
          200,
          60
        );
        doc.y += 70;
      } else {
        // Draw signature line
        doc
          .strokeColor(COLORS.border)
          .lineWidth(1)
          .moveTo(PAGE.margin, doc.y + 20)
          .lineTo(PAGE.margin + 200, doc.y + 20)
          .stroke();
        doc.y += 45;
      }
    }

    await renderSectionPhotos("certification", "Certification");
  }
};

const renderElectricalReport = async (
  doc,
  { template, report, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 18;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      ensurePageSpace(doc, 240);

      try {
        const imageBuffer = await loadImageBuffer({
          imageUrl: mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        });
        doc.image(imageBuffer, {
          fit: [(PAGE.content?.width || 595.28 - PAGE.margin * 2) * 0.4, 200],
          align: "left",
        });
        doc.y += 220;
      } catch (error) {
        console.error("Error loading image:", error);
        doc
          .fillColor(COLORS.text)
          .fontSize(10)
          .text(
            `Image could not be loaded: ${mediaItem.filename || "Unknown"}`,
            PAGE.margin,
            doc.y
          );
        doc.y += 15;
      }
    }

    doc.y += 10;
  };

  // Section 1: Inspection Summary
  const inspectionSummary = getSectionValues("inspection-summary");
  if (inspectionSummary && Object.keys(inspectionSummary).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("INSPECTION SUMMARY", PAGE.margin, doc.y);
    doc.y += 20;

    const summaryRows = [
      ["Inspection Date", formatValue(inspectionSummary["inspection-date"])],
      [
        "Previous Inspection",
        formatValue(inspectionSummary["previous-inspection-date"]),
      ],
      ["Inspector Name", formatValue(inspectionSummary["inspector-name"])],
      ["License Number", formatValue(inspectionSummary["license-number"])],
      [
        "Registration Number",
        formatValue(inspectionSummary["registration-number"]),
      ],
      [
        "Electrical Outcome",
        formatValue(inspectionSummary["electrical-outcome"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (summaryRows.length > 0) {
      drawRoomDetailTable(doc, null, summaryRows);
    }

    await renderSectionPhotos("inspection-summary", "Inspection Summary");
  }

  // Section 2: Electrical Installations
  const electricalInstallations = getSectionValues("electrical-installations");
  if (
    electricalInstallations &&
    Object.keys(electricalInstallations).length > 0
  ) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("ELECTRICAL INSTALLATIONS", PAGE.margin, doc.y);
    doc.y += 20;

    const installationRows = [
      [
        "Switchboard Accessible",
        formatValue(electricalInstallations["switchboard-accessible"]),
      ],
      [
        "Switchboard Labeling",
        formatValue(electricalInstallations["switchboard-labeling"]),
      ],
      [
        "Circuit Protection",
        formatValue(electricalInstallations["circuit-protection"]),
      ],
      [
        "Earth Leakage Protection",
        formatValue(electricalInstallations["earth-leakage-protection"]),
      ],
      [
        "Wiring Condition",
        formatValue(electricalInstallations["wiring-condition"]),
      ],
      [
        "Light Fittings",
        formatValue(electricalInstallations["light-fittings"]),
      ],
      ["Power Points", formatValue(electricalInstallations["power-points"])],
      [
        "Safety Switches",
        formatValue(electricalInstallations["safety-switches"]),
      ],
      [
        "Overall Condition",
        formatValue(electricalInstallations["overall-condition"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (installationRows.length > 0) {
      drawRoomDetailTable(doc, null, installationRows);
    }

    if (electricalInstallations["installation-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Installation Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(
          electricalInstallations["installation-comments"],
          PAGE.margin,
          doc.y,
          {
            width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
          }
        );
      doc.y += 20;
    }

    await renderSectionPhotos(
      "electrical-installations",
      "Electrical Installations"
    );
  }

  // Section 3: Safety Testing
  const safetyTesting = getSectionValues("safety-testing");
  if (safetyTesting && Object.keys(safetyTesting).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("SAFETY TESTING", PAGE.margin, doc.y);
    doc.y += 20;

    const testingRows = [
      [
        "Insulation Resistance",
        formatValue(safetyTesting["insulation-resistance"]),
      ],
      ["Earth Continuity", formatValue(safetyTesting["earth-continuity"])],
      ["Polarity Check", formatValue(safetyTesting["polarity-check"])],
      ["RCD Testing", formatValue(safetyTesting["rcd-testing"])],
      ["Load Testing", formatValue(safetyTesting["load-testing"])],
      [
        "Voltage Measurements",
        formatValue(safetyTesting["voltage-measurements"]),
      ],
      ["Test Results", formatValue(safetyTesting["test-results"])],
    ].filter(([, value]) => value && value !== "N/A");

    if (testingRows.length > 0) {
      drawRoomDetailTable(doc, null, testingRows);
    }

    if (safetyTesting["testing-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Testing Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(safetyTesting["testing-comments"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("safety-testing", "Safety Testing");
  }

  // Section 4: Compliance Assessment
  const complianceAssessment = getSectionValues("compliance-assessment");
  if (complianceAssessment && Object.keys(complianceAssessment).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("COMPLIANCE ASSESSMENT", PAGE.margin, doc.y);
    doc.y += 20;

    const complianceRows = [
      [
        "AS/NZS 3019 Compliance",
        formatValue(complianceAssessment["as-nzs-3019-compliance"]),
      ],
      [
        "Installation Standards",
        formatValue(complianceAssessment["installation-standards"]),
      ],
      [
        "Safety Requirements",
        formatValue(complianceAssessment["safety-requirements"]),
      ],
      ["Code Compliance", formatValue(complianceAssessment["code-compliance"])],
      [
        "Overall Assessment",
        formatValue(complianceAssessment["overall-assessment"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (complianceRows.length > 0) {
      drawRoomDetailTable(doc, null, complianceRows);
    }

    if (complianceAssessment["compliance-comments"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Compliance Comments:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(complianceAssessment["compliance-comments"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("compliance-assessment", "Compliance Assessment");
  }

  // Section 5: Remedial Actions
  const remedialActions = getSectionValues("remedial-actions");
  if (remedialActions && Object.keys(remedialActions).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("REMEDIAL ACTIONS", PAGE.margin, doc.y);
    doc.y += 20;

    const actionsRows = [
      [
        "Actions Required",
        formatArrayValue(remedialActions["actions-required"]),
      ],
      ["Repairs Completed", formatValue(remedialActions["repairs-completed"])],
      [
        "Follow-up Required",
        formatValue(remedialActions["follow-up-required"]),
      ],
    ].filter(([, value]) => value && value !== "N/A");

    if (actionsRows.length > 0) {
      drawRoomDetailTable(doc, null, actionsRows);
    }

    if (remedialActions["actions-description"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Actions Description:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(remedialActions["actions-description"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    if (remedialActions["follow-up-details"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Follow-up Details:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(remedialActions["follow-up-details"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    await renderSectionPhotos("remedial-actions", "Remedial Actions");
  }

  // Section 6: Certification
  const certification = getSectionValues("certification");
  if (certification && Object.keys(certification).length > 0) {
    ensurePageSpace(doc, 120);

    doc
      .fillColor(COLORS.primary)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("TECHNICIAN CERTIFICATION", PAGE.margin, doc.y);
    doc.y += 20;

    const certRows = [
      [
        "Certification Declaration",
        certification["certification-declaration"] ? "Yes" : "No",
      ],
      [
        "Technician Signature",
        certification["certification-signature"] ? "Signed" : "Not Signed",
      ],
      ["Signed At", formatValue(certification["certification-signed-at"])],
    ].filter(([, value]) => value && value !== "N/A");

    if (certRows.length > 0) {
      drawRoomDetailTable(doc, null, certRows);
    }

    if (certification["certification-notes"]) {
      ensurePageSpace(doc, 60);
      doc.y += 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Certification Notes:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .font("Helvetica")
        .text(certification["certification-notes"], PAGE.margin, doc.y, {
          width: PAGE.content?.width || 595.28 - PAGE.margin * 2,
        });
      doc.y += 20;
    }

    // Add signature if present
    if (certification["certification-signature"]) {
      ensurePageSpace(doc, 120);
      doc.y += 15;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("Technician Signature:", PAGE.margin, doc.y);
      doc.y += 10;

      // Draw signature image if available, otherwise draw signature line
      if (certification["certification-signature"].startsWith("data:")) {
        await drawSignatureFromData(
          doc,
          certification["certification-signature"],
          PAGE.margin,
          doc.y,
          200,
          60
        );
        doc.y += 70;
      } else {
        // Draw signature line
        doc
          .strokeColor(COLORS.border)
          .lineWidth(1)
          .moveTo(PAGE.margin, doc.y + 20)
          .lineTo(PAGE.margin + 200, doc.y + 20)
          .stroke();
        doc.y += 45;
      }
    }

    await renderSectionPhotos("certification", "Certification");
  }
};

const renderMinimumSafetyStandardReport = async (
  doc,
  { report, template, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};

  const propertySetup = getSectionValues("property-setup");
  const propertySummary = getSectionValues("property-summary");
  const executiveSummary = getSectionValues("executive-summary");
  const electricalSafety = getSectionValues("electrical-safety");
  const binFacilities = getSectionValues("bin-facilities");
  const frontEntrance = getSectionValues("front-entrance");
  const overallSummaryData = getSectionValues("overall-summary");
  const executiveFixtures = getSectionValues("executive-summary-fixtures");
  const externalDoorData = getSectionValues("external-entry-doors");
  const heatingData = getSectionValues("heating-summary");
  const coldWaterData = getSectionValues("cold-water-supply");
  const hotWaterData = getSectionValues("hot-water-supply");
  const kitchenFacilitiesData = getSectionValues("kitchen-facilities");
  const lightingSummaryData = getSectionValues("lighting-summary");
  const mouldSummaryData = getSectionValues("mould-dampness-summary");
  const ventilationSummaryData = getSectionValues("ventilation-summary");
  const structuralBowingData = getSectionValues("structural-bowing-summary");
  const structuralCrackingData = getSectionValues(
    "structural-cracking-summary"
  );
  const structuralWarpingData = getSectionValues("structural-warping-summary");
  const toiletSummaryData = getSectionValues("toilet-summary");
  const windowCoverSummaryData = getSectionValues("window-coverings-summary");
  const windowLatchSummaryData = getSectionValues("windows-latches-summary");

  const bedroomsInspected =
    Number(propertySetup["bedroom-count"]) ||
    template?.metadata?.bedroomCount ||
    0;
  const bathroomsInspected =
    Number(propertySetup["bathroom-count"]) ||
    template?.metadata?.bathroomCount ||
    0;

  const formatYesNo = (value) =>
    value === "yes" ? "Yes" : value === "no" ? "No" : value || "N/A";

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 18;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      const photoHeight = 220;
      const totalPhotoSpace = photoHeight + 25;

      ensurePageSpace(doc, totalPhotoSpace);

      const result = await processImageForPdf(
        {
          imageUrl: mediaItem.imageBuffer || mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        },
        doc,
        PAGE.margin,
        doc.y,
        400,
        photoHeight
      );

      doc.y += result.height + 15;

      // Add photo caption if available
      if (mediaItem.metadata?.caption) {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(9)
          .font("Helvetica")
          .text(mediaItem.metadata.caption, PAGE.margin, doc.y, {
            width: 400,
            align: "left",
          });
        doc.y += 10;
      }
    }

    doc.y += 5; // Extra spacing after photo section
  };

  // Helper function to format property address
  const formatPropertyAddress = () => {
    // First check if propertySummary has a string value
    if (propertySummary["property-address"]) {
      const addr = propertySummary["property-address"];
      if (typeof addr === "string") return addr;
      if (typeof addr === "object" && addr !== null) {
        return addr.fullAddress || addr.street || JSON.stringify(addr);
      }
    }

    // Then check property.address
    if (property?.address) {
      if (typeof property.address === "string") {
        return property.address;
      }
      if (typeof property.address === "object" && property.address !== null) {
        return (
          property.address.fullAddress ||
          property.address.street ||
          (property.address.streetNumber && property.address.streetName
            ? `${property.address.streetNumber} ${
                property.address.streetName
              }, ${property.address.suburb || ""} ${
                property.address.state || ""
              } ${property.address.postcode || ""}`.trim()
            : "N/A")
        );
      }
    }

    return "N/A";
  };

  // Overall Property Summary Section
  const summaryRows = [
    {
      label: "Property Address",
      value: formatPropertyAddress(),
    },
    {
      label: "Inspection Date",
      value: formatDisplayDate(
        propertySummary["inspection-date"] || report?.submittedAt
      ),
    },
    {
      label: "Inspector Name",
      value:
        propertySummary["inspector-name"] ||
        `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
        "N/A",
    },
    {
      label: "Inspector License",
      value: propertySummary["inspector-license"] || "N/A",
    },
    {
      label: "Bedrooms Inspected",
      value: bedroomsInspected || "N/A",
    },
    {
      label: "Bathrooms Inspected",
      value: bathroomsInspected || "N/A",
    },
    {
      label: "Property Owner/Manager",
      value: propertySummary["owner-name"] || "N/A",
    },
    {
      label: "Overall Compliance Status",
      value: propertySummary["overall-compliance"] || "N/A",
    },
    {
      label: "Next Inspection Due",
      value: formatDisplayDate(executiveSummary["next-inspection-date"]),
    },
  ];

  drawRoomDetailTable(
    doc,
    "Overall Property Summary",
    summaryRows.map((row) => ({
      label: row.label,
      value: row.value,
    }))
  );
  await renderSectionPhotos("property-summary", "Property Exterior");

  drawSummaryList(doc, "Disclaimer", ["This is only a visual check."]);

  const overallRows = [
    { id: "summary-recycle-general", label: "Recycle and General Waste" },
    { id: "summary-kitchen", label: "Kitchen" },
    { id: "summary-laundry", label: "Laundry" },
    { id: "summary-living-room", label: "Living Room" },
    { id: "summary-front-entrance", label: "Front Entrance" },
    { id: "summary-electrical", label: "Electrical Safety" },
  ];

  // Bathroom and bedroom details are now handled in dedicated sections
  // No longer adding individual bathroom/bedroom rows to Overall Minimum Standards

  // Build consolidated overall summary data from individual sections
  console.log("Available section data for overall summary:");
  console.log("binFacilities:", Object.keys(binFacilities));
  console.log("kitchenFacilitiesData:", Object.keys(kitchenFacilitiesData));
  console.log("electricalSafety:", Object.keys(electricalSafety));
  console.log("frontEntrance:", Object.keys(frontEntrance));
  console.log("overallSummaryData:", Object.keys(overallSummaryData));

  const consolidatedOverallData = {
    // Map from bin facilities data
    "summary-recycle-general":
      binFacilities["recycle-general-overall"] ||
      binFacilities["bin-facilities-overall"],
    "summary-recycle-general-comments":
      binFacilities["recycle-general-comments"] ||
      binFacilities["bin-facilities-comments"],

    // Map from kitchen facilities data
    "summary-kitchen":
      kitchenFacilitiesData["kitchen-overall"] ||
      kitchenFacilitiesData["kitchen-facilities-overall"],
    "summary-kitchen-comments":
      kitchenFacilitiesData["kitchen-comments"] ||
      kitchenFacilitiesData["kitchen-facilities-comments"],

    // Map from other individual section data
    "summary-laundry":
      getSectionValues("laundry-summary")["laundry-overall"] ||
      getSectionValues("laundry")["laundry-overall"],
    "summary-laundry-comments":
      getSectionValues("laundry-summary")["laundry-comments"] ||
      getSectionValues("laundry")["laundry-comments"],

    "summary-living-room":
      getSectionValues("living-room-summary")["living-room-overall"] ||
      getSectionValues("living-room")["living-room-overall"],
    "summary-living-room-comments":
      getSectionValues("living-room-summary")["living-room-comments"] ||
      getSectionValues("living-room")["living-room-comments"],

    "summary-front-entrance":
      frontEntrance["front-entrance-overall"] ||
      frontEntrance["entrance-overall"],
    "summary-front-entrance-comments":
      frontEntrance["front-entrance-comments"] ||
      frontEntrance["entrance-comments"],

    "summary-electrical":
      electricalSafety["electrical-overall"] ||
      electricalSafety["electrical-safety-overall"],
    "summary-electrical-comments":
      electricalSafety["electrical-comments"] ||
      electricalSafety["electrical-safety-comments"],

    // Add data from overallSummaryData as fallback
    ...overallSummaryData,
  };

  // Bathroom and bedroom data is no longer included in Overall Minimum Standards
  // They are handled in dedicated sections instead

  drawMinimumStandardStatusTable(
    doc,
    "Overall Minimum Standards",
    overallRows,
    consolidatedOverallData
  );

  const presenceRows = [];
  for (let i = 1; i <= bathroomsInspected; i++) {
    presenceRows.push(
      { id: `bathroom-${i}-bath`, label: `Bathroom ${i} – Bath` },
      { id: `bathroom-${i}-shower`, label: `Bathroom ${i} – Shower` },
      { id: `bathroom-${i}-washbasin`, label: `Bathroom ${i} – Washbasin` }
    );
  }
  if (presenceRows.length) {
    // Convert presence data to match drawMinimumStandardStatusTable format
    const convertedExecutiveFixtures = {};
    presenceRows.forEach(row => {
      const originalValue = executiveFixtures[row.id];
      // Map presence values to meets/doesn't meet format
      if (originalValue === 'present') {
        convertedExecutiveFixtures[row.id] = 'meets';
      } else if (originalValue === 'not_present') {
        convertedExecutiveFixtures[row.id] = 'does_not_meet';
      }
      // Copy over any comments/actions
      const actionField = `${row.id}-action`;
      if (executiveFixtures[actionField]) {
        convertedExecutiveFixtures[`${row.id}-comments`] = executiveFixtures[actionField];
      }
    });

    drawMinimumStandardStatusTable(
      doc,
      "Executive Summary – Bathroom Fixtures",
      presenceRows,
      convertedExecutiveFixtures,
      {
        commentsLabel: "Action",
        meetsLabel: "Present",
        doesNotMeetLabel: "Not Present"
      }
    );
  }

  const externalDoorRows = [
    { id: "external-door-front-entrance", label: "Front Entrance" },
    { id: "external-door-living-room", label: "Living Room" },
    { id: "external-door-laundry", label: "Laundry" },
  ];
  drawMinimumStandardStatusTable(
    doc,
    "External Entry Doors",
    externalDoorRows,
    externalDoorData
  );

  drawMinimumStandardStatusTable(
    doc,
    "Heating",
    [{ id: "heating-living-room", label: "Living Room" }],
    heatingData
  );

  const coldWaterRows = [
    { id: "cold-water-kitchen", label: "Kitchen" },
    { id: "cold-water-laundry", label: "Laundry" },
  ];
  const hotWaterRows = [
    { id: "hot-water-kitchen", label: "Kitchen" },
    { id: "hot-water-laundry", label: "Laundry" },
  ];
  for (let i = 1; i <= bathroomsInspected; i++) {
    coldWaterRows.push({
      id: `cold-water-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    hotWaterRows.push({
      id: `hot-water-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
  }

  drawMinimumStandardStatusTable(
    doc,
    "Cold Water Supply",
    coldWaterRows,
    coldWaterData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Hot Water Supply",
    hotWaterRows,
    hotWaterData
  );

  const kitchenFacilityRows = [
    { id: "kitchen-stovetop", label: "Stovetop" },
    { id: "kitchen-food-prep", label: "Food Preparation Area" },
    { id: "kitchen-oven", label: "Oven" },
    { id: "kitchen-sink", label: "Sink" },
  ];
  drawMinimumStandardStatusTable(
    doc,
    "Kitchen Facilities",
    kitchenFacilityRows,
    kitchenFacilitiesData
  );

  const lightingRows = [
    { id: "lighting-front-entrance", label: "Front Entrance" },
    { id: "lighting-living-room", label: "Living Room" },
    { id: "lighting-kitchen", label: "Kitchen" },
    { id: "lighting-laundry", label: "Laundry" },
  ];
  const mouldRows = [
    { id: "mould-front-entrance", label: "Front Entrance" },
    { id: "mould-living-room", label: "Living Room" },
    { id: "mould-kitchen", label: "Kitchen" },
    { id: "mould-laundry", label: "Laundry" },
  ];
  const ventilationRows = [
    { id: "ventilation-front-entrance", label: "Front Entrance" },
    { id: "ventilation-living-room", label: "Living Room" },
    { id: "ventilation-kitchen", label: "Kitchen" },
    { id: "ventilation-laundry", label: "Laundry" },
  ];
  const structuralBowingRows = [
    { id: "struct-bowing-front-entrance", label: "Front Entrance" },
    { id: "struct-bowing-living-room", label: "Living Room" },
    { id: "struct-bowing-kitchen", label: "Kitchen" },
    { id: "struct-bowing-laundry", label: "Laundry" },
  ];
  const structuralCrackingRows = [
    { id: "struct-cracking-front-entrance", label: "Front Entrance" },
    { id: "struct-cracking-living-room", label: "Living Room" },
    { id: "struct-cracking-kitchen", label: "Kitchen" },
    { id: "struct-cracking-laundry", label: "Laundry" },
  ];
  const structuralWarpingRows = [
    { id: "struct-warping-front-entrance", label: "Front Entrance" },
    { id: "struct-warping-living-room", label: "Living Room" },
    { id: "struct-warping-kitchen", label: "Kitchen" },
    { id: "struct-warping-laundry", label: "Laundry" },
  ];

  for (let i = 1; i <= bedroomsInspected; i++) {
    lightingRows.push({ id: `lighting-bedroom-${i}`, label: `Bedroom ${i}` });
    mouldRows.push({ id: `mould-bedroom-${i}`, label: `Bedroom ${i}` });
    ventilationRows.push({
      id: `ventilation-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralBowingRows.push({
      id: `struct-bowing-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralCrackingRows.push({
      id: `struct-cracking-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralWarpingRows.push({
      id: `struct-warping-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
  }
  for (let i = 1; i <= bathroomsInspected; i++) {
    lightingRows.push({ id: `lighting-bathroom-${i}`, label: `Bathroom ${i}` });
    mouldRows.push({ id: `mould-bathroom-${i}`, label: `Bathroom ${i}` });
    ventilationRows.push({
      id: `ventilation-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralBowingRows.push({
      id: `struct-bowing-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralCrackingRows.push({
      id: `struct-cracking-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralWarpingRows.push({
      id: `struct-warping-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
  }

  drawMinimumStandardStatusTable(
    doc,
    "Lighting",
    lightingRows,
    lightingSummaryData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Mould and Dampness",
    mouldRows,
    mouldSummaryData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Ventilation",
    ventilationRows,
    ventilationSummaryData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Structural – Bowing and Leaning",
    structuralBowingRows,
    structuralBowingData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Structural – Cracking",
    structuralCrackingRows,
    structuralCrackingData
  );
  drawMinimumStandardStatusTable(
    doc,
    "Structural – Warping",
    structuralWarpingRows,
    structuralWarpingData
  );

  if (bathroomsInspected > 0) {
    const toiletRows = [];
    for (let i = 1; i <= bathroomsInspected; i++) {
      toiletRows.push({ id: `toilet-bathroom-${i}`, label: `Bathroom ${i}` });
    }
    drawMinimumStandardStatusTable(
      doc,
      "Toilet Facilities",
      toiletRows,
      toiletSummaryData
    );
  }

  const windowCoverRows = [
    { id: "window-coverings-living-room", label: "Living Room" },
  ];
  for (let i = 1; i <= bedroomsInspected; i++) {
    windowCoverRows.push({
      id: `window-coverings-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
  }
  drawMinimumStandardStatusTable(
    doc,
    "Window Coverings",
    windowCoverRows,
    windowCoverSummaryData
  );

  const windowLatchRows = [];
  for (let i = 1; i <= bedroomsInspected; i++) {
    windowLatchRows.push({ id: `windows-bedroom-${i}`, label: `Bedroom ${i}` });
  }
  for (let i = 1; i <= bathroomsInspected; i++) {
    windowLatchRows.push({
      id: `windows-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
  }
  if (windowLatchRows.length) {
    drawMinimumStandardStatusTable(
      doc,
      "Windows and Latches",
      windowLatchRows,
      windowLatchSummaryData
    );
  }

  // Front Entrance Section
  const frontEntranceRows = [
    {
      label: "Building Classification",
      value: frontEntrance["front-entrance-building-classification"] || "N/A",
    },
    {
      label: "Front Entrance Condition",
      value: frontEntrance["front-entrance-condition"] || "N/A",
    },
    {
      label: "External Door Present",
      value: formatYesNo(frontEntrance["front-entrance-external-door-present"]),
    },
    {
      label: "Public Lobby Door",
      value: formatYesNo(frontEntrance["front-entrance-public-lobby"]),
    },
    {
      label: "Entrance Door Secure",
      value: formatYesNo(frontEntrance["front-entrance-security"]),
    },
    {
      label: "Security/Screen Door Installed",
      value: formatYesNo(frontEntrance["front-entrance-screen-door"]),
    },
    {
      label: "Entrance Lighting Functional",
      value: frontEntrance["front-entrance-lighting"] || "N/A",
    },
    {
      label: "Weather Protection",
      value: frontEntrance["front-entrance-weather-protection"] || "N/A",
    },
    {
      label: "Deadlock/Deadlatch Present",
      value: formatYesNo(frontEntrance["front-entrance-deadlock-present"]),
    },
    {
      label: "Deadlock Functioning",
      value: formatYesNo(frontEntrance["front-entrance-deadlock-functional"]),
    },
    {
      label: "Deadlock Meets Standard",
      value: formatYesNo(frontEntrance["front-entrance-deadlock-standard"]),
    },
  ];

  if (frontEntrance["front-entrance-notes"]) {
    frontEntranceRows.push({
      label: "Comments",
      value: frontEntrance["front-entrance-notes"],
    });
  }

  drawRoomDetailTable(doc, "Front Entrance", frontEntranceRows);
  await renderSectionPhotos("front-entrance", "Front Entrance");

  // Executive Summary Section
  if (
    executiveSummary["inspection-summary"] ||
    executiveSummary["key-findings"] ||
    executiveSummary["recommendations"]
  ) {
    ensurePageSpace(doc, 150);
    drawSectionHeader(doc, "Executive Summary");

    if (executiveSummary["inspection-summary"]) {
      doc
        .fillColor(COLORS.textSecondary)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Summary:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica")
        .text(executiveSummary["inspection-summary"], PAGE.margin, doc.y, {
          width: 500,
        });
      doc.y += 20;
    }

    if (executiveSummary["key-findings"]) {
      doc
        .fillColor(COLORS.textSecondary)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Key Findings:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica")
        .text(executiveSummary["key-findings"], PAGE.margin, doc.y, {
          width: 500,
        });
      doc.y += 20;
    }

    if (executiveSummary["recommendations"]) {
      doc
        .fillColor(COLORS.textSecondary)
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Recommendations:", PAGE.margin, doc.y);
      doc.y += 15;
      doc
        .fillColor(COLORS.text)
        .fontSize(10)
        .font("Helvetica")
        .text(executiveSummary["recommendations"], PAGE.margin, doc.y, {
          width: 500,
        });
      doc.y += 30;
    }
  }

  // Electrical Safety Section
  const electricalRows = [
    {
      label: "Switchboard Location",
      value: electricalSafety["switchboard-location"] || "N/A",
    },
    {
      label: "Electrical System Compliance",
      value: electricalSafety["electrical-compliance"] || "N/A",
    },
    {
      label: "Switchboard Condition",
      value: electricalSafety["switchboard-condition"] || "N/A",
    },
    {
      label: "Circuit Breakers Connected",
      value: formatYesNo(electricalSafety["switchboard-circuit-breaker"]),
    },
    {
      label: "RCD Present and Working",
      value:
        electricalSafety["rcd-present"] === "yes"
          ? "Yes"
          : electricalSafety["rcd-present"] === "no"
          ? "No"
          : "N/A",
    },
    {
      label: "Switchboard Meets Standards",
      value: formatYesNo(electricalSafety["switchboard-meets-standard"]),
    },
    {
      label: "Power Outlets Condition",
      value: electricalSafety["electrical-outlets"] || "N/A",
    },
  ];

  if (electricalSafety["electrical-notes"]) {
    electricalRows.push({
      label: "Notes",
      value: electricalSafety["electrical-notes"],
    });
  }

  drawRoomDetailTable(doc, "Electrical Safety", electricalRows);
  await renderSectionPhotos("electrical-safety", "Electrical Safety");

  // Bin Facilities Section
  const binRows = [
    {
      label: "General Waste Bin Present",
      value: formatYesNo(binFacilities["bin-general-present"]),
    },
    {
      label: "General Waste Bin Condition",
      value: formatYesNo(binFacilities["bin-general-condition"]),
    },
    {
      label: "General Bin Meets Standards",
      value: formatYesNo(binFacilities["bin-general-standard"]),
    },
    {
      label: "Recycle Bin Present",
      value: formatYesNo(binFacilities["bin-recycle-present"]),
    },
    {
      label: "Recycle Bin Condition",
      value: formatYesNo(binFacilities["bin-recycle-condition"]),
    },
    {
      label: "Recycle Bin Meets Standards",
      value: formatYesNo(binFacilities["bin-recycle-standard"]),
    },
  ];

  if (binFacilities["bin-notes"]) {
    binRows.push({
      label: "Notes",
      value: binFacilities["bin-notes"],
    });
  }

  drawRoomDetailTable(doc, "Bin Facilities", binRows);
  await renderSectionPhotos("bin-facilities", "Bin Facilities");

  // Dynamic Bedroom and Bathroom Sections
  const additionalDetailSections = new Set([
    "living-room",
    "kitchen",
    "laundry",
  ]);

  for (const section of template.sections || []) {
    const isBedroom = section.id.startsWith("bedroom-");
    const isBathroom = section.id.startsWith("bathroom-");
    const isAdditional = additionalDetailSections.has(section.id);

    if (!isBedroom && !isBathroom && !isAdditional) {
      continue;
    }

    const sectionData = getSectionValues(section.id);
    const roomNumber = section.id.split("-")[1];
    const baseRoomLabel = isBedroom
      ? "Bedroom"
      : isBathroom
      ? "Bathroom"
      : section.title || section.id;
    const roomTitle =
      isBedroom || isBathroom
        ? `${baseRoomLabel} ${roomNumber}`
        : baseRoomLabel;

    const roomRows = [];
    section.fields?.forEach((field) => {
      if (
        field.type === "photo" ||
        field.type === "photo-multi" ||
        sectionData[field.id] === undefined ||
        sectionData[field.id] === ""
      ) {
        return;
      }

      let value = sectionData[field.id];

      if (field.type === "yes-no") {
        value = formatYesNo(value);
      } else if (field.options && field.options.length) {
        const matched = field.options.find((opt) => opt.value === value);
        if (matched) {
          value = matched.label;
        }
      } else if (
        field.type === "number" &&
        value !== null &&
        value !== undefined
      ) {
        value = value === "" ? "—" : value;
      }

      roomRows.push({
        label: field.question || field.label,
        value,
      });
    });

    if (roomRows.length > 0) {
      drawRoomDetailTable(doc, roomTitle, roomRows);
    }

    await renderSectionPhotos(section.id, roomTitle);
  }
};

const renderGenericReport = async (
  doc,
  { template, report, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = getMediaItemsForSection(report, template, sectionId);

    if (!mediaItems.length) {
      return;
    }

    // Ensure space for photo section header and at least one photo
    ensurePageSpace(doc, 250);

    doc
      .fillColor(COLORS.primary)
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`${heading} Photos`, PAGE.margin, doc.y);
    doc.y += 18;

    for (const mediaItem of mediaItems) {
      // Check if we need space for this photo (220px height + spacing)
      const photoHeight = 220;
      const totalPhotoSpace = photoHeight + 25;

      ensurePageSpace(doc, totalPhotoSpace);

      const result = await processImageForPdf(
        {
          imageUrl: mediaItem.imageBuffer || mediaItem.url,
          gcsPath: mediaItem.gcsPath,
        },
        doc,
        PAGE.margin,
        doc.y,
        400,
        photoHeight
      );

      doc.y += result.height + 15;

      // Add photo caption if available
      if (mediaItem.metadata?.caption || mediaItem.label) {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(9)
          .font("Helvetica")
          .text(
            mediaItem.metadata?.caption || mediaItem.label || "",
            PAGE.margin,
            doc.y,
            {
              width: 400,
              align: "left",
            }
          );
        doc.y += 10;
      }
    }

    doc.y += 5; // Extra spacing after photo section
  };

  // Property Details Summary
  const propertyDetails = getSectionValues("property-details") || {};
  const propertyAddress =
    property?.address?.fullAddress || property?.address?.street || "N/A";
  const inspectionDate = formatDisplayDate(report?.submittedAt || job?.dueDate);
  const inspectorName =
    `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() ||
    "Inspector Name Not Available";

  const summaryRows = [
    {
      label: "Property Address",
      value: propertyAddress,
    },
    {
      label: "Inspection Date",
      value: inspectionDate,
    },
    {
      label: "Inspector",
      value: inspectorName,
    },
    {
      label: "Inspector License",
      value:
        propertyDetails["license-number"] || technician?.licenseNumber || "N/A",
    },
    {
      label: "Report Generated",
      value: formatDisplayDate(new Date()),
    },
  ];

  drawRoomDetailTable(
    doc,
    "Inspection Summary",
    summaryRows.map((row) => ({
      label: row.label,
      value: row.value,
    }))
  );
  await renderSectionPhotos("property-details", "Property Overview");

  if (!template?.sections?.length) {
    return;
  }

  for (const section of template.sections) {
    const responses = report.formData?.[section.id] || {};

    ensurePageSpace(doc, 120);
    drawSectionHeader(doc, section.title);

    // Create table rows for section fields
    const sectionRows = [];
    for (const field of section.fields) {
      const value = responses[field.id];
      if (field.type !== "photo" && field.type !== "photo-multi") {
        const formattedValue = formatValue(value, field.type);
        sectionRows.push({
          label: field.label,
          value: formattedValue || "N/A",
        });
      }
    }

    if (sectionRows.length > 0) {
      drawRoomDetailTable(doc, null, sectionRows);
    }

    await renderSectionPhotos(section.id, section.title || "Section");
  }
};

const drawSectionHeader = (doc, title) => {
  const headerWidth = doc.page.width - PAGE.margin * 2;
  const maxTextWidth = headerWidth - 34;

  doc.font("Helvetica-Bold").fontSize(12);
  const textHeight = doc.heightOfString(title, {
    width: maxTextWidth,
    lineGap: 2,
  });

  const headerHeight = Math.max(28, textHeight + 16);

  ensurePageSpace(doc, headerHeight + 40);

  const headerY = doc.y;
  const textOffsetY = headerY + (headerHeight - textHeight) / 2;

  doc
    .roundedRect(PAGE.margin, headerY, headerWidth, headerHeight, 10)
    .fill(COLORS.primarySoft)
    .stroke(COLORS.border);

  doc
    .fillColor(COLORS.primary)
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(title, PAGE.margin + 16, textOffsetY, {
      width: maxTextWidth,
      lineGap: 2,
    });

  doc.fillColor(COLORS.text);
  doc.y = headerY + headerHeight + 8;
};

const formatValue = (value, fieldType) => {
  if (value === undefined || value === null) {
    return "—";
  }

  switch (fieldType) {
    case "yes-no":
      return value === "yes" ? "Yes" : value === "no" ? "No" : "—";
    case "yes-no-na":
      return value === "yes"
        ? "Yes"
        : value === "no"
        ? "No"
        : value === "na"
        ? "N/A"
        : "—";
    case "pass-fail":
      return value === "pass" ? "Pass" : value === "fail" ? "Fail" : "—";
    case "pass-fail-na":
      return value === "pass"
        ? "Pass"
        : value === "fail"
        ? "Fail"
        : value === "na"
        ? "N/A"
        : "—";
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      return value ? new Date(value).toLocaleDateString("en-AU") : "—";
    default:
      if (Array.isArray(value)) {
        return value.join(", ");
      }
      return `${value}`;
  }
};

const drawGasInstallationSection = (doc, section, responses = {}) => {
  drawSectionHeader(doc, section.title);

  for (const field of section.fields) {
    const value = responses[field.id];
    const formattedValue = formatValue(value, field.type);

    // Special handling for gas installation checks
    if (field.type === "yes-no-na" || field.type === "pass-fail") {
      drawChecklistItem(doc, field.label, formattedValue, field.type);
    } else {
      drawTextField(doc, field.label, formattedValue);
    }
  }

  doc.y += 20;
};

const drawApplianceSection = (doc, section, responses = {}) => {
  drawSectionHeader(doc, section.title);

  // Create appliance checklist table
  const tableY = doc.y;
  const checklistItems = section.fields.filter(
    (f) => f.type === "yes-no" || f.type === "yes-no-na"
  );

  if (checklistItems.length > 0) {
    // Use full page width
    const tableWidth = doc.page.width - PAGE.margin * 2;
    const labelWidth = Math.floor(tableWidth * 0.6); // 60% for label
    const checkboxAreaWidth = tableWidth - labelWidth;
    const checkboxSpacing = Math.floor(checkboxAreaWidth / 3); // For Yes, No, N/A

    // Draw table headers with full width
    doc
      .rect(PAGE.margin, tableY, tableWidth, 28)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    doc
      .fillColor("white")
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Check Item", PAGE.margin + 10, tableY + 10);

    // Position Yes, No, N/A headers properly - align with checkboxes
    const yesX = PAGE.margin + labelWidth + checkboxSpacing * 0 + 25;
    const noX = PAGE.margin + labelWidth + checkboxSpacing * 1 + 25;
    const naX = PAGE.margin + labelWidth + checkboxSpacing * 2 + 25;

    doc
      .text("Yes", yesX, tableY + 10)
      .text("No", noX, tableY + 10)
      .text("N/A", naX, tableY + 10);

    doc.y = tableY + 32;

    // Draw checklist items
    for (const field of checklistItems) {
      const value = responses[field.id];
      drawApplianceCheckRow(doc, field.label, value, field.type);
    }

    // Comments and photos
    const commentField = section.fields.find((f) => f.id.includes("comments"));
    if (commentField) {
      const comments = responses[commentField.id];
      if (comments) {
        drawTextField(doc, "Comments", comments);
      }
    }
  }

  doc.y += 20;
};

// Function to draw pill-shaped chips
const drawPillChip = (
  doc,
  text,
  x,
  y,
  bgColor,
  textColor = "white",
  strokeColor = null
) => {
  const padding = 8;
  const textWidth = doc.widthOfString(text, { fontSize: 9 });
  const chipWidth = textWidth + padding * 2;
  const chipHeight = 18;
  const radius = chipHeight / 2;

  // Draw pill background
  if (bgColor) {
    doc
      .fillColor(bgColor)
      .roundedRect(x, y, chipWidth, chipHeight, radius)
      .fill();
  }

  // Draw stroke for outline chips (N/A)
  if (strokeColor) {
    doc
      .strokeColor(strokeColor)
      .lineWidth(1)
      .roundedRect(x, y, chipWidth, chipHeight, radius)
      .stroke();
  }

  // Draw text
  doc
    .fillColor(textColor)
    .fontSize(9)
    .font("Helvetica-Bold")
    .text(text, x + padding, y + 5);

  return chipWidth;
};

const drawChecklistItem = (doc, label, value, type) => {
  ensurePageSpace(doc, 50);
  const baseY = doc.y;
  const labelX = PAGE.margin + 10;
  const tableWidth = doc.page.width - PAGE.margin * 2;

  // Calculate proper positioning to align with headers
  const labelWidth = Math.floor(tableWidth * 0.6); // 60% for label (same as appliance tables)
  const checkboxAreaWidth = tableWidth - labelWidth;
  const chipAreaStartX = PAGE.margin + labelWidth;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(label, labelX, baseY, { width: labelWidth - 20 });

  // Determine chip positioning and styling
  if (type === "pass-fail") {
    // For pass-fail, position chip at the right side
    const chipY = baseY;
    const chipX = chipAreaStartX + checkboxAreaWidth - 80; // Position at right side

    if (value === "Pass" || value === "pass") {
      drawPillChip(doc, "Pass", chipX, chipY, COLORS.success, "white");
    } else if (value === "Fail" || value === "fail") {
      drawPillChip(doc, "Fail", chipX, chipY, COLORS.error, "white");
    }
  } else {
    // For yes-no-na, position chip at the right side
    const chipY = baseY;
    const chipX = chipAreaStartX + checkboxAreaWidth - 80; // Position at right side

    if (value === "Yes" || value === "yes") {
      drawPillChip(doc, "Yes", chipX, chipY, COLORS.success, "white");
    } else if (value === "No" || value === "no") {
      drawPillChip(doc, "No", chipX, chipY, COLORS.error, "white");
    } else if (value === "N/A" || value === "na") {
      drawPillChip(
        doc,
        "N/A",
        chipX,
        chipY,
        null,
        COLORS.primary,
        COLORS.primary
      );
    }
  }

  doc.y = baseY + 35;
};

const drawApplianceCheckRow = (doc, label, value, type) => {
  ensurePageSpace(doc, 32);
  const baseY = doc.y;
  const tableX = PAGE.margin;
  const tableWidth = doc.page.width - PAGE.margin * 2;
  const columnStart = tableX + 10;

  // Row background - use full width
  doc.rect(tableX, baseY, tableWidth, 25).fill("white").stroke(COLORS.border);

  // Label - use about 60% of width
  const labelWidth = Math.floor(tableWidth * 0.6);
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text(label, columnStart, baseY + 8, { width: labelWidth - 20 });

  // Checkboxes - use remaining 40% of width
  const checkboxAreaStart = tableX + labelWidth;
  const checkboxAreaWidth = tableWidth - labelWidth;
  // Always show 3 options for consistent design
  const options = ["yes", "no", "na"];
  const checkboxSpacing = Math.floor(checkboxAreaWidth / 3);

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    const isSelected = value === option;
    const x = checkboxAreaStart + index * checkboxSpacing + 25; // Match gas installation alignment

    if (isSelected) {
      doc
        .fillColor(COLORS.primary)
        .circle(x + 6, baseY + 12, 4)
        .fill()
        .fillColor("white")
        .text("✓", x + 3, baseY + 8);
    } else {
      // Draw empty circle for unselected options (including N/A placeholder)
      doc
        .circle(x + 6, baseY + 12, 4)
        .stroke(COLORS.border)
        .fillColor("white")
        .fill();
    }
  }

  doc.y = baseY + 28;
};

const drawTextField = (doc, label, value) => {
  ensurePageSpace(doc, 40);

  const contentX = PAGE.margin + 10;
  const contentWidth = doc.page.width - (PAGE.margin + 10) * 2;
  const baseY = doc.y;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(label, contentX, baseY);

  doc
    .font("Helvetica")
    .fillColor(COLORS.textSecondary)
    .text(value || "—", contentX, baseY + 16, {
      width: contentWidth,
    });

  const valueHeight = doc.heightOfString(value || "—", {
    width: contentWidth,
  });

  doc.y = baseY + Math.max(36, valueHeight + 22);
};

const drawComplianceDeclaration = (
  doc,
  section,
  responses = {},
  report,
  sectionHeader = "Testing Status"
) => {
  drawSectionHeader(doc, sectionHeader);

  const overallAssessment =
    responses["final-compliance-outcome"] || responses["overall-assessment"];
  const hasSignature = responses["technician-signature"];

  // Compliance status badge
  let statusColor = COLORS.success;
  let statusText = "COMPLIANT";

  if (overallAssessment === "non-compliant") {
    statusColor = COLORS.warning;
    statusText = "NON-COMPLIANT";
  } else if (overallAssessment === "unsafe") {
    statusColor = COLORS.error;
    statusText = "UNSAFE";
  }

  // Status badge
  doc
    .roundedRect(PAGE.margin + 10, doc.y, 170, 32, 8)
    .fill(statusColor)
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(statusText, PAGE.margin + 28, doc.y + 10);

  doc.y += 50;

  // Declaration text
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text(
      "This gas safety report is prepared in accordance with the requirements contained in the Residential Tenancies Regulations 2021 and all other applicable standards and codes. It has been conducted by a gas fitter with Type A Servicing accreditation.",
      PAGE.margin + 10,
      doc.y,
      { width: doc.page.width - (PAGE.margin + 10) * 2 }
    );

  doc.y += 40;

  // Next check due
  /*  const nextCheckDue = responses["next-check-due"];
  if (nextCheckDue) {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `Next gas safety check due: ${formatDisplayDate(nextCheckDue)}`,
        PAGE.margin + 10,
        doc.y + 60,
        {
          width: doc.page.width - (PAGE.margin + 10) * 2,
        }
      );
  } */
};

const buildSectionRows = (section, responses = {}, { excludeTypes = [] } = {}) =>
  (section?.fields || [])
    .filter((field) => !excludeTypes.includes(field.type))
    .filter((field) => responses[field.id] !== undefined && responses[field.id] !== "")
    .map((field) => ({
      label: field.label,
      value: mapFieldValue(field, responses[field.id]),
    }));

const getPhotoFieldIdsForSection = (template, sectionId) =>
  (template?.sections || [])
    .find((section) => section.id === sectionId)
    ?.fields?.filter(
      (field) => field.type === "photo" || field.type === "photo-multi"
    )
    .map((field) => field.id) || [];

const mediaFieldMatchesSection = (fieldId = "", sectionId, photoFieldIds = []) => {
  if (!fieldId) {
    return false;
  }

  const rawFieldId = String(fieldId);

  if (rawFieldId === sectionId || rawFieldId.includes(sectionId)) {
    return true;
  }

  return photoFieldIds.some((photoFieldId) => {
    return (
      rawFieldId === photoFieldId ||
      rawFieldId.startsWith(`${photoFieldId}-`) ||
      rawFieldId.startsWith(`${photoFieldId}.`) ||
      rawFieldId.startsWith(`${photoFieldId}[`) ||
      rawFieldId.endsWith(`.${photoFieldId}`) ||
      rawFieldId.endsWith(`-${photoFieldId}`) ||
      rawFieldId.includes(`.${photoFieldId}.`) ||
      rawFieldId.includes(`.${photoFieldId}[`) ||
      rawFieldId.includes(`-${photoFieldId}-`) ||
      rawFieldId.includes(`[${photoFieldId}]`)
    );
  });
};

const mediaMatchesSection = (item, sectionId, template) => {
  const photoFieldIds = getPhotoFieldIdsForSection(template, sectionId);

  return (
    item?.metadata?.sectionId === sectionId ||
    mediaFieldMatchesSection(item?.fieldId, sectionId, photoFieldIds)
  );
};

const mediaMatchesRepeatableItem = (item, sectionId, itemIndex, template) => {
  if (item?.metadata?.sectionId === sectionId && item?.metadata?.itemIndex === itemIndex) {
    return true;
  }

  const photoFieldIds = getPhotoFieldIdsForSection(template, sectionId);
  const rawFieldId = String(item?.fieldId || "");

  if (!mediaFieldMatchesSection(rawFieldId, sectionId, photoFieldIds)) {
    return false;
  }

  return (
    rawFieldId.includes(`${sectionId}-${itemIndex}`) ||
    rawFieldId.includes(`${sectionId}.${itemIndex}`) ||
    rawFieldId.includes(`${sectionId}[${itemIndex}]`) ||
    rawFieldId.includes(`-${itemIndex}-`) ||
    rawFieldId.includes(`.${itemIndex}.`) ||
    rawFieldId.includes(`[${itemIndex}]`)
  );
};

const getMediaItemsForSection = (report, template, sectionId) =>
  (report.media || []).filter((item) => mediaMatchesSection(item, sectionId, template));

const getMediaItemsForRepeatableItem = (report, template, sectionId, itemIndex) =>
  (report.media || []).filter((item) =>
    mediaMatchesRepeatableItem(item, sectionId, itemIndex, template)
  );

const renderMediaGallery = async (doc, mediaItems = [], heading) => {
  if (!mediaItems.length) {
    return;
  }

  ensurePageSpace(doc, 250);
  drawSectionHeader(doc, heading);

  for (const mediaItem of mediaItems) {
    ensurePageSpace(doc, 240);

    const label = mediaItem.label || mediaItem.metadata?.caption || "Inspection Photo";
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(label, PAGE.margin, doc.y);
    doc.y += 14;

    const rendered = await processImageForPdf(
      {
        imageUrl: mediaItem.imageBuffer || mediaItem.url,
        gcsPath: mediaItem.gcsPath,
      },
      doc,
      PAGE.margin,
      doc.y,
      doc.page.width - PAGE.margin * 2,
      200
    );

    if (!rendered.success) {
      doc
        .fillColor(COLORS.textSecondary)
        .fontSize(10)
        .font("Helvetica")
        .text(rendered.message || "[Image unavailable]", PAGE.margin, doc.y);
    }

    doc.y += rendered.height + 8;
  }
};

const renderGasApplianceV3 = async (doc, applianceSection, appliance = {}, index, report) => {
  const applianceTypeField = applianceSection.fields.find(
    (field) => field.id === "appliance-type"
  );
  const applianceLocationField = applianceSection.fields.find(
    (field) => field.id === "appliance-location"
  );

  const applianceType = mapFieldValue(applianceTypeField, appliance["appliance-type"]);
  const applianceLocation = appliance["appliance-location"] === "other"
    ? appliance["appliance-location-other"] || "Other"
    : mapFieldValue(applianceLocationField, appliance["appliance-location"]);

  ensurePageSpace(doc, 120);
  drawSectionHeader(doc, `Appliance ${index + 1}`);

  const summaryRows = [
    { label: "Appliance Name", value: appliance["appliance-name"] || "Not specified" },
    {
      label: "Appliance Type",
      value:
        appliance["appliance-type"] === "other"
          ? appliance["appliance-type-other"] || "Other"
          : applianceType,
    },
    { label: "Location", value: applianceLocation || "Not specified" },
    {
      label: "Room Sealed Appliance",
      value: mapYesNoValue(appliance["room-sealed-appliance"]),
    },
  ];
  drawRoomDetailTable(doc, null, summaryRows, { hideHeaders: true });

  const installationRows = [
    "installation-gastight",
    "accessible-for-servicing",
    "isolation-valve-provided",
    "electrically-safe",
    "evidence-of-certification",
    "adequately-restrained",
    "adequate-room-ventilation",
    "clearances-compliant",
    "cowl-chimney-flue-good",
    "flue-correctly-installed",
    "no-scorching-overheating",
  ].map((fieldId) => {
    const field = applianceSection.fields.find((entry) => entry.id === fieldId);
    return {
      label: field?.label || fieldId,
      value: mapFieldValue(field, appliance[fieldId]),
    };
  });

  drawSectionHeader(doc, "Installation & Safety Checks");
  drawRoomDetailTable(doc, null, installationRows);

  const operationalRows = [
    "heat-exchanger-satisfactory",
    "appliance-cleaned",
    "gas-supply-burner-pressure-correct",
    "burner-flame-normal",
    "operating-correctly",
  ].map((fieldId) => {
    const field = applianceSection.fields.find((entry) => entry.id === fieldId);
    return {
      label: field?.label || fieldId,
      value: mapFieldValue(field, appliance[fieldId]),
    };
  });

  drawSectionHeader(doc, "Operational Checks");
  drawRoomDetailTable(doc, null, operationalRows);

  if (appliance["room-sealed-appliance"] === "yes") {
    const roomSealedRows = [
      "negative-pressure-present",
      "co-spillage-test",
    ].map((fieldId) => {
      const field = applianceSection.fields.find((entry) => entry.id === fieldId);
      return {
        label: field?.label || fieldId,
        value: mapFieldValue(field, appliance[fieldId]),
      };
    });

    drawSectionHeader(doc, "Room Sealed Checks");
    drawRoomDetailTable(doc, null, roomSealedRows);
  }

  if (appliance["appliance-comments"]) {
    drawTextField(doc, "Comments", appliance["appliance-comments"]);
  }

  await renderMediaGallery(
    doc,
    getMediaItemsForRepeatableItem(report, template, "gas-appliances", index),
    `Appliance ${index + 1} Photos`
  );
};

const renderGasReportV3 = async (
  doc,
  { template, report, property, technician }
) => {
  const getSection = (sectionId) =>
    template.sections.find((section) => section.id === sectionId);
  const getSectionValues = (sectionId) => report.formData?.[sectionId] || {};

  const propertySection = getSection("property-details");
  const technicianSection = getSection("technician-details");
  const lpGasSection = getSection("lp-gas-checklist");
  const generalSection = getSection("general-gas-checks");
  const applianceSection = getSection("gas-appliances");
  const rectificationSection = getSection("rectification-works-required");
  const finalSection = getSection("final-declaration");

  const propertyDetails = getSectionValues("property-details");
  const technicianDetails = getSectionValues("technician-details");
  const lpGasChecklist = getSectionValues("lp-gas-checklist");
  const generalChecks = getSectionValues("general-gas-checks");
  const rectification = getSectionValues("rectification-works-required");
  const finalDeclaration = getSectionValues("final-declaration");
  const appliances = Array.isArray(report.formData?.["gas-appliances"])
    ? report.formData["gas-appliances"]
    : [];

  if (propertySection) {
    drawSectionHeader(doc, propertySection.title);
    const rows = buildSectionRows(propertySection, propertyDetails);
    drawRoomDetailTable(doc, null, rows, { hideHeaders: true });
  }

  if (technicianSection) {
    drawSectionHeader(doc, technicianSection.title);
    const rows = buildSectionRows(technicianSection, technicianDetails);
    drawRoomDetailTable(doc, null, rows, { hideHeaders: true });
  }

  if (lpGasSection) {
    drawSectionHeader(doc, lpGasSection.title);
    const rows = buildSectionRows(lpGasSection, lpGasChecklist, {
      excludeTypes: ["photo", "photo-multi"],
    });
    drawRoomDetailTable(doc, null, rows);
    await renderMediaGallery(
      doc,
      getMediaItemsForSection(report, template, "lp-gas-checklist"),
      "LP Gas Checklist Photos"
    );
  }

  if (generalSection) {
    drawSectionHeader(doc, generalSection.title);
    const rows = buildSectionRows(generalSection, generalChecks, {
      excludeTypes: ["photo", "photo-multi"],
    });
    drawRoomDetailTable(doc, null, rows);
    await renderMediaGallery(
      doc,
      getMediaItemsForSection(report, template, "general-gas-checks"),
      "General Gas Checks Photos"
    );
  }

  for (const [index, appliance] of appliances.entries()) {
    await renderGasApplianceV3(doc, applianceSection, appliance, index, report);
  }

  if (rectificationSection) {
    drawSectionHeader(doc, rectificationSection.title);
    const rows = buildSectionRows(rectificationSection, rectification, {
      excludeTypes: ["photo", "photo-multi"],
    });
    drawRoomDetailTable(doc, null, rows);
    await renderMediaGallery(
      doc,
      getMediaItemsForSection(report, template, "rectification-works-required"),
      "Rectification Photos"
    );
  }

  if (finalSection) {
    drawComplianceDeclaration(
      doc,
      finalSection,
      finalDeclaration,
      report,
      finalSection.title
    );

    const finalRows = [
      {
        label: "Technician Signature",
        value: finalDeclaration["technician-signature"] ? "Captured" : "Not captured",
      },
      {
        label: "Sign-Off Date",
        value: finalDeclaration["sign-off-date"]
          ? formatDisplayDate(finalDeclaration["sign-off-date"])
          : "Not specified",
      },
      {
        label: "Sign-Off Time",
        value: finalDeclaration["sign-off-time"] || "Not specified",
      },
      {
        label: "Technician",
        value:
          technicianDetails["technician-full-name"] ||
          [technician?.firstName, technician?.lastName].filter(Boolean).join(" ") ||
          "Not specified",
      },
      {
        label: "Declaration",
        value: finalDeclaration["declaration-text"] || "Not specified",
      },
    ];
    drawRoomDetailTable(doc, null, finalRows, { hideHeaders: true });
  }
};

const loadImageBuffer = async ({ imageUrl, gcsPath }) => {
  if (Buffer.isBuffer(imageUrl)) {
    return imageUrl;
  }

  if (gcsPath) {
    const [imageBuffer] = await bucket.file(gcsPath).download();
    return imageBuffer;
  }

  if (!imageUrl) {
    throw new Error("No image URL provided");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(imageUrl, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Image fetch failed with status ${response.status}`);
    }

    return await response.buffer();
  } finally {
    clearTimeout(timeoutId);
  }
};

const prepareRenderableMedia = async (mediaItems = []) => {
  const preparedItems = [];

  for (const item of mediaItems) {
    try {
      const imageBuffer = await loadImageBuffer({
        imageUrl: item.imageBuffer || item.url,
        gcsPath: item.gcsPath,
      });
      const metadata = await sharp(imageBuffer).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      // Some uploads are 1x1 placeholder images, which render as blank pages.
      if (width <= 1 || height <= 1) {
        console.warn("Skipping placeholder image in PDF annex", {
          fieldId: item.fieldId,
          label: item.label,
          width,
          height,
          gcsPath: item.gcsPath,
          url: item.url,
        });
        continue;
      }

      preparedItems.push({
        ...item,
        imageBuffer,
      });
    } catch (error) {
      console.error("Failed to prepare report media for PDF:", {
        fieldId: item.fieldId,
        label: item.label,
        gcsPath: item.gcsPath,
        url: item.url,
        error: error.message,
      });

      preparedItems.push(item);
    }
  }

  return preparedItems;
};

const processImageForPdf = async (
  imageSource,
  doc,
  x,
  y,
  maxWidth,
  maxHeight
) => {
  try {
    if (!imageSource?.imageUrl && !imageSource?.gcsPath) {
      return { success: false, height: 30, message: "[No image URL provided]" };
    }

    try {
      const imageBuffer = await loadImageBuffer(imageSource);
      doc.image(imageBuffer, x, y, {
        fit: [maxWidth, maxHeight],
        align: "left",
      });

      return { success: true, height: maxHeight + 20 };
    } catch (fetchError) {
      if (fetchError.name === "AbortError") {
        console.error("Image fetch timeout:", imageSource);
        return {
          success: false,
          height: 30,
          message: "[Image load timeout]",
        };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("Error loading image for PDF:", error, imageSource);
    return { success: false, height: 30, message: "[Error loading image]" };
  }
};

const drawFinalBrandPage = (doc) => {
  // Finish the current page numbering before adding a new page
  doc.addPage();
  currentPageNumber++;

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  // Default to a white background to keep the finish page clean
  doc.save();
  doc.rect(0, 0, pageWidth, pageHeight).fill("#FFFFFF");
  doc.restore();

  try {
    const logoPath = path.join(__dirname, "../../assets/rentalease-logo.png");
    const logoImage = doc.openImage(logoPath);

    const maxLogoWidth = pageWidth * 0.4;
    const maxLogoHeight = pageHeight * 0.4;
    const widthScale = maxLogoWidth / logoImage.width;
    const heightScale = maxLogoHeight / logoImage.height;
    const scale = Math.min(widthScale, heightScale, 1);

    const renderWidth = logoImage.width * scale;
    const renderHeight = logoImage.height * scale;
    const renderX = (pageWidth - renderWidth) / 2;
    const renderY = (pageHeight - renderHeight) / 2;

    doc.image(logoPath, renderX, renderY, {
      width: renderWidth,
      height: renderHeight,
    });
  } catch (error) {
    console.error("Finish page logo not found, using text fallback:", error);
    doc
      .fillColor(COLORS.primary)
      .fontSize(28)
      .font("Helvetica-Bold")
      .text("RentalEase", 0, pageHeight / 2 - 14, {
        width: pageWidth,
        align: "center",
      });
  }
};

/**
 * Render smoke-only inspection report matching the demo format
 */
const renderSmokeOnlyReport = async (
  doc,
  { report, template, job, property, technician }
) => {
  const getSectionValues = (id) => report.formData?.[id] || {};

  // Import compliance service for automatic calculations
  const { assessOverallCompliance, generateComplianceReportText } =
    await import("./smokeAlarmCompliance.service.js");

  // Get all section data - supports both old and new template structures
  const inspectionSummary = getSectionValues("inspection-summary");
  const jobDetails =
    getSectionValues("job-property-details") || inspectionSummary;
  const propertyDetails =
    getSectionValues("property-coverage") ||
    getSectionValues("property-coverage-check");
  const alarmInventory =
    getSectionValues("smoke-alarm-inventory") ||
    getSectionValues("alarm-inventory");
  const complianceAssessment =
    getSectionValues("compliance-assessment") ||
    getSectionValues("property-level-findings");
  const compliance = getSectionValues("compliance-next-steps");
  const complianceSummary = getSectionValues("compliance-summary");
  const signoff =
    getSectionValues("certification-declaration") ||
    getSectionValues("technician-signoff");

  // Get alarm records from the alarm inventory section
  const alarmRecords = alarmInventory["alarm-records"] || [];

  // Perform compliance assessment
  const complianceResult = assessOverallCompliance({
    ...propertyDetails,
    "alarm-records": alarmRecords,
  });

  const normalizeOverallStatus = (value) => {
    if (!value) {
      return undefined;
    }

    const raw = String(value)
      .trim()
      .replace(/^["'`]+/, "")
      .trim();

    if (!raw) {
      return undefined;
    }

    const lower = raw.toLowerCase();
    const statusLabelMap = {
      compliant: "Compliant",
      "fully-compliant": "Fully Compliant",
      "compliant-with-minor-issues": "Compliant – Minor maintenance items",
      "minor-issues": "Minor issues noted",
      "all-compliant": "All alarms compliant",
      "issues-identified": "Issues identified",
      "replacements-required": "Replacements required",
      "urgent-work-required": "Urgent work required",
      "non-compliant": "Non-Compliant",
      "non-compliant-work-required": "Non-Compliant – Work required",
      "non-compliant-urgent": "Non-Compliant – Urgent work required",
      "major-non-compliance": "Major non-compliance",
      unsafe: "Unsafe conditions present",
    };

    if (statusLabelMap[lower]) {
      return statusLabelMap[lower];
    }

    if (raw.startsWith("✅") || raw.startsWith("❌")) {
      return raw.replace(/^./, "").trim() || raw;
    }

    if (lower.includes("non-compliant") || lower.includes("not compliant")) {
      return "Non-Compliant";
    }

    if (lower.includes("compliant")) {
      return "Compliant";
    }

    return raw;
  };

  // Check all possible sources for overall compliance status
  const complianceOverallStatus = compliance?.["overall-status"];
  const summaryOverallStatus = inspectionSummary["overall-status"];
  const assessmentOverallStatus = complianceAssessment["overall-status"];
  const combinedComplianceStatus = compliance?.["combined-compliance-status"];
  const complianceSummaryStatus =
    complianceSummary?.["overall-smoke-compliance"];
  const propertyComplianceStatus =
    complianceAssessment["overall-property-compliance"];
  const smokeOutcomeStatus = inspectionSummary["smoke-outcome"];

  const manualOverallStatus = [
    complianceOverallStatus,
    summaryOverallStatus,
    assessmentOverallStatus,
    combinedComplianceStatus,
    complianceSummaryStatus,
    propertyComplianceStatus,
    smokeOutcomeStatus,
  ]
    .map(normalizeOverallStatus)
    .find((status) => status !== undefined);

  const overallStatusDisplay =
    manualOverallStatus !== undefined
      ? manualOverallStatus
      : complianceResult.isOverallCompliant
      ? "Compliant"
      : "Non-Compliant";

  // Draw report header section (continue from current page position)
  doc.y += 12; // Add some spacing after property details
  drawSectionHeader(doc, "Smoke Alarm Inspection Summary");

  doc
    .fillColor(COLORS.textSecondary)
    .fontSize(11)
    .font("Helvetica")
    .text(
      "Our inspection identified compliance status of smoke alarms at this property.",
      PAGE.margin,
      doc.y,
      {
        width: doc.page.width - PAGE.margin * 2,
        align: "left",
      }
    );

  doc.y += 6;
  doc.text(
    "Please review the information below for findings and recommendations.",
    PAGE.margin,
    doc.y,
    {
      width: doc.page.width - PAGE.margin * 2,
      align: "left",
    }
  );

  doc.y += 10;

  // Report Details section
  ensurePageSpace(doc, 120);
  drawSectionHeader(doc, "Report Details");

  const technicianName =
    [technician?.firstName, technician?.lastName].filter(Boolean).join(" ") ||
    "Technician Name Not Available";
  const technicianLicense = technician?.licenseNumber || "Licence Not Recorded";

  const reportDetailsData = [
    {
      label: "Report Date",
      value: new Date().toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    {
      label: "Inspection Address",
      value:
        jobDetails["inspection-address"] ||
        property?.fullAddress ||
        property?.address?.street ||
        "N/A",
    },
    {
      label: "Date of Inspection",
      value: new Date(
        jobDetails["inspection-date"] || report.submittedAt
      ).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    { label: "Technician Name", value: technicianName },
    { label: "Technician Licence #", value: technicianLicense },
    { label: "Inspection Type", value: "Smoke Alarm Safety Inspection" },
    {
      label: "Overall Status",
      value: overallStatusDisplay,
    },
  ];

  drawRoomDetailTable(doc, null, reportDetailsData);
  await renderMediaGallery(
    doc,
    getMediaItemsForSection(report, template, "inspection-photos"),
    "Inspection Photos"
  );

  // Smoke Alarm Inspection Details section
  ensurePageSpace(doc, 150);
  drawSectionHeader(doc, "Smoke Alarm Inspection Details");

  if (alarmRecords.length > 0) {
    // Create individual "Report Details" style tables for each smoke alarm
    alarmRecords.forEach((alarm, index) => {
      ensurePageSpace(doc, 200); // Ensure space for each individual table

      // Add some spacing between alarm tables
      if (index > 0) {
        doc.y += 12;
      } else {
        doc.y += 8;
      }

      // Create alarm title header
      const alarmTitle = `Smoke Alarm #${index + 1}`;
      doc
        .fillColor(COLORS.primary)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(alarmTitle, PAGE.margin, doc.y, {
          width: doc.page.width - PAGE.margin * 2,
          align: "left",
        });

      doc.y += 8;

      // Determine alarm type description
      let alarmTypeDesc = "Photoelectric (Mains 240V)";
      if (alarm["power-source"] === "battery-9v") {
        alarmTypeDesc = "Photoelectric (9V Battery)";
      } else if (alarm["power-source"] === "lithium-10yr") {
        alarmTypeDesc = "Photoelectric (10-Year Lithium)";
      }

      // Create the data for this alarm in "Report Details" style
      const alarmDetailsData = [
        {
          label: "Alarm Type",
          value: alarmTypeDesc,
        },
        {
          label: "Location",
          value:
            alarm.location === "hallway-bedrooms"
              ? "Hallway Near Bedrooms"
              : alarm["location-other"] || alarm.location || "Not Specified",
        },
        {
          label: "Brand & Model",
          value: `${alarm.brand || "Not Specified"} ${
            alarm.model ? `- ${alarm.model}` : ""
          }`,
        },
        {
          label: "Sound Level Test",
          value: alarm["sound-level-db"]
            ? `${alarm["sound-level-db"]} dB (${
                alarm["push-test-result"] || "Not Tested"
              })`
            : "Not Tested",
        },
        {
          label: "Manufacture Date",
          value: alarm["manufacture-date"]
            ? new Date(alarm["manufacture-date"]).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Not Readable",
        },
        {
          label: "Expiry Date",
          value: alarm["expiry-date"]
            ? new Date(alarm["expiry-date"]).toLocaleDateString("en-AU", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Not Stated",
        },
        {
          label: "Age (Years)",
          value: alarm["age-years"] ? `${alarm["age-years"]} years` : "Unknown",
        },
        {
          label: "Battery Status",
          value:
            alarm["battery-replaced-today"] === "yes"
              ? "✅ Battery Replaced Today"
              : alarm["battery-present"] === "yes"
              ? "Battery Present"
              : "No Battery",
        },
        {
          label: "Physical Condition",
          value: Array.isArray(alarm["physical-condition"])
            ? alarm["physical-condition"].join(", ")
            : alarm["physical-condition"] || "Not Assessed",
        },
        {
          label: "Compliance Status",
          value:
            alarm["compliance-status"] === "compliant"
              ? "✅ COMPLIANT"
              : "❌ NON-COMPLIANT",
        },
      ];

      // Add comments if available
      if (alarm["alarm-comments"]) {
        alarmDetailsData.push({
          label: "Inspector Comments",
          value: alarm["alarm-comments"],
        });
      }

      // Draw the table using the same style as Report Details
      drawRoomDetailTable(doc, null, alarmDetailsData);

      doc.y += 4; // Add spacing after each alarm table
    });
  }

  // General Comments section
  ensurePageSpace(doc, 80);
  drawSectionHeader(doc, "General Comments");

  const generalComments =
    complianceAssessment["general-comments"] ||
    generateComplianceReportText(complianceResult);

  doc
    .fillColor(COLORS.text)
    .fontSize(11)
    .font("Helvetica")
    .text(generalComments, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      align: "left",
    });

  doc.y += 10;

  // Footer removed as requested
};

export const buildInspectionReportPdf = async ({
  report,
  template,
  job,
  property,
  technician,
}) => {
  const preparedReport = report?.toObject ? report.toObject() : { ...report };
  preparedReport.media = await prepareRenderableMedia(report?.media || []);

  const doc = new PDFDocument({ margin: 0, size: "A4" });
  const chunks = [];

  // Reset page counter for each new PDF
  currentPageNumber = 1;

  // Set up promise to collect PDF data
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
  });

  // Professional cover page with company branding
  drawProfessionalCoverPage(doc, {
    property,
    job,
    technician,
    report: preparedReport,
    template,
  });

  // Draw property details section at top of first content page
  drawPropertyDetailsSection(doc, {
    property,
    job,
    technician,
    report: preparedReport,
    template,
  });

  if (template?.jobType === "Gas") {
    await renderGasReport(doc, {
      template,
      report: preparedReport,
      job,
      property,
      technician,
    });
  } else if (template?.jobType === "GasSmoke") {
    await renderGasSmokeReport(doc, {
      template,
      report: preparedReport,
      job,
      property,
      technician,
    });
  } else if (template?.jobType === "Electrical") {
    if ((template?.version ?? 1) >= 3) {
      await renderElectricalSmokeReport(doc, {
        template,
        report: preparedReport,
        job,
        property,
        technician,
      });
    } else {
      await renderElectricalReport(doc, {
        template,
        report: preparedReport,
        job,
        property,
        technician,
      });
    }
  } else if (template?.jobType === "Smoke") {
    // Check if it's the new smoke-only template (version 3+) or legacy
    if (template.version >= 3) {
      await renderSmokeOnlyReport(doc, {
        template,
        report: preparedReport,
        job,
        property,
        technician,
      });
    } else {
      await renderElectricalSmokeReport(doc, {
        template,
        report: preparedReport,
        job,
        property,
        technician,
      });
    }
  } else if (template?.jobType === "MinimumSafetyStandard") {
    await renderMinimumSafetyStandardReport(doc, {
      template,
      report: preparedReport,
      job,
      property,
      technician,
    });
  } else {
    await renderGenericReport(doc, {
      template,
      report: preparedReport,
      job,
      property,
      technician,
    });
  }

  // Technician notes
  if (preparedReport.notes) {
    ensurePageSpace(doc, 120);
    drawSectionHeader(doc, "Inspector Observations and Suggestions");
    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(10)
      .font("Helvetica")
      .text(preparedReport.notes, PAGE.margin, doc.y, {
        width: doc.page.width - PAGE.margin * 2,
        lineGap: 3,
      });

    doc.y += 40;
  }

  // Declaration and Certification
  if (
    template?.jobType === "Gas" ||
    template?.title?.toLowerCase().includes("gas")
  ) {
    drawGasHazardsSection(doc);
  }
  await drawDeclarationSection(doc, {
    template,
    job,
    technician,
    report: preparedReport,
  });

  // Next Compliance Schedule
  drawNextStepsSection(doc, { template, job, report: preparedReport });

  // Add footer to final content page
  drawPageFooter(doc, currentPageNumber);

  // Append finishing page with centered branding
  drawFinalBrandPage(doc);

  doc.end();
  return pdfPromise;
};

export default buildInspectionReportPdf;
