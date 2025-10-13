import mongoose from "mongoose";
import Notification from "../models/Notification.js";
import Agency from "../models/Agency.js";
import SuperUser from "../models/SuperUser.js";
import Property from "../models/Property.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";
import Job from "../models/Job.js";
import emailService from "./email.service.js";

class NotificationService {
  constructor() {
    this.notificationHandlers = {
      // Current notification handler (Facebook-style)
      notification: this.sendInAppNotification.bind(this),
      // Email notification handler
      email: this.sendEmailNotification.bind(this),
    };
  }

  toIdString(value) {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return value;
    }

    if (typeof value === "number") {
      return value.toString();
    }

    if (value instanceof mongoose.Types.ObjectId) {
      return value.toString();
    }

    if (typeof value === "object") {
      if (value._id) {
        return value._id.toString();
      }
      if (value.id) {
        return value.id.toString();
      }
      if (typeof value.toHexString === "function") {
        return value.toHexString();
      }
    }

    return null;
  }

  addRecipientIfNeeded(recipients, seenRecipients, recipientType, recipientId) {
    const id = this.toIdString(recipientId);
    if (!id) {
      return;
    }

    const key = `${recipientType}:${id}`;
    if (seenRecipients.has(key)) {
      return;
    }

    seenRecipients.add(key);
    recipients.push({ recipientType, recipientId: id });
  }

  async resolvePropertyIds(notificationData) {
    const propertyIds = new Set();
    const data = notificationData?.data || {};

    const add = (value) => {
      if (!value) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(add);
        return;
      }

      const id = this.toIdString(value);
      if (id) {
        propertyIds.add(id);
      }
    };

    add(data.propertyId);
    add(data.property);
    add(data.propertyIds);
    add(data.properties);

    if (data.propertyDetails) {
      add(data.propertyDetails);
      add(data.propertyDetails?.id);
      add(data.propertyDetails?._id);
    }

    if (propertyIds.size === 0 && data.jobId) {
      const jobIds = Array.isArray(data.jobId) ? data.jobId : [data.jobId];

      for (const jobIdRaw of jobIds) {
        const jobId = this.toIdString(jobIdRaw);
        if (!jobId) {
          continue;
        }

        try {
          const job = await Job.findById(jobId).select("property");
          if (job?.property) {
            propertyIds.add(this.toIdString(job.property));
          }
        } catch (error) {
          console.error(
            "Error resolving propertyId from jobId while sending notification:",
            {
              jobId,
              error: error.message,
            }
          );
        }
      }
    }

    if (propertyIds.size === 0 && data.job) {
      add(data.job?.property);
      add(data.job?.propertyId);
    }

    return Array.from(propertyIds).filter(Boolean);
  }

  async extendRecipientsWithPropertyManagers(recipients, notificationData) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return [];
    }

    const dedupedRecipients = [];
    const seenRecipients = new Set();

    recipients.forEach((recipient) => {
      if (!recipient) {
        return;
      }
      this.addRecipientIfNeeded(
        dedupedRecipients,
        seenRecipients,
        recipient.recipientType,
        recipient.recipientId
      );
    });

    const hasAgencyRecipient = dedupedRecipients.some(
      (recipient) => recipient.recipientType === "Agency"
    );

    if (!hasAgencyRecipient) {
      return dedupedRecipients;
    }

    const propertyIds = await this.resolvePropertyIds(notificationData);

    if (propertyIds.length === 0) {
      return dedupedRecipients;
    }

    const propertyManagerCache = new Map();

    for (const propertyId of propertyIds) {
      if (!propertyId) {
        continue;
      }

      let propertyManagers = propertyManagerCache.get(propertyId);
      if (!propertyManagers) {
        propertyManagers = await this.getPropertyManagersForProperty(propertyId);
        propertyManagerCache.set(propertyId, propertyManagers || []);
      }

      propertyManagers.forEach((propertyManager) => {
        this.addRecipientIfNeeded(
          dedupedRecipients,
          seenRecipients,
          "PropertyManager",
          propertyManager._id
        );
      });
    }

    return dedupedRecipients;
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
      const expandedRecipients = await this.extendRecipientsWithPropertyManagers(
        recipients,
        notificationData
      );

      const results = [];

      for (const recipient of expandedRecipients) {
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
   * Send email notification
   * @param {Object} recipient - Recipient object
   * @param {Object} notificationData - Notification data
   */
  async sendEmailNotification(recipient, notificationData) {
    try {
      // Get recipient details based on type
      let recipientDetails = null;

      console.log(
        `🔍 Looking up recipient: ${recipient.recipientType}:${recipient.recipientId}`
      );

      switch (recipient.recipientType) {
        case "SuperUser":
          const superUser = await SuperUser.findById(recipient.recipientId);
          if (superUser) {
            recipientDetails = {
              email: superUser.email,
              name: superUser.fullName || "Super User",
              type: "SuperUser",
            };
            console.log(`✅ Found SuperUser: ${superUser.email}`);
          } else {
            console.warn(`❌ SuperUser not found: ${recipient.recipientId}`);
          }
          break;
        case "Agency":
          const agency = await Agency.findById(recipient.recipientId);
          if (agency) {
            recipientDetails = {
              email: agency.email,
              name: agency.contactPerson,
              type: "Agency",
            };
            console.log(`✅ Found Agency: ${agency.email}`);
          } else {
            console.warn(`❌ Agency not found: ${recipient.recipientId}`);
          }
          break;
        case "PropertyManager":
          const propertyManager = await PropertyManager.findById(
            recipient.recipientId
          );
          if (propertyManager) {
            recipientDetails = {
              email: propertyManager.email,
              name: `${propertyManager.firstName} ${propertyManager.lastName}`,
              type: "PropertyManager",
            };
            console.log(`✅ Found PropertyManager: ${propertyManager.email}`);
          } else {
            console.warn(
              `❌ PropertyManager not found: ${recipient.recipientId}`
            );
          }
          break;
        case "Technician":
          const technician = await Technician.findById(recipient.recipientId);
          if (technician) {
            recipientDetails = {
              email: technician.email,
              name: technician.fullName,
              type: "Technician",
            };
            console.log(`✅ Found Technician: ${technician.email}`);
          } else {
            console.warn(`❌ Technician not found: ${recipient.recipientId}`);
          }
          break;
        default:
          console.warn(`❌ Unknown recipient type: ${recipient.recipientType}`);
      }

      if (!recipientDetails) {
        console.warn(
          `Recipient not found for ${recipient.recipientType}:${recipient.recipientId}`
        );
        return {
          recipient,
          channel: "email",
          success: false,
          error: "Recipient not found",
        };
      }

      // Validate recipient details before proceeding
      if (
        !recipientDetails.email ||
        !recipientDetails.name ||
        !recipientDetails.type
      ) {
        console.error(`❌ Invalid recipient details:`, recipientDetails);
        return {
          recipient,
          channel: "email",
          success: false,
          error: "Invalid recipient details - missing email, name, or type",
        };
      }

      // Send email based on notification type
      let emailResult;
      switch (notificationData.type) {
        case "JOB_CREATED":
          emailResult = await this.sendJobCreationEmailNotification(
            recipientDetails,
            notificationData
          );
          break;
        case "JOB_ASSIGNED":
          emailResult = await this.sendJobAssignmentEmailNotification(
            recipientDetails,
            notificationData
          );
          break;
        case "JOB_COMPLETED":
          emailResult = await this.sendJobCompletionEmailNotification(
            recipientDetails,
            notificationData
          );
          break;
        case "COMPLIANCE_DUE":
          emailResult = await this.sendComplianceJobEmailNotification(
            recipientDetails,
            notificationData
          );
          break;
        default:
          // Generic email notification
          emailResult = await this.sendGenericEmailNotification(
            recipientDetails,
            notificationData
          );
      }

      console.log(
        `✅ Email notification sent to ${recipient.recipientType}:${recipient.recipientId}`,
        {
          type: notificationData.type,
          title: notificationData.title,
          timestamp: new Date().toISOString(),
        }
      );

      return {
        recipient,
        channel: "email",
        success: true,
        result: emailResult,
      };
    } catch (error) {
      console.error("Error sending email notification:", error);
      return {
        recipient,
        channel: "email",
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send generic email notification
   * @param {Object} recipientDetails - Recipient details
   * @param {Object} notificationData - Notification data
   */
  async sendGenericEmailNotification(recipientDetails, notificationData) {
    const emailSubject = `${notificationData.title} - ${notificationData.type}`;
    const emailBody = `
      <h2>${notificationData.title}</h2>
      <p>${notificationData.message}</p>
      <p>Data: ${JSON.stringify(notificationData.data)}</p>
      <p>Priority: ${notificationData.priority}</p>
      <p>Expires At: ${notificationData.expiresAt || "Never"}</p>
    `;

    return await emailService.sendTemplatedEmail({
      to: recipientDetails.email,
      templateName: "genericNotification",
      templateData: {
        recipientName: recipientDetails.name,
        title: notificationData.title,
        message: notificationData.message,
        data: notificationData.data,
        priority: notificationData.priority,
        expiresAt: notificationData.expiresAt,
      },
    });
  }

  /**
   * Send job creation email notification
   * @param {Object} recipientDetails - Recipient details
   * @param {Object} notificationData - Notification data
   */
  async sendJobCreationEmailNotification(recipientDetails, notificationData) {
    // Extract job and property data from notification
    const { jobId, propertyId, jobType, dueDate, priority, creator } =
      notificationData.data;

    // Get job and property details
    const Job = (await import("../models/Job.js")).default;
    const Property = (await import("../models/Property.js")).default;

    const job = await Job.findById(jobId);
    const property = await Property.findById(propertyId).populate("address");

    if (!job || !property) {
      throw new Error("Job or property not found for email notification");
    }

    // Get creator details
    let creatorDetails = { name: "Unknown", type: "Unknown" };
    if (creator) {
      switch (creator.userType) {
        case "SuperUser":
          const superUser = await SuperUser.findById(creator.userId);
          if (superUser) {
            creatorDetails = {
              name: superUser.fullName || "Super User",
              type: "SuperUser",
            };
          }
          break;
        case "Agency":
          const agency = await Agency.findById(creator.userId);
          if (agency) {
            creatorDetails = { name: agency.contactPerson, type: "Agency" };
          }
          break;
        case "PropertyManager":
          const propertyManager = await PropertyManager.findById(
            creator.userId
          );
          if (propertyManager) {
            creatorDetails = {
              name: `${propertyManager.firstName} ${propertyManager.lastName}`,
              type: "PropertyManager",
            };
          }
          break;
      }
    }

    // Get assigned technician if any
    let assignedTechnician = null;
    if (job.assignedTechnician) {
      const technician = await Technician.findById(job.assignedTechnician);
      if (technician) {
        assignedTechnician = technician;
      }
    }

    return await emailService.sendJobCreationNotificationEmail(
      recipientDetails,
      job,
      property,
      creatorDetails,
      assignedTechnician
    );
  }

  /**
   * Send job assignment email notification
   * @param {Object} recipientDetails - Recipient details
   * @param {Object} notificationData - Notification data
   */
  async sendJobAssignmentEmailNotification(recipientDetails, notificationData) {
    // Extract job and property data from notification
    const { jobId, propertyId, assignedTechnicianId, assignedBy } =
      notificationData.data;

    // Get job and property details
    const Job = (await import("../models/Job.js")).default;
    const Property = (await import("../models/Property.js")).default;

    const job = await Job.findById(jobId);
    const property = await Property.findById(propertyId).populate("address");
    const assignedTechnician = await Technician.findById(assignedTechnicianId);

    if (!job || !property || !assignedTechnician) {
      throw new Error(
        "Job, property, or assigned technician not found for email notification"
      );
    }

    // Get assignedBy details
    let assignedByDetails = { name: "Unknown", type: "Unknown" };
    if (assignedBy) {
      switch (assignedBy.userType) {
        case "SuperUser":
          const superUser = await SuperUser.findById(assignedBy.userId);
          if (superUser) {
            assignedByDetails = {
              name: superUser.fullName || "Super User",
              type: "SuperUser",
            };
          }
          break;
        case "Agency":
          const agency = await Agency.findById(assignedBy.userId);
          if (agency) {
            assignedByDetails = { name: agency.contactPerson, type: "Agency" };
          }
          break;
        case "PropertyManager":
          const propertyManager = await PropertyManager.findById(
            assignedBy.userId
          );
          if (propertyManager) {
            assignedByDetails = {
              name: `${propertyManager.firstName} ${propertyManager.lastName}`,
              type: "PropertyManager",
            };
          }
          break;
      }
    }

    return await emailService.sendJobAssignmentNotificationEmail(
      recipientDetails,
      job,
      property,
      assignedTechnician,
      assignedByDetails
    );
  }

  /**
   * Send job completion email notification
   * @param {Object} recipientDetails - Recipient details
   * @param {Object} notificationData - Notification data
   */
  async sendJobCompletionEmailNotification(recipientDetails, notificationData) {
    // Extract job and property data from notification
    const { jobId, propertyId, completedBy, completionNotes, totalCost } =
      notificationData.data;

    // Get job and property details
    const Job = (await import("../models/Job.js")).default;
    const Property = (await import("../models/Property.js")).default;

    const job = await Job.findById(jobId);
    const property = await Property.findById(propertyId).populate("address");
    const completedByTechnician = await Technician.findById(completedBy);

    if (!job || !property || !completedByTechnician) {
      throw new Error(
        "Job, property, or completedBy technician not found for email notification"
      );
    }

    return await emailService.sendJobCompletionNotificationEmail(
      recipientDetails,
      job,
      property,
      completedByTechnician,
      completionNotes,
      totalCost
    );
  }

  /**
   * Send compliance job email notification
   * @param {Object} recipientDetails - Recipient details
   * @param {Object} notificationData - Notification data
   */
  async sendComplianceJobEmailNotification(recipientDetails, notificationData) {
    // Extract job and property data from notification
    const { jobId, propertyId, jobType, dueDate, complianceType } =
      notificationData.data;

    // Get job and property details
    const Job = (await import("../models/Job.js")).default;
    const Property = (await import("../models/Property.js")).default;

    const job = await Job.findById(jobId);
    const property = await Property.findById(propertyId).populate("address");

    if (!job || !property) {
      throw new Error(
        "Job or property not found for compliance email notification"
      );
    }

    return await emailService.sendComplianceJobNotificationEmail(
      recipientDetails,
      job,
      property
    );
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

      // Send notifications (both in-app and email)
      const results = await this.sendNotification(
        recipients,
        notificationData,
        ["notification", "email"]
      );

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
      console.log("🔔 sendComplianceJobNotification called with:", {
        jobId: job._id,
        jobOwner: job.owner,
        propertyId: property._id,
        propertyAgency: property.agency,
      });

      const recipients = [];

      // Add agency as recipient
      if (job.owner.ownerType === "Agency") {
        console.log(`📋 Adding Agency recipient: ${job.owner.ownerId}`);
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      } else {
        console.warn(`⚠️ Job owner type is not Agency: ${job.owner.ownerType}`);
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

      console.log(
        `📤 Sending notifications to ${recipients.length} recipients:`,
        recipients
      );

      // Send notifications (both in-app and email)
      const results = await this.sendNotification(
        recipients,
        notificationData,
        ["notification", "email"]
      );

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
   * Send job assignment notification to all stakeholders
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} assignedTechnician - Assigned technician object
   * @param {Object} assignedBy - User who assigned the job
   */
  async sendJobAssignmentNotification(
    job,
    property,
    assignedTechnician,
    assignedBy
  ) {
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

      // Add the assigned technician as recipient
      recipients.push({
        recipientType: "Technician",
        recipientId: assignedTechnician._id,
      });

      // Prepare notification data
      const notificationData = {
        type: "JOB_ASSIGNED",
        title: `Job Assigned to Technician`,
        message: `A ${job.jobType} job at ${property.address.fullAddress} has been assigned to ${assignedTechnician.fullName}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property._id,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          dueDate: job.dueDate,
          priority: job.priority,
          assignedTechnicianId: assignedTechnician._id,
          assignedBy: {
            userType: assignedBy.userType,
            userId: assignedBy.userId,
          },
        },
        priority: job.priority === "Urgent" ? "Urgent" : "High",
      };

      // Send notifications (both in-app and email)
      const results = await this.sendNotification(
        recipients,
        notificationData,
        ["notification", "email"]
      );

      console.log(
        `✅ Job assignment notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          propertyAddress: property.address.fullAddress,
          assignedTechnician: assignedTechnician.fullName,
          results: results.length,
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
   * Send job completion notification to all stakeholders
   * @param {Object} job - Job object
   * @param {Object} property - Property object
   * @param {Object} completedBy - Technician who completed the job
   * @param {string} completionNotes - Completion notes (optional)
   * @param {number} totalCost - Total cost of the job (optional)
   */
  async sendJobCompletionNotification(
    job,
    property,
    completedBy,
    completionNotes = null,
    totalCost = null
  ) {
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

      // Add the technician who completed the job as recipient
      recipients.push({
        recipientType: "Technician",
        recipientId: completedBy._id,
      });

      // Prepare notification data
      const notificationData = {
        type: "JOB_COMPLETED",
        title: `Job Completed Successfully`,
        message: `A ${job.jobType} job at ${property.address.fullAddress} has been completed by ${completedBy.fullName}`,
        data: {
          jobId: job._id,
          job_id: job.job_id,
          propertyId: property._id,
          propertyAddress: property.address.fullAddress,
          jobType: job.jobType,
          completedBy: completedBy._id,
          completionNotes: completionNotes,
          totalCost: totalCost,
        },
        priority: "High",
      };

      // Send notifications (both in-app and email)
      const results = await this.sendNotification(
        recipients,
        notificationData,
        ["notification", "email"]
      );

      console.log(
        `✅ Job completion notifications sent to ${recipients.length} recipients`,
        {
          jobId: job._id,
          jobType: job.jobType,
          propertyAddress: property.address.fullAddress,
          completedBy: completedBy.fullName,
          results: results.length,
          timestamp: new Date().toISOString(),
        }
      );

      return results;
    } catch (error) {
      console.error("Error sending job completion notification:", error);
      throw error;
    }
  }

  async sendInspectionReportNotification(report, job, property, technician) {
    try {
      const recipients = [];

      if (job.owner?.ownerType === "Agency") {
        recipients.push({
          recipientType: "Agency",
          recipientId: job.owner.ownerId,
        });
      }

      const superUsers = await SuperUser.find({});
      superUsers.forEach((superUser) =>
        recipients.push({
          recipientType: "SuperUser",
          recipientId: superUser._id,
        })
      );

      const propertyManagers = await this.getPropertyManagersForProperty(
        property._id
      );
      propertyManagers.forEach((manager) =>
        recipients.push({
          recipientType: "PropertyManager",
          recipientId: manager._id,
        })
      );

      recipients.push({
        recipientType: "Technician",
        recipientId: technician._id,
      });

      const notificationData = {
        type: "INSPECTION_REPORT_SUBMITTED",
        title: "Inspection report submitted",
        message: `${technician.fullName} submitted a ${report.jobType} inspection for ${property.address.fullAddress}.`,
        data: {
          reportId: report._id,
          jobId: job._id,
          propertyId: property._id,
          jobType: report.jobType,
          submittedAt: report.submittedAt,
          pdfUrl: report.pdf?.url,
        },
        priority: "Normal",
      };

      await this.sendNotification(recipients, notificationData, [
        "notification",
        "email",
      ]);
    } catch (error) {
      console.error("Error sending inspection report notification:", error);
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

  // Email notification implementation
  async sendEmailNotification(recipient, notificationData) {
    try {
      console.log("Sending email notification:", { recipient, type: notificationData.type });
      
      // Use the email service to send templated emails
      const emailService = (await import('./email.service.js')).default;
      
      // Map notification types to email templates
      let templateName;
      let templateData = {
        recipientName: notificationData.recipientName || 'User',
        ...notificationData.data
      };

      switch (notificationData.type) {
        case 'job_assigned':
          templateName = 'jobAssignment';
          break;
        case 'job_completed':
          templateName = 'jobCompletion';
          break;
        case 'compliance_due':
          templateName = 'complianceDue';
          break;
        case 'tenant_booking_request':
          templateName = 'tenantBookingRequest';
          break;
        case 'tenant_booking_confirmation':
          templateName = 'tenantBookingConfirmation';
          break;
        default:
          templateName = 'general';
          templateData.subject = notificationData.title;
          templateData.message = notificationData.message;
      }

      const result = await emailService.sendTemplatedEmail({
        to: recipient,
        templateName,
        templateData
      });

      console.log("Email notification sent successfully:", result.id);
      return result;
    } catch (error) {
      console.error("Failed to send email notification:", error);
      throw error;
    }
  }

  // SMS notification placeholder (implement later)
  async sendSMSNotification(recipient, notificationData) {
    console.log("SMS notification (not implemented):", { recipient, notificationData });
    // SMS implementation will be added later
    return { id: "sms-placeholder", status: "pending" };
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
