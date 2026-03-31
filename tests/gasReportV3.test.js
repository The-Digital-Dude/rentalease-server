describe("Gas report v3 validation and outcome", () => {
  const fs = require("fs");
  const path = require("path");

  const loadGasReportHelpers = () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionReport.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const executableSource = source
      .replace(/^import .*;$/gm, "")
      .replace(/export const submitInspectionReport = async/g, "const submitInspectionReport = async")
      .replace(/export default submitInspectionReport;?/g, "")
      .concat(
        "\nreturn { calculateGasComplianceOutcome, validateGasReportV3, isGasTemplateV3 };"
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
      isGasTemplateV3({
        jobType: "Gas",
        version: 2,
      }, {
        "appliance-1": {},
      })
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

  test("requires other appliance type text when appliance type is other", () => {
    const { validateGasReportV3 } = loadGasReportHelpers();
    const formData = createValidGasFormData();

    formData["gas-appliances"][0]["appliance-type"] = "other";
    delete formData["gas-appliances"][0]["appliance-type-other"];

    expect(() =>
      validateGasReportV3(formData, { status: "Completed" })
    ).toThrow(/other appliance type is required/i);
  });

  test("requires completed job status for gas v3 submission", () => {
    const { validateGasReportV3 } = loadGasReportHelpers();

    expect(() =>
      validateGasReportV3(createValidGasFormData(), { status: "Scheduled" })
    ).toThrow(/job status is Completed/i);
  });
});
