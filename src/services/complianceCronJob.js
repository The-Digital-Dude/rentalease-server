import cron from "node-cron";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import notificationService from "./notification.service.js";

class ComplianceCronJob {
  constructor() {
    this.isRunning = false;
    this.cronJob = null;
  }

  logMessage(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
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

  async fetchPropertiesWithUpcomingCompliance() {
    try {
      const { startOfToday, endOfMonth } = this.getDateRange();
      const query = this.getComplianceQuery(startOfToday, endOfMonth);

      const properties = await Property.find(query)
        .populate("agency", "name")
        .populate("assignedPropertyManager", "name email")
        .select("address complianceSchedule agency assignedPropertyManager");

      return { properties, startOfToday, endOfMonth };
    } catch (error) {
      this.logMessage(
        `Error fetching properties with upcoming compliance: ${error.message}`
      );
      return { properties: [], startOfToday: null, endOfMonth: null };
    }
  }

  logComplianceResults(properties, startOfToday, endOfMonth) {
    if (properties.length > 0) {
      this.logMessage(
        `Found ${properties.length} active properties with compliance due within 1 month:`
      );

      properties.forEach((property) => {
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
      });
    } else {
      this.logMessage(
        "No active properties with compliance due within 1 month"
      );
    }
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Schedule a job that runs every 15 seconds
    this.cronJob = cron.schedule(
      "*/15 * * * * *",
      async () => {
        this.logMessage("hey 👋");

        // Fetch and log properties with upcoming compliance
        const { properties, startOfToday, endOfMonth } =
          await this.fetchPropertiesWithUpcomingCompliance();
        this.logComplianceResults(properties, startOfToday, endOfMonth);
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
