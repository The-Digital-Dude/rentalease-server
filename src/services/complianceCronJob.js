import cron from "node-cron";
import Property from "../models/Property.js";
import Job from "../models/Job.js";

class ComplianceCronJob {
  constructor() {
    this.isRunning = false;
  }

  // Check if a job already exists for a property and compliance type
  async checkExistingJob(propertyId, complianceType) {
    const jobTypeMap = {
      gasCompliance: "Gas",
      electricalSafety: "Electrical",
      smokeAlarms: "Smoke",
    };

    const existingJob = await Job.findOne({
      property: propertyId,
      jobType: jobTypeMap[complianceType],
      status: { $in: ["Pending", "Scheduled"] },
    });

    return existingJob;
  }

  // Create a job for compliance inspection
  async createComplianceJob(property, complianceType, dueDate) {
    try {
      // Check if job already exists
      const existingJob = await this.checkExistingJob(
        property._id,
        complianceType
      );
      if (existingJob) {
        console.log(
          `Job already exists for property ${property._id} - ${complianceType}`
        );
        return null;
      }

      const jobTypeMap = {
        gasCompliance: "Gas",
        electricalSafety: "Electrical",
        smokeAlarms: "Smoke",
      };

      const jobData = {
        property: property._id,
        jobType: jobTypeMap[complianceType],
        dueDate: dueDate,
        status: "Pending",
        priority: "High",
        description: `Scheduled ${complianceType} inspection for property at ${property.address.fullAddress}`,
        estimatedDuration: 2, // Default 2 hours
        owner: {
          ownerType: "Agency",
          ownerId: property.agency,
        },
        createdBy: {
          userType: "Agency",
          userId: property.agency,
        },
      };

      const newJob = new Job(jobData);
      await newJob.save();

      console.log(
        `✅ Created ${complianceType} job for property ${property._id}`
      );
      return newJob;
    } catch (error) {
      console.error(
        `❌ Error creating ${complianceType} job for property ${property._id}:`,
        error
      );
      return null;
    }
  }

  // Check compliance schedule and create jobs if needed
  async checkComplianceSchedule() {
    if (this.isRunning) {
      console.log("Compliance check already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("🔍 Starting compliance schedule check...");

    try {
      const now = new Date();
      const fifteenDaysFromNow = new Date(
        now.getTime() + 15 * 24 * 60 * 60 * 1000
      );
      const sevenDaysFromNow = new Date(
        now.getTime() + 7 * 24 * 60 * 60 * 1000
      );
      const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

      // Get all active properties
      const properties = await Property.find({ isActive: true });

      let jobsCreated = 0;

      for (const property of properties) {
        const compliance = property.complianceSchedule;

        // Check each compliance type
        const complianceTypes = [
          { key: "gasCompliance", name: "Gas Compliance" },
          { key: "electricalSafety", name: "Electrical Safety" },
          { key: "smokeAlarms", name: "Smoke Alarms" },
        ];

        for (const complianceType of complianceTypes) {
          const complianceData = compliance[complianceType.key];

          // Skip if not required
          if (!complianceData.required) {
            continue;
          }

          // Skip if no next inspection date
          if (!complianceData.nextInspection) {
            continue;
          }

          const nextInspection = new Date(complianceData.nextInspection);
          const daysUntilInspection = Math.ceil(
            (nextInspection - now) / (1000 * 60 * 60 * 24)
          );

          // Create job if inspection is due within 15 days or is overdue
          if (nextInspection <= fifteenDaysFromNow && nextInspection > now) {
            const job = await this.createComplianceJob(
              property,
              complianceType.key,
              nextInspection
            );
            if (job) jobsCreated++;
          }
          // Also create job if overdue - set due date to tomorrow to pass validation
          else if (nextInspection < now) {
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const job = await this.createComplianceJob(
              property,
              complianceType.key,
              tomorrow
            );
            if (job) jobsCreated++;
          }
        }
      }

      console.log(
        `✅ Compliance check completed. Created ${jobsCreated} new jobs.`
      );
    } catch (error) {
      console.error("❌ Error in compliance schedule check:", error);
    } finally {
      this.isRunning = false;
    }
  }

  // Start the cron job
  start() {
    console.log("🚀 Starting compliance cron job...");

    // Run every day at 1:00 AM Bangladesh time
    cron.schedule(
      "0 1 * * *",
      () => {
        console.log(
          "⏰ Running daily compliance check at 1:00 AM Bangladesh time..."
        );
        this.checkComplianceSchedule();
      },
      {
        scheduled: true,
        timezone: "Asia/Dhaka",
      }
    );

    // Also run immediately when server starts
    setTimeout(() => {
      console.log("🔄 Running initial compliance check...");
      this.checkComplianceSchedule();
    }, 5000); // Wait 5 seconds after server starts

    console.log(
      "✅ Compliance cron job scheduled successfully (daily at 1:00 AM Bangladesh time)"
    );
  }

  // Stop the cron job
  stop() {
    console.log("🛑 Stopping compliance cron job...");
    cron.getTasks().forEach((task) => task.stop());
  }

  // Manual trigger for testing
  async manualTrigger() {
    console.log("🔧 Manual compliance check triggered...");
    await this.checkComplianceSchedule();
  }
}

export default ComplianceCronJob;
