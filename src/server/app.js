import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Import routes
import authRoutes from "../routes/auth.routes.js";
import agencyAuthRoutes from "../routes/agency.auth.routes.js";
import technicianAuthRoutes from "../routes/technician.auth.routes.js";
import propertyManagerAuthRoutes from "../routes/propertyManager.auth.routes.js";
import teamMemberAuthRoutes from "../routes/teamMember.auth.routes.js";
import technicianRoutes from "../routes/technician.routes.js";
import propertyManagerRoutes from "../routes/propertyManager.routes.js";
import teamMemberRoutes from "../routes/teamMember.routes.js";
import jobRoutes from "../routes/job.routes.js";
import propertyRoutes from "../routes/property.routes.js";
import contactsRoutes from "../routes/contacts.routes.js";
import complianceRoutes from "../routes/compliance.routes.js";
import notificationRoutes from "../routes/notification.routes.js";
import invoiceRoutes from "../routes/invoice.routes.js";
import technicianPaymentRoutes from "../routes/technicianPayment.routes.js";
import dashboardRoutes from "../routes/dashboard.routes.js";
import calendarRoutes from "../routes/calendar.routes.js";
import subscriptionRoutes from "../routes/subscription.routes.js";
import tenantRoutes from "../routes/tenant.routes.js";
import emailRoutes from "../routes/email.routes.js";
import profileRoutes from "../routes/profile.routes.js";
import chatRoutes from "../routes/chat.routes.js";
import websiteLeadRoutes from "../routes/websiteLead.routes.js";
import regionalRoutes from "../routes/regional.routes.js";
import quotationRoutes from "../routes/quotation.routes.js";
import callRoutes from "../routes/call.routes.js";
import emailService from "../services/email.service.js";

// Create Express app
const app = express();

// Stripe webhook needs raw body - must come before express.json()
app.use(
  "/api/v1/subscription/webhook",
  express.raw({ type: "application/json" })
);

// Other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/agency/auth", agencyAuthRoutes);
app.use("/api/v1/technician/auth", technicianAuthRoutes);
app.use("/api/v1/property-manager/auth", propertyManagerAuthRoutes);
app.use("/api/v1/team-member/auth", teamMemberAuthRoutes);
app.use("/api/v1/technicians", technicianRoutes);
app.use("/api/v1/property-managers", propertyManagerRoutes);
app.use("/api/v1/team-members", teamMemberRoutes);
app.use("/api/v1/jobs", jobRoutes);
app.use("/api/v1/properties", propertyRoutes);
app.use("/api/v1/contacts", contactsRoutes);
app.use("/api/v1/compliance", complianceRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/invoices", invoiceRoutes);
app.use("/api/v1/technician-payments", technicianPaymentRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/calendar", calendarRoutes);
app.use("/api/v1/subscription", subscriptionRoutes);
app.use("/api/v1/tenant", tenantRoutes);
app.use("/api/v1/emails", emailRoutes);
app.use("/api/v1", profileRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/v1/website-leads", websiteLeadRoutes);
app.use("/api/v1/regional", regionalRoutes);
app.use("/api/v1/quotations", quotationRoutes);
app.use("/api/v1/calls", callRoutes);

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
