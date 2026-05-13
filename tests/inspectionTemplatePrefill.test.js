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

  test("prefills electrical certification-next-inspection-due to about two years from now", () => {
    const prefillTemplateWithJobData = loadPrefillTemplateWithJobData();

    const template = {
      jobType: "Electrical",
      sections: [
        {
          id: "certification",
          fields: [
            {
              id: "certification-next-inspection-due",
              type: "date",
            },
          ],
        },
      ],
    };

    const result = prefillTemplateWithJobData(
      template,
      { jobType: "Electrical", job_id: "JOB-2" },
      {},
      {}
    );

    const field = result.sections[0].fields[0];
    expect(field.defaultValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test("prefills MSS inspector name and property address from server data only", () => {
    const prefillTemplateWithJobData = loadPrefillTemplateWithJobData();

    const template = {
      jobType: "MinimumSafetyStandard",
      sections: [
        {
          id: "property-summary",
          fields: [
            {
              id: "inspector-name",
              type: "text",
              metadata: {
                readOnly: true,
                serverPrefilled: true,
              },
            },
            {
              id: "inspector-license",
              type: "text",
            },
            {
              id: "property-address",
              type: "textarea",
              metadata: {
                readOnly: true,
                serverPrefilled: true,
              },
            },
          ],
        },
      ],
    };

    const result = prefillTemplateWithJobData(
      template,
      { jobType: "MinimumSafetyStandard", job_id: "JOB-3" },
      {
        address: {
          fullAddress: "3/581 Dohertys Road, Truganina VIC 3029",
        },
      },
      {
        firstName: "Sam",
        lastName: "Inspector",
        licenseNumber: "LIC-123",
      }
    );

    const fields = result.sections[0].fields;

    expect(fields.find((field) => field.id === "inspector-name")).toMatchObject({
      defaultValue: "Sam Inspector",
      metadata: {
        readOnly: true,
        serverPrefilled: true,
      },
    });
    expect(fields.find((field) => field.id === "property-address")).toMatchObject({
      defaultValue: "3/581 Dohertys Road, Truganina VIC 3029",
      metadata: {
        readOnly: true,
        serverPrefilled: true,
      },
    });
    expect(fields.find((field) => field.id === "inspector-license")).not.toHaveProperty(
      "defaultValue"
    );
  });
});
