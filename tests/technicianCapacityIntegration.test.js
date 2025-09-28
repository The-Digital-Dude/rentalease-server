// Integration test for technician capacity enforcement in API endpoints

describe('Technician Capacity Integration Tests', () => {

  // Mock the capacity enforcement logic as it would work in the API
  const simulateJobAssignment = (technician, job) => {
    const getTechnicianMaxJobs = (tech) => {
      if (!tech) return 4;
      const { maxJobs } = tech;
      return typeof maxJobs === "number" && !Number.isNaN(maxJobs) ? maxJobs : 4;
    };

    const technicianMaxJobs = getTechnicianMaxJobs(technician);
    const technicianCurrentJobs = technician.currentJobs || 0;

    // Check if technician is at capacity (this is the key validation)
    if (technicianCurrentJobs >= technicianMaxJobs) {
      return {
        success: false,
        status: 400,
        message: "The technician has reached their job limit and cannot take more assignments right now."
      };
    }

    // Simulate successful assignment
    technician.currentJobs = technicianCurrentJobs + 1;
    technician.availabilityStatus =
      technician.currentJobs >= technicianMaxJobs ? "Busy" : "Available";

    job.assignedTechnician = technician._id;
    job.status = "Scheduled";

    return {
      success: true,
      status: 200,
      message: "Job assigned successfully",
      data: { job, technician }
    };
  };

  const simulateJobClaim = (technician, job) => {
    const getTechnicianMaxJobs = (tech) => {
      if (!tech) return 4;
      const { maxJobs } = tech;
      return typeof maxJobs === "number" && !Number.isNaN(maxJobs) ? maxJobs : 4;
    };

    const technicianMaxJobs = getTechnicianMaxJobs(technician);
    const technicianCurrentJobs = technician.currentJobs || 0;

    // Check if technician is available (capacity check for claiming)
    if (technicianCurrentJobs >= technicianMaxJobs) {
      return {
        success: false,
        status: 400,
        message: "You are currently too busy to take on more jobs. Please complete some existing jobs first."
      };
    }

    // Simulate successful claim
    technician.currentJobs = technicianCurrentJobs + 1;
    technician.availabilityStatus =
      technician.currentJobs >= technicianMaxJobs ? "Busy" : "Available";

    job.assignedTechnician = technician._id;
    job.status = "Scheduled";

    return {
      success: true,
      status: 200,
      message: "Job claimed successfully",
      data: { job, technician }
    };
  };

  const simulateJobCompletion = (technician, job) => {
    const getTechnicianMaxJobs = (tech) => {
      if (!tech) return 4;
      const { maxJobs } = tech;
      return typeof maxJobs === "number" && !Number.isNaN(maxJobs) ? maxJobs : 4;
    };

    const technicianMaxJobs = getTechnicianMaxJobs(technician);

    // Simulate job completion - decrement job count
    technician.currentJobs = Math.max(0, (technician.currentJobs || 0) - 1);
    technician.availabilityStatus =
      technician.currentJobs >= technicianMaxJobs ? "Busy" : "Available";

    job.status = "Completed";

    return {
      success: true,
      status: 200,
      message: "Job completed successfully",
      data: { job, technician }
    };
  };

  describe('Job Assignment API Simulation', () => {
    test('should successfully assign job to available technician', () => {
      const technician = {
        _id: 'tech123',
        firstName: 'John',
        lastName: 'Doe',
        currentJobs: 2,
        maxJobs: 5,
        availabilityStatus: 'Available'
      };

      const job = {
        _id: 'job123',
        description: 'Fix leak',
        status: 'Pending',
        assignedTechnician: null
      };

      const result = simulateJobAssignment(technician, job);

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Available');
      expect(job.assignedTechnician).toBe('tech123');
      expect(job.status).toBe('Scheduled');
    });

    test('should reject job assignment when technician is at capacity', () => {
      const technician = {
        _id: 'tech456',
        firstName: 'Jane',
        lastName: 'Smith',
        currentJobs: 4,
        maxJobs: 4,
        availabilityStatus: 'Busy'
      };

      const job = {
        _id: 'job456',
        description: 'Install equipment',
        status: 'Pending',
        assignedTechnician: null
      };

      const result = simulateJobAssignment(technician, job);

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.message).toContain('reached their job limit');
      expect(technician.currentJobs).toBe(4); // No change
      expect(job.assignedTechnician).toBe(null); // No assignment
    });

    test('should handle assignment with default maxJobs', () => {
      const technician = {
        _id: 'tech789',
        firstName: 'New',
        lastName: 'Tech',
        currentJobs: 3,
        // maxJobs not defined - should use default of 4
        availabilityStatus: 'Available'
      };

      const job = {
        _id: 'job789',
        description: 'Maintenance check',
        status: 'Pending',
        assignedTechnician: null
      };

      const result = simulateJobAssignment(technician, job);

      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(4);
      expect(technician.availabilityStatus).toBe('Busy'); // Now at capacity
    });
  });

  describe('Job Claiming API Simulation', () => {
    test('should successfully allow technician to claim available job', () => {
      const technician = {
        _id: 'tech123',
        firstName: 'John',
        lastName: 'Doe',
        currentJobs: 1,
        maxJobs: 3,
        availabilityStatus: 'Available'
      };

      const job = {
        _id: 'job123',
        description: 'Emergency repair',
        status: 'Pending',
        assignedTechnician: null
      };

      const result = simulateJobClaim(technician, job);

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(technician.currentJobs).toBe(2);
      expect(technician.availabilityStatus).toBe('Available');
      expect(job.assignedTechnician).toBe('tech123');
    });

    test('should reject job claim when technician is too busy', () => {
      const technician = {
        _id: 'tech456',
        firstName: 'Busy',
        lastName: 'Tech',
        currentJobs: 6,
        maxJobs: 6,
        availabilityStatus: 'Busy'
      };

      const job = {
        _id: 'job456',
        description: 'Routine inspection',
        status: 'Pending',
        assignedTechnician: null
      };

      const result = simulateJobClaim(technician, job);

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
      expect(result.message).toContain('too busy to take on more jobs');
      expect(technician.currentJobs).toBe(6); // No change
      expect(job.assignedTechnician).toBe(null);
    });
  });

  describe('Job Completion API Simulation', () => {
    test('should correctly update availability after job completion', () => {
      const technician = {
        _id: 'tech123',
        firstName: 'John',
        lastName: 'Doe',
        currentJobs: 4,
        maxJobs: 4,
        availabilityStatus: 'Busy'
      };

      const job = {
        _id: 'job123',
        description: 'Completed task',
        status: 'In Progress',
        assignedTechnician: 'tech123'
      };

      const result = simulateJobCompletion(technician, job);

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Available'); // Now available
      expect(job.status).toBe('Completed');
    });

    test('should handle completion when technician had multiple jobs', () => {
      const technician = {
        _id: 'tech456',
        firstName: 'Multi',
        lastName: 'Tasker',
        currentJobs: 7,
        maxJobs: 8,
        availabilityStatus: 'Available'
      };

      const job = {
        _id: 'job456',
        description: 'One of many tasks',
        status: 'In Progress',
        assignedTechnician: 'tech456'
      };

      const result = simulateJobCompletion(technician, job);

      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(6);
      expect(technician.availabilityStatus).toBe('Available'); // Still available
    });
  });

  describe('End-to-End Workflow Simulation', () => {
    test('should handle complete job lifecycle with capacity checks', () => {
      const technician = {
        _id: 'tech123',
        firstName: 'Workflow',
        lastName: 'Test',
        currentJobs: 2,
        maxJobs: 3,
        availabilityStatus: 'Available'
      };

      const job1 = { _id: 'job1', description: 'Job 1', status: 'Pending' };
      const job2 = { _id: 'job2', description: 'Job 2', status: 'Pending' };
      const job3 = { _id: 'job3', description: 'Job 3', status: 'Pending' };

      // Assign first job - should succeed
      let result = simulateJobAssignment(technician, job1);
      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Busy');

      // Try to assign second job - should fail (at capacity)
      result = simulateJobAssignment(technician, job2);
      expect(result.success).toBe(false);
      expect(technician.currentJobs).toBe(3); // No change

      // Complete first job - should free up capacity
      result = simulateJobCompletion(technician, job1);
      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(2);
      expect(technician.availabilityStatus).toBe('Available');

      // Now try to claim the third job - should succeed
      result = simulateJobClaim(technician, job3);
      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(3);
      expect(technician.availabilityStatus).toBe('Busy');
    });

    test('should handle technician with custom high capacity', () => {
      const technician = {
        _id: 'tech999',
        firstName: 'High',
        lastName: 'Capacity',
        currentJobs: 8,
        maxJobs: 10,
        availabilityStatus: 'Available'
      };

      const jobs = [
        { _id: 'job1', description: 'Job 1', status: 'Pending' },
        { _id: 'job2', description: 'Job 2', status: 'Pending' },
        { _id: 'job3', description: 'Job 3', status: 'Pending' }
      ];

      // Should be able to take 2 more jobs
      let result = simulateJobAssignment(technician, jobs[0]);
      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(9);

      result = simulateJobAssignment(technician, jobs[1]);
      expect(result.success).toBe(true);
      expect(technician.currentJobs).toBe(10);
      expect(technician.availabilityStatus).toBe('Busy');

      // Third job should be rejected
      result = simulateJobAssignment(technician, jobs[2]);
      expect(result.success).toBe(false);
      expect(technician.currentJobs).toBe(10);
    });
  });
});