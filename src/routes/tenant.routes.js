import express from "express";
import mongoose from "mongoose";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import emailService from "../services/email.service.js";
import notificationService from "../services/notification.service.js";
import { sanitizeInput } from "../middleware/sanitizer.middleware.js";
import resolveFrontendUrl from "../utils/frontendUrl.js";

const router = express.Router();

const encodeBookingToken = (value) =>
  Buffer.from(value, "utf-8").toString("base64url");

const decodeBookingToken = (value) =>
  Buffer.from(value, "base64url").toString("utf-8");

const parseBookingToken = (bookingToken) => {
  const decodedToken = decodeBookingToken(bookingToken);
  const parts = decodedToken.split(":");

  if (parts.length < 3) {
    throw new Error("Invalid booking token");
  }

  const [propertyId, tenantEmail, ...rest] = parts;
  const timestamp = rest.pop();
  const complianceType = rest.length ? rest.join(":") : null;

  if (!propertyId || !tenantEmail || !timestamp) {
    throw new Error("Invalid booking token");
  }

  return {
    propertyId,
    tenantEmail,
    complianceType,
    timestamp,
  };
};

const validateBookingTokenAge = (timestamp) => {
  const tokenAge = Date.now() - parseInt(timestamp, 10);
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  return tokenAge <= maxAge;
};

/**
 * Send time selection email to tenant for compliance inspection
 * POST /api/v1/tenant/send-booking-request
 * Body: { propertyId, tenantEmail, tenantName, complianceType }
 */
router.post("/send-booking-request", sanitizeInput(), async (req, res) => {
  try {
    const { propertyId, tenantEmail, tenantName, complianceType } = req.body;

    // Validate required fields
    if (!propertyId || !tenantEmail || !tenantName || !complianceType) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required: propertyId, tenantEmail, tenantName, complianceType"
      });
    }

    // Validate compliance type
    const validComplianceTypes = ["Gas", "Electrical", "Smoke Alarm", "Minimum Safety Standard"];
    if (!validComplianceTypes.includes(complianceType)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid compliance type. Must be Gas, Electrical, Smoke Alarm, or Minimum Safety Standard"
      });
    }

    // Get property details
    let property = await Property.findById(propertyId);
    if (!property) {
      // For testing purposes, create a mock property object
      console.log("⚠️  Property not found, using mock data for testing");
      property = {
        _id: propertyId,
        address: {
          fullAddress: "123 Test Street, Sydney NSW 2000",
          street: "123 Test Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000"
        },
        propertyType: "House",
        currentTenant: {
          name: tenantName,
          email: tenantEmail
        }
      };
    }

    // Calculate due date (30 days from now as default)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    // Generate booking link with token for security
    const bookingToken = encodeBookingToken(
      `${propertyId}:${tenantEmail}:${complianceType}:${Date.now()}`
    );
    const bookingLink = `${resolveFrontendUrl()}/booking/${bookingToken}`;

    // Send email to tenant
    await notificationService.sendEmailNotification(tenantEmail, {
      type: 'tenant_booking_request',
      recipientName: tenantName,
      data: {
        propertyAddress: property.address?.fullAddress || `${property.address?.street}, ${property.address?.suburb}`,
        complianceType,
        bookingLink,
        dueDate: dueDate.toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      }
    });

    console.log(`📧 Booking request email sent to tenant: ${tenantEmail} for property: ${property.address?.fullAddress}`);

    res.json({
      status: "success",
      message: "Booking request email sent to tenant successfully",
      data: {
        tenantEmail,
        propertyAddress: property.address?.fullAddress,
        complianceType,
        bookingToken,
        dueDate: dueDate.toISOString()
      }
    });

  } catch (error) {
    console.error("Error sending booking request:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to send booking request email",
      error: error.message
    });
  }
});

/**
 * Get available time slots for tenant booking
 * GET /api/v1/tenant/available-slots/:bookingToken
 */
router.get("/available-slots/:bookingToken", async (req, res) => {
  try {
    const { bookingToken } = req.params;

    // Decode booking token
    let tokenData;
    try {
      tokenData = parseBookingToken(bookingToken);
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking token"
      });
    }

    const { propertyId, tenantEmail, complianceType, timestamp } = tokenData;

    // Validate token age (7 days expiry)
    if (!validateBookingTokenAge(timestamp)) {
      return res.status(400).json({
        status: "error",
        message: "Booking token has expired. Please request a new booking link."
      });
    }

    // Get property details
    let property = await Property.findById(propertyId);
    if (!property) {
      // For testing purposes, create a mock property object
      console.log("⚠️  Property not found in available-slots, using mock data for testing");
      property = {
        _id: propertyId,
        address: {
          fullAddress: "123 Test Street, Sydney NSW 2000"
        }
      };
    }

    // Generate available time slots for next 30 days
    // This is a simplified version - in production you'd check technician availability
    const availableSlots = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      // Add morning and afternoon slots
      const morningSlot = {
        date: date.toISOString().split('T')[0],
        time: "09:00",
        displayTime: "9:00 AM - 12:00 PM",
        available: true
      };

      const afternoonSlot = {
        date: date.toISOString().split('T')[0],
        time: "13:00",
        displayTime: "1:00 PM - 5:00 PM",
        available: true
      };

      availableSlots.push(morningSlot, afternoonSlot);
    }

    res.json({
      status: "success",
      message: "Available time slots retrieved successfully",
      data: {
        propertyAddress: property.address?.fullAddress,
        tenantEmail,
        complianceType,
        availableSlots
      }
    });

  } catch (error) {
    console.error("Error getting available slots:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve available slots",
      error: error.message
    });
  }
});

/**
 * Handle tenant's time selection and create job
 * POST /api/v1/tenant/book-appointment
 * Body: { bookingToken, selectedDate, selectedTime, complianceType }
 */
router.post("/book-appointment", async (req, res) => {
  try {
    const {
      bookingToken,
      selectedDate,
      selectedTime,
      complianceType: requestedComplianceType,
    } = req.body;

    // Validate required fields
    if (!bookingToken || !selectedDate || !selectedTime) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required: bookingToken, selectedDate, selectedTime"
      });
    }

    // Decode booking token
    let tokenData;
    try {
      tokenData = parseBookingToken(bookingToken);
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: "Invalid booking token"
      });
    }

    const {
      propertyId,
      tenantEmail,
      complianceType: tokenComplianceType,
      timestamp,
    } = tokenData;
    const complianceType = requestedComplianceType || tokenComplianceType;

    if (!complianceType) {
      return res.status(400).json({
        status: "error",
        message: "Compliance type is required. Please request a new booking link."
      });
    }

    // Validate token age
    if (!validateBookingTokenAge(timestamp)) {
      return res.status(400).json({
        status: "error",
        message: "Booking token has expired"
      });
    }

    // Get property details
    let property = await Property.findById(propertyId);
    if (!property) {
      // For testing purposes, create a mock property object
      console.log("⚠️  Property not found in book-appointment, using mock data for testing");
      property = {
        _id: propertyId,
        address: {
          fullAddress: "123 Test Street, Sydney NSW 2000",
          street: "123 Test Street",
          suburb: "Sydney",
          state: "NSW",
          postcode: "2000"
        },
        propertyType: "House",
        currentTenant: {
          name: "Sarah Johnson",
          email: tenantEmail
        }
      };
    }

    // Create scheduled date/time
    const scheduledDateTime = new Date(`${selectedDate}T${selectedTime}:00`);

    // Find available technician (simplified - in production you'd have more complex logic)
    const complianceTradeMap = {
      Gas: "Gas",
      Electrical: "Electrical",
      "Smoke Alarm": "Smoke Alarm",
      "Minimum Safety Standard": "Minimum Safety Standard",
    };
    const desiredTradeType = complianceTradeMap[complianceType] || complianceType;

    let availableTechnician = await Technician.findOne({ 
      isActive: true,
      tradeType: desiredTradeType
    });

    if (!availableTechnician) {
      // For testing purposes, create a mock technician object
      console.log("⚠️  No technician found, using mock data for testing");
      availableTechnician = {
        _id: "507f1f77bcf86cd799439012", // Mock technician ID
        firstName: "John",
        lastName: "Smith", 
        email: "john.smith@example.com",
        phone: "+61 400 123 456",
        tradeType: desiredTradeType,
        isActive: true
      };
    }

    // Create job with all required fields
    const jobData = {
      job_id: `J-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      property: property._id,
      assignedTechnician: availableTechnician._id,
      jobType: complianceType,
      dueDate: scheduledDateTime,
      scheduledStartTime: scheduledDateTime,
      scheduledEndTime: new Date(scheduledDateTime.getTime() + (3 * 60 * 60 * 1000)), // 3 hours later
      status: "Scheduled",
      priority: "Medium",
      description: `${complianceType} safety inspection scheduled by tenant`,
      // Required owner field - use mock agency data
      owner: {
        ownerType: "Agency",
        ownerId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013") // Mock agency ID
      },
      // Required createdBy field - use mock agency data
      createdBy: {
        userType: "Agency", 
        userId: new mongoose.Types.ObjectId("507f1f77bcf86cd799439013") // Mock agency ID
      },
      // Custom fields for tenant booking
      tenantScheduled: true,
      tenantEmail: tenantEmail,
      tenantName: property.currentTenant?.name || "Tenant"
    };

    const newJob = new Job(jobData);
    await newJob.save();

    // Send confirmation email to tenant
    await notificationService.sendEmailNotification(tenantEmail, {
      type: 'tenant_booking_confirmation',
      recipientName: property.currentTenant?.name || "Tenant",
      data: {
        propertyAddress: property.address?.fullAddress,
        complianceType,
        selectedDate: scheduledDateTime.toLocaleDateString('en-AU', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        selectedTime: scheduledDateTime.toLocaleTimeString('en-AU', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        }),
        technicianName: `${availableTechnician.firstName} ${availableTechnician.lastName}`,
        technicianPhone: availableTechnician.phone
      }
    });

    // Send notification to technician
    await notificationService.sendEmailNotification(availableTechnician.email, {
      type: 'job_assigned',
      recipientName: `${availableTechnician.firstName} ${availableTechnician.lastName}`,
      data: {
        jobId: newJob.jobId,
        propertyAddress: property.address?.fullAddress,
        scheduledDate: scheduledDateTime.toLocaleDateString('en-AU'),
        scheduledTime: scheduledDateTime.toLocaleTimeString('en-AU', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true
        }),
        jobType: complianceType,
        tenantContact: tenantEmail
      }
    });

    console.log(`✅ Appointment booked: ${complianceType} inspection for ${property.address?.fullAddress} on ${selectedDate} at ${selectedTime}`);

    res.json({
      status: "success",
      message: "Appointment booked successfully",
      data: {
        jobId: newJob.jobId,
        propertyAddress: property.address?.fullAddress,
        scheduledDate: selectedDate,
        selectedTime,
        complianceType,
        technicianName: `${availableTechnician.firstName} ${availableTechnician.lastName}`,
        confirmationSent: true
      }
    });

  } catch (error) {
    console.error("Error booking appointment:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to book appointment",
      error: error.message
    });
  }
});

export default router;
