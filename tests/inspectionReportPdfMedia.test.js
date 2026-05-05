describe("Inspection report PDF media matching", () => {
  const fs = require("fs");
  const path = require("path");

  const extractConst = (source, name) => {
    const patterns = [
      new RegExp(`const ${name} = \\([^\\n]+?=> \\{[\\s\\S]*?^\\};`, "m"),
      new RegExp(`const ${name} = \\([^\\n]+?=>[\\s\\S]*?;`, "m"),
    ];

    for (const pattern of patterns) {
      const match = source.match(pattern);
      if (match) {
        return match[0];
      }
    }

    throw new Error(`Could not locate ${name}`);
  };

  const loadMediaHelpers = () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const executableSource = [
      extractConst(source, "normalizeMediaMetadata"),
      extractConst(source, "getMediaItemMetadata"),
      extractConst(source, "getPhotoFieldIdsForSection"),
      extractConst(source, "mediaFieldMatchesSection"),
      extractConst(source, "mediaMatchesSection"),
      extractConst(source, "mediaMatchesRepeatableItem"),
      "return { mediaMatchesSection, mediaMatchesRepeatableItem, getMediaItemMetadata };",
    ].join("\n\n");

    return new Function(executableSource)();
  };

  test("matches section media when metadata is stored as a Map", () => {
    const { mediaMatchesSection, getMediaItemMetadata } = loadMediaHelpers();
    const template = {
      sections: [
        {
          id: "inspection-photos",
          fields: [{ id: "defect-photos", type: "photo-multi" }],
        },
      ],
    };
    const item = {
      fieldId: "defect-photos",
      metadata: new Map([
        ["sectionId", "inspection-photos"],
        ["caption", "Switchboard overview"],
      ]),
    };

    expect(getMediaItemMetadata(item)).toEqual({
      sectionId: "inspection-photos",
      caption: "Switchboard overview",
    });
    expect(mediaMatchesSection(item, "inspection-photos", template)).toBe(true);
  });

  test("matches repeatable item media when metadata itemIndex is stored as a Map value", () => {
    const { mediaMatchesRepeatableItem } = loadMediaHelpers();
    const template = {
      sections: [
        {
          id: "gas-appliances",
          repeatable: true,
          fields: [{ id: "appliance-photo", type: "photo" }],
        },
      ],
    };
    const item = {
      fieldId: "appliance-photo",
      metadata: new Map([
        ["sectionId", "gas-appliances"],
        ["itemIndex", 0],
        ["caption", "Cooktop compliance photo"],
      ]),
    };

    expect(
      mediaMatchesRepeatableItem(item, "gas-appliances", 0, template)
    ).toBe(true);
  });

  test("renders the dedicated inspection photos section for electrical reports", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const electricalSmokeStart = source.indexOf(
      "const renderElectricalSmokeReport = async"
    );
    const gasStart = source.indexOf("const renderGasReport = async");
    const electricalStart = source.indexOf("const renderElectricalReport = async");
    const minimumSafetyStart = source.indexOf(
      "const renderMinimumSafetyStandardReport = async"
    );
    const electricalSmokeSource = source.slice(electricalSmokeStart, gasStart);
    const electricalSource = source.slice(electricalStart, minimumSafetyStart);

    expect(electricalSmokeSource).toMatch(
      /getMediaItemsForSection\(report,\s*template,\s*"inspection-photos"\)/
    );
    expect(electricalSmokeSource).toMatch(/"Inspection Photos"/);
    expect(electricalSource).toMatch(
      /getMediaItemsForSection\(report,\s*template,\s*"inspection-photos"\)/
    );
    expect(electricalSource).toMatch(/"Inspection Photos"/);
  });

  test("renders smoke-only inspection photos", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const smokeStart = source.indexOf("const renderSmokeOnlyReport = async");
    const buildPdfStart = source.indexOf("export const buildInspectionReportPdf");
    const smokeSource = source.slice(smokeStart, buildPdfStart);

    expect(smokeSource).toMatch(
      /getMediaItemsForSection\(report,\s*template,\s*"inspection-photos"\)/
    );
    expect(smokeSource).toMatch(/"Inspection Photos"/);
  });

  test("minimum safety standard renderer visits photo-bearing sections", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const minimumSafetyStart = source.indexOf(
      "const renderMinimumSafetyStandardReport = async"
    );
    const genericStart = source.indexOf("const renderGenericReport = async");
    const minimumSafetySource = source.slice(minimumSafetyStart, genericStart);

    [
      "property-summary",
      "front-entrance",
      "electrical-safety",
      "bin-facilities",
    ].forEach((sectionId) => {
      expect(minimumSafetySource).toContain(
        `await renderSectionPhotos("${sectionId}"`
      );
    });
    expect(minimumSafetySource).toMatch(
      /const additionalDetailSections = new Set\(\[\s*"living-room",\s*"kitchen",\s*"laundry"/
    );
    expect(minimumSafetySource).toMatch(
      /const isBedroom = section\.id\.startsWith\("bedroom-"\)/
    );
    expect(minimumSafetySource).toMatch(
      /const isBathroom = section\.id\.startsWith\("bathroom-"\)/
    );
    expect(minimumSafetySource).toMatch(
      /await renderSectionPhotos\(section\.id,\s*roomTitle\)/
    );
  });

  test("reports keep technician details only in the shared summary", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const electricalSmokeStart = source.indexOf(
      "const renderElectricalSmokeReport = async"
    );
    const gasStart = source.indexOf("const renderGasReport = async");
    const electricalStart = source.indexOf("const renderElectricalReport = async");
    const minimumSafetyStart = source.indexOf(
      "const renderMinimumSafetyStandardReport = async"
    );
    const genericStart = source.indexOf("const renderGenericReport = async");
    const smokeStart = source.indexOf("const renderSmokeOnlyReport = async");
    const buildPdfStart = source.indexOf("export const buildInspectionReportPdf");
    const electricalSmokeSource = source.slice(electricalSmokeStart, gasStart);
    const gasSource = source.slice(gasStart, electricalStart);
    const electricalSource = source.slice(electricalStart, minimumSafetyStart);
    const minimumSafetySource = source.slice(minimumSafetyStart, genericStart);
    const genericSource = source.slice(genericStart, smokeStart);
    const smokeSource = source.slice(smokeStart, buildPdfStart);

    [
      electricalSmokeSource,
      gasSource,
      electricalSource,
      minimumSafetySource,
      genericSource,
      smokeSource,
    ].forEach((rendererSource) => {
      expect(rendererSource).not.toContain('label: "Inspector"');
      expect(rendererSource).not.toContain('label: "Inspector Name"');
      expect(rendererSource).not.toContain('label: "Inspector License"');
      expect(rendererSource).not.toContain('"Technician Name"');
      expect(rendererSource).not.toContain('"Technician Licence #"');
      expect(rendererSource).not.toContain('"License Number"');
      expect(rendererSource).not.toContain('"Registration Number"');
      expect(rendererSource).not.toContain('label: "Licence/registration number"');
    });

    expect(source).toContain('"technician-full-name"');
    expect(source).toContain('"licence-registration-number"');
    expect(source).toContain('"license-number"');
    expect(source).toContain('"inspector-license"');
    expect(source).toContain('"inspector-details-license"');
    expect(source).toContain('"technician-license"');
    expect(source).toContain('"Technician Details"');
  });
});
