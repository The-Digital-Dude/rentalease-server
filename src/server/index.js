import { createServer } from 'http';
import app from "./app.js";
import connectDB from "../config/database.js";
import { testCloudinaryConnection } from "../config/cloudinary.js";
import ComplianceCronJob from "../services/complianceCronJob.js";
import websocketService from "../services/websocket.service.js";

const PORT = process.env.PORT || 4000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Test Cloudinary connection
    await testCloudinaryConnection();

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

    // Start compliance cron job
    const complianceCronJob = new ComplianceCronJob();
    complianceCronJob.start();

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
