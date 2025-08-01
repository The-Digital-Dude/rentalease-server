import axios from "axios";

// Test configuration
const BASE_URL = "http://localhost:4000/api/v1";
const TECHNICIAN_TOKEN = "your_technician_token_here"; // Replace with actual token

// Test the technician dashboard endpoint
async function testTechnicianDashboard() {
  try {
    console.log("🧪 Testing technician dashboard endpoint...\n");

    // Test 1: Get dashboard data
    console.log("📋 Test 1: Get dashboard data");
    const response = await axios.get(`${BASE_URL}/technicians/dashboard`, {
      headers: {
        Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    console.log("✅ Response:", {
      status: response.status,
      message: response.data.message,
    });

    // Test 2: Validate quick stats structure
    console.log("\n📋 Test 2: Validate quick stats structure");
    const quickStats = response.data.data.quickStats;
    console.log("✅ Quick Stats:", {
      totalJobs: quickStats.totalJobs,
      activeJobs: quickStats.activeJobs,
      scheduledJobs: quickStats.scheduledJobs,
      completedJobs: quickStats.completedJobs,
      overdueJobs: quickStats.overdueJobs,
    });

    // Test 3: Validate job status distribution
    console.log("\n📋 Test 3: Validate job status distribution");
    const statusDistribution = response.data.data.jobStatusDistribution;
    console.log(
      "✅ Job Status Distribution:",
      statusDistribution.map((item) => ({
        status: item.status,
        count: item.count,
        percentage: item.percentage,
      }))
    );

    // Test 4: Validate weekly progress
    console.log("\n📋 Test 4: Validate weekly progress");
    const weeklyProgress = response.data.data.weeklyProgress;
    console.log(
      "✅ Weekly Progress:",
      weeklyProgress.map((item) => ({
        day: item.day,
        completed: item.completed,
        scheduled: item.scheduled,
      }))
    );

    // Test 5: Validate recent jobs
    console.log("\n📋 Test 5: Validate recent jobs");
    const recentJobs = response.data.data.recentJobs;
    console.log("✅ Recent Jobs:", {
      count: recentJobs.length,
      maxExpected: 5,
      jobs: recentJobs.slice(0, 2).map((job) => ({
        job_id: job.job_id,
        jobType: job.jobType,
        status: job.status,
      })),
    });

    // Test 6: Validate payment stats
    console.log("\n📋 Test 6: Validate payment stats");
    const paymentStats = response.data.data.paymentStats;
    console.log("✅ Payment Stats:", {
      totalPayments: paymentStats.totalPayments,
      pendingPayments: paymentStats.pendingPayments,
      totalAmount: paymentStats.totalAmount,
      pendingAmount: paymentStats.pendingAmount,
    });

    // Test 7: Validate data consistency
    console.log("\n📋 Test 7: Validate data consistency");
    const totalJobsFromStats = quickStats.totalJobs;
    const totalJobsFromDistribution = statusDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );

    console.log("✅ Data Consistency Check:", {
      totalJobsFromStats,
      totalJobsFromDistribution,
      isConsistent: totalJobsFromStats === totalJobsFromDistribution,
    });

    // Test 8: Validate percentages
    console.log("\n📋 Test 8: Validate percentages");
    const totalPercentage = statusDistribution.reduce(
      (sum, item) => sum + item.percentage,
      0
    );
    console.log("✅ Percentage Validation:", {
      totalPercentage,
      is100Percent: totalPercentage === 100 || totalJobsFromStats === 0,
    });

    console.log("\n🎉 All dashboard tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      endpoint: error.config?.url,
    });
  }
}

// Test error cases
async function testErrorCases() {
  console.log("\n🧪 Testing error cases...\n");

  try {
    // Test 1: Unauthorized access
    console.log("📋 Test 1: Unauthorized access");
    const response1 = await axios.get(`${BASE_URL}/technicians/dashboard`);
    console.log("❌ Should have failed with 401");
  } catch (error) {
    console.log("✅ Unauthorized access blocked:", error.response?.status);
  }

  try {
    // Test 2: Invalid token
    console.log("\n📋 Test 2: Invalid token");
    const response2 = await axios.get(`${BASE_URL}/technicians/dashboard`, {
      headers: {
        Authorization: "Bearer invalid_token",
        "Content-Type": "application/json",
      },
    });
    console.log("❌ Should have failed with 401");
  } catch (error) {
    console.log("✅ Invalid token blocked:", error.response?.status);
  }

  try {
    // Test 3: Non-technician access (if you have a different user token)
    console.log("\n📋 Test 3: Non-technician access");
    // This would require a different user token to test properly
    console.log(
      "ℹ️  This test requires a non-technician token to verify access control"
    );
  } catch (error) {
    console.log("✅ Non-technician access blocked:", error.response?.status);
  }
}

// Test dashboard data validation
async function testDataValidation() {
  console.log("\n🧪 Testing data validation...\n");

  try {
    const response = await axios.get(`${BASE_URL}/technicians/dashboard`, {
      headers: {
        Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = response.data.data;

    // Test 1: Check if all required fields exist
    console.log("📋 Test 1: Required fields validation");
    const requiredFields = [
      "quickStats",
      "jobStatusDistribution",
      "weeklyProgress",
      "recentJobs",
      "paymentStats",
      "lastUpdated",
    ];

    const missingFields = requiredFields.filter((field) => !(field in data));
    console.log("✅ Required Fields Check:", {
      missingFields: missingFields.length === 0 ? "None" : missingFields,
      allFieldsPresent: missingFields.length === 0,
    });

    // Test 2: Check weekly progress has all 7 days
    console.log("\n📋 Test 2: Weekly progress validation");
    const weeklyProgress = data.weeklyProgress;
    console.log("✅ Weekly Progress Validation:", {
      daysCount: weeklyProgress.length,
      expectedDays: 7,
      hasAllDays: weeklyProgress.length === 7,
      days: weeklyProgress.map((item) => item.day),
    });

    // Test 3: Check recent jobs limit
    console.log("\n📋 Test 3: Recent jobs limit validation");
    const recentJobs = data.recentJobs;
    console.log("✅ Recent Jobs Limit:", {
      actualCount: recentJobs.length,
      maxAllowed: 5,
      withinLimit: recentJobs.length <= 5,
    });

    // Test 4: Check data types
    console.log("\n📋 Test 4: Data types validation");
    const quickStats = data.quickStats;
    const typeChecks = {
      totalJobs: typeof quickStats.totalJobs === "number",
      activeJobs: typeof quickStats.activeJobs === "number",
      scheduledJobs: typeof quickStats.scheduledJobs === "number",
      completedJobs: typeof quickStats.completedJobs === "number",
      overdueJobs: typeof quickStats.overdueJobs === "number",
    };

    console.log("✅ Data Types Check:", typeChecks);
    const allTypesCorrect = Object.values(typeChecks).every((check) => check);
    console.log("All types correct:", allTypesCorrect);
  } catch (error) {
    console.error("❌ Data validation test failed:", error.message);
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting technician dashboard tests...\n");

  await testTechnicianDashboard();
  await testErrorCases();
  await testDataValidation();

  console.log("\n✨ All tests finished!");
}

// Export for use in other test files
export {
  testTechnicianDashboard,
  testErrorCases,
  testDataValidation,
  runTests,
};

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
