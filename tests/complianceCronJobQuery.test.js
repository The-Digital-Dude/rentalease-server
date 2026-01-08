describe("Compliance cron job query window", () => {
  test("includes overdue compliance inspections (no $gte startOfToday filter)", () => {
    const fs = require("fs");
    const path = require("path");

    const cronJobPath = path.resolve(
      __dirname,
      "../src/services/complianceCronJob.js"
    );
    const source = fs.readFileSync(cronJobPath, "utf8");

    expect(source).toContain("getComplianceQuery");
    expect(source).not.toMatch(/\$gte:\s*startOfToday/);
    expect(source).toMatch(/\$lte:\s*endOfMonth/);
  });

  test("does not dedupe against failed email attempts", () => {
    const fs = require("fs");
    const path = require("path");

    const cronJobPath = path.resolve(
      __dirname,
      "../src/services/complianceCronJob.js"
    );
    const source = fs.readFileSync(cronJobPath, "utf8");

    expect(source).toMatch(/emailStatus:\s*["']sent["']/);
  });
});
