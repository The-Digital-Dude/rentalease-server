import mongoose from "mongoose";
import dotenv from "dotenv";
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

// Test technician payment functionality
const testTechnicianPayment = async () => {
  try {
    console.log("\n🧪 Testing Technician Payment System...\n");

    // Test 1: Check payment amounts for different job types
    console.log("📋 Payment Rates by Job Type:");
    const jobTypes = [
      "Gas",
      "Electrical",
      "Smoke",
      "Repairs",
      "Pool Safety",
      "Routine Inspection",
    ];

    jobTypes.forEach((jobType) => {
      const amount = TechnicianPayment.getPaymentAmountByJobType(jobType);
      console.log(`   ${jobType}: $${amount}`);
    });

    // Test 2: Create a sample technician payment
    console.log("\n💰 Creating Sample Technician Payment...");

    const samplePayment = new TechnicianPayment({
      technicianId: new mongoose.Types.ObjectId(), // Sample technician ID
      jobId: new mongoose.Types.ObjectId(), // Sample job ID
      agencyId: new mongoose.Types.ObjectId(), // Sample agency ID
      jobType: "Electrical",
      amount: TechnicianPayment.getPaymentAmountByJobType("Electrical"),
      jobCompletedAt: new Date(),
      createdBy: {
        userType: "System",
        userId: new mongoose.Types.ObjectId(),
      },
    });

    console.log("Sample Payment Details:");
    console.log(`   Payment Number: ${samplePayment.paymentNumber}`);
    console.log(`   Job Type: ${samplePayment.jobType}`);
    console.log(`   Amount: $${samplePayment.amount}`);
    console.log(`   Status: ${samplePayment.status}`);
    console.log(`   Created At: ${samplePayment.createdAt}`);

    // Test 3: Test payment summary method
    console.log("\n📊 Payment Summary:");
    const summary = samplePayment.getSummary();
    console.log(JSON.stringify(summary, null, 2));

    // Test 4: Test full details method
    console.log("\n📋 Payment Full Details:");
    const fullDetails = samplePayment.getFullDetails();
    console.log(JSON.stringify(fullDetails, null, 2));

    console.log("\n✅ Technician Payment System Test Completed Successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await testTechnicianPayment();

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
