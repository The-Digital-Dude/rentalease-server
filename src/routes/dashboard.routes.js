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

// GET - Filtered dashboard statistics with advanced options
router.get(
  "/admin-stats-filtered",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      console.log("Fetching filtered admin dashboard statistics...");
      
      const {
        startDate,
        endDate,
        viewType = 'monthly', // daily, weekly, monthly
        statusFilter = 'all'
      } = req.query;

      let dateFilter = {};
      if (startDate && endDate) {
        dateFilter = {
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
          }
        };
      }

      // Build status filter
      let jobStatusFilter = {};
      if (statusFilter && statusFilter !== 'all') {
        jobStatusFilter.status = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace('_', ' ');
      }

      // Get filtered monthly/weekly/daily trends
      const getTimeGrouping = () => {
        switch (viewType) {
          case 'daily':
            return {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" }
            };
          case 'weekly':
            return {
              year: { $year: "$createdAt" },
              week: { $week: "$createdAt" }
            };
          case 'monthly':
          default:
            return {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            };
        }
      };

      const timeGrouping = getTimeGrouping();
      
      const trendsData = await Job.aggregate([
        {
          $match: { ...dateFilter, ...jobStatusFilter }
        },
        {
          $group: {
            _id: timeGrouping,
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
            },
            pendingJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
            },
            inProgressJobs: {
              $sum: { $cond: [{ $eq: ["$status", "In Progress"] }, 1, 0] }
            },
            overdueJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Overdue"] }, 1, 0] }
            }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } }
      ]);

      // Format trends data based on view type
      const formatTrendsData = (data) => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        return data.map(item => {
          let label = '';
          
          switch (viewType) {
            case 'daily':
              label = `${item._id.day}/${item._id.month}/${item._id.year}`;
              break;
            case 'weekly':
              label = `Week ${item._id.week}, ${item._id.year}`;
              break;
            case 'monthly':
            default:
              label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
              break;
          }
          
          return {
            period: label,
            totalJobs: item.totalJobs,
            completedJobs: item.completedJobs,
            pendingJobs: item.pendingJobs,
            inProgressJobs: item.inProgressJobs,
            overdueJobs: item.overdueJobs,
            completionRate: item.totalJobs > 0 ? ((item.completedJobs / item.totalJobs) * 100).toFixed(1) : 0
          };
        });
      };

      const formattedTrendsData = formatTrendsData(trendsData);

      // Get filtered job status distribution
      const statusDistribution = await Job.aggregate([
        { $match: { ...dateFilter } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]);

      const totalFilteredJobs = statusDistribution.reduce((sum, item) => sum + item.count, 0);

      res.status(200).json({
        status: "success",
        message: "Filtered dashboard statistics retrieved successfully",
        data: {
          trends: formattedTrendsData,
          statusDistribution: statusDistribution.map(item => ({
            status: item._id || "Unknown",
            count: item.count,
            percentage: totalFilteredJobs > 0 ? ((item.count / totalFilteredJobs) * 100).toFixed(1) : 0
          })),
          totalJobs: totalFilteredJobs,
          dateRange: { startDate, endDate },
          viewType,
          statusFilter,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Get filtered dashboard statistics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get filtered dashboard statistics"
      });
    }
  }
);

// GET - Executive Dashboard with comprehensive KPIs
router.get(
  "/executive-dashboard",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      console.log("Fetching executive dashboard data...");

      // Date ranges for different periods
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const thisYearStart = new Date(now.getFullYear(), 0, 1);

      // Core business metrics with period comparisons
      const [
        todayStats,
        yesterdayStats,
        thisWeekStats,
        lastWeekStats,
        thisMonthStats,
        lastMonthStats,
        yearStats
      ] = await Promise.all([
        // Today's stats
        Promise.all([
          Job.countDocuments({ createdAt: { $gte: todayStart } }),
          Job.countDocuments({ status: "Completed", updatedAt: { $gte: todayStart } }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: todayStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // Yesterday's stats
        Promise.all([
          Job.countDocuments({
            createdAt: { $gte: yesterdayStart, $lt: todayStart }
          }),
          Job.countDocuments({
            status: "Completed",
            updatedAt: { $gte: yesterdayStart, $lt: todayStart }
          }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: yesterdayStart, $lt: todayStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // This week's stats
        Promise.all([
          Job.countDocuments({ createdAt: { $gte: thisWeekStart } }),
          Job.countDocuments({ status: "Completed", updatedAt: { $gte: thisWeekStart } }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: thisWeekStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // Last week's stats
        Promise.all([
          Job.countDocuments({
            createdAt: { $gte: lastWeekStart, $lt: thisWeekStart }
          }),
          Job.countDocuments({
            status: "Completed",
            updatedAt: { $gte: lastWeekStart, $lt: thisWeekStart }
          }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: lastWeekStart, $lt: thisWeekStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // This month's stats
        Promise.all([
          Job.countDocuments({ createdAt: { $gte: thisMonthStart } }),
          Job.countDocuments({ status: "Completed", updatedAt: { $gte: thisMonthStart } }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: thisMonthStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // Last month's stats
        Promise.all([
          Job.countDocuments({
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
          }),
          Job.countDocuments({
            status: "Completed",
            updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
          }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        })),

        // Year to date
        Promise.all([
          Job.countDocuments({ createdAt: { $gte: thisYearStart } }),
          Job.countDocuments({ status: "Completed", updatedAt: { $gte: thisYearStart } }),
          TechnicianPayment.aggregate([
            { $match: { createdAt: { $gte: thisYearStart } } },
            { $group: { _id: null, total: { $sum: "$amount" } } }
          ])
        ]).then(([newJobs, completedJobs, payments]) => ({
          newJobs,
          completedJobs,
          revenue: payments[0]?.total || 0
        }))
      ]);

      // Calculate growth percentages
      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
      };

      // Business health indicators
      const [
        totalActiveEntities,
        jobCompletionRate,
        avgJobValue,
        customerSatisfaction,
        technicianUtilization
      ] = await Promise.all([
        // Active entities count
        Promise.all([
          Agency.countDocuments({ status: "Active" }),
          Property.countDocuments(),
          Technician.countDocuments({ status: "Active" }),
          PropertyManager.countDocuments({ status: "Active" })
        ]).then(([agencies, properties, technicians, managers]) => ({
          agencies,
          properties,
          technicians,
          managers,
          total: agencies + properties + technicians + managers
        })),

        // Job completion rate (this month)
        Job.aggregate([
          { $match: { createdAt: { $gte: thisMonthStart } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
              }
            }
          }
        ]).then(result => {
          if (result.length > 0 && result[0].total > 0) {
            return parseFloat(((result[0].completed / result[0].total) * 100).toFixed(1));
          }
          return 0;
        }),

        // Average job value
        TechnicianPayment.aggregate([
          { $match: { createdAt: { $gte: thisMonthStart } } },
          {
            $group: {
              _id: null,
              avgAmount: { $avg: "$amount" },
              totalJobs: { $sum: 1 }
            }
          }
        ]).then(result => result[0]?.avgAmount || 0),

        // Mock customer satisfaction (in real system, this would come from feedback)
        Promise.resolve(4.6),

        // Technician utilization rate
        Technician.aggregate([
          { $match: { status: "Active" } },
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "assignedTechnician",
              as: "jobs"
            }
          },
          {
            $project: {
              totalJobs: { $size: "$jobs" },
              activeJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $eq: ["$$this.status", "In Progress"] }
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: null,
              avgUtilization: { $avg: { $divide: ["$activeJobs", { $max: ["$totalJobs", 1] }] } }
            }
          }
        ]).then(result => (result[0]?.avgUtilization * 100) || 0)
      ]);

      const executiveDashboard = {
        kpis: {
          today: {
            newJobs: todayStats.newJobs,
            completedJobs: todayStats.completedJobs,
            revenue: todayStats.revenue,
            growth: {
              newJobs: calculateGrowth(todayStats.newJobs, yesterdayStats.newJobs),
              completedJobs: calculateGrowth(todayStats.completedJobs, yesterdayStats.completedJobs),
              revenue: calculateGrowth(todayStats.revenue, yesterdayStats.revenue)
            }
          },
          thisWeek: {
            newJobs: thisWeekStats.newJobs,
            completedJobs: thisWeekStats.completedJobs,
            revenue: thisWeekStats.revenue,
            growth: {
              newJobs: calculateGrowth(thisWeekStats.newJobs, lastWeekStats.newJobs),
              completedJobs: calculateGrowth(thisWeekStats.completedJobs, lastWeekStats.completedJobs),
              revenue: calculateGrowth(thisWeekStats.revenue, lastWeekStats.revenue)
            }
          },
          thisMonth: {
            newJobs: thisMonthStats.newJobs,
            completedJobs: thisMonthStats.completedJobs,
            revenue: thisMonthStats.revenue,
            growth: {
              newJobs: calculateGrowth(thisMonthStats.newJobs, lastMonthStats.newJobs),
              completedJobs: calculateGrowth(thisMonthStats.completedJobs, lastMonthStats.completedJobs),
              revenue: calculateGrowth(thisMonthStats.revenue, lastMonthStats.revenue)
            }
          },
          yearToDate: {
            newJobs: yearStats.newJobs,
            completedJobs: yearStats.completedJobs,
            revenue: yearStats.revenue
          }
        },
        businessHealth: {
          totalActiveEntities,
          jobCompletionRate,
          avgJobValue: parseFloat(avgJobValue.toFixed(2)),
          customerSatisfaction,
          technicianUtilization: parseFloat(technicianUtilization.toFixed(1))
        },
        alerts: {
          critical: await Job.countDocuments({ status: "Overdue" }),
          warnings: await TechnicianPayment.countDocuments({ status: "Pending" }),
          info: await Agency.countDocuments({ status: "Inactive" })
        },
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        status: "success",
        message: "Executive dashboard data retrieved successfully",
        data: executiveDashboard
      });

    } catch (error) {
      console.error("Get executive dashboard error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get executive dashboard data"
      });
    }
  }
);

// GET - Operational Analytics
router.get(
  "/operational-analytics",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      console.log("Fetching operational analytics...");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Resource utilization metrics
      const [
        technicianWorkload,
        jobTypeDistribution,
        propertyJobFrequency,
        regionPerformance,
        timeToCompletion
      ] = await Promise.all([
        // Technician workload analysis
        Technician.aggregate([
          { $match: { status: "Active" } },
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "assignedTechnician",
              as: "jobs"
            }
          },
          {
            $project: {
              firstName: 1,
              lastName: 1,
              tradeType: 1,
              totalJobs: { $size: "$jobs" },
              activeJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $eq: ["$$this.status", "In Progress"] }
                  }
                }
              },
              completedThisMonth: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: {
                      $and: [
                        { $eq: ["$$this.status", "Completed"] },
                        { $gte: ["$$this.updatedAt", thirtyDaysAgo] }
                      ]
                    }
                  }
                }
              }
            }
          },
          {
            $project: {
              name: { $concat: ["$firstName", " ", "$lastName"] },
              tradeType: 1,
              totalJobs: 1,
              activeJobs: 1,
              completedThisMonth: 1,
              utilizationRate: {
                $multiply: [
                  { $divide: ["$activeJobs", { $max: ["$totalJobs", 1] }] },
                  100
                ]
              }
            }
          },
          { $sort: { utilizationRate: -1 } }
        ]),

        // Job type distribution
        Job.aggregate([
          { $match: { createdAt: { $gte: thirtyDaysAgo } } },
          {
            $group: {
              _id: "$jobType",
              count: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
              },
              avgCompletionTime: {
                $avg: {
                  $cond: [
                    { $eq: ["$status", "Completed"] },
                    {
                      $divide: [
                        { $subtract: ["$updatedAt", "$createdAt"] },
                        1000 * 60 * 60 * 24
                      ]
                    },
                    null
                  ]
                }
              }
            }
          },
          {
            $project: {
              jobType: "$_id",
              count: 1,
              completed: 1,
              completionRate: {
                $multiply: [{ $divide: ["$completed", "$count"] }, 100]
              },
              avgCompletionTime: { $round: ["$avgCompletionTime", 1] }
            }
          },
          { $sort: { count: -1 } }
        ]),

        // Property job frequency
        Property.aggregate([
          {
            $lookup: {
              from: "jobs",
              localField: "_id",
              foreignField: "property",
              as: "jobs"
            }
          },
          {
            $project: {
              address: 1,
              totalJobs: { $size: "$jobs" },
              recentJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $gte: ["$$this.createdAt", thirtyDaysAgo] }
                  }
                }
              },
              avgJobsPerMonth: {
                $divide: [
                  { $size: "$jobs" },
                  { $max: [
                    {
                      $divide: [
                        { $subtract: [new Date(), "$createdAt"] },
                        1000 * 60 * 60 * 24 * 30
                      ]
                    },
                    1
                  ]}
                ]
              }
            }
          },
          { $match: { totalJobs: { $gt: 0 } } },
          { $sort: { recentJobs: -1 } },
          { $limit: 20 }
        ]),

        // Regional performance (mock data - would need geographic info)
        Agency.aggregate([
          {
            $lookup: {
              from: "properties",
              localField: "_id",
              foreignField: "agency",
              as: "properties"
            }
          },
          {
            $lookup: {
              from: "jobs",
              localField: "properties._id",
              foreignField: "property",
              as: "jobs"
            }
          },
          {
            $project: {
              companyName: 1,
              state: "$address.state",
              totalProperties: { $size: "$properties" },
              totalJobs: { $size: "$jobs" },
              completedJobs: {
                $size: {
                  $filter: {
                    input: "$jobs",
                    cond: { $eq: ["$$this.status", "Completed"] }
                  }
                }
              }
            }
          },
          {
            $project: {
              companyName: 1,
              state: 1,
              totalProperties: 1,
              totalJobs: 1,
              completedJobs: 1,
              completionRate: {
                $multiply: [
                  { $divide: ["$completedJobs", { $max: ["$totalJobs", 1] }] },
                  100
                ]
              }
            }
          },
          { $sort: { totalJobs: -1 } }
        ]),

        // Time to completion analysis
        Job.aggregate([
          {
            $match: {
              status: "Completed",
              updatedAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $project: {
              jobType: 1,
              completionTime: {
                $divide: [
                  { $subtract: ["$updatedAt", "$createdAt"] },
                  1000 * 60 * 60 * 24
                ]
              }
            }
          },
          {
            $group: {
              _id: "$jobType",
              avgCompletionTime: { $avg: "$completionTime" },
              minCompletionTime: { $min: "$completionTime" },
              maxCompletionTime: { $max: "$completionTime" },
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              jobType: "$_id",
              avgCompletionTime: { $round: ["$avgCompletionTime", 1] },
              minCompletionTime: { $round: ["$minCompletionTime", 1] },
              maxCompletionTime: { $round: ["$maxCompletionTime", 1] },
              count: 1
            }
          },
          { $sort: { avgCompletionTime: 1 } }
        ])
      ]);

      const operationalData = {
        resourceUtilization: {
          technicianWorkload,
          totalActiveTechnicians: technicianWorkload.length,
          avgUtilization: technicianWorkload.length > 0
            ? (technicianWorkload.reduce((sum, tech) => sum + tech.utilizationRate, 0) / technicianWorkload.length).toFixed(1)
            : 0
        },
        jobAnalytics: {
          typeDistribution: jobTypeDistribution,
          timeToCompletion,
          totalJobTypes: jobTypeDistribution.length
        },
        propertyInsights: {
          jobFrequency: propertyJobFrequency,
          totalPropertiesWithJobs: propertyJobFrequency.length
        },
        regionalPerformance: regionPerformance,
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        status: "success",
        message: "Operational analytics retrieved successfully",
        data: operationalData
      });

    } catch (error) {
      console.error("Get operational analytics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get operational analytics"
      });
    }
  }
);

export default router;
