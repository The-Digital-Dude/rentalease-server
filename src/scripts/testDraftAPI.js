#!/usr/bin/env node
/**
 * Test Draft API Endpoint
 * Tests the POST /api/v1/emails/draft endpoint
 */

import fetch from 'node-fetch';
import mongoose from 'mongoose';
import SuperUser from '../models/SuperUser.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB for testing');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function testDraftAPI() {
  console.log('🧪 Testing Draft API Endpoint');
  console.log('==============================\n');

  try {
    // Find a SuperUser for testing
    const superUser = await SuperUser.findOne();
    if (!superUser) {
      console.log('❌ No SuperUser found. Please create a SuperUser first.');
      return;
    }

    console.log(`👤 Using SuperUser: ${superUser.email}`);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: superUser._id,
        type: 'superUser',
        email: superUser.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('🔑 JWT token generated');

    // Test draft API
    console.log('\n📝 Testing POST /api/v1/emails/draft...');

    const draftData = {
      to: JSON.stringify([{
        email: 'test@rentalease.com.au',
        name: 'Test Recipient'
      }]),
      subject: 'Test Draft from API',
      bodyHtml: '<p>This is a test draft email created via API</p>',
      bodyText: 'This is a test draft email created via API'
    };

    const response = await fetch('http://localhost:4000/api/v1/emails/draft', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Draft API test successful!');
      console.log('📧 Draft Email Details:');
      console.log(`   ID: ${result.data.email._id}`);
      console.log(`   Subject: ${result.data.email.subject}`);
      console.log(`   Folder: ${result.data.email.folder}`);
      console.log(`   To: ${result.data.email.to[0].email}`);
      console.log(`   Message: ${result.message}`);
    } else {
      console.log('❌ Draft API test failed:');
      console.log(`   Status: ${response.status}`);
      console.log(`   Error: ${result.message}`);
      console.log(`   Full response:`, result);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  await connectDB();
  await testDraftAPI();
  
  console.log('\n👋 Test completed, closing database connection...');
  await mongoose.disconnect();
  process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

main().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});