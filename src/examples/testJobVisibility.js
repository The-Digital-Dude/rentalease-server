import mongoose from "mongoose";
import dotenv from "dotenv";

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

// Test job visibility
const testJobVisibility = async () => {
  try {
    console.log("🔍 Testing job visibility...");

    // Get all jobs
    const allJobs = await mongoose.connection.db
      .collection("jobs")
      .find({})
      .toArray();
    console.log(`📊 Total jobs in database: ${allJobs.length}`);

    // Get jobs by owner type
    const agencyJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        "owner.ownerType": "Agency",
      })
      .toArray();
    console.log(`🏢 Agency jobs: ${agencyJobs.length}`);

    const superUserJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        "owner.ownerType": "SuperUser",
      })
      .toArray();
    console.log(`👑 SuperUser jobs: ${superUserJobs.length}`);

    // Get recent jobs (created in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        createdAt: { $gte: tenMinutesAgo },
      })
      .toArray();
    console.log(`🕐 Recent jobs (last 10 minutes): ${recentJobs.length}`);

    // Show details of recent jobs
    if (recentJobs.length > 0) {
      console.log("\n📋 Recent jobs details:");
      recentJobs.forEach((job) => {
        console.log(`  - Job ID: ${job.job_id}`);
        console.log(`    Type: ${job.jobType}`);
        console.log(`    Status: ${job.status}`);
        console.log(`    Owner: ${job.owner.ownerType} (${job.owner.ownerId})`);
        console.log(`    Due Date: ${job.dueDate}`);
        console.log(`    Created: ${job.createdAt}`);
        console.log("");
      });
    }

    // Get jobs by status
    const pendingJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        status: "Pending",
      })
      .toArray();
    console.log(`⏳ Pending jobs: ${pendingJobs.length}`);

    const scheduledJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        status: "Scheduled",
      })
      .toArray();
    console.log(`📅 Scheduled jobs: ${scheduledJobs.length}`);

    const overdueJobs = await mongoose.connection.db
      .collection("jobs")
      .find({
        status: "Overdue",
      })
      .toArray();
    console.log(`⚠️  Overdue jobs: ${overdueJobs.length}`);

    console.log("✅ Job visibility test completed successfully!");
  } catch (error) {
    console.error("❌ Error in job visibility test:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testJobVisibility();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runTest();
