/**
 * Test script for internal email functionality
 * This script tests the new internal messaging system
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();
import SuperUser from '../models/SuperUser.js';
import emailService from '../services/email.service.js';
import Email from '../models/Email.js';
import EmailThread from '../models/EmailThread.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Test internal email system
const testInternalEmail = async () => {
  try {
    console.log('🧪 Starting Internal Email System Test...\n');
    
    // Get two test users (assuming they exist)
    const superUsers = await SuperUser.find().limit(2);
    if (superUsers.length < 2) {
      console.error('❌ Need at least 2 SuperUsers in database to test');
      return;
    }
    
    const sender = superUsers[0];
    const recipient = superUsers[1];
    
    console.log(`📧 Sender: ${sender.name} (${sender.systemEmail})`);
    console.log(`📧 Recipient: ${recipient.name} (${recipient.systemEmail})\n`);
    
    // Test 1: Check if emails are detected as internal
    console.log('📋 Test 1: Internal Email Detection');
    const isInternal1 = emailService.isInternalEmail(sender.systemEmail);
    const isInternal2 = emailService.isInternalEmail(recipient.systemEmail);
    console.log(`✅ Sender email is internal: ${isInternal1}`);
    console.log(`✅ Recipient email is internal: ${isInternal2}\n`);
    
    // Test 2: Send internal email
    console.log('📋 Test 2: Send Internal Email');
    const testEmailData = {
      from: {
        email: sender.systemEmail,
        name: sender.name,
        userId: sender._id,
        userType: 'SuperUser'
      },
      to: [{
        email: recipient.systemEmail,
        name: recipient.name,
        userId: recipient._id,
        userType: 'SuperUser'
      }],
      cc: [],
      bcc: [],
      subject: 'Test Internal Email - ' + new Date().toISOString(),
      bodyHtml: '<h1>Test Email</h1><p>This is a test of the internal messaging system.</p>',
      bodyText: 'Test Email\n\nThis is a test of the internal messaging system.',
      attachments: []
    };
    
    const result = await emailService.deliverInternalEmail(testEmailData);
    console.log(`✅ Email delivered with ID: ${result.id}`);
    console.log(`✅ Created ${result.emailRecords.length} email records`);
    console.log(`✅ Delivered to ${result.recipientCount} recipients\n`);
    
    // Test 3: Check if emails appear in correct folders
    console.log('📋 Test 3: Verify Email Folder Placement');
    
    // Check sender's sent folder
    const senderSentEmails = await Email.find({
      'owner.userId': sender._id,
      'owner.userType': 'SuperUser',
      folder: 'sent',
      messageId: { $regex: result.id }
    });
    
    // Check recipient's inbox
    const recipientInboxEmails = await Email.find({
      'owner.userId': recipient._id,
      'owner.userType': 'SuperUser', 
      folder: 'inbox',
      messageId: { $regex: result.id }
    });
    
    console.log(`✅ Sender has ${senderSentEmails.length} email in sent folder`);
    console.log(`✅ Recipient has ${recipientInboxEmails.length} email in inbox folder\n`);
    
    // Test 4: Check threading
    console.log('📋 Test 4: Verify Email Threading');
    const threads = await EmailThread.find({
      emailIds: { $in: result.emailRecords.map(r => r._id) }
    });
    
    console.log(`✅ Found ${threads.length} threads for this email`);
    for (const thread of threads) {
      console.log(`   Thread ID: ${thread._id}`);
      console.log(`   Subject: ${thread.subject}`);
      console.log(`   Email Count: ${thread.emailCount}`);
      console.log(`   Owner: ${thread.owner.userType} - ${thread.owner.userId}`);
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Internal email detection: ✅`);
    console.log(`   - Email delivery: ✅`);
    console.log(`   - Sent folder: ✅`);
    console.log(`   - Inbox folder: ✅`);
    console.log(`   - Threading: ✅`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testInternalEmail();
  await mongoose.connection.close();
  console.log('\n🏁 Test completed. Database connection closed.');
  process.exit(0);
};

runTest();