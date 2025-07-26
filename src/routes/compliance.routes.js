import express from "express";
import ComplianceCronJob from "../services/complianceCronJob.js";
import Job from "../models/Job.js";

const router = express.Router();

// Initialize the cron job instance
const complianceCronJob = new ComplianceCronJob();

// Manual trigger for compliance check (for testing purposes)
router.post("/trigger-compliance-check", async (req, res) => {
  try {
    await complianceCronJob.manualTrigger();
    res.status(200).json({
      success: true,
      message: "Compliance check triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering compliance check:", error);
    res.status(500).json({
      success: false,
      message: "Failed to trigger compliance check",
      error: error.message,
    });
  }
});

// Get compliance job status
router.get("/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Compliance cron job is running",
    isRunning: complianceCronJob.isRunning,
  });
});

// Test endpoint to check job visibility (no authentication required)
router.get("/test-job-visibility", async (req, res) => {
  try {
    // Simulate super user query (all jobs)
    const allJobs = await Job.find({}).populate("property", "address _id");

    // Simulate agency query (only their jobs)
    const agencyJobs = await Job.find({
      "owner.ownerType": "Agency",
    }).populate("property", "address _id");

    res.status(200).json({
      success: true,
      message: "Job visibility test completed",
      data: {
        totalJobs: allJobs.length,
        agencyJobs: agencyJobs.length,
        jobs: allJobs.map((job) => ({
          id: job._id,
          job_id: job.job_id,
          jobType: job.jobType,
          status: job.status,
          owner: job.owner,
          property: job.property,
          dueDate: job.dueDate,
          createdAt: job.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Error in job visibility test:", error);
    res.status(500).json({
      success: false,
      message: "Failed to test job visibility",
      error: error.message,
    });
  }
});

export default router;
