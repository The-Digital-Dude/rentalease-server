import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Agency from '../models/Agency.js';
import Property from '../models/Property.js';

// Load environment variables
dotenv.config();

// MongoDB connection
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to:', mongoUri ? 'MongoDB Atlas' : 'localhost');
    
    await mongoose.connect(mongoUri || 'mongodb://localhost:27017/rentalease-crm');
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix agency property counts
const fixAgencyPropertyCounts = async () => {
  try {
    console.log('🔧 Starting to fix agency property counts...');
    
    // Get all agencies
    const agencies = await Agency.find({});
    console.log(`Found ${agencies.length} agencies`);
    
    for (const agency of agencies) {
      // Count active properties for this agency
      const activePropertiesCount = await Property.countDocuments({
        agency: agency._id,
        isActive: true
      });
      
      // Update the agency's totalProperties
      await Agency.findByIdAndUpdate(agency._id, {
        totalProperties: activePropertiesCount
      });
      
      console.log(`✅ Updated agency ${agency.companyName} (${agency._id}): ${activePropertiesCount} properties`);
    }
    
    console.log('🎉 Successfully updated all agency property counts!');
  } catch (error) {
    console.error('❌ Error fixing agency property counts:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await fixAgencyPropertyCounts();
  
  // Close connection
  await mongoose.connection.close();
  console.log('Database connection closed');
  process.exit(0);
};

// Run the script
main().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});
