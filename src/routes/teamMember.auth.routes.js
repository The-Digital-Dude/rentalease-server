import express from 'express';
import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember.js';
import emailService from '../services/email.service.js';
import { generateOTP } from '../utils/otpGenerator.js';

const router = express.Router();

// Team Member Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required',
        timestamp: new Date().toISOString()
      });
    }

    // Find team member and include password for comparison
    const teamMember = await TeamMember.findOne({ email }).select('+password');

    if (!teamMember) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString()
      });
    }

    // Check if team member is active
    if (teamMember.status !== 'Active') {
      return res.status(401).json({
        status: 'error',
        message: 'Account is inactive. Please contact administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Verify password
    const isPasswordValid = await teamMember.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
        timestamp: new Date().toISOString()
      });
    }

    // Update last login
    await teamMember.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: teamMember._id, 
        email: teamMember.email,
        userType: 'TeamMember'
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Remove password from response
    const teamMemberData = teamMember.toObject();
    delete teamMemberData.password;

    res.status(200).json({
      status: 'success',
      message: 'Team member logged in successfully',
      data: {
        token,
        teamMember: teamMemberData,
        userType: 'TeamMember'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Team member login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
      timestamp: new Date().toISOString()
    });
  }
});

// Request Password Reset
router.post('/request-password-reset', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required',
        timestamp: new Date().toISOString()
      });
    }

    const teamMember = await TeamMember.findOne({ email });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found with this email',
        timestamp: new Date().toISOString()
      });
    }

    // Check if team member is active
    if (teamMember.status !== 'Active') {
      return res.status(400).json({
        status: 'error',
        message: 'Account is inactive. Please contact administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update team member with OTP
    teamMember.resetPasswordOTP = otp;
    teamMember.resetPasswordOTPExpires = otpExpires;
    teamMember.resetPasswordOTPAttempts = 0;
    await teamMember.save();

    // Send reset email
    await emailService.sendPasswordResetEmail({
      email: teamMember.email,
      name: teamMember.name,
      otp
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset OTP sent to your email',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to send password reset email',
      timestamp: new Date().toISOString()
    });
  }
});

// Reset Password with OTP
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, OTP, and new password are required',
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

    const teamMember = await TeamMember.findOne({ email });

    if (!teamMember) {
      return res.status(404).json({
        status: 'error',
        message: 'Team member not found',
        timestamp: new Date().toISOString()
      });
    }

    // Check OTP validity
    if (!teamMember.resetPasswordOTP || teamMember.resetPasswordOTP !== otp) {
      teamMember.resetPasswordOTPAttempts += 1;
      await teamMember.save();

      return res.status(400).json({
        status: 'error',
        message: 'Invalid OTP',
        timestamp: new Date().toISOString()
      });
    }

    // Check OTP expiration
    if (teamMember.resetPasswordOTPExpires < new Date()) {
      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.',
        timestamp: new Date().toISOString()
      });
    }

    // Check attempts limit
    if (teamMember.resetPasswordOTPAttempts >= 5) {
      return res.status(429).json({
        status: 'error',
        message: 'Too many failed attempts. Please request a new OTP.',
        timestamp: new Date().toISOString()
      });
    }

    // Update password and clear OTP fields
    teamMember.password = newPassword;
    teamMember.resetPasswordOTP = null;
    teamMember.resetPasswordOTPExpires = null;
    teamMember.resetPasswordOTPAttempts = 0;
    await teamMember.save();

    res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to reset password',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;