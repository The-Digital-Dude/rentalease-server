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
});
