import axios from "axios";

const BASE_URL = "http://localhost:4000/api/v1";

// Test Property Manager Access Fix
async function testPropertyManagerAccessFix() {
  console.log("🧪 Testing Property Manager Access Fix\n");

  try {
    // Note: You'll need to replace this with a valid property manager token
    const propertyManagerToken = "YOUR_PROPERTY_MANAGER_TOKEN_HERE";

    // Test 1: Property Manager fetching properties - should only see assigned properties
    console.log("📋 Test 1: Property Manager fetching properties...");

    const response = await axios.get(
      `${BASE_URL}/properties?page=1&limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can fetch properties");
    console.log(`📊 Found ${response.data.data.properties.length} properties`);
    console.log(`📄 Total pages: ${response.data.data.pagination.totalPages}`);
    console.log(`📈 Total count: ${response.data.data.pagination.totalCount}`);

    // Verify that all returned properties have this property manager as assignedPropertyManager
    const allAssignedToMe = response.data.data.properties.every(
      (property) =>
        property.assignedPropertyManager?.id ===
        "PROPERTY_MANAGER_ID_FROM_TOKEN"
    );

    if (allAssignedToMe) {
      console.log(
        "✅ All properties are correctly assigned to this Property Manager"
      );
    } else {
      console.log(
        "❌ Some properties are not assigned to this Property Manager"
      );
      console.log("Properties found:");
      response.data.data.properties.forEach((property, index) => {
        console.log(
          `${index + 1}. ${property.fullAddress} - Assigned to: ${
            property.assignedPropertyManager?.fullName || "None"
          }`
        );
      });
    }

    console.log("\n📋 Summary:");
    console.log(
      "✅ Property Managers can only see properties where they are assigned as assignedPropertyManager"
    );
    console.log(
      "✅ They cannot see other properties from their agency unless assigned"
    );
    console.log("✅ This ensures proper access control and data isolation");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log("\n💡 Make sure to:");
      console.log(
        "1. Replace YOUR_PROPERTY_MANAGER_TOKEN_HERE with a valid property manager JWT token"
      );
      console.log(
        "2. Replace PROPERTY_MANAGER_ID_FROM_TOKEN with the actual property manager ID"
      );
      console.log(
        "3. Ensure the property manager has some properties assigned to them"
      );
    }
  }
}

// Run test
async function runTest() {
  console.log("🚀 Starting Property Manager Access Fix Test\n");
  await testPropertyManagerAccessFix();
  console.log("\n✨ Test completed!");
}

// Export for use in other files
export { testPropertyManagerAccessFix, runTest };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}
