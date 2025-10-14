import PDFDocument from "pdfkit";
import fetch from "node-fetch";

const COLORS = {
  primary: "#FF6B35", // Orange color from the demo
  text: "#2D3748",
  textSecondary: "#4A5568",
  border: "#E2E8F0",
  success: "#10B981",
  error: "#EF4444",
  warning: "#F59E0B",
};

const drawProfessionalHeader = (doc, { property, job, technician, report }) => {
  // Orange geometric design header
  doc
    .rect(0, 0, doc.page.width, 150)
    .fill(COLORS.primary)
    .fillColor("white")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("Safety and", 50, 40)
    .text("Compliance", 50, 70)
    .text("Report", 50, 100);

  // Company logo/name area (right side)
  doc
    .fontSize(20)
    .font("Helvetica-Bold")
    .text("RentalEase", doc.page.width - 180, 60, { width: 130, align: "right" });

  // Reset to white background for content
  doc
    .rect(0, 150, doc.page.width, doc.page.height - 150)
    .fill("white");

  // Report type badge
  doc
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica")
    .text(`${report.template?.title || 'Gas Safety Check Report'}`, 50, 165);

  doc.y = 200;
};

const drawPropertyDetails = (doc, { property, job, technician, report }) => {
  const startY = doc.y + 20;

  // Property details section
  drawSectionHeader(doc, "Property Report Summary");

  // Details table background
  doc
    .rect(50, doc.y, doc.page.width - 100, 80)
    .fill("#FFF5F5")
    .stroke(COLORS.border);

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Property Address:", 60, doc.y + 15)
    .font("Helvetica")
    .text(property.address?.fullAddress || property.address?.street || "N/A", 160, doc.y);

  doc
    .font("Helvetica-Bold")
    .text("Date:", 60, doc.y + 15)
    .font("Helvetica")
    .text(new Date(report.submittedAt).toLocaleDateString(), 160, doc.y);

  doc
    .font("Helvetica-Bold")
    .text("Inspector:", 60, doc.y + 15)
    .font("Helvetica")
    .text(`${technician?.firstName || ""} ${technician?.lastName || ""}`, 160, doc.y);

  doc.y += 40;
};

const drawSectionHeader = (doc, title) => {
  doc
    .rect(50, doc.y, doc.page.width - 100, 25)
    .fill(COLORS.primary)
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(title, 60, doc.y + 8);

  doc.y += 35;
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
      .rect(50, tableY, 300, 20)
      .fill("#F7FAFC")
      .stroke(COLORS.border);

    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Check Item", 60, tableY + 6)
      .text("Yes", 260, tableY + 6)
      .text("No", 290, tableY + 6)
      .text("N/A", 320, tableY + 6);

    doc.y = tableY + 25;

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
  const y = doc.y;

  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica")
    .text(label, 60, y, { width: 200 });

  // Draw checkboxes
  const options = type === "yes-no-na" ? ["Yes", "No", "N/A"] : ["Pass", "Fail"];
  let x = 280;

  for (const option of options) {
    const isSelected = value === option || (value === "yes" && option === "Yes") ||
                      (value === "no" && option === "No") || (value === "na" && option === "N/A") ||
                      (value === "pass" && option === "Pass") || (value === "fail" && option === "Fail");

    // Draw checkbox
    doc
      .rect(x, y + 2, 10, 10)
      .stroke(COLORS.border);

    if (isSelected) {
      doc
        .fillColor(type === "pass-fail" && option === "Pass" ? COLORS.success :
                  type === "pass-fail" && option === "Fail" ? COLORS.error : COLORS.primary)
        .rect(x + 2, y + 4, 6, 6)
        .fill();
    }

    doc
      .fillColor(COLORS.text)
      .fontSize(8)
      .text(option, x + 15, y + 4);

    x += 60;
  }

  doc.y += 25;
};

const drawApplianceCheckRow = (doc, label, value, type) => {
  const y = doc.y;

  // Row background
  doc
    .rect(50, y, 300, 18)
    .fill("white")
    .stroke(COLORS.border);

  // Label
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text(label, 60, y + 5, { width: 190, ellipsis: true });

  // Checkboxes
  const positions = [260, 290, 320];
  const options = ["yes", "no", "na"];

  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (type === "yes-no" && option === "na") continue; // Skip N/A for yes-no fields

    const isSelected = value === option;
    const x = positions[index];

    if (isSelected) {
      doc
        .fillColor(COLORS.primary)
        .circle(x + 5, y + 9, 4)
        .fill()
        .fillColor("white")
        .text("✓", x + 2, y + 5);
    } else {
      doc
        .circle(x + 5, y + 9, 4)
        .stroke(COLORS.border);
    }
  }

  doc.y += 20;
};

const drawTextField = (doc, label, value) => {
  doc
    .fillColor(COLORS.text)
    .fontSize(10)
    .font("Helvetica-Bold")
    .text(label, 60, doc.y);

  doc
    .font("Helvetica")
    .fillColor(COLORS.textSecondary)
    .text(value || "—", 60, doc.y + 2);

  doc.y += 25;
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

    // Draw table header
    doc
      .rect(50, tableY, doc.page.width - 100, 20)
      .fill(COLORS.primary)
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold");

    let x = 60;
    const columnWidths = [120, 150, 80, 80, 100];
    for (let index = 0; index < tableHeaders.length; index++) {
      const header = tableHeaders[index];
      doc.text(header, x, tableY + 6, { width: columnWidths[index] - 10 });
      x += columnWidths[index];
    }

    // Draw data row
    doc.y = tableY + 25;
    doc
      .rect(50, doc.y, doc.page.width - 100, 40)
      .fill("white")
      .stroke(COLORS.border);

    x = 60;
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

    doc.y += 45;
  } else {
    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(10)
      .text("No faults identified during this inspection.", 60, doc.y);
    doc.y += 30;
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
    .rect(60, doc.y, 150, 30)
    .fill(statusColor)
    .fillColor("white")
    .fontSize(12)
    .font("Helvetica-Bold")
    .text(statusText, 70, doc.y + 10);

  doc.y += 50;

  // Declaration text
  doc
    .fillColor(COLORS.text)
    .fontSize(9)
    .font("Helvetica")
    .text("This gas safety report is prepared in accordance with the requirements contained in the Residential Tenancies Regulations 2021 and all other applicable standards and codes. It has been conducted by a gas fitter with Type A Servicing accreditation.", 60, doc.y, { width: 500 });

  doc.y += 40;

  // Signature area
  if (hasSignature) {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Signed by gasfitter:", 60, doc.y);

    doc
      .rect(60, doc.y + 20, 200, 30)
      .stroke(COLORS.border)
      .fillColor(COLORS.success)
      .fontSize(10)
      .text("✓ Digitally Signed", 70, doc.y + 30);
  }

  // Next check due
  const nextCheckDue = responses["next-check-due"];
  if (nextCheckDue) {
    doc
      .fillColor(COLORS.text)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(`Next gas safety check is due within 24 months. Next gas safety check due: ${new Date(nextCheckDue).toLocaleDateString()}`, 60, doc.y + 60);
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

  // Professional header with company branding
  drawProfessionalHeader(doc, { property, job, technician, report });

  // Property details summary
  drawPropertyDetails(doc, { property, job, technician, report });

  // Process template sections with specialized rendering
  if (template?.sections?.length) {
    for (const section of template.sections) {
      const responses = report.formData?.[section.id] || {};

      // Check if we need a new page
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        doc.y = 50;
      }

      // Specialized section rendering based on section type
      if (section.id === "gas-installation") {
        drawGasInstallationSection(doc, section, responses);
      } else if (section.id.startsWith("appliance-")) {
        drawApplianceSection(doc, section, responses);
      } else if (section.id === "fault-identification") {
        drawFaultIdentificationSection(doc, section, responses);
      } else if (section.id === "final-declaration") {
        drawComplianceDeclaration(doc, section, responses, report);
      } else {
        // Generic section rendering for other sections
        drawSectionHeader(doc, section.title);

        for (const field of section.fields) {
          const value = responses[field.id];

          // Handle photo fields specially
          if (field.type === "photo" || field.type === "photo-multi") {
            // Find media for this field
            const fieldMedia = report.media?.filter(item => item.fieldId === field.id) || [];

            if (fieldMedia.length > 0) {
              doc
                .fillColor(COLORS.text)
                .fontSize(10)
                .font("Helvetica-Bold")
                .text(field.label, 60, doc.y);

              doc.y += 15;

              for (const mediaItem of fieldMedia) {
                const result = await processImageForPdf(mediaItem.url, doc, 60, doc.y, 200, 150);

                if (result.success) {
                  doc.y += result.height;
                } else {
                  doc
                    .fillColor(COLORS.textSecondary)
                    .fontSize(9)
                    .font("Helvetica")
                    .text(result.message, 60, doc.y);
                  doc.y += result.height;
                }

                // Check if we need a new page
                if (doc.y > doc.page.height - 150) {
                  doc.addPage();
                  doc.y = 50;
                }
              }

              doc.y += 10;
            } else {
              // No photos for this field
              doc
                .fillColor(COLORS.text)
                .fontSize(10)
                .font("Helvetica-Bold")
                .text(field.label, 60, doc.y);

              doc
                .font("Helvetica")
                .fillColor(COLORS.textSecondary)
                .text("No photos attached", 60, doc.y + 2);

              doc.y += 25;
            }
          } else {
            // Regular field rendering
            const formattedValue = formatValue(value, field.type);
            drawTextField(doc, field.label, formattedValue);
          }
        }

        doc.y += 20;
      }
    }
  }

  // Technician notes
  if (report.notes) {
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      doc.y = 50;
    }

    drawSectionHeader(doc, "Technician Notes");
    doc
      .fillColor(COLORS.textSecondary)
      .fontSize(10)
      .font("Helvetica")
      .text(report.notes, 60, doc.y, { width: 500 });

    doc.y += 40;
  }

  // Photos section
  if (report.media?.length) {
    doc.addPage();
    doc.y = 50;

    drawSectionHeader(doc, "Annex: Photos");

    for (const item of report.media) {
      // Add photo label
      doc
        .fillColor(COLORS.text)
        .fontSize(12)
        .font("Helvetica-Bold")
        .text(item.label || `Photo ${report.media.indexOf(item) + 1}`, 60, doc.y);

      doc.y += 20;

      const result = await processImageForPdf(item.url, doc, 60, doc.y, 400, 300);

      if (result.success) {
        doc.y += result.height;
      } else {
        doc
          .fillColor(COLORS.textSecondary)
          .fontSize(10)
          .font("Helvetica")
          .text(result.message, 60, doc.y);
        doc.y += result.height;
      }

      // Add page break if needed
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
        doc.y = 50;
      }
    }
  }

  doc.end();
  return pdfPromise;
};

export default buildInspectionReportPdf;
