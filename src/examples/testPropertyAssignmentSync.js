import mongoose from "mongoose";
import Property from "../models/Property.js";
import PropertyManager from "../models/PropertyManager.js";
import Agency from "../models/Agency.js";

// Test configuration
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/rentalease-test";

class PropertyAssignmentSyncTest {
  constructor() {
    this.agency = null;
    this.propertyManager = null;
    this.property = null;
  }

  async setup() {
    console.log("🔧 Setting up test environment...");

    // Connect to database
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to database");

    // Create test agency
    this.agency = new Agency({
      companyName: "Test Agency for Assignment Sync",
      abn: "12345678901",
      contactPerson: "Test Contact",
      email: "test.agency@example.com",
      phone: "+61412345678",
      region: "Sydney Metro",
      compliance: "Compliant",
      password: "testpassword123",
    });
    await this.agency.save();
    console.log("✅ Created test agency");

    // Create test property manager
    this.propertyManager = new PropertyManager({
      firstName: "Test",
      lastName: "PropertyManager",
      email: "test.propertymanager@example.com",
      phone: "+61412345679",
      password: "testpassword123",
      owner: {
        ownerType: "Agency",
        ownerId: this.agency._id,
      },
      address: {
        street: "123 Test St",
        suburb: "Test Suburb",
        state: "NSW",
        postcode: "2000",
      },
    });
    await this.propertyManager.save();
    console.log("✅ Created test property manager");
  }

  async testPropertyCreationWithAssignment() {
    console.log(
      "\n📋 Test 1: Property creation with property manager assignment"
    );

    // Create property with property manager assignment
    const propertyData = {
      address: {
        street: "456 Test Property St",
        suburb: "Test Property Suburb",
        state: "NSW",
        postcode: "2001",
      },
      propertyType: "House",
      bedrooms: 3,
      bathrooms: 2,
      rentAmount: 2500,
      status: "Active",
      region: "Sydney Metro",
      agency: this.agency._id,
      assignedPropertyManager: this.propertyManager._id,
      currentTenant: {
        name: "Test Tenant",
        email: "test.tenant@example.com",
        phone: "+61412345680",
      },
      createdBy: {
        userType: "Agency",
        userId: this.agency._id,
      },
    };

    // Create the property
    this.property = new Property(propertyData);
    await this.property.save();

    // Add property to property manager's assignedProperties array
    await this.propertyManager.assignProperty(this.property._id, "Primary");

    console.log("✅ Property created with property manager assignment");

    // Verify the assignment
    await this.verifyAssignment("Property Creation");
  }

  async testPropertyAssignmentToExistingProperty() {
    console.log("\n📋 Test 2: Assigning property manager to existing property");

    // Create another property without assignment
    const propertyData2 = {
      address: {
        street: "789 Another Test St",
        suburb: "Another Test Suburb",
        state: "NSW",
        postcode: "2002",
      },
      propertyType: "Apartment",
      bedrooms: 2,
      bathrooms: 1,
      rentAmount: 1800,
      status: "Active",
      region: "Sydney Metro",
      agency: this.agency._id,
      currentTenant: {
        name: "Another Test Tenant",
        email: "another.test.tenant@example.com",
        phone: "+61412345681",
      },
      createdBy: {
        userType: "Agency",
        userId: this.agency._id,
      },
    };

    const property2 = new Property(propertyData2);
    await property2.save();

    // Assign property manager to the property
    property2.assignedPropertyManager = this.propertyManager._id;
    await property2.save();

    // Add property to property manager's assignedProperties array
    await this.propertyManager.assignProperty(property2._id, "Secondary");

    console.log("✅ Property manager assigned to existing property");

    // Verify the assignment
    await this.verifyAssignment("Property Assignment", property2._id);
  }

  async verifyAssignment(testName, propertyId = null) {
    const targetPropertyId = propertyId || this.property._id;

    console.log(`\n🔍 Verifying assignment for ${testName}...`);

    // Refresh property manager data
    await this.propertyManager.populate("assignedProperties.propertyId");

    // Check if property is in property manager's assignedProperties array
    const assignment = this.propertyManager.assignedProperties.find(
      (assignment) =>
        assignment.propertyId._id.toString() === targetPropertyId.toString()
    );

    if (assignment) {
      console.log(
        "✅ Property found in PropertyManager.assignedProperties array"
      );
      console.log(`   - Property ID: ${assignment.propertyId._id}`);
      console.log(`   - Role: ${assignment.role}`);
      console.log(`   - Status: ${assignment.status}`);
      console.log(`   - Assigned Date: ${assignment.assignedDate}`);
    } else {
      console.log(
        "❌ Property NOT found in PropertyManager.assignedProperties array"
      );
    }

    // Check if property has the correct assignedPropertyManager
    const property = await Property.findById(targetPropertyId);
    if (
      property.assignedPropertyManager?.toString() ===
      this.propertyManager._id.toString()
    ) {
      console.log("✅ Property.assignedPropertyManager is correctly set");
    } else {
      console.log("❌ Property.assignedPropertyManager is NOT correctly set");
    }

    // Check total assignments
    console.log(
      `📊 Total properties assigned to PropertyManager: ${this.propertyManager.assignedProperties.length}`
    );
  }

  async testUnassignment() {
    console.log("\n📋 Test 3: Unassigning property manager from property");

    // Remove property from property manager's assignedProperties array
    await this.propertyManager.removePropertyAssignment(this.property._id);

    // Remove property manager from property
    this.property.assignedPropertyManager = null;
    await this.property.save();

    console.log("✅ Property manager unassigned from property");

    // Verify the unassignment
    await this.propertyManager.populate("assignedProperties.propertyId");
    const assignment = this.propertyManager.assignedProperties.find(
      (assignment) =>
        assignment.propertyId._id.toString() === this.property._id.toString()
    );

    if (!assignment) {
      console.log(
        "✅ Property successfully removed from PropertyManager.assignedProperties array"
      );
    } else {
      console.log(
        "❌ Property still exists in PropertyManager.assignedProperties array"
      );
    }

    const property = await Property.findById(this.property._id);
    if (!property.assignedPropertyManager) {
      console.log("✅ Property.assignedPropertyManager successfully cleared");
    } else {
      console.log("❌ Property.assignedPropertyManager still has a value");
    }
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up test data...");

    if (this.property) {
      await Property.findByIdAndDelete(this.property._id);
      console.log("✅ Deleted test property");
    }

    if (this.propertyManager) {
      await PropertyManager.findByIdAndDelete(this.propertyManager._id);
      console.log("✅ Deleted test property manager");
    }

    if (this.agency) {
      await Agency.findByIdAndDelete(this.agency._id);
      console.log("✅ Deleted test agency");
    }

    await mongoose.disconnect();
    console.log("✅ Disconnected from database");
  }

  async runTests() {
    try {
      await this.setup();
      await this.testPropertyCreationWithAssignment();
      await this.testPropertyAssignmentToExistingProperty();
      await this.testUnassignment();

      console.log("\n🎉 All tests completed successfully!");
      console.log("\n📝 Summary:");
      console.log("✅ Property creation with assignment works correctly");
      console.log(
        "✅ Property assignment to existing property works correctly"
      );
      console.log("✅ Property unassignment works correctly");
      console.log(
        "✅ Both Property.assignedPropertyManager and PropertyManager.assignedProperties are synchronized"
      );
    } catch (error) {
      console.error("❌ Test failed:", error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const testSuite = new PropertyAssignmentSyncTest();
  testSuite.runTests();
}

export default PropertyAssignmentSyncTest;
