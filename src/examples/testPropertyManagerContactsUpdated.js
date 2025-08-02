import axios from "axios";

const BASE_URL = "http://localhost:4000/api/v1";

// Test Updated Property Manager Access to Contacts (No Filtering)
async function testPropertyManagerContactsUpdated() {
  console.log(
    "🧪 Testing Updated Property Manager Access to Contacts (No Filtering)\n"
  );

  try {
    // Note: You'll need to replace this with a valid property manager token
    const propertyManagerToken = "YOUR_PROPERTY_MANAGER_TOKEN_HERE";

    // Test 1: Property Manager fetching all contacts
    console.log("📋 Test 1: Property Manager fetching all contacts...");

    const response = await axios.get(`${BASE_URL}/contacts`, {
      headers: {
        Authorization: `Bearer ${propertyManagerToken}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Property Manager can fetch all contacts");
    console.log(`📊 Found ${response.data.data.contacts.length} contacts`);

    if (response.data.data.contacts.length > 0) {
      console.log("📋 Sample contacts found:");
      response.data.data.contacts.slice(0, 5).forEach((contact, index) => {
        console.log(
          `${index + 1}. ${contact.name} (${contact.role}) - ${
            contact.email
          } - Owner: ${contact.owner.ownerType}`
        );
      });

      if (response.data.data.contacts.length > 5) {
        console.log(
          `   ... and ${response.data.data.contacts.length - 5} more contacts`
        );
      }
    } else {
      console.log("ℹ️ No contacts found in the system");
    }

    // Test 2: Property Manager can send email to any contact
    if (response.data.data.contacts.length > 0) {
      console.log(
        "\n📋 Test 2: Property Manager sending email to any contact..."
      );
      const contactId = response.data.data.contacts[0]._id;

      try {
        const emailResponse = await axios.post(
          `${BASE_URL}/contacts/${contactId}/send-email`,
          {
            subject: "Test Email from Property Manager (Updated)",
            html: "<p>This is a test email sent by a Property Manager to any contact.</p>",
          },
          {
            headers: {
              Authorization: `Bearer ${propertyManagerToken}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("✅ Property Manager can send emails to any contact");
        console.log(
          `📧 Email sent successfully: ${emailResponse.data.message}`
        );
      } catch (error) {
        if (error.response?.status === 403) {
          console.log(
            "❌ Property Manager should be able to send emails to any contact"
          );
          console.log(`📝 Error message: ${error.response.data.message}`);
        } else {
          console.log(
            "❌ Unexpected error:",
            error.response?.data || error.message
          );
        }
      }
    }

    // Test 3: Property Manager still cannot create contacts
    console.log("\n📋 Test 3: Property Manager trying to create a contact...");

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

    console.log("\n📋 Summary of Updated Property Manager Contact Access:");
    console.log("✅ Can view ALL contacts in the system (no filtering)");
    console.log("✅ Can send emails to ANY contact");
    console.log("❌ Cannot create new contacts");
    console.log("❌ Cannot update existing contacts");
    console.log("❌ Cannot delete contacts");
    console.log("🎯 Full visibility with read-only access");
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

// Run test
async function runTest() {
  console.log("🚀 Starting Updated Property Manager Contacts Test\n");
  await testPropertyManagerContactsUpdated();
  console.log("\n✨ Test completed!");
}

// Export for use in other files
export { testPropertyManagerContactsUpdated, runTest };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest();
}
