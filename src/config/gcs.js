import { Storage } from "@google-cloud/storage";

const storageConfig = {
  projectId: process.env.GCS_PROJECT_ID,
};

if (process.env.GCS_KEY_FILE) {
  storageConfig.keyFilename = process.env.GCS_KEY_FILE;
} else if (process.env.GCS_KEY_JSON) {
  storageConfig.credentials = JSON.parse(process.env.GCS_KEY_JSON);
}

const storage = new Storage(storageConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

const testGCSConnection = async () => {
  try {
    const [exists] = await bucket.exists();
    if (exists) {
      console.log(`GCS connected successfully. Bucket: ${process.env.GCS_BUCKET_NAME}`);
    } else {
      console.error(`GCS bucket "${process.env.GCS_BUCKET_NAME}" does not exist`);
    }
    return exists;
  } catch (error) {
    console.error("GCS connection failed:", error.message);
    return false;
  }
};

export { storage, bucket, testGCSConnection };
export default bucket;
