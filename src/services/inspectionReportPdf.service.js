import PDFDocument from "pdfkit";
import fetch from "node-fetch";

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
  if (doc.y + required <= doc.page.height - PAGE.margin) {
    return;
  }

  doc.addPage();
  doc.y = PAGE.margin;
  doc.fillColor(COLORS.text);
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

const drawProfessionalHeader = (doc, { property, job, technician, report }) => {
  const headerHeight = 170;

  doc
    .rect(0, 0, doc.page.width, headerHeight)
    .fill(COLORS.primary);

  doc
    .rect(doc.page.width * 0.55, 0, doc.page.width * 0.45, headerHeight)
    .fill(COLORS.primaryAccent);

  doc
    .fillColor("white")
    .fontSize(28)
    .font("Helvetica-Bold")
    .text("Inspection Report", PAGE.margin, 50, { characterSpacing: 0.5 });

  doc
    .fontSize(12)
    .font("Helvetica")
    .text(`${report.template?.title || job?.jobType || "Safety Compliance"}`, PAGE.margin, 95);

  const propertyLabel = property?.address?.fullAddress || property?.address?.street || "Property";
  doc
    .fontSize(10)
    .text(propertyLabel, PAGE.margin, 115, { width: doc.page.width * 0.5 });

  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .text("RentalEase", doc.page.width - PAGE.margin - 160, 60, {
      width: 160,
      align: "right",
    })
    .fontSize(11)
    .font("Helvetica")
    .text("Compliance & Safety Services", doc.page.width - PAGE.margin - 160, 95, {
      width: 160,
      align: "right",
    });

  doc
    .rect(0, headerHeight, doc.page.width, doc.page.height - headerHeight)
    .fill("white");

  doc.fillColor(COLORS.text).y = headerHeight + 30;
};

const drawKeyValueCard = (doc, title, rows = []) => {
  if (!rows.length) {
    return;
  }

  const estimatedHeight = 100 + rows.length * 20;
  ensurePageSpace(doc, estimatedHeight);

  if (title) {
    drawSectionHeader(doc, title);
  }

  const cardX = PAGE.margin - 10;
  const cardWidth = doc.page.width - (PAGE.margin - 10) * 2;
  doc.font("Helvetica").fontSize(10);

  const labelWidth = 150;
  const valueWidth = cardWidth - (labelWidth + 40);

  let dynamicHeight = 32;
  rows.forEach((row) => {
    const textValue = row.value ?? "—";
    const valueHeight = doc.heightOfString(String(textValue), {
      width: valueWidth,
      align: "left",
    });
    dynamicHeight += Math.max(24, valueHeight + 12);
  });

  const cardY = doc.y;

  doc
    .roundedRect(cardX, cardY, cardWidth, dynamicHeight, 12)
    .fill(COLORS.primarySoft)
    .stroke(COLORS.border);

  let rowY = cardY + 18;
  const labelX = PAGE.margin + 5;
  const valueX = labelX + labelWidth;

  rows.forEach((row) => {
    const label = row.label || "";
    const textValue = row.value ?? "—";
    const currentHeight = Math.max(
      22,
      doc.heightOfString(String(textValue), { width: valueWidth, align: "left" }) + 10
    );

    doc
      .fillColor(COLORS.textSecondary)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${label}:`, labelX, rowY, { width: labelWidth });

    doc
      .fillColor(COLORS.text)
      .font("Helvetica")
      .fontSize(10)
      .text(String(textValue), valueX, rowY, {
        width: valueWidth,
        align: "left",
      });

    rowY += currentHeight;
  });

  doc.y = cardY + dynamicHeight + 24;
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

  drawKeyValueCard(doc, "Property Report Summary", rows);
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
  const columnDefinitions = [
    { id: "voltage", label: "Voltage", width: 80 },
    { id: "status", label: "Status", width: 140 },
    { id: "location", label: "Location", width: 140 },
    { id: "level", label: "Level", width: 80 },
    { id: "expiration", label: "Expiration", width: 140 },
  ];

  const totalWidth = columnDefinitions.reduce((sum, col) => sum + col.width, 0);

  // Header
  doc
    .rect(startX, startY, totalWidth, 24)
    .fill(COLORS.primary)
    .fillColor("white")
    .font("Helvetica-Bold")
    .fontSize(10);

  let columnX = startX;
  columnDefinitions.forEach((column) => {
    doc.text(column.label, columnX + 8, startY + 7, { width: column.width - 12 });
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
        value = formatDisplayDate(value);
      }

      doc
        .fillColor(COLORS.text)
        .text(String(value), columnX + 8, rowY + 7, {
          width: column.width - 12,
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

  drawKeyValueCard(doc, "Electrical Safety Check Certification", rows);

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

  drawKeyValueCard(doc, "Property Report Summary", summaryRows);

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
    drawKeyValueCard(doc, "Contact", contactRows);
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

    // Draw table header
    doc
      .rect(PAGE.margin, tableY, doc.page.width - PAGE.margin * 2, 24)
      .fill(COLORS.primary)
      .fillColor("white")
      .fontSize(9)
      .font("Helvetica-Bold");

    let x = PAGE.margin + 10;
    const columnWidths = [120, 150, 80, 80, 100];
    for (let index = 0; index < tableHeaders.length; index++) {
      const header = tableHeaders[index];
      doc.text(header, x, tableY + 6, { width: columnWidths[index] - 10 });
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

  // Professional header with company branding
  drawProfessionalHeader(doc, { property, job, technician, report });

  if (template?.jobType === "Gas") {
    await renderGasReport(doc, { template, report, job, property, technician });
  } else if (template?.jobType === "Electrical" || template?.jobType === "Smoke") {
    renderElectricalSmokeReport(doc, { template, report, job, property });
  } else {
    await renderGenericReport(doc, { template, report, job, property, technician });
  }

  // Technician notes
  if (report.notes) {
    if (doc.y > doc.page.height - 100) {
      doc.addPage();
      doc.y = PAGE.margin;
      doc.fillColor(COLORS.text);
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
