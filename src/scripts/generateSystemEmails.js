/**
 * Migration Script: Generate System Emails for Existing Users
 * Creates @rentalease.com.au email addresses for all users
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import emailGenerator from '../utils/emailGenerator.js';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 MongoDB connected for email migration');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const generateSystemEmailsForUsers = async () => {
  try {
    console.log('🚀 Starting system email generation using built-in migration...');
    
    // Use the built-in migration method from EmailGenerator
    const results = await emailGenerator.migrateExistingUsers();
    
    console.log('\n🎉 Migration complete!');
    return results;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await generateSystemEmailsForUsers();
  await mongoose.disconnect();
  console.log('📦 Database disconnected');
  process.exit(0);
};

main();