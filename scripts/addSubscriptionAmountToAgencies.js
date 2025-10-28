import mongoose from "mongoose";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, "..", ".env") });

// Agency Schema (simplified version for migration)
const agencySchema = new mongoose.Schema(
  {
    companyName: String,
    email: String,
    subscriptionAmount: Number,
  },
  { strict: false }
);

const Agency = mongoose.model("Agency", agencySchema);

const migrateAgencies = async () => {
  try {
    console.log("🔄 Starting migration: Adding subscriptionAmount to agencies...");
    console.log(`📡 Connecting to MongoDB...`);

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Find all agencies that don't have subscriptionAmount or have null/undefined
    const agenciesWithoutAmount = await Agency.find({
      $or: [
        { subscriptionAmount: { $exists: false } },
        { subscriptionAmount: null },
        { subscriptionAmount: { $type: "null" } },
      ],
    });

    console.log(`\n📊 Found ${agenciesWithoutAmount.length} agencies without subscriptionAmount`);

    if (agenciesWithoutAmount.length === 0) {
      console.log("✨ No agencies need to be updated. All agencies already have subscriptionAmount set.");
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
      process.exit(0);
    }

    // Default subscription amount (based on the model default)
    const DEFAULT_SUBSCRIPTION_AMOUNT = 99;

    console.log(`\n🔧 Updating agencies with default subscriptionAmount of $${DEFAULT_SUBSCRIPTION_AMOUNT}...\n`);

    let successCount = 0;
    let errorCount = 0;

    // Update each agency
    for (const agency of agenciesWithoutAmount) {
      try {
        agency.subscriptionAmount = DEFAULT_SUBSCRIPTION_AMOUNT;
        await agency.save();

        console.log(`✅ Updated agency: ${agency.companyName} (${agency.email})`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to update agency: ${agency.companyName} (${agency.email})`);
        console.error(`   Error: ${error.message}`);
        errorCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Migration Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Successfully updated: ${successCount} agencies`);
    console.log(`❌ Failed to update: ${errorCount} agencies`);
    console.log(`📊 Total processed: ${agenciesWithoutAmount.length} agencies`);
    console.log("=".repeat(60) + "\n");

    // Close database connection
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    console.log("✨ Migration completed successfully!");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed with error:", error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log("🔌 Database connection closed");
    }
    process.exit(1);
  }
};

// Run migration
migrateAgencies();
