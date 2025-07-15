/**
 * Example of creating a property with automatic compliance dates
 * This demonstrates how the Property schema works with Australian compliance requirements
 */

import Property from '../models/Property.js';
import { setDefaultInspectionDates, setStateSpecificCompliance } from '../utils/propertyHelpers.js';

// Example: Creating a new property
export const createPropertyExample = async (propertyManagerId, createdByUserId, userType = 'PropertyManager') => {
  try {
    // Basic property data input
    let propertyData = {
      address: {
        street: '123 Collins Street',
        suburb: 'Melbourne',
        state: 'VIC',
        postcode: '3000'
      },
      propertyType: 'Apartment',
      propertyManager: propertyManagerId,
      region: 'Melbourne Metro',
      
      // Tenant Information
      currentTenant: {
        name: 'John Smith',
        email: 'john.smith@email.com',
        phone: '0412 345 678'
      },
      
      // Landlord Information
      currentLandlord: {
        name: 'Sarah Williams',
        email: 'sarah.williams@email.com',
        phone: '0423 567 890'
      },
      
      // Property features
      features: {
        airConditioning: true,
        heating: 'Ducted',
        parking: 'Garage',
        pool: false, // This will affect compliance requirements
        garden: false,
        furnished: false,
        petFriendly: true
      },
      
      // Financial information
      financial: {
        weeklyRent: 650,
        bondRequired: 2600
      },
      
      // Creator information
      createdBy: {
        userType: userType,
        userId: createdByUserId
      }
    };
    
    // Automatically set default inspection dates for Australian compliance
    propertyData = setDefaultInspectionDates(propertyData);
    
    // Set state-specific compliance requirements (Victoria has different electrical requirements)
    propertyData = setStateSpecificCompliance(propertyData, propertyData.address.state);
    
    // Create the property
    const property = new Property(propertyData);
    await property.save();
    
    console.log('Property created successfully with automatic compliance dates:');
    console.log('Full Address:', property.fullAddressString);
    console.log('Gas Compliance Next Inspection:', property.complianceSchedule.gasCompliance.nextInspection);
    console.log('Electrical Safety Next Inspection:', property.complianceSchedule.electricalSafety.nextInspection);
    console.log('Smoke Alarms Next Inspection:', property.complianceSchedule.smokeAlarms.nextInspection);
    console.log('Pool Safety Required:', property.complianceSchedule.poolSafety.required);
    console.log('Routine Inspection Next:', property.routineInspections.nextInspection);
    
    return property;
    
  } catch (error) {
    console.error('Error creating property:', error);
    throw error;
  }
};

// Example: Property with pool (Queensland property with stricter pool requirements)
export const createPoolPropertyExample = async (propertyManagerId, createdByUserId) => {
  try {
    let propertyData = {
      address: {
        street: '456 Queen Street',
        suburb: 'Brisbane',
        state: 'QLD',
        postcode: '4000'
      },
      propertyType: 'House',
      bedrooms: 4,
      bathrooms: 3,
      rentAmount: 850,
      propertyManager: propertyManagerId,
      region: 'Brisbane Metro',
      status: 'Available',
      
      features: {
        airConditioning: true,
        heating: 'None',
        parking: 'Garage',
        pool: true, // This will trigger pool safety requirements
        garden: true,
        furnished: false,
        petFriendly: true
      },
      
      createdBy: {
        userType: 'PropertyManager',
        userId: createdByUserId
      }
    };
    
    // Set default inspection dates
    propertyData = setDefaultInspectionDates(propertyData);
    
    // Queensland has different compliance requirements (more frequent gas, mandatory pool safety)
    propertyData = setStateSpecificCompliance(propertyData, 'QLD');
    
    const property = new Property(propertyData);
    await property.save();
    
    console.log('Queensland property with pool created:');
    console.log('Pool Safety Required:', property.complianceSchedule.poolSafety.required);
    console.log('Pool Safety Next Inspection:', property.complianceSchedule.poolSafety.nextInspection);
    console.log('Gas Compliance Frequency (QLD):', property.complianceSchedule.gasCompliance.frequency, 'months');
    
    return property;
    
  } catch (error) {
    console.error('Error creating pool property:', error);
    throw error;
  }
};

// Example: Checking compliance status
export const checkPropertyCompliance = async (propertyId) => {
  try {
    const property = await Property.findById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    // Get compliance summary
    const complianceSummary = property.getComplianceSummary();
    console.log('Compliance Summary:', complianceSummary);
    
    // Check if any compliance is overdue
    const hasOverdue = property.hasOverdueCompliance();
    console.log('Has Overdue Compliance:', hasOverdue);
    
    return {
      complianceSummary,
      hasOverdue,
      fullAddress: property.fullAddressString
    };
    
  } catch (error) {
    console.error('Error checking compliance:', error);
    throw error;
  }
}; 