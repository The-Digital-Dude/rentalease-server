describe("Inspection report PDF gas v3 helpers", () => {
  const fs = require("fs");
  const path = require("path");

  test("passes template into the gas appliance renderer", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");

    expect(source).toMatch(
      /const renderGasApplianceV3 = async \(\s*doc,\s*applianceSection,\s*appliance = \{\},\s*index,\s*report,\s*template\s*\)/
    );

    expect(source).toMatch(
      /await renderGasApplianceV3\(\s*doc,\s*applianceSection,\s*appliance,\s*index,\s*report,\s*template\s*\)/
    );
  });

  test("keeps next compliance schedule as one section with date and regulations", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const sectionStart = source.indexOf("const drawNextStepsSection =");
    const nextSectionStart = source.indexOf(
      "const drawMinimumStandardStatusTable",
      sectionStart
    );
    const sectionSource = source.slice(sectionStart, nextSectionStart);

    expect(sectionSource.match(/drawSectionHeader\(doc, "Next Compliance Schedule"\)/g)).toHaveLength(1);
    expect(sectionSource).toContain('"Next Inspection Date"');
    expect(sectionSource).toContain('"Regulations"');
    expect(sectionSource).toContain('"standards-acknowledged"');
  });
});
