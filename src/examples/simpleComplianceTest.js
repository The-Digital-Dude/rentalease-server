import mongoose from "mongoose";
import dotenv from "dotenv";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import Agency from "../models/Agency.js";

// Load environment variables
dotenv.config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Simple compliance check function
const checkComplianceSchedule = async () => {
  try {
    console.log("🔍 Checking compliance schedules...Juhan...");

    const now = new Date();
    const fifteenDaysFromNow = new Date(
      now.getTime() + 15 * 24 * 60 * 60 * 1000
    );

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

        console.log(`Property: ${property.address.fullAddress}`);
        console.log(
          `  ${complianceType.name}: ${daysUntilInspection} days until inspection`
        );

        // Check if inspection is due within 15 days or is overdue
        if (nextInspection <= fifteenDaysFromNow && nextInspection > now) {
          console.log(
            `  ✅ Would create job for ${complianceType.name} (due in ${daysUntilInspection} days)`
          );
          jobsCreated++;
        } else if (nextInspection < now) {
          console.log(
            `  ⚠️  Would create overdue job for ${
              complianceType.name
            } (overdue by ${Math.abs(daysUntilInspection)} days)`
          );
          jobsCreated++;
        }
      }
    }

    console.log(
      `\n📊 Summary: Would create ${jobsCreated} jobs for compliance inspections`
    );

    // Check existing jobs
    const existingJobs = await Job.find({
      status: { $in: ["Pending", "Scheduled"] },
    }).populate("property");

    console.log(
      `📋 Found ${existingJobs.length} existing pending/scheduled jobs:`
    );
    existingJobs.forEach((job) => {
      console.log(
        `  - ${job.jobType} job for property: ${
          job.property?.address?.fullAddress || job.property
        }`
      );
    });

    console.log("✅ Compliance check completed successfully!");
  } catch (error) {
    console.error("❌ Error in compliance check:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await checkComplianceSchedule();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runTest();
