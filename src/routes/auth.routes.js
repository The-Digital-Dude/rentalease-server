const express = require('express');
const router = express.Router();
const SuperUser = require('../models/SuperUser');
const jwt = require('jsonwebtoken');

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
      { id: superUser._id },
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
      { id: superUser._id },
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

module.exports = router; 