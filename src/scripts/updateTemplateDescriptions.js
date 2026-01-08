import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import InspectionTemplate from '../models/InspectionTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
dotenv.config({ path: join(__dirname, '../../.env') });

const updateDescriptions = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB\n');

    // Update Gas template with summary
    const gasTemplate = await InspectionTemplate.findOne({ jobType: 'Gas', version: 2 });
    if (gasTemplate) {
      if (!gasTemplate.metadata) {
        gasTemplate.metadata = new Map();
      }
      gasTemplate.metadata.set('summary', 'Comprehensive gas appliance and installation safety inspection');
      await gasTemplate.save();
      console.log(`✅ Gas template updated`);
    }

    // Update MinimumSafetyStandard template with summary
    const mssTemplate = await InspectionTemplate.findOne({ jobType: 'MinimumSafetyStandard', version: 2 });
    if (mssTemplate) {
      if (!mssTemplate.metadata) {
        mssTemplate.metadata = new Map();
      }
      mssTemplate.metadata.set('summary', 'Complete property inspection covering minimum safety standards for rental properties');
      await mssTemplate.save();
      console.log(`✅ MinimumSafetyStandard template updated`);
    }

    // Show all active templates with their summaries
    const templates = await InspectionTemplate.find({ isActive: true }).sort({ jobType: 1 });
    console.log('\n📋 All active templates with descriptions:');
    templates.forEach(t => {
      console.log(`  - ${t.jobType} v${t.version}: "${t.title}"`);
      console.log(`    Metadata type: ${typeof t.metadata}, is Map: ${t.metadata instanceof Map}`);
      console.log(`    Metadata keys:`, t.metadata ? Array.from(t.metadata.keys()) : 'none');
      const summary = t.metadata instanceof Map ? t.metadata.get('summary') : t.metadata?.summary;
      console.log(`    Description: ${summary || '(no description)'}`);
    });

    console.log('\n✅ Descriptions updated successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

updateDescriptions();
