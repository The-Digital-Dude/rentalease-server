import mongoose from "mongoose";
import Job from "../models/Job.js";
import Property from "../models/Property.js";
import ComplianceCronJob from "../services/complianceCronJob.js";

// Test script to verify duplicate job prevention
async function testDuplicateJobPrevention() {
  try {
    console.log("🧪 Testing duplicate job prevention...");

    // Connect to database (you'll need to set your connection string)
    // await mongoose.connect("your_mongodb_connection_string");

    // Get a test property
    const testProperty = await Property.findOne({ isActive: true });
    if (!testProperty) {
      console.log("❌ No active properties found for testing");
      return;
    }

    console.log(`📍 Using test property: ${testProperty._id}`);

    // Test 1: Create a job
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5); // 5 days from now

    const job1 = new Job({
      property: testProperty._id,
      jobType: "Gas",
      dueDate: dueDate,
      status: "Pending",
      priority: "High",
      description: "Test Gas job",
      estimatedDuration: 2,
      owner: {
        ownerType: "Agency",
        ownerId: testProperty.agency,
      },
      createdBy: {
        userType: "Agency",
        userId: testProperty.agency,
      },
    });

    console.log("📝 Creating first job...");
    await job1.save();
    console.log("✅ First job created successfully");

    // Test 2: Try to create a duplicate job on the same date
    const job2 = new Job({
      property: testProperty._id,
      jobType: "Gas",
      dueDate: dueDate, // Same date
      status: "Pending",
      priority: "High",
      description: "Duplicate Gas job",
      estimatedDuration: 2,
      owner: {
        ownerType: "Agency",
        ownerId: testProperty.agency,
      },
      createdBy: {
        userType: "Agency",
        userId: testProperty.agency,
      },
    });

    console.log("📝 Attempting to create duplicate job...");
    try {
      await job2.save();
      console.log("❌ Duplicate job was created - this should not happen!");
    } catch (error) {
      if (error.name === "DuplicateJobError") {
        console.log("✅ Duplicate job correctly prevented!");
        console.log(`   Error message: ${error.message}`);
      } else {
        console.log("❌ Unexpected error:", error.message);
      }
    }

    // Test 3: Try to create a different job type on the same date (should work)
    const job3 = new Job({
      property: testProperty._id,
      jobType: "Electrical", // Different job type
      dueDate: dueDate, // Same date
      status: "Pending",
      priority: "High",
      description: "Electrical job on same date",
      estimatedDuration: 2,
      owner: {
        ownerType: "Agency",
        ownerId: testProperty.agency,
      },
      createdBy: {
        userType: "Agency",
        userId: testProperty.agency,
      },
    });

    console.log("📝 Creating different job type on same date...");
    await job3.save();
    console.log("✅ Different job type created successfully");

    // Test 4: Try to create same job type on different date (should work)
    const differentDate = new Date(dueDate);
    differentDate.setDate(differentDate.getDate() + 1); // Next day

    const job4 = new Job({
      property: testProperty._id,
      jobType: "Gas", // Same job type
      dueDate: differentDate, // Different date
      status: "Pending",
      priority: "High",
      description: "Gas job on different date",
      estimatedDuration: 2,
      owner: {
        ownerType: "Agency",
        ownerId: testProperty.agency,
      },
      createdBy: {
        userType: "Agency",
        userId: testProperty.agency,
      },
    });

    console.log("📝 Creating same job type on different date...");
    await job4.save();
    console.log("✅ Same job type on different date created successfully");

    // Test 5: Test the static method
    console.log("📝 Testing static checkForDuplicate method...");
    const duplicate = await Job.checkForDuplicate(
      testProperty._id,
      "Gas",
      dueDate
    );

    if (duplicate) {
      console.log("✅ Static method correctly found duplicate job");
    } else {
      console.log("❌ Static method did not find duplicate job");
    }

    // Test 6: Test cron job duplicate checking
    console.log("📝 Testing cron job duplicate checking...");
    const cronJob = new ComplianceCronJob();
    const existingJob = await cronJob.checkExistingJob(
      testProperty._id,
      "gasCompliance",
      dueDate
    );

    if (existingJob) {
      console.log("✅ Cron job correctly found existing job");
    } else {
      console.log("❌ Cron job did not find existing job");
    }

    console.log("\n🎉 All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Close database connection
    // await mongoose.connection.close();
  }
}

// Run the test
testDuplicateJobPrevention();
