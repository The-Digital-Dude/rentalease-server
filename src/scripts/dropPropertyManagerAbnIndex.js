import mongoose from "mongoose";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Script to drop the abn_1 index from propertymanagers collection
 * This index is causing duplicate key errors when creating property managers
 * because the abn field was removed from the schema but the index remains
 */
async function dropPropertyManagerAbnIndex() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("propertymanagers");

    // List all indexes
    const indexes = await collection.indexes();
    console.log("\n📋 All indexes on 'propertymanagers' collection:");
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Check if the index exists (by name or by key)
    const abnIndexByName = indexes.find((idx) => idx.name === "abn_1");
    const abnIndexByKey = indexes.find((idx) => idx.key && idx.key.abn !== undefined);

    if (!abnIndexByName && !abnIndexByKey) {
      console.log("\nℹ️  No 'abn' index found. Nothing to drop.");
      await mongoose.connection.close();
      return;
    }

    const abnIndex = abnIndexByName || abnIndexByKey;
    console.log("\n🔍 Found abn index:", JSON.stringify(abnIndex, null, 2));

    // Drop the index (use the actual index name)
    const indexName = abnIndex.name;
    console.log(`\n🗑️  Dropping index '${indexName}'...`);
    await collection.dropIndex(indexName);
    console.log(`✅ Successfully dropped index '${indexName}'`);

    // Verify the index is gone
    const remainingIndexes = await collection.indexes();
    const stillExists = remainingIndexes.find((idx) => 
      idx.name === indexName || (idx.key && idx.key.abn !== undefined)
    );
    if (stillExists) {
      throw new Error("Index still exists after drop operation");
    }

    console.log("✅ Verification complete: index has been removed");

    await mongoose.connection.close();
    console.log("✅ Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error dropping index:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
dropPropertyManagerAbnIndex();

