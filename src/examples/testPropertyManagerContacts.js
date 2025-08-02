import axios from "axios";

const BASE_URL = "http://localhost:4000/api/v1";

// Test Property Manager Access to Contacts
async function testPropertyManagerContacts() {
  console.log("🧪 Testing Property Manager Access to Contacts\n");

  try {
    // Note: You'll need to replace this with a valid property manager token
    const propertyManagerToken = "YOUR_PROPERTY_MANAGER_TOKEN_HERE";

    // Test 1: Property Manager fetching contacts
    console.log("📋 Test 1: Property Manager fetching contacts...");

    const response = await axios.get(`${BASE_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Property Manager can fetch contacts");
    console.log(`📊 Found ${response.data.data.contacts.length} contacts`);

    if (response.data.data.contacts.length > 0) {
      console.log("📋 Contacts found:");
      response.data.data.contacts.forEach((contact, index) => {
        console.log(
          `${index + 1}. ${contact.name} (${contact.role}) - ${contact.email}`
        );
      });
    } else {
      console.log("ℹ️ No contacts found - this might be because:");
      console.log("   - No contacts exist in the system");
      console.log("   - Database is empty");
      console.log("   - Authentication issue");
    }

    // Test 2: Property Manager trying to create a contact (should be denied)
    console.log("\n📋 Test 2: Property Manager trying to create a contact...");

    try {
      const createResponse = await axios.post(
        `${BASE_URL}/contacts`,
        {
          name: "Test Contact",
          role: "Tenant",
          email: "test@example.com",
          phone: "+61412345678",
          notes: "Test contact created by Property Manager",
        },
        {
          headers: {
            Authorization: `Bearer ${propertyManagerToken}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("❌ Property Manager should not be able to create contacts");
    } catch (error) {
      if (error.response?.status === 403) {
        console.log(
          "✅ Property Manager correctly denied from creating contacts"
        );
        console.log(`📝 Error message: ${error.response.data.message}`);
      } else {
        console.log(
          "❌ Unexpected error:",
          error.response?.data || error.message
        );
      }
    }

    // Test 3: Property Manager trying to update a contact (should be denied)
    if (response.data.data.contacts.length > 0) {
      console.log(
        "\n📋 Test 3: Property Manager trying to update a contact..."
      );
      const contactId = response.data.data.contacts[0]._id;

      try {
        const updateResponse = await axios.put(
          `${BASE_URL}/contacts/${contactId}`,
          {
            notes: "Updated by Property Manager",
          },
          {
            headers: {
              Authorization: `Bearer ${propertyManagerToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(
          "❌ Property Manager should not be able to update contacts"
        );
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(
            "✅ Property Manager correctly denied from updating contacts"
          );
          console.log(`📝 Error message: ${error.response.data.message}`);
        } else {
          console.log(
            "❌ Unexpected error:",
            error.response?.data || error.message
          );
        }
      }

      // Test 4: Property Manager trying to delete a contact (should be denied)
      console.log(
        "\n📋 Test 4: Property Manager trying to delete a contact..."
      );

      try {
        const deleteResponse = await axios.delete(
          `${BASE_URL}/contacts/${contactId}`,
          {
            headers: {
              Authorization: `Bearer ${propertyManagerToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log(
          "❌ Property Manager should not be able to delete contacts"
        );
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(
            "✅ Property Manager correctly denied from deleting contacts"
          );
          console.log(`📝 Error message: ${error.response.data.message}`);
        } else {
          console.log(
            "❌ Unexpected error:",
            error.response?.data || error.message
          );
        }
      }

      // Test 5: Property Manager sending email to contact (should be allowed)
      console.log("\n📋 Test 5: Property Manager sending email to contact...");

      try {
        const emailResponse = await axios.post(
          `${BASE_URL}/contacts/${contactId}/send-email`,
          {
            subject: "Test Email from Property Manager",
            html: "<p>This is a test email sent by a Property Manager.</p>",
          },
          {
            headers: {
              Authorization: `Bearer ${propertyManagerToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("✅ Property Manager can send emails to contacts");
        console.log(
          `📧 Email sent successfully: ${emailResponse.data.message}`
        );
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(
            "❌ Property Manager should be able to send emails to contacts"
          );
          console.log(`📝 Error message: ${error.response.data.message}`);
        } else {
          console.log(
            "❌ Unexpected error:",
            error.response?.data || error.message
          );
        }
      }
    } else {
      console.log("\n📋 Test 3-5: Skipped - no contacts available for testing");
    }

    console.log("\n📋 Summary of Property Manager Contact Access:");
    console.log("✅ Can view all contacts in the system");
    console.log("❌ Cannot create new contacts");
    console.log("❌ Cannot update existing contacts");
    console.log("❌ Cannot delete contacts");
    console.log("✅ Can send emails to any contact");
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);

    if (error.response?.status === 401) {
      console.log("\n💡 Make sure to:");
      console.log(
        "1. Replace YOUR_PROPERTY_MANAGER_TOKEN_HERE with a valid property manager JWT token"
      );
      console.log("2. Ensure there are contacts in the system");
      console.log("3. Verify the Property Manager account is active");
    }
  }
}

// Test Agency Access (for comparison)
async function testAgencyContacts() {
  console.log("\n🏢 Testing Agency Access to Contacts\n");

  try {
    // Note: You'll need to replace this with a valid agency token
    const agencyToken = "YOUR_AGENCY_TOKEN_HERE";

    const response = await axios.get(`${BASE_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${agencyToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Agency can fetch their contacts");
    console.log(`📊 Found ${response.data.data.contacts.length} contacts`);
  } catch (error) {
    console.error(
      "❌ Agency test failed:",
      error.response?.data || error.message
    );
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Property Manager Contacts Tests\n");

  await testPropertyManagerContacts();
  await testAgencyContacts();

  console.log("\n✨ Test suite completed!");
}

// Export for use in other files
export { testPropertyManagerContacts, testAgencyContacts, runTests };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
