import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import InspectionTemplate from '../models/InspectionTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../.env') });

const cleanupTemplates = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get all templates before cleanup
    const allTemplates = await InspectionTemplate.find({});
    console.log('\n📋 Current templates in database:');
    allTemplates.forEach(t => {
      console.log(`  - ${t.jobType} v${t.version}: "${t.title}" (isActive: ${t.isActive})`);
    });

    // Templates to KEEP (set isActive: true)
    const templatesToKeep = [
      { jobType: 'Smoke', version: 3, title: 'Smoke Alarm Safety Inspection (Smoke Only)' },
      { jobType: 'Gas', version: 2, title: 'Gas Safety Inspection' },
      { jobType: 'Electrical', version: 5, title: 'Electrical & Smoke Safety Inspection' },
      { jobType: 'MinimumSafetyStandard', version: 2, title: 'Minimum Safety Standard Inspection' },
    ];

    console.log('\n🎯 Templates to KEEP (will be set to active):');
    templatesToKeep.forEach(t => {
      console.log(`  - ${t.jobType} v${t.version}: "${t.title}"`);
    });

    // Deactivate ALL templates first
    await InspectionTemplate.updateMany({}, { isActive: false });
    console.log('\n✅ Deactivated all templates');

    // Activate only the ones we want to keep
    for (const template of templatesToKeep) {
      const result = await InspectionTemplate.updateOne(
        { jobType: template.jobType, version: template.version },
        { isActive: true }
      );
      console.log(`✅ Activated: ${template.jobType} v${template.version} (matched: ${result.matchedCount})`);
    }

    // Delete templates that are NOT in our keep list
    const deleteResult = await InspectionTemplate.deleteMany({
      $or: [
        // Delete standalone Electrical template (we keep the combined one)
        { jobType: 'Electrical', version: 3 },
        // Delete Gas+Smoke combined template
        { jobType: 'GasSmoke' },
        // Delete any old versions
        { jobType: 'Smoke', version: { $lt: 3 } },
        { jobType: 'Gas', version: { $lt: 2 } },
        { jobType: 'Electrical', version: { $nin: [5] } },
        { jobType: 'MinimumSafetyStandard', version: { $lt: 2 } },
      ]
    });

    console.log(`\n🗑️  Deleted ${deleteResult.deletedCount} unwanted templates`);

    // Show final state
    const finalTemplates = await InspectionTemplate.find({ isActive: true });
    console.log('\n✅ Final active templates:');
    finalTemplates.forEach(t => {
      console.log(`  - ${t.jobType} v${t.version}: "${t.title}"`);
    });

    console.log(`\n✅ Cleanup complete! Only ${finalTemplates.length} templates are now active.`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

cleanupTemplates();
