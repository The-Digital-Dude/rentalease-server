/**
 * Test Booking Notifications
 * This file demonstrates how the booking notification system works
 */

import bookingNotificationService from "../services/bookingNotification.service.js";
import Job from "../models/Job.js";
import Property from "../models/Property.js";
import EmailLog from "../models/EmailLog.js";

// Sample data for testing
const sampleJob = {
  _id: "507f1f77bcf86cd799439011",
  job_id: "J-123456",
  property: "507f1f77bcf86cd799439012",
  jobType: "Smoke",
  dueDate: new Date("2025-01-20T09:00:00.000Z"),
  description: "Smoke alarm inspection for 123 Main St, Sydney NSW 2000",
  priority: "Medium",
  status: "Pending",
  estimatedDuration: 1,
  notes:
    "Tenant booking via email link. Original inspection date: 1/15/2025. Tenant: John Doe (john.doe@email.com)",
  owner: {
    ownerType: "Agency",
    ownerId: "507f1f77bcf86cd799439013",
  },
  createdBy: {
    userType: "Agency",
    userId: "507f1f77bcf86cd799439013",
  },
};

const sampleProperty = {
  _id: "507f1f77bcf86cd799439012",
  address: {
    street: "123 Main St",
    suburb: "Sydney",
    state: "NSW",
    postcode: "2000",
    fullAddress: "123 Main St, Sydney NSW 2000",
  },
  currentTenant: {
    name: "John Doe",
    email: "john.doe@email.com",
    phone: "+61412345678",
  },
  currentLandlord: {
    name: "Jane Smith",
    email: "jane.smith@email.com",
    phone: "+61487654321",
  },
  agency: {
    _id: "507f1f77bcf86cd799439013",
    companyName: "Sydney Property Management",
    contactPerson: "Mike Johnson",
    email: "mike@sydneyproperty.com",
    phone: "+61411111111",
  },
  assignedPropertyManager: {
    _id: "507f1f77bcf86cd799439014",
    firstName: "Sarah",
    lastName: "Wilson",
    email: "sarah.wilson@sydneyproperty.com",
    phone: "+61422222222",
  },
  complianceSchedule: {
    smokeAlarms: {
      nextInspection: new Date("2025-01-20T09:00:00.000Z"),
      required: true,
      status: "Due Soon",
    },
  },
  isActive: true,
};

const sampleEmailLog = {
  tenantName: "John Doe",
  tenantEmail: "john.doe@email.com",
  propertyId: "507f1f77bcf86cd799439012",
  complianceType: "smokeAlarms",
  inspectionDate: new Date("2025-01-15T09:00:00.000Z"),
  verificationToken:
    "1d82626662cd6ac5f58daa044d1310b1e71a91ac45690a7cdedb61e7e2f685cb",
  tokenUsed: false,
  tokenExpiresAt: new Date("2025-02-15T09:00:00.000Z"),
  emailStatus: "sent",
};

/**
 * Test the booking notification system
 */
async function testBookingNotifications() {
  try {
    console.log("🧪 Testing Booking Notification System...");
    console.log("=".repeat(50));

    // Test the notification service
    const results = await bookingNotificationService.sendBookingNotifications(
      sampleJob,
      sampleProperty,
      sampleEmailLog
    );

    console.log("📧 Notification Results:");
    console.log(JSON.stringify(results, null, 2));

    console.log("=".repeat(50));
    console.log("✅ Test completed successfully!");

    return results;
  } catch (error) {
    console.error("❌ Test failed:", error);
    throw error;
  }
}

/**
 * Test individual notification methods
 */
async function testIndividualNotifications() {
  try {
    console.log("🧪 Testing Individual Notification Methods...");
    console.log("=".repeat(50));

    const scheduledDate = new Date(sampleJob.dueDate).toLocaleDateString(
      "en-US",
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    // Test tenant confirmation
    console.log("📧 Testing tenant confirmation...");
    await bookingNotificationService.sendTenantConfirmation(
      sampleJob,
      sampleProperty,
      sampleEmailLog,
      scheduledDate
    );

    // Test agency notification
    console.log("📧 Testing agency notification...");
    await bookingNotificationService.sendAgencyNotification(
      sampleJob,
      sampleProperty,
      sampleEmailLog,
      scheduledDate
    );

    // Test property manager notification
    console.log("📧 Testing property manager notification...");
    await bookingNotificationService.sendPropertyManagerNotification(
      sampleJob,
      sampleProperty,
      sampleEmailLog,
      scheduledDate
    );

    // Test landlord notification
    console.log("📧 Testing landlord notification...");
    await bookingNotificationService.sendLandlordNotification(
      sampleJob,
      sampleProperty,
      sampleEmailLog,
      scheduledDate
    );

    console.log("=".repeat(50));
    console.log("✅ Individual tests completed successfully!");
  } catch (error) {
    console.error("❌ Individual tests failed:", error);
    throw error;
  }
}

// Export test functions
export { testBookingNotifications, testIndividualNotifications };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("🚀 Running Booking Notification Tests...");

  testBookingNotifications()
    .then(() => {
      console.log("🎉 All tests passed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Tests failed:", error);
      process.exit(1);
    });
}
