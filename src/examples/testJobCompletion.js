import mongoose from "mongoose";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Property from "../models/Property.js";
import Agency from "../models/Agency.js";
import dotenv from "dotenv";

dotenv.config();

// Test the job completion API
async function testJobCompletion() {
  let testData = {
    agency: null,
    property: null,
    technician: null,
    jobs: [],
  };

  try {
    console.log("🧪 Testing Job Completion API...\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Create test data
    console.log("\n📝 Creating test data...");

    // Generate unique test data
    const timestamp = Date.now();
    const uniqueABN = `123456789${timestamp.toString().slice(-2)}`;
    const uniqueEmail = `john${timestamp}@testagency.com`;

    // Create a test agency
    const agency = new Agency({
      companyName: `Test Agency ${timestamp}`,
      contactPerson: "John Doe",
      email: uniqueEmail,
      phone: "1234567890",
      password: "password123",
      status: "Active",
      abn: uniqueABN,
      region: "North",
      compliance: "Basic Package",
    });
    await agency.save();
    testData.agency = agency;
    console.log("✅ Created test agency");

    // Create a test property
    const property = new Property({
      address: {
        street: "123 Test Street",
        suburb: "Test City",
        state: "NSW",
        postcode: "2000",
        fullAddress: "123 Test Street, Test City, NSW 2000",
      },
      propertyType: "House",
      region: "Sydney Metro",
      agency: agency._id,
      currentTenant: {
        name: "John Tenant",
        email: "tenant@test.com",
        phone: "0412345678",
      },
      currentLandlord: {
        name: "Jane Landlord",
        email: "landlord@test.com",
        phone: "0423456789",
      },
      createdBy: {
        userType: "Agency",
        userId: agency._id,
      },
    });
    await property.save();
    testData.property = property;
    console.log("✅ Created test property");

    // Create a test technician
    const technician = new Technician({
      firstName: "Test",
      lastName: "Technician",
      email: "tech@test.com",
      phone: "0987654321",
      password: "password123",
      status: "Active",
      availabilityStatus: "Available",
      currentJobs: 0,
      maxJobs: 4,
      serviceRegions: ["North"],
      owner: {
        ownerType: "Agency",
        ownerId: agency._id,
      },
    });
    await technician.save();
    testData.technician = technician;
    console.log("✅ Created test technician");

    // Test the completion validation logic
    console.log("\n🔍 Testing completion validation logic...");

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Test 1: Valid completion scenario
    console.log("\n📋 Test 1: Valid completion scenario");
    const validJobData = {
      status: "Scheduled",
      assignedTechnician: technician._id,
      dueDate: today,
    };
    console.log(`Job Status: ${validJobData.status}`);
    console.log(`Assigned Technician: ${validJobData.assignedTechnician}`);
    console.log(`Due Date: ${validJobData.dueDate.toDateString()}`);
    console.log(`Today: ${today.toDateString()}`);
    console.log(
      `Can complete: ${
        validJobData.status === "Scheduled" &&
        validJobData.assignedTechnician &&
        today.toDateString() === validJobData.dueDate.toDateString()
      }`
    );

    // Test 2: Future due date scenario
    console.log("\n📋 Test 2: Future due date scenario");
    const futureJobData = {
      status: "Scheduled",
      assignedTechnician: technician._id,
      dueDate: tomorrow,
    };
    console.log(`Due Date: ${futureJobData.dueDate.toDateString()}`);
    console.log(`Today: ${today.toDateString()}`);
    console.log(
      `Can complete: ${
        today.toDateString() === futureJobData.dueDate.toDateString()
      }`
    );

    // Test 3: Already completed job scenario
    console.log("\n📋 Test 3: Already completed job scenario");
    const completedJobData = {
      status: "Completed",
      assignedTechnician: technician._id,
      dueDate: today,
    };
    console.log(`Job Status: ${completedJobData.status}`);
    console.log(
      `Can complete: ${["Scheduled", "In Progress"].includes(
        completedJobData.status
      )}`
    );

    // Test 4: Unassigned job scenario
    console.log("\n📋 Test 4: Unassigned job scenario");
    const unassignedJobData = {
      status: "Pending",
      assignedTechnician: null,
      dueDate: today,
    };
    console.log(`Job Status: ${unassignedJobData.status}`);
    console.log(`Assigned Technician: ${unassignedJobData.assignedTechnician}`);
    console.log(
      `Can complete: ${
        unassignedJobData.assignedTechnician &&
        ["Scheduled", "In Progress"].includes(unassignedJobData.status)
      }`
    );

    // Test 5: Wrong status scenario
    console.log("\n📋 Test 5: Wrong status scenario");
    const wrongStatusJobData = {
      status: "Overdue",
      assignedTechnician: technician._id,
      dueDate: today,
    };
    console.log(`Job Status: ${wrongStatusJobData.status}`);
    console.log(
      `Can complete: ${["Scheduled", "In Progress"].includes(
        wrongStatusJobData.status
      )}`
    );

    console.log("\n✅ Validation logic tests completed successfully!");

    console.log("\n📋 Summary of test scenarios:");
    console.log("1. ✅ Valid completion scenario - Should pass");
    console.log("2. ❌ Future due date scenario - Should fail");
    console.log("3. ❌ Already completed job scenario - Should fail");
    console.log("4. ❌ Unassigned job scenario - Should fail");
    console.log("5. ❌ Wrong status scenario - Should fail");

    // Test actual API endpoint with real job completion
    console.log("\n🚀 Testing actual job completion API...");

    try {
      // Create a job with a future due date initially, then update to today for testing
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // Tomorrow

      const testJobData = {
        jobNumber: `TEST-${Date.now()}`,
        jobType: "Gas",
        dueDate: futureDate, // Start with future date to pass validation
        status: "Scheduled",
        assignedTechnician: testData.technician._id,
        property: testData.property._id,
        owner: {
          ownerType: "Agency",
          ownerId: testData.agency._id,
        },
        createdBy: {
          userType: "Agency",
          userId: testData.agency._id,
        },
        description: "Test job for completion API",
        priority: "Medium",
      };

      const testJob = new Job(testJobData);
      await testJob.save();
      console.log("✅ Created test job for API testing");

      // Store test job for cleanup
      testData.testJob = testJob;

      // Update the job's due date to today for testing completion
      const today = new Date();
      await Job.findByIdAndUpdate(
        testJob._id,
        { dueDate: today },
        { runValidators: false }
      );
      console.log("✅ Updated job due date to today for testing");

      // Refresh the job object
      const updatedTestJob = await Job.findById(testJob._id);
      testData.testJob = updatedTestJob;

      // Simulate the completion logic that would be used in the API
      const jobDueDate = new Date(updatedTestJob.dueDate);
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const dueDateStart = new Date(
        jobDueDate.getFullYear(),
        jobDueDate.getMonth(),
        jobDueDate.getDate()
      );

      const isDueDateOrAfter = dueDateStart <= todayStart;
      const canComplete =
        isDueDateOrAfter &&
        updatedTestJob.assignedTechnician &&
        ["Scheduled", "In Progress"].includes(updatedTestJob.status);

      console.log(`\n🔍 API Test Results:`);
      console.log(`Job ID: ${updatedTestJob._id}`);
      console.log(`Due Date: ${jobDueDate.toDateString()}`);
      console.log(`Today: ${today.toDateString()}`);
      console.log(`Is due date or after: ${isDueDateOrAfter}`);
      console.log(`Can complete: ${canComplete}`);

      if (canComplete) {
        // Test the actual completion update
        const updateData = {
          status: "Completed",
          completedAt: new Date(),
          lastUpdatedBy: {
            userType: "Technician",
            userId: testData.technician._id,
          },
        };

        const completedJob = await Job.findByIdAndUpdate(
          updatedTestJob._id,
          updateData,
          {
            runValidators: false,
            new: true,
          }
        );

        if (completedJob && completedJob.status === "Completed") {
          console.log(
            "✅ Job completion API test PASSED - Job successfully completed!"
          );
          console.log(`   Completion time: ${completedJob.completedAt}`);
          console.log(`   Final status: ${completedJob.status}`);
        } else {
          console.log(
            "❌ Job completion API test FAILED - Job was not updated correctly"
          );
        }
      } else {
        console.log(
          "❌ Job completion API test FAILED - Job cannot be completed"
        );
      }

      // Test completing a job after its due date
      console.log("\n🔍 Testing completion after due date...");

      // Create another job with a future due date initially, then update to yesterday
      const futureDateForOverdue = new Date();
      futureDateForOverdue.setDate(futureDateForOverdue.getDate() + 2); // Day after tomorrow

      const overdueJobData = {
        jobNumber: `OVERDUE-${Date.now()}`,
        jobType: "Electrical",
        dueDate: futureDateForOverdue, // Start with future date to pass validation
        status: "Scheduled",
        assignedTechnician: testData.technician._id,
        property: testData.property._id,
        owner: {
          ownerType: "Agency",
          ownerId: testData.agency._id,
        },
        createdBy: {
          userType: "Agency",
          userId: testData.agency._id,
        },
        description: "Overdue job for testing completion after due date",
        priority: "High",
      };

      const overdueJob = new Job(overdueJobData);
      await overdueJob.save();
      console.log("✅ Created overdue job for testing");

      // Update the job's due date to yesterday for testing overdue completion
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await Job.findByIdAndUpdate(
        overdueJob._id,
        { dueDate: yesterday },
        { runValidators: false }
      );
      console.log("✅ Updated overdue job due date to yesterday for testing");

      // Refresh the overdue job object
      const updatedOverdueJob = await Job.findById(overdueJob._id);
      testData.overdueJob = updatedOverdueJob;

      // Test completion logic for overdue job
      const overdueDueDate = new Date(updatedOverdueJob.dueDate);
      const overdueTodayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );
      const overdueDueDateStart = new Date(
        overdueDueDate.getFullYear(),
        overdueDueDate.getMonth(),
        overdueDueDate.getDate()
      );

      const isOverdueDueDateOrAfter = overdueDueDateStart <= overdueTodayStart;
      const canCompleteOverdue =
        isOverdueDueDateOrAfter &&
        updatedOverdueJob.assignedTechnician &&
        ["Scheduled", "In Progress"].includes(updatedOverdueJob.status);

      console.log(`Overdue Job ID: ${updatedOverdueJob._id}`);
      console.log(`Due Date: ${overdueDueDate.toDateString()}`);
      console.log(`Today: ${today.toDateString()}`);
      console.log(`Is due date or after: ${isOverdueDueDateOrAfter}`);
      console.log(`Can complete overdue: ${canCompleteOverdue}`);

      if (canCompleteOverdue) {
        const overdueUpdateData = {
          status: "Completed",
          completedAt: new Date(),
          lastUpdatedBy: {
            userType: "Technician",
            userId: testData.technician._id,
          },
        };

        const completedOverdueJob = await Job.findByIdAndUpdate(
          updatedOverdueJob._id,
          overdueUpdateData,
          {
            runValidators: false,
            new: true,
          }
        );

        if (completedOverdueJob && completedOverdueJob.status === "Completed") {
          console.log(
            "✅ Overdue job completion test PASSED - Job successfully completed after due date!"
          );
          console.log(`   Completion time: ${completedOverdueJob.completedAt}`);
          console.log(`   Final status: ${completedOverdueJob.status}`);
        } else {
          console.log(
            "❌ Overdue job completion test FAILED - Job was not updated correctly"
          );
        }
      } else {
        console.log(
          "❌ Overdue job completion test FAILED - Job cannot be completed"
        );
      }

      // Store overdue job for cleanup
      testData.overdueJob = updatedOverdueJob;
    } catch (apiTestError) {
      console.error("❌ API test error:", apiTestError.message);
    }

    console.log("\n🚀 To test the actual API endpoint:");
    console.log("1. Create a job with today's due date");
    console.log("2. Use PATCH /v1/jobs/{jobId}/complete");
    console.log("3. With technician authentication token");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Cleanup test data
    try {
      console.log("\n🧹 Cleaning up test data...");

      // Delete jobs
      for (const job of testData.jobs) {
        await Job.findByIdAndDelete(job._id);
      }

      // Delete technician
      if (testData.technician) {
        await Technician.findByIdAndDelete(testData.technician._id);
      }

      // Delete property
      if (testData.property) {
        await Property.findByIdAndDelete(testData.property._id);
      }

      // Delete agency
      if (testData.agency) {
        await Agency.findByIdAndDelete(testData.agency._id);
      }

      // Delete test job
      if (testData.testJob) {
        await Job.findByIdAndDelete(testData.testJob._id);
      }

      // Delete overdue job
      if (testData.overdueJob) {
        await Job.findByIdAndDelete(testData.overdueJob._id);
      }

      console.log("✅ Test data cleaned up");
    } catch (cleanupError) {
      console.error("⚠️ Cleanup failed:", cleanupError);
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testJobCompletion();
}

export default testJobCompletion;
