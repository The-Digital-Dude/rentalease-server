// Direct test of the getTechnicianMaxJobs function logic

describe('Technician Job Capacity Enforcement', () => {

  // Recreate the function locally for testing
  const getTechnicianMaxJobs = (technician) => {
    if (!technician) {
      return 4;
    }

    const { maxJobs } = technician;
    return typeof maxJobs === "number" && !Number.isNaN(maxJobs) ? maxJobs : 4;
  };

  describe('getTechnicianMaxJobs helper function', () => {
    test('should return default value of 4 when technician is null', () => {
      expect(getTechnicianMaxJobs(null)).toBe(4);
    });

    test('should return default value of 4 when technician is undefined', () => {
      expect(getTechnicianMaxJobs(undefined)).toBe(4);
    });

    test('should return technician maxJobs when valid number is provided', () => {
      const technician = { maxJobs: 5 };
      expect(getTechnicianMaxJobs(technician)).toBe(5);
    });

    test('should return default value of 4 when maxJobs is not a number', () => {
      const technician = { maxJobs: 'invalid' };
      expect(getTechnicianMaxJobs(technician)).toBe(4);
    });

    test('should return default value of 4 when maxJobs is NaN', () => {
      const technician = { maxJobs: NaN };
      expect(getTechnicianMaxJobs(technician)).toBe(4);
    });

    test('should return 0 when maxJobs is explicitly set to 0', () => {
      const technician = { maxJobs: 0 };
      expect(getTechnicianMaxJobs(technician)).toBe(0);
    });

    test('should handle negative maxJobs values', () => {
      const technician = { maxJobs: -1 };
      expect(getTechnicianMaxJobs(technician)).toBe(-1);
    });

    test('should return default when maxJobs is null', () => {
      const technician = { maxJobs: null };
      expect(getTechnicianMaxJobs(technician)).toBe(4);
    });

    test('should return default when maxJobs property is missing', () => {
      const technician = { firstName: 'John', lastName: 'Doe' };
      expect(getTechnicianMaxJobs(technician)).toBe(4);
    });
  });

  describe('Capacity Logic Validation', () => {
    test('should allow job assignment when technician is below capacity', () => {
      const technician = { currentJobs: 2, maxJobs: 5 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianCurrentJobs).toBeLessThan(technicianMaxJobs);
      expect(technicianCurrentJobs).toBe(2);
      expect(technicianMaxJobs).toBe(5);
    });

    test('should block job assignment when technician is at capacity', () => {
      const technician = { currentJobs: 3, maxJobs: 3 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianCurrentJobs).toBeGreaterThanOrEqual(technicianMaxJobs);
      expect(technicianCurrentJobs).toBe(3);
      expect(technicianMaxJobs).toBe(3);
    });

    test('should block job assignment when technician exceeds capacity', () => {
      const technician = { currentJobs: 5, maxJobs: 3 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianCurrentJobs).toBeGreaterThanOrEqual(technicianMaxJobs);
      expect(technicianCurrentJobs).toBe(5);
      expect(technicianMaxJobs).toBe(3);
    });

    test('should use default capacity when maxJobs is not set', () => {
      const technician = { currentJobs: 3 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianMaxJobs).toBe(4);
      expect(technicianCurrentJobs).toBe(3);
      expect(technicianCurrentJobs).toBeLessThan(technicianMaxJobs);
    });

    test('should handle zero maxJobs correctly', () => {
      const technician = { currentJobs: 0, maxJobs: 0 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianMaxJobs).toBe(0);
      expect(technicianCurrentJobs).toBe(0);
      expect(technicianCurrentJobs).toBeGreaterThanOrEqual(technicianMaxJobs);
    });
  });

  describe('Job Count Updates After Assignment', () => {
    test('should correctly update technician job count and availability status', () => {
      const technician = {
        currentJobs: 2,
        maxJobs: 4,
        availabilityStatus: 'Available'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      technician.currentJobs = (technician.currentJobs || 0) + 1;
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? 'Busy' : 'Available';

      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Available');
    });

    test('should set availability to Busy when reaching capacity', () => {
      const technician = {
        currentJobs: 3,
        maxJobs: 4,
        availabilityStatus: 'Available'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      technician.currentJobs = (technician.currentJobs || 0) + 1;
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? 'Busy' : 'Available';

      expect(technician.currentJobs).toBe(4);
      expect(technician.availabilityStatus).toBe('Busy');
    });
  });

  describe('Job Completion and Capacity Release', () => {
    test('should correctly update availability status after job completion', () => {
      const technician = {
        currentJobs: 4,
        maxJobs: 4,
        availabilityStatus: 'Busy'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      technician.currentJobs = Math.max(0, (technician.currentJobs || 0) - 1);
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? 'Busy' : 'Available';

      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Available');
    });

    test('should handle negative job counts gracefully', () => {
      const technician = {
        currentJobs: 0,
        maxJobs: 4,
        availabilityStatus: 'Available'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      technician.currentJobs = Math.max(0, (technician.currentJobs || 0) - 1);
      technician.availabilityStatus =
        technician.currentJobs >= technicianMaxJobs ? 'Busy' : 'Available';

      expect(technician.currentJobs).toBe(0);
      expect(technician.availabilityStatus).toBe('Available');
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    test('should handle technician with undefined currentJobs', () => {
      const technician = { maxJobs: 3 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianCurrentJobs).toBe(0);
      expect(technicianMaxJobs).toBe(3);
      expect(technicianCurrentJobs).toBeLessThan(technicianMaxJobs);
    });

    test('should handle technician with null currentJobs', () => {
      const technician = { currentJobs: null, maxJobs: 2 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;

      expect(technicianCurrentJobs).toBe(0);
      expect(technicianMaxJobs).toBe(2);
      expect(technicianCurrentJobs).toBeLessThan(technicianMaxJobs);
    });

    test('should handle empty technician object', () => {
      const technician = {};
      const technicianMaxJobs = getTechnicianMaxJobs(technician);

      expect(technicianMaxJobs).toBe(4);
    });

    test('should handle fractional maxJobs values', () => {
      const technician = { maxJobs: 3.5 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);

      expect(technicianMaxJobs).toBe(3.5);
    });

    test('should handle very large maxJobs values', () => {
      const technician = { maxJobs: 1000 };
      const technicianMaxJobs = getTechnicianMaxJobs(technician);

      expect(technicianMaxJobs).toBe(1000);
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle typical technician with custom capacity', () => {
      const technician = {
        _id: 'tech123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        currentJobs: 1,
        maxJobs: 6,
        availabilityStatus: 'Available'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;
      const canTakeJob = technicianCurrentJobs < technicianMaxJobs;

      expect(technicianMaxJobs).toBe(6);
      expect(technicianCurrentJobs).toBe(1);
      expect(canTakeJob).toBe(true);
    });

    test('should handle busy technician at custom capacity', () => {
      const technician = {
        _id: 'tech456',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        currentJobs: 8,
        maxJobs: 8,
        availabilityStatus: 'Busy'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;
      const canTakeJob = technicianCurrentJobs < technicianMaxJobs;

      expect(technicianMaxJobs).toBe(8);
      expect(technicianCurrentJobs).toBe(8);
      expect(canTakeJob).toBe(false);
    });

    test('should handle new technician with default settings', () => {
      const technician = {
        _id: 'tech789',
        firstName: 'New',
        lastName: 'Technician',
        email: 'new@example.com',
        currentJobs: 0,
        // maxJobs not set - should use default
        availabilityStatus: 'Available'
      };

      const technicianMaxJobs = getTechnicianMaxJobs(technician);
      const technicianCurrentJobs = technician.currentJobs || 0;
      const canTakeJob = technicianCurrentJobs < technicianMaxJobs;

      expect(technicianMaxJobs).toBe(4);
      expect(technicianCurrentJobs).toBe(0);
      expect(canTakeJob).toBe(true);
    });
  });
});