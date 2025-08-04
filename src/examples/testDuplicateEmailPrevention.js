import mongoose from "mongoose";
import ComplianceCronJob from "../services/complianceCronJob.js";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import EmailLog from "../models/EmailLog.js";

// Test the duplicate email prevention logic with 5-day window
async function testDuplicateEmailPrevention() {
  try {
    console.log("🧪 Testing duplicate email prevention with 5-day window...");

    const complianceCronJob = new ComplianceCronJob();

    // Mock property data
    const mockProperty = {
      _id: new mongoose.Types.ObjectId(),
      address: { fullAddress: "123 Test Street, Sydney NSW 2000" },
      currentTenant: {
        email: "tenant@test.com",
        name: "Test Tenant",
      },
      complianceSchedule: {
        smokeAlarms: {
          nextInspection: new Date("2024-07-20"),
        },
      },
    };

    const originalDate = new Date("2024-07-20");
    const complianceType = "smokeAlarms";

    console.log("\n📧 Test 1: No existing job or email");
    let hasBeenSent = await complianceCronJob.hasEmailBeenSent(
      mockProperty._id,
      complianceType,
      originalDate
    );
    console.log("Should send email:", !hasBeenSent);

    console.log("\n📧 Test 2: After sending email for original date (July 20)");
    // Create a mock email log for the original date
    const mockEmailLog = new EmailLog({
      propertyId: mockProperty._id,
      propertyAddress: mockProperty.address.fullAddress,
      tenantEmail: mockProperty.currentTenant.email,
      tenantName: mockProperty.currentTenant.name,
      complianceType: complianceType,
      jobType: "Smoke Alarm Inspection",
      inspectionDate: originalDate,
      emailStatus: "sent",
      trackingKey: complianceCronJob.generateEmailKey(
        mockProperty._id,
        complianceType,
        originalDate
      ),
      verificationToken: "test-token",
      tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await mockEmailLog.save();

    console.log(
      "\n📧 Test 3: Check if email would be sent for date 3 days later (July 23)"
    );
    const date3DaysLater = new Date("2024-07-23");
    hasBeenSent = await complianceCronJob.hasEmailBeenSent(
      mockProperty._id,
      complianceType,
      date3DaysLater
    );
    console.log("Should send email for July 23:", !hasBeenSent);
    console.log("Expected: false (within 5-day window)");

    console.log(
      "\n📧 Test 4: Check if email would be sent for date 6 days later (July 26)"
    );
    const date6DaysLater = new Date("2024-07-26");
    hasBeenSent = await complianceCronJob.hasEmailBeenSent(
      mockProperty._id,
      complianceType,
      date6DaysLater
    );
    console.log("Should send email for July 26:", !hasBeenSent);
    console.log("Expected: true (outside 5-day window)");

    console.log(
      "\n📧 Test 5: Check if email would be sent for date 3 days earlier (July 17)"
    );
    const date3DaysEarlier = new Date("2024-07-17");
    hasBeenSent = await complianceCronJob.hasEmailBeenSent(
      mockProperty._id,
      complianceType,
      date3DaysEarlier
    );
    console.log("Should send email for July 17:", !hasBeenSent);
    console.log("Expected: false (within 5-day window)");

    console.log(
      "\n📧 Test 6: Check if email would be sent for date 6 days earlier (July 14)"
    );
    const date6DaysEarlier = new Date("2024-07-14");
    hasBeenSent = await complianceCronJob.hasEmailBeenSent(
      mockProperty._id,
      complianceType,
      date6DaysEarlier
    );
    console.log("Should send email for July 14:", !hasBeenSent);
    console.log("Expected: true (outside 5-day window)");

    // Cleanup
    await EmailLog.findByIdAndDelete(mockEmailLog._id);

    console.log("\n✅ 5-day window test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testDuplicateEmailPrevention();
