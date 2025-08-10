import express from 'express';
import TeamMember from '../models/TeamMember.js';
import { authenticateSuperUser } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require super user authentication
router.use(authenticateSuperUser);

// Get all team members
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;

    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [teamMembers, total] = await Promise.all([
      TeamMember.find(query)
        .populate('createdBy', 'name email')
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      TeamMember.countDocuments(query)
    ]);

    res.status(200).json({
      status: 'success',
      message: 'Team members fetched successfully',
      data: {
        teamMembers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team members',
      timestamp: new Date().toISOString()
    });
  }
});

// Get single team member
router.get('/:id', async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id)
      .populate('createdBy', 'name email')
      .select('-password');

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
        timestamp: new Date().toISOString()
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Team member fetched successfully',
      data: { teamMember },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Get team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch team member',
      timestamp: new Date().toISOString()
    });
  }
});

// Create new team member
router.post('/', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Name, email, and password are required',
        timestamp: new Date().toISOString()
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        timestamp: new Date().toISOString()
      });
    }

    // Check if email already exists
    const existingTeamMember = await TeamMember.findOne({ email });
    if (existingTeamMember) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this email already exists',
        timestamp: new Date().toISOString()
      });
    }

    // Store the plain password for email before hashing
    const plainPassword = password;

    // Create new team member
    const teamMember = new TeamMember({
      name,
      email,
      password,
      createdBy: req.superUser.id
    });

    await teamMember.save();

    // Send credentials email with plain password
    try {
      const emailService = (await import('../services/email.service.js')).default;
      await emailService.sendTeamMemberCredentialsEmail({
        name: teamMember.name,
        email: teamMember.email
      }, plainPassword);
      
      console.log('Team member credentials email sent successfully:', {
        teamMemberId: teamMember._id,
        email: teamMember.email,
        name: teamMember.name,
        timestamp: new Date().toISOString()
      });
    } catch (emailError) {
      console.error('Failed to send credentials email to team member:', {
        teamMemberId: teamMember._id,
        email: teamMember.email,
        name: teamMember.name,
        error: emailError.message,
        timestamp: new Date().toISOString()
      });
    }

    // Remove password from response
    const teamMemberData = teamMember.toObject();
    delete teamMemberData.password;

    res.status(201).json({
      status: 'success',
      message: 'Team member created successfully',
      data: { teamMember: teamMemberData },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Create team member error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', '),
        timestamp: new Date().toISOString()
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this email already exists',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create team member',
      timestamp: new Date().toISOString()
    });
  }
});

// Update team member
router.put('/:id', async (req, res) => {
  try {
    const { name, email, status } = req.body;
    const { id } = req.params;

    // Find team member
    const teamMember = await TeamMember.findById(id);
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update fields
    if (name) teamMember.name = name;
    if (email) teamMember.email = email;
    if (status) teamMember.status = status;
    teamMember.lastUpdated = new Date();

    await teamMember.save();

    // Remove password from response
    const teamMemberData = teamMember.toObject();
    delete teamMemberData.password;

    res.status(200).json({
      status: 'success',
      message: 'Team member updated successfully',
      data: { teamMember: teamMemberData },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Update team member error:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        status: 'error',
        message: messages.join(', '),
        timestamp: new Date().toISOString()
      });
    }

    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'Team member with this email already exists',
        timestamp: new Date().toISOString()
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to update team member',
      timestamp: new Date().toISOString()
    });
  }
});

// Delete team member
router.delete('/:id', async (req, res) => {
  try {
    const teamMember = await TeamMember.findById(req.params.id);

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
        timestamp: new Date().toISOString()
      });
    }

    await TeamMember.findByIdAndDelete(req.params.id);

    res.status(200).json({
      status: 'success',
      message: 'Team member deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Delete team member error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete team member',
      timestamp: new Date().toISOString()
    });
  }
});

// Update team member password (for super user to reset passwords)
router.put('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body;
    const { id } = req.params;

    if (!newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'New password is required',
        timestamp: new Date().toISOString()
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long',
        timestamp: new Date().toISOString()
      });
    }

    const teamMember = await TeamMember.findById(id);
    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
        timestamp: new Date().toISOString()
      });
    }

    teamMember.password = newPassword;
    await teamMember.save();

    res.status(200).json({
      status: 'success',
      message: 'Team member password reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Reset team member password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset team member password',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;