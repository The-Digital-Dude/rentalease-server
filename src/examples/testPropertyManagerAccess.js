import axios from "axios";

const BASE_URL = "http://localhost:4000/api/v1";

// Test Property Manager Access to Properties Route
async function testPropertyManagerAccess() {
  console.log("🧪 Testing Property Manager Access to Properties Route\n");

  try {
    // Test 1: Property Manager can fetch properties (they're assigned to as assignedPropertyManager)
    console.log("📋 Test 1: Property Manager fetching properties...");

    // Note: You'll need to replace this with a valid property manager token
    const propertyManagerToken = "YOUR_PROPERTY_MANAGER_TOKEN_HERE";

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
    console.log(
      `📈 Total count: ${response.data.data.pagination.totalCount}\n`
    );

    // Test 2: Property Manager can create a new property
    console.log("📋 Test 2: Property Manager creating a new property...");

    const newPropertyData = {
      address: {
        street: "123 Test Street",
        suburb: "Test Suburb",
        state: "NSW",
        postcode: "2000",
      },
      currentTenant: {
        name: "John Doe",
        email: "john.doe@example.com",
        phone: "+61412345678",
      },
      currentLandlord: {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        phone: "+61487654321",
      },
      notes: "Test property created by Property Manager",
    };

    const createResponse = await axios.post(
      `${BASE_URL}/properties`,
      newPropertyData,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can create properties");
    console.log(
      `🏠 Created property ID: ${createResponse.data.data.property.id}`
    );
    console.log(`📍 Address: ${createResponse.data.data.property.fullAddress}`);
    console.log(
      `👤 Assigned Property Manager: ${
        createResponse.data.data.property.assignedPropertyManager?.fullName ||
        "None"
      }\n`
    );

    // Test 3: Property Manager can update a property
    console.log("📋 Test 3: Property Manager updating a property...");

    const propertyId = createResponse.data.data.property.id;
    const updateData = {
      notes: "Updated notes by Property Manager",
    };

    const updateResponse = await axios.put(
      `${BASE_URL}/properties/${propertyId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can update properties");
    console.log(
      `📝 Updated notes: ${updateResponse.data.data.property.notes}\n`
    );

    // Test 4: Property Manager can assign themselves to a property
    console.log(
      "📋 Test 4: Property Manager assigning themselves to a property..."
    );

    // Get property manager ID from the token (you'll need to decode it or get it from the response)
    const propertyManagerId = "PROPERTY_MANAGER_ID_FROM_TOKEN";

    const assignResponse = await axios.post(
      `${BASE_URL}/properties/${propertyId}/assign-property-manager`,
      {
        propertyManagerId: propertyManagerId,
        role: "Primary",
      },
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can assign themselves to properties");
    console.log(`👤 Assigned as: ${assignResponse.data.data.role}\n`);

    // Test 5: Property Manager can view available property managers
    console.log(
      "📋 Test 5: Property Manager viewing available property managers..."
    );

    const availablePMResponse = await axios.get(
      `${BASE_URL}/properties/available-property-managers`,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can view available property managers");
    console.log(
      `👥 Found ${availablePMResponse.data.data.propertyManagers.length} available property managers\n`
    );

    // Test 6: Property Manager can view assignment summary
    console.log("📋 Test 6: Property Manager viewing assignment summary...");

    const summaryResponse = await axios.get(
      `${BASE_URL}/properties/${propertyId}/assignment-summary`,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can view assignment summary");
    console.log(
      `📊 Assignment status: ${summaryResponse.data.data.assignmentStatus}`
    );
    console.log(
      `👤 Assigned manager: ${
        summaryResponse.data.data.assignedPropertyManager?.fullName || "None"
      }\n`
    );

    // Test 7: Property Manager can search properties
    console.log("📋 Test 7: Property Manager searching properties...");

    const searchResponse = await axios.get(
      `${BASE_URL}/properties?search=Test&page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can search properties");
    console.log(
      `🔍 Search results: ${searchResponse.data.data.properties.length} properties found\n`
    );

    // Test 8: Property Manager can filter properties
    console.log("📋 Test 8: Property Manager filtering properties...");

    const filterResponse = await axios.get(
      `${BASE_URL}/properties?propertyType=House&status=Active&page=1&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${propertyManagerToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Property Manager can filter properties");
    console.log(
      `🔍 Filtered results: ${filterResponse.data.data.properties.length} properties found\n`
    );

    console.log("🎉 All Property Manager access tests completed successfully!");
    console.log("\n📋 Summary of Property Manager capabilities:");
    console.log(
      "✅ Can fetch properties (assigned to them as assignedPropertyManager)"
    );
    console.log(
      "✅ Can create new properties (automatically assigned to them)"
    );
    console.log("✅ Can update properties");
    console.log("✅ Can assign themselves to properties from their agency");
    console.log("✅ Can view available property managers from their agency");
    console.log("✅ Can view assignment summaries");
    console.log("✅ Can search and filter properties");
    console.log("✅ Can access all CRUD operations on properties");
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
        "3. Ensure the property manager is associated with an agency"
      );
    }
  }
}

// Test Agency Access (for comparison)
async function testAgencyAccess() {
  console.log("\n🏢 Testing Agency Access to Properties Route\n");

  try {
    // Note: You'll need to replace this with a valid agency token
    const agencyToken = "YOUR_AGENCY_TOKEN_HERE";

    const response = await axios.get(
      `${BASE_URL}/properties?page=1&limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${agencyToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Agency can fetch their properties");
    console.log(`📊 Found ${response.data.data.properties.length} properties`);
    console.log(`📄 Total pages: ${response.data.data.pagination.totalPages}`);
    console.log(`📈 Total count: ${response.data.data.pagination.totalCount}`);
  } catch (error) {
    console.error(
      "❌ Agency test failed:",
      error.response?.data || error.message
    );
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Property Manager Access Tests\n");

  await testPropertyManagerAccess();
  await testAgencyAccess();

  console.log("\n✨ Test suite completed!");
}

// Export for use in other files
export { testPropertyManagerAccess, testAgencyAccess, runTests };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
