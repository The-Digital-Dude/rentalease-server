import mongoose from "mongoose";
import dotenv from "dotenv";
import Job from "../models/Job.js";
import Staff from "../models/Staff.js";

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

// Mock request object for testing
const createMockRequest = (userType, userId) => {
  const req = {};

  if (userType === "SuperUser") {
    req.superUser = { id: userId };
  } else if (userType === "Agency") {
    req.agency = { id: userId };
  }

  return req;
};

// Helper function to get owner info based on user type (copied from job.routes.js)
const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: "SuperUser",
      ownerId: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      ownerType: "Agency",
      ownerId: req.agency.id,
    };
  }
  return null;
};

// Helper function to validate owner access (copied from job.routes.js)
const validateOwnerAccess = (job, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;

  // Super users can access any job
  if (ownerInfo.ownerType === "SuperUser") {
    return true;
  }

  // For other users, check if they own the job
  return (
    job.owner.ownerType === ownerInfo.ownerType &&
    job.owner.ownerId.toString() === ownerInfo.ownerId.toString()
  );
};

// Test super user access to jobs
const testSuperUserJobAccess = async () => {
  try {
    console.log("🔍 Testing Super User job access...");

    // Get all jobs
    const allJobs = await Job.find({}).limit(5);
    console.log(`📊 Found ${allJobs.length} jobs to test`);

    if (allJobs.length === 0) {
      console.log(
        "⚠️  No jobs found in database. Please create some jobs first."
      );
      return;
    }

    // Test with different user types
    const testCases = [
      {
        name: "Super User accessing own job",
        userType: "SuperUser",
        userId: "507f1f77bcf86cd799439011", // Mock SuperUser ID
        expectedAccess: true,
      },
      {
        name: "Super User accessing agency job",
        userType: "SuperUser",
        userId: "507f1f77bcf86cd799439012", // Different SuperUser ID
        expectedAccess: true,
      },
      {
        name: "Agency accessing own job",
        userType: "Agency",
        userId: "507f1f77bcf86cd799439013", // Mock Agency ID
        expectedAccess: false, // Will be false unless they actually own the job
      },
    ];

    console.log("\n🧪 Running access control tests...");

    for (const testCase of testCases) {
      console.log(`\n📋 Test: ${testCase.name}`);

      for (const job of allJobs) {
        const mockReq = createMockRequest(testCase.userType, testCase.userId);
        const hasAccess = validateOwnerAccess(job, mockReq);

        console.log(
          `  - Job ${job.job_id} (Owner: ${job.owner.ownerType}): ${
            hasAccess ? "✅ ACCESS" : "❌ DENIED"
          }`
        );

        // For SuperUser tests, all should have access
        if (testCase.userType === "SuperUser" && testCase.expectedAccess) {
          if (!hasAccess) {
            console.log(
              `    ❌ FAILED: SuperUser should have access to all jobs`
            );
          } else {
            console.log(`    ✅ PASSED: SuperUser has access as expected`);
          }
        }
      }
    }

    // Test specific scenarios
    console.log("\n🎯 Testing specific scenarios...");

    // Find a job owned by an agency
    const agencyJob = allJobs.find((job) => job.owner.ownerType === "Agency");
    if (agencyJob) {
      console.log(`\n📋 Found agency job: ${agencyJob.job_id}`);

      // Test super user accessing agency job
      const superUserReq = createMockRequest(
        "SuperUser",
        "507f1f77bcf86cd799439011"
      );
      const superUserAccess = validateOwnerAccess(agencyJob, superUserReq);

      console.log(
        `  SuperUser access to agency job: ${
          superUserAccess ? "✅ ACCESS" : "❌ DENIED"
        }`
      );

      if (superUserAccess) {
        console.log("  ✅ PASSED: SuperUser can access agency job");
      } else {
        console.log(
          "  ❌ FAILED: SuperUser should be able to access agency job"
        );
      }

      // Test agency accessing their own job
      const agencyReq = createMockRequest("Agency", agencyJob.owner.ownerId);
      const agencyAccess = validateOwnerAccess(agencyJob, agencyReq);

      console.log(
        `  Agency access to own job: ${
          agencyAccess ? "✅ ACCESS" : "❌ DENIED"
        }`
      );

      if (agencyAccess) {
        console.log("  ✅ PASSED: Agency can access own job");
      } else {
        console.log("  ❌ FAILED: Agency should be able to access own job");
      }
    }

    console.log("\n✅ Super User job access test completed!");
  } catch (error) {
    console.error("❌ Error in super user job access test:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testSuperUserJobAccess();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runTest();
