import mongoose from "mongoose";
import dotenv from "dotenv";
import ComplianceCronJob from "../services/complianceCronJob.js";
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

// Test function
const testComplianceCron = async () => {
  try {
    console.log("🧪 Testing compliance cron job...");

    // Initialize cron job
    const complianceCronJob = new ComplianceCronJob();

    // Run the compliance check
    await complianceCronJob.checkComplianceSchedule();

    // Check if any jobs were created
    const recentJobs = await Job.find({
      createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Jobs created in last 5 minutes
    }).populate("property");

    console.log(`📊 Found ${recentJobs.length} recently created jobs:`);
    recentJobs.forEach((job) => {
      console.log(
        `  - ${job.jobType} job for property: ${
          job.property?.address?.fullAddress || job.property
        }`
      );
    });

    // Get properties with compliance due soon
    const now = new Date();
    const fifteenDaysFromNow = new Date(
      now.getTime() + 15 * 24 * 60 * 60 * 1000
    );

    const propertiesWithComplianceDue = await Property.find({
      isActive: true,
      $or: [
        {
          "complianceSchedule.gasCompliance.nextInspection": {
            $lte: fifteenDaysFromNow,
            $gte: now,
          },
        },
        {
          "complianceSchedule.electricalSafety.nextInspection": {
            $lte: fifteenDaysFromNow,
            $gte: now,
          },
        },
        {
          "complianceSchedule.smokeAlarms.nextInspection": {
            $lte: fifteenDaysFromNow,
            $gte: now,
          },
        },
      ],
    });

    console.log(
      `🏠 Found ${propertiesWithComplianceDue.length} properties with compliance due within 15 days`
    );

    console.log("✅ Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

// Run the test
connectDB().then(testComplianceCron);
