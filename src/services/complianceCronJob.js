import cron from "node-cron";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import EmailLog from "../models/EmailLog.js";
import notificationService from "./notification.service.js";
import emailService from "./email.service.js";

class ComplianceCronJob {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
    this.sentEmails = new Set(); // Track sent emails to prevent duplicates
    this.debugLoggingEnabled = process.env.COMPLIANCE_CRON_DEBUG === "true";
  }

  logMessage(message, level = "info") {
    if (level === "debug" && !this.debugLoggingEnabled) {
      return;
    }
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  // Generate unique key for email tracking with 2-month window
  generateEmailKey(propertyId, complianceType, inspectionDate) {
    // Create a 2-month window around the inspection date
    const twoMonthsInMs = 60 * 24 * 60 * 60 * 1000; // 60 days
    const startOfWindow = new Date(inspectionDate.getTime() - twoMonthsInMs);
    const endOfWindow = new Date(inspectionDate.getTime() + twoMonthsInMs);

    // Use the start of the window as the key date
    const windowStartDate = startOfWindow.toDateString();
    return `${propertyId}_${complianceType}_${windowStartDate}`;
  }

  // Check if email was already sent in 2 months (database check)
  async hasEmailBeenSent(propertyId, complianceType, inspectionDate) {
    const emailLogs = await EmailLog.find({
      propertyId: propertyId,
      complianceType: complianceType,
    });

    for (const emailLog of emailLogs) {
      if (emailLog) {
        // Check if the inspection date is less than 2 months from the inspection date
        const twoMonthsInMs = 60 * 24 * 60 * 60 * 1000; // 60 days
        const timeDifference = Math.abs(
          inspectionDate.getTime() - emailLog.inspectionDate.getTime()
        );

        if (timeDifference < twoMonthsInMs) {
          this.logMessage(
            `⏭️ Email already sent for ${propertyId} - ${complianceType} within 2 months (${inspectionDate.toDateString()}) - Skipping duplicate email`,
            "debug"
          );
          return true;
        }
      }
    }

    return false;
  }

  // Mark email as sent (both database and in-memory)
  async markEmailAsSent(propertyId, complianceType, inspectionDate) {
    const emailKey = this.generateEmailKey(
      propertyId,
      complianceType,
      inspectionDate
    );
    this.sentEmails.add(emailKey);
  }

  // Database tracking - log email sent to database
  async logEmailToDatabase(
    property,
    complianceType,
    inspectionDate,
    emailResult,
    verificationToken = null,
    tokenExpiresAt = null
  ) {
    try {
      // Generate verification token if not provided
      if (!verificationToken) {
        verificationToken = EmailLog.generateVerificationToken();
      }

      if (!tokenExpiresAt) {
        tokenExpiresAt = new Date();
        tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // Token expires in 30 days
      }

      const emailLog = new EmailLog({
        propertyId: property._id,
        propertyAddress: property.address.fullAddress,
        tenantEmail: property.currentTenant.email,
        tenantName: property.currentTenant.name,
        complianceType: complianceType,
        jobType: this.getJobTypeFromComplianceType(complianceType),
        inspectionDate: inspectionDate,
        emailSentAt: new Date(),
        emailStatus: emailResult ? "sent" : "failed",
        emailResult: emailResult,
        trackingKey: this.generateEmailKey(
          property._id,
          complianceType,
          inspectionDate
        ),
        verificationToken: verificationToken,
        tokenExpiresAt: tokenExpiresAt,
        notes: emailResult ? "Email sent successfully" : "Email sending failed",
      });

      await emailLog.save();
      this.logMessage(
        `📧 Email logged to database: ${emailLog._id} with token: ${verificationToken}`
      );

      return verificationToken;
    } catch (error) {
      this.logMessage(`❌ Error logging email to database: ${error.message}`);
      return null;
    }
  }

  // Get email history for a property
  async getEmailHistory(propertyId) {
    try {
      const emailHistory = await EmailLog.getPropertyEmailHistory(propertyId);
      return emailHistory;
    } catch (error) {
      this.logMessage(`❌ Error getting email history: ${error.message}`);
      return [];
    }
  }

  // Initialize in-memory tracking from database
  async initializeEmailTracking() {
    try {
      // Get recent email logs (last 30 days) to populate in-memory tracking
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentEmails = await EmailLog.find({
        emailSentAt: { $gte: thirtyDaysAgo },
        emailStatus: "sent",
      }).select("trackingKey");

      // Populate in-memory tracking
      for (const email of recentEmails) {
        this.sentEmails.add(email.trackingKey);
      }

      this.logMessage(
        `📧 Initialized email tracking with ${recentEmails.length} recent emails from database`
      );
    } catch (error) {
      this.logMessage(`❌ Error initializing email tracking: ${error.message}`);
    }
  }

  // Verify booking token
  async verifyBookingToken(token) {
    try {
      const result = await EmailLog.verifyToken(token);

      if (result.valid) {
        this.logMessage(
          `✅ Token verified successfully for ${result.emailLog.tenantName}`
        );
        return {
          valid: true,
          emailLog: result.emailLog,
          message: "Token is valid and not expired",
        };
      } else {
        this.logMessage(`❌ Token verification failed: ${result.reason}`);
        return {
          valid: false,
          message: result.reason,
        };
      }
    } catch (error) {
      this.logMessage(`❌ Error verifying token: ${error.message}`);
      return {
        valid: false,
        message: "Error verifying token",
      };
    }
  }

  // Mark token as used
  async markTokenAsUsed(token) {
    try {
      const success = await EmailLog.markTokenAsUsed(token);

      if (success) {
        this.logMessage(`✅ Token marked as used: ${token}`);
        return true;
      } else {
        this.logMessage(`❌ Failed to mark token as used: ${token}`);
        return false;
      }
    } catch (error) {
      this.logMessage(`❌ Error marking token as used: ${error.message}`);
      return false;
    }
  }

  // Get active tokens (for debugging)
  async getActiveTokens() {
    try {
      const activeTokens = await EmailLog.getActiveTokens();
      this.logMessage(`📋 Found ${activeTokens.length} active tokens`);

      activeTokens.forEach((token, index) => {
        this.logMessage(
          `  ${index + 1}. Token: ${token.verificationToken.substring(
            0,
            8
          )}... | Tenant: ${token.tenantEmail} | Property: ${
            token.propertyAddress
          } | Expires: ${token.tokenExpiresAt}`
        );
      });

      return activeTokens;
    } catch (error) {
      this.logMessage(`❌ Error getting active tokens: ${error.message}`);
      return [];
    }
  }

  // Check email history for debugging
  async checkEmailHistory(propertyId, complianceType, inspectionDate) {
    try {
      const trackingKey = this.generateEmailKey(
        propertyId,
        complianceType,
        inspectionDate
      );
      const emailHistory = await EmailLog.find({ trackingKey }).sort({
        emailSentAt: -1,
      });

      /* if (emailHistory.length > 0) {
        emailHistory.forEach((log, index) => {
          this.logMessage(
            `  ${index + 1}. Status: ${log.emailStatus}, Sent: ${
              log.emailSentAt
            }, Tenant: ${log.tenantName}, Token: ${
              log.verificationToken
                ? log.verificationToken.substring(0, 8) + "..."
                : "N/A"
            }`
          );
        });
        return emailHistory;
      } else {
        this.logMessage(`📧 No email history found for ${trackingKey}`);
        return [];
      } */
    } catch (error) {
      this.logMessage(`❌ Error checking email history: ${error.message}`);
      return [];
    }
  }

  // Get email statistics
  async getEmailStats() {
    try {
      const stats = await EmailLog.getEmailStats();
      this.logMessage(`📊 Email Statistics: ${JSON.stringify(stats, null, 2)}`);
      return stats;
    } catch (error) {
      this.logMessage(`❌ Error getting email stats: ${error.message}`);
      return {};
    }
  }

  // Clean up old email tracking (older than 30 days)
  cleanupOldEmailTracking() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keysToRemove = [];
    for (const key of this.sentEmails) {
      const parts = key.split("_");
      if (parts.length >= 3) {
        const dateString = parts.slice(2).join("_");
        const emailDate = new Date(dateString);
        if (emailDate < thirtyDaysAgo) {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach((key) => this.sentEmails.delete(key));
    if (keysToRemove.length > 0) {
      this.logMessage(
        `🧹 Cleaned up ${keysToRemove.length} old email tracking records`
      );
    }
  }

  getDateRange() {
    const now = new Date();
    // Set to start of today (00:00:00)
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    // Set to end of day 30 days from now (23:59:59)
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 30,
      23,
      59,
      59
    );
    return { startOfToday, endOfMonth };
  }

  getComplianceQuery(startOfToday, endOfMonth) {
    return {
      isActive: true,
      $or: [
        {
          "complianceSchedule.gasCompliance.nextInspection": {
            $gte: startOfToday,
            $lte: endOfMonth,
          },
        },
        {
          "complianceSchedule.electricalSafety.nextInspection": {
            $gte: startOfToday,
            $lte: endOfMonth,
          },
        },
        {
          "complianceSchedule.smokeAlarms.nextInspection": {
            $gte: startOfToday,
            $lte: endOfMonth,
          },
        },
      ],
    };
  }

  checkComplianceType(compliance, type, startOfToday, endOfMonth) {
    const inspection = compliance[type];
    if (
      inspection.nextInspection &&
      inspection.nextInspection >= startOfToday &&
      inspection.nextInspection <= endOfMonth
    ) {
      return `${type}: ${inspection.nextInspection.toDateString()}`;
    }
    return null;
  }

  getUpcomingInspections(property, startOfToday, endOfMonth) {
    const compliance = property.complianceSchedule;
    const upcomingInspections = [];

    // Check each compliance type
    const gasInspection = this.checkComplianceType(
      compliance,
      "gasCompliance",
      startOfToday,
      endOfMonth
    );
    if (gasInspection) upcomingInspections.push(gasInspection);

    const electricalInspection = this.checkComplianceType(
      compliance,
      "electricalSafety",
      startOfToday,
      endOfMonth
    );
    if (electricalInspection) upcomingInspections.push(electricalInspection);

    const smokeInspection = this.checkComplianceType(
      compliance,
      "smokeAlarms",
      startOfToday,
      endOfMonth
    );
    if (smokeInspection) upcomingInspections.push(smokeInspection);

    // Check pool safety only if required
    if (compliance.poolSafety.required) {
      const poolInspection = this.checkComplianceType(
        compliance,
        "poolSafety",
        startOfToday,
        endOfMonth
      );
      if (poolInspection) upcomingInspections.push(poolInspection);
    }

    return upcomingInspections;
  }

  getJobTypeFromComplianceType(complianceType) {
    const jobTypeMap = {
      gasCompliance: "Gas Safety Inspection",
      electricalSafety: "Electrical Safety Inspection",
      smokeAlarms: "Smoke Alarm Inspection",
      poolSafety: "Pool Safety Inspection",
    };
    return jobTypeMap[complianceType] || "Routine Inspection";
  }

  async sendTenantNotificationEmail(property, complianceType, inspectionDate) {
    try {
      // Check if email was already sent
      if (
        await this.hasEmailBeenSent(
          property._id,
          complianceType,
          inspectionDate
        )
      ) {
        this.logMessage(
          `⏭️ Email already sent for ${
            property.address.fullAddress
          } - ${this.getJobTypeFromComplianceType(
            complianceType
          )} (${inspectionDate.toDateString()}) - Skipping duplicate`,
          "debug"
        );

        // Log the email history for debugging
        await this.checkEmailHistory(
          property._id,
          complianceType,
          inspectionDate
        );

        return false;
      }

      const tenantEmail = property.currentTenant.email;
      const tenantName = property.currentTenant.name;
      const propertyAddress = property.address.fullAddress;
      const jobType = this.getJobTypeFromComplianceType(complianceType);

      this.logMessage(
        `📧 Sending email to tenant ${tenantName} (${tenantEmail}) for ${jobType} at ${propertyAddress}`
      );

      // Generate verification token first
      const verificationToken = await EmailLog.generateVerificationToken();
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30); // Token expires in 30 days

      // Create booking link with verification token
      const bookingLink = `${process.env.FRONTEND_URL}/book-inspection/${property._id}/${complianceType}?token=${verificationToken}`;

      this.logMessage(`🔗 Booking link created: ${bookingLink}`);

      // Use the new tenantInspectionBooking template with actual booking link
      const emailResult = await emailService.sendTemplatedEmail({
        to: tenantEmail,
        templateName: "tenantInspectionBooking",
        templateData: {
          tenantName: tenantName,
          propertyAddress: propertyAddress,
          jobType: jobType,
          inspectionDate: inspectionDate.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          bookingLink: bookingLink,
          complianceType: jobType,
        },
      });

      // Mark email as sent (in-memory)
      await this.markEmailAsSent(property._id, complianceType, inspectionDate);

      // Log to database with verification token
      await this.logEmailToDatabase(
        property,
        complianceType,
        inspectionDate,
        emailResult,
        verificationToken,
        tokenExpiresAt
      );

      this.logMessage(
        `✅ Email sent successfully to tenant ${tenantName} (${tenantEmail}) for ${jobType} at ${propertyAddress}`
      );

      return true;
    } catch (error) {
      this.logMessage(
        `❌ Error sending email to tenant for ${property.address.fullAddress}: ${error.message}`
      );

      // Log failed email attempt
      await this.logEmailToDatabase(
        property,
        complianceType,
        inspectionDate,
        null
      );

      return false;
    }
  }

  async processPropertyCompliance(property, startOfToday, endOfMonth) {
    try {
      const compliance = property.complianceSchedule;
      let emailsSent = 0;

      // Check each compliance type and send emails
      const complianceTypes = [
        { type: "gasCompliance", jobType: "Gas Safety Inspection" },
        { type: "electricalSafety", jobType: "Electrical Safety Inspection" },
        { type: "smokeAlarms", jobType: "Smoke Alarm Inspection" },
      ];

      // Add pool safety only if required
      if (compliance.poolSafety.required) {
        complianceTypes.push({
          type: "poolSafety",
          jobType: "Pool Safety Inspection",
        });
      }

      for (const { type, jobType } of complianceTypes) {
        const inspection = compliance[type];
        if (
          inspection.nextInspection &&
          inspection.nextInspection >= startOfToday &&
          inspection.nextInspection <= endOfMonth
        ) {
          const emailSent = await this.sendTenantNotificationEmail(
            property,
            type,
            inspection.nextInspection
          );
          if (emailSent) {
            emailsSent++;
          }
        }
      }

      return emailsSent;
    } catch (error) {
      this.logMessage(
        `Error processing compliance for ${property.address.fullAddress}: ${error.message}`
      );
      return 0;
    }
  }

  async fetchPropertiesWithUpcomingCompliance() {
    try {
      const { startOfToday, endOfMonth } = this.getDateRange();
      const query = this.getComplianceQuery(startOfToday, endOfMonth);

      const properties = await Property.find(query)
        .populate("agency", "name")
        .populate("assignedPropertyManager", "name email")
        .select(
          "address complianceSchedule agency assignedPropertyManager currentTenant"
        );

      return { properties, startOfToday, endOfMonth };
    } catch (error) {
      this.logMessage(
        `Error fetching properties with upcoming compliance: ${error.message}`
      );
      return { properties: [], startOfToday: null, endOfMonth: null };
    }
  }

  async logComplianceResults(properties, startOfToday, endOfMonth) {
    if (properties.length > 0) {
      this.logMessage(
        `Found ${properties.length} active properties with compliance due within 1 month:`
      );

      let totalEmailsSent = 0;

      for (const property of properties) {
        const upcomingInspections = this.getUpcomingInspections(
          property,
          startOfToday,
          endOfMonth
        );

        this.logMessage(
          `Property: ${
            property.address.fullAddress
          } - ${upcomingInspections.join(", ")}`
        );

        // Process compliance and send notifications
        const emailsSent = await this.processPropertyCompliance(
          property,
          startOfToday,
          endOfMonth
        );
        totalEmailsSent += emailsSent;
      }

      this.logMessage(
        `📊 Summary: Sent ${totalEmailsSent} email notifications to tenants`
      );
    } else {
      this.logMessage(
        "No active properties with compliance due within 1 month"
      );
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initialize email tracking on server start
    await this.initializeEmailTracking();

    // Schedule a job that runs every 15 seconds
    this.cronJob = cron.schedule(
      "*/15 * * * * *",
      async () => {
        this.logMessage("hey 👋");

        // Clean up old email tracking
        this.cleanupOldEmailTracking();

        // Fetch and log properties with upcoming compliance
        const { properties, startOfToday, endOfMonth } =
          await this.fetchPropertiesWithUpcomingCompliance();
        await this.logComplianceResults(properties, startOfToday, endOfMonth);
      },
      {
        scheduled: true,
        timezone: "UTC",
      }
    );

    this.logMessage(
      'Compliance cron job started - will log "hey 👋" every 15 seconds and check compliance schedules'
    );
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.isRunning = false;
      this.logMessage("Compliance cron job stopped");
    }
  }
}

export default ComplianceCronJob;
