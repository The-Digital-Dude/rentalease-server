const fs = require("fs");
const path = require("path");

const loadDefaultInspectionTemplates = () => {
  const configPath = path.resolve(
    __dirname,
    "../src/config/inspectionTemplates.js"
  );
  const source = fs.readFileSync(configPath, "utf8");
  const executableSource = source
    .replace("export { createMinimumSafetyStandardTemplate };", "")
    .replace(
      "export const defaultInspectionTemplates =",
      "const defaultInspectionTemplates ="
    )
    .replace("export default defaultInspectionTemplates;", "")
    .concat("\nreturn defaultInspectionTemplates;");

  return new Function(executableSource)();
};

describe("Inspection template photo requirements", () => {
  test("active electrical report requires key evidence photos", () => {
    const templates = loadDefaultInspectionTemplates();
    const electrical = templates.find((template) => template.jobType === "Electrical");
    const fieldsBySection = new Map(
      electrical.sections.map((section) => [
        section.id,
        new Map((section.fields || []).map((field) => [field.id, field])),
      ])
    );

    expect(fieldsBySection.get("extent-of-installation").get("switchboard-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
    expect(fieldsBySection.get("extent-of-installation").get("meter-photos")).toMatchObject({
      type: "photo-multi",
    });
    expect(fieldsBySection.get("testing-polarity").get("gpo-tester-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
    expect(fieldsBySection.get("smoke-alarms").get("smoke-alarm-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
    expect(fieldsBySection.get("smoke-alarms").has("next-smoke-check-due")).toBe(false);
    expect(fieldsBySection.get("visual-inspection").get("aircon-photos")).toMatchObject({
      type: "photo-multi",
    });
    expect(fieldsBySection.get("visual-inspection").get("oven-photos")).toMatchObject({
      type: "photo-multi",
    });
    expect(fieldsBySection.get("visual-inspection").get("rangehood-photos")).toMatchObject({
      type: "photo-multi",
    });
    expect(fieldsBySection.has("inspection-photos")).toBe(false);
  });

  test("active smoke report requires photos on each alarm record", () => {
    const templates = loadDefaultInspectionTemplates();
    const smoke = templates.find((template) => template.jobType === "Smoke");
    const inspectionPhotos = smoke.sections.find(
      (section) => section.id === "inspection-photos"
    );
    const smokeInventory = smoke.sections.find(
      (section) => section.id === "smoke-alarm-inventory"
    );
    const alarmRecords = smokeInventory.fields.find(
      (field) => field.id === "alarm-records"
    );
    const columns = new Map(
      alarmRecords.columns.map((column) => [column.id, column])
    );

    expect(inspectionPhotos).toBeUndefined();
    expect(columns.has("alarm-id")).toBe(false);
    expect(columns.get("photo-context")).toMatchObject({
      type: "photo",
      required: true,
      metadata: {
        inputType: "photo",
        upload: true,
        repeatableItemPhoto: true,
      },
    });
    expect(columns.get("photo-label")).toMatchObject({
      type: "photo",
      required: true,
      metadata: {
        inputType: "photo",
        upload: true,
        repeatableItemPhoto: true,
      },
    });
    expect(columns.get("photo-test")).toMatchObject({
      type: "photo",
      required: true,
      metadata: {
        inputType: "photo",
        upload: true,
        repeatableItemPhoto: true,
      },
    });
    expect(columns.get("photo-replaced")).toMatchObject({
      type: "photo",
      metadata: {
        inputType: "photo",
        upload: true,
        repeatableItemPhoto: true,
      },
    });
  });

  test("active templates omit report-only fields from app questions", () => {
    const templates = loadDefaultInspectionTemplates();
    const fieldsByTemplate = new Map(
      templates.map((template) => [
        template.jobType,
        new Set(
          template.sections.flatMap((section) =>
            (section.fields || []).map((field) => `${section.id}.${field.id}`)
          )
        ),
      ])
    );

    expect(fieldsByTemplate.get("Smoke").has("inspection-summary.previous-inspection-date")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("inspection-summary.next-service-due")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("certification-declaration.inspector-details-company")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("certification-declaration.inspector-details-phone")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("certification-declaration.inspector-details-name")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("certification-declaration.inspector-details-license")).toBe(false);
    expect(fieldsByTemplate.get("Smoke").has("certification-declaration.report-version")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("inspection-summary.registration-number")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("inspection-summary.summary-notes")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("smoke-alarms.next-smoke-check-due")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("certification.certification-electrician-name")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("certification.certification-licence-number")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("certification.certification-next-inspection-due")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("inspection-summary.contact-email")).toBe(false);
    expect(fieldsByTemplate.get("Electrical").has("inspection-summary.contact-phone")).toBe(false);
    expect(fieldsByTemplate.get("MinimumSafetyStandard").has("technician-signoff.technician-declaration")).toBe(false);
    expect(fieldsByTemplate.get("MinimumSafetyStandard").has("technician-signoff.declaration-statement")).toBe(false);
  });

  test("server-prefilled identity fields are read-only across active reports", () => {
    const templates = loadDefaultInspectionTemplates();
    const fieldsByTemplate = new Map(
      templates
        .filter((template) => template.jobType !== "Smoke" || template.version >= 3)
        .map((template) => [
          template.jobType,
          new Map(
            template.sections.flatMap((section) =>
              (section.fields || []).map((field) => [
                `${section.id}.${field.id}`,
                field,
              ])
            )
          ),
        ])
    );

    [
      ["Electrical", "inspection-summary.inspector-name"],
      ["Smoke", "inspection-summary.inspector-name"],
      ["Gas", "property-details.site-address"],
      ["Gas", "property-details.suburb"],
      ["Gas", "property-details.state"],
      ["Gas", "property-details.postcode"],
      ["Gas", "property-details.property-type"],
      ["Gas", "technician-details.technician-full-name"],
      ["Gas", "technician-details.business-name"],
    ].forEach(([jobType, fieldKey]) => {
      expect(fieldsByTemplate.get(jobType).get(fieldKey)?.metadata).toMatchObject({
        readOnly: true,
        serverPrefilled: true,
      });
    });

    [
      ["Electrical", "inspection-summary.license-number"],
      ["Gas", "technician-details.licence-registration-number"],
    ].forEach(([jobType, fieldKey]) => {
      expect(fieldsByTemplate.get(jobType).get(fieldKey)?.metadata).toBeUndefined();
    });
  });
});
