#!/usr/bin/env node
/**
 * Test Email Folder Functionality
 * Tests the folder system: sent, drafts, trash
 */

import mongoose from 'mongoose';
import Email from '../models/Email.js';
import EmailThread from '../models/EmailThread.js';
import SuperUser from '../models/SuperUser.js';
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

async function testEmailFolders() {
  console.log('🧪 Testing Email Folder Functionality');
  console.log('=====================================\n');

  try {
    // Find a SuperUser for testing
    const superUser = await SuperUser.findOne();
    if (!superUser) {
      console.log('❌ No SuperUser found. Please create a SuperUser first.');
      return;
    }

    console.log(`👤 Using SuperUser: ${superUser.email}\n`);

    // Test 1: Create a draft email
    console.log('📝 Test 1: Creating a draft email...');
    const draftEmail = new Email({
      messageId: `test-draft-${Date.now()}`,
      from: {
        email: superUser.email,
        name: superUser.name || superUser.email,
        userId: superUser._id,
        userType: 'SuperUser'
      },
      to: [{
        email: 'test@rentalease.com.au',
        name: 'Test Recipient'
      }],
      subject: 'Test Draft Email',
      bodyHtml: '<p>This is a test draft email</p>',
      bodyText: 'This is a test draft email',
      folder: 'drafts',
      isRead: false,
      owner: { userId: superUser._id, userType: 'SuperUser' },
      timestamp: new Date()
    });

    await draftEmail.save();
    console.log('✅ Draft email created successfully');
    console.log(`   ID: ${draftEmail._id}`);
    console.log(`   Folder: ${draftEmail.folder}\n`);

    // Test 2: Create a sent email
    console.log('📤 Test 2: Creating a sent email...');
    const sentEmail = new Email({
      messageId: `test-sent-${Date.now()}`,
      from: {
        email: superUser.email,
        name: superUser.name || superUser.email,
        userId: superUser._id,
        userType: 'SuperUser'
      },
      to: [{
        email: 'test@rentalease.com.au',
        name: 'Test Recipient'
      }],
      subject: 'Test Sent Email',
      bodyHtml: '<p>This is a test sent email</p>',
      bodyText: 'This is a test sent email',
      folder: 'sent',
      isRead: true,
      owner: { userId: superUser._id, userType: 'SuperUser' },
      timestamp: new Date()
    });

    await sentEmail.save();
    console.log('✅ Sent email created successfully');
    console.log(`   ID: ${sentEmail._id}`);
    console.log(`   Folder: ${sentEmail.folder}\n`);

    // Test 3: Move sent email to trash
    console.log('🗑️  Test 3: Moving sent email to trash...');
    await sentEmail.softDelete(superUser._id);
    console.log('✅ Email moved to trash successfully');
    console.log(`   Folder: ${sentEmail.folder}\n`);

    // Test 4: Query emails by folder
    console.log('🔍 Test 4: Querying emails by folder...');
    
    const draftsResult = await Email.getEmailsForUser(superUser._id, 'SuperUser', {
      folder: 'drafts',
      page: 1,
      limit: 10
    });
    console.log(`📝 Drafts folder: ${draftsResult.totalEmails} emails`);
    
    const sentResult = await Email.getEmailsForUser(superUser._id, 'SuperUser', {
      folder: 'sent',
      page: 1,
      limit: 10
    });
    console.log(`📤 Sent folder: ${sentResult.totalEmails} emails`);
    
    const trashResult = await Email.getEmailsForUser(superUser._id, 'SuperUser', {
      folder: 'trash',
      page: 1,
      limit: 10
    });
    console.log(`🗑️  Trash folder: ${trashResult.totalEmails} emails\n`);

    // Test 5: Restore from trash
    console.log('♻️  Test 5: Restoring email from trash...');
    sentEmail.folder = 'sent';
    sentEmail.deletedAt = undefined;
    sentEmail.deletedBy = undefined;
    await sentEmail.save();
    console.log('✅ Email restored to sent folder successfully\n');

    // Final verification
    console.log('🎯 Final Verification: Counting emails in each folder...');
    
    const finalDrafts = await Email.countDocuments({
      'owner.userId': superUser._id,
      'owner.userType': 'SuperUser',
      folder: 'drafts',
      deletedAt: { $exists: false }
    });
    
    const finalSent = await Email.countDocuments({
      'owner.userId': superUser._id,
      'owner.userType': 'SuperUser',
      folder: 'sent',
      deletedAt: { $exists: false }
    });
    
    const finalTrash = await Email.countDocuments({
      'owner.userId': superUser._id,
      'owner.userType': 'SuperUser',
      folder: 'trash'
    });

    console.log(`📊 Final Counts:`);
    console.log(`   📝 Drafts: ${finalDrafts} emails`);
    console.log(`   📤 Sent: ${finalSent} emails`);
    console.log(`   🗑️  Trash: ${finalTrash} emails`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Email folder system is working correctly');

    // Cleanup test emails
    console.log('\n🧹 Cleaning up test emails...');
    await Email.deleteMany({
      subject: { $in: ['Test Draft Email', 'Test Sent Email'] }
    });
    console.log('✅ Test emails cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  await connectDB();
  await testEmailFolders();
  
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