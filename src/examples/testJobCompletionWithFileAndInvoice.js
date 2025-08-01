import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
  jobId: "507f1f77bcf86cd799439011", // Replace with actual job ID
  technicianToken: "your_technician_jwt_token_here", // Replace with actual token
  baseUrl: "http://localhost:3000",
};

// Sample invoice data
const sampleInvoiceData = {
  description: "Gas safety inspection and certification",
  items: [
    {
      id: "1",
      name: "Gas Safety Inspection",
      quantity: 1,
      rate: 150.0,
      amount: 150.0,
    },
    {
      id: "2",
      name: "Safety Certificate",
      quantity: 1,
      rate: 50.0,
      amount: 50.0,
    },
    {
      id: "3",
      name: "Travel Time",
      quantity: 0.5,
      rate: 80.0,
      amount: 40.0,
    },
  ],
  subtotal: 240.0,
  tax: 24.0,
  taxPercentage: 10,
  totalCost: 264.0,
  notes: "Standard gas safety inspection completed successfully.",
};

// Test scenarios
const testScenarios = [
  {
    name: "Complete job with report file only",
    hasInvoice: false,
    includeFile: true,
    description: "Complete job with PDF report file but no invoice",
  },
  {
    name: "Complete job with invoice only",
    hasInvoice: true,
    includeFile: false,
    description: "Complete job with invoice data but no report file",
  },
  {
    name: "Complete job with both report file and invoice",
    hasInvoice: true,
    includeFile: true,
    description: "Complete job with both PDF report file and invoice data",
  },
  {
    name: "Complete job without file or invoice",
    hasInvoice: false,
    includeFile: false,
    description: "Complete job without any additional files or invoice",
  },
];

// Helper function to create a test PDF file
const createTestPDF = () => {
  // This is a minimal PDF content for testing
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Test Report) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
297
%%EOF`;

  return Buffer.from(pdfContent);
};

// Helper function to make the API request
const completeJobWithFileAndInvoice = async (scenario) => {
  try {
    console.log(`\n🧪 Testing: ${scenario.name}`);
    console.log(`📝 Description: ${scenario.description}`);

    const formData = new FormData();

    // Add report file if required
    if (scenario.includeFile) {
      const testPdfBuffer = createTestPDF();
      const blob = new Blob([testPdfBuffer], { type: "application/pdf" });
      formData.append("reportFile", blob, "test-report.pdf");
      console.log("📄 Added test PDF file");
    }

    // Add invoice data if required
    if (scenario.hasInvoice) {
      formData.append("hasInvoice", "true");
      formData.append("invoiceData", JSON.stringify(sampleInvoiceData));
      console.log("💰 Added invoice data");
    } else {
      formData.append("hasInvoice", "false");
    }

    // Make the API request
    const response = await fetch(
      `${TEST_CONFIG.baseUrl}/v1/jobs/${TEST_CONFIG.jobId}/complete`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TEST_CONFIG.technicianToken}`,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Success!");
      console.log("📊 Response data:");
      console.log(JSON.stringify(data, null, 2));
      
      // Log specific details
      if (data.data?.completionDetails?.reportFile) {
        console.log(`📄 Report file uploaded: ${data.data.completionDetails.reportFile}`);
      }
      
      if (data.data?.completionDetails?.invoiceCreated) {
        console.log(`💰 Invoice created with ID: ${data.data.completionDetails.invoiceId}`);
      }
      
      return { success: true, data };
    } else {
      console.log("❌ Failed!");
      console.log("🚨 Error response:");
      console.log(JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }
  } catch (error) {
    console.log("💥 Exception occurred:");
    console.error(error);
    return { success: false, error: error.message };
  }
};

// Main test function
const runTests = async () => {
  console.log("🚀 Starting Job Completion with File and Invoice Tests");
  console.log("=" .repeat(60));

  const results = [];

  for (const scenario of testScenarios) {
    const result = await completeJobWithFileAndInvoice(scenario);
    results.push({
      scenario: scenario.name,
      success: result.success,
      error: result.error?.message || null,
    });

    // Add a small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Summary
  console.log("\n" + "=" .repeat(60));
  console.log("📊 Test Summary:");
  console.log("=" .repeat(60));

  results.forEach((result, index) => {
    const status = result.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${result.scenario}: ${status}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passedTests = results.filter(r => r.success).length;
  const totalTests = results.length;
  
  console.log(`\n🎯 Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! The job completion endpoint is working correctly.");
  } else {
    console.log("⚠️  Some tests failed. Please check the error messages above.");
  }
};

// Manual test function for specific scenarios
const testSpecificScenario = async (scenarioIndex = 0) => {
  if (scenarioIndex >= testScenarios.length) {
    console.log("❌ Invalid scenario index");
    return;
  }

  const scenario = testScenarios[scenarioIndex];
  console.log("🎯 Running specific test scenario...");
  await completeJobWithFileAndInvoice(scenario);
};

// Export functions for manual testing
export { runTests, testSpecificScenario, testScenarios };

// Run tests if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const scenarioIndex = process.argv[2] ? parseInt(process.argv[2]) : null;
  
  if (scenarioIndex !== null) {
    testSpecificScenario(scenarioIndex);
  } else {
    runTests();
  }
}

console.log(`
📋 Usage Instructions:

1. Update TEST_CONFIG with your actual values:
   - jobId: The ID of a job that can be completed
   - technicianToken: JWT token of a technician assigned to the job
   - baseUrl: Your API base URL

2. Run all tests:
   node src/examples/testJobCompletionWithFileAndInvoice.js

3. Run a specific test scenario:
   node src/examples/testJobCompletionWithFileAndInvoice.js 0  # Test scenario 0
   node src/examples/testJobCompletionWithFileAndInvoice.js 1  # Test scenario 1
   etc.

4. Test scenarios available:
   ${testScenarios.map((s, i) => `${i}: ${s.name}`).join('\n   ')}

⚠️  Important Notes:
- Make sure the job exists and is assigned to the technician
- The job status should be "Scheduled" or "In Progress"
- The job due date should be today or in the past
- The technician token should be valid and not expired
`); 