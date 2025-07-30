import mongoose from "mongoose";
import dotenv from "dotenv";
import Technician from "../models/Technician.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Test technician system
const testTechnicianSystem = async () => {
  try {
    console.log("🧪 Testing Technician System...\n");

    // Get test owner (first agency or super user)
    const agency = await Agency.findOne({});
    const superUser = await SuperUser.findOne({});
    const owner = agency || superUser;

    if (!owner) {
      console.log("❌ No agency or super user found for testing");
      return;
    }

    console.log("📋 Test Owner:");
    console.log(`  Type: ${agency ? "Agency" : "SuperUser"}`);
    console.log(`  Name: ${agency ? agency.companyName : superUser.name}`);

    // Test 1: Create a technician
    console.log("\n📤 Test 1: Creating Technician");
    const technicianData = {
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+61412345678",
      password: "password123",
      tradeType: "Gas",
      licenseNumber: "GAS123456",
      licenseExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      experience: 5,
      hourlyRate: 75,
      address: {
        street: "123 Trade Street",
        suburb: "Sydney",
        state: "NSW",
        postcode: "2000",
      },
      ownerType: agency ? "Agency" : "SuperUser",
      ownerId: owner._id,
    };

    const technician = new Technician(technicianData);
    await technician.save();

    console.log("✅ Technician created successfully:", {
      id: technician._id,
      fullName: technician.fullName,
      email: technician.email,
      tradeType: technician.tradeType,
      status: technician.status,
    });

    // Test 2: Test password comparison
    console.log("\n🔐 Test 2: Testing Password Comparison");
    const isPasswordValid = await technician.comparePassword("password123");
    console.log(`✅ Password comparison result: ${isPasswordValid}`);

    // Test 3: Test availability methods
    console.log("\n📊 Test 3: Testing Availability Methods");
    console.log(`✅ Is active: ${technician.isActive()}`);
    console.log(`✅ Is available for jobs: ${technician.isAvailableForJobs()}`);
    console.log(`✅ Current jobs: ${technician.currentJobs}`);
    console.log(`✅ Max jobs: ${technician.maxJobs}`);

    // Test 4: Test job assignment
    console.log("\n📋 Test 4: Testing Job Assignment");
    const mockJobId = new mongoose.Types.ObjectId();

    try {
      await technician.assignJob(mockJobId);
      console.log("✅ Job assigned successfully");
      console.log(
        `✅ Current jobs after assignment: ${technician.currentJobs}`
      );
      console.log(`✅ Availability status: ${technician.availabilityStatus}`);
    } catch (error) {
      console.log("❌ Job assignment failed:", error.message);
    }

    // Test 5: Test job completion
    console.log("\n✅ Test 5: Testing Job Completion");
    try {
      await technician.completeJob(mockJobId);
      console.log("✅ Job completed successfully");
      console.log(
        `✅ Current jobs after completion: ${technician.currentJobs}`
      );
      console.log(`✅ Completed jobs: ${technician.completedJobs}`);
      console.log(`✅ Availability status: ${technician.availabilityStatus}`);
    } catch (error) {
      console.log("❌ Job completion failed:", error.message);
    }

    // Test 6: Test rating system
    console.log("\n⭐ Test 6: Testing Rating System");
    try {
      await technician.updateRating(4.5);
      console.log(`✅ Rating updated successfully`);
      console.log(`✅ Average rating: ${technician.averageRating}`);
      console.log(`✅ Total ratings: ${technician.totalRatings}`);
    } catch (error) {
      console.log("❌ Rating update failed:", error.message);
    }

    // Test 7: Test job summary
    console.log("\n📈 Test 7: Testing Job Summary");
    const jobSummary = technician.getJobSummary();
    console.log("✅ Job summary:", jobSummary);

    // Test 8: Test active jobs
    console.log("\n📋 Test 8: Testing Active Jobs");
    const activeJobs = technician.getActiveJobs();
    console.log(`✅ Active jobs count: ${activeJobs.length}`);

    // Test 9: Test address formatting
    console.log("\n📍 Test 9: Testing Address Formatting");
    console.log(`✅ Full address: ${technician.address.fullAddress}`);

    // Test 10: Test display name
    console.log("\n👤 Test 10: Testing Display Name");
    console.log(`✅ Display name: ${technician.getDisplayName()}`);

    // Test 11: Test document management
    console.log("\n📄 Test 11: Testing Document Management");
    technician.documents.push({
      type: "License",
      name: "Gas License",
      fileUrl: "https://example.com/license.pdf",
      uploadDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isVerified: true,
    });

    await technician.save();
    console.log(`✅ Document added successfully`);
    console.log(`✅ Total documents: ${technician.documents.length}`);

    // Test 12: Test last login update
    console.log("\n🕒 Test 12: Testing Last Login Update");
    await technician.updateLastLogin();
    console.log(`✅ Last login updated: ${technician.lastLogin}`);
    console.log(`✅ Last active updated: ${technician.lastActive}`);

    // Test 13: Display final technician state
    console.log("\n📊 Test 13: Final Technician State");
    console.log("✅ Technician details:", {
      id: technician._id,
      fullName: technician.fullName,
      email: technician.email,
      tradeType: technician.tradeType,
      status: technician.status,
      availabilityStatus: technician.availabilityStatus,
      currentJobs: technician.currentJobs,
      completedJobs: technician.completedJobs,
      averageRating: technician.averageRating,
      totalRatings: technician.totalRatings,
      documents: technician.documents.length,
      owner: technician.owner,
    });

    console.log("\n🎉 All technician tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing technician system:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testTechnicianSystem();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
    process.exit(0);
  }
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}

export default testTechnicianSystem;
