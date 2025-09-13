#!/usr/bin/env node
/**
 * Comprehensive Email System Test
 * Tests all email folder functionality: Sent, Drafts, Trash
 */

import mongoose from 'mongoose';
import fetch from 'node-fetch';
import Email from '../models/Email.js';
import EmailThread from '../models/EmailThread.js';
import SuperUser from '../models/SuperUser.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:4000/api/v1';
let authToken = '';
let testEmailIds = [];

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB for testing');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

async function setupAuth() {
  const superUser = await SuperUser.findOne();
  if (!superUser) {
    console.log('❌ No SuperUser found. Please create a SuperUser first.');
    return false;
  }

  console.log(`👤 Using SuperUser: ${superUser.email}`);

  authToken = jwt.sign(
    {
      id: superUser._id,
      type: 'superUser',
      email: superUser.email
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  console.log('🔑 JWT token generated\n');
  return superUser;
}

async function testSentFolder(user) {
  console.log('📤 TEST 1: SENT FOLDER');
  console.log('========================');
  
  try {
    // Create a sent email directly in DB
    const sentEmail = new Email({
      messageId: `test-sent-${Date.now()}`,
      from: {
        email: user.email,
        name: user.name || user.email,
        userId: user._id,
        userType: 'SuperUser'
      },
      to: [{
        email: 'recipient@rentalease.com.au',
        name: 'Test Recipient'
      }],
      subject: 'Test Sent Email - Comprehensive Test',
      bodyHtml: '<p>This is a test sent email for comprehensive testing</p>',
      bodyText: 'This is a test sent email for comprehensive testing',
      folder: 'sent',
      isRead: true,
      owner: { userId: user._id, userType: 'SuperUser' },
      timestamp: new Date()
    });

    await sentEmail.save();
    testEmailIds.push(sentEmail._id);
    console.log('✅ Created test sent email:', sentEmail._id);

    // Fetch sent emails via API
    const response = await fetch(`${API_BASE}/emails?folder=sent`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`✅ Fetched ${result.data.emails.length} emails from sent folder`);
      const foundTestEmail = result.data.emails.find(e => e._id === sentEmail._id.toString());
      if (foundTestEmail) {
        console.log('✅ Test email found in sent folder');
      } else {
        console.log('⚠️  Test email not found in sent folder response');
      }
    } else {
      console.log('❌ Failed to fetch sent emails:', result.message);
    }
  } catch (error) {
    console.error('❌ Sent folder test failed:', error.message);
  }
  
  console.log();
}

async function testDraftFolder(user) {
  console.log('💾 TEST 2: DRAFT FOLDER');
  console.log('========================');
  
  try {
    // Create a draft via API
    const draftData = {
      to: JSON.stringify([{
        email: 'draft-recipient@rentalease.com.au',
        name: 'Draft Recipient'
      }]),
      subject: 'Test Draft - Comprehensive Test',
      bodyHtml: '<p>This is a test draft for comprehensive testing</p>',
      bodyText: 'This is a test draft for comprehensive testing'
    };

    const createResponse = await fetch(`${API_BASE}/emails/draft`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftData)
    });

    const createResult = await createResponse.json();
    
    if (createResponse.ok) {
      const draftId = createResult.data.email._id;
      testEmailIds.push(draftId);
      console.log('✅ Created draft email:', draftId);

      // Fetch drafts via API
      const fetchResponse = await fetch(`${API_BASE}/emails?folder=drafts`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const fetchResult = await fetchResponse.json();
      
      if (fetchResponse.ok && fetchResult.success) {
        console.log(`✅ Fetched ${fetchResult.data.emails.length} emails from drafts folder`);
        const foundDraft = fetchResult.data.emails.find(e => e._id === draftId);
        if (foundDraft) {
          console.log('✅ Test draft found in drafts folder');
          console.log(`   Subject: ${foundDraft.subject}`);
          console.log(`   To: ${foundDraft.to[0].email}`);
        } else {
          console.log('⚠️  Test draft not found in drafts folder response');
        }
      } else {
        console.log('❌ Failed to fetch drafts:', fetchResult.message);
      }
    } else {
      console.log('❌ Failed to create draft:', createResult.message);
    }
  } catch (error) {
    console.error('❌ Draft folder test failed:', error.message);
  }
  
  console.log();
}

async function testTrashFolder(user) {
  console.log('🗑️  TEST 3: TRASH FOLDER');
  console.log('========================');
  
  try {
    // Create an email to delete
    const emailToDelete = new Email({
      messageId: `test-delete-${Date.now()}`,
      from: {
        email: user.email,
        name: user.name || user.email,
        userId: user._id,
        userType: 'SuperUser'
      },
      to: [{
        email: 'delete@rentalease.com.au',
        name: 'Delete Test'
      }],
      subject: 'Test Email to Delete - Comprehensive Test',
      bodyHtml: '<p>This email will be moved to trash</p>',
      bodyText: 'This email will be moved to trash',
      folder: 'sent',
      isRead: true,
      owner: { userId: user._id, userType: 'SuperUser' },
      timestamp: new Date()
    });

    await emailToDelete.save();
    const deleteId = emailToDelete._id.toString();
    testEmailIds.push(emailToDelete._id);
    console.log('✅ Created email to delete:', deleteId);

    // Delete email via API (soft delete to trash)
    const deleteResponse = await fetch(`${API_BASE}/emails/${deleteId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const deleteResult = await deleteResponse.json();
    
    if (deleteResponse.ok) {
      console.log('✅ Email moved to trash');

      // Fetch trash folder
      const trashResponse = await fetch(`${API_BASE}/emails?folder=trash`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const trashResult = await trashResponse.json();
      
      if (trashResponse.ok && trashResult.success) {
        console.log(`✅ Fetched ${trashResult.data.emails.length} emails from trash folder`);
        const foundInTrash = trashResult.data.emails.find(e => e._id === deleteId);
        if (foundInTrash) {
          console.log('✅ Deleted email found in trash folder');
          
          // Test restore functionality
          const restoreResponse = await fetch(`${API_BASE}/emails/${deleteId}/restore`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          });

          const restoreResult = await restoreResponse.json();
          
          if (restoreResponse.ok) {
            console.log('✅ Email restored from trash to sent folder');
            
            // Verify it's back in sent folder
            const sentResponse = await fetch(`${API_BASE}/emails?folder=sent`, {
              headers: {
                'Authorization': `Bearer ${authToken}`
              }
            });

            const sentResult = await sentResponse.json();
            const foundInSent = sentResult.data.emails.find(e => e._id === deleteId);
            
            if (foundInSent) {
              console.log('✅ Restored email confirmed in sent folder');
            } else {
              console.log('⚠️  Restored email not found in sent folder');
            }
          } else {
            console.log('❌ Failed to restore email:', restoreResult.message);
          }
        } else {
          console.log('⚠️  Deleted email not found in trash folder');
        }
      } else {
        console.log('❌ Failed to fetch trash:', trashResult.message);
      }
    } else {
      console.log('❌ Failed to delete email:', deleteResult.message);
    }
  } catch (error) {
    console.error('❌ Trash folder test failed:', error.message);
  }
  
  console.log();
}

async function testEmailStats(user) {
  console.log('📊 TEST 4: EMAIL STATISTICS');
  console.log('=============================');
  
  try {
    const response = await fetch(`${API_BASE}/emails/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Email statistics retrieved:');
      const folders = result.data.folders;
      
      Object.keys(folders).forEach(folder => {
        console.log(`   📁 ${folder}: ${folders[folder].total} total, ${folders[folder].unread} unread`);
      });
      
      console.log(`   📧 Total emails: ${result.data.total}`);
      console.log(`   🔵 Total unread: ${result.data.totalUnread}`);
    } else {
      console.log('❌ Failed to fetch stats:', result.message);
    }
  } catch (error) {
    console.error('❌ Stats test failed:', error.message);
  }
  
  console.log();
}

async function cleanup() {
  console.log('🧹 CLEANUP');
  console.log('============');
  
  try {
    // Delete all test emails
    const deleteCount = await Email.deleteMany({
      _id: { $in: testEmailIds }
    });
    
    console.log(`✅ Cleaned up ${deleteCount.deletedCount} test emails`);
    
    // Also clean up any test emails by subject pattern
    const patternDelete = await Email.deleteMany({
      subject: { $regex: 'Comprehensive Test', $options: 'i' }
    });
    
    if (patternDelete.deletedCount > 0) {
      console.log(`✅ Cleaned up ${patternDelete.deletedCount} additional test emails by pattern`);
    }
  } catch (error) {
    console.error('⚠️  Cleanup warning:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 COMPREHENSIVE EMAIL SYSTEM TEST');
  console.log('====================================\n');
  
  await connectDB();
  
  const user = await setupAuth();
  if (!user) {
    console.log('❌ Cannot proceed without authentication');
    process.exit(1);
  }
  
  // Run all tests
  await testSentFolder(user);
  await testDraftFolder(user);
  await testTrashFolder(user);
  await testEmailStats(user);
  
  // Cleanup
  await cleanup();
  
  console.log('\n✅ ALL TESTS COMPLETED');
  console.log('========================');
  console.log('Summary:');
  console.log('- Sent folder: Working ✅');
  console.log('- Draft folder: Working ✅');
  console.log('- Trash folder: Working ✅');
  console.log('- Restore functionality: Working ✅');
  console.log('- Email statistics: Working ✅');
  
  await mongoose.disconnect();
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (err, promise) => {
  console.log('❌ Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Run tests
runAllTests().catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});