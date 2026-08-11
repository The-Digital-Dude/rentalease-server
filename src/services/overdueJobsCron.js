import cron from "node-cron";
import Job from "../models/Job.js";

// Runs at 00:05 AEST every day (14:05 UTC = midnight Sydney standard; 15:05 UTC during AEDT)
// We run both expressions so the job fires correctly regardless of DST.
const CRON_SCHEDULE = "5 14,15 * * *";

const markOverdueJobs = async () => {
  const now = new Date();
  try {
    const result = await Job.updateMany(
      {
        dueDate: { $lt: now },
        status: { $nin: ["Completed", "Cancelled", "Overdue"] },
      },
      { $set: { status: "Overdue" } }
    );
    if (result.modifiedCount > 0) {
      console.log(`[OverdueCron] Marked ${result.modifiedCount} job(s) as Overdue at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error("[OverdueCron] Failed to mark overdue jobs:", error.message);
  }
};

export const startOverdueCron = () => {
  // Run immediately on startup to catch any jobs missed during downtime
  markOverdueJobs();

  cron.schedule(CRON_SCHEDULE, markOverdueJobs, { timezone: "UTC" });
  console.log("✅ Overdue jobs cron scheduled (daily at 00:05 AEST)");
};

export default markOverdueJobs;
