import PDFDocument from "pdfkit";

const drawHeader = (doc, { property, job, technician, report }) => {
  doc
    .fontSize(18)
    .fillColor("#1F2937")
    .text("Inspection Report", { align: "left" });

  doc
    .moveDown(0.5)
    .fontSize(10)
    .fillColor("#111827")
    .text(`Job ID: ${job.job_id || job._id}`)
    .text(`Job Type: ${report.jobType}`)
    .text(
      `Property: ${property.address?.fullAddress || property.address?.street || "N/A"}`
    )
    .text(
      `Technician: ${technician?.firstName || ""} ${technician?.lastName || ""}`
    )
    .text(`Submitted: ${new Date(report.submittedAt).toLocaleString()}`);

  doc.moveDown(0.75);
};

const formatValue = (value) => {
  if (value === undefined || value === null) {
    return "";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }
  return `${value}`;
};

const drawSection = (doc, section, responses = {}) => {
  doc
    .fontSize(14)
    .fillColor("#111827")
    .text(section.title, { underline: true });

  if (section.description) {
    doc
      .moveDown(0.25)
      .fontSize(10)
      .fillColor("#4B5563")
      .text(section.description);
  }

  doc.moveDown(0.35);

  section.fields.forEach((field) => {
    doc
      .fontSize(11)
      .fillColor("#1F2937")
      .text(field.label, { continued: false });

    const responseKey = field.id;
    const value = responses[responseKey];

    doc
      .fontSize(10)
      .fillColor("#374151")
      .text(formatValue(value) || "—");

    doc.moveDown(0.3);
  });

  doc.moveDown(0.25);
};

export const buildInspectionReportPdf = async ({
  report,
  template,
  job,
  property,
  technician,
}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (error) => reject(error));

    drawHeader(doc, { property, job, technician, report });

    if (template?.sections?.length) {
      template.sections.forEach((section, index) => {
        drawSection(doc, section, report.formData?.[section.id] || {});
        if (index < template.sections.length - 1) {
          doc.moveDown(0.5);
        }
      });
    } else if (report.sectionsSummary?.length) {
      doc.fontSize(12).text("Responses");
      report.sectionsSummary.forEach((summary) => {
        doc
          .moveDown(0.2)
          .fontSize(10)
          .fillColor("#1F2937")
          .text(summary.label)
          .fillColor("#374151")
          .text(formatValue(summary.value) || "—")
          .moveDown(0.2);
      });
    }

    if (report.notes) {
      doc
        .moveDown(0.6)
        .fontSize(12)
        .fillColor("#111827")
        .text("Technician Notes", { underline: true })
        .moveDown(0.2)
        .fontSize(10)
        .fillColor("#374151")
        .text(report.notes, { align: "left" });
    }

    if (report.media?.length) {
      doc
        .addPage()
        .fontSize(16)
        .fillColor("#111827")
        .text("Inspection Photos", { align: "left" })
        .moveDown(0.5);

      report.media.forEach((item, idx) => {
        doc
          .fontSize(10)
          .fillColor("#1F2937")
          .text(`${idx + 1}. ${item.label || item.fieldId}`)
          .fillColor("#2563EB")
          .text(item.url || "", { link: item.url, underline: true })
          .moveDown(0.4);
      });
    }

    doc.end();
  });
};

export default buildInspectionReportPdf;
