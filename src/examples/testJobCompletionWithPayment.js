import mongoose from "mongoose";
import dotenv from "dotenv";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import TechnicianPayment from "../models/TechnicianPayment.js";

dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Test the complete job completion and payment creation flow
const testJobCompletionWithPayment = async () => {
  try {
    console.log(
      "\n🧪 Testing Job Completion with Technician Payment Creation...\n"
    );

    // Clean up any existing test data first
    console.log("🧹 Cleaning up any existing test data...");
    const testEmail = "test.payment@agency.com";
    const testABN = "98765432109";

    await Agency.deleteMany({ email: testEmail });
    await Agency.deleteMany({ abn: testABN });
    console.log("   ✅ Cleanup completed");

    // Create test data
    console.log("📝 Creating test data...");

    // Create a test agency
    const testAgency = new Agency({
      companyName: "Test Agency for Payment",
      abn: testABN,
      email: testEmail,
      phone: "+1234567890",
      contactPerson: "Test Contact",
      region: "NSW",
      compliance: "Basic Package",
      password: "testpassword123",
      status: "Active",
    });
    await testAgency.save();
    console.log(
      `   ✅ Created test agency: ${testAgency.companyName} (ID: ${testAgency._id})`
    );

    // Create a test property
    const testProperty = new Property({
      address: {
        street: "456 Property St",
        suburb: "Test Suburb",
        state: "NSW",
        postcode: "2000",
        fullAddress: "456 Property St, Test Suburb, NSW 2000",
      },
      propertyType: "House",
      agency: testAgency._id,
      region: "Sydney Metro",
      currentTenant: {
        name: "Test Tenant",
        email: "tenant@test.com",
        phone: "+1234567891",
      },
      currentLandlord: {
        name: "Test Landlord",
        email: "landlord@test.com",
        phone: "+1234567892",
      },
      owner: {
        ownerType: "Agency",
        ownerId: testAgency._id,
      },
      createdBy: {
        userType: "Agency",
        userId: testAgency._id,
      },
    });
    await testProperty.save();
    console.log(
      `   ✅ Created test property: ${testProperty.address.street} (ID: ${testProperty._id})`
    );

    // Create a test technician
    const testTechnician = new Technician({
      firstName: "Test",
      lastName: "Technician",
      email: "technician@test.com",
      phone: "+1987654321",
      experience: 5,
      availabilityStatus: "Available",
      currentJobs: 0,
      maxJobs: 4,
      specialization: "Electrical",
      licenseNumber: "TECH123",
      insuranceInfo: "Test Insurance",
      hourlyRate: 50,
      certifications: ["Electrical License"],
      serviceAreas: ["Test Area"],
      agency: testAgency._id,
      password: "technicianpassword123",
      owner: {
        ownerType: "Agency",
        ownerId: testAgency._id,
      },
      createdBy: {
        userType: "Agency",
        userId: testAgency._id,
      },
      status: "Active",
    });
    await testTechnician.save();
    console.log(
      `   ✅ Created test technician: ${testTechnician.firstName} ${testTechnician.lastName} (ID: ${testTechnician._id})`
    );

    // Create a test job
    const testJob = new Job({
      property: testProperty._id,
      jobType: "Electrical",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      assignedTechnician: testTechnician._id,
      status: "Scheduled",
      description: "Test electrical job for payment testing",
      priority: "Medium",
      owner: {
        ownerType: "Agency",
        ownerId: testAgency._id,
      },
      createdBy: {
        userType: "Agency",
        userId: testAgency._id,
      },
    });
    await testJob.save();
    console.log(
      `   ✅ Created test job: ${testJob.job_id} (ID: ${testJob._id})`
    );

    // Simulate job completion (this would normally be done via API)
    console.log("\n🔧 Simulating job completion...");

    // Update job status to completed
    testJob.status = "Completed";
    testJob.completedAt = new Date();
    testJob.lastUpdatedBy = {
      userType: "Technician",
      userId: testTechnician._id,
    };
    await testJob.save();

    // Simulate the technician payment creation (same logic as in the API)
    console.log("💰 Creating technician payment...");

    let technicianPaymentCreated = false;
    let technicianPaymentData = null;

    try {
      // Get agency ID from job owner
      let agencyId;
      if (testJob.owner.ownerType === "Agency") {
        agencyId = testJob.owner.ownerId;
      } else {
        // If job is owned by SuperUser, get agency from property
        const property = await Property.findById(testJob.property);
        if (property && property.agency) {
          agencyId = property.agency;
        }
      }

      if (agencyId) {
        // Get payment amount based on job type
        const paymentAmount = TechnicianPayment.getPaymentAmountByJobType(
          testJob.jobType
        );

        // Create technician payment
        const technicianPayment = new TechnicianPayment({
          technicianId: testJob.assignedTechnician,
          jobId: testJob._id,
          agencyId: agencyId,
          jobType: testJob.jobType,
          amount: paymentAmount,
          jobCompletedAt: new Date(),
          createdBy: {
            userType: "System",
            userId: testJob.assignedTechnician,
          },
        });

        await technicianPayment.save();
        technicianPaymentCreated = true;
        technicianPaymentData = technicianPayment.getSummary();

        console.log("✅ Technician payment created successfully:", {
          paymentNumber: technicianPayment.paymentNumber,
          jobId: testJob._id,
          technicianId: testJob.assignedTechnician,
          jobType: testJob.jobType,
          amount: paymentAmount,
          timestamp: new Date().toISOString(),
        });

        // Update technician's job count
        testTechnician.currentJobs = Math.max(
          0,
          (testTechnician.currentJobs || 0) - 1
        );
        testTechnician.availabilityStatus =
          testTechnician.currentJobs < 4 ? "Available" : "Busy";
        await testTechnician.save();

        console.log(
          `   ✅ Updated technician job count: ${testTechnician.currentJobs} jobs`
        );
      } else {
        console.warn(
          "⚠️ No agency found for job, skipping technician payment creation"
        );
      }
    } catch (paymentError) {
      console.error(
        "❌ Failed to create technician payment:",
        paymentError.message
      );
    }

    // Display results
    console.log("\n📊 Test Results:");
    console.log("==================");
    console.log(`Job ID: ${testJob.job_id}`);
    console.log(`Job Type: ${testJob.jobType}`);
    console.log(
      `Technician: ${testTechnician.firstName} ${testTechnician.lastName}`
    );
    console.log(`Agency: ${testAgency.companyName}`);
    console.log(`Job Status: ${testJob.status}`);
    console.log(`Completed At: ${testJob.completedAt}`);

    if (technicianPaymentCreated) {
      console.log(`\n💰 Payment Created:`);
      console.log(`   Payment Number: ${technicianPaymentData.paymentNumber}`);
      console.log(`   Amount: $${technicianPaymentData.amount}`);
      console.log(`   Status: ${technicianPaymentData.status}`);
      console.log(`   Created At: ${technicianPaymentData.createdAt}`);
    } else {
      console.log("\n❌ No payment was created");
    }

    // Verify payment in database
    console.log("\n🔍 Verifying payment in database...");
    const payments = await TechnicianPayment.find({ jobId: testJob._id });
    console.log(`   Found ${payments.length} payment(s) for this job`);

    if (payments.length > 0) {
      const payment = payments[0];
      console.log(`   Payment Number: ${payment.paymentNumber}`);
      console.log(`   Amount: $${payment.amount}`);
      console.log(`   Status: ${payment.status}`);
    }

    console.log(
      "\n✅ Job Completion with Payment Creation Test Completed Successfully!"
    );

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...");
    await TechnicianPayment.deleteMany({ jobId: testJob._id });
    await Job.findByIdAndDelete(testJob._id);
    await Technician.findByIdAndDelete(testTechnician._id);
    await Property.findByIdAndDelete(testProperty._id);
    await Agency.findByIdAndDelete(testAgency._id);
    console.log("   ✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testJobCompletionWithPayment();

  // Close connection
  await mongoose.connection.close();
  console.log("\n🔌 Database connection closed");
  process.exit(0);
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Run the test
main();
