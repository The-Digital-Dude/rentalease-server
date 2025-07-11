import express from 'express';
import Staff from '../models/Staff.js';
import { authenticateSuperUser, authenticatePropertyManager, authenticate } from '../middleware/auth.middleware.js';
import fileUpload from '../services/fileUpload.service.js';

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

// Helper function to validate owner access
const validateOwnerAccess = (staff, req) => {
  const ownerInfo = getOwnerInfo(req);
  if (!ownerInfo) return false;
  
  return staff.owner.ownerType === ownerInfo.ownerType && 
         staff.owner.ownerId.toString() === ownerInfo.ownerId.toString();
};

// CREATE - Add new staff member with file uploads
router.post('/', authenticate, fileUpload.staffDocuments, async (req, res) => {
  try {
    const {
      fullName,
      tradeType,
      phone,
      email,
      availabilityStatus,
      startDate,
      serviceRegions,
      notes,
      hourlyRate
    } = req.body;

    // Validate required fields
    if (!fullName || !tradeType || !phone || !email || !startDate || !serviceRegions) {
      return res.status(400).json({
        status: 'error',
        message: 'Required fields: fullName, tradeType, phone, email, startDate, serviceRegions'
      });
    }

    // Get owner information
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine owner information'
      });
    }

    // Check if staff member with same email already exists for this owner
    const existingStaff = await Staff.findOne({
      email: email.toLowerCase(),
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    });

    if (existingStaff) {
      return res.status(400).json({
        status: 'error',
        message: 'Staff member with this email already exists'
      });
    }

    // Process uploaded files
    const uploadedFiles = fileUpload.processUploadedFiles(req.files);

    // Create new staff member
    const staff = new Staff({
      fullName,
      tradeType,
      phone,
      email: email.toLowerCase(),
      availabilityStatus: availabilityStatus || 'Available',
      startDate: new Date(startDate),
      serviceRegions: Array.isArray(serviceRegions) ? serviceRegions : [serviceRegions],
      notes,
      hourlyRate,
      owner: ownerInfo,
      licensingDocuments: uploadedFiles.licensingDocuments || [],
      insuranceDocuments: uploadedFiles.insuranceDocuments || []
    });

    await staff.save();

    res.status(201).json({
      status: 'success',
      message: 'Staff member created successfully',
      data: {
        staff: staff.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to create staff member'
    });
  }
});

// READ - Get all staff members for the authenticated user
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
      tradeType, 
      availabilityStatus, 
      serviceRegion, 
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = {
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    };

    // Add filters
    if (tradeType) query.tradeType = tradeType;
    if (availabilityStatus) query.availabilityStatus = availabilityStatus;
    if (serviceRegion) query.serviceRegions = { $in: [serviceRegion] };
    if (status) query.status = status;
    
    // Add search functionality
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const staff = await Staff.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalStaff = await Staff.countDocuments(query);

    res.status(200).json({
      status: 'success',
      message: 'Staff members retrieved successfully',
      data: {
        staff: staff.map(s => s.getFullDetails()),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalStaff / parseInt(limit)),
          totalItems: totalStaff,
          itemsPerPage: parseInt(limit),
          hasNextPage: skip + staff.length < totalStaff,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve staff members'
    });
  }
});

// READ - Get single staff member by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Staff member retrieved successfully',
      data: {
        staff: staff.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Get staff by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to retrieve staff member'
    });
  }
});

// UPDATE - Update staff member
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.owner;
    delete updateData.createdAt;
    delete updateData._id;

    // Handle email uniqueness if email is being updated
    if (updateData.email && updateData.email !== staff.email) {
      const ownerInfo = getOwnerInfo(req);
      const existingStaff = await Staff.findOne({
        email: updateData.email.toLowerCase(),
        'owner.ownerType': ownerInfo.ownerType,
        'owner.ownerId': ownerInfo.ownerId,
        _id: { $ne: id }
      });

      if (existingStaff) {
        return res.status(400).json({
          status: 'error',
          message: 'Staff member with this email already exists'
        });
      }
      updateData.email = updateData.email.toLowerCase();
    }

    // Handle date fields
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }

    // Handle service regions
    if (updateData.serviceRegions) {
      updateData.serviceRegions = Array.isArray(updateData.serviceRegions) 
        ? updateData.serviceRegions 
        : [updateData.serviceRegions];
    }

    // Update staff member
    const updatedStaff = await Staff.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Staff member updated successfully',
      data: {
        staff: updatedStaff.getFullDetails()
      }
    });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to update staff member'
    });
  }
});

// DELETE - Delete staff member
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Delete staff member
    await Staff.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'Staff member deleted successfully',
      data: {
        deletedStaff: {
          id: staff._id,
          fullName: staff.fullName,
          email: staff.email
        }
      }
    });

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete staff member'
    });
  }
});

// BULK OPERATIONS

// Bulk update availability status
router.patch('/bulk/availability', authenticate, async (req, res) => {
  try {
    const { staffIds, availabilityStatus } = req.body;

    if (!staffIds || !Array.isArray(staffIds) || staffIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'staffIds array is required'
      });
    }

    if (!availabilityStatus) {
      return res.status(400).json({
        status: 'error',
        message: 'availabilityStatus is required'
      });
    }

    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine owner information'
      });
    }

    // Update multiple staff members
    const result = await Staff.updateMany(
      {
        _id: { $in: staffIds },
        'owner.ownerType': ownerInfo.ownerType,
        'owner.ownerId': ownerInfo.ownerId
      },
      {
        availabilityStatus,
        lastActiveDate: new Date()
      }
    );

    res.status(200).json({
      status: 'success',
      message: `Updated ${result.modifiedCount} staff members`,
      data: {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount
      }
    });

  } catch (error) {
    console.error('Bulk update availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update staff availability'
    });
  }
});

// ANALYTICS AND REPORTING

// Get staff analytics
router.get('/analytics/overview', authenticate, async (req, res) => {
  try {
    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine owner information'
      });
    }

    const baseQuery = {
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    };

    // Get overview statistics
    const [
      totalStaff,
      activeStaff,
      availableStaff,
      staffByTrade,
      staffByRegion,
      staffByStatus
    ] = await Promise.all([
      Staff.countDocuments(baseQuery),
      Staff.countDocuments({ ...baseQuery, status: 'Active' }),
      Staff.countDocuments({ ...baseQuery, availabilityStatus: 'Available', status: 'Active' }),
      Staff.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$tradeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Staff.aggregate([
        { $match: baseQuery },
        { $unwind: '$serviceRegions' },
        { $group: { _id: '$serviceRegions', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Staff.aggregate([
        { $match: baseQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Staff analytics retrieved successfully',
      data: {
        overview: {
          totalStaff,
          activeStaff,
          availableStaff,
          inactiveStaff: totalStaff - activeStaff,
          busyStaff: activeStaff - availableStaff
        },
        breakdown: {
          byTrade: staffByTrade,
          byRegion: staffByRegion,
          byStatus: staffByStatus
        }
      }
    });

  } catch (error) {
    console.error('Get staff analytics error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve staff analytics'
    });
  }
});

// SEARCH AND FILTER

// Advanced search with filters
router.post('/search', authenticate, async (req, res) => {
  try {
    const {
      searchTerm,
      tradeTypes,
      serviceRegions,
      availabilityStatuses,
      minRating,
      maxHourlyRate,
      minHourlyRate,
      dateRange
    } = req.body;

    const ownerInfo = getOwnerInfo(req);
    if (!ownerInfo) {
      return res.status(400).json({
        status: 'error',
        message: 'Unable to determine owner information'
      });
    }

    let query = {
      'owner.ownerType': ownerInfo.ownerType,
      'owner.ownerId': ownerInfo.ownerId
    };

    // Add search term
    if (searchTerm) {
      query.$or = [
        { fullName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { phone: { $regex: searchTerm, $options: 'i' } },
        { tradeType: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Add filters
    if (tradeTypes && tradeTypes.length > 0) {
      query.tradeType = { $in: tradeTypes };
    }

    if (serviceRegions && serviceRegions.length > 0) {
      query.serviceRegions = { $in: serviceRegions };
    }

    if (availabilityStatuses && availabilityStatuses.length > 0) {
      query.availabilityStatus = { $in: availabilityStatuses };
    }

    if (minRating !== undefined) {
      query.rating = { $gte: minRating };
    }

    if (minHourlyRate !== undefined || maxHourlyRate !== undefined) {
      query.hourlyRate = {};
      if (minHourlyRate !== undefined) query.hourlyRate.$gte = minHourlyRate;
      if (maxHourlyRate !== undefined) query.hourlyRate.$lte = maxHourlyRate;
    }

    if (dateRange && dateRange.start && dateRange.end) {
      query.startDate = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    const staff = await Staff.find(query)
      .sort({ fullName: 1 })
      .limit(50); // Limit results for performance

    res.status(200).json({
      status: 'success',
      message: 'Search completed successfully',
      data: {
        staff: staff.map(s => s.getFullDetails()),
        count: staff.length
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to perform search'
    });
  }
});

// FILE UPLOAD ROUTES

// Upload documents for existing staff member
router.post('/:id/documents', authenticate, fileUpload.staffDocuments, async (req, res) => {
  try {
    const { id } = req.params;

    // Find staff member
    const staff = await Staff.findById(id);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    // Process uploaded files
    const uploadedFiles = fileUpload.processUploadedFiles(req.files);

    // Update staff member with new documents
    if (uploadedFiles.licensingDocuments) {
      staff.licensingDocuments.push(...uploadedFiles.licensingDocuments);
    }
    if (uploadedFiles.insuranceDocuments) {
      staff.insuranceDocuments.push(...uploadedFiles.insuranceDocuments);
    }

    await staff.save();

    res.status(200).json({
      status: 'success',
      message: 'Documents uploaded successfully',
      data: {
        staff: staff.getFullDetails(),
        uploadedFiles: uploadedFiles
      }
    });

  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'Failed to upload documents'
    });
  }
});

// Delete specific document
router.delete('/:staffId/documents/:documentId', authenticate, async (req, res) => {
  try {
    const { staffId, documentId } = req.params;
    const { documentType } = req.query; // 'licensing' or 'insurance'

    // Find staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    let document = null;
    let documentIndex = -1;

    // Find and remove document
    if (documentType === 'licensing') {
      documentIndex = staff.licensingDocuments.findIndex(doc => doc._id.toString() === documentId);
      if (documentIndex !== -1) {
        document = staff.licensingDocuments[documentIndex];
        staff.licensingDocuments.splice(documentIndex, 1);
      }
    } else if (documentType === 'insurance') {
      documentIndex = staff.insuranceDocuments.findIndex(doc => doc._id.toString() === documentId);
      if (documentIndex !== -1) {
        document = staff.insuranceDocuments[documentIndex];
        staff.insuranceDocuments.splice(documentIndex, 1);
      }
    }

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Delete physical file
    try {
      await fileUpload.deleteFile(document.path);
    } catch (fileError) {
      console.error('Failed to delete physical file:', fileError);
      // Continue with database update even if file deletion fails
    }

    // Save staff member
    await staff.save();

    res.status(200).json({
      status: 'success',
      message: 'Document deleted successfully',
      data: {
        deletedDocument: {
          id: document._id,
          filename: document.filename,
          originalName: document.originalName
        }
      }
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete document'
    });
  }
});

// Download document
router.get('/:staffId/documents/:documentId/download', authenticate, async (req, res) => {
  try {
    const { staffId, documentId } = req.params;
    const { documentType } = req.query; // 'licensing' or 'insurance'

    // Find staff member
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        status: 'error',
        message: 'Staff member not found'
      });
    }

    // Check if user has access to this staff member
    if (!validateOwnerAccess(staff, req)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied'
      });
    }

    let document = null;

    // Find document
    if (documentType === 'licensing') {
      document = staff.licensingDocuments.find(doc => doc._id.toString() === documentId);
    } else if (documentType === 'insurance') {
      document = staff.insuranceDocuments.find(doc => doc._id.toString() === documentId);
    }

    if (!document) {
      return res.status(404).json({
        status: 'error',
        message: 'Document not found'
      });
    }

    // Check if file exists
    const fs = await import('fs');
    if (!fs.existsSync(document.path)) {
      return res.status(404).json({
        status: 'error',
        message: 'Physical file not found'
      });
    }

    // Set headers and send file
    res.setHeader('Content-Type', document.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalName}"`);
    res.sendFile(document.path);

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to download document'
    });
  }
});

export default router; 