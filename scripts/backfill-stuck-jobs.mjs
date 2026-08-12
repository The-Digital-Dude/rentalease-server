/**
 * One-time backfill: reset jobs that were stuck in Overdue because they were
 * created with a midnight-UTC dueDate (which is 10am the previous AEST day).
 *
 * A "stuck" job is one where:
 *   - status is "Overdue"
 *   - dueDate is in the future in AEST (i.e. the job should NOT be overdue yet)
 *
 * For each stuck job we:
 *   1. Push dueDate to end-of-day AEST (23:59:59) for the same calendar date
 *   2. Reset status back to "Pending" (or "Scheduled" if a technician is assigned)
 *
 * Run with: node scripts/backfill-stuck-jobs.mjs
 * Add --dry-run to preview without making changes.
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env") });

const { dueDateToEndOfDayUtc } = await import("../src/utils/timezone.js");

const DRY_RUN = process.argv.includes("--dry-run");
const AEST = "Australia/Sydney";

await mongoose.connect(process.env.MONGODB_URI);
console.log("Connected to MongoDB");

// Dynamically load Job model
const { default: Job } = await import("../src/models/Job.js");

const nowAEST = new Date().toLocaleDateString("en-CA", { timeZone: AEST });

// Find all Overdue jobs whose AEST calendar date is today or in the future
// (they should NOT have been marked overdue yet)
const overdueJobs = await Job.find({ status: "Overdue" }).select(
  "_id job_id dueDate assignedTechnician status"
);

const stuckJobs = overdueJobs.filter((job) => {
  const dueDateAEST = new Date(job.dueDate).toLocaleDateString("en-CA", { timeZone: AEST });
  return dueDateAEST >= nowAEST; // due today or in the future → should not be Overdue
});

console.log(`Found ${overdueJobs.length} Overdue jobs total`);
console.log(`Found ${stuckJobs.length} stuck jobs (due today or future, wrongly Overdue)\n`);

if (stuckJobs.length === 0) {
  console.log("Nothing to fix.");
  await mongoose.disconnect();
  process.exit(0);
}

for (const job of stuckJobs) {
  const dueDateAEST = new Date(job.dueDate).toLocaleDateString("en-CA", { timeZone: AEST });
  const correctedDueDate = dueDateToEndOfDayUtc(
    new Date(job.dueDate).toISOString().slice(0, 10),
    AEST
  );
  const newStatus = job.assignedTechnician ? "Scheduled" : "Pending";

  console.log(`Job ${job.job_id || job._id}`);
  console.log(`  dueDate AEST:      ${dueDateAEST}`);
  console.log(`  old dueDate UTC:   ${job.dueDate.toISOString()}`);
  console.log(`  new dueDate UTC:   ${correctedDueDate.toISOString()}`);
  console.log(`  status:            Overdue → ${newStatus}`);

  if (!DRY_RUN) {
    await Job.findByIdAndUpdate(job._id, {
      $set: {
        dueDate: correctedDueDate,
        status: newStatus,
      },
    });
    console.log(`  ✅ Updated`);
  } else {
    console.log(`  (dry-run — no change made)`);
  }
  console.log();
}

if (DRY_RUN) {
  console.log("Dry run complete. Run without --dry-run to apply changes.");
} else {
  console.log(`Backfill complete. Updated ${stuckJobs.length} job(s).`);
}

await mongoose.disconnect();
