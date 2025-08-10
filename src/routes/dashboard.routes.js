import express from "express";
import mongoose from "mongoose";
import { authenticateUserTypes } from "../middleware/auth.middleware.js";

// Import models
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";
import TeamMember from "../models/TeamMember.js";
import TechnicianPayment from "../models/TechnicianPayment.js";

const router = express.Router();

// GET - Super User/Team Member dashboard statistics
router.get(
  "/admin-stats",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      console.log("Fetching admin dashboard statistics...");

      // Get counts for all entities
      const [
        totalAgencies,
        totalProperties,
        totalTechnicians,
        totalPropertyManagers,
        totalTeamMembers,
        totalJobs,
        activeJobs,
        completedJobs,
        pendingJobs,
        overdueJobs,
      ] = await Promise.all([
        Agency.countDocuments({ status: "Active" }),
        Property.countDocuments(),
        Technician.countDocuments({ status: "Active" }),
        PropertyManager.countDocuments({ status: "Active" }),
        TeamMember.countDocuments({ status: "Active" }),
        Job.countDocuments(),
        Job.countDocuments({ status: "In Progress" }),
        Job.countDocuments({ status: "Completed" }),
        Job.countDocuments({ status: "Pending" }),
        Job.countDocuments({ status: "Overdue" }),
      ]);

      // Get job status distribution
      const jobStatusDistribution = await Job.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentActivity = {
        newAgencies: await Agency.countDocuments({
          createdAt: { $gte: sevenDaysAgo },
        }),
        newProperties: await Property.countDocuments({
          createdAt: { $gte: sevenDaysAgo },
        }),
        newTechnicians: await Technician.countDocuments({
          createdAt: { $gte: sevenDaysAgo },
        }),
        newJobs: await Job.countDocuments({
          createdAt: { $gte: sevenDaysAgo },
        }),
        completedJobsWeek: await Job.countDocuments({
          status: "Completed",
          updatedAt: { $gte: sevenDaysAgo },
        }),
      };

      // Get payment statistics
      const paymentStats = await TechnicianPayment.aggregate([
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            pendingAmount: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] },
            },
            paidAmount: {
              $sum: { $cond: [{ $eq: ["$status", "Paid"] }, "$amount", 0] },
            },
            pendingCount: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
            },
            paidCount: {
              $sum: { $cond: [{ $eq: ["$status", "Paid"] }, 1, 0] },
            },
          },
        },
      ]);

      // Get monthly trends (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyTrends = await Job.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } },
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      // Format monthly trends data
      const monthNames = [
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
      const formattedMonthlyTrends = monthlyTrends.map((item) => ({
        month: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        totalJobs: item.totalJobs,
        completedJobs: item.completedJobs,
      }));

      // Get top performing technicians (by completed jobs this month)
      const thisMonthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const topTechnicians = await Job.aggregate([
        {
          $match: {
            status: "Completed",
            updatedAt: { $gte: thisMonthStart },
          },
        },
        {
          $group: {
            _id: "$assignedTechnician",
            completedJobs: { $sum: 1 },
          },
        },
        { $sort: { completedJobs: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "technicians",
            localField: "_id",
            foreignField: "_id",
            as: "technician",
          },
        },
        {
          $project: {
            technicianName: {
              $concat: [
                { $arrayElemAt: ["$technician.firstName", 0] },
                " ",
                { $arrayElemAt: ["$technician.lastName", 0] },
              ],
            },
            completedJobs: 1,
          },
        },
      ]);

      // Get recent jobs (last 10)
      const recentJobs = await Job.find()
        .populate("assignedTechnician", "firstName lastName")
        .populate(
          "property",
          "address.street address.suburb address.state address.postcode"
        )
        .sort({ createdAt: -1 })
        .limit(10)
        .select(
          "job_id jobType status dueDate createdAt assignedTechnician property"
        );

      const dashboardData = {
        overview: {
          totalAgencies,
          totalProperties,
          totalTechnicians,
          totalPropertyManagers,
          totalTeamMembers,
          totalJobs,
          activeJobs,
          completedJobs,
          pendingJobs,
          overdueJobs,
        },
        jobStatusDistribution: jobStatusDistribution.map((item) => ({
          status: item._id || "Unknown",
          count: item.count,
          percentage:
            totalJobs > 0 ? ((item.count / totalJobs) * 100).toFixed(1) : 0,
        })),
        recentActivity,
        paymentStats: paymentStats[0] || {
          totalPayments: 0,
          totalAmount: 0,
          pendingAmount: 0,
          paidAmount: 0,
          pendingCount: 0,
          paidCount: 0,
        },
        monthlyTrends: formattedMonthlyTrends,
        topTechnicians: topTechnicians.map((item) => ({
          name: item.technicianName,
          completedJobs: item.completedJobs,
        })),
        recentJobs: recentJobs.map((job) => {
          return {
            id: job._id,
            job_id: job.job_id,
            jobType: job.jobType,
            status: job.status,
            dueDate: job.dueDate,
            createdAt: job.createdAt,
            technicianName: job.assignedTechnician
              ? `${job.assignedTechnician.firstName} ${job.assignedTechnician.lastName}`
              : "Unassigned",
            propertyAddress: job.property
              ? `${job.property.address.street}, ${job.property.address.suburb}, ${job.property.address.postcode}, ${job.property.address.state}`
              : "Unknown",
          };
        }),
        lastUpdated: new Date().toISOString(),
      };

      res.status(200).json({
        status: "success",
        message: "Dashboard statistics retrieved successfully",
        data: dashboardData,
      });
    } catch (error) {
      console.error("Get dashboard statistics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get dashboard statistics",
      });
    }
  }
);

// GET - Get system health metrics
router.get(
  "/system-health",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Calculate system health metrics
      const [
        totalActiveUsers,
        jobsCompletionRate,
        avgResponseTime,
        systemAlerts,
      ] = await Promise.all([
        // Active users (agencies + technicians + property managers active in last 30 days)
        Promise.all([
          Agency.countDocuments({
            status: "Active",
            lastLoginAt: { $gte: thirtyDaysAgo },
          }),
          Technician.countDocuments({
            status: "Active",
            lastLoginAt: { $gte: thirtyDaysAgo },
          }),
          PropertyManager.countDocuments({
            status: "Active",
            lastLoginAt: { $gte: thirtyDaysAgo },
          }),
        ]).then((counts) => counts.reduce((sum, count) => sum + count, 0)),

        // Job completion rate (last 30 days)
        Job.aggregate([
          {
            $match: { createdAt: { $gte: thirtyDaysAgo } },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
              },
            },
          },
        ]).then((result) => {
          if (result.length > 0 && result[0].total > 0) {
            return ((result[0].completed / result[0].total) * 100).toFixed(1);
          }
          return "0";
        }),

        // Mock average response time (in a real system, this would come from monitoring)
        Promise.resolve("1.2s"),

        // System alerts (overdue jobs, pending payments, etc.)
        Promise.all([
          Job.countDocuments({ status: "Overdue" }),
          TechnicianPayment.countDocuments({ status: "Pending" }),
          Agency.countDocuments({ status: "Inactive" }),
        ]).then(([overdueJobs, pendingPayments, inactiveAgencies]) => [
          ...(overdueJobs > 0
            ? [
                {
                  type: "warning",
                  message: `${overdueJobs} overdue jobs require attention`,
                  count: overdueJobs,
                },
              ]
            : []),
          ...(pendingPayments > 0
            ? [
                {
                  type: "info",
                  message: `${pendingPayments} payments pending`,
                  count: pendingPayments,
                },
              ]
            : []),
          ...(inactiveAgencies > 0
            ? [
                {
                  type: "warning",
                  message: `${inactiveAgencies} inactive agencies`,
                  count: inactiveAgencies,
                },
              ]
            : []),
        ]),
      ]);

      res.status(200).json({
        status: "success",
        data: {
          totalActiveUsers,
          jobsCompletionRate: parseFloat(jobsCompletionRate),
          avgResponseTime,
          systemAlerts,
          uptime: "99.9%", // Mock data
          serverStatus: "Healthy",
          lastChecked: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Get system health error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get system health metrics",
      });
    }
  }
);

export default router;
