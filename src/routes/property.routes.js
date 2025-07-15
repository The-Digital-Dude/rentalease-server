import express from 'express';
import mongoose from 'mongoose';
import Property from '../models/Property.js';
import { authenticateSuperUser, authenticatePropertyManager, authenticate } from '../middleware/auth.middleware.js';
import { setDefaultInspectionDates, setStateSpecificCompliance } from '../utils/propertyHelpers.js';

const router = express.Router();

// Valid regions enum
const VALID_REGIONS = [
  'Sydney Metro', 'Melbourne Metro', 'Brisbane Metro', 'Perth Metro',
  'Adelaide Metro', 'Darwin Metro', 'Hobart Metro', 'Canberra Metro',
  'Regional NSW', 'Regional VIC', 'Regional QLD', 'Regional WA',
  'Regional SA', 'Regional NT', 'Regional TAS'
];

// Valid Australian states
const VALID_STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'NT', 'ACT'];

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

// Helper function to get property manager filter based on user type
const getPropertyManagerFilter = (req) => {
  if (req.superUser) {
    // Super users can access all properties
    return {};
  } else if (req.propertyManager) {
    // Property managers can only access their own properties
    return { propertyManager: req.propertyManager.id };
  }
  return null;
};

// Helper function to determine region based on state and suburb
const getRegionFromStateAndSuburb = (state, suburb) => {
  // Simple mapping - in real app you might want a more sophisticated lookup
  const majorCities = {
    'NSW': ['Sydney', 'Newcastle', 'Wollongong', 'Parramatta', 'Liverpool', 'Blacktown'],
    'VIC': ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
    'QLD': ['Brisbane', 'Gold Coast', 'Sunshine Coast', 'Townsville', 'Cairns'],
    'WA': ['Perth', 'Fremantle', 'Rockingham', 'Joondalup'],
    'SA': ['Adelaide', 'Mount Gambier'],
    'TAS': ['Hobart', 'Launceston'],
    'NT': ['Darwin', 'Alice Springs'],
    'ACT': ['Canberra']
  };

  const stateCities = majorCities[state] || [];
  const isMetro = stateCities.some(city => 
    suburb.toLowerCase().includes(city.toLowerCase()) || 
    city.toLowerCase().includes(suburb.toLowerCase())
  );

  if (isMetro) {
    switch (state) {
      case 'NSW': return 'Sydney Metro';
      case 'VIC': return 'Melbourne Metro';
      case 'QLD': return 'Brisbane Metro';
      case 'WA': return 'Perth Metro';
      case 'SA': return 'Adelaide Metro';
      case 'TAS': return 'Hobart Metro';
      case 'NT': return 'Darwin Metro';
      case 'ACT': return 'Canberra Metro';
      default: return `Regional ${state}`;
    }
  } else {
    return `Regional ${state}`;
  }
};

// Create Property
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      address,
      currentTenant,
      complianceSchedule,
      notes
    } = req.body;

    // Validate required fields
    if (!address || !address.street || !address.suburb || !address.state || !address.postcode) {
      return res.status(400).json({
        status: 'error',
        message: 'Complete address (street, suburb, state, postcode) is required'
      });
    }

    if (!currentTenant || !currentTenant.name || !currentTenant.email || !currentTenant.phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Complete tenant information (name, email, phone) is required'
      });
    }

    // Validate state
    if (!VALID_STATES.includes(address.state)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please select a valid Australian state'
      });
    }

    // Validate postcode (4 digits)
    if (!/^\d{4}$/.test(address.postcode)) {
      return res.status(400).json({
        status: 'error',
        message: 'Postcode must be 4 digits'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(currentTenant.email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please enter a valid email address'
      });
    }

    // Set property manager based on user type
    let propertyManagerId;
    if (req.superUser) {
      // For now, super users will need to be assigned a property manager
      // You can modify this based on your business logic
      return res.status(400).json({
        status: 'error',
        message: 'Property manager assignment for super users not yet implemented'
      });
    } else if (req.propertyManager) {
      propertyManagerId = req.propertyManager.id;
    }

    // Get creator info
    const creatorInfo = getCreatorInfo(req);
    if (!creatorInfo) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Determine region automatically
    const region = getRegionFromStateAndSuburb(address.state, address.suburb);

    // Prepare property data with defaults
    let propertyData = {
      address,
      propertyType: 'House', // Default from form
      bedrooms: 2, // Default from form
      bathrooms: 1, // Default from form
      rentAmount: 0, // Default from form
      propertyManager: propertyManagerId,
      region,
      status: 'Occupied', // Default from form
      currentTenant,
      complianceSchedule: complianceSchedule || {},
      notes: notes || '',
      createdBy: creatorInfo
    };

    // Set default inspection dates if not provided
    propertyData = setDefaultInspectionDates(propertyData);

    // Set state-specific compliance requirements
    propertyData = setStateSpecificCompliance(propertyData, address.state);

    // Create the property
    const property = new Property(propertyData);
    await property.save();

    // Populate property manager details for response
    await property.populate('propertyManager', 'companyName contactPerson email phone');

    res.status(201).json({
      status: 'success',
      message: 'Property created successfully',
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          propertyManager: property.propertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Create property error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An error occurred while creating the property'
    });
  }
});

// Get All Properties
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, propertyType, region, state, page = 1, limit = 10, search } = req.query;

    // Get property manager filter based on user type
    const propertyManagerFilter = getPropertyManagerFilter(req);
    if (propertyManagerFilter === null) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Build filter object
    const filter = { ...propertyManagerFilter, isActive: true };
    
    if (status) filter.status = status;
    if (propertyType) filter.propertyType = propertyType;
    if (region) filter.region = region;
    if (state) filter['address.state'] = state;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { 'address.street': { $regex: search, $options: 'i' } },
        { 'address.suburb': { $regex: search, $options: 'i' } },
        { 'address.fullAddress': { $regex: search, $options: 'i' } },
        { 'currentTenant.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get properties with pagination
    const properties = await Property.find(filter)
      .populate('propertyManager', 'companyName contactPerson email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await Property.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        properties: properties.map(property => ({
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          propertyManager: property.propertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / limit),
          totalCount,
          hasNext: page * limit < totalCount,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get properties error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching properties'
    });
  }
});

// Get Single Property
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid property ID'
      });
    }

    // Get property manager filter based on user type
    const propertyManagerFilter = getPropertyManagerFilter(req);
    if (propertyManagerFilter === null) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...propertyManagerFilter };
    const property = await Property.findOne(filter)
      .populate('propertyManager', 'companyName contactPerson email phone region');

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          propertyManager: property.propertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          createdAt: property.createdAt,
          updatedAt: property.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Get property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching the property'
    });
  }
});

// Update Property
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      address,
      currentTenant,
      complianceSchedule,
      notes
    } = req.body;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid property ID'
      });
    }

    // Get property manager filter based on user type
    const propertyManagerFilter = getPropertyManagerFilter(req);
    if (propertyManagerFilter === null) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...propertyManagerFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Validate address if provided
    if (address) {
      if (!address.street || !address.suburb || !address.state || !address.postcode) {
        return res.status(400).json({
          status: 'error',
          message: 'Complete address (street, suburb, state, postcode) is required'
        });
      }

      if (!VALID_STATES.includes(address.state)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select a valid Australian state'
        });
      }

      if (!/^\d{4}$/.test(address.postcode)) {
        return res.status(400).json({
          status: 'error',
          message: 'Postcode must be 4 digits'
        });
      }
    }

    // Validate tenant if provided
    if (currentTenant) {
      if (!currentTenant.name || !currentTenant.email || !currentTenant.phone) {
        return res.status(400).json({
          status: 'error',
          message: 'Complete tenant information (name, email, phone) is required'
        });
      }

      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(currentTenant.email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid email address'
        });
      }
    }

    // Update fields if provided
    if (address) {
      property.address = address;
      // Update region if address state/suburb changed
      property.region = getRegionFromStateAndSuburb(address.state, address.suburb);
    }
    if (currentTenant) property.currentTenant = currentTenant;
    if (complianceSchedule) property.complianceSchedule = { ...property.complianceSchedule, ...complianceSchedule };
    if (notes !== undefined) property.notes = notes;

    await property.save();

    // Populate property manager details for response
    await property.populate('propertyManager', 'companyName contactPerson email phone');

    res.status(200).json({
      status: 'success',
      message: 'Property updated successfully',
      data: {
        property: {
          id: property._id,
          address: property.address,
          fullAddress: property.fullAddressString,
          propertyType: property.propertyType,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          rentAmount: property.rentAmount,
          status: property.status,
          region: property.region,
          propertyManager: property.propertyManager,
          currentTenant: property.currentTenant,
          complianceSchedule: property.complianceSchedule,
          notes: property.notes,
          hasOverdueCompliance: property.hasOverdueCompliance(),
          complianceSummary: property.getComplianceSummary(),
          updatedAt: property.updatedAt
        }
      }
    });

  } catch (error) {
    console.error('Update property error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'An error occurred while updating the property'
    });
  }
});

// Delete Property
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid property ID'
      });
    }

    // Get property manager filter based on user type
    const propertyManagerFilter = getPropertyManagerFilter(req);
    if (propertyManagerFilter === null) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...propertyManagerFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    // Soft delete by setting isActive to false
    property.isActive = false;
    await property.save();

    res.status(200).json({
      status: 'success',
      message: 'Property deleted successfully',
      data: {
        propertyId: id,
        deletedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Delete property error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while deleting the property'
    });
  }
});

// Get Property Compliance Summary
router.get('/:id/compliance', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid property ID'
      });
    }

    // Get property manager filter based on user type
    const propertyManagerFilter = getPropertyManagerFilter(req);
    if (propertyManagerFilter === null) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
    }

    // Find property with access control
    const filter = { _id: id, isActive: true, ...propertyManagerFilter };
    const property = await Property.findOne(filter);

    if (!property) {
      return res.status(404).json({
        status: 'error',
        message: 'Property not found'
      });
    }

    const complianceSummary = property.getComplianceSummary();
    const hasOverdue = property.hasOverdueCompliance();

    res.status(200).json({
      status: 'success',
      data: {
        propertyId: id,
        fullAddress: property.fullAddressString,
        complianceSummary,
        hasOverdueCompliance: hasOverdue,
        complianceSchedule: property.complianceSchedule
      }
    });

  } catch (error) {
    console.error('Get property compliance error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching property compliance'
    });
  }
});

export default router; 