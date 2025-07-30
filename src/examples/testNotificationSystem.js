import mongoose from "mongoose";
import dotenv from "dotenv";
import notificationService from "../services/notification.service.js";
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

// Test notification system
const testNotificationSystem = async () => {
  try {
    console.log("🧪 Testing Notification System...\n");

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

    // Test 1: Send job creation notification
    console.log("\n📤 Test 1: Sending Job Creation Notification");
    const jobData = {
      _id: "test-job-id",
      job_id: "J-123456",
      jobType: "Gas",
      dueDate: new Date(),
      priority: "High",
    };

    const propertyData = {
      _id: "test-property-id",
      address: {
        fullAddress: "123 Test Street, Test Suburb, NSW 2000",
      },
    };

    const creatorData = {
      userType: "Agency",
      userId: agency._id,
    };

    const jobCreationResults =
      await notificationService.sendJobCreationNotification(
        jobData,
        propertyData,
        creatorData
      );

    console.log(
      "✅ Job creation notifications sent:",
      jobCreationResults.length
    );

    // Test 2: Send compliance job notification
    console.log("\n📤 Test 2: Sending Compliance Job Notification");
    const complianceResults =
      await notificationService.sendComplianceJobNotification(
        jobData,
        propertyData
      );

    console.log(
      "✅ Compliance job notifications sent:",
      complianceResults.length
    );

    // Test 3: Get notifications for agency
    console.log("\n📥 Test 3: Getting Agency Notifications");
    const agencyNotifications = await notificationService.getNotifications(
      "Agency",
      agency._id,
      { limit: 10 }
    );

    console.log(
      `✅ Found ${agencyNotifications.length} notifications for agency`
    );

    // Test 4: Get unread count for agency
    console.log("\n📊 Test 4: Getting Unread Count");
    const unreadCount = await notificationService.getUnreadCount(
      "Agency",
      agency._id
    );
    console.log(`✅ Agency has ${unreadCount} unread notifications`);

    // Test 5: Mark a notification as read
    if (agencyNotifications.length > 0) {
      console.log("\n✅ Test 5: Marking Notification as Read");
      const firstNotification = agencyNotifications[0];
      const markedNotification = await notificationService.markAsRead(
        firstNotification.id
      );
      console.log(
        `✅ Marked notification as read: ${markedNotification.status}`
      );
    }

    // Test 6: Get notifications for super user
    console.log("\n📥 Test 6: Getting SuperUser Notifications");
    const superUserNotifications = await notificationService.getNotifications(
      "SuperUser",
      superUser._id,
      { limit: 10 }
    );

    console.log(
      `✅ Found ${superUserNotifications.length} notifications for super user`
    );

    // Test 7: Send custom notification
    console.log("\n📤 Test 7: Sending Custom Notification");
    const customNotificationData = {
      type: "GENERAL",
      title: "Test Notification",
      message: "This is a test notification from the notification system",
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
      priority: "Medium",
    };

    const customResults = await notificationService.sendNotification(
      [
        {
          recipientType: "Agency",
          recipientId: agency._id,
        },
        {
          recipientType: "SuperUser",
          recipientId: superUser._id,
        },
      ],
      customNotificationData
    );

    console.log("✅ Custom notifications sent:", customResults.length);

    // Test 8: Display all notifications
    console.log("\n📋 Test 8: Displaying All Notifications");
    const allNotifications = await Notification.find({})
      .sort({ createdAt: -1 })
      .limit(5);

    console.log(`✅ Found ${allNotifications.length} total notifications:`);
    allNotifications.forEach((notification, index) => {
      console.log(
        `  ${index + 1}. ${notification.title} - ${notification.status}`
      );
    });

    console.log("\n🎉 All notification tests completed successfully!");
  } catch (error) {
    console.error("❌ Error testing notification system:", error);
  }
};

// Run the test
const runTest = async () => {
  try {
    await connectDB();
    await testNotificationSystem();
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

export default testNotificationSystem;
