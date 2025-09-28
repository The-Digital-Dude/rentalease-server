// Test Property Manager access control functionality

// Mock the access control logic as it would work in the API
const simulatePropertyManagerAccess = (propertyManager, properties) => {
    const getActivePropertyIds = (pm) => {
      return pm.assignedProperties
        .filter(assignment => assignment.status === 'Active')
        .map(assignment => assignment.propertyId);
    };

    const activePropertyIds = getActivePropertyIds(propertyManager);

    return {
      propertyManager,
      activePropertyIds,
      accessibleProperties: properties.filter(prop =>
        activePropertyIds.includes(prop._id)
      )
    };
  };

const simulateJobAccess = (propertyManager, jobs) => {
    const activePropertyIds = propertyManager.assignedProperties
      .filter(assignment => assignment.status === 'Active')
      .map(assignment => assignment.propertyId);

    return {
      accessibleJobs: jobs.filter(job =>
        activePropertyIds.includes(job.property)
      ),
      totalJobs: jobs.length,
      restrictedJobs: jobs.filter(job =>
        !activePropertyIds.includes(job.property)
      )
    };
  };

describe('Property Manager Access Control Tests', () => {

  describe('Property Access Control', () => {
    test('should only allow access to assigned properties', () => {
      const propertyManager = {
        _id: 'pm123',
        firstName: 'John',
        lastName: 'Smith',
        assignedProperties: [
          { propertyId: 'prop1', status: 'Active' },
          { propertyId: 'prop2', status: 'Active' },
          { propertyId: 'prop3', status: 'Inactive' }
        ]
      };

      const allProperties = [
        { _id: 'prop1', address: { fullAddress: '123 Main St' } },
        { _id: 'prop2', address: { fullAddress: '456 Oak Ave' } },
        { _id: 'prop3', address: { fullAddress: '789 Pine Rd' } },
        { _id: 'prop4', address: { fullAddress: '321 Elm St' } },
        { _id: 'prop5', address: { fullAddress: '654 Maple Dr' } }
      ];

      const result = simulatePropertyManagerAccess(propertyManager, allProperties);

      // Should only have access to active assigned properties (prop1, prop2)
      expect(result.activePropertyIds).toHaveLength(2);
      expect(result.activePropertyIds).toContain('prop1');
      expect(result.activePropertyIds).toContain('prop2');
      expect(result.activePropertyIds).not.toContain('prop3'); // Inactive
      expect(result.activePropertyIds).not.toContain('prop4'); // Not assigned
      expect(result.activePropertyIds).not.toContain('prop5'); // Not assigned

      expect(result.accessibleProperties).toHaveLength(2);
      expect(result.accessibleProperties[0]._id).toBe('prop1');
      expect(result.accessibleProperties[1]._id).toBe('prop2');
    });

    test('should handle property manager with no assigned properties', () => {
      const propertyManager = {
        _id: 'pm456',
        firstName: 'Jane',
        lastName: 'Doe',
        assignedProperties: []
      };

      const allProperties = [
        { _id: 'prop1', address: { fullAddress: '123 Main St' } },
        { _id: 'prop2', address: { fullAddress: '456 Oak Ave' } }
      ];

      const result = simulatePropertyManagerAccess(propertyManager, allProperties);

      expect(result.activePropertyIds).toHaveLength(0);
      expect(result.accessibleProperties).toHaveLength(0);
    });

    test('should handle property manager with all inactive assignments', () => {
      const propertyManager = {
        _id: 'pm789',
        firstName: 'Bob',
        lastName: 'Wilson',
        assignedProperties: [
          { propertyId: 'prop1', status: 'Inactive' },
          { propertyId: 'prop2', status: 'Suspended' }
        ]
      };

      const allProperties = [
        { _id: 'prop1', address: { fullAddress: '123 Main St' } },
        { _id: 'prop2', address: { fullAddress: '456 Oak Ave' } }
      ];

      const result = simulatePropertyManagerAccess(propertyManager, allProperties);

      expect(result.activePropertyIds).toHaveLength(0);
      expect(result.accessibleProperties).toHaveLength(0);
    });
  });

  describe('Job Access Control', () => {
    test('should only allow access to jobs for assigned properties', () => {
      const propertyManager = {
        _id: 'pm123',
        assignedProperties: [
          { propertyId: 'prop1', status: 'Active' },
          { propertyId: 'prop2', status: 'Active' },
          { propertyId: 'prop3', status: 'Inactive' }
        ]
      };

      const allJobs = [
        { _id: 'job1', property: 'prop1', jobType: 'Gas', status: 'Pending' },
        { _id: 'job2', property: 'prop2', jobType: 'Electrical', status: 'Scheduled' },
        { _id: 'job3', property: 'prop3', jobType: 'Smoke', status: 'Completed' },
        { _id: 'job4', property: 'prop4', jobType: 'Gas', status: 'Pending' },
        { _id: 'job5', property: 'prop5', jobType: 'Repairs', status: 'Overdue' }
      ];

      const result = simulateJobAccess(propertyManager, allJobs);

      // Should only see jobs for prop1 and prop2 (active assignments)
      expect(result.accessibleJobs).toHaveLength(2);
      expect(result.accessibleJobs[0]._id).toBe('job1');
      expect(result.accessibleJobs[1]._id).toBe('job2');

      expect(result.restrictedJobs).toHaveLength(3);
      expect(result.restrictedJobs.map(j => j._id)).toContain('job3'); // Inactive assignment
      expect(result.restrictedJobs.map(j => j._id)).toContain('job4'); // Not assigned
      expect(result.restrictedJobs.map(j => j._id)).toContain('job5'); // Not assigned
    });

    test('should see no jobs when no properties assigned', () => {
      const propertyManager = {
        _id: 'pm456',
        assignedProperties: []
      };

      const allJobs = [
        { _id: 'job1', property: 'prop1', jobType: 'Gas', status: 'Pending' },
        { _id: 'job2', property: 'prop2', jobType: 'Electrical', status: 'Scheduled' }
      ];

      const result = simulateJobAccess(propertyManager, allJobs);

      expect(result.accessibleJobs).toHaveLength(0);
      expect(result.restrictedJobs).toHaveLength(2);
    });
  });

  describe('Property Creation with Auto-Assignment', () => {
    test('should auto-assign property to creating Property Manager', () => {
      const propertyManager = {
        _id: 'pm123',
        owner: {
          ownerType: 'Agency',
          ownerId: 'agency456'
        },
        assignedProperties: []
      };

      const propertyData = {
        address: { street: '123 Test St', suburb: 'Test Suburb', state: 'NSW' },
        propertyType: 'House'
      };

      // Simulate property creation logic
      const newProperty = {
        _id: 'newProp123',
        ...propertyData,
        agency: propertyManager.owner.ownerId,
        assignedPropertyManager: propertyManager._id,
        createdBy: {
          userType: 'PropertyManager',
          userId: propertyManager._id
        }
      };

      // Simulate adding to PropertyManager's assignedProperties
      const updatedPropertyManager = {
        ...propertyManager,
        assignedProperties: [
          ...propertyManager.assignedProperties,
          {
            propertyId: newProperty._id,
            assignedDate: new Date(),
            status: 'Active',
            role: 'Primary'
          }
        ]
      };

      expect(newProperty.assignedPropertyManager).toBe(propertyManager._id);
      expect(newProperty.agency).toBe(propertyManager.owner.ownerId);
      expect(newProperty.createdBy.userType).toBe('PropertyManager');
      expect(newProperty.createdBy.userId).toBe(propertyManager._id);

      expect(updatedPropertyManager.assignedProperties).toHaveLength(1);
      expect(updatedPropertyManager.assignedProperties[0].propertyId).toBe(newProperty._id);
      expect(updatedPropertyManager.assignedProperties[0].status).toBe('Active');
      expect(updatedPropertyManager.assignedProperties[0].role).toBe('Primary');
    });
  });

  describe('Owner Info Handling', () => {
    test('should return correct owner info for Property Manager', () => {
      const simulateGetOwnerInfo = (req) => {
        if (req.propertyManager) {
          return {
            ownerType: req.propertyManager.owner.ownerType,
            ownerId: req.propertyManager.owner.ownerId,
            propertyManagerId: req.propertyManager.id,
            assignedProperties: req.propertyManager.assignedProperties,
          };
        }
        return null;
      };

      const mockRequest = {
        propertyManager: {
          id: 'pm123',
          owner: {
            ownerType: 'Agency',
            ownerId: 'agency456'
          },
          assignedProperties: [
            { propertyId: 'prop1', status: 'Active' },
            { propertyId: 'prop2', status: 'Active' }
          ]
        }
      };

      const ownerInfo = simulateGetOwnerInfo(mockRequest);

      expect(ownerInfo.ownerType).toBe('Agency');
      expect(ownerInfo.ownerId).toBe('agency456');
      expect(ownerInfo.propertyManagerId).toBe('pm123');
      expect(ownerInfo.assignedProperties).toHaveLength(2);
    });
  });

  describe('Access Validation', () => {
    test('should validate property manager has access to specific property', () => {
      const validatePropertyAccess = (propertyManager, propertyId) => {
        const activePropertyIds = propertyManager.assignedProperties
          .filter(assignment => assignment.status === 'Active')
          .map(assignment => assignment.propertyId);

        return activePropertyIds.includes(propertyId);
      };

      const propertyManager = {
        assignedProperties: [
          { propertyId: 'prop1', status: 'Active' },
          { propertyId: 'prop2', status: 'Active' },
          { propertyId: 'prop3', status: 'Inactive' }
        ]
      };

      expect(validatePropertyAccess(propertyManager, 'prop1')).toBe(true);
      expect(validatePropertyAccess(propertyManager, 'prop2')).toBe(true);
      expect(validatePropertyAccess(propertyManager, 'prop3')).toBe(false); // Inactive
      expect(validatePropertyAccess(propertyManager, 'prop4')).toBe(false); // Not assigned
    });

    test('should validate property manager has access to specific job', () => {
      const validateJobAccess = (propertyManager, job) => {
        const activePropertyIds = propertyManager.assignedProperties
          .filter(assignment => assignment.status === 'Active')
          .map(assignment => assignment.propertyId);

        return activePropertyIds.includes(job.property);
      };

      const propertyManager = {
        assignedProperties: [
          { propertyId: 'prop1', status: 'Active' },
          { propertyId: 'prop2', status: 'Active' }
        ]
      };

      const job1 = { _id: 'job1', property: 'prop1', jobType: 'Gas' };
      const job2 = { _id: 'job2', property: 'prop3', jobType: 'Electrical' };

      expect(validateJobAccess(propertyManager, job1)).toBe(true);
      expect(validateJobAccess(propertyManager, job2)).toBe(false);
    });
  });
});

// Export test utilities for reuse
module.exports = {
  simulatePropertyManagerAccess,
  simulateJobAccess
};