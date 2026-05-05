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
});
