import Job from "../models/Job.js";
import { dueDateToEndOfDayUtc } from "../utils/timezone.js";

const AEST = "Australia/Sydney";

const toAESTDate = (d) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: AEST });

export const backfillStuckJobs = async () => {
  try {
    const nowAEST = toAESTDate(new Date());

    // Jobs in Overdue status whose AEST calendar date is today or future
    // were wrongly marked Overdue due to the midnight-UTC date storage bug
    const overdueJobs = await Job.find({ status: "Overdue" }).select(
      "_id job_id dueDate assignedTechnician"
    );

    const stuckJobs = overdueJobs.filter(
      (job) => toAESTDate(job.dueDate) >= nowAEST
    );

    if (stuckJobs.length === 0) {
      console.log("[BackfillStuckJobs] No stuck jobs found.");
      return;
    }

    console.log(`[BackfillStuckJobs] Found ${stuckJobs.length} stuck job(s). Fixing...`);

    for (const job of stuckJobs) {
      const dateOnly = new Date(job.dueDate).toISOString().slice(0, 10);
      const correctedDueDate = dueDateToEndOfDayUtc(dateOnly, AEST);
      const newStatus = job.assignedTechnician ? "Scheduled" : "Pending";

      await Job.findByIdAndUpdate(job._id, {
        $set: { dueDate: correctedDueDate, status: newStatus },
      });

      console.log(
        `[BackfillStuckJobs] Fixed job ${job.job_id || job._id}: ` +
        `Overdue → ${newStatus}, dueDate corrected to ${correctedDueDate.toISOString()}`
      );
    }

    console.log(`[BackfillStuckJobs] Done — fixed ${stuckJobs.length} job(s).`);
  } catch (err) {
    console.error("[BackfillStuckJobs] Error:", err.message);
  }
};
