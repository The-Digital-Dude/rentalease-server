import mongoose from "mongoose";
import dotenv from "dotenv";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import PropertyManager from "../models/PropertyManager.js";
import Technician from "../models/Technician.js";
import notificationService from "../services/notification.service.js";

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

// Test compliance email notification
const testComplianceEmailNotification = async () => {
  try {
    console.log("🔍 Testing compliance email notification...");

    // First, let's check what data we have in the database
    console.log("\n📊 Database Status:");

    const agencies = await Agency.find({});
    console.log(`  Agencies: ${agencies.length}`);
    agencies.forEach((agency) => {
      console.log(
        `    - ${agency.contactPerson} (${agency.email}) - ID: ${agency._id}`
      );
    });

    const superUsers = await SuperUser.find({});
    console.log(`  SuperUsers: ${superUsers.length}`);
    superUsers.forEach((superUser) => {
      console.log(
        `    - ${superUser.fullName} (${superUser.email}) - ID: ${superUser._id}`
      );
    });

    const propertyManagers = await PropertyManager.find({});
    console.log(`  PropertyManagers: ${propertyManagers.length}`);
    propertyManagers.forEach((pm) => {
      console.log(
        `    - ${pm.firstName} ${pm.lastName} (${pm.email}) - ID: ${pm._id}`
      );
    });

    const technicians = await Technician.find({});
    console.log(`  Technicians: ${technicians.length}`);
    technicians.forEach((tech) => {
      console.log(`    - ${tech.fullName} (${tech.email}) - ID: ${tech._id}`);
    });

    const properties = await Property.find({ isActive: true });
    console.log(`  Active Properties: ${properties.length}`);
    properties.forEach((property) => {
      console.log(
        `    - ${property.address.fullAddress} - Agency: ${property.agency}`
      );
    });

    // Find a property with compliance data
    const propertyWithCompliance = properties.find(
      (p) =>
        p.complianceSchedule &&
        (p.complianceSchedule.gasCompliance?.required ||
          p.complianceSchedule.electricalSafety?.required ||
          p.complianceSchedule.smokeAlarms?.required)
    );

    if (!propertyWithCompliance) {
      console.log("❌ No properties with compliance data found");
      return;
    }

    console.log(
      `\n🎯 Testing with property: ${propertyWithCompliance.address.fullAddress}`
    );
    console.log(`   Agency ID: ${propertyWithCompliance.agency}`);

    // Check if the agency exists
    const agency = await Agency.findById(propertyWithCompliance.agency);
    if (!agency) {
      console.log("❌ Property's agency not found in database");
      return;
    }
    console.log(`✅ Agency found: ${agency.contactPerson} (${agency.email})`);

    // Create a test compliance job
    const testJobData = {
      property: propertyWithCompliance._id,
      jobType: "Gas",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: "Pending",
      priority: "High",
      description: "Test compliance job for email notification",
      estimatedDuration: 2,
      owner: {
        ownerType: "Agency",
        ownerId: propertyWithCompliance.agency,
      },
      createdBy: {
        userType: "Agency",
        userId: propertyWithCompliance.agency,
      },
    };

    const testJob = new Job(testJobData);
    await testJob.save();
    console.log(`✅ Created test job: ${testJob._id}`);

    // Test the notification service
    console.log("\n📧 Testing notification service...");
    try {
      const results = await notificationService.sendComplianceJobNotification(
        testJob,
        propertyWithCompliance
      );
      console.log("✅ Notification service completed successfully");
      console.log(`   Results: ${results.length} notifications sent`);

      // Log detailed results
      results.forEach((result, index) => {
        console.log(`   Result ${index + 1}:`, {
          recipient: result.recipient,
          channel: result.channel,
          success: result.success,
          error: result.error,
        });
      });
    } catch (error) {
      console.error("❌ Notification service failed:", error);
    }

    // Clean up test job
    await Job.findByIdAndDelete(testJob._id);
    console.log("🧹 Cleaned up test job");
  } catch (error) {
    console.error("❌ Error in compliance email notification test:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testComplianceEmailNotification();
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

runTest();
