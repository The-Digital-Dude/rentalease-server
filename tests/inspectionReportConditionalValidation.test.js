import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import defaultInspectionTemplates from "../src/config/inspectionTemplates.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadCreateMinimumSafetyStandardTemplate = () => {
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
    .concat("\nreturn createMinimumSafetyStandardTemplate;");

  return new Function(executableSource)();
};

const loadConditionalValidationHelpers = () => {
  const servicePath = path.resolve(
    __dirname,
    "../src/services/inspectionReport.service.js"
  );
  const source = fs.readFileSync(servicePath, "utf8");

  const extractConst = (name) => {
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

  const executableSource = [
    extractConst("ensureRequiredValue"),
    extractConst("isConditionMet"),
    extractConst("validateConditionallyRequiredFields"),
    "return { validateConditionallyRequiredFields };",
  ].join("\n\n");

  return new Function(executableSource)();
};

const getActiveTemplate = (jobType) =>
  defaultInspectionTemplates.find((template) => template.jobType === jobType);

describe("Conditional rectification validation", () => {
  test("adds rectification fields to the active gas, smoke, and electrical templates", () => {
    const gasTemplate = getActiveTemplate("Gas");
    const smokeTemplate = getActiveTemplate("Smoke");
    const electricalTemplate = getActiveTemplate("Electrical");

    expect(gasTemplate?.version).toBe(4);
    expect(smokeTemplate?.version).toBe(4);
    expect(electricalTemplate?.version).toBe(6);

    const gasFields = gasTemplate.sections.flatMap((section) => section.fields || []);
    const smokeFields = smokeTemplate.sections.flatMap((section) => section.fields || []);
    const electricalFields = electricalTemplate.sections.flatMap((section) => section.fields || []);

    expect(
      gasFields.find((field) => field.id === "gas-leakage-test-rectification")
    ).toMatchObject({
      type: "textarea",
      required: true,
      metadata: {
        requiredWhen: { fieldId: "gas-leakage-test", equals: "fail" },
        visibleWhen: { fieldId: "gas-leakage-test", equals: "fail" },
      },
    });

    expect(
      smokeFields.find((field) => field.id === "smoke-outcome-rectification")
    ).toMatchObject({
      type: "textarea",
      required: true,
      metadata: {
        requiredWhen: { fieldId: "smoke-outcome", notEquals: "all-compliant" },
        visibleWhen: { fieldId: "smoke-outcome", notEquals: "all-compliant" },
      },
    });

    expect(
      electricalFields.find((field) => field.id === "rcd-test-result-rectification")
    ).toMatchObject({
      type: "textarea",
      required: true,
      metadata: {
        requiredWhen: { fieldId: "rcd-test-result", notEquals: "pass" },
        visibleWhen: { fieldId: "rcd-test-result", notEquals: "pass" },
      },
    });
  });

  test("requires rectification text when a checklist question fails", () => {
    const createMinimumSafetyStandardTemplate =
      loadCreateMinimumSafetyStandardTemplate();
    const { validateConditionallyRequiredFields } =
      loadConditionalValidationHelpers();
    const template = createMinimumSafetyStandardTemplate(2, 2);

    const formData = {
      "property-summary": {},
      "electrical-safety": {
        "switchboard-circuit-breaker": "no",
      },
    };

    expect(() =>
      validateConditionallyRequiredFields(template, formData)
    ).toThrow(/switchboard-circuit-breaker-rectification/);
  });

  test("does not require rectification text when a checklist question passes", () => {
    const createMinimumSafetyStandardTemplate =
      loadCreateMinimumSafetyStandardTemplate();
    const { validateConditionallyRequiredFields } =
      loadConditionalValidationHelpers();
    const template = createMinimumSafetyStandardTemplate(2, 2);

    const formData = {
      "electrical-safety": {
        "switchboard-circuit-breaker": "yes",
      },
    };

    expect(() =>
      validateConditionallyRequiredFields(template, formData)
    ).not.toThrow();
  });

  test.each([
    {
      jobType: "Gas",
      sectionId: "lp-gas-checklist",
      fieldId: "gas-leakage-test",
      value: "fail",
      expectedMessage: /gas-leakage-test-rectification/,
    },
    {
      jobType: "Smoke",
      sectionId: "inspection-summary",
      fieldId: "smoke-outcome",
      value: "issues-identified",
      expectedMessage: /smoke-outcome-rectification/,
    },
    {
      jobType: "Electrical",
      sectionId: "rcd-testing",
      fieldId: "rcd-test-result",
      value: "fail",
      expectedMessage: /rcd-test-result-rectification/,
    },
  ])(
    "requires rectification for a failing $jobType inspection field",
    ({ jobType, sectionId, fieldId, value, expectedMessage }) => {
      const { validateConditionallyRequiredFields } =
        loadConditionalValidationHelpers();
      const template = getActiveTemplate(jobType);

      const formData = {
        [sectionId]: {
          [fieldId]: value,
        },
      };

      expect(() =>
        validateConditionallyRequiredFields(template, formData)
      ).toThrow(expectedMessage);
    }
  );
});
