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

// Simulate the job completion API call
const simulateJobCompletionAPI = async () => {
  try {
    console.log(
      "\n🧪 Testing Job Completion API with Technician Payment Creation...\n"
    );

    // Clean up any existing test data first
    console.log("🧹 Cleaning up any existing test data...");
    const testEmail = "test.api@agency.com";
    const testABN = "11111111111";
    const testTechnicianEmail = "api.technician@test.com";

    await Agency.deleteMany({ email: testEmail });
    await Agency.deleteMany({ abn: testABN });
    await Technician.deleteMany({ email: testTechnicianEmail });
    console.log("   ✅ Cleanup completed");

    // Create test data
    console.log("📝 Creating test data...");

    // Create a test agency
    const testAgency = new Agency({
      companyName: "Test API Agency",
      abn: testABN,
      email: testEmail,
      phone: "+1234567890",
      contactPerson: "Test API Contact",
      region: "NSW",
      compliance: "Basic Package",
      password: "testpassword123",
      status: "Active",
    });
    await testAgency.save();
    console.log(`   ✅ Created test agency: ${testAgency.companyName}`);

    // Create a test property
    const testProperty = new Property({
      address: {
        street: "789 API Property St",
        suburb: "API Suburb",
        state: "NSW",
        postcode: "2000",
        fullAddress: "789 API Property St, API Suburb, NSW 2000",
      },
      propertyType: "House",
      agency: testAgency._id,
      region: "Sydney Metro",
      currentTenant: {
        name: "API Tenant",
        email: "api.tenant@test.com",
        phone: "+1234567891",
      },
      currentLandlord: {
        name: "API Landlord",
        email: "api.landlord@test.com",
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
    console.log(`   ✅ Created test property: ${testProperty.address.street}`);

    // Create a test technician
    const testTechnician = new Technician({
      firstName: "API",
      lastName: "Technician",
      email: "api.technician@test.com",
      phone: "+1987654321",
      experience: 5,
      availabilityStatus: "Available",
      currentJobs: 1, // Start with 1 job assigned
      maxJobs: 4,
      specialization: "Gas",
      licenseNumber: "API123",
      insuranceInfo: "API Insurance",
      hourlyRate: 50,
      certifications: ["Gas License"],
      serviceAreas: ["API Area"],
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
      `   ✅ Created test technician: ${testTechnician.firstName} ${testTechnician.lastName}`
    );

    // Create a test job (Scheduled status)
    const testJob = new Job({
      property: testProperty._id,
      jobType: "Gas",
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due tomorrow
      assignedTechnician: testTechnician._id,
      status: "Scheduled",
      description: "Test gas job for API testing",
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
      `   ✅ Created test job: ${testJob.job_id} (Status: ${testJob.status})`
    );

    // Simulate the API call to complete the job
    console.log("\n🔧 Simulating API call: PATCH /api/v1/jobs/:id/complete");
    console.log(
      "   This would normally be called by a technician to complete their job"
    );

    // Simulate the job completion logic (same as in the API)
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update job status to "Completed"
      const updateData = {
        status: "Completed",
        completedAt: new Date(),
        lastUpdatedBy: {
          userType: "Technician",
          userId: testTechnician._id,
        },
      };

      const updatedJob = await Job.findByIdAndUpdate(testJob._id, updateData, {
        session,
        runValidators: false,
        new: true,
      });

      // Update technician's job count
      const technician = await Technician.findById(testTechnician._id).session(
        session
      );
      if (technician) {
        technician.currentJobs = Math.max(0, (technician.currentJobs || 0) - 1);
        technician.availabilityStatus =
          technician.currentJobs < 4 ? "Available" : "Busy";
        await technician.save({ session });
      }

      // Create technician payment for completed job
      let technicianPaymentCreated = false;
      let technicianPaymentData = null;

      try {
        // Get agency ID from job owner
        let agencyId;
        if (updatedJob.owner.ownerType === "Agency") {
          agencyId = updatedJob.owner.ownerId;
        } else {
          // If job is owned by SuperUser, get agency from property
          const property = await Property.findById(updatedJob.property).session(
            session
          );
          if (property && property.agency) {
            agencyId = property.agency;
          }
        }

        if (agencyId) {
          // Get payment amount based on job type
          const paymentAmount = TechnicianPayment.getPaymentAmountByJobType(
            updatedJob.jobType
          );

          // Create technician payment
          const technicianPayment = new TechnicianPayment({
            technicianId: updatedJob.assignedTechnician,
            jobId: updatedJob._id,
            agencyId: agencyId,
            jobType: updatedJob.jobType,
            amount: paymentAmount,
            jobCompletedAt: new Date(),
            createdBy: {
              userType: "System",
              userId: updatedJob.assignedTechnician,
            },
          });

          await technicianPayment.save({ session });
          technicianPaymentCreated = true;
          technicianPaymentData = technicianPayment.getSummary();

          console.log("✅ Technician payment created successfully:", {
            paymentNumber: technicianPayment.paymentNumber,
            jobId: updatedJob._id,
            technicianId: updatedJob.assignedTechnician,
            jobType: updatedJob.jobType,
            amount: paymentAmount,
            timestamp: new Date().toISOString(),
          });
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

      // Commit the transaction
      await session.commitTransaction();

      // Simulate API response
      console.log("\n📡 API Response Simulation:");
      console.log("=============================");
      console.log("Status: 200 OK");
      console.log("Content-Type: application/json");
      console.log("");
      console.log("Response Body:");

      const apiResponse = {
        status: "success",
        message: "Job completed successfully",
        data: {
          job: {
            id: updatedJob._id,
            job_id: updatedJob.job_id,
            status: updatedJob.status,
            completedAt: updatedJob.completedAt,
            jobType: updatedJob.jobType,
          },
          technician: technician
            ? {
                id: technician._id,
                fullName: `${technician.firstName} ${technician.lastName}`,
                currentJobs: technician.currentJobs,
                availabilityStatus: technician.availabilityStatus,
              }
            : null,
          completionDetails: {
            completedAt: updatedJob.completedAt,
            completedBy: {
              name: `${testTechnician.firstName} ${testTechnician.lastName}`,
              type: "Technician",
            },
            dueDate: updatedJob.dueDate,
          },
          technicianPayment: technicianPaymentCreated
            ? {
                created: true,
                payment: technicianPaymentData,
                message: `Technician payment of $${technicianPaymentData.amount} created for ${updatedJob.jobType} job`,
              }
            : {
                created: false,
                message:
                  "No technician payment created (no agency associated with job)",
              },
        },
      };

      console.log(JSON.stringify(apiResponse, null, 2));

      // Verify the results
      console.log("\n🔍 Verification:");
      console.log("=================");

      // Check job status
      const finalJob = await Job.findById(testJob._id);
      console.log(`Job Status: ${finalJob.status}`);
      console.log(`Completed At: ${finalJob.completedAt}`);

      // Check technician status
      const finalTechnician = await Technician.findById(testTechnician._id);
      console.log(`Technician Current Jobs: ${finalTechnician.currentJobs}`);
      console.log(
        `Technician Availability: ${finalTechnician.availabilityStatus}`
      );

      // Check payment creation
      const payments = await TechnicianPayment.find({ jobId: testJob._id });
      console.log(`Payments Created: ${payments.length}`);

      if (payments.length > 0) {
        const payment = payments[0];
        console.log(`Payment Number: ${payment.paymentNumber}`);
        console.log(`Payment Amount: $${payment.amount}`);
        console.log(`Payment Status: ${payment.status}`);
      }

      console.log("\n✅ API Test Completed Successfully!");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Cleanup test data
    console.log("\n🧹 Cleaning up test data...");
    await TechnicianPayment.deleteMany({ jobId: testJob._id });
    await Job.findByIdAndDelete(testJob._id);
    await Technician.findByIdAndDelete(testTechnician._id);
    await Property.findByIdAndDelete(testProperty._id);
    await Agency.findByIdAndDelete(testAgency._id);
    console.log("   ✅ Test data cleaned up");
  } catch (error) {
    console.error("❌ API test failed:", error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await simulateJobCompletionAPI();

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
