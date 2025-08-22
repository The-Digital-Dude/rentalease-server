import express from "express";
import mongoose from "mongoose";
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import PropertyManager from "../models/PropertyManager.js";
import jwt from "jsonwebtoken";
import emailService from "../services/email.service.js";
import {
  generateOTP,
  generateOTPExpiration,
  isOTPExpired,
  hashOTP,
  verifyOTP,
} from "../utils/otpGenerator.js";
import {
  authenticateAdminLevel,
  authenticateAgency,
  authenticateUserTypes,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Valid regions enum
const VALID_REGIONS = [
  "Sydney Metro",
  "Melbourne Metro",
  "Brisbane Metro",
  "Perth Metro",
  "Adelaide Metro",
  "Darwin Metro",
  "Hobart Metro",
  "Canberra Metro",
  "Regional NSW",
  "Regional VIC",
  "Regional QLD",
  "Regional WA",
  "Regional SA",
  "Regional NT",
  "Regional TAS",
];

// Register Agency (Only Super Users and Team Members can create Agencies)
router.post("/register", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const {
      companyName,
      abn,
      contactPerson,
      email,
      phone,
      region,
      compliance,
      password,
    } = req.body;

    // Validate required fields
    if (
      !companyName ||
      !abn ||
      !contactPerson ||
      !email ||
      !phone ||
      !region ||
      !compliance ||
      !password
    ) {
      return res.status(400).json({
        status: "error",
        message: "All fields are required",
      });
    }

    // Validate region
    if (!VALID_REGIONS.includes(region)) {
      return res.status(400).json({
        status: "error",
        message: "Please select a valid region",
      });
    }

    // Check if agency already exists by email
    const existingAgencyByEmail = await Agency.findOne({
      email: email.toLowerCase(),
    });
    if (existingAgencyByEmail) {
      return res.status(400).json({
        status: "error",
        message: "Agency with this email already exists",
      });
    }

    // Check if agency already exists by ABN
    const existingAgencyByABN = await Agency.findOne({ abn });
    if (existingAgencyByABN) {
      return res.status(400).json({
        status: "error",
        message: "Agency with this ABN already exists",
      });
    }

    // Create new agency
    const agency = new Agency({
      companyName,
      abn,
      contactPerson,
      email: email.toLowerCase(),
      phone,
      region,
      compliance,
      password,
      status: "Pending", // Default status, can be activated by admin
    });

    await agency.save();

    // Send credentials email to agency
    try {
      await emailService.sendAgencyCredentialsEmail(
        {
          email: agency.email,
          contactPerson: agency.contactPerson,
          companyName: agency.companyName,
          abn: agency.abn,
          region: agency.region,
          compliance: agency.compliance,
        },
        password,
        process.env.FRONTEND_URL || "https://rentalease-client.vercel.app/login"
      );

      console.log("Agency credentials email sent successfully:", {
        agencyId: agency._id,
        email: agency.email,
        companyName: agency.companyName,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error("Failed to send agency credentials email:", emailError);
      // Continue with response even if email fails
    }

    console.log("Agency created successfully:", {
      agencyId: agency._id,
      companyName: agency.companyName,
      contactPerson: agency.contactPerson,
      email: agency.email,
      createdBy: req.superUser.email,
      credentialsEmailSent: "Credentials email sent with login information",
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      status: "success",
      message:
        "Agency registered successfully. Credentials email has been sent.",
      data: {
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          joinedDate: agency.joinedDate,
        },
      },
    });
  } catch (error) {
    console.error("Agency registration error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred during registration",
    });
  }
});

// Login Agency
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email, password, "email and password");

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required",
      });
    }

    // Find agency and select password
    const agency = await Agency.findOne({ email: email.toLowerCase() }).select(
      "+password"
    );
    if (!agency) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Check if account is active
    if (!agency.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${agency.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Check password
    const isPasswordValid = await agency.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
    }

    // Update last login
    await agency.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: agency._id,
        type: "agency",
        email: agency.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      status: "success",
      message: "Login successful",
      data: {
        token,
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          lastLogin: agency.lastLogin,
          joinedDate: agency.joinedDate,
        },
      },
    });
  } catch (error) {
    console.error("Agency login error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred during login",
    });
  }
});

// Forgot Password - Agency
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required",
      });
    }

    // Find agency by email
    const agency = await Agency.findOne({ email: email.toLowerCase() });
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found with this email address",
      });
    }

    // Check if account is active
    if (!agency.isActive()) {
      return res.status(401).json({
        status: "error",
        message: `Account is ${agency.status.toLowerCase()}. Please contact support.`,
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiration = generateOTPExpiration();
    const hashedOTP = hashOTP(otp);

    // Update agency with OTP details
    agency.resetPasswordOTP = hashedOTP;
    agency.resetPasswordOTPExpires = otpExpiration;
    agency.resetPasswordOTPAttempts = 0;

    await agency.save();

    // Send OTP email
    try {
      await emailService.sendAgencyPasswordResetOTP(agency, otp, 10);

      console.log("Agency password reset OTP sent successfully:", {
        agencyId: agency._id,
        email: agency.email,
        companyName: agency.companyName,
        timestamp: new Date().toISOString(),
      });
    } catch (emailError) {
      console.error("Failed to send agency password reset OTP:", emailError);

      // Reset OTP fields on email failure
      agency.resetPasswordOTP = null;
      agency.resetPasswordOTPExpires = null;
      agency.resetPasswordOTPAttempts = 0;
      await agency.save();

      return res.status(500).json({
        status: "error",
        message: "Failed to send password reset email. Please try again later.",
      });
    }

    res.status(200).json({
      status: "success",
      message: "Password reset OTP has been sent to your email address",
      data: {
        email: agency.email,
      },
    });
  } catch (error) {
    console.error("Agency forgot password error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing password reset request",
    });
  }
});

// Reset Password - Agency
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Email, OTP, and new password are required",
      });
    }

    // Find agency by email
    const agency = await Agency.findOne({ email: email.toLowerCase() });
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found with this email address",
      });
    }

    // Check if OTP exists and is not expired
    if (!agency.resetPasswordOTP || !agency.resetPasswordOTPExpires) {
      return res.status(400).json({
        status: "error",
        message: "No password reset request found. Please request a new OTP.",
      });
    }

    if (isOTPExpired(agency.resetPasswordOTPExpires)) {
      // Clear expired OTP
      agency.resetPasswordOTP = null;
      agency.resetPasswordOTPExpires = null;
      agency.resetPasswordOTPAttempts = 0;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new password reset.",
      });
    }

    // Check OTP attempts
    if (agency.resetPasswordOTPAttempts >= 3) {
      // Clear OTP after max attempts
      agency.resetPasswordOTP = null;
      agency.resetPasswordOTPExpires = null;
      agency.resetPasswordOTPAttempts = 0;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message:
          "Too many failed attempts. Please request a new password reset.",
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, agency.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempts
      agency.resetPasswordOTPAttempts += 1;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message: `Invalid OTP. ${
          3 - agency.resetPasswordOTPAttempts
        } attempts remaining.`,
      });
    }

    // Update the agency's password
    agency.password = newPassword; // This will be hashed by the pre-save middleware
    agency.resetPasswordOTP = null;
    agency.resetPasswordOTPExpires = null;
    agency.resetPasswordOTPAttempts = 0;

    await agency.save();

    console.log("Agency password reset successful:", {
      agencyId: agency._id,
      email: agency.email,
      companyName: agency.companyName,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message:
        "Password has been reset successfully. You can now login with your new password.",
      data: {
        email: agency.email,
        resetAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Agency reset password error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while resetting password",
    });
  }
});

// Verify OTP Only (without password reset) - Agency
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Email and OTP are required",
      });
    }

    // Find agency by email
    const agency = await Agency.findOne({ email: email.toLowerCase() });
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found with this email address",
      });
    }

    // Check if OTP exists and is not expired
    if (!agency.resetPasswordOTP || !agency.resetPasswordOTPExpires) {
      return res.status(400).json({
        status: "error",
        message: "No OTP request found. Please request a new OTP.",
      });
    }

    if (isOTPExpired(agency.resetPasswordOTPExpires)) {
      // Clear expired OTP
      agency.resetPasswordOTP = null;
      agency.resetPasswordOTPExpires = null;
      agency.resetPasswordOTPAttempts = 0;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message: "OTP has expired. Please request a new OTP.",
      });
    }

    // Check OTP attempts
    if (agency.resetPasswordOTPAttempts >= 3) {
      // Clear OTP after max attempts
      agency.resetPasswordOTP = null;
      agency.resetPasswordOTPExpires = null;
      agency.resetPasswordOTPAttempts = 0;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message: "Too many failed attempts. Please request a new OTP.",
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, agency.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempts
      agency.resetPasswordOTPAttempts += 1;
      await agency.save();

      return res.status(400).json({
        status: "error",
        message: `Invalid OTP. ${
          3 - agency.resetPasswordOTPAttempts
        } attempts remaining.`,
      });
    }

    console.log("Agency OTP verified successfully:", {
      agencyId: agency._id,
      email: agency.email,
      companyName: agency.companyName,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "OTP verified successfully",
      data: {
        email: agency.email,
        verified: true,
        verifiedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Agency verify OTP error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while verifying OTP",
    });
  }
});

// Get Agency Profile
router.get("/profile", authenticateAgency, async (req, res) => {
  try {
    // Agency info is already available in req.agency from middleware
    const agency = await Agency.findById(req.agency.id);

    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          lastLogin: agency.lastLogin,
          joinedDate: agency.joinedDate,
        },
      },
    });
  } catch (error) {
    console.error("Get agency profile error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching profile",
    });
  }
});

// GET - Get agency dashboard statistics
router.get("/dashboard", authenticateAgency, async (req, res) => {
  try {
    const agencyId = req.agency.id;

    // Get agency data
    const agency = await Agency.findById(agencyId);
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    // Get properties managed by this agency
    const properties = await Property.find({ agency: agencyId });

    // Get jobs related to this agency - both directly owned and through properties
    const [directJobs, propertyJobs] = await Promise.all([
      // Jobs directly owned by the agency
      Job.find({
        "owner.ownerType": "Agency",
        "owner.ownerId": agencyId,
      }).populate("property", "address"),

      // Jobs related to properties owned by this agency
      Job.find({
        property: { $in: properties.map((p) => p._id) },
      }).populate("property", "address"),
    ]);

    // Combine and deduplicate jobs
    const allJobIds = new Set();
    const jobs = [...directJobs, ...propertyJobs].filter((job) => {
      if (allJobIds.has(job._id.toString())) {
        return false;
      }
      allJobIds.add(job._id.toString());
      return true;
    });

    // Get property managers managed by this agency
    const propertyManagers = await PropertyManager.find({
      "owner.ownerType": "Agency",
      "owner.ownerId": agencyId,
    });

    // Get job status distribution
    const jobStatusDistribution = await Job.aggregate([
      {
        $match: {
          $or: [
            {
              "owner.ownerType": "Agency",
              "owner.ownerId": new mongoose.Types.ObjectId(agencyId),
            },
            {
              property: { $in: properties.map((p) => p._id) },
            },
          ],
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Calculate total jobs and percentages
    const totalJobs = jobStatusDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const statusDistribution = jobStatusDistribution.map((item) => ({
      status: item.status,
      count: item.count,
      percentage:
        totalJobs > 0 ? Math.round((item.count / totalJobs) * 100) : 0,
    }));

    // Get monthly progress (last 6 months)
    const today = new Date();
    const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

    const monthlyProgress = await Job.aggregate([
      {
        $match: {
          $or: [
            {
              "owner.ownerType": "Agency",
              "owner.ownerId": new mongoose.Types.ObjectId(agencyId),
            },
            {
              property: { $in: properties.map((p) => p._id) },
            },
          ],
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $addFields: {
          month: {
            $month: "$createdAt",
          },
          year: {
            $year: "$createdAt",
          },
          isCompleted: { $eq: ["$status", "Completed"] },
          isScheduled: { $eq: ["$status", "Scheduled"] },
        },
      },
      {
        $group: {
          _id: {
            month: "$month",
            year: "$year",
          },
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: ["$isCompleted", 1, 0],
            },
          },
          scheduled: {
            $sum: {
              $cond: ["$isScheduled", 1, 0],
            },
          },
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          total: 1,
          completed: 1,
          scheduled: 1,
          _id: 0,
        },
      },
      { $sort: { year: 1, month: 1 } },
    ]);

    // Map month numbers to month names and fill missing months
    const monthNames = [
      "",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyProgressMap = {};

    // Initialize last 6 months with zero values
    for (let i = 0; i < 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      monthlyProgressMap[key] = {
        month: monthNames[date.getMonth() + 1],
        year: date.getFullYear(),
        total: 0,
        completed: 0,
        scheduled: 0,
      };
    }

    // Fill in actual data
    monthlyProgress.forEach((item) => {
      const key = `${item.year}-${item.month}`;
      if (monthlyProgressMap[key]) {
        monthlyProgressMap[key] = {
          month: monthNames[item.month],
          year: item.year,
          total: item.total,
          completed: item.completed,
          scheduled: item.scheduled,
        };
      }
    });

    const monthlyProgressArray = Object.values(monthlyProgressMap).reverse();

    // Get quick statistics
    const quickStats = {
      totalProperties: properties.length,
      totalJobs: jobs.length,
      totalPropertyManagers: propertyManagers.length,
      activeJobs: jobs.filter((job) =>
        ["Pending", "Scheduled"].includes(job.status)
      ).length,
      completedJobs: jobs.filter((job) => job.status === "Completed").length,
      overdueJobs: jobs.filter(
        (job) =>
          job.status !== "Completed" &&
          job.dueDate &&
          new Date(job.dueDate) < new Date()
      ).length,
    };

    // Get property status distribution
    const propertyStatusDistribution = await Property.aggregate([
      {
        $match: {
          agency: new mongoose.Types.ObjectId(agencyId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Calculate property status percentages
    const totalProperties = propertyStatusDistribution.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const propertyStatusData = propertyStatusDistribution.map((item) => ({
      status: item.status,
      count: item.count,
      percentage:
        totalProperties > 0
          ? Math.round((item.count / totalProperties) * 100)
          : 0,
    }));

    // Get property manager availability distribution
    const propertyManagerAvailability = await PropertyManager.aggregate([
      {
        $match: {
          "owner.ownerType": "Agency",
          "owner.ownerId": new mongoose.Types.ObjectId(agencyId),
        },
      },
      {
        $group: {
          _id: "$availabilityStatus",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Calculate property manager availability percentages
    const totalPropertyManagersForAvailability =
      propertyManagerAvailability.reduce((sum, item) => sum + item.count, 0);
    const propertyManagerAvailabilityData = propertyManagerAvailability.map(
      (item) => ({
        status: item.status,
        count: item.count,
        percentage:
          totalPropertyManagersForAvailability > 0
            ? Math.round(
                (item.count / totalPropertyManagersForAvailability) * 100
              )
            : 0,
      })
    );

    // Get property manager status distribution
    const propertyManagerStatus = await PropertyManager.aggregate([
      {
        $match: {
          "owner.ownerType": "Agency",
          "owner.ownerId": new mongoose.Types.ObjectId(agencyId),
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          status: "$_id",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Calculate property manager status percentages
    const totalPropertyManagers = propertyManagerStatus.reduce(
      (sum, item) => sum + item.count,
      0
    );
    const propertyManagerStatusData = propertyManagerStatus.map((item) => ({
      status: item.status,
      count: item.count,
      percentage:
        totalPropertyManagers > 0
          ? Math.round((item.count / totalPropertyManagers) * 100)
          : 0,
    }));

    // Get recent activity (last 5 jobs)
    const recentJobs = jobs
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map((job) => ({
        id: job._id,
        job_id: job.job_id,
        jobType: job.jobType,
        status: job.status,
        dueDate: job.dueDate,
        updatedAt: job.updatedAt,
        property: job.property?.address?.fullAddress || "N/A",
      }));

    // Get recent properties (last 5)
    const recentProperties = properties
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((property) => ({
        id: property._id,
        address: property.address?.fullAddress || "N/A",
        propertyType: property.propertyType,
        status: property.status,
        createdAt: property.createdAt,
      }));

    // Get recent property managers (last 5)
    const recentPropertyManagers = propertyManagers
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((pm) => ({
        id: pm._id,
        fullName: `${pm.firstName} ${pm.lastName}`,
        email: pm.email,
        status: pm.status,
        availabilityStatus: pm.availabilityStatus,
        assignedPropertiesCount: pm.assignedProperties?.length || 0,
        createdAt: pm.createdAt,
      }));

    // Get performance summary
    const performanceSummary = {
      completionRate:
        jobs.length > 0
          ? Math.round((quickStats.completedJobs / jobs.length) * 100)
          : 0,
      averageJobsPerProperty:
        properties.length > 0
          ? Math.round((jobs.length / properties.length) * 10) / 10
          : 0,
      averagePropertiesPerManager:
        propertyManagers.length > 0
          ? Math.round((properties.length / propertyManagers.length) * 10) / 10
          : 0,
    };

    res.status(200).json({
      status: "success",
      message: "Dashboard data retrieved successfully",
      data: {
        quickStats,
        jobStatusDistribution: statusDistribution,
        propertyStatusDistribution: propertyStatusData,
        propertyManagerAvailability: propertyManagerAvailabilityData,
        propertyManagerStatus: propertyManagerStatusData,
        monthlyProgress: monthlyProgressArray,
        recentJobs,
        recentProperties,
        recentPropertyManagers,
        performanceSummary,
        lastUpdated: new Date(),
      },
    });
  } catch (error) {
    console.error("Get agency dashboard error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to retrieve dashboard data",
    });
  }
});

// Update Agency (Only Super Users and Team Members)
router.patch("/:id", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      companyName,
      abn,
      contactPerson,
      email,
      phone,
      region,
      compliance,
      status,
      outstandingAmount,
    } = req.body;

    // Find agency
    const agency = await Agency.findById(id);
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    // Store original values for logging
    const originalValues = {
      companyName: agency.companyName,
      abn: agency.abn,
      contactPerson: agency.contactPerson,
      email: agency.email,
      phone: agency.phone,
      region: agency.region,
      compliance: agency.compliance,
      status: agency.status,
      outstandingAmount: agency.outstandingAmount,
    };

    // Validate and update fields if provided
    if (companyName !== undefined) {
      if (!companyName || companyName.trim().length < 2) {
        return res.status(400).json({
          status: "error",
          message: "Company name must be at least 2 characters long",
        });
      }
      agency.companyName = companyName.trim();
    }

    if (abn !== undefined) {
      if (!abn || !/^\d{11}$/.test(abn)) {
        return res.status(400).json({
          status: "error",
          message: "ABN must be 11 digits",
        });
      }
      // Check if ABN is already used by another agency
      const existingABN = await Agency.findOne({ abn, _id: { $ne: id } });
      if (existingABN) {
        return res.status(400).json({
          status: "error",
          message: "ABN is already used by another agency",
        });
      }
      agency.abn = abn;
    }

    if (contactPerson !== undefined) {
      if (!contactPerson || contactPerson.trim().length < 2) {
        return res.status(400).json({
          status: "error",
          message: "Contact person name must be at least 2 characters long",
        });
      }
      agency.contactPerson = contactPerson.trim();
    }

    if (email !== undefined) {
      if (
        !email ||
        !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)
      ) {
        return res.status(400).json({
          status: "error",
          message: "Please enter a valid email address",
        });
      }
      // Check if email is already used by another agency
      const existingEmail = await Agency.findOne({
        email: email.toLowerCase(),
        _id: { $ne: id },
      });
      if (existingEmail) {
        return res.status(400).json({
          status: "error",
          message: "Email is already used by another agency",
        });
      }
      agency.email = email.toLowerCase();
    }

    if (phone !== undefined) {
      if (!phone || !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        return res.status(400).json({
          status: "error",
          message: "Please enter a valid phone number",
        });
      }
      agency.phone = phone.trim();
    }

    if (region !== undefined) {
      if (!VALID_REGIONS.includes(region)) {
        return res.status(400).json({
          status: "error",
          message: "Please select a valid region",
        });
      }
      agency.region = region;
    }

    if (compliance !== undefined) {
      const validCompliance = [
        "Basic Package",
        "Basic Compliance",
        "Standard Package",
        "Premium Package",
        "Full Package",
      ];
      if (!validCompliance.includes(compliance)) {
        return res.status(400).json({
          status: "error",
          message: "Please select a valid compliance package",
        });
      }
      agency.compliance = compliance;
    }

    if (status !== undefined) {
      const validStatuses = ["Active", "Inactive", "Suspended", "Pending"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: "error",
          message: "Please select a valid status",
        });
      }
      agency.status = status;
    }

    if (outstandingAmount !== undefined) {
      if (isNaN(outstandingAmount) || outstandingAmount < 0) {
        return res.status(400).json({
          status: "error",
          message: "Outstanding amount must be a non-negative number",
        });
      }
      agency.outstandingAmount = outstandingAmount;
    }

    // Update timestamp
    agency.lastUpdated = new Date();

    // Save updated agency
    await agency.save();

    console.log("Agency updated:", {
      agencyId: agency._id,
      updatedBy: req.superUser.email,
      originalValues,
      newValues: {
        companyName: agency.companyName,
        abn: agency.abn,
        contactPerson: agency.contactPerson,
        email: agency.email,
        phone: agency.phone,
        region: agency.region,
        compliance: agency.compliance,
        status: agency.status,
        outstandingAmount: agency.outstandingAmount,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "Agency updated successfully",
      data: {
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          lastLogin: agency.lastLogin,
          joinedDate: agency.joinedDate,
          lastUpdated: agency.lastUpdated,
        },
      },
    });
  } catch (error) {
    console.error("Update agency error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred while updating agency",
    });
  }
});

// Get All Agencies (Only Super Users and Team Members)
router.get("/all", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { status, region, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (region) filter.region = region;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get agencies with pagination
    const agencies = await Agency.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Agency.countDocuments(filter);

    res.status(200).json({
      status: "success",
      data: {
        agencies: agencies.map((agency) => ({
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          lastLogin: agency.lastLogin,
          joinedDate: agency.joinedDate,
          createdAt: agency.createdAt,
          subscription: (agency.subscriptionId || agency.subscriptionStatus || agency.planType) ? {
            id: agency.subscriptionId,
            planType: agency.planType,
            status: agency.subscriptionStatus,
            subscriptionStartDate: agency.subscriptionStartDate,
            subscriptionEndDate: agency.subscriptionEndDate,
            trialEndsAt: agency.trialEndsAt,
            currentPeriodStart: agency.currentPeriodStart,
            currentPeriodEnd: agency.currentPeriodEnd,
          } : null,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all agencies error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching agencies",
    });
  }
});

// Get Single Agency Details with Properties and Jobs (Only Super Users and Team Members)
router.get("/:id", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid agency ID format",
      });
    }

    const agency = await Agency.findById(id);
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    // Get properties managed by this agency using the direct agency reference
    const properties = await Property.find({
      agency: id,
    })
      .select(
        "address propertyType currentTenant currentLandlord complianceSchedule status createdAt"
      )
      .sort({ createdAt: -1 });

    // Get jobs related to this agency - both directly owned and through properties
    const [directJobs, propertyJobs] = await Promise.all([
      // Jobs directly owned by the agency
      Job.find({
        "owner.ownerType": "Agency",
        "owner.ownerId": id,
      })
        .populate("property", "address")
        .populate("assignedTechnician", "firstName lastName tradeType availabilityStatus")
        .select(
          "job_id jobType dueDate status priority description cost estimatedDuration actualDuration completedAt createdAt"
        ),

      // Jobs related to properties owned by this agency
      Job.find({
        property: { $in: properties.map((p) => p._id) },
      })
        .populate("property", "address")
        .populate("assignedTechnician", "firstName lastName tradeType availabilityStatus")
        .select(
          "job_id jobType dueDate status priority description cost estimatedDuration actualDuration completedAt createdAt"
        ),
    ]);

    // Combine and deduplicate jobs
    const allJobIds = new Set();
    const jobs = [...directJobs, ...propertyJobs]
      .filter((job) => {
        if (allJobIds.has(job._id.toString())) {
          return false;
        }
        allJobIds.add(job._id.toString());
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Get property managers managed by this agency
    const propertyManagers = await PropertyManager.find({
      "owner.ownerType": "Agency",
      "owner.ownerId": id,
    })
      .select(
        "firstName lastName email phone availabilityStatus assignedProperties status createdAt"
      )
      .sort({ createdAt: -1 });

    // Calculate comprehensive statistics
    const stats = {
      totalProperties: properties.length,
      totalJobs: jobs.length,
      totalPropertyManagers: propertyManagers.length,
      jobStatusCounts: {
        pending: jobs.filter((job) => job.status === "Pending").length,
        scheduled: jobs.filter((job) => job.status === "Scheduled").length,
        completed: jobs.filter((job) => job.status === "Completed").length,
        overdue: jobs.filter((job) => job.status === "Overdue").length,
      },
      propertyStatusCounts: {
        active: properties.filter((prop) => prop.status === "Active").length,
        inactive: properties.filter((prop) => prop.status === "Inactive")
          .length,
        maintenance: properties.filter(
          (prop) => prop.status === "Under Maintenance"
        ).length,
      },
      propertyManagerAvailability: {
        available: propertyManagers.filter(
          (manager) => manager.availabilityStatus === "Available"
        ).length,
        busy: propertyManagers.filter(
          (manager) => manager.availabilityStatus === "Busy"
        ).length,
        unavailable: propertyManagers.filter(
          (manager) => manager.availabilityStatus === "Unavailable"
        ).length,
      },
      financials: {
        totalJobValue: jobs.reduce(
          (sum, job) => sum + (job.cost?.totalCost || 0),
          0
        ),
        completedJobValue: jobs
          .filter((job) => job.status === "Completed")
          .reduce((sum, job) => sum + (job.cost?.totalCost || 0), 0),
        averageJobValue:
          jobs.length > 0
            ? jobs.reduce((sum, job) => sum + (job.cost?.totalCost || 0), 0) /
              jobs.length
            : 0,
      },
    };

    res.status(200).json({
      status: "success",
      data: {
        agency: {
          id: agency._id,
          companyName: agency.companyName,
          contactPerson: agency.contactPerson,
          email: agency.email,
          phone: agency.phone,
          region: agency.region,
          compliance: agency.compliance,
          status: agency.status,
          abn: agency.abn,
          outstandingAmount: agency.outstandingAmount,
          totalProperties: agency.totalProperties,
          lastLogin: agency.lastLogin,
          joinedDate: agency.joinedDate,
          createdAt: agency.createdAt,
          lastUpdated: agency.lastUpdated,
          subscription: (agency.subscriptionId || agency.subscriptionStatus || agency.planType) ? {
            id: agency.subscriptionId,
            planType: agency.planType,
            status: agency.subscriptionStatus,
            subscriptionStartDate: agency.subscriptionStartDate,
            subscriptionEndDate: agency.subscriptionEndDate,
            trialEndsAt: agency.trialEndsAt,
            currentPeriodStart: agency.currentPeriodStart,
            currentPeriodEnd: agency.currentPeriodEnd,
          } : null,
        },
        statistics: stats,
        properties: properties.map((property) => ({
          id: property._id,
          address: {
            street: property.address?.street,
            suburb: property.address?.suburb,
            state: property.address?.state,
            postcode: property.address?.postcode,
            fullAddress: property.address?.fullAddress,
          },
          propertyType: property.propertyType,
          currentTenant: {
            name: property.currentTenant?.name,
            email: property.currentTenant?.email,
            phone: property.currentTenant?.phone,
          },
          currentLandlord: {
            name: property.currentLandlord?.name,
            email: property.currentLandlord?.email,
            phone: property.currentLandlord?.phone,
          },
          complianceSchedule: property.complianceSchedule,
          status: property.status,
          createdAt: property.createdAt,
        })),
        jobs: jobs.map((job) => ({
          id: job._id,
          job_id: job.job_id,
          jobType: job.jobType,
          property: job.property
            ? {
                id: job.property._id,
                address: job.property.address,
              }
            : null,
          assignedTechnician: job.assignedTechnician
            ? {
                id: job.assignedTechnician._id,
                fullName: job.assignedTechnician.fullName,
                tradeType: job.assignedTechnician.tradeType,
                availabilityStatus: job.assignedTechnician.availabilityStatus,
              }
            : null,
          dueDate: job.dueDate,
          status: job.status,
          priority: job.priority,
          description: job.description,
          cost: {
            materialCost: job.cost?.materialCost || 0,
            laborCost: job.cost?.laborCost || 0,
            totalCost: job.cost?.totalCost || 0,
          },
          estimatedDuration: job.estimatedDuration,
          actualDuration: job.actualDuration,
          completedAt: job.completedAt,
          createdAt: job.createdAt,
        })),
        propertyManagers: propertyManagers.map((manager) => ({
          id: manager._id,
          fullName: `${manager.firstName} ${manager.lastName}`,
          email: manager.email,
          phone: manager.phone,
          availabilityStatus: manager.availabilityStatus,
          assignedPropertiesCount: manager.assignedProperties?.length || 0,
          status: manager.status,
          createdAt: manager.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get agency details error:", error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while fetching agency details",
    });
  }
});

// Delete Agency (Only Super Users and Team Members)
router.delete("/:id", authenticateUserTypes(['SuperUser', 'TeamMember']), async (req, res) => {
  try {
    const { id } = req.params;

    // Find agency
    const agency = await Agency.findById(id);
    if (!agency) {
      return res.status(404).json({
        status: "error",
        message: "Agency not found",
      });
    }

    // Store info for logging before deletion
    const agencyInfo = {
      id: agency._id,
      companyName: agency.companyName,
      contactPerson: agency.contactPerson,
      email: agency.email,
      abn: agency.abn,
      region: agency.region,
      status: agency.status,
    };

    // Delete the agency
    await Agency.findByIdAndDelete(id);

    // Log the deletion
    console.log("Agency deleted successfully:", {
      deletedAgency: agencyInfo,
      deletedBy: req.superUser.email,
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({
      status: "success",
      message: "Agency deleted successfully",
      data: {
        deletedAgency: agencyInfo,
        deletedBy: req.superUser.name,
      },
    });
  } catch (error) {
    console.error("Delete agency error:", error);
    res.status(500).json({
      status: "error",
      message: error.message || "An error occurred while deleting agency",
    });
  }
});

// Resend Credentials Email - Agency
router.post(
  "/:id/resend-credentials",
  authenticateUserTypes(['SuperUser', 'TeamMember']),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Find agency
      const agency = await Agency.findById(id);
      if (!agency) {
        return res.status(404).json({
          status: "error",
          message: "Agency not found",
        });
      }

      // Generate a random password
      const generateRandomPassword = () => {
        const length = 12;
        const charset =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
        let password = "";
        for (let i = 0; i < length; i++) {
          password += charset.charAt(
            Math.floor(Math.random() * charset.length)
          );
        }
        return password;
      };

      const newPassword = generateRandomPassword();

      // Update the agency's password
      agency.password = newPassword; // This will be hashed by the pre-save middleware
      await agency.save();

      // Send credentials email
      try {
        await emailService.sendAgencyCredentialsEmail(
          {
            email: agency.email,
            contactPerson: agency.contactPerson,
            companyName: agency.companyName,
            abn: agency.abn,
            region: agency.region,
            compliance: agency.compliance,
          },
          newPassword,
          process.env.FRONTEND_URL ||
            "https://rentalease-client.vercel.app/login"
        );

        console.log("Agency credentials resent successfully:", {
          agencyId: agency._id,
          email: agency.email,
          companyName: agency.companyName,
          resentBy: req.superUser.email,
          timestamp: new Date().toISOString(),
        });

        res.status(200).json({
          status: "success",
          message:
            "Credentials email has been resent successfully with a new password",
          data: {
            email: agency.email,
            resentAt: new Date().toISOString(),
          },
        });
      } catch (emailError) {
        console.error("Failed to resend agency credentials email:", emailError);
        res.status(500).json({
          status: "error",
          message: "Failed to send credentials email. Please try again later.",
        });
      }
    } catch (error) {
      console.error("Resend agency credentials error:", error);
      res.status(500).json({
        status: "error",
        message:
          error.message || "An error occurred while resending credentials",
      });
    }
  }
);

export default router;
