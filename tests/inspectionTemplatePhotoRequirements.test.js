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
});
