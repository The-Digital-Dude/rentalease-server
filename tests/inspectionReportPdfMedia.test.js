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
      extractConst(source, "getPhotoFieldsForSection"),
      extractConst(source, "getPhotoFieldIdsForSection"),
      extractConst(source, "mediaFieldMatchesPhotoField"),
      extractConst(source, "mediaFieldMatchesSection"),
      extractConst(source, "mediaMatchesSection"),
      extractConst(source, "mediaMatchesRepeatableItem"),
      extractConst(source, "findPhotoFieldForMedia"),
      extractConst(source, "buildPhotoCaption"),
      "return { mediaMatchesSection, mediaMatchesRepeatableItem, getMediaItemMetadata, buildPhotoCaption };",
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

  test("builds photo captions from the matching template field label", () => {
    const { buildPhotoCaption } = loadMediaHelpers();
    const template = {
      sections: [
        {
          id: "inspection-photos",
          fields: [
            {
              id: "switchboard-photos",
              label: "Switchboard",
              type: "photo-multi",
            },
          ],
        },
      ],
    };
    const item = {
      fieldId: "switchboard-photos",
      metadata: new Map([
        ["sectionId", "inspection-photos"],
        ["caption", "Main switchboard before testing"],
      ]),
    };

    expect(
      buildPhotoCaption(item, {
        template,
        sectionId: "inspection-photos",
      })
    ).toBe("Switchboard - Main switchboard before testing");
  });

  test("builds photo captions from nested table photo field labels", () => {
    const { buildPhotoCaption } = loadMediaHelpers();
    const template = {
      sections: [
        {
          id: "smoke-alarm-inventory",
          fields: [
            {
              id: "alarm-records",
              type: "table",
              columns: [
                {
                  id: "photo-label",
                  label: "Photo: Label showing brand/MFD/expiry",
                  type: "photo",
                },
              ],
            },
          ],
        },
      ],
    };
    const item = {
      fieldId: "photo-label",
      metadata: new Map([["sectionId", "smoke-alarm-inventory"]]),
    };

    expect(
      buildPhotoCaption(item, {
        template,
        sectionId: "smoke-alarm-inventory",
      })
    ).toBe("Photo: Label showing brand/MFD/expiry");
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

  test("electrical and smoke reports omit comments on next steps section", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const electricalSmokeStart = source.indexOf(
      "const renderElectricalSmokeReport = async"
    );
    const gasStart = source.indexOf("const renderGasReport = async");
    const electricalSmokeSource = source.slice(electricalSmokeStart, gasStart);

    expect(electricalSmokeSource).not.toContain('"Comments on Next Steps"');
    expect(electricalSmokeSource).not.toContain('summarySection["summary-notes"]');
  });

  test("smoke-only report renders alarm photos under each alarm record", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const smokeStart = source.indexOf("const renderSmokeOnlyReport = async");
    const buildPdfStart = source.indexOf("export const buildInspectionReportPdf");
    const smokeSource = source.slice(smokeStart, buildPdfStart);

    expect(smokeSource).not.toMatch(
      /getMediaItemsForSection\(report,\s*template,\s*"inspection-photos"\)/
    );
    expect(smokeSource).not.toMatch(/"Inspection Photos"/);
    expect(smokeSource).toMatch(/getMediaItemsForRepeatableItem\(/);
    expect(smokeSource).toContain('"smoke-alarm-inventory"');
  });

  test("smoke-only report renders template fields and omits duplicate final identity", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const smokeStart = source.indexOf("const renderSmokeOnlyReport = async");
    const buildPdfStart = source.indexOf("export const buildInspectionReportPdf");
    const smokeSource = source.slice(smokeStart, buildPdfStart);

    expect(smokeSource).toContain("renderTemplateSectionFields");
    expect(smokeSource).toContain("buildTemplateRows");
    expect(smokeSource).toContain("alarmRecordsField?.columns");
    expect(smokeSource).toContain('"certification-declaration"');
    expect(smokeSource).toContain('"inspector-details-name"');
    expect(smokeSource).toContain('"inspector-details-license"');
    expect(smokeSource).toContain('"inspector-details-company"');
    expect(smokeSource).toContain('"inspector-details-phone"');
    expect(smokeSource).toContain('"report-version"');
    expect(source).toContain('const hideInspectorIdentity = template?.jobType === "Smoke"');
  });

  test("smoke-only report omits previous smoke alarm check date", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const smokeStart = source.indexOf("const renderSmokeOnlyReport = async");
    const buildPdfStart = source.indexOf("export const buildInspectionReportPdf");
    const smokeSource = source.slice(smokeStart, buildPdfStart);

    expect(smokeSource).toContain('section.id === "inspection-summary"');
    expect(smokeSource).toContain('"previous-inspection-date"');
  });

  test("generic report renderer visits section-level photo fields", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const genericStart = source.indexOf("const renderGenericReport = async");
    const drawSectionHeaderStart = source.indexOf("const drawSectionHeader");
    const genericSource = source.slice(genericStart, drawSectionHeaderStart);

    expect(source).toContain(
      '} else if (template?.jobType === "MinimumSafetyStandard") {\n    await renderGenericReport'
    );
    expect(genericSource).toContain("getMediaItemsForSection(report, template, sectionId)");
    expect(genericSource).toMatch(/field\.type !== "photo" && field\.type !== "photo-multi"/);
    expect(genericSource).toContain('template?.jobType === "MinimumSafetyStandard"');
    expect(genericSource).toContain('section.id === "property-summary"');
    expect(genericSource).toContain(
      'await renderSectionPhotos(section.id, section.title || "Section")'
    );
  });

  test("inline report photos render in an aligned grid", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const inlineStart = source.indexOf("const renderInlinePhotos = async");
    const titledStart = source.indexOf("const renderTitledInlinePhotos = async");
    const inlineSource = source.slice(inlineStart, titledStart);

    expect(inlineSource).toContain("const columns = mediaItems.length === 1 ? 1 : 2");
    expect(inlineSource).toContain("const itemWidth =");
    expect(inlineSource).toContain("ensurePageSpace(doc, itemHeight + 14)");
    expect(inlineSource).toContain("renderPhotoCaptionAt(");
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
    expect(source).toContain('"Technician Details"');
    expect(source).toContain("value: summaryInsights.technicianName");
    expect(source).not.toContain("summaryInsights.technicianLicense");
    expect(source).not.toContain("Licence:");
  });

  test("shared report front includes MSS-style compliance details", () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReportPdf.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const detailsStart = source.indexOf("const drawPropertyDetailsSection");
    const checksStart = source.indexOf("const drawChecksAndOutcomesSection");
    const detailsSource = source.slice(detailsStart, checksStart);

    [
      '"Inspection Date"',
      '"Inspection Summary"',
      '"Next Compliance Date"',
      '"Technician Details"',
      '"Regulations / Standards"',
      '"Declaration"',
      '"Signature"',
    ].forEach((label) => {
      expect(detailsSource).toContain(label);
    });

    expect(source).toContain("resolveNextComplianceDisplayDate");
    expect(source).toContain('"AS/NZS 5601.1 Gas Installations"');
    expect(source).toContain('"AS 3786 Smoke Alarms"');
    expect(source).not.toContain('"AS 3786:2014 Gas appliances"');
    expect(source).not.toContain('"AS/NZS 3017:2022 Smoke alarms"');
  });
});
