import express from "express";
import mongoose from "mongoose";
import { authenticateUserTypes } from "../middleware/auth.middleware.js";

// Import models
import Property from "../models/Property.js";
import Job from "../models/Job.js";
import PropertyManager from "../models/PropertyManager.js";
import TechnicianPayment from "../models/TechnicianPayment.js";

const router = express.Router();

// Helper function to get PropertyManager's active property IDs
const getPropertyManagerPropertyIds = async (propertyManagerId) => {
  const propertyManager = await PropertyManager.findById(propertyManagerId);
  if (!propertyManager) {
    throw new Error("PropertyManager not found");
  }

  return propertyManager.assignedProperties
    .filter(assignment => assignment.status === 'Active')
    .map(assignment => assignment.propertyId);
};

// GET - PropertyManager Overview Report
router.get(
  "/overview",
  authenticateUserTypes(["PropertyManager"]),
  async (req, res) => {
    try {
      const propertyManagerId = req.propertyManager.id;
      const activePropertyIds = await getPropertyManagerPropertyIds(propertyManagerId);

      if (activePropertyIds.length === 0) {
        return res.status(200).json({
          status: "success",
          data: {
            propertiesManaged: 0,
            performanceMetrics: {},
            monthlyTrends: [],
            topPerformingProperties: []
          }
        });
      }

      // Get monthly job trends for the last 12 months
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyTrends = await Job.aggregate([
        {
          $match: {
            property: { $in: activePropertyIds },
            createdAt: { $gte: twelveMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" }
            },
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
            },
            totalCost: {
              $sum: { $ifNull: ["$cost.totalCost", 0] }
            }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);

      // Get top performing properties by job completion rate
      const topPerformingProperties = await Job.aggregate([
        {
          $match: { property: { $in: activePropertyIds } }
        },
        {
          $group: {
            _id: "$property",
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
            }
          }
        },
        {
          $addFields: {
            completionRate: {
              $multiply: [
                { $divide: ["$completedJobs", "$totalJobs"] },
                100
              ]
            }
          }
        },
        {
          $lookup: {
            from: "properties",
            localField: "_id",
            foreignField: "_id",
            as: "property"
          }
        },
        {
          $unwind: "$property"
        },
        {
          $sort: { completionRate: -1 }
        },
        {
          $limit: 5
        }
      ]);

      // Performance metrics
      const performanceMetrics = await Job.aggregate([
        {
          $match: { property: { $in: activePropertyIds } }
        },
        {
          $group: {
            _id: null,
            totalJobs: { $sum: 1 },
            completedJobs: {
              $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] }
            },
            avgCompletionTime: {
              $avg: {
                $cond: [
                  { $eq: ["$status", "Completed"] },
                  {
                    $divide: [
                      { $subtract: ["$completedAt", "$createdAt"] },
                      1000 * 60 * 60 * 24 // Convert to days
                    ]
                  },
                  null
                ]
              }
            },
            totalCost: {
              $sum: { $ifNull: ["$cost.totalCost", 0] }
            }
          }
        }
      ]);

      res.status(200).json({
        status: "success",
        data: {
          propertiesManaged: activePropertyIds.length,
          performanceMetrics: performanceMetrics[0] || {},
          monthlyTrends: monthlyTrends.map(trend => ({
            month: `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`,
            totalJobs: trend.totalJobs,
            completedJobs: trend.completedJobs,
            completionRate: trend.totalJobs > 0 ? (trend.completedJobs / trend.totalJobs * 100).toFixed(1) : 0,
            totalCost: trend.totalCost
          })),
          topPerformingProperties: topPerformingProperties.map(prop => ({
            propertyId: prop._id,
            address: prop.property.address,
            totalJobs: prop.totalJobs,
            completedJobs: prop.completedJobs,
            completionRate: prop.completionRate.toFixed(1)
          }))
        }
      });

    } catch (error) {
      console.error("Get PropertyManager overview error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get PropertyManager overview"
      });
    }
  }
);

// GET - PropertyManager Job Analytics
router.get(
  "/jobs",
  authenticateUserTypes(["PropertyManager"]),
  async (req, res) => {
    try {
      const propertyManagerId = req.propertyManager.id;
      const activePropertyIds = await getPropertyManagerPropertyIds(propertyManagerId);

      if (activePropertyIds.length === 0) {
        return res.status(200).json({
          status: "success",
          data: {
            statusDistribution: [],
            typeDistribution: [],
            timeToCompletion: [],
            upcomingJobs: []
          }
        });
      }

      // Job status distribution
      const statusDistribution = await Job.aggregate([
        {
          $match: { property: { $in: activePropertyIds } }
        },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]);

      // Job type distribution
      const typeDistribution = await Job.aggregate([
        {
          $match: { property: { $in: activePropertyIds } }
        },
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
                      { $subtract: ["$completedAt", "$createdAt"] },
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
          $addFields: {
            completionRate: {
              $multiply: [
                { $divide: ["$completed", "$count"] },
                100
              ]
            }
          }
        }
      ]);

      // Upcoming jobs (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const upcomingJobs = await Job.find({
        property: { $in: activePropertyIds },
        status: { $in: ["Pending", "Scheduled", "In Progress"] },
        dueDate: { $lte: thirtyDaysFromNow }
      })
        .populate('property', 'address')
        .populate('assignedTechnician', 'fullName')
        .sort({ dueDate: 1 })
        .limit(20)
        .select('job_id jobType status dueDate priority property assignedTechnician');

      res.status(200).json({
        status: "success",
        data: {
          statusDistribution: statusDistribution.map(item => ({
            status: item._id,
            count: item.count
          })),
          typeDistribution: typeDistribution.map(item => ({
            jobType: item._id,
            count: item.count,
            completed: item.completed,
            completionRate: item.completionRate ? item.completionRate.toFixed(1) : 0,
            avgCompletionTime: item.avgCompletionTime ? item.avgCompletionTime.toFixed(1) : null
          })),
          upcomingJobs: upcomingJobs.map(job => ({
            id: job._id,
            jobId: job.job_id,
            jobType: job.jobType,
            status: job.status,
            dueDate: job.dueDate,
            priority: job.priority,
            propertyAddress: job.property ?
              `${job.property.address.street}, ${job.property.address.suburb}` :
              'Unknown Property',
            technicianName: job.assignedTechnician ? job.assignedTechnician.fullName : 'Unassigned'
          }))
        }
      });

    } catch (error) {
      console.error("Get PropertyManager job analytics error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get job analytics"
      });
    }
  }
);

// GET - PropertyManager Compliance Report
router.get(
  "/compliance",
  authenticateUserTypes(["PropertyManager"]),
  async (req, res) => {
    try {
      const propertyManagerId = req.propertyManager.id;
      const activePropertyIds = await getPropertyManagerPropertyIds(propertyManagerId);

      if (activePropertyIds.length === 0) {
        return res.status(200).json({
          status: "success",
          data: {
            overview: {},
            propertiesByStatus: [],
            upcomingInspections: []
          }
        });
      }

      // Get properties with compliance data
      const properties = await Property.find({
        _id: { $in: activePropertyIds },
        isActive: true
      }).select('address complianceSchedule');

      let overview = {
        totalProperties: properties.length,
        compliant: 0,
        dueSoon: 0,
        overdue: 0,
        complianceScore: 0
      };

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const upcomingInspections = [];
      const propertiesByStatus = [];

      properties.forEach(property => {
        const compliance = property.complianceSchedule;
        const inspections = [
          { type: 'Gas Compliance', data: compliance.gasCompliance },
          { type: 'Electrical Safety', data: compliance.electricalSafety },
          { type: 'Smoke Alarms', data: compliance.smokeAlarms }
        ];

        if (compliance.poolSafety && compliance.poolSafety.required) {
          inspections.push({ type: 'Pool Safety', data: compliance.poolSafety });
        }

        let propertyStatus = 'Compliant';
        let propertyIssues = [];

        inspections.forEach(inspection => {
          if (inspection.data.nextInspection) {
            const inspectionDate = new Date(inspection.data.nextInspection);

            if (inspectionDate < now) {
              overview.overdue++;
              propertyStatus = 'Overdue';
              propertyIssues.push(`${inspection.type} overdue`);

              upcomingInspections.push({
                propertyId: property._id,
                propertyAddress: `${property.address.street}, ${property.address.suburb}`,
                inspectionType: inspection.type,
                dueDate: inspection.data.nextInspection,
                status: 'Overdue',
                daysOverdue: Math.floor((now - inspectionDate) / (1000 * 60 * 60 * 24))
              });
            } else if (inspectionDate <= thirtyDaysFromNow) {
              overview.dueSoon++;
              if (propertyStatus === 'Compliant') propertyStatus = 'Due Soon';
              propertyIssues.push(`${inspection.type} due soon`);

              upcomingInspections.push({
                propertyId: property._id,
                propertyAddress: `${property.address.street}, ${property.address.suburb}`,
                inspectionType: inspection.type,
                dueDate: inspection.data.nextInspection,
                status: 'Due Soon',
                daysUntilDue: Math.floor((inspectionDate - now) / (1000 * 60 * 60 * 24))
              });
            } else {
              overview.compliant++;
            }
          }
        });

        propertiesByStatus.push({
          propertyId: property._id,
          address: property.address,
          status: propertyStatus,
          issues: propertyIssues,
          complianceSchedule: compliance
        });
      });

      // Calculate compliance score
      const totalInspections = overview.compliant + overview.dueSoon + overview.overdue;
      overview.complianceScore = totalInspections > 0 ?
        Math.round((overview.compliant / totalInspections) * 100) : 100;

      // Sort upcoming inspections by due date
      upcomingInspections.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

      res.status(200).json({
        status: "success",
        data: {
          overview,
          propertiesByStatus: propertiesByStatus.sort((a, b) => {
            const statusOrder = { 'Overdue': 0, 'Due Soon': 1, 'Compliant': 2 };
            return statusOrder[a.status] - statusOrder[b.status];
          }),
          upcomingInspections: upcomingInspections.slice(0, 20)
        }
      });

    } catch (error) {
      console.error("Get PropertyManager compliance report error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get compliance report"
      });
    }
  }
);

// GET - PropertyManager Financial Overview
router.get(
  "/financial",
  authenticateUserTypes(["PropertyManager"]),
  async (req, res) => {
    try {
      const propertyManagerId = req.propertyManager.id;
      const activePropertyIds = await getPropertyManagerPropertyIds(propertyManagerId);

      if (activePropertyIds.length === 0) {
        return res.status(200).json({
          status: "success",
          data: {
            overview: {},
            costByProperty: [],
            costByJobType: [],
            monthlySpending: []
          }
        });
      }

      // Overall financial overview
      const financialOverview = await Job.aggregate([
        {
          $match: {
            property: { $in: activePropertyIds },
            status: "Completed"
          }
        },
        {
          $group: {
            _id: null,
            totalCost: { $sum: { $ifNull: ["$cost.totalCost", 0] } },
            averageJobCost: { $avg: { $ifNull: ["$cost.totalCost", 0] } },
            totalJobs: { $sum: 1 }
          }
        }
      ]);

      // Cost by property
      const costByProperty = await Job.aggregate([
        {
          $match: {
            property: { $in: activePropertyIds },
            status: "Completed"
          }
        },
        {
          $group: {
            _id: "$property",
            totalCost: { $sum: { $ifNull: ["$cost.totalCost", 0] } },
            jobCount: { $sum: 1 },
            averageCost: { $avg: { $ifNull: ["$cost.totalCost", 0] } }
          }
        },
        {
          $lookup: {
            from: "properties",
            localField: "_id",
            foreignField: "_id",
            as: "property"
          }
        },
        {
          $unwind: "$property"
        },
        {
          $sort: { totalCost: -1 }
        }
      ]);

      // Cost by job type
      const costByJobType = await Job.aggregate([
        {
          $match: {
            property: { $in: activePropertyIds },
            status: "Completed"
          }
        },
        {
          $group: {
            _id: "$jobType",
            totalCost: { $sum: { $ifNull: ["$cost.totalCost", 0] } },
            jobCount: { $sum: 1 },
            averageCost: { $avg: { $ifNull: ["$cost.totalCost", 0] } }
          }
        },
        {
          $sort: { totalCost: -1 }
        }
      ]);

      // Monthly spending trends (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlySpending = await Job.aggregate([
        {
          $match: {
            property: { $in: activePropertyIds },
            status: "Completed",
            completedAt: { $gte: twelveMonthsAgo }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: "$completedAt" },
              month: { $month: "$completedAt" }
            },
            totalCost: { $sum: { $ifNull: ["$cost.totalCost", 0] } },
            jobCount: { $sum: 1 }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1 }
        }
      ]);

      res.status(200).json({
        status: "success",
        data: {
          overview: financialOverview[0] || {
            totalCost: 0,
            averageJobCost: 0,
            totalJobs: 0
          },
          costByProperty: costByProperty.map(item => ({
            propertyId: item._id,
            address: item.property.address,
            totalCost: item.totalCost,
            jobCount: item.jobCount,
            averageCost: item.averageCost
          })),
          costByJobType: costByJobType.map(item => ({
            jobType: item._id,
            totalCost: item.totalCost,
            jobCount: item.jobCount,
            averageCost: item.averageCost
          })),
          monthlySpending: monthlySpending.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            totalCost: item.totalCost,
            jobCount: item.jobCount,
            averageCost: item.jobCount > 0 ? item.totalCost / item.jobCount : 0
          }))
        }
      });

    } catch (error) {
      console.error("Get PropertyManager financial overview error:", error);
      res.status(500).json({
        status: "error",
        message: error.message || "Failed to get financial overview"
      });
    }
  }
);

export default router;