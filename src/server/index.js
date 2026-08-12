import { createServer } from 'http';
import app from "./app.js";
import connectDB from "../config/database.js";
import { isGCSConfigured, testGCSConnection } from "../config/gcs.js";
import ComplianceCronJob from "../services/complianceCronJob.js";
import websocketService from "../services/websocket.service.js";
import { ensureDefaultTemplates } from "../services/inspectionTemplate.service.js";
import { COMPLIANCE_CRON_ENABLED } from "../config/features.js";
import { startOverdueCron } from "../services/overdueJobsCron.js";
import { backfillStuckJobs } from "../services/backfillStuckJobs.js";

const PORT = process.env.PORT || 4000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    if (isGCSConfigured()) {
      await testGCSConnection();
    } else {
      console.warn("GCS is not configured. Report and file uploads will fail until valid GCS credentials are provided.");
    }

    // Ensure inspection templates are seeded
    await ensureDefaultTemplates();

    console.log(`🔑 PORT: ${PORT}`);

    // Create HTTP server
    const server = createServer(app);

    // Initialize WebSocket server
    websocketService.initialize(server);

    // Start the server
    server.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log("📝 API Documentation available at /api-docs");
      console.log("💚 Health check available at /health");
      console.log("🔌 WebSocket server ready for connections");
      console.log("----------------------------------------");
    });

    // One-time backfill: reset jobs wrongly marked Overdue due to UTC midnight date bug
    await backfillStuckJobs();

    // Start overdue jobs cron (always on)
    startOverdueCron();

    // Start compliance cron job only when explicitly enabled
    const complianceCronJob = new ComplianceCronJob();
    if (COMPLIANCE_CRON_ENABLED) {
      complianceCronJob.start();
    } else {
      console.log("⏸️ Compliance cron job is disabled by feature flag");
    }

    // Handle graceful shutdown
    process.on("SIGTERM", () => {
      console.log("🛑 SIGTERM received, shutting down gracefully...");
      complianceCronJob.stop();
      process.exit(0);
    });

    process.on("SIGINT", () => {
      console.log("🛑 SIGINT received, shutting down gracefully...");
      complianceCronJob.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

export { startServer };
