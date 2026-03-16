import { Storage } from "@google-cloud/storage";

const normalizeCredentials = (rawCredentials) => {
  if (!rawCredentials) {
    return null;
  }

  const credentials =
    typeof rawCredentials === "string"
      ? JSON.parse(rawCredentials)
      : rawCredentials;

  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return credentials;
};

const storageConfig = {
  projectId: process.env.GCS_PROJECT_ID,
};

if (process.env.GCS_KEY_FILE) {
  storageConfig.keyFilename = process.env.GCS_KEY_FILE;
} else if (process.env.GCS_KEY_JSON) {
  storageConfig.credentials = normalizeCredentials(process.env.GCS_KEY_JSON);
}

const storage = new Storage(storageConfig);
const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
const isGCSConfigured = () =>
  Boolean(
    process.env.GCS_BUCKET_NAME &&
      (process.env.GCS_KEY_FILE || process.env.GCS_KEY_JSON)
  );

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

export { storage, bucket, testGCSConnection, isGCSConfigured };
export default bucket;
