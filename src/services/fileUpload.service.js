import multer from "multer";
import { bucket, isGCSConfigured } from "../config/gcs.js";
import sharp from "sharp";

export const CLOUDINARY_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
export const DEFAULT_UPLOAD_LIMIT_BYTES = 20 * 1024 * 1024;

const IMAGE_COMPRESSION_STEPS = [
  { width: 2200, quality: 82 },
  { width: 1920, quality: 76 },
  { width: 1600, quality: 70 },
  { width: 1280, quality: 64 },
  { width: 1080, quality: 58 },
];

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  // Allowed file types for documents
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed."
      ),
      false
    );
  }
};

// Configure multer for memory storage
// No fileSize limit here. PDFs are stored in GCS and images are validated before upload.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    files: 6, // Maximum 6 files per upload (3 licensing + 3 insurance)
  },
});

// Configure multer specifically for inspection reports
const inspectionUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    files: 400, // Support up to 400 files for photo-heavy inspections
  },
});

// File filter for chat attachments (more permissive)
const chatFileFilter = (req, file, cb) => {
  // Allowed file types for chat attachments
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    // Archives
    "application/zip",
    "application/x-zip-compressed",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Supported: Images (JPG, PNG, GIF), Documents (PDF, DOC, DOCX, XLS, XLSX), Text files, and ZIP archives."
      ),
      false
    );
  }
};

// Configure multer for chat attachments
const chatUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: chatFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for chat files
    files: 1, // One file at a time for chat
  },
});

const tryCompressImageBuffer = async (buffer) => {
  if (!buffer?.length) {
    return buffer;
  }

  let metadata;
  try {
    metadata = await sharp(buffer).metadata();
  } catch {
    return buffer;
  }

  if (!metadata?.width || !metadata?.height) {
    return buffer;
  }

  for (const step of IMAGE_COMPRESSION_STEPS) {
    const resizedBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: Math.min(step.width, metadata.width),
        withoutEnlargement: true,
      })
      .flatten({ background: "#ffffff" })
      .jpeg({
        quality: step.quality,
        mozjpeg: true,
      })
      .toBuffer();

    if (resizedBuffer.length <= CLOUDINARY_UPLOAD_LIMIT_BYTES) {
      return resizedBuffer;
    }
  }

  return buffer;
};

// Legacy alias kept so existing callers still route image uploads through GCS.
const uploadToCloudinary = async (buffer, options = {}) => {
  let uploadBuffer = buffer;
  const {
    folder,
    fileName,
    contentType = "image/jpeg",
  } = options;

  if (uploadBuffer?.length > CLOUDINARY_UPLOAD_LIMIT_BYTES) {
    uploadBuffer = await tryCompressImageBuffer(uploadBuffer);
  }

  if (uploadBuffer?.length > CLOUDINARY_UPLOAD_LIMIT_BYTES) {
    const error = new Error(
      `File size too large after processing. Maximum allowed size is ${CLOUDINARY_UPLOAD_LIMIT_BYTES} bytes.`
    );
    error.status = 413;
    error.code = "FILE_TOO_LARGE";
    throw error;
  }

  if (!folder || !fileName) {
    throw new Error("folder and fileName are required for storage uploads");
  }

  return uploadToGCS(uploadBuffer, {
    folder,
    fileName,
    contentType,
  });
};

const isGCSAuthOrConfigError = (error) => {
  const combinedMessage = [
    error?.message,
    error?.response?.data?.error,
    error?.response?.data?.error_description,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return [
    "invalid_grant",
    "could not refresh access token",
    "error fetching access token",
    "could not load the default credentials",
    "private key",
    "keyfile",
    "enoent",
    "bucket name",
    "credentials",
  ].some((fragment) => combinedMessage.includes(fragment));
};

const normalizeBaseUrl = (value) => {
  if (!value) {
    return null;
  }

  return String(value).trim().replace(/\/+$/, "");
};

const isLocalBaseUrl = (value) => {
  if (!value) {
    return false;
  }

  return /\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value);
};

const resolveBackendUrl = () => {
  const nodeEnv = process.env.NODE_ENV || "development";
  const allowLocalhost = nodeEnv === "development" || nodeEnv === "test";
  const candidates = [
    process.env.BACKEND_URL,
    process.env.PUBLIC_BACKEND_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RAILWAY_STATIC_URL
      ? `https://${process.env.RAILWAY_STATIC_URL}`
      : null,
  ]
    .map(normalizeBaseUrl)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (allowLocalhost || !isLocalBaseUrl(candidate)) {
      return candidate;
    }
  }

  return allowLocalhost
    ? "http://localhost:4000"
    : "https://server.rentalease.com.au";
};

const getGCSProxyPath = (contentType) => {
  return contentType?.startsWith("image/")
    ? "/api/v1/files/object"
    : "/api/v1/files/pdf";
};

const deleteFromCloudinary = async (publicId) => {
  if (publicId) {
    console.warn(
      "Skipping Cloudinary delete for legacy record because Cloudinary support has been removed.",
      { publicId }
    );
  }
  return null;
};

const createGCSResponse = (objectName, contentType) => {
  const backendUrl = resolveBackendUrl();
  const url = `${backendUrl}${getGCSProxyPath(
    contentType
  )}?path=${encodeURIComponent(objectName)}`;

  return {
    url,
    secure_url: url,
    cloudinaryId: null,
    public_id: null,
    gcsPath: objectName,
    storageProvider: "gcs",
  };
};

// Helper function to upload a buffer to Google Cloud Storage
const uploadToGCS = async (
  buffer,
  { folder, fileName, contentType = "application/octet-stream" }
) => {
  if (!isGCSConfigured()) {
    throw new Error("GCS is not configured for file uploads");
  }

  const objectName = `${folder}/${fileName}`;
  const file = bucket.file(objectName);

  try {
    await file.save(buffer, {
      metadata: { contentType },
    });
  } catch (error) {
    if (isGCSAuthOrConfigError(error)) {
      console.error("GCS upload failed due to configuration or auth error.", {
        folder,
        fileName,
        contentType,
        error: error.message,
      });
    }
    throw error;
  }

  return createGCSResponse(objectName, contentType);
};

const uploadImageToGCS = async (buffer, options = {}) => {
  const uploadBuffer = await tryCompressImageBuffer(buffer);
  return uploadToGCS(uploadBuffer, options);
};

const uploadToStorage = async (
  buffer,
  { folder, fileName, contentType = "application/octet-stream" }
) => {
  if (contentType.startsWith("image/")) {
    return uploadImageToGCS(buffer, { folder, fileName, contentType });
  }

  return uploadToGCS(buffer, { folder, fileName, contentType });
};

// Helper function to delete a file from Google Cloud Storage
const deleteFromGCS = async (gcsPath) => {
  try {
    await bucket.file(gcsPath).delete();
  } catch (error) {
    console.error("Error deleting file from GCS:", error);
    throw error;
  }
};

const deleteStoredFile = async ({ gcsPath, cloudinaryId } = {}) => {
  if (gcsPath) {
    return deleteFromGCS(gcsPath);
  }

  if (cloudinaryId) {
    return deleteFromCloudinary(cloudinaryId);
  }

  return null;
};

// Helper function to batch delete GCS files
const deleteFilesFromGCS = async (documents) => {
  const deletePromises = documents
    .filter((doc) => doc.gcsPath)
    .map((doc) => deleteFromGCS(doc.gcsPath));

  try {
    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error deleting some files from GCS:", error);
  }
};

// Helper function to process uploaded files and upload to storage
const processUploadedFiles = async (files, technicianId) => {
  const result = {};

  if (files) {
    for (const fieldName of Object.keys(files)) {
      result[fieldName] = [];

      for (const file of files[fieldName]) {
        try {
          const fileName = `technician-${technicianId}-${fieldName}-${Date.now()}-${file.originalname}`;
          const uploadResult = await uploadToStorage(file.buffer, {
            folder: "technician-documents",
            fileName,
            contentType: file.mimetype,
            public_id: `technician-${technicianId}-${fieldName}-${Date.now()}`,
            tags: [fieldName, `technician-${technicianId}`],
          });

          result[fieldName].push({
            filename: file.originalname,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            cloudinaryId: uploadResult.public_id,
            cloudinaryUrl: uploadResult.secure_url || uploadResult.url,
            gcsPath: uploadResult.gcsPath || null,
            cloudinaryVersion: uploadResult.version,
            uploadDate: new Date(),
          });
        } catch (error) {
          console.error(`Error uploading ${file.originalname} to GCS:`, error);
          // You might want to handle this error differently
          throw new Error(
            `Failed to upload ${file.originalname}: ${error.message}`
          );
        }
      }
    }
  }

  return result;
};

// Helper function to get file info (legacy compatibility)
const getFileInfo = (file) => {
  return {
    filename: file.originalname,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    buffer: file.buffer, // For memory storage
  };
};

const deleteFiles = async (documents) => {
  const deletePromises = documents
    .map((doc) => {
      if (doc.gcsPath || doc.cloudinaryId) {
        return deleteStoredFile(doc);
      }
    })
    .filter(Boolean);

  try {
    await Promise.all(deletePromises);
    console.log(
      `Successfully processed deletion for ${deletePromises.length} stored files`
    );
  } catch (error) {
    console.error("Error deleting some stored files:", error);
    // Don't throw here - we don't want to fail the entire operation if some deletes fail
  }
};

// Export multer configurations and helper functions
export default {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),

  // Multiple files upload for same field
  array: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),

  // Multiple files upload for different fields
  fields: (fields) => upload.fields(fields),

  // Accept any file fields (used for dynamic inspection media uploads)
  any: () => upload.any(),

  // Upload configuration for technician documents
  technicianDocuments: upload.fields([
    { name: "licensingDocuments", maxCount: 3 },
    { name: "insuranceDocuments", maxCount: 3 },
  ]),

  // Inspection-specific upload configurations
  inspectionReports: () => inspectionUpload.any(),
  inspectionSingle: (fieldName) => inspectionUpload.single(fieldName),
  inspectionArray: (fieldName, maxCount = 15) => inspectionUpload.array(fieldName, maxCount),
  inspectionFields: (fields) => inspectionUpload.fields(fields),

  // Chat-specific upload configurations
  chatAttachment: () => chatUpload.single('attachment'),

  // Legacy aliases kept for backward compatibility
  uploadToCloudinary,
  uploadToStorage,
  uploadImageToGCS,
  deleteFromCloudinary,
  processUploadedFiles,
  deleteFiles,

  // GCS helper functions
  uploadToGCS,
  deleteFromGCS,
  deleteFilesFromGCS,
  deleteStoredFile,

  // Legacy helper functions
  getFileInfo,

  // Deprecated - kept for backward compatibility
  deleteFile: async (filePath) => {
    console.warn("deleteFile is deprecated. Use deleteStoredFile instead.");
    throw new Error("Legacy deleteFile is no longer supported");
  },
};
