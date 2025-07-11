import express from 'express';
import PropertyManager from '../models/PropertyManager.js';
import jwt from 'jsonwebtoken';
import emailService from '../services/email.service.js';
import { generateOTP, generateOTPExpiration, isOTPExpired, hashOTP, verifyOTP } from '../utils/otpGenerator.js';
import { authenticateSuperUser, authenticatePropertyManager } from '../middleware/auth.middleware.js';

const router = express.Router();

// Valid regions enum
const VALID_REGIONS = [
  'Sydney Metro',
  'Melbourne Metro', 
  'Brisbane Metro',
  'Perth Metro',
  'Adelaide Metro',
  'Darwin Metro',
  'Hobart Metro',
  'Canberra Metro',
  'Regional NSW',
  'Regional VIC',
  'Regional QLD',
  'Regional WA',
  'Regional SA',
  'Regional NT',
  'Regional TAS'
];

// Register Property Manager (Only Super Users can create Property Managers)
router.post('/register', authenticateSuperUser, async (req, res) => {
  try {
    const { 
      companyName, 
      abn, 
      contactPerson, 
      email, 
      phone, 
      region, 
      compliance, 
      password 
    } = req.body;

    // Validate required fields
    if (!companyName || !abn || !contactPerson || !email || !phone || !region || !compliance || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'All fields are required'
      });
    }

    // Validate region
    if (!VALID_REGIONS.includes(region)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please select a valid region'
      });
    }

    // Check if property manager already exists by email
    const existingPropertyManagerByEmail = await PropertyManager.findOne({ email: email.toLowerCase() });
    if (existingPropertyManagerByEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Property manager with this email already exists'
      });
    }

    // Check if property manager already exists by ABN
    const existingPropertyManagerByABN = await PropertyManager.findOne({ abn });
    if (existingPropertyManagerByABN) {
      return res.status(400).json({
        status: 'error',
        message: 'Property manager with this ABN already exists'
      });
    }

    // Create new property manager
    const propertyManager = new PropertyManager({
      companyName,
      abn,
      contactPerson,
      email: email.toLowerCase(),
      phone,
      region,
      compliance,
      password,
      status: 'Pending' // Default status, can be activated by admin
    });

    await propertyManager.save();

    console.log('Property manager created successfully:', {
      propertyManagerId: propertyManager._id,
      companyName: propertyManager.companyName,
      contactPerson: propertyManager.contactPerson,
      email: propertyManager.email,
      createdBy: req.superUser.email,
      welcomeEmailSent: 'Attempting to send welcome email via post-save middleware',
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      status: 'success',
      message: 'Property manager registered successfully. Account is pending approval.',
      data: {
        propertyManager: {
          id: propertyManager._id,
          companyName: propertyManager.companyName,
          contactPerson: propertyManager.contactPerson,
          email: propertyManager.email,
          phone: propertyManager.phone,
          region: propertyManager.region,
          compliance: propertyManager.compliance,
          status: propertyManager.status,
          abn: propertyManager.abn,
          outstandingAmount: propertyManager.outstandingAmount,
          totalProperties: propertyManager.totalProperties,
          joinedDate: propertyManager.joinedDate
        },
        createdBy: req.superUser.name
      }
    });
  } catch (error) {
    console.error('Property manager registration error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred during registration'
    });
  }
});

// Login Property Manager
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email, password, 'email and password');

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and password are required'
      });
    }

    // Find property manager and select password
    const propertyManager = await PropertyManager.findOne({ email: email.toLowerCase() }).select('+password');
    if (!propertyManager) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!propertyManager.isActive()) {
      return res.status(401).json({
        status: 'error',
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`
      });
    }

    // Check password
    const isPasswordValid = await propertyManager.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await propertyManager.updateLastLogin();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: propertyManager._id,
        type: 'propertyManager',
        email: propertyManager.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        propertyManager: {
          id: propertyManager._id,
          companyName: propertyManager.companyName,
          contactPerson: propertyManager.contactPerson,
          email: propertyManager.email,
          phone: propertyManager.phone,
          region: propertyManager.region,
          compliance: propertyManager.compliance,
          status: propertyManager.status,
          abn: propertyManager.abn,
          outstandingAmount: propertyManager.outstandingAmount,
          totalProperties: propertyManager.totalProperties,
          lastLogin: propertyManager.lastLogin,
          joinedDate: propertyManager.joinedDate
        },
        token
      }
    });
  } catch (error) {
    console.error('Property manager login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred during login'
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

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({ email: email.toLowerCase() });
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found with this email address'
      });
    }

    // Check if account is active
    if (!propertyManager.isActive()) {
      return res.status(400).json({
        status: 'error',
        message: `Account is ${propertyManager.status.toLowerCase()}. Please contact support.`
      });
    }

    // Generate OTP
    const otp = generateOTP(6);
    const otpExpiration = generateOTPExpiration(10); // 10 minutes expiration
    const hashedOTP = hashOTP(otp);

    // Update property manager with OTP details
    propertyManager.resetPasswordOTP = hashedOTP;
    propertyManager.resetPasswordOTPExpires = otpExpiration;
    propertyManager.resetPasswordOTPAttempts = 0;
    
    await propertyManager.save();

    // Send OTP email
    try {
      await emailService.sendPropertyManagerPasswordResetOTP(propertyManager, otp, 10);
      
      console.log('Property manager password reset OTP sent successfully:', {
        propertyManagerId: propertyManager._id,
        email: propertyManager.email,
        companyName: propertyManager.companyName,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        status: 'success',
        message: 'Password reset OTP has been sent to your email address',
        data: {
          email: propertyManager.email,
          expiresIn: '10 minutes'
        }
      });
    } catch (emailError) {
      console.error('Failed to send property manager password reset OTP:', emailError);
      
      // Clear OTP data if email sending fails
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      res.status(500).json({
        status: 'error',
        message: 'Failed to send reset email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Property manager forgot password error:', error);
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

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({ email: email.toLowerCase() });
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found with this email address'
      });
    }

    // Check if OTP exists and is not expired
    if (!propertyManager.resetPasswordOTP || !propertyManager.resetPasswordOTPExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'No password reset request found. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(propertyManager.resetPasswordOTPExpires)) {
      // Clear expired OTP
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempt limit (max 5 attempts)
    if (propertyManager.resetPasswordOTPAttempts >= 5) {
      // Clear OTP after too many attempts
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(429).json({
        status: 'error',
        message: 'Too many invalid attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, propertyManager.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempt count
      propertyManager.resetPasswordOTPAttempts += 1;
      await propertyManager.save();

      return res.status(400).json({
        status: 'error',
        message: `Invalid OTP. ${5 - propertyManager.resetPasswordOTPAttempts} attempts remaining.`
      });
    }

    // OTP is valid, update password
    propertyManager.password = newPassword;
    propertyManager.resetPasswordOTP = null;
    propertyManager.resetPasswordOTPExpires = null;
    propertyManager.resetPasswordOTPAttempts = 0;
    propertyManager.lastUpdated = new Date();
    
    await propertyManager.save();

    console.log('Property manager password reset successful:', {
      propertyManagerId: propertyManager._id,
      email: propertyManager.email,
      companyName: propertyManager.companyName,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully. You can now login with your new password.',
      data: {
        email: propertyManager.email,
        resetAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Property manager reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while resetting your password'
    });
  }
});

// Verify OTP Only (without password reset) - Property Manager
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate required fields
    if (!email || !otp) {
      return res.status(400).json({
        status: 'error',
        message: 'Email and OTP are required'
      });
    }

    // Find property manager by email
    const propertyManager = await PropertyManager.findOne({ email: email.toLowerCase() });
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found with this email address'
      });
    }

    // Check if OTP exists and is not expired
    if (!propertyManager.resetPasswordOTP || !propertyManager.resetPasswordOTPExpires) {
      return res.status(400).json({
        status: 'error',
        message: 'No password reset request found. Please request a new OTP.'
      });
    }

    // Check if OTP is expired
    if (isOTPExpired(propertyManager.resetPasswordOTPExpires)) {
      // Clear expired OTP
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(400).json({
        status: 'error',
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Check attempt limit (max 5 attempts)
    if (propertyManager.resetPasswordOTPAttempts >= 5) {
      // Clear OTP after too many attempts
      propertyManager.resetPasswordOTP = null;
      propertyManager.resetPasswordOTPExpires = null;
      propertyManager.resetPasswordOTPAttempts = 0;
      await propertyManager.save();

      return res.status(429).json({
        status: 'error',
        message: 'Too many invalid attempts. Please request a new OTP.'
      });
    }

    // Verify OTP
    const isOTPValid = verifyOTP(otp, propertyManager.resetPasswordOTP);
    if (!isOTPValid) {
      // Increment attempt count
      propertyManager.resetPasswordOTPAttempts += 1;
      await propertyManager.save();

      return res.status(400).json({
        status: 'error',
        message: `Invalid OTP. ${5 - propertyManager.resetPasswordOTPAttempts} attempts remaining.`
      });
    }

    // OTP is valid - don't clear it yet, just confirm it's valid
    console.log('Property manager OTP verified successfully:', {
      propertyManagerId: propertyManager._id,
      email: propertyManager.email,
      companyName: propertyManager.companyName,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      status: 'success',
      message: 'OTP verified successfully. You can now set your new password.',
      data: {
        email: propertyManager.email,
        verifiedAt: new Date().toISOString(),
        attemptsRemaining: 5 - propertyManager.resetPasswordOTPAttempts
      }
    });
  } catch (error) {
    console.error('Property manager verify OTP error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while verifying OTP'
    });
  }
});

// Get Property Manager Profile
router.get('/profile', authenticatePropertyManager, async (req, res) => {
  try {
    // Property manager info is already available in req.propertyManager from middleware
    const propertyManager = await PropertyManager.findById(req.propertyManager.id);
    
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        propertyManager: {
          id: propertyManager._id,
          companyName: propertyManager.companyName,
          contactPerson: propertyManager.contactPerson,
          email: propertyManager.email,
          phone: propertyManager.phone,
          region: propertyManager.region,
          compliance: propertyManager.compliance,
          status: propertyManager.status,
          abn: propertyManager.abn,
          outstandingAmount: propertyManager.outstandingAmount,
          totalProperties: propertyManager.totalProperties,
          lastLogin: propertyManager.lastLogin,
          joinedDate: propertyManager.joinedDate
        }
      }
    });
  } catch (error) {
    console.error('Get property manager profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching profile'
    });
  }
});

// Update Property Manager (Only Super Users)
router.patch('/:id', authenticateSuperUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      companyName, 
      abn, 
      contactPerson, 
      email, 
      phone, 
      region, 
      compliance, 
      status,
      outstandingAmount
    } = req.body;

    // Find property manager
    const propertyManager = await PropertyManager.findById(id);
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found'
      });
    }

    // Store original values for logging
    const originalValues = {
      companyName: propertyManager.companyName,
      abn: propertyManager.abn,
      contactPerson: propertyManager.contactPerson,
      email: propertyManager.email,
      phone: propertyManager.phone,
      region: propertyManager.region,
      compliance: propertyManager.compliance,
      status: propertyManager.status,
      outstandingAmount: propertyManager.outstandingAmount
    };

    // Validate and update fields if provided
    if (companyName !== undefined) {
      if (!companyName || companyName.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Company name must be at least 2 characters long'
        });
      }
      propertyManager.companyName = companyName.trim();
    }

    if (abn !== undefined) {
      if (!abn || !/^\d{11}$/.test(abn)) {
        return res.status(400).json({
          status: 'error',
          message: 'ABN must be 11 digits'
        });
      }
      // Check if ABN is already used by another property manager
      const existingABN = await PropertyManager.findOne({ abn, _id: { $ne: id } });
      if (existingABN) {
        return res.status(400).json({
          status: 'error',
          message: 'ABN is already used by another property manager'
        });
      }
      propertyManager.abn = abn;
    }

    if (contactPerson !== undefined) {
      if (!contactPerson || contactPerson.trim().length < 2) {
        return res.status(400).json({
          status: 'error',
          message: 'Contact person name must be at least 2 characters long'
        });
      }
      propertyManager.contactPerson = contactPerson.trim();
    }

    if (email !== undefined) {
      if (!email || !/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid email address'
        });
      }
      // Check if email is already used by another property manager
      const existingEmail = await PropertyManager.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
      if (existingEmail) {
        return res.status(400).json({
          status: 'error',
          message: 'Email is already used by another property manager'
        });
      }
      propertyManager.email = email.toLowerCase();
    }

    if (phone !== undefined) {
      if (!phone || !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please enter a valid phone number'
        });
      }
      propertyManager.phone = phone.trim();
    }

    if (region !== undefined) {
      if (!VALID_REGIONS.includes(region)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select a valid region'
        });
      }
      propertyManager.region = region;
    }

    if (compliance !== undefined) {
      const validCompliance = ['Basic Package', 'Standard Package', 'Premium Package', 'Full Package'];
      if (!validCompliance.includes(compliance)) {
        return res.status(400).json({
          status: 'error',
          message: 'Please select a valid compliance package'
        });
      }
      propertyManager.compliance = compliance;
    }

    if (status !== undefined) {
      const validStatuses = ['Active', 'Inactive', 'Suspended', 'Pending'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid status. Must be one of: Active, Inactive, Suspended, Pending'
        });
      }
      propertyManager.status = status;
    }

    if (outstandingAmount !== undefined) {
      if (typeof outstandingAmount !== 'number' || outstandingAmount < 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Outstanding amount must be a non-negative number'
        });
      }
      propertyManager.outstandingAmount = outstandingAmount;
    }

    // Update lastUpdated timestamp
    propertyManager.lastUpdated = new Date();

    // Save updated property manager
    await propertyManager.save();

    // Log the update
    console.log('Property manager updated:', {
      propertyManagerId: propertyManager._id,
      companyName: propertyManager.companyName,
      updatedBy: req.superUser.email,
      changes: {
        companyName: originalValues.companyName !== propertyManager.companyName ? { from: originalValues.companyName, to: propertyManager.companyName } : null,
        abn: originalValues.abn !== propertyManager.abn ? { from: originalValues.abn, to: propertyManager.abn } : null,
        contactPerson: originalValues.contactPerson !== propertyManager.contactPerson ? { from: originalValues.contactPerson, to: propertyManager.contactPerson } : null,
        email: originalValues.email !== propertyManager.email ? { from: originalValues.email, to: propertyManager.email } : null,
        phone: originalValues.phone !== propertyManager.phone ? { from: originalValues.phone, to: propertyManager.phone } : null,
        region: originalValues.region !== propertyManager.region ? { from: originalValues.region, to: propertyManager.region } : null,
        compliance: originalValues.compliance !== propertyManager.compliance ? { from: originalValues.compliance, to: propertyManager.compliance } : null,
        status: originalValues.status !== propertyManager.status ? { from: originalValues.status, to: propertyManager.status } : null,
        outstandingAmount: originalValues.outstandingAmount !== propertyManager.outstandingAmount ? { from: originalValues.outstandingAmount, to: propertyManager.outstandingAmount } : null
      },
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      status: 'success',
      message: 'Property manager updated successfully',
      data: {
        propertyManager: {
          id: propertyManager._id,
          companyName: propertyManager.companyName,
          contactPerson: propertyManager.contactPerson,
          email: propertyManager.email,
          phone: propertyManager.phone,
          region: propertyManager.region,
          compliance: propertyManager.compliance,
          status: propertyManager.status,
          abn: propertyManager.abn,
          outstandingAmount: propertyManager.outstandingAmount,
          totalProperties: propertyManager.totalProperties,
          lastLogin: propertyManager.lastLogin,
          joinedDate: propertyManager.joinedDate,
          lastUpdated: propertyManager.lastUpdated
        },
        updatedBy: req.superUser.name
      }
    });
  } catch (error) {
    console.error('Update property manager error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message || 'An error occurred while updating property manager'
    });
  }
});

// Get All Property Managers (Only Super Users)
router.get('/all', authenticateSuperUser, async (req, res) => {
  try {
    const { status, region, page = 1, limit = 10 } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (region) filter.region = region;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get property managers with pagination
    const propertyManagers = await PropertyManager.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await PropertyManager.countDocuments(filter);

    res.status(200).json({
      status: 'success',
      data: {
        propertyManagers: propertyManagers.map(pm => ({
          id: pm._id,
          companyName: pm.companyName,
          contactPerson: pm.contactPerson,
          email: pm.email,
          phone: pm.phone,
          region: pm.region,
          compliance: pm.compliance,
          status: pm.status,
          abn: pm.abn,
          outstandingAmount: pm.outstandingAmount,
          totalProperties: pm.totalProperties,
          lastLogin: pm.lastLogin,
          joinedDate: pm.joinedDate,
          createdAt: pm.createdAt
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
    console.error('Get all property managers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching property managers'
    });
  }
});

// Get Single Property Manager Details (Only Super Users)
router.get('/:id', authenticateSuperUser, async (req, res) => {
  try {
    const { id } = req.params;

    const propertyManager = await PropertyManager.findById(id);
    if (!propertyManager) {
      return res.status(404).json({
        status: 'error',
        message: 'Property manager not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        propertyManager: {
          id: propertyManager._id,
          companyName: propertyManager.companyName,
          contactPerson: propertyManager.contactPerson,
          email: propertyManager.email,
          phone: propertyManager.phone,
          region: propertyManager.region,
          compliance: propertyManager.compliance,
          status: propertyManager.status,
          abn: propertyManager.abn,
          outstandingAmount: propertyManager.outstandingAmount,
          totalProperties: propertyManager.totalProperties,
          lastLogin: propertyManager.lastLogin,
          joinedDate: propertyManager.joinedDate,
          createdAt: propertyManager.createdAt,
          lastUpdated: propertyManager.lastUpdated
        }
      }
    });
  } catch (error) {
    console.error('Get property manager details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'An error occurred while fetching property manager details'
    });
  }
});

export default router; 