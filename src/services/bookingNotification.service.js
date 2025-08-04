import emailService from "./email.service.js";
import bookingNotificationTemplates from "../utils/bookingNotificationTemplates.js";
import Agency from "../models/Agency.js";
import PropertyManager from "../models/PropertyManager.js";
import SuperUser from "../models/SuperUser.js";
import Technician from "../models/Technician.js";

class BookingNotificationService {
  constructor() {
    this.emailService = emailService;
  }

  /**
   * Send booking notifications to all relevant parties
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} emailLog - Email log object with tenant details
   * @returns {Promise<Object>} - Results of all notification attempts
   */
  async sendBookingNotifications(job, property, emailLog) {
    try {
      console.log("📧 Starting booking notifications for job:", job.job_id);

      const results = {
        tenant: null,
        agency: null,
        propertyManager: null,
        landlord: null,
        superUsers: [],
        technicians: [],
        errors: [],
      };

      // Format scheduled date for emails
      const scheduledDate = new Date(job.dueDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // 1. Send confirmation email to tenant
      try {
        await this.sendTenantConfirmation(
          job,
          property,
          emailLog,
          scheduledDate
        );
        results.tenant = { success: true, email: emailLog.tenantEmail };
        console.log("✅ Tenant confirmation sent to:", emailLog.tenantEmail);
      } catch (error) {
        results.tenant = { success: false, error: error.message };
        results.errors.push(`Tenant notification failed: ${error.message}`);
        console.error("❌ Tenant notification failed:", error.message);
      }

      // 2. Send notification to agency
      try {
        await this.sendAgencyNotification(
          job,
          property,
          emailLog,
          scheduledDate
        );
        results.agency = { success: true, email: property.agency.email };
        console.log("✅ Agency notification sent to:", property.agency.email);
      } catch (error) {
        results.agency = { success: false, error: error.message };
        results.errors.push(`Agency notification failed: ${error.message}`);
        console.error("❌ Agency notification failed:", error.message);
      }

      // 3. Send notification to property manager (if assigned)
      if (property.assignedPropertyManager) {
        try {
          await this.sendPropertyManagerNotification(
            job,
            property,
            emailLog,
            scheduledDate
          );
          results.propertyManager = {
            success: true,
            email: property.assignedPropertyManager.email,
          };
          console.log(
            "✅ Property manager notification sent to:",
            property.assignedPropertyManager.email
          );
        } catch (error) {
          results.propertyManager = { success: false, error: error.message };
          results.errors.push(
            `Property manager notification failed: ${error.message}`
          );
          console.error(
            "❌ Property manager notification failed:",
            error.message
          );
        }
      }

      // 4. Send notification to landlord
      try {
        await this.sendLandlordNotification(
          job,
          property,
          emailLog,
          scheduledDate
        );
        results.landlord = {
          success: true,
          email: property.currentLandlord.email,
        };
        console.log(
          "✅ Landlord notification sent to:",
          property.currentLandlord.email
        );
      } catch (error) {
        results.landlord = { success: false, error: error.message };
        results.errors.push(`Landlord notification failed: ${error.message}`);
        console.error("❌ Landlord notification failed:", error.message);
      }

      // 5. Send notifications to all super users
      try {
        const superUserResults = await this.sendSuperUserNotifications(
          job,
          property,
          emailLog,
          scheduledDate
        );
        results.superUsers = superUserResults;
        console.log(
          `✅ Super user notifications sent to ${superUserResults.length} users`
        );
      } catch (error) {
        results.errors.push(
          `Super user notifications failed: ${error.message}`
        );
        console.error("❌ Super user notifications failed:", error.message);
      }

      // 6. Send notifications to available technicians
      try {
        const technicianResults = await this.sendTechnicianNotifications(
          job,
          property,
          scheduledDate
        );
        results.technicians = technicianResults;
        console.log(
          `✅ Technician notifications sent to ${technicianResults.length} technicians`
        );
      } catch (error) {
        results.errors.push(
          `Technician notifications failed: ${error.message}`
        );
        console.error("❌ Technician notifications failed:", error.message);
      }

      console.log("📧 Booking notifications completed with results:", {
        totalErrors: results.errors.length,
        successfulNotifications:
          [
            results.tenant?.success,
            results.agency?.success,
            results.propertyManager?.success,
            results.landlord?.success,
          ].filter(Boolean).length +
          results.superUsers.length +
          results.technicians.length,
      });

      return results;
    } catch (error) {
      console.error("❌ Error in sendBookingNotifications:", error);
      throw error;
    }
  }

  /**
   * Send confirmation email to tenant
   */
  async sendTenantConfirmation(job, property, emailLog, scheduledDate) {
    const templateData = {
      tenantName: emailLog.tenantName,
      propertyAddress: property.address.fullAddress,
      jobType: job.jobType,
      scheduledDate: scheduledDate,
      jobId: job.job_id,
      complianceType: job.jobType,
    };

    await this.emailService.sendTemplatedEmail({
      to: emailLog.tenantEmail,
      templateName: "tenantBookingConfirmation",
      templateData: templateData,
      customTemplates: bookingNotificationTemplates,
    });
  }

  /**
   * Send notification to agency
   */
  async sendAgencyNotification(job, property, emailLog, scheduledDate) {
    const templateData = {
      agencyName: property.agency.contactPerson || property.agency.companyName,
      propertyAddress: property.address.fullAddress,
      jobType: job.jobType,
      scheduledDate: scheduledDate,
      jobId: job.job_id,
      tenantName: emailLog.tenantName,
      tenantEmail: emailLog.tenantEmail,
    };

    await this.emailService.sendTemplatedEmail({
      to: property.agency.email,
      templateName: "agencyBookingNotification",
      templateData: templateData,
      customTemplates: bookingNotificationTemplates,
    });
  }

  /**
   * Send notification to property manager
   */
  async sendPropertyManagerNotification(
    job,
    property,
    emailLog,
    scheduledDate
  ) {
    const templateData = {
      propertyManagerName: `${property.assignedPropertyManager.firstName} ${property.assignedPropertyManager.lastName}`,
      propertyAddress: property.address.fullAddress,
      jobType: job.jobType,
      scheduledDate: scheduledDate,
      jobId: job.job_id,
      tenantName: emailLog.tenantName,
      tenantEmail: emailLog.tenantEmail,
    };

    await this.emailService.sendTemplatedEmail({
      to: property.assignedPropertyManager.email,
      templateName: "propertyManagerBookingNotification",
      templateData: templateData,
      customTemplates: bookingNotificationTemplates,
    });
  }

  /**
   * Send notification to landlord
   */
  async sendLandlordNotification(job, property, emailLog, scheduledDate) {
    const templateData = {
      landlordName: property.currentLandlord.name,
      propertyAddress: property.address.fullAddress,
      jobType: job.jobType,
      scheduledDate: scheduledDate,
      jobId: job.job_id,
      tenantName: emailLog.tenantName,
    };

    await this.emailService.sendTemplatedEmail({
      to: property.currentLandlord.email,
      templateName: "landlordBookingNotification",
      templateData: templateData,
      customTemplates: bookingNotificationTemplates,
    });
  }

  /**
   * Send notifications to all super users
   */
  async sendSuperUserNotifications(job, property, emailLog, scheduledDate) {
    const superUsers = await SuperUser.find({ status: "Active" });
    const results = [];

    for (const superUser of superUsers) {
      try {
        const templateData = {
          superUserName: superUser.fullName,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          scheduledDate: scheduledDate,
          jobId: job.job_id,
          tenantName: emailLog.tenantName,
          agencyName: property.agency.companyName,
        };

        await this.emailService.sendTemplatedEmail({
          to: superUser.email,
          templateName: "superUserBookingNotification",
          templateData: templateData,
          customTemplates: bookingNotificationTemplates,
        });

        results.push({ success: true, email: superUser.email });
      } catch (error) {
        results.push({
          success: false,
          email: superUser.email,
          error: error.message,
        });
        console.error(
          `❌ Failed to send super user notification to ${superUser.email}:`,
          error.message
        );
      }
    }

    return results;
  }

  /**
   * Send notifications to available technicians
   */
  async sendTechnicianNotifications(job, property, scheduledDate) {
    // Find available technicians who can handle this job type
    const availableTechnicians = await Technician.find({
      status: "Active",
      availabilityStatus: "Available",
      currentJobs: { $lt: "$maxJobs" }, // Has capacity for more jobs
    });

    const results = [];

    for (const technician of availableTechnicians) {
      try {
        const templateData = {
          technicianName: `${technician.firstName} ${technician.lastName}`,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          scheduledDate: scheduledDate,
          jobId: job.job_id,
          estimatedDuration: job.estimatedDuration || 1,
        };

        await this.emailService.sendTemplatedEmail({
          to: technician.email,
          templateName: "technicianJobAvailable",
          templateData: templateData,
          customTemplates: bookingNotificationTemplates,
        });

        results.push({ success: true, email: technician.email });
      } catch (error) {
        results.push({
          success: false,
          email: technician.email,
          error: error.message,
        });
        console.error(
          `❌ Failed to send technician notification to ${technician.email}:`,
          error.message
        );
      }
    }

    return results;
  }
}

export default new BookingNotificationService();
