import mongoose from "mongoose";
import dotenv from "dotenv";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import emailService from "../services/email.service.js";

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

// Test agency creation process
const testAgencyCreation = async () => {
  try {
    console.log("🔍 Testing agency creation process...");

    // Check email configuration
    console.log("\n📧 Email Configuration:");
    console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'Set' : 'Not set'}`);
    console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'Not set'}`);
    console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

    // Check existing agencies
    const existingAgencies = await Agency.find({});
    console.log(`\n📊 Existing Agencies: ${existingAgencies.length}`);
    existingAgencies.forEach(agency => {
      console.log(`  - ${agency.companyName} (${agency.email}) - Status: ${agency.status}`);
    });

    // Check existing super users
    const existingSuperUsers = await SuperUser.find({});
    console.log(`\n👥 Existing SuperUsers: ${existingSuperUsers.length}`);
    existingSuperUsers.forEach(superUser => {
      console.log(`  - ${superUser.fullName || 'No name'} (${superUser.email})`);
    });

    // Test creating a new agency
    console.log("\n🧪 Testing agency creation...");
    
    const testAgencyData = {
      companyName: "Test Agency Creation",
      abn: "12345678901",
      contactPerson: "Test Contact",
      email: "test.agency@example.com",
      phone: "+61412345678",
      region: "Sydney Metro",
      compliance: "Standard Package",
      password: "testPassword123",
      status: "Pending"
    };

    // Check if test agency already exists
    const existingTestAgency = await Agency.findOne({ email: testAgencyData.email });
    if (existingTestAgency) {
      console.log("⚠️ Test agency already exists, using existing one");
      await Agency.findByIdAndDelete(existingTestAgency._id);
      console.log("🗑️ Deleted existing test agency");
    }

    // Create new agency
    const newAgency = new Agency(testAgencyData);
    await newAgency.save();
    console.log(`✅ Created test agency: ${newAgency._id}`);

    // Test sending credentials email
    console.log("\n📧 Testing credentials email...");
    try {
      const emailResult = await emailService.sendAgencyCredentialsEmail(
        {
          email: newAgency.email,
          contactPerson: newAgency.contactPerson,
          companyName: newAgency.companyName,
          abn: newAgency.abn,
          region: newAgency.region,
          compliance: newAgency.compliance,
        },
        testAgencyData.password,
        process.env.FRONTEND_URL || "https://rentalease-crm.com/login"
      );
      
      console.log("✅ Credentials email sent successfully:", emailResult);
    } catch (emailError) {
      console.error("❌ Failed to send credentials email:", emailError.message);
    }

    // Clean up
    await Agency.findByIdAndDelete(newAgency._id);
    console.log("🧹 Cleaned up test agency");

    // Test with a real agency from the database
    if (existingAgencies.length > 0) {
      const realAgency = existingAgencies[0];
      console.log(`\n📧 Testing credentials email for real agency: ${realAgency.companyName}`);
      
      try {
        const emailResult = await emailService.sendAgencyCredentialsEmail(
          {
            email: realAgency.email,
            contactPerson: realAgency.contactPerson,
            companyName: realAgency.companyName,
            abn: realAgency.abn,
            region: realAgency.region,
            compliance: realAgency.compliance,
          },
          "testPassword123", // Using a test password since we don't have the real one
          process.env.FRONTEND_URL || "https://rentalease-crm.com/login"
        );
        
        console.log("✅ Credentials email sent successfully for real agency:", emailResult);
      } catch (emailError) {
        console.error("❌ Failed to send credentials email for real agency:", emailError.message);
      }
    }

  } catch (error) {
    console.error("❌ Error in agency creation test:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testAgencyCreation();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runTest(); 