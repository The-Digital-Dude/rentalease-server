import express from "express";
import mongoose from "mongoose";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import { authenticateUserTypes } from "../middleware/auth.middleware.js";

const router = express.Router();

// Helper function to get owner info based on user type
const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: "SuperUser",
      ownerId: req.superUser.id,
    };
  } else if (req.agency) {
    return {
      ownerType: "Agency",
      ownerId: req.agency.id,
    };
  } else if (req.technician) {
    return {
      ownerType: "Technician",
      ownerId: req.technician.id,
    };
  } else if (req.propertyManager) {
    return {
      ownerType: "PropertyManager",
      ownerId: req.propertyManager.id,
    };
  }
  return null;
};

// Helper function to convert shift to actual time slots
const getTimeSlotFromShift = (date, shift) => {
  const startTime = new Date(date);
  const endTime = new Date(date);
  
  switch (shift) {
    case "morning":
      startTime.setHours(9, 0, 0, 0); // 9:00 AM
      endTime.setHours(12, 0, 0, 0);  // 12:00 PM
      break;
    case "afternoon":
      startTime.setHours(13, 0, 0, 0); // 1:00 PM
      endTime.setHours(17, 0, 0, 0);   // 5:00 PM
      break;
    case "evening":
      startTime.setHours(18, 0, 0, 0); // 6:00 PM
      endTime.setHours(21, 0, 0, 0);   // 9:00 PM
      break;
    default:
      startTime.setHours(9, 0, 0, 0);
      endTime.setHours(17, 0, 0, 0);
  }
  
  return { startTime, endTime };
};

// Helper function to generate ICS calendar content
const generateICSContent = (jobs, technicianName) => {
  const now = new Date();
  const formatDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RentalEase CRM//Technician Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${technicianName} - Work Schedule`,
    'X-WR-TIMEZONE:UTC'
  ].join('\r\n');

  jobs.forEach((job) => {
    const { startTime, endTime } = job.scheduledStartTime && job.scheduledEndTime 
      ? { startTime: job.scheduledStartTime, endTime: job.scheduledEndTime }
      : getTimeSlotFromShift(job.dueDate, job.shift);

    const uid = `job-${job.job_id}@rentalease-crm.com`;
    const summary = `${job.jobType} - ${job.property?.address?.street || 'Property'}`;
    const description = [
      `Job ID: ${job.job_id}`,
      `Type: ${job.jobType}`,
      `Priority: ${job.priority}`,
      `Status: ${job.status}`,
      job.description ? `Description: ${job.description}` : '',
      job.property?.address ? `Address: ${job.property.address.street}, ${job.property.address.city}` : '',
      job.estimatedDuration ? `Estimated Duration: ${job.estimatedDuration} hours` : ''
    ].filter(Boolean).join('\\n');

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${formatDate(now)}`,
      `DTSTART:${formatDate(startTime)}`,
      `DTEND:${formatDate(endTime)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      job.property?.address ? `LOCATION:${job.property.address.street}, ${job.property.address.city}, ${job.property.address.state} ${job.property.address.zipCode}` : '',
      `STATUS:${job.status.toUpperCase()}`,
      `PRIORITY:${job.priority === 'High' ? '3' : job.priority === 'Medium' ? '5' : '7'}`,
      'END:VEVENT'
    ].filter(Boolean).join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};

// GET - Get technician's calendar in JSON format
router.get("/technician/:technicianId", authenticateUserTypes(['SuperUser', 'Agency', 'Technician']), async (req, res) => {
  try {
    const { technicianId } = req.params;
    const { startDate, endDate, status, format } = req.query;

    // Validate technician access
    const ownerInfo = getOwnerInfo(req);
    if (ownerInfo.ownerType === "Technician" && ownerInfo.ownerId !== technicianId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only view your own calendar."
      });
    }

    // Build date range query
    let dateQuery = {};
    if (startDate || endDate) {
      dateQuery.dueDate = {};
      if (startDate) dateQuery.dueDate.$gte = new Date(startDate);
      if (endDate) dateQuery.dueDate.$lte = new Date(endDate);
    } else {
      // Default to next 30 days
      const today = new Date();
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      dateQuery.dueDate = { $gte: today, $lte: thirtyDaysFromNow };
    }

    // Build query
    let query = {
      assignedTechnician: technicianId,
      ...dateQuery
    };

    if (status) {
      query.status = status;
    }

    // Get jobs
    const jobs = await Job.find(query)
      .populate("property", "address propertyType")
      .sort({ dueDate: 1 });

    // Get technician info
    const technician = await Technician.findById(technicianId).select("firstName lastName");
    const technicianName = technician ? `${technician.firstName} ${technician.lastName}` : "Technician";

    // If format is ICS, return calendar file
    if (format === 'ics') {
      const icsContent = generateICSContent(jobs, technicianName);
      
      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${technicianName.replace(/\s+/g, '_')}_schedule.ics"`);
      return res.send(icsContent);
    }

    // Process jobs for JSON response
    const calendarEvents = jobs.map(job => {
      const { startTime, endTime } = job.scheduledStartTime && job.scheduledEndTime 
        ? { startTime: job.scheduledStartTime, endTime: job.scheduledEndTime }
        : getTimeSlotFromShift(job.dueDate, job.shift);

      return {
        id: job._id,
        jobId: job.job_id,
        title: `${job.jobType} - ${job.property?.address?.street || 'Property'}`,
        description: job.description,
        startTime: startTime,
        endTime: endTime,
        allDay: false,
        jobType: job.jobType,
        priority: job.priority,
        status: job.status,
        shift: job.shift,
        estimatedDuration: job.estimatedDuration,
        location: job.property?.address ? {
          street: job.property.address.street,
          city: job.property.address.city,
          state: job.property.address.state,
          zipCode: job.property.address.zipCode,
          coordinates: job.property.address.coordinates
        } : null,
        property: {
          id: job.property?._id,
          type: job.property?.propertyType,
          address: job.property?.address
        }
      };
    });

    res.status(200).json({
      status: "success",
      message: "Calendar events retrieved successfully",
      data: {
        technician: {
          id: technicianId,
          name: technicianName
        },
        events: calendarEvents,
        summary: {
          totalEvents: calendarEvents.length,
          dateRange: {
            start: startDate || dateQuery.dueDate.$gte,
            end: endDate || dateQuery.dueDate.$lte
          },
          statusCounts: jobs.reduce((acc, job) => {
            acc[job.status] = (acc[job.status] || 0) + 1;
            return acc;
          }, {})
        }
      }
    });

  } catch (error) {
    console.error("Get technician calendar error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve calendar events"
    });
  }
});

// GET - Get current technician's calendar (my calendar)
router.get("/my-calendar", authenticateUserTypes(['Technician']), async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo || ownerInfo.ownerType !== "Technician") {
      return res.status(403).json({
        status: "error",
        message: "Only technicians can access their calendar"
      });
    }

    // Redirect to technician-specific calendar route
    req.params.technicianId = ownerInfo.ownerId;
    return router.handle(req, res);

  } catch (error) {
    console.error("Get my calendar error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve calendar"
    });
  }
});

// GET - Download technician's calendar as ICS file
router.get("/technician/:technicianId/download", authenticateUserTypes(['SuperUser', 'Agency', 'Technician']), async (req, res) => {
  try {
    const { technicianId } = req.params;

    // Validate technician access
    const ownerInfo = getOwnerInfo(req);
    if (ownerInfo.ownerType === "Technician" && ownerInfo.ownerId !== technicianId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only download your own calendar."
      });
    }

    // Set format to ICS and call the main calendar route
    req.query.format = 'ics';
    req.params.technicianId = technicianId;
    
    // Forward to the main calendar route
    return router.handle(req, res);

  } catch (error) {
    console.error("Download calendar error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to download calendar"
    });
  }
});

// PUT - Update job schedule time
router.put("/jobs/:jobId/schedule", authenticateUserTypes(['SuperUser', 'Agency', 'Technician']), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { scheduledStartTime, scheduledEndTime, shift } = req.body;

    // Validate input
    if (!scheduledStartTime || !scheduledEndTime) {
      return res.status(400).json({
        status: "error",
        message: "Both scheduledStartTime and scheduledEndTime are required"
      });
    }

    const startTime = new Date(scheduledStartTime);
    const endTime = new Date(scheduledEndTime);

    if (startTime >= endTime) {
      return res.status(400).json({
        status: "error",
        message: "Start time must be before end time"
      });
    }

    // Find and update job
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: "error",
        message: "Job not found"
      });
    }

    // Validate access (technicians can only update their own jobs)
    const ownerInfo = getOwnerInfo(req);
    if (ownerInfo.ownerType === "Technician" && job.assignedTechnician?.toString() !== ownerInfo.ownerId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. You can only update your own job schedules."
      });
    }

    // Update job schedule
    job.scheduledStartTime = startTime;
    job.scheduledEndTime = endTime;
    if (shift) job.shift = shift;
    job.status = "Scheduled";

    await job.save();

    res.status(200).json({
      status: "success",
      message: "Job schedule updated successfully",
      data: {
        job: job.getFullDetails()
      }
    });

  } catch (error) {
    console.error("Update job schedule error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update job schedule"
    });
  }
});

// GET - Get calendar feed URL for mobile app integration
router.get("/technician/:technicianId/feed-url", authenticateUserTypes(['SuperUser', 'Agency', 'Technician']), async (req, res) => {
  try {
    const { technicianId } = req.params;

    // Validate technician access
    const ownerInfo = getOwnerInfo(req);
    if (ownerInfo.ownerType === "Technician" && ownerInfo.ownerId !== technicianId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied"
      });
    }

    // Get base URL from request
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const feedUrl = `${baseUrl}/api/v1/calendar/technician/${technicianId}?format=ics`;

    res.status(200).json({
      status: "success",
      message: "Calendar feed URL generated successfully",
      data: {
        feedUrl,
        instructions: {
          ios: "Open Settings > Calendar > Accounts > Add Account > Other > Add Subscribed Calendar and paste the feed URL",
          android: "Open Google Calendar app > Settings > Add calendar > From URL and paste the feed URL",
          outlook: "In Outlook, go to Calendar > Add calendar > Subscribe from web and paste the feed URL"
        }
      }
    });

  } catch (error) {
    console.error("Get feed URL error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to generate feed URL"
    });
  }
});

export default router;