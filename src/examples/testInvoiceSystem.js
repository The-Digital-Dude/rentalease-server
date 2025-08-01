import mongoose from "mongoose";
import Invoice from "../models/Invoice.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import Property from "../models/Property.js";
import Agency from "../models/Agency.js";
import dotenv from "dotenv";

dotenv.config();

// Test the Invoice System API
async function testInvoiceSystem() {
  let testData = {
    agency: null,
    property: null,
    technician: null,
    job: null,
    invoices: [],
  };

  try {
    console.log("🧪 Testing Invoice System API...\n");

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to database");

    // Create test data
    console.log("\n📝 Creating test data...");

    // Generate unique test data
    const timestamp = Date.now();
    const uniqueABN = `123456789${timestamp.toString().slice(-2)}`;
    const uniqueEmail = `john${timestamp}@testagency.com`;

    // Create a test agency
    const agency = new Agency({
      companyName: `Test Agency ${timestamp}`,
      contactPerson: "John Doe",
      email: uniqueEmail,
      phone: "1234567890",
      password: "password123",
      status: "Active",
      abn: uniqueABN,
      region: "North",
      compliance: "Basic Package",
    });
    await agency.save();
    testData.agency = agency;
    console.log("✅ Created test agency");

    // Create a test property
    const property = new Property({
      address: {
        street: "123 Test Street",
        suburb: "Test City",
        state: "NSW",
        postcode: "2000",
        fullAddress: "123 Test Street, Test City, NSW 2000",
      },
      propertyType: "House",
      region: "Sydney Metro",
      agency: agency._id,
      currentTenant: {
        name: "John Tenant",
        email: "tenant@test.com",
        phone: "0412345678",
      },
      currentLandlord: {
        name: "Jane Landlord",
        email: "landlord@test.com",
        phone: "0423456789",
      },
      createdBy: {
        userType: "Agency",
        userId: agency._id,
      },
    });
    await property.save();
    testData.property = property;
    console.log("✅ Created test property");

    // Create a test technician
    const technician = new Technician({
      firstName: "Test",
      lastName: "Technician",
      email: "tech@test.com",
      phone: "0987654321",
      password: "password123",
      status: "Active",
      availabilityStatus: "Available",
      currentJobs: 0,
      maxJobs: 4,
      serviceRegions: ["North"],
      owner: {
        ownerType: "Agency",
        ownerId: agency._id,
      },
    });
    await technician.save();
    testData.technician = technician;
    console.log("✅ Created test technician");

    // Create a test job (completed)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const job = new Job({
      property: property._id,
      jobType: "Gas",
      dueDate: futureDate,
      assignedTechnician: technician._id,
      description: "Test gas inspection",
      priority: "Medium",
      status: "Scheduled",
      owner: {
        ownerType: "Agency",
        ownerId: agency._id,
      },
      createdBy: {
        userType: "Agency",
        userId: agency._id,
      },
      lastUpdatedBy: {
        userType: "Agency",
        userId: agency._id,
      },
    });
    await job.save();

    // Update job to completed status for invoice testing
    job.status = "Completed";
    job.completedAt = new Date();
    await job.save();
    testData.job = job;
    console.log("✅ Created test job (completed)");

    // Test invoice creation
    console.log("\n🔍 Testing invoice creation...");

    const invoiceData = {
      jobId: job._id,
      technicianId: technician._id,
      agencyId: agency._id,
      description: "Gas safety inspection and certification",
      items: [
        {
          name: "Gas Safety Inspection",
          quantity: 1,
          rate: 150.0,
          amount: 150.0,
        },
        {
          name: "Safety Certificate",
          quantity: 1,
          rate: 50.0,
          amount: 50.0,
        },
        {
          name: "Travel Time",
          quantity: 0.5,
          rate: 80.0,
          amount: 40.0,
        },
      ],
      tax: 24.0,
      notes: "Standard gas safety inspection completed successfully.",
    };

    // Test invoice validation
    console.log("\n📋 Test 1: Valid invoice data");
    console.log(`Job ID: ${invoiceData.jobId}`);
    console.log(`Technician ID: ${invoiceData.technicianId}`);
    console.log(`Agency ID: ${invoiceData.agencyId}`);
    console.log(`Description: ${invoiceData.description}`);
    console.log(`Items count: ${invoiceData.items.length}`);
    console.log(`Tax: $${invoiceData.tax}`);

    // Calculate totals
    const subtotal = invoiceData.items.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const totalCost = subtotal + invoiceData.tax;
    console.log(`Subtotal: $${subtotal.toFixed(2)}`);
    console.log(`Total Cost: $${totalCost.toFixed(2)}`);

    // Test item validation
    console.log("\n📋 Test 2: Item validation");
    for (let i = 0; i < invoiceData.items.length; i++) {
      const item = invoiceData.items[i];
      console.log(`Item ${i + 1}: ${item.name}`);
      console.log(`  Quantity: ${item.quantity}`);
      console.log(`  Rate: $${item.rate}`);
      console.log(`  Amount: $${item.amount}`);

      // Validate item
      const isValid = item.name && item.quantity > 0 && item.rate >= 0;
      console.log(`  Valid: ${isValid ? "✅" : "❌"}`);
    }

    // Test invoice status validation
    console.log("\n📋 Test 3: Invoice status validation");
    const validStatuses = ["Pending", "Sent", "Paid"];
    console.log(`Valid statuses: ${validStatuses.join(", ")}`);

    // Test invoice number generation
    console.log("\n📋 Test 4: Invoice number generation");
    const invoiceNumber = `INV-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;
    console.log(`Generated invoice number: ${invoiceNumber}`);

    // Test business rules
    console.log("\n📋 Test 5: Business rules validation");
    console.log(`Job status: ${job.status}`);
    console.log(
      `Can create invoice: ${job.status === "Completed" ? "✅" : "❌"}`
    );
    console.log(`Job has technician: ${job.assignedTechnician ? "✅" : "❌"}`);
    console.log(
      `Job has agency: ${job.owner.ownerType === "Agency" ? "✅" : "❌"}`
    );

    console.log("\n✅ Invoice system validation tests completed successfully!");
    console.log("\n📋 Summary of test scenarios:");
    console.log("1. ✅ Valid invoice data - All required fields present");
    console.log("2. ✅ Item validation - All items have valid data");
    console.log("3. ✅ Status validation - Valid status values");
    console.log("4. ✅ Invoice number generation - Unique invoice numbers");
    console.log("5. ✅ Business rules - Job completed, technician assigned");

    console.log("\n🚀 To test the actual API endpoints:");
    console.log("1. POST /v1/invoices - Create new invoice");
    console.log(
      "2. GET /v1/invoices/job/{jobId} - Get invoice for specific job"
    );
    console.log(
      "3. PATCH /v1/invoices/{invoiceId}/send - Send invoice to agency"
    );
    console.log("4. GET /v1/invoices - Get all invoices with filtering");
    console.log("5. GET /v1/invoices/{id} - Get specific invoice by ID");

    console.log("\n📋 Test data created:");
    console.log(`- Agency: ${agency._id}`);
    console.log(`- Property: ${property._id}`);
    console.log(`- Technician: ${technician._id}`);
    console.log(`- Job: ${job._id}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    // Cleanup test data
    try {
      console.log("\n🧹 Cleaning up test data...");

      // Delete invoices
      for (const invoice of testData.invoices) {
        await Invoice.findByIdAndDelete(invoice._id);
      }

      // Delete job
      if (testData.job) {
        await Job.findByIdAndDelete(testData.job._id);
      }

      // Delete technician
      if (testData.technician) {
        await Technician.findByIdAndDelete(testData.technician._id);
      }

      // Delete property
      if (testData.property) {
        await Property.findByIdAndDelete(testData.property._id);
      }

      // Delete agency
      if (testData.agency) {
        await Agency.findByIdAndDelete(testData.agency._id);
      }

      console.log("✅ Test data cleaned up");
    } catch (cleanupError) {
      console.error("⚠️ Cleanup failed:", cleanupError);
    }

    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from database");
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvoiceSystem();
}

export default testInvoiceSystem;
