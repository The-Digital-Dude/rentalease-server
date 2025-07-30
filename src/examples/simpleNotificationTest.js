import mongoose from "mongoose";
import dotenv from "dotenv";
import Notification from "../models/Notification.js";
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

// Simple notification test
const simpleNotificationTest = async () => {
  try {
    console.log("🧪 Simple Notification System Test...\n");

    // Get test recipients (first agency and super user)
    const agency = await Agency.findOne({});
    const superUser = await SuperUser.findOne({});

    if (!agency || !superUser) {
      console.log("❌ No agency or super user found for testing");
      return;
    }

    console.log("📋 Test Recipients:");
    console.log(`  Agency: ${agency.companyName} (${agency._id})`);
    console.log(`  SuperUser: ${superUser.name} (${superUser._id})`);

    // Test 1: Create a notification directly
    console.log("\n📤 Test 1: Creating Direct Notification");
    const notification = new Notification({
      recipient: {
        recipientType: "Agency",
        recipientId: agency._id,
      },
      type: "JOB_CREATED",
      title: "Test Job Created",
      message: "A test job has been created for testing purposes",
      data: {
        test: true,
        jobId: "test-job-123",
        timestamp: new Date().toISOString(),
      },
      priority: "Medium",
    });

    await notification.save();
    console.log(
      "✅ Notification created successfully:",
      notification.getSummary()
    );

    // Test 2: Get notifications for agency
    console.log("\n📥 Test 2: Getting Agency Notifications");
    const agencyNotifications = await Notification.find({
      "recipient.recipientType": "Agency",
      "recipient.recipientId": agency._id,
    }).sort({ createdAt: -1 });

    console.log(
      `✅ Found ${agencyNotifications.length} notifications for agency`
    );

    // Test 3: Get unread count
    console.log("\n📊 Test 3: Getting Unread Count");
    const unreadCount = await Notification.countDocuments({
      "recipient.recipientType": "Agency",
      "recipient.recipientId": agency._id,
      status: "Unread",
    });
    console.log(`✅ Agency has ${unreadCount} unread notifications`);

    // Test 4: Mark notification as read
    if (agencyNotifications.length > 0) {
      console.log("\n✅ Test 4: Marking Notification as Read");
      const firstNotification = agencyNotifications[0];
      firstNotification.status = "Read";
      firstNotification.readAt = new Date();
      await firstNotification.save();
      console.log(
        `✅ Marked notification as read: ${firstNotification.status}`
      );
    }

    // Test 5: Create notification for super user
    console.log("\n📤 Test 5: Creating SuperUser Notification");
    const superUserNotification = new Notification({
      recipient: {
        recipientType: "SuperUser",
        recipientId: superUser._id,
      },
      type: "COMPLIANCE_DUE",
      title: "Compliance Gas Due",
      message:
        "A compliance Gas inspection is due for property at 123 Test Street",
      data: {
        test: true,
        jobId: "test-compliance-456",
        propertyAddress: "123 Test Street, Test Suburb, NSW 2000",
        timestamp: new Date().toISOString(),
      },
      priority: "High",
    });

    await superUserNotification.save();
    console.log("✅ SuperUser notification created successfully");

    // Test 6: Get all notifications
    console.log("\n📋 Test 6: Displaying All Notifications");
    const allNotifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(10);

    console.log(`✅ Found ${allNotifications.length} total notifications:`);
    allNotifications.forEach((notification, index) => {
      console.log(
        `  ${index + 1}. ${notification.title} - ${notification.status} - ${
          notification.recipient.recipientType
        }`
      );
    });

    console.log("\n🎉 Simple notification tests completed successfully!");
  } catch (error) {
    console.error("❌ Error in simple notification test:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await simpleNotificationTest();
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

export default simpleNotificationTest;
