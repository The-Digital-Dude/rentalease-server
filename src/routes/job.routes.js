import express from 'express';
import mongoose from 'mongoose';
import Job from '../models/Job.js';
import Staff from '../models/Staff.js';
import { authenticateSuperUser, authenticatePropertyManager, authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Helper function to get owner info based on user type
const getOwnerInfo = (req) => {
  if (req.superUser) {
    return {
      ownerType: 'SuperUser',
      ownerId: req.superUser.id
    };
  } else if (req.propertyManager) {
    return {
      ownerType: 'PropertyManager',
      ownerId: req.propertyManager.id
    };
  }
  return null;
};

// Helper function to get creator info based on user type
const getCreatorInfo = (req) => {
  if (req.superUser) {
    return {
      userType: 'SuperUser',
      userId: req.superUser.id
    };
  } else if (req.propertyManager) {
    return {
      userType: 'PropertyManager',
      userId: req.propertyManager.id
    };
  }
  return null;
};

// Helper function to validate owner access
const validateOwnerAccess = (job, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;
  
  return job.owner.ownerType === ownerInfo.ownerType && 
         job.owner.ownerId.toString() === ownerInfo.ownerId.toString();
};

// Helper function to check if user can fully edit job (only super users)
const canFullyEditJob = (req) => {
  return !!req.superUser;
};

// CREATE - Add new job
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      propertyAddress,
      jobType,
      dueDate,
      assignedTechnician,
      description,
      priority,
      estimatedDuration,
      notes
    } = req.body;

    // Validate required fields
    if (!propertyAddress || !jobType || !dueDate || !assignedTechnician) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields: propertyAddress, jobType, dueDate, assignedTechnician'
      });
    }

    // Get owner and creator information
    const ownerInfo = getOwnerInfo(req);
    const creatorInfo = getCreatorInfo(req);
    
    if (!ownerInfo || !creatorInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine user information'
      });
    }

    // Validate assigned technician exists and belongs to the same owner
    const technician = await Staff.findOne({
      _id: assignedTechnician,
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    });

    if (!technician) {
      return res.status(400).json({
        status: 'error',
        message: 'Assigned technician not found or does not belong to your organization'
      });
    }

    // Check if technician is available
    if (technician.availabilityStatus !== 'Available') {
      return res.status(400).json({
        status: 'error',
        message: `Technician is currently ${technician.availabilityStatus.toLowerCase()}`
      });
    }

    // Create new job
    const job = new Job({
      propertyAddress,
      jobType,
      dueDate: new Date(dueDate),
      assignedTechnician,
      description,
      priority: priority || 'Medium',
      estimatedDuration,
      notes,
      owner: ownerInfo,
      createdBy: creatorInfo,
      lastUpdatedBy: creatorInfo
    });

    await job.save();

    // Populate technician details for response
    await job.populate('assignedTechnician', 'fullName tradeType phone email');

    res.status(201).json({
      status: 'success',
      message: 'Job created successfully',
      data: {
        job: job.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create job'
    });
  }
});

// READ - Get all jobs for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine owner information'
      });
    }

    // Query parameters for filtering
    const { 
      jobType, 
      status, 
      assignedTechnician,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build query
    let query = {
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    };

    // Add filters
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    if (assignedTechnician) query.assignedTechnician = assignedTechnician;
    if (priority) query.priority = priority;
    
    // Add date range filter
    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }
    
    // Add search functionality
    if (search) {
      query.$or = [
        { propertyAddress: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const jobs = await Job.find(query)
      .populate('assignedTechnician', 'fullName tradeType phone email availabilityStatus')
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalJobs = await Job.countDocuments(query);

    // Get status counts for dashboard
    const statusCounts = await Job.aggregate([
      { $match: { 'owner.ownerType': ownerInfo.ownerType, 'owner.ownerId': new mongoose.Types.ObjectId(ownerInfo.ownerId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Jobs retrieved successfully',
      data: {
        jobs: jobs.map(job => job.getSummary()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalJobs / parseInt(limit)),
          totalItems: totalJobs,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + jobs.length < totalJobs,
          hasPrevPage: parseInt(page) > 1
        },
        statistics: {
          statusCounts: statusCounts.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          totalJobs
        }
      }
    });

  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve jobs'
    });
  }
});

// READ - Get specific job by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job ID format'
      });
    }

    const job = await Job.findById(id)
      .populate('assignedTechnician', 'fullName tradeType phone email availabilityStatus serviceRegions')
      .populate('createdBy.userId', 'name email companyName contactPerson', null, { strictPopulate: false })
      .populate('lastUpdatedBy.userId', 'name email companyName contactPerson', null, { strictPopulate: false });

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to view this job.'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Job retrieved successfully',
      data: {
        job: job.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve job'
    });
  }
});

// UPDATE - Update job (full edit only for super users)
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job ID format'
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to edit this job.'
      });
    }

    // Check if user can fully edit job (only super users)
    const canFullEdit = canFullyEditJob(req);

    // Define fields that only super users can edit
    const superUserOnlyFields = ['assignedTechnician', 'jobType', 'dueDate', 'status'];
    
    // If not a super user, restrict certain field updates
    if (!canFullEdit) {
      for (const field of superUserOnlyFields) {
        if (updates.hasOwnProperty(field)) {
          return res.status(403).json({
            status: 'error',
            message: `Only super users can modify ${field}. Contact your administrator.`
          });
        }
      }
    }

    // Validate assigned technician if being updated
    if (updates.assignedTechnician) {
      const ownerInfo = getOwnerInfo(req);
      const technician = await Staff.findOne({
        _id: updates.assignedTechnician,
        'owner.ownerType': ownerInfo.ownerType,
        'owner.ownerId': ownerInfo.ownerId
      });

      if (!technician) {
        return res.status(400).json({
          status: 'error',
          message: 'Assigned technician not found or does not belong to your organization'
        });
      }
    }

    // Update allowed fields
    const allowedUpdates = canFullEdit 
      ? ['propertyAddress', 'jobType', 'dueDate', 'assignedTechnician', 'status', 'description', 'priority', 'estimatedDuration', 'actualDuration', 'cost', 'notes']
      : ['description', 'priority', 'estimatedDuration', 'cost', 'notes'];

    allowedUpdates.forEach(field => {
      if (updates.hasOwnProperty(field)) {
        if (field === 'cost') {
          // Handle nested cost object
          if (updates.cost.materialCost !== undefined) job.cost.materialCost = updates.cost.materialCost;
          if (updates.cost.laborCost !== undefined) job.cost.laborCost = updates.cost.laborCost;
        } else {
          job[field] = updates[field];
        }
      }
    });

    // Update lastUpdatedBy
    job.lastUpdatedBy = getCreatorInfo(req);

    await job.save();

    // Populate technician details for response
    await job.populate('assignedTechnician', 'fullName tradeType phone email');

    res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: {
        job: job.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update job'
    });
  }
});

// DELETE - Delete job (only super users)
router.delete('/:id', authenticateSuperUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job ID format'
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Super users can delete any job, but let's still check ownership for data integrity
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to delete this job.'
      });
    }

    await Job.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Job deleted successfully',
      data: {
        deletedJobId: id
      }
    });

  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete job'
    });
  }
});

// PATCH - Update job status (quick status updates)
router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid job ID format'
      });
    }

    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status is required'
      });
    }

    const validStatuses = ['Pending', 'Scheduled', 'Completed', 'Overdue'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        status: 'error',
        message: 'Job not found'
      });
    }

    // Check if user has access to this job
    if (!validateOwnerAccess(job, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied. You do not have permission to update this job.'
      });
    }

    // Only super users can change status to certain values
    if (!canFullyEditJob(req) && ['Scheduled', 'Overdue'].includes(status)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only super users can set status to Scheduled or Overdue'
      });
    }

    job.status = status;
    job.lastUpdatedBy = getCreatorInfo(req);
    
    await job.save();

    res.status(200).json({
      status: 'success',
      message: 'Job status updated successfully',
      data: {
        job: job.getSummary()
      }
    });

  } catch (error) {
    console.error('Update job status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update job status'
    });
  }
});

export default router; 