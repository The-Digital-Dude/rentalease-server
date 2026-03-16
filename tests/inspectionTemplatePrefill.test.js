describe("Inspection template prefill", () => {
  const fs = require("fs");
  const path = require("path");

  const loadPrefillTemplateWithJobData = () => {
    const servicePath = path.resolve(
      __dirname,
      "../src/services/inspectionTemplate.service.js"
    );
    const source = fs.readFileSync(servicePath, "utf8");
    const match = source.match(
      /export const prefillTemplateWithJobData = \(template, job, property, technician\) => \{[\s\S]*?^};/m
    );

    if (!match) {
      throw new Error("Could not locate prefillTemplateWithJobData");
    }

    const executableSource = match[0]
      .replace("export const prefillTemplateWithJobData =", "const prefillTemplateWithJobData =")
      .concat("\nreturn prefillTemplateWithJobData;");

    return new Function(executableSource)();
  };

  test("prefills gas next-service-due to about two years from now", () => {
    const prefillTemplateWithJobData = loadPrefillTemplateWithJobData();

    const template = {
      jobType: "Gas",
      sections: [
        {
          id: "compliance-overview",
          fields: [
            {
              id: "next-service-due",
              type: "date",
            },
          ],
        },
      ],
    };

    const result = prefillTemplateWithJobData(
      template,
      { jobType: "Gas", job_id: "JOB-1" },
      {},
      {}
    );

    const field = result.sections[0].fields[0];
    expect(field.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const now = new Date();
    const expected = new Date(
      Date.now() + 2 * 365 * 24 * 60 * 60 * 1000
    );
    const actual = new Date(field.defaultValue);
    const diffDays = Math.abs(
      Math.round((actual - expected) / (1000 * 60 * 60 * 24))
    );

    expect(diffDays).toBeLessThanOrEqual(1);
    expect(actual.getFullYear()).toBeGreaterThanOrEqual(now.getFullYear() + 1);
  });
});
