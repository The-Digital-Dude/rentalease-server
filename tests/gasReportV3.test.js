import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Gas report v3 validation and outcome", () => {
  const loadGasReportHelpers = () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReport.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const helperSource = source
      .slice(
      0,
      source.indexOf("export const submitInspectionReport = async")
      )
      .replace(/^\s*import[\s\S]*?;\r?\n?/gm, "");
    const executableSource = helperSource.concat(
      "\nreturn { calculateGasComplianceOutcome, calculateMinimumSafetyStandardOutcome, validateGasReportV3, isGasTemplateV3, validateRequiredPhotoUploads };"
    );

    return new Function(executableSource)();
  };

  const createValidGasFormData = () => ({
    "property-details": {
      "site-address": "1 Test Street",
      suburb: "Melbourne",
      state: "VIC",
      postcode: 3000,
      "property-type": "rental-property",
    },
    "technician-details": {
      "technician-full-name": "Pat Fitter",
      "licence-registration-number": "LIC-123",
      "business-name": "RentalEase Property Services Pty Ltd",
      "inspection-date": "2026-03-31",
      "inspection-time": "09:30",
    },
    "lp-gas-checklist": {
      "lp-gas-cylinders": "yes",
      "gas-leakage-test": "pass",
    },
    "general-gas-checks": {
      "gas-pressure-test-result": "pass",
      "pressure-loss-5-min": 0.2,
    },
    "gas-appliances": [
      {
        "appliance-location": "kitchen",
        "appliance-type": "cooktop",
        "appliance-name": "Cooktop",
        "room-sealed-appliance": "no",
        "appliance-photo": "uploaded",
        "installation-gastight": "yes",
        "accessible-for-servicing": "yes",
        "isolation-valve-provided": "yes",
        "electrically-safe": "yes",
        "evidence-of-certification": "yes",
        "adequately-restrained": "yes",
        "adequate-room-ventilation": "yes",
        "clearances-compliant": "yes",
        "cowl-chimney-flue-good": "yes",
        "flue-correctly-installed": "yes",
        "no-scorching-overheating": "yes",
        "heat-exchanger-satisfactory": "yes",
        "appliance-cleaned": "yes",
        "gas-supply-burner-pressure-correct": "yes",
        "burner-flame-normal": "yes",
        "operating-correctly": "yes",
      },
    ],
    "rectification-works-required": {
      "issues-identified": "no",
    },
    "final-declaration": {
      "technician-signature": "signed",
      "sign-off-date": "2026-03-31",
      "sign-off-time": "10:15",
    },
  });

  test("detects gas v3 templates by version and repeatable appliance section", () => {
    const { isGasTemplateV3 } = loadGasReportHelpers();

    expect(
      isGasTemplateV3({
        jobType: "Gas",
        version: 3,
        sections: [{ id: "gas-appliances", repeatable: true }],
      })
    ).toBe(true);

    expect(
      isGasTemplateV3(
        {
          jobType: "Gas",
          version: 2,
        },
        {
          "appliance-1": {},
        }
      )
    ).toBe(false);
  });

  test("returns compliant when all gas v3 checks pass", () => {
    const { calculateGasComplianceOutcome, validateGasReportV3 } =
      loadGasReportHelpers();

    const formData = createValidGasFormData();

    expect(calculateGasComplianceOutcome(formData)).toBe("compliant");
    expect(validateGasReportV3(formData, { status: "Completed" })).toBe(
      "compliant"
    );
  });

  test("returns unsafe when the pressure test fails", () => {
    const { calculateGasComplianceOutcome } = loadGasReportHelpers();
    const formData = createValidGasFormData();

    formData["general-gas-checks"]["gas-pressure-test-result"] = "fail";

    expect(calculateGasComplianceOutcome(formData)).toBe("unsafe");
  });

  test("returns unsafe when a room-sealed appliance fails CO spillage", () => {
    const { calculateGasComplianceOutcome, validateGasReportV3 } =
      loadGasReportHelpers();
    const formData = createValidGasFormData();

    formData["gas-appliances"][0]["room-sealed-appliance"] = "yes";
    formData["gas-appliances"][0]["negative-pressure-present"] = "no";
    formData["gas-appliances"][0]["co-spillage-test"] = "fail";

    expect(validateGasReportV3(formData, { status: "Completed" })).toBe(
      "unsafe"
    );
    expect(calculateGasComplianceOutcome(formData)).toBe("unsafe");
  });

  test("returns non-compliant when a safety check fails without unsafe conditions", () => {
    const { calculateGasComplianceOutcome } = loadGasReportHelpers();
    const formData = createValidGasFormData();

    formData["gas-appliances"][0]["electrically-safe"] = "no";

    expect(calculateGasComplianceOutcome(formData)).toBe("non-compliant");
  });

  test("returns compliant when every MSS checklist yes/no question is yes", () => {
    const { calculateMinimumSafetyStandardOutcome } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "bin-facilities",
          fields: [
            {
              id: "bin-general-standard",
              label:
                "Are both a rubbish bin and a recycling bin available for the renter's use?",
              type: "yes-no-na",
            },
            { id: "bin-notes", label: "Recommendations", type: "textarea" },
          ],
        },
        {
          id: "lighting-summary",
          fields: [
            {
              id: "living-room-lighting-standard",
              label:
                "Do all interior rooms, corridors, and hallways have access to appropriate natural or artificial light suitable for their intended function?",
              type: "yes-no-na",
            },
            { id: "lighting-photos", label: "Photos", type: "photo-multi" },
          ],
        },
      ],
    };
    const formData = {
      "bin-facilities": {
        "bin-general-standard": "yes",
      },
      "lighting-summary": {
        "living-room-lighting-standard": "yes",
      },
    };

    expect(calculateMinimumSafetyStandardOutcome(formData, template)).toBe(
      "compliant"
    );
  });

  test("returns non-compliant when any MSS checklist yes/no question is no", () => {
    const { calculateMinimumSafetyStandardOutcome } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "bin-facilities",
          fields: [
            {
              id: "bin-general-standard",
              label:
                "Are both a rubbish bin and a recycling bin available for the renter's use?",
              type: "yes-no-na",
            },
            {
              id: "bin-summary-standard",
              label: "Are minimum standards met for this section?",
              type: "yes-no-na",
            },
          ],
        },
      ],
    };

    expect(
      calculateMinimumSafetyStandardOutcome(
        {
          "bin-facilities": {
            "bin-general-standard": "no",
            "bin-summary-standard": "yes",
          },
        },
        template
      )
    ).toBe("non-compliant");
  });

  test("returns compliant when MSS checklist questions are N/A", () => {
    const { calculateMinimumSafetyStandardOutcome } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "bin-facilities",
          fields: [
            {
              id: "bin-general-standard",
              label:
                "Are both a rubbish bin and a recycling bin available for the renter's use?",
              type: "yes-no-na",
            },
          ],
        },
      ],
    };

    ["na", "n/a", "not_applicable", "not-applicable"].forEach((answer) => {
      expect(
        calculateMinimumSafetyStandardOutcome(
          {
            "bin-facilities": {
              "bin-general-standard": answer,
            },
          },
          template
        )
      ).toBe("compliant");
    });
  });

  test("returns non-compliant when an MSS checklist answer is missing", () => {
    const { calculateMinimumSafetyStandardOutcome } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "bin-facilities",
          fields: [
            {
              id: "bin-general-standard",
              label:
                "Are both a rubbish bin and a recycling bin available for the renter's use?",
              type: "yes-no-na",
            },
          ],
        },
      ],
    };

    [
      {},
      {
        "bin-facilities": {},
      },
      {
        "bin-facilities": {
          "bin-general-standard": "",
        },
      },
      {
        "bin-facilities": {
          "bin-general-standard": null,
        },
      },
    ].forEach((formData) => {
      expect(calculateMinimumSafetyStandardOutcome(formData, template)).toBe(
        "non-compliant"
      );
    });
  });

  test("returns non-compliant when an MSS checklist answer is unknown", () => {
    const { calculateMinimumSafetyStandardOutcome } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "bin-facilities",
          fields: [
            {
              id: "bin-general-standard",
              label:
                "Are both a rubbish bin and a recycling bin available for the renter's use?",
              type: "yes-no-na",
            },
          ],
        },
      ],
    };

    expect(
      calculateMinimumSafetyStandardOutcome(
        {
          "bin-facilities": {
            "bin-general-standard": "unknown",
          },
        },
        template
      )
    ).toBe("non-compliant");
  });

  test("requires other appliance type text when appliance type is other", () => {
    const { validateGasReportV3 } = loadGasReportHelpers();
    const formData = createValidGasFormData();

    formData["gas-appliances"][0]["appliance-type"] = "other";
    delete formData["gas-appliances"][0]["appliance-type-other"];

    expect(() =>
      validateGasReportV3(formData, { status: "Completed" })
    ).toThrow(/other appliance type is required/i);
  });

  test("allows gas v3 submission before the job is completed", () => {
    const { validateGasReportV3 } = loadGasReportHelpers();

    expect(
      validateGasReportV3(createValidGasFormData(), { status: "Scheduled" })
    ).toBe("compliant");

    expect(
      validateGasReportV3(createValidGasFormData(), { status: "In Progress" })
    ).toBe("compliant");
  });

  test("requires required photo uploads for normal and repeatable sections", () => {
    const { validateRequiredPhotoUploads } = loadGasReportHelpers();
    const template = {
      sections: [
        {
          id: "inspection-photos",
          title: "Inspection Photos",
          fields: [
            {
              id: "switchboard-photos",
              label: "Switchboard",
              type: "photo-multi",
              required: true,
            },
          ],
        },
        {
          id: "gas-appliances",
          title: "Gas Appliances",
          itemLabel: "Appliance",
          repeatable: true,
          fields: [
            {
              id: "appliance-photo",
              label: "Appliance Photo",
              type: "photo",
              required: true,
            },
          ],
        },
      ],
    };
    const formData = {
      "inspection-photos": {},
      "gas-appliances": [{}, {}],
    };

    expect(() =>
      validateRequiredPhotoUploads(template, formData, [
        {
          fieldId: "switchboard-photos",
          metadata: { sectionId: "inspection-photos", fieldId: "switchboard-photos" },
        },
        {
          fieldId: "appliance-photo-0",
          metadata: { sectionId: "gas-appliances", fieldId: "appliance-photo", itemIndex: 0 },
        },
      ])
    ).toThrow(/Appliance 2: Appliance Photo/);

    expect(() =>
      validateRequiredPhotoUploads(template, formData, [
        {
          fieldId: "switchboard-photos",
          metadata: { sectionId: "inspection-photos", fieldId: "switchboard-photos" },
        },
        {
          fieldId: "appliance-photo-0",
          metadata: { sectionId: "gas-appliances", fieldId: "appliance-photo", itemIndex: 0 },
        },
        {
          fieldId: "appliance-photo-1",
          metadata: { sectionId: "gas-appliances", fieldId: "appliance-photo", itemIndex: 1 },
        },
      ])
    ).not.toThrow();
  });
});
