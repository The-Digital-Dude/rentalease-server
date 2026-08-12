import cron from "node-cron";
import Job from "../models/Job.js";
import notificationService from "./notification.service.js";

// Runs at 00:05 AEST every day (14:05 UTC standard; 15:05 UTC during AEDT)
const CRON_SCHEDULE = "5 14,15 * * *";

const AEST = "Australia/Sydney";

const todayAEST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: AEST });

// Returns midnight UTC at the start of the given AEST date string "YYYY-MM-DD"
const aestDateToUtc = (dateStr) => new Date(`${dateStr}T00:00:00+10:00`);

const sendDueNotifications = async (jobs) => {
  for (const job of jobs) {
    try {
      const address = job.property?.address?.fullAddress || "Unknown address";
      const recipients = [];

      if (job.assignedTechnician) {
        recipients.push({
          recipientType: "Technician",
          recipientId: job.assignedTechnician._id || job.assignedTechnician,
        });
      }
      if (job.agency) {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.agency._id || job.agency,
        });
      }

      for (const recipient of recipients) {
        await notificationService.sendNotification({
          recipient,
          type: "JOB_DUE",
          title: "Job Due — Completion Required",
          message: `Job ${job.job_id} (${job.jobType}) at ${address} was due today and has not been completed.`,
          priority: "High",
          data: { jobId: job._id, jobType: job.jobType, propertyAddress: address },
        });
      }
    } catch (err) {
      console.error(`[DueCron] Failed to notify for job ${job.job_id}:`, err.message);
    }
  }
};

const sendOverdueNotifications = async (jobs) => {
  for (const job of jobs) {
    try {
      const address = job.property?.address?.fullAddress || "Unknown address";
      const recipients = [];

      if (job.assignedTechnician) {
        recipients.push({
          recipientType: "Technician",
          recipientId: job.assignedTechnician._id || job.assignedTechnician,
        });
      }
      if (job.agency) {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.agency._id || job.agency,
        });
      }
      if (job.superUser) {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: job.superUser._id || job.superUser,
        });
      }

      for (const recipient of recipients) {
        await notificationService.sendNotification({
          recipient,
          type: "JOB_OVERDUE",
          title: "Job Now Overdue",
          message: `Job ${job.job_id} (${job.jobType}) at ${address} is now overdue (3+ days past due date). Immediate attention required.`,
          priority: "Urgent",
          data: { jobId: job._id, jobType: job.jobType, propertyAddress: address },
        });
      }
    } catch (err) {
      console.error(`[OverdueCron] Failed to notify for job ${job.job_id}:`, err.message);
    }
  }
};

const runDueCronTick = async () => {
  const now = new Date();
  const aestToday = todayAEST();

  // Threshold dates (midnight UTC boundaries for AEST dates)
  const startOfTodayUtc = aestDateToUtc(aestToday);
  const threeDaysAgo = new Date(startOfTodayUtc);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  try {
    // --- Mark Pending/Scheduled → Due (dueDate is yesterday or earlier, within 3-day window) ---
    const toBeDue = await Job.find({
      status: { $in: ["Pending", "Scheduled"] },
      dueDate: { $lt: startOfTodayUtc, $gte: threeDaysAgo },
    }).populate("property", "address").select("_id job_id jobType assignedTechnician agency");

    if (toBeDue.length > 0) {
      await Job.updateMany(
        { _id: { $in: toBeDue.map((j) => j._id) } },
        { $set: { status: "Due" } }
      );
      console.log(`[DueCron] Marked ${toBeDue.length} job(s) as Due at ${now.toISOString()}`);
      await sendDueNotifications(toBeDue);
    }

    // --- Mark Due → Overdue (dueDate is 3+ days ago) ---
    const toBeOverdue = await Job.find({
      status: "Due",
      dueDate: { $lt: threeDaysAgo },
    }).populate("property", "address").select("_id job_id jobType assignedTechnician agency superUser");

    // Also catch any Pending/Scheduled that somehow fell through (dueDate > 3 days ago)
    const staleActive = await Job.find({
      status: { $in: ["Pending", "Scheduled"] },
      dueDate: { $lt: threeDaysAgo },
    }).populate("property", "address").select("_id job_id jobType assignedTechnician agency superUser");

    const allToBeOverdue = [...toBeOverdue, ...staleActive];

    if (allToBeOverdue.length > 0) {
      await Job.updateMany(
        { _id: { $in: allToBeOverdue.map((j) => j._id) } },
        { $set: { status: "Overdue" } }
      );
      console.log(`[OverdueCron] Marked ${allToBeOverdue.length} job(s) as Overdue at ${now.toISOString()}`);
      await sendOverdueNotifications(allToBeOverdue);
    }

    if (toBeDue.length === 0 && allToBeOverdue.length === 0) {
      console.log(`[DueCron] No status changes required at ${now.toISOString()}`);
    }
  } catch (error) {
    console.error("[DueCron] Failed:", error.message);
  }
};

export const startOverdueCron = () => {
  runDueCronTick();
  cron.schedule(CRON_SCHEDULE, runDueCronTick, { timezone: "UTC" });
  console.log("✅ Due/Overdue cron scheduled (daily at 00:05 AEST)");
};

export default runDueCronTick;
