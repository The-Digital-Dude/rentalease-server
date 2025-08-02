import Notification from "../models/Notification.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import Property from "../models/Property.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";

class NotificationService {
  constructor() {
    this.notificationHandlers = {
      // Current notification handler (Facebook-style)
      notification: this.sendInAppNotification.bind(this),
      // Future handlers (commented out for now)
      // email: this.sendEmailNotification.bind(this),
      // sms: this.sendSMSNotification.bind(this),
    };
  }

  /**
   * Get PropertyManagers assigned to a property
   * @param {String} propertyId - Property ID
   * @returns {Array} Array of PropertyManager objects
   */
  async getPropertyManagersForProperty(propertyId) {
    try {
      // Find PropertyManagers who have this property in their assignedProperties
      const propertyManagers = await PropertyManager.find({
        "assignedProperties.propertyId": propertyId,
        "assignedProperties.status": "Active",
      });

      return propertyManagers;
    } catch (error) {
      console.error("Error getting PropertyManagers for property:", error);
      return [];
    }
  }

  /**
   * Send notification to multiple recipients
   * @param {Array} recipients - Array of recipient objects {recipientType, recipientId}
   * @param {Object} notificationData - Notification data
   * @param {Array} channels - Array of channels to send through ['notification', 'email', 'sms']
   */
  async sendNotification(
    recipients,
    notificationData,
    channels = ["notification"]
  ) {
    try {
      const results = [];

      for (const recipient of recipients) {
        for (const channel of channels) {
          if (this.notificationHandlers[channel]) {
            try {
              const result = await this.notificationHandlers[channel](
                recipient,
                notificationData
              );
              results.push({
                recipient,
                channel,
                success: true,
                result,
              });
            } catch (error) {
              console.error(`Failed to send ${channel} notification:`, error);
              results.push({
                recipient,
                channel,
                success: false,
                error: error.message,
              });
            }
          }
        }
      }

      return results;
    } catch (error) {
      console.error("Error in sendNotification:", error);
      throw error;
    }
  }

  /**
   * Send in-app notification (Facebook-style)
   * @param {Object} recipient - Recipient object
   * @param {Object} notificationData - Notification data
   */
  async sendInAppNotification(recipient, notificationData) {
    try {
      const notification = new Notification({
        recipient: {
          recipientType: recipient.recipientType,
          recipientId: recipient.recipientId,
        },
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data || {},
        priority: notificationData.priority || "Medium",
        expiresAt: notificationData.expiresAt || null,
      });

      await notification.save();

      console.log(
        `✅ In-app notification sent to ${recipient.recipientType}:${recipient.recipientId}`,
        {
          type: notificationData.type,
          title: notificationData.title,
          timestamp: new Date().toISOString(),
        }
      );

      return notification.getSummary();
    } catch (error) {
      console.error("Error sending in-app notification:", error);
      throw error;
    }
  }

  /**
   * Send job creation notification to agency, super users, and assigned PropertyManagers
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} creator - Creator object
   */
  async sendJobCreationNotification(job, property, creator) {
    try {
      const recipients = [];

      // Add agency as recipient
      if (job.owner.ownerType === "Agency") {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      }

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      // Add PropertyManagers assigned to this property
      const propertyManagers = await this.getPropertyManagersForProperty(
        property._id
      );
      propertyManagers.forEach((propertyManager) => {
        recipients.push({
          recipientType: "PropertyManager",
          recipientId: propertyManager._id,
        });
      });

      // Prepare notification data
      const notificationData = {
        type: "JOB_CREATED",
        title: `New ${job.jobType} Job Created`,
        message: `A new ${job.jobType} job has been created for property at ${
          property.address.fullAddress
        }. Due date: ${new Date(job.dueDate).toLocaleDateString()}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property._id,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          dueDate: job.dueDate,
          priority: job.priority,
          creator: {
            userType: creator.userType,
            userId: creator.userId,
          },
        },
        priority: job.priority === "Urgent" ? "Urgent" : "High",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      console.log(
        `✅ Job creation notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          propertyAddress: property.address.fullAddress,
          results: results.length,
          propertyManagersNotified: propertyManagers.length,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending job creation notification:", error);
      throw error;
    }
  }

  /**
   * Send compliance job creation notification
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   */
  async sendComplianceJobNotification(job, property) {
    try {
      const recipients = [];

      // Add agency as recipient
      if (job.owner.ownerType === "Agency") {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      }

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      const technicians = await Technician.find();
      technicians.forEach((technician) => {
        recipients.push({
          recipientType: "Technician",
          recipientId: technician._id,
        });
      });

      // Add PropertyManagers assigned to this property
      const propertyManagers = await this.getPropertyManagersForProperty(
        property._id
      );
      propertyManagers.forEach((propertyManager) => {
        recipients.push({
          recipientType: "PropertyManager",
          recipientId: propertyManager._id,
        });
      });

      // Prepare notification data
      const notificationData = {
        type: "COMPLIANCE_DUE",
        title: `Compliance ${job.jobType} Due`,
        message: `A compliance ${
          job.jobType
        } inspection is due for property at ${
          property.address.fullAddress
        }. Due date: ${new Date(job.dueDate).toLocaleDateString()}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property._id,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          dueDate: job.dueDate,
          complianceType: job.jobType,
        },
        priority: "High",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      console.log(
        `✅ Compliance job notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          propertyAddress: property.address.fullAddress,
          results: results.length,
          propertyManagersNotified: propertyManagers.length,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending compliance job notification:", error);
      throw error;
    }
  }

  /**
   * Send job assignment notification to technician, agency, and super users
   * @param {Object} job - Job object
   * @param {Object} technician - Technician object
   * @param {Object} assignedBy - User who assigned the job
   * @param {Object} property - Property object (optional)
   */
  async sendJobAssignmentNotification(
    job,
    technician,
    assignedBy,
    property = null
  ) {
    try {
      console.log(technician, "technician");
      const recipients = [];

      // Add technician as recipient
      recipients.push({
        recipientType: "Technician",
        recipientId: technician._id,
      });

      console.log(recipients, "recipients");

      // Add agency as recipient (if job belongs to an agency)
      if (job.owner.ownerType === "Agency") {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      }

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      // Get property details if not provided
      if (!property && job.property) {
        property = await Property.findById(job.property).populate("address");
      }

      const propertyAddress =
        property?.address?.fullAddress || "Unknown address";

      // Prepare notification data
      const notificationData = {
        type: "JOB_ASSIGNED",
        title: `${job.jobType} Job Assigned`,
        message: `${assignedBy.name} has assigned a ${
          job.jobType
        } job at ${propertyAddress} to ${
          technician.fullName
        }. Due date: ${new Date(job.dueDate).toLocaleDateString()}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property?._id,
          propertyAddress: propertyAddress,
          jobType: job.jobType,
          dueDate: job.dueDate,
          priority: job.priority,
          technician: {
            id: technician._id,
            fullName: technician.fullName,
            email: technician.email,
          },
          assignedBy: {
            userType: assignedBy.type,
            userId: assignedBy.userId,
            name: assignedBy.name,
          },
        },
        priority: job.priority === "Urgent" ? "Urgent" : "High",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      // Get PropertyManagers for logging
      let propertyManagersNotified = 0;
      if (property) {
        const propertyManagers = await this.getPropertyManagersForProperty(
          property._id
        );
        propertyManagersNotified = propertyManagers.length;
      }

      console.log(
        `✅ Job assignment notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          technicianName: technician.fullName,
          assignedBy: assignedBy.name,
          propertyAddress: propertyAddress,
          results: results.length,
          propertyManagersNotified: propertyManagersNotified,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending job assignment notification:", error);
      throw error;
    }
  }

  /**
   * Send job completion notification
   * @param {Object} job - Job object
   * @param {Object} technician - Technician object
   * @param {Object} completedBy - User who completed the job
   * @param {Object} property - Property object
   */
  async sendJobCompletionNotification(
    job,
    technician,
    completedBy,
    property = null
  ) {
    try {
      const recipients = [];

      // Add agency as recipient (if job belongs to an agency)
      if (job.owner.ownerType === "Agency") {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      }

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      // Get property details if not provided
      if (!property && job.property) {
        property = await Property.findById(job.property).populate("address");
      }

      // Add PropertyManagers assigned to this property
      if (property) {
        const propertyManagers = await this.getPropertyManagersForProperty(
          property._id
        );
        propertyManagers.forEach((propertyManager) => {
          recipients.push({
            recipientType: "PropertyManager",
            recipientId: propertyManager._id,
          });
        });
      }

      const propertyAddress =
        property?.address?.fullAddress || "Unknown address";

      // Prepare notification data
      const notificationData = {
        type: "JOB_COMPLETED",
        title: `${job.jobType} Job Completed`,
        message: `${completedBy.name} has completed a ${
          job.jobType
        } job at ${propertyAddress}. Completed on: ${new Date().toLocaleDateString()}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property?._id,
          propertyAddress: propertyAddress,
          jobType: job.jobType,
          dueDate: job.dueDate,
          completedAt: job.completedAt,
          priority: job.priority,
          technician: {
            id: technician._id,
            fullName: technician.fullName,
            email: technician.email,
          },
          completedBy: {
            userType: completedBy.type,
            userId: completedBy.userId,
            name: completedBy.name,
          },
        },
        priority: "Medium",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      // Get PropertyManagers for logging
      let propertyManagersNotified = 0;
      if (property) {
        const propertyManagers = await this.getPropertyManagersForProperty(
          property._id
        );
        propertyManagersNotified = propertyManagers.length;
      }

      console.log(
        `✅ Job completion notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          technicianName: technician.fullName,
          completedBy: completedBy.name,
          propertyAddress: propertyAddress,
          results: results.length,
          propertyManagersNotified: propertyManagersNotified,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending job completion notification:", error);
      throw error;
    }
  }

  /**
   * Send invoice created notification
   * @param {Object} invoice - Invoice object
   * @param {Object} job - Job object
   * @param {Object} technician - Technician object
   * @param {Object} agency - Agency object
   * @param {Object} createdBy - User who created the invoice
   */
  async sendInvoiceCreatedNotification(
    invoice,
    job,
    technician,
    agency,
    createdBy
  ) {
    try {
      const recipients = [];

      // Add agency as recipient
      recipients.push({
        recipientType: "Agency",
        recipientId: agency._id,
      });

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      // Prepare notification data
      const notificationData = {
        type: "INVOICE_CREATED",
        title: `New Invoice Created`,
        message: `${createdBy.name} has created a new invoice for job ${
          job.job_id
        }. Total: $${invoice.totalCost.toFixed(2)}`,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          jobId: job._id,
          job_id: job.job_id,
          jobType: job.jobType,
          technician: {
            id: technician._id,
            fullName: `${technician.firstName} ${technician.lastName}`,
            email: technician.email,
          },
          agency: {
            id: agency._id,
            companyName: agency.companyName,
            contactPerson: agency.contactPerson,
          },
          totalCost: invoice.totalCost,
          status: invoice.status,
          createdBy: {
            userType: createdBy.type,
            userId: createdBy.id,
            name: createdBy.name,
          },
        },
        priority: "Medium",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      console.log(
        `✅ Invoice created notifications sent to ${recipients.length} recipients`,
        {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          jobId: job._id,
          totalCost: invoice.totalCost,
          createdBy: createdBy.name,
          results: results.length,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending invoice created notification:", error);
      throw error;
    }
  }

  /**
   * Send invoice sent notification
   * @param {Object} invoice - Invoice object
   * @param {Object} sentBy - User who sent the invoice
   */
  async sendInvoiceSentNotification(invoice, sentBy) {
    try {
      const recipients = [];

      // Add agency as recipient
      recipients.push({
        recipientType: "Agency",
        recipientId: invoice.agencyId,
      });

      // Add all super users as recipients
      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) => {
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        });
      });

      // Prepare notification data
      const notificationData = {
        type: "INVOICE_SENT",
        title: `Invoice Sent`,
        message: `${sentBy.name} has sent invoice ${
          invoice.invoiceNumber
        } to the agency. Total: $${invoice.totalCost.toFixed(2)}`,
        data: {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          jobId: invoice.jobId,
          totalCost: invoice.totalCost,
          status: invoice.status,
          sentAt: invoice.sentAt,
          sentBy: {
            userType: sentBy.type,
            userId: sentBy.id,
            name: sentBy.name,
          },
        },
        priority: "Medium",
      };

      // Send notifications
      const results = await this.sendNotification(recipients, notificationData);

      console.log(
        `✅ Invoice sent notifications sent to ${recipients.length} recipients`,
        {
          invoiceId: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          totalCost: invoice.totalCost,
          sentBy: sentBy.name,
          results: results.length,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending invoice sent notification:", error);
      throw error;
    }
  }

  /**
   * Get notifications for a recipient
   * @param {String} recipientType - Recipient type
   * @param {String} recipientId - Recipient ID
   * @param {Object} options - Query options
   */
  async getNotifications(recipientType, recipientId, options = {}) {
    try {
      const notifications = await Notification.getNotificationsForRecipient(
        recipientType,
        recipientId,
        options
      );

      return notifications.map((notification) => notification.getSummary());
    } catch (error) {
      console.error("Error getting notifications:", error);
      throw error;
    }
  }

  /**
   * Get unread count for a recipient
   * @param {String} recipientType - Recipient type
   * @param {String} recipientId - Recipient ID
   */
  async getUnreadCount(recipientType, recipientId) {
    try {
      return await Notification.getUnreadCount(recipientType, recipientId);
    } catch (error) {
      console.error("Error getting unread count:", error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * @param {String} notificationId - Notification ID
   */
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error("Notification not found");
      }

      return await notification.markAsRead();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a recipient
   * @param {String} recipientType - Recipient type
   * @param {String} recipientId - Recipient ID
   */
  async markAllAsRead(recipientType, recipientId) {
    try {
      const result = await Notification.updateMany(
        {
          "recipient.recipientType": recipientType,
          "recipient.recipientId": recipientId,
          status: "Unread",
        },
        {
          status: "Read",
          readAt: new Date(),
        }
      );

      return result;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  /**
   * Archive notification
   * @param {String} notificationId - Notification ID
   */
  async archiveNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error("Notification not found");
      }

      return await notification.archive();
    } catch (error) {
      console.error("Error archiving notification:", error);
      throw error;
    }
  }

  // Future methods for email and SMS (commented out for now)
  /*
  async sendEmailNotification(recipient, notificationData) {
    // TODO: Implement email notification
    console.log("Email notification would be sent:", { recipient, notificationData });
  }

  async sendSMSNotification(recipient, notificationData) {
    // TODO: Implement SMS notification
    console.log("SMS notification would be sent:", { recipient, notificationData });
  }
  */
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
