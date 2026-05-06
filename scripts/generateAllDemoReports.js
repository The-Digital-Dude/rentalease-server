import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import defaultInspectionTemplates, {
  createMinimumSafetyStandardTemplate,
} from "../src/config/inspectionTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "uploads", "demo-all-inspections");

const today = new Date().toISOString().split("T")[0];
const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];
const nextTwoYears = new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
  .toISOString()
  .split("T")[0];

const assetPaths = [
  "assets/electrical-safety-cover.jpg",
  "assets/reports/cover-pages/electrical_safety_report_cover_page.jpg",
  "assets/reports/cover-pages/gas_safety_report_cover_page.jpg",
  "assets/reports/cover-pages/smoke_alarm_safety_report_cover_page.jpg",
  "assets/reports/cover-pages/minimum_standard_report_cover_page.jpg",
  "assets/reports/cover-pages/logo-report-header.png",
].map((assetPath) => path.join(rootDir, assetPath));

const assetBuffers = assetPaths
  .filter((assetPath) => fs.existsSync(assetPath))
  .map((assetPath) => ({
    path: assetPath,
    buffer: fs.readFileSync(assetPath),
  }));

const technician = {
  firstName: "Demo",
  lastName: "Technician",
  licenseNumber: "LIC-DEMO-001",
  registrationNumber: "REG-DEMO-001",
  email: "demo.technician@rentalease.test",
  phone: "03 5906 7723",
};

const property = {
  address: {
    fullAddress: "123 Demo Street, Melbourne VIC 3000",
    street: "123 Demo Street",
    suburb: "Melbourne",
    state: "VIC",
    postcode: "3000",
  },
  fullAddressString: "123 Demo Street, Melbourne VIC 3000",
  propertyType: "Rental Property",
  bedroomCount: 2,
  bathroomCount: 1,
};

const signatureImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const slug = (value) =>
  String(value)
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const isNegativeQuestion = (field) => {
  const text = `${field.id || ""} ${field.label || ""}`.toLowerCase();
  return /issue|defect|fault|mould|damp|staining|cracking|bowing|warping|negative|loss|rectification|repair|unsafe|not working/.test(
    text
  );
};

const optionValue = (field, candidates) => {
  const options = field.options || [];
  return candidates.find((candidate) =>
    options.some((option) => option.value === candidate)
  );
};

const compliantValue = (field) => {
  if (field.defaultValue !== undefined && field.defaultValue !== "") {
    return field.defaultValue;
  }

  switch (field.type) {
    case "yes-no":
    case "yes-no-na":
      return isNegativeQuestion(field) ? "no" : "yes";
    case "pass-fail":
    case "pass-fail-na":
      return "pass";
    case "select":
      return (
        optionValue(field, [
          "compliant",
          "fully-compliant",
          "no-faults",
          "satisfactory",
          "pass",
          "meets",
          "present",
          "included",
          "rental-property",
          "VIC",
        ]) ||
        field.options?.[0]?.value ||
        "compliant"
      );
    case "checkbox":
      return true;
    case "date":
      return field.id?.includes("next") || field.id?.includes("due")
        ? nextTwoYears
        : today;
    case "time":
      return "10:30";
    case "number":
      return field.id?.includes("pressure-loss") ? 0 : 1;
    case "multi-select":
      return field.options?.[0]?.value ? [field.options[0].value] : [];
    case "signature":
      return signatureImage;
    case "textarea":
      return "Compliant demo response using local asset-backed report generation.";
    default:
      return field.placeholder?.includes("postcode")
        ? "3000"
        : field.defaultValue || "Demo response";
  }
};

const nonCompliantValue = (field) => {
  switch (field.type) {
    case "yes-no":
    case "yes-no-na":
      return isNegativeQuestion(field) ? "yes" : "no";
    case "pass-fail":
    case "pass-fail-na":
      return "fail";
    case "select":
      return (
        optionValue(field, [
          "non-compliant",
          "does_not_meet",
          "fail",
          "unsatisfactory",
          "not-tested",
          "not-inspected",
          "faults-identified",
          "repairs-required",
          "not_present",
          "unsafe",
          "immediate-unsafe",
        ]) ||
        field.options?.at(-1)?.value ||
        "non-compliant"
      );
    case "checkbox":
      return true;
    case "date":
      return field.id?.includes("next") || field.id?.includes("due")
        ? nextYear
        : today;
    case "time":
      return "10:30";
    case "number":
      return field.id?.includes("pressure-loss") ? 3 : 0;
    case "multi-select":
      return field.options?.at(-1)?.value ? [field.options.at(-1).value] : [];
    case "signature":
      return signatureImage;
    case "textarea":
      return "Non-compliant demo response. Rectification or follow-up is required.";
    default:
      return field.placeholder?.includes("postcode")
        ? "3000"
        : field.defaultValue || "Demo non-compliant response";
  }
};

const valueForField = (field, outcome) =>
  outcome === "compliant" ? compliantValue(field) : nonCompliantValue(field);

const buildTableRows = (field, outcome) => {
  const row = {};
  for (const column of field.columns || []) {
    if (column.type === "photo" || column.type === "photo-multi") {
      row[column.id] = "asset-photo";
    } else {
      row[column.id] = valueForField(column, outcome);
    }
  }
  return [row];
};

const fillSectionData = (section, outcome) => {
  if (section.repeatable) {
    return [
      Object.fromEntries(
        (section.fields || [])
          .filter((field) => field.type !== "photo" && field.type !== "photo-multi")
          .map((field) => [field.id, valueForField(field, outcome)])
      ),
    ];
  }

  const data = {};
  for (const field of section.fields || []) {
    if (field.type === "photo" || field.type === "photo-multi") {
      continue;
    }

    data[field.id] =
      field.type === "table"
        ? buildTableRows(field, outcome)
        : valueForField(field, outcome);
  }

  return data;
};

const applyOutcomeOverrides = (formData, template, outcome) => {
  const compliant = outcome === "compliant";

  if (template.jobType === "Gas") {
    formData["rectification-works-required"] = {
      ...(formData["rectification-works-required"] || {}),
      "issues-identified": compliant ? "no" : "yes",
      "issue-description": compliant
        ? "No rectification works required."
        : "Gas pressure test failed and appliance requires rectification.",
      "risk-level": compliant ? "non-urgent" : "immediate-unsafe",
    };
    formData["final-declaration"] = {
      ...(formData["final-declaration"] || {}),
      "final-compliance-outcome": compliant ? "compliant" : "non-compliant",
      "technician-signature": signatureImage,
      "sign-off-date": today,
      "sign-off-time": "10:30",
    };
  }

  if (template.jobType === "Electrical") {
    formData["inspection-summary"] = {
      ...(formData["inspection-summary"] || {}),
      "electrical-outcome": compliant ? "no-faults" : "faults-identified",
      "smoke-outcome": compliant ? "compliant" : "non-compliant",
      "summary-notes": compliant
        ? "No faults identified during demo inspection."
        : "Faults identified during demo inspection. Repairs are required.",
    };
    formData["certification"] = {
      ...(formData["certification"] || {}),
      "certification-signature": signatureImage,
      "certification-next-inspection-due": nextTwoYears,
    };
  }

  if (template.jobType === "Smoke") {
    formData["inspection-summary"] = {
      ...(formData["inspection-summary"] || {}),
      "overall-status": compliant ? "compliant" : "non-compliant",
      "smoke-outcome": compliant ? "compliant" : "non-compliant",
    };
    formData["compliance-next-steps"] = {
      ...(formData["compliance-next-steps"] || {}),
      "overall-status": compliant ? "compliant" : "non-compliant-work-required",
    };
  }

  if (template.jobType === "MinimumSafetyStandard") {
    formData["property-summary"] = {
      ...(formData["property-summary"] || {}),
      "overall-compliance": compliant ? "compliant" : "non-compliant",
      "property-address": property.address.fullAddress,
    };
    formData["executive-summary"] = {
      ...(formData["executive-summary"] || {}),
      "inspection-summary": compliant
        ? "All inspected minimum standard areas passed in this demo."
        : "One or more minimum standard areas failed in this demo.",
      "key-findings": compliant
        ? "No remedial items identified."
        : "Remedial actions are required for non-compliant areas.",
      recommendations: compliant
        ? "Continue routine compliance monitoring."
        : "Arrange rectification and reinspect affected areas.",
    };
  }
};

const createMediaItem = ({ section, field, assetIndex, itemIndex, caption }) => {
  const asset = assetBuffers[assetIndex % assetBuffers.length];
  return {
    fieldId:
      itemIndex === undefined
        ? field.id
        : `${section.id}-${itemIndex}-${field.id}`,
    imageBuffer: asset.buffer,
    metadata: {
      sectionId: section.id,
      itemIndex,
      caption: `${caption} (${path.basename(asset.path)})`,
    },
  };
};

const buildMedia = (template) => {
  const media = [];
  let assetIndex = 0;

  for (const section of template.sections || []) {
    const fields = section.fields || [];

    if (section.repeatable) {
      const photoField = fields.find(
        (field) => field.type === "photo" || field.type === "photo-multi"
      );
      if (photoField) {
        media.push(
          createMediaItem({
            section,
            field: photoField,
            assetIndex: assetIndex++,
            itemIndex: 0,
            caption: `${section.title} demo photo`,
          })
        );
      }
      continue;
    }

    for (const field of fields) {
      if (field.type === "photo" || field.type === "photo-multi") {
        media.push(
          createMediaItem({
            section,
            field,
            assetIndex: assetIndex++,
            caption: `${field.label || section.title} demo photo`,
          })
        );
      }

      if (field.type === "table") {
        for (const column of field.columns || []) {
          if (column.type === "photo" || column.type === "photo-multi") {
            media.push(
              createMediaItem({
                section,
                field: column,
                assetIndex: assetIndex++,
                caption: `${column.label || section.title} demo photo`,
              })
            );
          }
        }
      }
    }
  }

  return media;
};

const createReport = (template, outcome) => {
  const formData = {};
  for (const section of template.sections || []) {
    formData[section.id] = fillSectionData(section, outcome);
  }

  applyOutcomeOverrides(formData, template, outcome);

  return {
    submittedAt: new Date().toISOString(),
    formData,
    media: buildMedia(template),
    notes:
      outcome === "compliant"
        ? "Generated compliant demo report using local assets."
        : "Generated non-compliant demo report using local assets.",
  };
};

const templates = [
  defaultInspectionTemplates.find((template) => template.jobType === "Gas"),
  defaultInspectionTemplates.find((template) => template.jobType === "Electrical"),
  defaultInspectionTemplates.find((template) => template.jobType === "Smoke"),
  createMinimumSafetyStandardTemplate(2, 1),
].filter(Boolean);

const generate = async () => {
  if (!assetBuffers.length) {
    throw new Error("No assets found for demo report image generation.");
  }

  process.env.GCS_BUCKET_NAME ||= "local-demo-bucket";
  const { buildInspectionReportPdf } = await import(
    "../src/services/inspectionReportPdf.service.js"
  );

  fs.mkdirSync(outputDir, { recursive: true });

  const generated = [];

  for (const template of templates) {
    for (const outcome of ["compliant", "non-compliant"]) {
      const job = {
        jobType: template.jobType,
        dueDate: new Date().toISOString(),
        job_id: `DEMO-${template.jobType}-${outcome}`,
      };
      const report = createReport(template, outcome);
      const pdfBuffer = await buildInspectionReportPdf({
        report,
        template,
        job,
        property,
        technician,
      });
      const outputPath = path.join(
        outputDir,
        `${slug(template.jobType)}-${outcome}.pdf`
      );
      fs.writeFileSync(outputPath, pdfBuffer);
      generated.push(outputPath);
      console.log(`Generated ${outputPath}`);
    }
  }

  console.log(`\nGenerated ${generated.length} demo reports in ${outputDir}`);
};

generate().catch((error) => {
  console.error("Failed to generate demo reports:", error);
  process.exitCode = 1;
});
