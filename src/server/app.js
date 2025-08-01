import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import routes
import authRoutes from "../routes/auth.routes.js";
import agencyAuthRoutes from "../routes/agency.auth.routes.js";
import technicianAuthRoutes from "../routes/technician.auth.routes.js";
import technicianRoutes from "../routes/technician.routes.js";
import jobRoutes from "../routes/job.routes.js";
import propertyRoutes from "../routes/property.routes.js";
import contactsRoutes from "../routes/contacts.routes.js";
import complianceRoutes from "../routes/compliance.routes.js";
import notificationRoutes from "../routes/notification.routes.js";
import invoiceRoutes from "../routes/invoice.routes.js";
import technicianPaymentRoutes from "../routes/technicianPayment.routes.js";
import emailService from "../services/email.service.js";

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/agency/auth", agencyAuthRoutes);
app.use("/api/v1/technician/auth", technicianAuthRoutes);
app.use("/api/v1/technicians", technicianRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/compliance", complianceRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/technician-payments", technicianPaymentRoutes);

// Health check route
app.get("/health", async (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running, With Full Energy 🔥",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    timestamp: new Date().toISOString(),
  });
});

// Handle 404 routes
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
    timestamp: new Date().toISOString(),
  });
});

export default app;
