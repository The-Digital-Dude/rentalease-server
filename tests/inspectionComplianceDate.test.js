describe("Inspection next compliance date resolution", () => {
  const fs = require("fs");
  const path = require("path");

  const loadInspectionComplianceDateUtils = () => {
    const utilPath = path.resolve(
      __dirname,
      "../src/utils/inspectionComplianceDate.js"
    );
    const source = fs.readFileSync(utilPath, "utf8");
    const executableSource = source
      .replace(/export const /g, "const ")
      .concat(
        "\nreturn { resolveNextComplianceDate, inspectionComplianceDateTestUtils };"
      );

    return new Function(executableSource)();
  };

  test("prefers an explicit next compliance date when provided", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      { sections: [{ id: "compliance-details" }] },
      {
        "compliance-details": {
          "next-service-due": "2028-02-10",
        },
      },
      "2028-03-01"
    );

    expect(resolvedDate).toBe("2028-03-01");
  });

  test("falls back to section-scoped compliance fields", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      { sections: [{ id: "compliance-details" }] },
      {
        "compliance-details": {
          "next-service-due": "2028-02-10",
        },
      }
    );

    expect(resolvedDate).toBe("2028-02-10");
  });

  test("falls back when compliance fields are nested deeper than section level", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      { sections: [{ id: "compliance-details" }] },
      {
        answers: {
          "compliance-details": {
            values: {
              "certification-next-inspection-due": "2028-06-15",
            },
          },
        },
      }
    );

    expect(resolvedDate).toBe("2028-06-15");
  });

  test("falls back when compliance fields are flattened at the top level", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      { sections: [{ id: "compliance-details" }] },
      {
        "next-inspection-date": "2028-09-20",
      }
    );

    expect(resolvedDate).toBe("2028-09-20");
  });

  test("ignores blank placeholder values before falling back", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      { sections: [{ id: "compliance-details" }] },
      {
        answers: {
          "next-service-due": "2028-11-05",
        },
      },
      "   "
    );

    expect(resolvedDate).toBe("2028-11-05");
  });

  test("falls back to the template default when the client omits the compliance field", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      {
        sections: [
          {
            id: "certificate",
            fields: [
              {
                id: "certification-next-inspection-due",
                defaultValue: "2028-12-31",
              },
            ],
          },
        ],
      },
      {
        certificate: {
          "certification-inspection-date": "2026-03-16",
        },
      }
    );

    expect(resolvedDate).toBe("2028-12-31");
  });

  test("supports the gas template next-service-due default when the field is omitted", () => {
    const { resolveNextComplianceDate } = loadInspectionComplianceDateUtils();

    const resolvedDate = resolveNextComplianceDate(
      {
        sections: [
          {
            id: "compliance-overview",
            fields: [
              {
                id: "next-service-due",
                defaultValue: "2028-08-01",
              },
            ],
          },
        ],
      },
      {
        "property-details": {
          "inspection-date": "2026-03-16",
        },
      }
    );

    expect(resolvedDate).toBe("2028-08-01");
  });
});
