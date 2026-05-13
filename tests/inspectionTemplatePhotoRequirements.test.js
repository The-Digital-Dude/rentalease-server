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
    const inspectionPhotos = electrical.sections.find(
      (section) => section.id === "inspection-photos"
    );
    const fields = new Map(
      inspectionPhotos.fields.map((field) => [field.id, field])
    );

    expect(fields.get("switchboard-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
    expect(fields.get("smoke-alarm-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
    expect(fields.get("gpo-tester-photos")).toMatchObject({
      type: "photo-multi",
      required: true,
    });
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
    });
    expect(columns.get("photo-label")).toMatchObject({
      type: "photo",
      required: true,
    });
    expect(columns.get("photo-test")).toMatchObject({
      type: "photo",
      required: true,
    });
    expect(columns.get("photo-replaced")).toMatchObject({
      type: "photo",
    });
  });
});
