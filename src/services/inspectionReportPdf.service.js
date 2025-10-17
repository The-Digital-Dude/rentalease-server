import PDFDocument from "pdfkit";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BRAND_PRIMARY = "#024974";
const COLORS = {
  primary: BRAND_PRIMARY,
  primaryAccent: "#0B5F86",
  primarySoft: "#E4EFF5",
  text: "#1F2933",
  textSecondary: "#4B5563",
  border: "#D1D9E0",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
  neutralBackground: "#F7FAFC",
};

const PAGE = {
  margin: 60,
};

const ensurePageSpace = (doc, required = 80) => {
  const footerSpace = 60;
  const currentY = doc.y;
  const pageHeight = doc.page.height;
  const availableSpace = pageHeight - currentY - PAGE.margin - footerSpace;

  // If we have enough space, continue on current page
  if (required <= availableSpace) {
    return false; // No page break needed
  }

  // Only add new page if we're not already at the top
  if (currentY > PAGE.margin + 20) {
    doc.addPage();
    doc.y = PAGE.margin;
    doc.fillColor(COLORS.text);
    return true; // Page break occurred
  }

  return false;
};

const drawRoomDetailTable = (doc, title, rows = []) => {
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
  const headerHeight = 26;

  // Draw table header
  const headerY = doc.y;
  doc
    .rect(tableX, headerY, questionWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + questionWidth, headerY, answerWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Header text
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Inspection Item", tableX + 10, headerY + 8, {
      width: questionWidth - 20,
      align: "left"
    });

  doc
    .text("Result", tableX + questionWidth + 10, headerY + 8, {
      width: answerWidth - 20,
      align: "left"
    });

  doc.y = headerY + headerHeight;

  // Draw data rows
  rows.forEach((row, index) => {
    const question = row.label || row.question || "";
    const answer = row.value ?? row.answer ?? "—";

    // Calculate row height based on content
    const questionHeight = doc.heightOfString(question, {
      width: questionWidth - 20,
      align: "left"
    });
    const answerHeight = doc.heightOfString(String(answer), {
      width: answerWidth - 20,
      align: "left"
    });
    const rowHeight = Math.max(28, Math.max(questionHeight, answerHeight) + 12);

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
    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(question, tableX + 10, rowY + 8, {
        width: questionWidth - 20,
        align: "left"
      });

    doc
      .font("Helvetica")
      .text(String(answer), tableX + questionWidth + 10, rowY + 8, {
        width: answerWidth - 20,
        align: "left"
      });

    doc.y = rowY + rowHeight;
  });

  doc.y += 20; // Space after table
};

const getReportTitle = (template, job) => {
  const jobType = template?.jobType || job?.jobType;

  const titleMap = {
    "MinimumSafetyStandard": "Minimum Safety Standard Report",
    "Electrical": "Electrical Compliance Report",
    "Gas": "Gas Compliance Report",
    "Smoke": "Smoke Compliance Report"
  };

  return titleMap[jobType] || "Inspection Report";
};

const getComplianceStandards = (template, job) => {
  const jobType = template?.jobType || job?.jobType;

  const standardsMap = {
    "MinimumSafetyStandard": [
      "Residential Tenancies Regulations 2021",
      "Building Code of Australia",
      "Australian Standards AS/NZS 3000"
    ],
    "Electrical": [
      "AS/NZS 3000 Wiring Rules",
      "AS/NZS 3017:2022 Electrical Installations",
      "Residential Tenancies Regulations 2021"
    ],
    "Gas": [
      "AS 4575 Gas installations",
      "AS 3786:2014 Gas appliances",
      "Residential Tenancies Regulations 2021"
    ],
    "Smoke": [
      "AS/NZS 3017:2022 Smoke alarms",
      "AS 3786:2014 Installation requirements",
      "Residential Tenancies Regulations 2021"
    ]
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

  return date.toLocaleDateString(undefined, {
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

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const drawProfessionalCoverPage = (doc, { property, job, technician, report, template }) => {
  const reportTitle = getReportTitle(template, job);
  const complianceStandards = getComplianceStandards(template, job);

  // Full page gradient background
  doc
    .rect(0, 0, doc.page.width, doc.page.height)
    .fill(COLORS.primary);

  // Add decorative accent
  doc
    .rect(0, 0, doc.page.width, 180)
    .fill(COLORS.primaryAccent);

  // Company Logo Section
  try {
    const logoPath = path.join(__dirname, "../../assets/rentalease-logo.png");
    doc.image(logoPath, doc.page.width - 180, 40, {
      width: 140,
      height: 42
    });
  } catch (error) {
    console.error('Logo not found, using text fallback:', error);
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("white")
      .text("RentalEase", doc.page.width - 180, 50, {
        width: 140,
        align: "center",
      });
  }

  // Main Title Section
  doc
    .fillColor("white")
    .fontSize(36)
    .font("Helvetica-Bold")
    .text(reportTitle, 60, 250, {
      width: doc.page.width - 120,
      align: "left",
      lineGap: 10
    });

  // Property Information Card
  const cardY = 350;
  const cardHeight = 160;

  doc
    .roundedRect(60, cardY, doc.page.width - 120, cardHeight, 12)
    .fill("white")
    .stroke(COLORS.border);

  const propertyAddress = property?.address?.fullAddress || property?.address?.street || "Property Address Not Available";
  const inspectionDate = formatDisplayDate(report?.submittedAt || job?.dueDate);
  const inspectorName = `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() || "Inspector Name Not Available";

  doc
    .fillColor(COLORS.text)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Property Details", 80, cardY + 20);

  doc
    .fontSize(11)
    .font("Helvetica")
    .text("Address:", 80, cardY + 45)
    .text(propertyAddress, 140, cardY + 45, { width: doc.page.width - 180 });

  doc
    .text("Inspection Date:", 80, cardY + 70)
    .text(inspectionDate, 180, cardY + 70);

  doc
    .text("Inspector:", 80, cardY + 95)
    .text(inspectorName, 140, cardY + 95);

  doc
    .text("Report Generated:", 80, cardY + 120)
    .text(formatDisplayDate(new Date()), 180, cardY + 120);

  // Compliance Standards Section
  const standardsY = cardY + cardHeight + 40;

  doc
    .fillColor("white")
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("Compliance Standards", 60, standardsY);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("rgba(255, 255, 255, 0.9)");

  let currentY = standardsY + 25;
  complianceStandards.forEach((standard, index) => {
    doc.text(`• ${standard}`, 60, currentY);
    currentY += 18;
  });

  // Footer Section
  const footerY = doc.page.height - 120;

  doc
    .fillColor("rgba(255, 255, 255, 0.8)")
    .fontSize(10)
    .font("Helvetica")
    .text("Compliance & Safety Services", 60, footerY)
    .text("info@rentalease.com.au", 60, footerY + 20)
    .text("03 5906 7723", 60, footerY + 40)
    .text("3/581 Dohertys Road, Truganina VIC 3029", 60, footerY + 60);

  // Professional disclaimer
  doc
    .fontSize(8)
    .fillColor("rgba(255, 255, 255, 0.7)")
    .text("This report has been prepared in accordance with applicable Australian Standards and Regulations.",
          doc.page.width - 300, footerY + 40, { width: 240, align: "right" });

  // Start new page for content
  doc.addPage();
  doc.fillColor(COLORS.text);
  doc.y = PAGE.margin;
};

const drawDeclarationSection = (doc, { template, job, technician, report }) => {
  ensurePageSpace(doc, 200);
  drawSectionHeader(doc, "Declaration & Certification");

  const reportTitle = getReportTitle(template, job);
  const complianceStandards = getComplianceStandards(template, job);
  const inspectorName = `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() || "Inspector";

  // Declaration text
  const declarationText = `This ${reportTitle.toLowerCase()} has been prepared in accordance with the requirements contained in the following standards and regulations:`;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(declarationText, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      lineGap: 3
    });

  doc.y += 20;

  // List compliance standards
  complianceStandards.forEach((standard) => {
    doc
      .fontSize(10)
      .text(`• ${standard}`, PAGE.margin + 20, doc.y);
    doc.y += 16;
  });

  doc.y += 10;

  // Professional certification statement
  const certificationText = `I certify that this inspection has been conducted by a qualified inspector and the information contained in this report is true and accurate to the best of my knowledge.`;

  doc
    .fontSize(10)
    .text(certificationText, PAGE.margin, doc.y, {
      width: doc.page.width - PAGE.margin * 2,
      lineGap: 3
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

  // Signature box
  const boxY = doc.y;
  doc
    .roundedRect(PAGE.margin, boxY, 300, 60, 8)
    .stroke(COLORS.border);

  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(COLORS.textSecondary)
    .text("Inspector Name:", PAGE.margin + 10, boxY + 10)
    .text(inspectorName, PAGE.margin + 10, boxY + 25)
    .text("Date:", PAGE.margin + 10, boxY + 40)
    .text(formatDisplayDate(report?.submittedAt || new Date()), PAGE.margin + 80, boxY + 40);

  // Digital signature indicator
  doc
    .fillColor(COLORS.success)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("✓ Digitally Certified", PAGE.margin + 320, boxY + 25);

  doc.y = boxY + 80;
};

const drawFaultSummarySection = (doc, { report, template, job }) => {
  ensurePageSpace(doc, 120);
  drawSectionHeader(doc, "Faults & Rectification Summary");

  // Analyze form data to find any reported faults or issues
  const formData = report?.formData || {};
  const faults = [];

  // Check for common fault indicators in form data
  Object.keys(formData).forEach(sectionId => {
    const sectionData = formData[sectionId] || {};
    Object.keys(sectionData).forEach(fieldId => {
      const value = sectionData[fieldId];

      // Look for negative responses, failures, or issues
      if (value === "does_not_meet" || value === "fail" || value === "not_present" ||
          value === "no" || value === "unsafe" || value === "non-compliant") {

        // Get comments or action notes for this field
        const comments = sectionData[`${fieldId}-comments`] ||
                        sectionData[`${fieldId}-action`] ||
                        sectionData[`${fieldId}-notes`] ||
                        "Requires attention";

        faults.push({
          area: sectionId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          issue: fieldId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          status: value,
          action: comments,
          priority: value === "unsafe" ? "High" : value === "fail" ? "Medium" : "Low"
        });
      }
    });
  });

  if (faults.length > 0) {
    // Use improved table rendering with proper page management
    const tableX = PAGE.margin;
    const tableWidth = doc.page.width - PAGE.margin * 2;
    const headerHeight = 26;

    // Column widths
    const areaWidth = 120;
    const issueWidth = 180;
    const priorityWidth = 80;
    const actionWidth = tableWidth - areaWidth - issueWidth - priorityWidth;

    // Ensure space for header + at least 2 rows
    ensurePageSpace(doc, headerHeight + 80);

    // Header
    const headerY = doc.y;
    doc
      .rect(tableX, headerY, areaWidth, headerHeight)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    doc
      .rect(tableX + areaWidth, headerY, issueWidth, headerHeight)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    doc
      .rect(tableX + areaWidth + issueWidth, headerY, priorityWidth, headerHeight)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    doc
      .rect(tableX + areaWidth + issueWidth + priorityWidth, headerY, actionWidth, headerHeight)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    // Header text
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Area", tableX + 10, headerY + 8, { width: areaWidth - 20, align: "left" })
      .text("Issue", tableX + areaWidth + 10, headerY + 8, { width: issueWidth - 20, align: "left" })
      .text("Priority", tableX + areaWidth + issueWidth + 10, headerY + 8, { width: priorityWidth - 20, align: "center" })
      .text("Required Action", tableX + areaWidth + issueWidth + priorityWidth + 10, headerY + 8, { width: actionWidth - 20, align: "left" });

    doc.y = headerY + headerHeight;

    // Fault rows with proper page break management
    faults.forEach((fault, index) => {
      // Calculate dynamic row height based on content
      const actionHeight = doc.heightOfString(fault.action, {
        width: actionWidth - 20,
        align: "left"
      });
      const rowHeight = Math.max(28, actionHeight + 12);

      // Ensure space for this row
      ensurePageSpace(doc, rowHeight + 5);

      const rowY = doc.y;
      const fillColor = index % 2 === 0 ? "white" : COLORS.primarySoft;

      // Draw row backgrounds
      doc
        .rect(tableX, rowY, areaWidth, rowHeight).fill(fillColor).stroke(COLORS.border)
        .rect(tableX + areaWidth, rowY, issueWidth, rowHeight).fill(fillColor).stroke(COLORS.border)
        .rect(tableX + areaWidth + issueWidth, rowY, priorityWidth, rowHeight).fill(fillColor).stroke(COLORS.border)
        .rect(tableX + areaWidth + issueWidth + priorityWidth, rowY, actionWidth, rowHeight).fill(fillColor).stroke(COLORS.border);

      // Priority color coding
      const priorityColor = fault.priority === "High" ? COLORS.error :
                           fault.priority === "Medium" ? COLORS.warning :
                           COLORS.textSecondary;

      // Add text content
      doc
        .fillColor(COLORS.text)
        .font("Helvetica")
        .fontSize(9)
        .text(fault.area, tableX + 10, rowY + 8, { width: areaWidth - 20, align: "left" })
        .text(fault.issue, tableX + areaWidth + 10, rowY + 8, { width: issueWidth - 20, align: "left" })
        .fillColor(priorityColor)
        .font("Helvetica-Bold")
        .text(fault.priority, tableX + areaWidth + issueWidth + 10, rowY + 8, { width: priorityWidth - 20, align: "center" })
        .fillColor(COLORS.text)
        .font("Helvetica")
        .text(fault.action, tableX + areaWidth + issueWidth + priorityWidth + 10, rowY + 8, { width: actionWidth - 20, align: "left" });

      doc.y = rowY + rowHeight;
    });

    doc.y += 20;
  } else {
    // No faults found
    ensurePageSpace(doc, 80);

    doc
      .roundedRect(PAGE.margin, doc.y, doc.page.width - PAGE.margin * 2, 60, 8)
      .fill(COLORS.success)
      .stroke(COLORS.border);

    doc
      .fillColor("white")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text("✓ No Faults Identified", PAGE.margin + 20, doc.y + 20, {
        width: doc.page.width - PAGE.margin * 2 - 40,
        align: "center"
      });

    doc.y += 80;
  }
};

const drawNextStepsSection = (doc, { template, job, report }) => {
  ensurePageSpace(doc, 150);
  drawSectionHeader(doc, "Next Steps & Compliance Schedule");

  const jobType = template?.jobType || job?.jobType;

  // Calculate next inspection dates based on job type
  const getNextInspectionDate = (jobType) => {
    const inspectionDate = new Date(report?.submittedAt || new Date());
    const nextDate = new Date(inspectionDate);

    switch (jobType) {
      case "Gas":
        nextDate.setFullYear(nextDate.getFullYear() + 2); // 24 months
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
};


const drawMinimumStandardStatusTable = (
  doc,
  title,
  rows,
  sectionData,
  { commentsLabel = "Comments" } = {}
) => {
  if (!rows.length) {
    return;
  }

  ensurePageSpace(doc, 120 + rows.length * 32);
  drawSectionHeader(doc, title);

  const tableX = PAGE.margin;
  const tableWidth = doc.page.width - PAGE.margin * 2;
  const labelWidth = Math.min(240, tableWidth * 0.4);
  const statusWidth = 90;
  const actionWidth = tableWidth - labelWidth - statusWidth * 2;
  const headerHeight = 26;

  // Header row - Draw backgrounds first
  const headerY = doc.y;

  // Draw all header backgrounds
  doc
    .rect(tableX, headerY, labelWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + labelWidth, headerY, statusWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + labelWidth + statusWidth, headerY, statusWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + labelWidth + statusWidth * 2, headerY, actionWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Now draw text with white color
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10);

  // Area column header
  doc.text("Area", tableX + 10, headerY + 8, {
    width: labelWidth - 20,
    align: "left"
  });

  // Meets column header
  doc.text("Meets", tableX + labelWidth + 10, headerY + 8, {
    width: statusWidth - 20,
    align: "center",
  });

  // Does Not Meet column header
  doc.text("Does Not Meet", tableX + labelWidth + statusWidth + 10, headerY + 8, {
    width: statusWidth - 20,
    align: "center",
  });

  // Comments column header
  doc.text(commentsLabel, tableX + labelWidth + statusWidth * 2 + 10, headerY + 8, {
    width: actionWidth - 20,
    align: "left"
  });

  // Reset text formatting for data rows
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
  doc.y = headerY + headerHeight;

  rows.forEach((row) => {
    ensurePageSpace(doc, 80);
    const status = sectionData?.[row.id];
    const comments =
      sectionData?.[`${row.id}-comments`] ??
      sectionData?.[`${row.id}-action`] ??
      "";

    const meetsText = status === "meets" ? "Yes" : status === "not_applicable" ? "N/A" : "";
    const doesNotMeetText = status === "does_not_meet" ? "Yes" : "";
    const commentText = status === "not_applicable" && !comments ? "N/A" : comments || "";

    const commentHeight = doc.heightOfString(String(commentText || ""), {
      width: actionWidth - 14,
    });
    const rowHeight = Math.max(28, commentHeight + 14);

    doc
      .rect(tableX, doc.y, labelWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth, doc.y, statusWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth + statusWidth, doc.y, statusWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth + statusWidth * 2, doc.y, actionWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .text(row.label, tableX + 10, doc.y + 8, {
        width: labelWidth - 12,
      });

    doc
      .font("Helvetica")
      .text(meetsText, tableX + labelWidth, doc.y + 8, {
        width: statusWidth,
        align: "center",
      });

    doc.text(doesNotMeetText, tableX + labelWidth + statusWidth, doc.y + 8, {
      width: statusWidth,
      align: "center",
    });

    doc.text(String(commentText || ""), tableX + labelWidth + statusWidth * 2 + 10, doc.y + 8, {
      width: actionWidth - 14,
    });

    doc.y += rowHeight;
  });

  doc.y += 16;
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
    .rect(tableX + labelWidth + presenceWidth, headerY, presenceWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  doc
    .rect(tableX + labelWidth + presenceWidth * 2, headerY, actionWidth, headerHeight)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Now draw text with white color
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10);

  // Fixture column header
  doc.text("Fixture", tableX + 10, headerY + 8, {
    width: labelWidth - 20,
    align: "left"
  });

  // Present column header
  doc.text("Present", tableX + labelWidth + 10, headerY + 8, {
    width: presenceWidth - 20,
    align: "center",
  });

  // Not Present column header
  doc.text("Not Present", tableX + labelWidth + presenceWidth + 10, headerY + 8, {
    width: presenceWidth - 20,
    align: "center",
  });

  // Action column header
  doc.text(actionLabel, tableX + labelWidth + presenceWidth * 2 + 10, headerY + 8, {
    width: actionWidth - 20,
    align: "left"
  });

  // Reset text formatting for data rows
  doc.fillColor(COLORS.text).font("Helvetica").fontSize(10);
  doc.y = headerY + headerHeight;

  rows.forEach((row) => {
    ensurePageSpace(doc, 80);
    const value = sectionData?.[row.id];
    const action = sectionData?.[`${row.id}-action`] || "";

    const presentText = value === "present" ? "Yes" : value === "not_applicable" ? "N/A" : "";
    const notPresentText = value === "not_present" ? "Yes" : "";
    const actionText = value === "not_applicable" && !action ? "N/A" : action;

    const actionHeight = doc.heightOfString(String(actionText || ""), {
      width: actionWidth - 14,
    });
    const rowHeight = Math.max(28, actionHeight + 14);

    doc
      .rect(tableX, doc.y, labelWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth, doc.y, presenceWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth + presenceWidth, doc.y, presenceWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);
    doc
      .rect(tableX + labelWidth + presenceWidth * 2, doc.y, actionWidth, rowHeight)
      .fill("white")
      .stroke(COLORS.border);

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .text(row.label, tableX + 10, doc.y + 8, { width: labelWidth - 12 });

    doc
      .font("Helvetica")
      .text(presentText, tableX + labelWidth, doc.y + 8, {
        width: presenceWidth,
        align: "center",
      });

    doc.text(notPresentText, tableX + labelWidth + presenceWidth, doc.y + 8, {
      width: presenceWidth,
      align: "center",
    });

    doc.text(String(actionText || ""), tableX + labelWidth + presenceWidth * 2 + 10, doc.y + 8, {
      width: actionWidth - 14,
    });

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
      value: `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() || "N/A",
    },
  ];

  drawRoomDetailTable(doc, "Property Report Summary", rows.map(row => ({
    question: row.label,
    answer: row.value
  })));
};

const mapCoverageValue = (value) => {
  const displayMap = {
    "included": "Included",
    "not-included": "Not included",
    "not-inspected": "Not inspected",
  };
  return displayMap[value] || "Not specified";
};

const mapInspectionStatus = (value) => {
  const displayMap = {
    "satisfactory": "Satisfactory",
    "unsatisfactory": "Unsatisfactory",
    "not-inspected": "Not inspected",
  };
  return displayMap[value] || "Not specified";
};

const mapTestingStatus = (value) => {
  const displayMap = {
    "pass": "Pass",
    "fail": "Fail",
    "not-tested": "Not tested",
  };
  return displayMap[value] || "Not specified";
};

const mapYesNoValue = (value) => {
  if (value === "yes" || value === true) return "Yes";
  if (value === "no" || value === false) return "No";
  return "Not specified";
};

const mapOutcomeValue = (value) => {
  const displayMap = {
    "no-faults": "No faults identified",
    "faults-identified": "Faults identified",
    "repairs-required": "Repairs required",
  };
  return displayMap[value] || "Pending";
};

const getOutcomeColor = (value) => {
  switch (value) {
    case "no-faults":
      return COLORS.success;
    case "faults-identified":
      return COLORS.warning;
    case "repairs-required":
      return COLORS.error;
    default:
      return COLORS.textSecondary;
  }
};

const drawOutcomeBadges = (doc, outcomes = []) => {
  if (!outcomes.length) {
    return;
  }

  const availableWidth = doc.page.width - PAGE.margin * 2;
  const badgeWidth = (availableWidth - (outcomes.length - 1) * 16) / outcomes.length;
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
    const rowHeight = Math.max(
      20,
      doc.heightOfString(String(textValue), { width: valueWidth, align: "left" }) + 6
    );

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(label, PAGE.margin, cursorY, { width: labelWidth });

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(10)
      .text(String(textValue), PAGE.margin + labelWidth + 10, cursorY, {
        width: valueWidth,
      });

    cursorY += rowHeight;
  });

  doc.y = cursorY + 16;
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
  const availableWidth = doc.page.width - (PAGE.margin * 2);
  const columnDefinitions = [
    { id: "voltage", label: "Voltage", width: Math.floor(availableWidth * 0.15) },
    { id: "status", label: "Status", width: Math.floor(availableWidth * 0.25) },
    { id: "location", label: "Location", width: Math.floor(availableWidth * 0.30) },
    { id: "level", label: "Level", width: Math.floor(availableWidth * 0.15) },
    { id: "expiration", label: "Expiration", width: Math.floor(availableWidth * 0.15) },
  ];

  const totalWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);

  // Header - Draw background first
  doc
    .rect(startX, startY, totalWidth, 24)
    .fill(COLORS.primary)
    .stroke(COLORS.border);

  // Draw header text with white color
  doc
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10);

  let columnX = startX;
  columnDefinitions.forEach((column) => {
    doc.text(column.label, columnX + 8, startY + 7, {
      width: column.width - 16,
      align: "center"
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
      value: certification["certification-electrician-name"] || certification["inspector-name"],
    },
    {
      label: "Licence/registration number",
      value: certification["certification-licence-number"] || certification["license-number"],
    },
    {
      label: "Inspection date",
      value: formatDisplayDate(certification["certification-inspection-date"]),
    },
    {
      label: "Next inspection due",
      value: formatDisplayDate(certification["certification-next-inspection-due"]),
    },
    {
      label: "Signed at",
      value: certification["certification-signed-at"] || "—",
    },
  ];

  drawRoomDetailTable(doc, "Electrical Safety Check Certification", rows.map(row => ({
    question: row.label,
    answer: row.value
  })));

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
      .text(String(certification["certification-notes"]), PAGE.margin, doc.y + 14, {
        width: doc.page.width - PAGE.margin * 2,
      });

    doc.y += 60;
  }
};

const renderElectricalSmokeReport = (doc, { report, template, job, property }) => {
  const getSectionValues = (id) => report.formData?.[id] || {};
  const findSectionDefinition = (id) => template.sections?.find((section) => section.id === id);

  const summarySection = getSectionValues("inspection-summary");
  const certificationSection = {
    ...summarySection,
    ...getSectionValues("certification"),
  };

  const propertyAddress =
    property?.address?.fullAddress ||
    property?.address?.street ||
    property?.address ||
    "N/A";

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
      value: summarySection["inspector-name"] || "N/A",
    },
    {
      label: "Licence/registration number",
      value: summarySection["license-number"] || "N/A",
    },
    {
      label: "Previous safety check",
      value: formatDisplayDate(summarySection["previous-inspection-date"]) || "Not recorded",
    },
  ];

  drawRoomDetailTable(doc, "Property Report Summary", summaryRows.map(row => ({
    question: row.label,
    answer: row.value
  })));

  drawOutcomeBadges(doc, [
    {
      title: "Electrical Safety Check",
      valueKey: summarySection["electrical-outcome"],
    },
    {
      title: "Smoke Alarm Check",
      valueKey: summarySection["smoke-outcome"],
    },
  ]);

  if (summarySection["summary-notes"]) {
    ensurePageSpace(doc, 120);
    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Next steps", PAGE.margin, doc.y);

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica")
      .fontSize(10)
      .text(String(summarySection["summary-notes"]), PAGE.margin, doc.y + 14, {
        width: doc.page.width - PAGE.margin * 2,
      });

    doc.y += 60;
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
    drawRoomDetailTable(doc, "Contact", contactRows.map(row => ({
      question: row.label,
      answer: row.value
    })));
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
      }));

    if (items.length) {
      drawStatusList(
        doc,
        sectionDefinition.title || sectionId,
        items,
        mapper || ((value) => value)
      );
    }

    noteFieldIds.forEach((noteId) => {
      const noteValue = responses[noteId];
      if (noteValue) {
        ensurePageSpace(doc, 80);
        doc
          .fillColor(COLORS.textSecondary)
          .font("Helvetica")
          .fontSize(10)
          .text(String(noteValue), PAGE.margin, doc.y, {
            width: doc.page.width - PAGE.margin * 2,
          });
        doc.y += 40;
      }
    });
  };

  renderStatusSection("extent-of-installation", mapCoverageValue, ["extent-notes"]);
  renderStatusSection("visual-inspection", mapInspectionStatus, ["visual-notes"]);
  renderStatusSection("testing-polarity", mapTestingStatus, ["polarity-notes"]);
  renderStatusSection("testing-earth", mapTestingStatus, ["earth-continuity-notes"]);

  const rcdValues = getSectionValues("rcd-testing");
  const rcdDefinition = findSectionDefinition("rcd-testing");
  if (rcdDefinition) {
    const rcdStatusItems = (rcdDefinition.fields || [])
      .filter((field) => field.id === "rcd-test-result")
      .map((field) => ({ label: field.label, value: rcdValues[field.id] }));

    if (rcdStatusItems.length) {
      drawStatusList(doc, rcdDefinition.title || "RCD testing", rcdStatusItems, mapTestingStatus);
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
      doc.y += 40;
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
      doc.y += 40;
    }
  }

  drawCertificationBlock(doc, certificationSection);
};

const renderGasReport = async (doc, { template, report, job, property, technician }) => {
  drawPropertyDetails(doc, { property, job, technician, report });

  if (!template?.sections?.length) {
    return;
  }

  for (const section of template.sections) {
    const responses = report.formData?.[section.id] || {};

    if (doc.y > doc.page.height - 150) {
      doc.addPage();
      doc.y = PAGE.margin;
      doc.fillColor(COLORS.text);
    }

    if (section.id === "gas-installation") {
      drawGasInstallationSection(doc, section, responses);
    } else if (section.id.startsWith("appliance-")) {
      drawApplianceSection(doc, section, responses);
    } else if (section.id === "fault-identification") {
      drawFaultIdentificationSection(doc, section, responses);
    } else if (section.id === "final-declaration") {
      drawComplianceDeclaration(doc, section, responses, report);
    } else {
      const genericTitle =
        section.title === "Property Details"
          ? "Inspector Details"
          : section.title;
      drawSectionHeader(doc, genericTitle);

      for (const field of section.fields) {
        const value = responses[field.id];

        if (field.type === "photo" || field.type === "photo-multi") {
          const fieldMedia = report.media?.filter((item) => item.fieldId === field.id) || [];

          if (fieldMedia.length > 0) {
            const imageLabelX = PAGE.margin + 10;
            doc
              .fillColor(COLORS.text)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(field.label, imageLabelX, doc.y);

            doc.y += 15;

            for (const mediaItem of fieldMedia) {
              const result = await processImageForPdf(
                mediaItem.url,
                doc,
                PAGE.margin + 10,
                doc.y,
                200,
                150
              );

              if (result.success) {
                doc.y += result.height;
              } else {
                doc
                  .fillColor(COLORS.textSecondary)
                  .fontSize(9)
                  .font("Helvetica")
                  .text(result.message, imageLabelX, doc.y);
                doc.y += result.height;
              }

              if (doc.y > doc.page.height - 150) {
                doc.addPage();
                doc.y = PAGE.margin;
                doc.fillColor(COLORS.text);
              }
            }

            doc.y += 10;
          } else {
            doc
              .fillColor(COLORS.text)
              .fontSize(10)
              .font("Helvetica-Bold")
              .text(field.label, PAGE.margin + 10, doc.y);

            doc
              .font("Helvetica")
              .fillColor(COLORS.textSecondary)
              .text("No photos attached", PAGE.margin + 10, doc.y + 2);

            doc.y += 25;
          }
        } else {
          const formattedValue = formatValue(value, field.type);
          drawTextField(doc, field.label, formattedValue);
        }
      }

      doc.y += 20;
    }
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
  const structuralCrackingData = getSectionValues("structural-cracking-summary");
  const structuralWarpingData = getSectionValues("structural-warping-summary");
  const toiletSummaryData = getSectionValues("toilet-summary");
  const windowCoverSummaryData = getSectionValues("window-coverings-summary");
  const windowLatchSummaryData = getSectionValues("windows-latches-summary");

  const bedroomsInspected = Number(propertySetup["bedroom-count"]) || template?.metadata?.bedroomCount || 0;
  const bathroomsInspected = Number(propertySetup["bathroom-count"]) || template?.metadata?.bathroomCount || 0;

  const formatYesNo = (value) =>
    value === "yes" ? "Yes" : value === "no" ? "No" : value || "N/A";

  const renderSectionPhotos = async (sectionId, heading) => {
    const mediaItems = (report.media || []).filter(
      (item) => item.metadata?.sectionId === sectionId
    );

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
        mediaItem.url,
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
            align: 'left'
          });
        doc.y += 10;
      }
    }

    doc.y += 5; // Extra spacing after photo section
  };

  // Overall Property Summary Section
  const summaryRows = [
    {
      label: "Property Address",
      value: propertySummary["property-address"] || property?.address?.fullAddress || property?.address?.street || "N/A",
    },
    {
      label: "Inspection Date",
      value: formatDisplayDate(propertySummary["inspection-date"] || report?.submittedAt),
    },
    {
      label: "Inspector Name",
      value: propertySummary["inspector-name"] || `${technician?.firstName || ""} ${technician?.lastName || ""}`.trim() || "N/A",
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

  drawRoomDetailTable(doc, "Overall Property Summary", summaryRows.map(row => ({
    label: row.label,
    value: row.value
  })));
  await renderSectionPhotos("property-summary", "Property Exterior");

  const overallRows = [
    { id: "summary-recycle-general", label: "Recycle and General Waste" },
    { id: "summary-kitchen", label: "Kitchen" },
    { id: "summary-laundry", label: "Laundry" },
    { id: "summary-living-room", label: "Living Room" },
    { id: "summary-front-entrance", label: "Front Entrance" },
    { id: "summary-electrical", label: "Electrical Safety" },
  ];

  for (let i = 1; i <= bathroomsInspected; i++) {
    overallRows.push({ id: `summary-bathroom-${i}`, label: `Bathroom ${i}` });
  }
  for (let i = 1; i <= bedroomsInspected; i++) {
    overallRows.push({ id: `summary-bedroom-${i}`, label: `Bedroom ${i}` });
  }

  // Build consolidated overall summary data from individual sections
  console.log("Available section data for overall summary:");
  console.log("binFacilities:", Object.keys(binFacilities));
  console.log("kitchenFacilitiesData:", Object.keys(kitchenFacilitiesData));
  console.log("electricalSafety:", Object.keys(electricalSafety));
  console.log("frontEntrance:", Object.keys(frontEntrance));
  console.log("overallSummaryData:", Object.keys(overallSummaryData));

  const consolidatedOverallData = {
    // Map from bin facilities data
    "summary-recycle-general": binFacilities["recycle-general-overall"] || binFacilities["bin-facilities-overall"],
    "summary-recycle-general-comments": binFacilities["recycle-general-comments"] || binFacilities["bin-facilities-comments"],

    // Map from kitchen facilities data
    "summary-kitchen": kitchenFacilitiesData["kitchen-overall"] || kitchenFacilitiesData["kitchen-facilities-overall"],
    "summary-kitchen-comments": kitchenFacilitiesData["kitchen-comments"] || kitchenFacilitiesData["kitchen-facilities-comments"],

    // Map from other individual section data
    "summary-laundry": getSectionValues("laundry-summary")["laundry-overall"] || getSectionValues("laundry")["laundry-overall"],
    "summary-laundry-comments": getSectionValues("laundry-summary")["laundry-comments"] || getSectionValues("laundry")["laundry-comments"],

    "summary-living-room": getSectionValues("living-room-summary")["living-room-overall"] || getSectionValues("living-room")["living-room-overall"],
    "summary-living-room-comments": getSectionValues("living-room-summary")["living-room-comments"] || getSectionValues("living-room")["living-room-comments"],

    "summary-front-entrance": frontEntrance["front-entrance-overall"] || frontEntrance["entrance-overall"],
    "summary-front-entrance-comments": frontEntrance["front-entrance-comments"] || frontEntrance["entrance-comments"],

    "summary-electrical": electricalSafety["electrical-overall"] || electricalSafety["electrical-safety-overall"],
    "summary-electrical-comments": electricalSafety["electrical-comments"] || electricalSafety["electrical-safety-comments"],

    // Add data from overallSummaryData as fallback
    ...overallSummaryData,
  };

  // Add bedroom and bathroom summary data
  for (let i = 1; i <= bathroomsInspected; i++) {
    const bathroomData = getSectionValues(`bathroom-${i}-summary`) || getSectionValues(`bathroom-${i}`);
    consolidatedOverallData[`summary-bathroom-${i}`] = bathroomData[`bathroom-${i}-overall`] || bathroomData["bathroom-overall"];
    consolidatedOverallData[`summary-bathroom-${i}-comments`] = bathroomData[`bathroom-${i}-comments`] || bathroomData["bathroom-comments"];
  }
  for (let i = 1; i <= bedroomsInspected; i++) {
    const bedroomData = getSectionValues(`bedroom-${i}-summary`) || getSectionValues(`bedroom-${i}`);
    consolidatedOverallData[`summary-bedroom-${i}`] = bedroomData[`bedroom-${i}-overall`] || bedroomData["bedroom-overall"];
    consolidatedOverallData[`summary-bedroom-${i}-comments`] = bedroomData[`bedroom-${i}-comments`] || bedroomData["bedroom-comments"];
  }

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
      { id: `bathroom-${i}-washbasin`, label: `Bathroom ${i} – Washbasin` },
    );
  }
  if (presenceRows.length) {
    drawPresenceTable(
      doc,
      "Executive Summary – Bathroom Fixtures",
      presenceRows,
      executiveFixtures
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
    coldWaterRows.push({ id: `cold-water-bathroom-${i}`, label: `Bathroom ${i}` });
    hotWaterRows.push({ id: `hot-water-bathroom-${i}`, label: `Bathroom ${i}` });
  }

  drawMinimumStandardStatusTable(doc, "Cold Water Supply", coldWaterRows, coldWaterData);
  drawMinimumStandardStatusTable(doc, "Hot Water Supply", hotWaterRows, hotWaterData);

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
    ventilationRows.push({ id: `ventilation-bedroom-${i}`, label: `Bedroom ${i}` });
    structuralBowingRows.push({ id: `struct-bowing-bedroom-${i}`, label: `Bedroom ${i}` });
    structuralCrackingRows.push({ id: `struct-cracking-bedroom-${i}`, label: `Bedroom ${i}` });
    structuralWarpingRows.push({ id: `struct-warping-bedroom-${i}`, label: `Bedroom ${i}` });
  }
  for (let i = 1; i <= bathroomsInspected; i++) {
    lightingRows.push({ id: `lighting-bathroom-${i}`, label: `Bathroom ${i}` });
    mouldRows.push({ id: `mould-bathroom-${i}`, label: `Bathroom ${i}` });
    ventilationRows.push({ id: `ventilation-bathroom-${i}`, label: `Bathroom ${i}` });
    structuralBowingRows.push({ id: `struct-bowing-bathroom-${i}`, label: `Bathroom ${i}` });
    structuralCrackingRows.push({ id: `struct-cracking-bathroom-${i}`, label: `Bathroom ${i}` });
    structuralWarpingRows.push({ id: `struct-warping-bathroom-${i}`, label: `Bathroom ${i}` });
  }

  drawMinimumStandardStatusTable(doc, "Lighting", lightingRows, lightingSummaryData);
  drawMinimumStandardStatusTable(doc, "Mould and Dampness", mouldRows, mouldSummaryData);
  drawMinimumStandardStatusTable(doc, "Ventilation", ventilationRows, ventilationSummaryData);
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
    drawMinimumStandardStatusTable(doc, "Toilet Facilities", toiletRows, toiletSummaryData);
  }

  const windowCoverRows = [
    { id: "window-coverings-living-room", label: "Living Room" },
  ];
  for (let i = 1; i <= bedroomsInspected; i++) {
    windowCoverRows.push({ id: `window-coverings-bedroom-${i}`, label: `Bedroom ${i}` });
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
    windowLatchRows.push({ id: `windows-bathroom-${i}`, label: `Bathroom ${i}` });
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
  if (executiveSummary["inspection-summary"] || executiveSummary["key-findings"] || executiveSummary["recommendations"]) {
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
        .text(executiveSummary["inspection-summary"], PAGE.margin, doc.y, { width: 500 });
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
        .text(executiveSummary["key-findings"], PAGE.margin, doc.y, { width: 500 });
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
        .text(executiveSummary["recommendations"], PAGE.margin, doc.y, { width: 500 });
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
      value: electricalSafety["rcd-present"] === "yes" ? "Yes" : electricalSafety["rcd-present"] === "no" ? "No" : "N/A",
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
    const roomTitle = isBedroom || isBathroom ? `${baseRoomLabel} ${roomNumber}` : baseRoomLabel;

    const roomRows = [];
    section.fields?.forEach((field) => {
      if (
        (field.type === "photo" || field.type === "photo-multi") ||
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
      } else if (field.type === "number" && value !== null && value !== undefined) {
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

const renderGenericReport = async (doc, { template, report, job, property, technician }) => {
  drawPropertyDetails(doc, { property, job, technician, report });

  if (!template?.sections?.length) {
    return;
  }

  for (const section of template.sections) {
    const responses = report.formData?.[section.id] || {};

    if (doc.y > doc.page.height - 150) {
      doc.addPage();
      doc.y = PAGE.margin;
      doc.fillColor(COLORS.text);
    }

    drawSectionHeader(doc, section.title);

    for (const field of section.fields) {
      const value = responses[field.id];

      if (field.type === "photo" || field.type === "photo-multi") {
        const fieldMedia = report.media?.filter((item) => item.fieldId === field.id) || [];

        if (fieldMedia.length > 0) {
          doc
            .fillColor(COLORS.text)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(field.label, PAGE.margin + 10, doc.y);

          doc.y += 15;

          for (const mediaItem of fieldMedia) {
            const result = await processImageForPdf(
              mediaItem.url,
              doc,
              PAGE.margin + 10,
              doc.y,
              200,
              150
            );

            if (result.success) {
              doc.y += result.height;
            } else {
              doc
                .fillColor(COLORS.textSecondary)
                .fontSize(9)
                .font("Helvetica")
                .text(result.message, PAGE.margin + 10, doc.y);
              doc.y += result.height;
            }

            if (doc.y > doc.page.height - 150) {
              doc.addPage();
              doc.y = PAGE.margin;
              doc.fillColor(COLORS.text);
            }
          }

          doc.y += 10;
        } else {
          doc
            .fillColor(COLORS.text)
            .fontSize(10)
            .font("Helvetica-Bold")
            .text(field.label, PAGE.margin + 10, doc.y);

          doc
            .font("Helvetica")
            .fillColor(COLORS.textSecondary)
            .text("No photos attached", PAGE.margin + 10, doc.y + 2);

          doc.y += 25;
        }
      } else {
        const formattedValue = formatValue(value, field.type);
        drawTextField(doc, field.label, formattedValue);
      }
    }

    doc.y += 20;
  }
};

const drawSectionHeader = (doc, title) => {
  ensurePageSpace(doc, 60);

  const headerWidth = doc.page.width - PAGE.margin * 2;
  const headerY = doc.y;

  doc
    .roundedRect(PAGE.margin, headerY, headerWidth, 32, 10)
    .fill(COLORS.primary)
    .fillColor("white")
    .fontSize(13)
    .font("Helvetica-Bold")
    .text(title, PAGE.margin + 18, headerY + 10);

  doc.fillColor(COLORS.text).y = headerY + 48;
};

const formatValue = (value, fieldType) => {
  if (value === undefined || value === null) {
    return "—";
  }

  switch (fieldType) {
    case "yes-no":
      return value === "yes" ? "Yes" : value === "no" ? "No" : "—";
    case "yes-no-na":
      return value === "yes" ? "Yes" : value === "no" ? "No" : value === "na" ? "N/A" : "—";
    case "pass-fail":
      return value === "pass" ? "Pass" : value === "fail" ? "Fail" : "—";
    case "boolean":
      return value ? "Yes" : "No";
    case "date":
      return value ? new Date(value).toLocaleDateString() : "—";
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
  const checklistItems = section.fields.filter(f => f.type === "yes-no" || f.type === "yes-no-na");

  if (checklistItems.length > 0) {
    // Draw table headers
    doc
      .rect(PAGE.margin, tableY, 320, 24)
      .fill(COLORS.neutralBackground)
      .stroke(COLORS.border);

    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Check Item", PAGE.margin + 10, tableY + 8)
      .text("Yes", PAGE.margin + 230, tableY + 8)
      .text("No", PAGE.margin + 270, tableY + 8)
      .text("N/A", PAGE.margin + 310, tableY + 8);

    doc.y = tableY + 30;

    // Draw checklist items
    for (const field of checklistItems) {
      const value = responses[field.id];
      drawApplianceCheckRow(doc, field.label, value, field.type);
    }

    // Comments and photos
    const commentField = section.fields.find(f => f.id.includes("comments"));
    if (commentField) {
      const comments = responses[commentField.id];
      if (comments) {
        drawTextField(doc, "Comments", comments);
      }
    }
  }

  doc.y += 20;
};

const drawChecklistItem = (doc, label, value, type) => {
  ensurePageSpace(doc, 45);
  const baseY = doc.y;
  const labelX = PAGE.margin + 10;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(label, labelX, baseY, { width: 200 });

  // Draw checkboxes
  const options = type === "yes-no-na" ? ["Yes", "No", "N/A"] : ["Pass", "Fail"];
  let x = PAGE.margin + 220;

  for (const option of options) {
    const isSelected = value === option || (value === "yes" && option === "Yes") ||
                      (value === "no" && option === "No") || (value === "na" && option === "N/A") ||
                      (value === "pass" && option === "Pass") || (value === "fail" && option === "Fail");

    // Draw checkbox
    doc.rect(x, baseY + 2, 12, 12).stroke(COLORS.border);

    if (isSelected) {
      doc
        .fillColor(type === "pass-fail" && option === "Pass" ? COLORS.success :
                  type === "pass-fail" && option === "Fail" ? COLORS.error : COLORS.primary)
        .rect(x + 3, baseY + 3, 8, 8)
        .fill();
    }

    doc
      .fillColor(COLORS.text)
      .fontSize(8)
      .text(option, x + 18, baseY + 4);

    x += 70;
  }

  doc.y = baseY + 28;
};

const drawApplianceCheckRow = (doc, label, value, type) => {
  ensurePageSpace(doc, 28);
  const baseY = doc.y;
  const tableX = PAGE.margin;
  const columnStart = tableX + 10;

  // Row background
  doc
    .rect(tableX, baseY, 320, 20)
    .fill("white")
    .stroke(COLORS.border);

  // Label
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text(label, columnStart, baseY + 5, { width: 200, ellipsis: true });

  // Checkboxes
  const positions = [tableX + 230, tableX + 270, tableX + 310];
  const options = ["yes", "no", "na"];

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (type === "yes-no" && option === "na") continue; // Skip N/A for yes-no fields

    const isSelected = value === option;
    const x = positions[index];

    if (isSelected) {
      doc
        .fillColor(COLORS.primary)
        .circle(x + 6, baseY + 10, 4)
        .fill()
        .fillColor("white")
        .text("✓", x + 3, baseY + 6);
    } else {
      doc
        .circle(x + 6, baseY + 10, 4)
        .stroke(COLORS.border);
    }
  }

  doc.y = baseY + 24;
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

const drawFaultIdentificationSection = (doc, section, responses = {}) => {
  drawSectionHeader(doc, section.title);

  const faultIdentified = responses["fault-identified"];
  const rectification = responses["rectification-required"];
  const location = responses["fault-location"];
  const assessment = responses["assessment-status"];

  if (faultIdentified || rectification || location || assessment) {
    // Create fault table
    const tableHeaders = ["Identified Fault(s)", "Rectification", "Location", "Assessment", "Repair Completed?"];
    const tableY = doc.y;

    // Draw table header - background first
    doc
      .rect(PAGE.margin, tableY, doc.page.width - PAGE.margin * 2, 24)
      .fill(COLORS.primary)
      .stroke(COLORS.border);

    // Draw header text with white color
    doc
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold");

    let x = PAGE.margin + 10;
    const columnWidths = [120, 150, 80, 80, 100];
    for (let index = 0; index < tableHeaders.length; index++) {
      const header = tableHeaders[index];
      doc.text(header, x, tableY + 6, {
        width: columnWidths[index] - 20,
        align: "left"
      });
      x += columnWidths[index];
    }

    // Draw data row
    doc.y = tableY + 25;
    doc
      .rect(PAGE.margin, doc.y, doc.page.width - PAGE.margin * 2, 44)
      .fill("white")
      .stroke(COLORS.border);

    x = PAGE.margin + 10;
    const rowData = [
      faultIdentified || "—",
      rectification || "—",
      location || "—",
      assessment || "—",
      "No" // Default repair status
    ];

    doc.fillColor(COLORS.text).fontSize(8).font("Helvetica");
    for (let index = 0; index < rowData.length; index++) {
      const data = rowData[index];
      doc.text(data, x, doc.y + 8, {
        width: columnWidths[index] - 10,
        height: 25,
        ellipsis: true
      });
      x += columnWidths[index];
    }

    doc.y += 50;
  } else {
    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(10)
      .text("No faults identified during this inspection.", PAGE.margin + 10, doc.y, {
        width: doc.page.width - (PAGE.margin + 10) * 2,
      });
    doc.y += 32;
  }
};

const drawComplianceDeclaration = (doc, section, responses = {}, report) => {
  drawSectionHeader(doc, "Declaration");

  const overallAssessment = responses["overall-assessment"];
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

  // Signature area
  if (hasSignature) {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Signed by gasfitter:", PAGE.margin + 10, doc.y);

    doc
      .roundedRect(PAGE.margin + 10, doc.y + 20, 220, 34, 8)
      .stroke(COLORS.border)
      .fillColor(COLORS.success)
      .fontSize(10)
      .text("✓ Digitally Signed", PAGE.margin + 26, doc.y + 32);
  }

  // Next check due
  const nextCheckDue = responses["next-check-due"];
  if (nextCheckDue) {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(
        `Next gas safety check is due within 24 months. Next gas safety check due: ${formatDisplayDate(nextCheckDue)}`,
        PAGE.margin + 10,
        doc.y + 60,
        {
          width: doc.page.width - (PAGE.margin + 10) * 2,
        }
      );
  }
};

const processImageForPdf = async (imageUrl, doc, x, y, maxWidth, maxHeight) => {
  try {
    if (!imageUrl) {
      return { success: false, height: 30, message: "[No image URL provided]" };
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return { success: false, height: 30, message: "[Image could not be loaded]" };
    }

    const imageBuffer = await response.buffer();

    // Add image to PDF
    doc.image(imageBuffer, x, y, {
      fit: [maxWidth, maxHeight],
      align: 'left'
    });

    return { success: true, height: maxHeight + 20 };
  } catch (error) {
    console.error('Error loading image for PDF:', error);
    return { success: false, height: 30, message: "[Error loading image]" };
  }
};

export const buildInspectionReportPdf = async ({
  report,
  template,
  job,
  property,
  technician,
}) => {
  const doc = new PDFDocument({ margin: 0, size: "A4" });
  const chunks = [];

  // Set up promise to collect PDF data
  const pdfPromise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));
  });

  // Professional cover page with company branding
  drawProfessionalCoverPage(doc, { property, job, technician, report, template });

  if (template?.jobType === "Gas") {
    await renderGasReport(doc, { template, report, job, property, technician });
  } else if (template?.jobType === "Electrical" || template?.jobType === "Smoke") {
    renderElectricalSmokeReport(doc, { template, report, job, property });
  } else if (template?.jobType === "MinimumSafetyStandard") {
    await renderMinimumSafetyStandardReport(doc, {
      template,
      report,
      job,
      property,
      technician,
    });
  } else {
    await renderGenericReport(doc, { template, report, job, property, technician });
  }

  // Enhanced Fault & Rectification Summary
  drawFaultSummarySection(doc, { report, template, job });

  // Technician notes
  if (report.notes) {
    ensurePageSpace(doc, 120);
    drawSectionHeader(doc, "Inspector Observations");
    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(10)
      .font("Helvetica")
      .text(report.notes, PAGE.margin, doc.y, {
        width: doc.page.width - PAGE.margin * 2,
        lineGap: 3
      });

    doc.y += 40;
  }

  // Declaration and Certification
  drawDeclarationSection(doc, { template, job, technician, report });

  // Next Steps & Compliance Schedule
  drawNextStepsSection(doc, { template, job, report });

  // Photos section
  if (report.media?.length) {
    doc.addPage();
    doc.y = PAGE.margin;
    doc.fillColor(COLORS.text);

    drawSectionHeader(doc, "Annex: Photos");

    for (const item of report.media) {
      // Add photo label
      const labelX = PAGE.margin + 10;
      doc
        .fillColor(COLORS.text)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(item.label || `Photo ${report.media.indexOf(item) + 1}`, labelX, doc.y);

      doc.y += 20;

      const result = await processImageForPdf(
        item.url,
        doc,
        PAGE.margin + 10,
        doc.y,
        400,
        300
      );

      if (result.success) {
        doc.y += result.height;
      } else {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(10)
          .font("Helvetica")
          .text(result.message, labelX, doc.y);
        doc.y += result.height;
      }

      // Add page break if needed
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        doc.y = PAGE.margin;
        doc.fillColor(COLORS.text);
      }
    }
  }

  doc.end();
  return pdfPromise;
};

export default buildInspectionReportPdf;
