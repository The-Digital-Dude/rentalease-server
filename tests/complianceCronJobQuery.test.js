import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Compliance cron job query window", () => {
  test("includes overdue compliance inspections (no $gte startOfToday filter)", () => {
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
    const cronJobPath = path.resolve(
      __dirname,
      "../src/services/complianceCronJob.js"
    );
    const source = fs.readFileSync(cronJobPath, "utf8");

    expect(source).not.toMatch(/status:\s*['"]sent['"]/);
  });
});
