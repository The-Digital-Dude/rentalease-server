import express from "express";
import mongoose from "mongoose";
import { authenticateUserTypes } from "../middleware/auth.middleware.js";
import { normalizeComplianceSchedule } from "../utils/propertyHelpers.js";

// Import models
import Agency from "../models/Agency.js";
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import Technician from "../models/Technician.js";
import PropertyManager from "../models/PropertyManager.js";
import TeamMember from "../models/TeamMember.js";
import TechnicianPayment from "../models/TechnicianPayment.js";
import Quotation from "../models/Quotation.js";

const router = express.Router();
const JOB_STATUS_VALUES = [
  "Pending",
  "Pending Quotation",
  "Quotation Sent",
  "Scheduled",
  "Completed",
  "Overdue",
  "Cancelled",
];
const ACTIVE_JOB_STATUSES = JOB_STATUS_VALUES.filter(
  (status) => !["Completed", "Cancelled"].includes(status)
);
const STATUS_FILTER_MAP = {
  all: null,
  active: ACTIVE_JOB_STATUSES,
  completed: ["Completed"],
  pending: ["Pending"],
  pending_quotation: ["Pending Quotation"],
  quotation_sent: ["Quotation Sent"],
  scheduled: ["Scheduled"],
  overdue: ["Overdue"],
  cancelled: ["Cancelled"],
};
const MONTH_NAMES = [
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

const resolvedCompletedAtExpression = {
  $ifNull: ["$completedAt", "$updatedAt"],
};

const parseDateInput = (value, endOfDay = false) => {
  if (!value) return null;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  if (endOfDay) {
    parsedDate.setHours(23, 59, 59, 999);
  } else {
    parsedDate.setHours(0, 0, 0, 0);
  }

  return parsedDate;
};

const getDefaultRangeStart = (viewType) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (viewType) {
    case "daily":
      start.setDate(start.getDate() - 29);
      return start;
    case "weekly":
      start.setDate(start.getDate() - 7 * 11);
      return start;
    case "monthly":
    default:
      return new Date(start.getFullYear(), start.getMonth() - 5, 1);
  }
};

const getTimeGrouping = (viewType, dateField) => {
  switch (viewType) {
    case "daily":
      return {
        year: { $year: dateField },
        month: { $month: dateField },
        day: { $dayOfMonth: dateField },
      };
    case "weekly":
      return {
        year: { $isoWeekYear: dateField },
        week: { $isoWeek: dateField },
      };
    case "monthly":
    default:
      return {
        year: { $year: dateField },
        month: { $month: dateField },
      };
  }
};

const getBucketKey = (bucket, viewType) => {
  switch (viewType) {
    case "daily":
      return `${bucket.year}-${bucket.month}-${bucket.day}`;
    case "weekly":
      return `${bucket.year}-W${bucket.week}`;
    case "monthly":
    default:
      return `${bucket.year}-${bucket.month}`;
  }
};

const formatBucketLabel = (bucket, viewType) => {
  switch (viewType) {
    case "daily":
      return `${bucket.day}/${bucket.month}/${bucket.year}`;
    case "weekly":
      return `Week ${bucket.week}, ${bucket.year}`;
    case "monthly":
    default:
      return `${MONTH_NAMES[bucket.month - 1]} ${bucket.year}`;
  }
};

const buildTimeBuckets = (startDate, endDate, viewType) => {
  const buckets = [];

  if (viewType === "daily") {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      buckets.push({
        key: getBucketKey(
          {
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            day: cursor.getDate(),
          },
          viewType
        ),
        label: formatBucketLabel(
          {
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            day: cursor.getDate(),
          },
          viewType
        ),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
  }

  if (viewType === "weekly") {
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const week = getIsoWeek(cursor);
      const year = getIsoWeekYear(cursor);

      buckets.push({
        key: getBucketKey({ year, week }, viewType),
        label: formatBucketLabel({ year, week }, viewType),
      });
      cursor.setDate(cursor.getDate() + 7);
    }
    return Array.from(new Map(buckets.map((bucket) => [bucket.key, bucket])).values());
  }

  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  while (cursor <= endCursor) {
    buckets.push({
      key: getBucketKey(
        {
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
        },
        viewType
      ),
      label: formatBucketLabel(
        {
          year: cursor.getFullYear(),
          month: cursor.getMonth() + 1,
        },
        viewType
      ),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
};

const getIsoWeekYear = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
  return tempDate.getUTCFullYear();
};

const getIsoWeek = (date) => {
  const tempDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  tempDate.setUTCDate(tempDate.getUTCDate() + 4 - (tempDate.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);
};

const aggregateBucketCounts = async ({
  match = {},
  dateField = "$createdAt",
  viewType = "monthly",
}) => {
  const results = await Job.aggregate([
    { $match: match },
    {
      $group: {
        _id: getTimeGrouping(viewType, dateField),
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
  ]);

  return new Map(
    results.map((item) => [getBucketKey(item._id, viewType), item.count])
  );
};

const aggregateResolvedCompletedCount = async (startDate, endDate = null) => {
  const resolvedCompletedAtMatch = endDate
    ? { $gte: startDate, $lte: endDate }
    : { $gte: startDate };

  const result = await Job.aggregate([
    { $match: { status: "Completed" } },
    { $addFields: { resolvedCompletedAt: resolvedCompletedAtExpression } },
    { $match: { resolvedCompletedAt: resolvedCompletedAtMatch } },
    { $count: "count" },
  ]);

  return result[0]?.count || 0;
};

const aggregateStatusDistribution = async (match = {}) => {
  const rows = await Job.aggregate([
    { $match: match },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const countsByStatus = new Map(
    rows.map((row) => [row._id || "Unknown", row.count])
  );

  return JOB_STATUS_VALUES.map((status) => ({
    status,
    count: countsByStatus.get(status) || 0,
  }));
};

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
        Job.countDocuments({ status: { $in: ACTIVE_JOB_STATUSES } }),
        Job.countDocuments({ status: "Completed" }),
        Job.countDocuments({ status: "Pending" }),
        Job.countDocuments({ status: "Overdue" }),
      ]);

      const servicePricingBreakdown = await Agency.aggregate([
        {
          $project: {
            status: 1,
            servicePricing: { $ifNull: ["$servicePricing", []] },
            subscriptionAmount: { $ifNull: ["$subscriptionAmount", 0] },
          },
        },
        {
          $facet: {
            revenueMetrics: [
              {
                $group: {
                  _id: null,
                  totalConfiguredMonthlyRevenue: {
                    $sum: "$subscriptionAmount",
                  },
                  averageAgencyPricing: {
                    $avg: "$subscriptionAmount",
                  },
                  totalAgenciesWithPricing: {
                    $sum: {
                      $cond: [{ $gt: ["$subscriptionAmount", 0] }, 1, 0],
                    },
                  },
                },
              },
            ],
            serviceBreakdown: [
              { $unwind: "$servicePricing" },
              {
                $group: {
                  _id: "$servicePricing.serviceType",
                  agenciesUsingService: { $sum: 1 },
                  totalConfiguredRevenue: { $sum: "$servicePricing.price" },
                  averagePrice: { $avg: "$servicePricing.price" },
                },
              },
              { $sort: { totalConfiguredRevenue: -1, _id: 1 } },
            ],
          },
        },
      ]);

      // Get job status distribution
      const jobStatusDistribution = await aggregateStatusDistribution();

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
        completedJobsWeek: await aggregateResolvedCompletedCount(sevenDaysAgo),
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
      const monthlyRangeStart = getDefaultRangeStart("monthly");
      const monthlyRangeEnd = new Date();
      monthlyRangeEnd.setHours(23, 59, 59, 999);

      const [totalJobsByMonth, completedJobsByMonth] = await Promise.all([
        aggregateBucketCounts({
          match: { createdAt: { $gte: monthlyRangeStart, $lte: monthlyRangeEnd } },
          dateField: "$createdAt",
          viewType: "monthly",
        }),
        aggregateBucketCounts({
          match: {
            status: "Completed",
            completedAt: { $gte: monthlyRangeStart, $lte: monthlyRangeEnd },
          },
          dateField: "$completedAt",
          viewType: "monthly",
        }),
      ]);

      const legacyCompletedJobsByMonth = await aggregateBucketCounts({
        match: {
          status: "Completed",
          $or: [{ completedAt: null }, { completedAt: { $exists: false } }],
          updatedAt: { $gte: monthlyRangeStart, $lte: monthlyRangeEnd },
        },
        dateField: "$updatedAt",
        viewType: "monthly",
      });

      const formattedMonthlyTrends = buildTimeBuckets(
        monthlyRangeStart,
        monthlyRangeEnd,
        "monthly"
      ).map((bucket) => ({
        month: bucket.label,
        totalJobs: totalJobsByMonth.get(bucket.key) || 0,
        completedJobs:
          (completedJobsByMonth.get(bucket.key) || 0) +
          (legacyCompletedJobsByMonth.get(bucket.key) || 0),
      }));

      // Get top performing technicians (by completed jobs this month)
      const thisMonthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );
      const topTechnicians = await Job.aggregate([
        {
          $addFields: {
            resolvedCompletedAt: resolvedCompletedAtExpression,
          },
        },
        {
          $match: {
            status: "Completed",
            resolvedCompletedAt: { $gte: thisMonthStart },
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

      const pricingAggregation = servicePricingBreakdown[0] || {};
      const pricingRevenueMetrics = pricingAggregation.revenueMetrics?.[0] || {
        totalConfiguredMonthlyRevenue: 0,
        averageAgencyPricing: 0,
      };
      const topServices = (pricingAggregation.serviceBreakdown || []).map(
        (service) => ({
          serviceType: service._id,
          agenciesUsingService: service.agenciesUsingService,
          totalConfiguredRevenue: service.totalConfiguredRevenue || 0,
          averagePrice: parseFloat(
            ((service.averagePrice || 0) * 1).toFixed(2)
          ),
          percentageOfAgencies:
            totalAgencies > 0
              ? ((service.agenciesUsingService / totalAgencies) * 100).toFixed(
                  1
                )
              : "0.0",
        })
      );

      const totalConfiguredServiceEntries = topServices.reduce(
        (sum, service) => sum + service.agenciesUsingService,
        0
      );
      const totalConfiguredRevenueFromServices = topServices.reduce(
        (sum, service) => sum + service.totalConfiguredRevenue,
        0
      );
      const averageServicePrice =
        totalConfiguredServiceEntries > 0
          ? parseFloat(
              (
                totalConfiguredRevenueFromServices / totalConfiguredServiceEntries
              ).toFixed(2)
            )
          : 0;

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
          status: item.status,
          count: item.count,
          percentage:
            totalJobs > 0 ? ((item.count / totalJobs) * 100).toFixed(1) : "0.0",
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
        pricingSummary: {
          totalConfiguredMonthlyRevenue:
            pricingRevenueMetrics.totalConfiguredMonthlyRevenue || 0,
          averageAgencyPricing: parseFloat(
            ((pricingRevenueMetrics.averageAgencyPricing || 0) * 1).toFixed(2)
          ),
          totalConfiguredServiceEntries,
          serviceTypesInUse: topServices.length,
          averageServicePrice,
          topServices,
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
        viewType = "monthly",
        statusFilter = "all",
      } = req.query;

      if (!["daily", "weekly", "monthly"].includes(viewType)) {
        return res.status(400).json({
          status: "error",
          message: "viewType must be one of: daily, weekly, monthly",
        });
      }

      if (!(statusFilter in STATUS_FILTER_MAP)) {
        return res.status(400).json({
          status: "error",
          message: `statusFilter must be one of: ${Object.keys(
            STATUS_FILTER_MAP
          ).join(", ")}`,
        });
      }

      const validatedStartDate = startDate
        ? parseDateInput(startDate)
        : getDefaultRangeStart(viewType);
      const validatedEndDate = endDate
        ? parseDateInput(endDate, true)
        : parseDateInput(new Date().toISOString(), true);

      if (!validatedStartDate || !validatedEndDate) {
        return res.status(400).json({
          status: "error",
          message: "startDate and endDate must be valid dates",
        });
      }

      if (validatedStartDate > validatedEndDate) {
        return res.status(400).json({
          status: "error",
          message: "startDate cannot be later than endDate",
        });
      }

      const selectedStatuses = STATUS_FILTER_MAP[statusFilter];
      const createdDateMatch = {
        createdAt: { $gte: validatedStartDate, $lte: validatedEndDate },
      };
      const completedBaseMatch = {
        status: "Completed",
        completedAt: { $gte: validatedStartDate, $lte: validatedEndDate },
      };
      const legacyCompletedBaseMatch = {
        status: "Completed",
        $or: [{ completedAt: null }, { completedAt: { $exists: false } }],
        updatedAt: { $gte: validatedStartDate, $lte: validatedEndDate },
      };

      const totalJobsMatch = {
        ...createdDateMatch,
        ...(selectedStatuses ? { status: { $in: selectedStatuses } } : {}),
      };
      const pendingJobsMatch = {
        ...createdDateMatch,
        status: "Pending",
      };
      const activeJobsMatch = {
        ...createdDateMatch,
        status: { $in: ACTIVE_JOB_STATUSES },
      };
      const overdueJobsMatch = {
        ...createdDateMatch,
        status: "Overdue",
      };

      const shouldIncludeCompleted = !selectedStatuses || selectedStatuses.includes("Completed");
      const shouldIncludePending = !selectedStatuses || selectedStatuses.includes("Pending");
      const shouldIncludeActive =
        !selectedStatuses || selectedStatuses.some((status) => ACTIVE_JOB_STATUSES.includes(status));
      const shouldIncludeOverdue = !selectedStatuses || selectedStatuses.includes("Overdue");
      const completedOnlyFilter =
        Array.isArray(selectedStatuses) &&
        selectedStatuses.length === 1 &&
        selectedStatuses[0] === "Completed";

      const [
        totalJobsByBucket,
        completedJobsByBucket,
        legacyCompletedJobsByBucket,
        pendingJobsByBucket,
        activeJobsByBucket,
        overdueJobsByBucket,
        rawStatusDistribution,
      ] = await Promise.all([
        completedOnlyFilter
          ? Promise.resolve(new Map())
          : aggregateBucketCounts({
              match: totalJobsMatch,
              dateField: "$createdAt",
              viewType,
            }),
        shouldIncludeCompleted
          ? aggregateBucketCounts({
              match: completedBaseMatch,
              dateField: "$completedAt",
              viewType,
            })
          : Promise.resolve(new Map()),
        shouldIncludeCompleted
          ? aggregateBucketCounts({
              match: legacyCompletedBaseMatch,
              dateField: "$updatedAt",
              viewType,
            })
          : Promise.resolve(new Map()),
        shouldIncludePending
          ? aggregateBucketCounts({
              match: pendingJobsMatch,
              dateField: "$createdAt",
              viewType,
            })
          : Promise.resolve(new Map()),
        shouldIncludeActive
          ? aggregateBucketCounts({
              match: activeJobsMatch,
              dateField: "$createdAt",
              viewType,
            })
          : Promise.resolve(new Map()),
        shouldIncludeOverdue
          ? aggregateBucketCounts({
              match: overdueJobsMatch,
              dateField: "$createdAt",
              viewType,
            })
          : Promise.resolve(new Map()),
        completedOnlyFilter
          ? aggregateResolvedCompletedCount(validatedStartDate, validatedEndDate).then(
              (completedCount) =>
                JOB_STATUS_VALUES.map((status) => ({
                  status,
                  count: status === "Completed" ? completedCount : 0,
                }))
            )
          : aggregateStatusDistribution(totalJobsMatch),
      ]);

      const formattedTrendsData = buildTimeBuckets(
        validatedStartDate,
        validatedEndDate,
        viewType
      ).map((bucket) => {
        const completedJobs =
          (completedJobsByBucket.get(bucket.key) || 0) +
          (legacyCompletedJobsByBucket.get(bucket.key) || 0);
        const totalJobs = completedOnlyFilter
          ? completedJobs
          : totalJobsByBucket.get(bucket.key) || 0;
        const pendingJobs = pendingJobsByBucket.get(bucket.key) || 0;
        const activeJobs = activeJobsByBucket.get(bucket.key) || 0;
        const overdueJobs = overdueJobsByBucket.get(bucket.key) || 0;

        return {
          period: bucket.label,
          totalJobs,
          completedJobs,
          pendingJobs,
          activeJobs,
          overdueJobs,
          completionRate:
            totalJobs > 0 ? ((completedJobs / totalJobs) * 100).toFixed(1) : "0.0",
        };
      });

      const totalFilteredJobs = rawStatusDistribution.reduce(
        (sum, item) => sum + item.count,
        0
      );

      res.status(200).json({
        status: "success",
        message: "Filtered dashboard statistics retrieved successfully",
        data: {
          trends: formattedTrendsData,
          statusDistribution: rawStatusDistribution.map((item) => ({
            status: item.status,
            count: item.count,
            percentage:
              totalFilteredJobs > 0
                ? ((item.count / totalFilteredJobs) * 100).toFixed(1)
                : "0.0",
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
        technicianUtilization,
        quotationMetrics
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
        ]).then(result => (result[0]?.avgUtilization * 100) || 0),

        // Quotation metrics
        Promise.all([
          // Total quotations sent
          Quotation.countDocuments(),
          // Accepted quotations (status: "Accepted")
          Quotation.countDocuments({ status: "Accepted" }),
          // Total value of accepted quotations
          Quotation.aggregate([
            { $match: { status: "Accepted" } },
            { $group: { _id: null, totalValue: { $sum: "$amount" } } }
          ])
        ]).then(([totalQuotations, acceptedQuotations, acceptedValue]) => ({
          totalQuotations,
          acceptedQuotations,
          acceptedValue: acceptedValue[0]?.totalValue || 0,
          acceptanceRate: totalQuotations > 0 ? (acceptedQuotations / totalQuotations * 100).toFixed(1) : 0
        }))
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
        quotations: {
          totalQuotations: quotationMetrics.totalQuotations,
          acceptedQuotations: quotationMetrics.acceptedQuotations,
          acceptedValue: quotationMetrics.acceptedValue,
          acceptanceRate: parseFloat(quotationMetrics.acceptanceRate)
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

// GET - PropertyManager Dashboard Statistics
router.get(
  "/property-manager-stats",
  authenticateUserTypes(["PropertyManager"]),
  async (req, res) => {
    try {
      console.log("Fetching PropertyManager dashboard statistics...");

      const propertyManagerId = req.propertyManager.id;

      // Get PropertyManager's assigned properties
      const propertyManager = await PropertyManager.findById(propertyManagerId)
        .populate('assignedProperties.propertyId');

      if (!propertyManager) {
        return res.status(404).json({
          status: "error",
          message: "PropertyManager not found"
        });
      }

      // Get active property IDs
      const activePropertyIds = propertyManager.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId);

      if (activePropertyIds.length === 0) {
        return res.status(200).json({
          status: "success",
          message: "PropertyManager dashboard statistics retrieved successfully",
          data: {
            propertiesManaged: 0,
            totalJobs: 0,
            activeJobs: 0,
            completedJobs: 0,
            pendingJobs: 0,
            overdueJobs: 0,
            complianceOverview: {
              compliant: 0,
              dueSoon: 0,
              overdue: 0,
              total: 0
            },
            recentActivity: [],
            lastUpdated: new Date().toISOString()
          }
        });
      }

      // Get job statistics for assigned properties
      const [
        totalJobs,
        activeJobs,
        completedJobs,
        pendingJobs,
        overdueJobs,
        recentJobs
      ] = await Promise.all([
        Job.countDocuments({ property: { $in: activePropertyIds } }),
        Job.countDocuments({ property: { $in: activePropertyIds }, status: "In Progress" }),
        Job.countDocuments({ property: { $in: activePropertyIds }, status: "Completed" }),
        Job.countDocuments({ property: { $in: activePropertyIds }, status: "Pending" }),
        Job.countDocuments({ property: { $in: activePropertyIds }, status: "Overdue" }),
        Job.find({ property: { $in: activePropertyIds } })
          .populate('property', 'address')
          .populate('assignedTechnician', 'fullName')
          .sort({ createdAt: -1 })
          .limit(10)
          .select('job_id jobType status dueDate property assignedTechnician createdAt')
      ]);

      // Get compliance overview for assigned properties
      const properties = await Property.find({
        _id: { $in: activePropertyIds },
        isActive: true
      }).select('complianceSchedule address');

      let complianceOverview = {
        compliant: 0,
        dueSoon: 0,
        overdue: 0,
        total: 0
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      properties.forEach(property => {
        const compliance = normalizeComplianceSchedule(
          property.complianceSchedule || {}
        );
        const inspections = [
          compliance.gasCompliance,
          compliance.electricalSafety,
          compliance.smokeAlarms,
          compliance.minimumSafetyStandard
        ];


        inspections.forEach(inspection => {
          if (inspection?.nextInspection) {
            complianceOverview.total++;
            const inspectionDate = new Date(inspection.nextInspection);

            if (inspectionDate < now) {
              complianceOverview.overdue++;
            } else if (inspectionDate <= thirtyDaysFromNow) {
              complianceOverview.dueSoon++;
            } else {
              complianceOverview.compliant++;
            }
          }
        });
      });

      // Format recent activity
      const recentActivity = recentJobs.map(job => ({
        id: job._id,
        jobId: job.job_id,
        jobType: job.jobType,
        status: job.status,
        propertyAddress: job.property ?
          `${job.property.address.street}, ${job.property.address.suburb}` :
          'Unknown Property',
        technicianName: job.assignedTechnician ? job.assignedTechnician.fullName : 'Unassigned',
        dueDate: job.dueDate,
        createdAt: job.createdAt
      }));

      const dashboardData = {
        propertiesManaged: activePropertyIds.length,
        totalJobs,
        activeJobs,
        completedJobs,
        pendingJobs,
        overdueJobs,
        complianceOverview,
        recentActivity,
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        status: "success",
        message: "PropertyManager dashboard statistics retrieved successfully",
        data: dashboardData
      });

    } catch (error) {
      console.error("Get PropertyManager dashboard statistics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get PropertyManager dashboard statistics"
      });
    }
  }
);

// GET - Agency Analytics Dashboard with Subscription Data
router.get(
  "/agency-analytics",
  authenticateUserTypes(["SuperUser", "TeamMember"]),
  async (req, res) => {
    try {
      console.log("Fetching agency analytics dashboard data...");

      // Date ranges for different periods
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - now.getDay());

      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const thisYearStart = new Date(now.getFullYear(), 0, 1);

      // Get comprehensive agency metrics
      const [
        agencyStatusCounts,
        totalSubscriptionRevenue,
        thisWeekNewAgencies,
        lastWeekNewAgencies,
        thisMonthNewAgencies,
        lastMonthNewAgencies,
        yearToDateNewAgencies,
        topAgenciesBySubscription,
        agenciesByRegion,
        subscriptionDistribution,
        recentAgencies,
        servicePricingBreakdown
      ] = await Promise.all([
        // Agency counts by status
        Agency.aggregate([
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalSubscription: { $sum: "$subscriptionAmount" }
            }
          }
        ]),

        // Total subscription revenue across all agencies
        Agency.aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$subscriptionAmount" },
              avgSubscription: { $avg: "$subscriptionAmount" },
              minSubscription: { $min: "$subscriptionAmount" },
              maxSubscription: { $max: "$subscriptionAmount" },
              totalAgencies: { $sum: 1 }
            }
          }
        ]),

        // New agencies this week
        Agency.countDocuments({ createdAt: { $gte: thisWeekStart } }),

        // New agencies last week
        Agency.countDocuments({
          createdAt: { $gte: lastWeekStart, $lt: thisWeekStart }
        }),

        // New agencies this month
        Agency.countDocuments({ createdAt: { $gte: thisMonthStart } }),

        // New agencies last month
        Agency.countDocuments({
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }),

        // New agencies year to date
        Agency.countDocuments({ createdAt: { $gte: thisYearStart } }),

        // Top 10 agencies by subscription amount
        Agency.find({ status: "Active" })
          .select("companyName email subscriptionAmount totalProperties region createdAt")
          .sort({ subscriptionAmount: -1 })
          .limit(10),

        // Agencies grouped by region with subscription totals
        Agency.aggregate([
          {
            $group: {
              _id: "$region",
              count: { $sum: 1 },
              totalSubscription: { $sum: "$subscriptionAmount" },
              avgSubscription: { $avg: "$subscriptionAmount" },
              activeAgencies: {
                $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] }
              }
            }
          },
          { $sort: { totalSubscription: -1 } }
        ]),

        // Subscription amount distribution (ranges)
        Agency.aggregate([
          {
            $bucket: {
              groupBy: "$subscriptionAmount",
              boundaries: [0, 50, 100, 200, 500, 1000, 10000, 100000],
              default: "100000+",
              output: {
                count: { $sum: 1 },
                totalRevenue: { $sum: "$subscriptionAmount" },
                agencies: {
                  $push: {
                    companyName: "$companyName",
                    subscriptionAmount: "$subscriptionAmount"
                  }
                }
              }
            }
          }
        ]),

        // Recent agencies (last 10)
        Agency.find()
          .select("companyName email region subscriptionAmount status totalProperties createdAt")
          .sort({ createdAt: -1 })
          .limit(10),

        Agency.aggregate([
          { $unwind: "$servicePricing" },
          {
            $group: {
              _id: "$servicePricing.serviceType",
              agenciesUsingService: { $sum: 1 },
              totalConfiguredRevenue: { $sum: "$servicePricing.price" },
              averagePrice: { $avg: "$servicePricing.price" },
              minimumPrice: { $min: "$servicePricing.price" },
              maximumPrice: { $max: "$servicePricing.price" },
            }
          },
          { $sort: { totalConfiguredRevenue: -1, _id: 1 } }
        ])
      ]);

      // Calculate growth percentages
      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
      };

      // Format agency status counts
      const statusBreakdown = {
        active: 0,
        inactive: 0,
        suspended: 0,
        pending: 0,
        total: 0,
        subscriptionByStatus: {}
      };

      agencyStatusCounts.forEach(item => {
        const status = item._id?.toLowerCase() || "unknown";
        statusBreakdown[status] = item.count;
        statusBreakdown.total += item.count;
        statusBreakdown.subscriptionByStatus[item._id] = item.totalSubscription;
      });

      // Revenue metrics
      const revenueMetrics = totalSubscriptionRevenue[0] || {
        totalRevenue: 0,
        avgSubscription: 0,
        minSubscription: 0,
        maxSubscription: 0,
        totalAgencies: 0
      };

      // Format subscription distribution with labels
      const subscriptionRanges = [
        { range: "$0-$50", min: 0, max: 50 },
        { range: "$50-$100", min: 50, max: 100 },
        { range: "$100-$200", min: 100, max: 200 },
        { range: "$200-$500", min: 200, max: 500 },
        { range: "$500-$1000", min: 500, max: 1000 },
        { range: "$1000-$10000", min: 1000, max: 10000 },
        { range: "$10000+", min: 10000, max: 100000 }
      ];

      const formattedSubscriptionDistribution = subscriptionDistribution.map((item, index) => ({
        range: subscriptionRanges[index]?.range || "Unknown",
        count: item.count,
        totalRevenue: item.totalRevenue,
        percentage: revenueMetrics.totalAgencies > 0
          ? ((item.count / revenueMetrics.totalAgencies) * 100).toFixed(1)
          : 0
      }));

      // Format regional data
      const regionalBreakdown = agenciesByRegion.map(region => ({
        region: region._id || "Unknown",
        totalAgencies: region.count,
        activeAgencies: region.activeAgencies,
        totalSubscription: region.totalSubscription,
        avgSubscription: parseFloat(region.avgSubscription.toFixed(2)),
        percentageOfTotal: revenueMetrics.totalRevenue > 0
          ? ((region.totalSubscription / revenueMetrics.totalRevenue) * 100).toFixed(1)
          : 0
      }));

      // Get monthly trends for last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyTrends = await Agency.aggregate([
        {
          $match: { createdAt: { $gte: sixMonthsAgo } }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            newAgencies: { $sum: 1 },
            totalSubscription: { $sum: "$subscriptionAmount" },
            avgSubscription: { $avg: "$subscriptionAmount" }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      // Format monthly trends
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const formattedMonthlyTrends = monthlyTrends.map(item => ({
        period: `${monthNames[item._id.month - 1]} ${item._id.year}`,
        newAgencies: item.newAgencies,
        totalSubscription: item.totalSubscription,
        avgSubscription: parseFloat(item.avgSubscription.toFixed(2))
      }));

      // Format top agencies
      const formattedTopAgencies = topAgenciesBySubscription.map(agency => ({
        id: agency._id,
        companyName: agency.companyName,
        email: agency.email,
        subscriptionAmount: agency.subscriptionAmount,
        totalProperties: agency.totalProperties,
        region: agency.region,
        memberSince: agency.createdAt
      }));

      // Format recent agencies
      const formattedRecentAgencies = recentAgencies.map(agency => ({
        id: agency._id,
        companyName: agency.companyName,
        email: agency.email,
        region: agency.region,
        subscriptionAmount: agency.subscriptionAmount,
        status: agency.status,
        totalProperties: agency.totalProperties,
        joinedDate: agency.createdAt
      }));

      const serviceBreakdown = servicePricingBreakdown.map((service) => ({
        serviceType: service._id,
        agenciesUsingService: service.agenciesUsingService,
        totalConfiguredRevenue: service.totalConfiguredRevenue,
        averagePrice: parseFloat((service.averagePrice || 0).toFixed(2)),
        minimumPrice: service.minimumPrice || 0,
        maximumPrice: service.maximumPrice || 0,
        percentageOfAgencies: statusBreakdown.total > 0
          ? ((service.agenciesUsingService / statusBreakdown.total) * 100).toFixed(1)
          : "0.0"
      }));

      // Calculate additional metrics
      const churnRate = statusBreakdown.total > 0
        ? ((statusBreakdown.inactive / statusBreakdown.total) * 100).toFixed(1)
        : 0;

      const activeRate = statusBreakdown.total > 0
        ? ((statusBreakdown.active / statusBreakdown.total) * 100).toFixed(1)
        : 0;

      // Get agency properties statistics
      const agencyPropertyStats = await Agency.aggregate([
        {
          $group: {
            _id: null,
            totalProperties: { $sum: "$totalProperties" },
            avgPropertiesPerAgency: { $avg: "$totalProperties" }
          }
        }
      ]);

      const propertyStats = agencyPropertyStats[0] || {
        totalProperties: 0,
        avgPropertiesPerAgency: 0
      };

      const agencyAnalytics = {
        overview: {
          totalAgencies: statusBreakdown.total,
          activeAgencies: statusBreakdown.active,
          inactiveAgencies: statusBreakdown.inactive,
          suspendedAgencies: statusBreakdown.suspended,
          pendingAgencies: statusBreakdown.pending,
          activeRate: parseFloat(activeRate),
          churnRate: parseFloat(churnRate)
        },
        revenue: {
          totalMonthlyRevenue: revenueMetrics.totalRevenue,
          averageSubscription: parseFloat(revenueMetrics.avgSubscription.toFixed(2)),
          minimumSubscription: revenueMetrics.minSubscription,
          maximumSubscription: revenueMetrics.maxSubscription,
          projectedAnnualRevenue: revenueMetrics.totalRevenue * 12,
          revenueByStatus: statusBreakdown.subscriptionByStatus
        },
        growth: {
          thisWeek: {
            newAgencies: thisWeekNewAgencies,
            growth: calculateGrowth(thisWeekNewAgencies, lastWeekNewAgencies)
          },
          thisMonth: {
            newAgencies: thisMonthNewAgencies,
            growth: calculateGrowth(thisMonthNewAgencies, lastMonthNewAgencies)
          },
          yearToDate: {
            newAgencies: yearToDateNewAgencies
          }
        },
        distribution: {
          bySubscription: formattedSubscriptionDistribution,
          byRegion: regionalBreakdown
        },
        trends: {
          monthly: formattedMonthlyTrends
        },
        topPerformers: {
          bySubscription: formattedTopAgencies
        },
        properties: {
          totalPropertiesManaged: propertyStats.totalProperties,
          avgPropertiesPerAgency: parseFloat(propertyStats.avgPropertiesPerAgency.toFixed(2))
        },
        services: {
          totalConfiguredServices: serviceBreakdown.reduce(
            (sum, service) => sum + service.agenciesUsingService,
            0
          ),
          breakdown: serviceBreakdown
        },
        recentActivity: {
          newAgencies: formattedRecentAgencies
        },
        lastUpdated: new Date().toISOString()
      };

      res.status(200).json({
        status: "success",
        message: "Agency analytics data retrieved successfully",
        data: agencyAnalytics
      });

    } catch (error) {
      console.error("Get agency analytics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get agency analytics data"
      });
    }
  }
);

export default router;
