import axios from "axios";

// Test configuration
const BASE_URL = "http://localhost:3000/api";
const TECHNICIAN_TOKEN = "your_technician_token_here"; // Replace with actual token

// Test the completed-jobs endpoint
async function testCompletedJobs() {
  try {
    console.log("🧪 Testing completed-jobs endpoint...\n");

    // Test 1: Get all completed jobs
    console.log("📋 Test 1: Get all completed jobs");
    const response1 = await axios.get(
      `${BASE_URL}/technicians/completed-jobs`,
      {
        headers: {
          Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Response:", {
      status: response1.status,
      message: response1.data.message,
      totalJobs: response1.data.data.pagination.totalItems,
      currentPage: response1.data.data.pagination.currentPage,
      statusCounts: response1.data.data.statistics.statusCounts,
    });

    // Test 2: Get completed jobs with filtering
    console.log("\n📋 Test 2: Get completed jobs with filtering");
    const response2 = await axios.get(
      `${BASE_URL}/technicians/completed-jobs?jobType=Electrical&limit=5&sortBy=completedAt&sortOrder=desc`,
      {
        headers: {
          Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Response:", {
      status: response2.status,
      totalJobs: response2.data.data.pagination.totalItems,
      jobsReturned: response2.data.data.jobs.length,
      firstJob: response2.data.data.jobs[0]
        ? {
            id: response2.data.data.jobs[0].id,
            jobType: response2.data.data.jobs[0].jobType,
            completedAt: response2.data.data.jobs[0].completedAt,
          }
        : "No jobs found",
    });

    // Test 3: Get completed jobs with date range
    console.log("\n📋 Test 3: Get completed jobs with date range");
    const currentDate = new Date();
    const lastMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      currentDate.getDate()
    );

    const response3 = await axios.get(
      `${BASE_URL}/technicians/completed-jobs?startDate=${
        lastMonth.toISOString().split("T")[0]
      }&endDate=${currentDate.toISOString().split("T")[0]}`,
      {
        headers: {
          Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Response:", {
      status: response3.status,
      totalJobs: response3.data.data.pagination.totalItems,
      dateRange: `${lastMonth.toISOString().split("T")[0]} to ${
        currentDate.toISOString().split("T")[0]
      }`,
    });

    // Test 4: Get completed jobs with search
    console.log("\n📋 Test 4: Get completed jobs with search");
    const response4 = await axios.get(
      `${BASE_URL}/technicians/completed-jobs?search=electrical&limit=3`,
      {
        headers: {
          Authorization: `Bearer ${TECHNICIAN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Response:", {
      status: response4.status,
      totalJobs: response4.data.data.pagination.totalItems,
      jobsReturned: response4.data.data.jobs.length,
      searchTerm: "electrical",
    });

    // Test 5: Check status counts
    console.log("\n📋 Test 5: Check status counts");
    const statusCounts = response1.data.data.statistics.statusCounts;
    console.log("✅ Status Counts:", statusCounts);

    console.log("\n🎉 All tests completed successfully!");
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
    const response1 = await axios.get(`${BASE_URL}/technicians/completed-jobs`);
    console.log("❌ Should have failed with 401");
  } catch (error) {
    console.log("✅ Unauthorized access blocked:", error.response?.status);
  }

  try {
    // Test 2: Invalid token
    console.log("\n📋 Test 2: Invalid token");
    const response2 = await axios.get(
      `${BASE_URL}/technicians/completed-jobs`,
      {
        headers: {
          Authorization: "Bearer invalid_token",
          "Content-Type": "application/json",
        },
      }
    );
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

// Run tests
async function runTests() {
  console.log("🚀 Starting completed-jobs endpoint tests...\n");

  await testCompletedJobs();
  await testErrorCases();

  console.log("\n✨ All tests finished!");
}

// Export for use in other test files
export { testCompletedJobs, testErrorCases, runTests };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
