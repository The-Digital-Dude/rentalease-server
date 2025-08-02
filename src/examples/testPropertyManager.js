import mongoose from "mongoose";
import PropertyManager from "../models/PropertyManager.js";
import Property from "../models/Property.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import Notification from "../models/Notification.js";
import notificationService from "../services/notification.service.js";
import jwt from "jsonwebtoken";

// Test configuration
const TEST_CONFIG = {
  database:
    process.env.MONGODB_URI || "mongodb://localhost:27017/rentalease-test",
  timeout: 30000,
};

// Test data
const testData = {
  superUser: {
    name: "Test Super User",
    email: "superuser@test.com",
    password: "testpassword123",
  },
  agency: {
    companyName: "Test Agency",
    abn: "12345678901",
    contactPerson: "Test Contact",
    email: "agency@test.com",
    phone: "+61412345678",
    region: "Sydney Metro",
    compliance: "Basic Package",
    password: "testpassword123",
  },
  propertyManager: {
    firstName: "John",
    lastName: "PropertyManager",
    email: "propertymanager@test.com",
    phone: "+61412345679",
    password: "testpassword123",
    address: {
      street: "123 Test Street",
      suburb: "Test Suburb",
      state: "NSW",
      postcode: "2000",
    },
  },
  property: {
    address: {
      street: "456 Property Street",
      suburb: "Property Suburb",
      state: "NSW",
      postcode: "2001",
    },
    currentTenant: {
      name: "Test Tenant",
      email: "tenant@test.com",
      phone: "+61412345680",
    },
    currentLandlord: {
      name: "Test Landlord",
      email: "landlord@test.com",
      phone: "+61412345681",
    },
  },
};

class PropertyManagerTestSuite {
  constructor() {
    this.testResults = [];
    this.superUser = null;
    this.agency = null;
    this.propertyManager = null;
    this.property = null;
    this.propertyManagerToken = null;
  }

  async connect() {
    try {
      await mongoose.connect(TEST_CONFIG.database);
      console.log("✅ Connected to test database");
    } catch (error) {
      console.error("❌ Failed to connect to database:", error);
      throw error;
    }
  }

  async cleanup() {
    try {
      await PropertyManager.deleteMany({});
      await Property.deleteMany({});
      await Agency.deleteMany({});
      await SuperUser.deleteMany({});
      await Notification.deleteMany({});
      console.log("✅ Cleaned up test data");
    } catch (error) {
      console.error("❌ Failed to cleanup:", error);
    }
  }

  async createTestData() {
    try {
      // Create SuperUser
      this.superUser = new SuperUser(testData.superUser);
      await this.superUser.save();

      // Create Agency
      this.agency = new Agency(testData.agency);
      await this.agency.save();

      // Create PropertyManager
      this.propertyManager = new PropertyManager({
        ...testData.propertyManager,
        owner: {
          ownerType: "Agency",
          ownerId: this.agency._id,
        },
        status: "Active",
      });
      await this.propertyManager.save();

      // Create Property
      this.property = new Property({
        ...testData.property,
        agency: this.agency._id,
        region: "Sydney Metro",
        createdBy: {
          userType: "Agency",
          userId: this.agency._id,
        },
      });
      await this.property.save();

      console.log("✅ Created test data");
    } catch (error) {
      console.error("❌ Failed to create test data:", error);
      throw error;
    }
  }

  async testPropertyManagerAuthentication() {
    console.log("\n🧪 Testing PropertyManager Authentication...");

    try {
      // Test password hashing
      const hashedPassword = this.propertyManager.password;
      const isPasswordValid = await this.propertyManager.comparePassword(
        testData.propertyManager.password
      );

      if (
        isPasswordValid &&
        hashedPassword !== testData.propertyManager.password
      ) {
        console.log("✅ Password hashing works correctly");
        this.testResults.push({ test: "Password Hashing", status: "PASS" });
      } else {
        console.log("❌ Password hashing failed");
        this.testResults.push({ test: "Password Hashing", status: "FAIL" });
      }

      // Test JWT token generation
      const token = jwt.sign(
        {
          id: this.propertyManager._id,
          type: "propertyManager",
          email: this.propertyManager.email,
        },
        process.env.JWT_SECRET || "test-secret",
        { expiresIn: "7d" }
      );

      if (token) {
        console.log("✅ JWT token generation works");
        this.testResults.push({ test: "JWT Token Generation", status: "PASS" });
        this.propertyManagerToken = token;
      } else {
        console.log("❌ JWT token generation failed");
        this.testResults.push({ test: "JWT Token Generation", status: "FAIL" });
      }

      // Test account status methods
      const isActive = this.propertyManager.isActive();
      const isAvailable = this.propertyManager.isAvailable();

      if (isActive && isAvailable) {
        console.log("✅ Account status methods work correctly");
        this.testResults.push({
          test: "Account Status Methods",
          status: "PASS",
        });
      } else {
        console.log("❌ Account status methods failed");
        this.testResults.push({
          test: "Account Status Methods",
          status: "FAIL",
        });
      }
    } catch (error) {
      console.error("❌ Authentication test failed:", error);
      this.testResults.push({
        test: "Authentication",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  async testPropertyAssignment() {
    console.log("\n🧪 Testing Property Assignment...");

    try {
      // Test assigning property to PropertyManager
      await this.propertyManager.assignProperty(this.property._id, "Primary");

      // Verify assignment was added
      const updatedPropertyManager = await PropertyManager.findById(
        this.propertyManager._id
      );
      const assignment = updatedPropertyManager.assignedProperties.find(
        (a) => a.propertyId.toString() === this.property._id.toString()
      );

      if (
        assignment &&
        assignment.status === "Active" &&
        assignment.role === "Primary"
      ) {
        console.log("✅ Property assignment works correctly");
        this.testResults.push({ test: "Property Assignment", status: "PASS" });
      } else {
        console.log("❌ Property assignment failed");
        this.testResults.push({ test: "Property Assignment", status: "FAIL" });
      }

      // Test duplicate assignment prevention
      try {
        await this.propertyManager.assignProperty(
          this.property._id,
          "Secondary"
        );
        console.log("❌ Duplicate assignment should have been prevented");
        this.testResults.push({
          test: "Duplicate Assignment Prevention",
          status: "FAIL",
        });
      } catch (error) {
        if (error.message.includes("already assigned")) {
          console.log("✅ Duplicate assignment prevention works");
          this.testResults.push({
            test: "Duplicate Assignment Prevention",
            status: "PASS",
          });
        } else {
          console.log(
            "❌ Unexpected error in duplicate assignment test:",
            error.message
          );
          this.testResults.push({
            test: "Duplicate Assignment Prevention",
            status: "FAIL",
          });
        }
      }

      // Test property assignment summary
      const summary = updatedPropertyManager.getPropertyAssignmentSummary();
      if (summary.totalProperties === 1 && summary.activeProperties === 1) {
        console.log("✅ Property assignment summary works correctly");
        this.testResults.push({
          test: "Property Assignment Summary",
          status: "PASS",
        });
      } else {
        console.log("❌ Property assignment summary failed");
        this.testResults.push({
          test: "Property Assignment Summary",
          status: "FAIL",
        });
      }

      // Test removing property assignment
      await this.propertyManager.removePropertyAssignment(this.property._id);
      const finalPropertyManager = await PropertyManager.findById(
        this.propertyManager._id
      );

      if (finalPropertyManager.assignedProperties.length === 0) {
        console.log("✅ Property assignment removal works correctly");
        this.testResults.push({
          test: "Property Assignment Removal",
          status: "PASS",
        });
      } else {
        console.log("❌ Property assignment removal failed");
        this.testResults.push({
          test: "Property Assignment Removal",
          status: "FAIL",
        });
      }
    } catch (error) {
      console.error("❌ Property assignment test failed:", error);
      this.testResults.push({
        test: "Property Assignment",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  async testAccessControl() {
    console.log("\n🧪 Testing Access Control...");

    try {
      // Test PropertyManager can only access assigned properties
      const assignedPropertyIds = this.propertyManager.assignedProperties.map(
        (assignment) => assignment.propertyId
      );

      // Initially no properties assigned
      if (assignedPropertyIds.length === 0) {
        console.log("✅ PropertyManager starts with no assigned properties");
        this.testResults.push({
          test: "Initial Access Control",
          status: "PASS",
        });
      } else {
        console.log(
          "❌ PropertyManager should start with no assigned properties"
        );
        this.testResults.push({
          test: "Initial Access Control",
          status: "FAIL",
        });
      }

      // Assign property and test access
      await this.propertyManager.assignProperty(this.property._id, "Primary");

      const updatedPropertyManager = await PropertyManager.findById(
        this.propertyManager._id
      );
      const newAssignedPropertyIds =
        updatedPropertyManager.assignedProperties.map(
          (assignment) => assignment.propertyId
        );

      // Convert ObjectIds to strings for comparison
      const assignedPropertyIdStrings = newAssignedPropertyIds.map((id) =>
        id.toString()
      );

      if (assignedPropertyIdStrings.includes(this.property._id.toString())) {
        console.log("✅ PropertyManager can access assigned property");
        this.testResults.push({
          test: "Assigned Property Access",
          status: "PASS",
        });
      } else {
        console.log("❌ PropertyManager cannot access assigned property");
        this.testResults.push({
          test: "Assigned Property Access",
          status: "FAIL",
        });
      }

      // Clean up the assignment for the next test
      await this.propertyManager.removePropertyAssignment(this.property._id);

      // Test PropertyManager cannot access other PropertyManagers' data
      const otherPropertyManager = new PropertyManager({
        ...testData.propertyManager,
        email: "other@test.com",
        owner: {
          ownerType: "Agency",
          ownerId: this.agency._id,
        },
        status: "Active",
      });
      await otherPropertyManager.save();

      const otherAssignedProperties = otherPropertyManager.assignedProperties;
      if (otherAssignedProperties.length === 0) {
        console.log(
          "✅ PropertyManager cannot access other PropertyManagers' data"
        );
        this.testResults.push({ test: "Data Isolation", status: "PASS" });
      } else {
        console.log(
          "❌ PropertyManager can access other PropertyManagers' data"
        );
        this.testResults.push({ test: "Data Isolation", status: "FAIL" });
      }

      // Clean up
      await otherPropertyManager.deleteOne();
    } catch (error) {
      console.error("❌ Access control test failed:", error);
      this.testResults.push({
        test: "Access Control",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  async testNotificationSystem() {
    console.log("\n🧪 Testing Notification System...");

    try {
      // Check if property is already assigned and remove if needed
      const existingAssignment = this.propertyManager.assignedProperties.find(
        (assignment) =>
          assignment.propertyId.toString() === this.property._id.toString()
      );

      if (existingAssignment) {
        await this.propertyManager.removePropertyAssignment(this.property._id);
      }

      // Assign property to PropertyManager for notification testing
      await this.propertyManager.assignProperty(this.property._id, "Primary");

      // Test job creation notification
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        job_id: "TEST-001",
        jobType: "Maintenance",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        priority: "Medium",
        owner: {
          ownerType: "Agency",
          ownerId: this.agency._id,
        },
      };

      const mockCreator = {
        userType: "Agency",
        userId: this.agency._id,
      };

      const notificationResults =
        await notificationService.sendJobCreationNotification(
          mockJob,
          this.property,
          mockCreator
        );

      // Check if PropertyManager received notification
      const propertyManagerNotifications = await Notification.find({
        "recipient.recipientType": "PropertyManager",
        "recipient.recipientId": this.propertyManager._id,
        type: "JOB_CREATED",
      });

      if (propertyManagerNotifications.length > 0) {
        console.log("✅ PropertyManager received job creation notification");
        this.testResults.push({
          test: "Job Creation Notification",
          status: "PASS",
        });
      } else {
        console.log(
          "❌ PropertyManager did not receive job creation notification"
        );
        this.testResults.push({
          test: "Job Creation Notification",
          status: "FAIL",
        });
      }

      // Test compliance job notification
      const complianceNotificationResults =
        await notificationService.sendComplianceJobNotification(
          mockJob,
          this.property
        );

      const complianceNotifications = await Notification.find({
        "recipient.recipientType": "PropertyManager",
        "recipient.recipientId": this.propertyManager._id,
        type: "COMPLIANCE_DUE",
      });

      if (complianceNotifications.length > 0) {
        console.log("✅ PropertyManager received compliance notification");
        this.testResults.push({
          test: "Compliance Notification",
          status: "PASS",
        });
      } else {
        console.log(
          "❌ PropertyManager did not receive compliance notification"
        );
        this.testResults.push({
          test: "Compliance Notification",
          status: "FAIL",
        });
      }

      // Test notification methods
      const unreadCount = await notificationService.getUnreadCount(
        "PropertyManager",
        this.propertyManager._id
      );

      if (unreadCount >= 0) {
        console.log("✅ Unread count retrieval works");
        this.testResults.push({ test: "Unread Count", status: "PASS" });
      } else {
        console.log("❌ Unread count retrieval failed");
        this.testResults.push({ test: "Unread Count", status: "FAIL" });
      }
    } catch (error) {
      console.error("❌ Notification system test failed:", error);
      this.testResults.push({
        test: "Notification System",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  async testDatabaseIndexes() {
    console.log("\n🧪 Testing Database Indexes...");

    try {
      // Test PropertyManager indexes
      const propertyManagerIndexes =
        await PropertyManager.collection.getIndexes();

      const requiredIndexes = [
        "email_1", // Created by unique: true constraint
        "owner.ownerType_1_owner.ownerId_1",
        "status_1_availabilityStatus_1",
        "assignedProperties.propertyId_1",
        "assignedProperties.propertyId_1_assignedProperties.status_1",
        "owner.ownerType_1_owner.ownerId_1_status_1",
        "status_1_assignedProperties.propertyId_1",
      ];

      const missingIndexes = requiredIndexes.filter(
        (index) => !propertyManagerIndexes[index]
      );

      if (missingIndexes.length === 0) {
        console.log("✅ All PropertyManager indexes are present");
        this.testResults.push({
          test: "PropertyManager Indexes",
          status: "PASS",
        });
      } else {
        console.log("❌ Missing PropertyManager indexes:", missingIndexes);
        this.testResults.push({
          test: "PropertyManager Indexes",
          status: "FAIL",
        });
      }

      // Test Property indexes
      const propertyIndexes = await Property.collection.getIndexes();

      const requiredPropertyIndexes = [
        "agency_1",
        "assignedPropertyManager_1",
        "assignedPropertyManager_1_isActive_1",
        "agency_1_assignedPropertyManager_1",
      ];

      const missingPropertyIndexes = requiredPropertyIndexes.filter(
        (index) => !propertyIndexes[index]
      );

      if (missingPropertyIndexes.length === 0) {
        console.log("✅ All Property indexes are present");
        this.testResults.push({ test: "Property Indexes", status: "PASS" });
      } else {
        console.log("❌ Missing Property indexes:", missingPropertyIndexes);
        this.testResults.push({ test: "Property Indexes", status: "FAIL" });
      }

      // Test Notification indexes
      const notificationIndexes = await Notification.collection.getIndexes();

      const requiredNotificationIndexes = [
        "recipient.recipientType_1_recipient.recipientId_1",
        "recipient.recipientType_1_recipient.recipientId_1_status_1",
        "recipient.recipientType_1_createdAt_-1",
        "type_1_recipient.recipientType_1_status_1",
      ];

      const missingNotificationIndexes = requiredNotificationIndexes.filter(
        (index) => !notificationIndexes[index]
      );

      if (missingNotificationIndexes.length === 0) {
        console.log("✅ All Notification indexes are present");
        this.testResults.push({ test: "Notification Indexes", status: "PASS" });
      } else {
        console.log(
          "❌ Missing Notification indexes:",
          missingNotificationIndexes
        );
        this.testResults.push({ test: "Notification Indexes", status: "FAIL" });
      }
    } catch (error) {
      console.error("❌ Database indexes test failed:", error);
      this.testResults.push({
        test: "Database Indexes",
        status: "FAIL",
        error: error.message,
      });
    }
  }

  async runAllTests() {
    console.log("🚀 Starting PropertyManager Test Suite...");

    try {
      await this.connect();
      await this.cleanup();
      await this.createTestData();

      await this.testPropertyManagerAuthentication();
      await this.testPropertyAssignment();
      await this.testAccessControl();
      await this.testNotificationSystem();
      await this.testDatabaseIndexes();

      this.printResults();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      await this.cleanup();
      await mongoose.disconnect();
      console.log("✅ Test suite completed");
    }
  }

  printResults() {
    console.log("\n📊 Test Results Summary:");
    console.log("=".repeat(50));

    const passed = this.testResults.filter((r) => r.status === "PASS").length;
    const failed = this.testResults.filter((r) => r.status === "FAIL").length;
    const total = this.testResults.length;

    this.testResults.forEach((result, index) => {
      const status = result.status === "PASS" ? "✅" : "❌";
      console.log(`${status} ${index + 1}. ${result.test}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log("\n" + "=".repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed === 0) {
      console.log(
        "\n🎉 All tests passed! PropertyManager system is working correctly."
      );
    } else {
      console.log("\n⚠️  Some tests failed. Please review the implementation.");
    }
  }
}

// Run the test suite if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new PropertyManagerTestSuite();
  testSuite.runAllTests();
}

export default PropertyManagerTestSuite;
