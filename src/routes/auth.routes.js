const express = require('express');
const router = express.Router();
const SuperUser = require('../models/SuperUser');
const jwt = require('jsonwebtoken');
const emailService = require('../services/email.service');
const { generateOTP, generateOTPExpiration, isOTPExpired, hashOTP, verifyOTP } = require('../utils/otpGenerator');

// Register Super User
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if super user already exists
    const existingSuperUser = await SuperUser.findOne({ email });
    if (existingSuperUser) {
      return res.status(400).json({
        status: 'error',
        message: 'Super user already exists'
      });
    }

    // Create new super user
    const superUser = new SuperUser({
      name,
      email,
      password
    });

    await superUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: superUser._id,
        type: 'superUser',
        email: superUser.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      status: 'success',
      data: {
        superUser: {
          id: superUser._id,
          name: superUser.name,
          email: superUser.email
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Login Super User
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find super user and select password
    const superUser = await SuperUser.findOne({ email }).select('+password');
    if (!superUser) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await superUser.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: superUser._id,
        type: 'superUser',
        email: superUser.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      status: 'success',
      data: {
        superUser: {
          id: superUser._id,
          name: superUser.name,
          email: superUser.email
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await SuperUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this email address'
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpExpiration = generateOTPExpiration(10); // 10 minutes expiration
    const hashedOTP = hashOTP(otp);

    // Update user with OTP details
    user.resetPasswordOTP = hashedOTP;
    user.resetPasswordOTPExpires = otpExpiration;
    user.resetPasswordOTPAttempts = 0;
    
    await user.save();

    // Send OTP email
    try {
      await emailService.sendPasswordResetOTP(user, otp, 10);
      
      console.log('Password reset OTP sent successfully:', {
        userId: user._id,
        email: user.email,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset OTP has been sent to your email address',
        data: {
          email: user.email,
          expiresIn: '10 minutes'
        }
      });
    } catch (emailError) {
      console.error('Failed to send password reset OTP:', emailError);
      
      // Clear OTP data if email sending fails
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpires = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      res.status(500).json({
        status: 'error',
        message: 'Failed to send reset email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while processing your request'
    });
  }
});

// Reset Password - Verify OTP and Update Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate required fields
    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Email, OTP, and new password are required'
      });
    }

    // Validate new password length
    if (newPassword.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 8 characters long'
      });
    }

    // Find user by email
    const user = await SuperUser.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found with this email address'
      });
    }

    // Check if OTP exists and is not expired
    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'No password reset request found. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(user.resetPasswordOTPExpires)) {
      // Clear expired OTP
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpires = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempt limit (max 5 attempts)
    if (user.resetPasswordOTPAttempts >= 5) {
      // Clear OTP after too many attempts
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpires = null;
      user.resetPasswordOTPAttempts = 0;
      await user.save();

      return res.status(429).json({
        status: 'error',
        message: 'Too many invalid attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, user.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempt count
      user.resetPasswordOTPAttempts += 1;
      await user.save();

      return res.status(400).json({
        status: 'error',
        message: `Invalid OTP. ${5 - user.resetPasswordOTPAttempts} attempts remaining.`
      });
    }

    // OTP is valid, update password
    user.password = newPassword;
    user.resetPasswordOTP = null;
    user.resetPasswordOTPExpires = null;
    user.resetPasswordOTPAttempts = 0;
    user.lastUpdated = new Date();
    
    await user.save();

    console.log('Password reset successful:', {
      userId: user._id,
      email: user.email,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. You can now login with your new password.',
      data: {
        email: user.email,
        resetAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while resetting your password'
    });
  }
});

module.exports = router; 