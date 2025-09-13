#!/usr/bin/env node
/**
 * Verify Email Data in Database
 * Check what emails are actually stored for each folder
 */

import mongoose from 'mongoose';
import Email from '../models/Email.js';
import SuperUser from '../models/SuperUser.js';
import dotenv from 'dotenv';

dotenv.config();

async function verifyEmailData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📡 Connected to MongoDB\n');

    // Find a SuperUser
    const superUser = await SuperUser.findOne();
    if (!superUser) {
      console.log('❌ No SuperUser found');
      return;
    }

    console.log(`👤 Checking emails for SuperUser: ${superUser.email}`);
    console.log(`   ID: ${superUser._id}`);
    console.log(`   Type: SuperUser\n`);

    // Count emails by folder for this user
    const folders = ['sent', 'drafts', 'trash', 'inbox'];
    
    for (const folder of folders) {
      const count = await Email.countDocuments({
        'owner.userId': superUser._id,
        'owner.userType': 'SuperUser',
        folder: folder,
        deletedAt: { $exists: false }
      });
      
      console.log(`📁 ${folder.toUpperCase()} folder: ${count} emails`);
      
      // Show first 3 emails in each folder
      if (count > 0) {
        const emails = await Email.find({
          'owner.userId': superUser._id,
          'owner.userType': 'SuperUser',
          folder: folder,
          deletedAt: { $exists: false }
        })
        .limit(3)
        .sort({ timestamp: -1 });
        
        emails.forEach(email => {
          console.log(`   - ${email.subject} (${email._id})`);
          console.log(`     To: ${email.to[0]?.email || 'N/A'}`);
          console.log(`     Created: ${email.timestamp}`);
        });
      }
    }
    
    // Count total emails for user
    const totalCount = await Email.countDocuments({
      'owner.userId': superUser._id,
      'owner.userType': 'SuperUser'
    });
    
    console.log(`\n📊 Total emails for user: ${totalCount}`);
    
    // Check for any orphaned emails (no owner)
    const orphanedCount = await Email.countDocuments({
      'owner.userId': { $exists: false }
    });
    
    if (orphanedCount > 0) {
      console.log(`⚠️  Found ${orphanedCount} orphaned emails without owner`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Verification complete');
  }
}

verifyEmailData();