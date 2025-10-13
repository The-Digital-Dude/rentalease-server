import multer from "multer";
import { cloudinary } from "../config/cloudinary.js";
import { Readable } from "stream";

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

// Configure multer for memory storage (files will be uploaded to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 6, // Maximum 6 files per upload (3 licensing + 3 insurance)
  },
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto", // Automatically detect file type
        folder: "technician-documents", // Organize files in folders
        use_filename: true,
        unique_filename: true,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    // Create a readable stream from buffer and pipe to Cloudinary
    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

// Helper function to delete file from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting file from Cloudinary:", error);
    throw error;
  }
};

// Helper function to process uploaded files and upload to Cloudinary
const processUploadedFiles = async (files, technicianId) => {
  const result = {};

  if (files) {
    for (const fieldName of Object.keys(files)) {
      result[fieldName] = [];

      for (const file of files[fieldName]) {
        try {
          // Upload to Cloudinary
          const cloudinaryResult = await uploadToCloudinary(file.buffer, {
            public_id: `technician-${technicianId}-${fieldName}-${Date.now()}`,
            tags: [fieldName, `technician-${technicianId}`], // Add tags for organization
          });

          // Store Cloudinary metadata
          result[fieldName].push({
            filename: file.originalname,
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            cloudinaryId: cloudinaryResult.public_id,
            cloudinaryUrl: cloudinaryResult.secure_url,
            cloudinaryVersion: cloudinaryResult.version,
            uploadDate: new Date(),
          });
        } catch (error) {
          console.error(
            `Error uploading ${file.originalname} to Cloudinary:`,
            error
          );
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

// Helper function to delete multiple files from Cloudinary
const deleteFiles = async (documents) => {
  const deletePromises = documents
    .map((doc) => {
      if (doc.cloudinaryId) {
        return deleteFromCloudinary(doc.cloudinaryId);
      }
    })
    .filter(Boolean);

  try {
    await Promise.all(deletePromises);
    console.log(
      `Successfully deleted ${deletePromises.length} files from Cloudinary`
    );
  } catch (error) {
    console.error("Error deleting some files from Cloudinary:", error);
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

  // Cloudinary helper functions
  uploadToCloudinary,
  deleteFromCloudinary,
  processUploadedFiles,
  deleteFiles,

  // Legacy helper functions
  getFileInfo,

  // Deprecated - kept for backward compatibility
  deleteFile: async (filePath) => {
    console.warn("deleteFile is deprecated. Use deleteFromCloudinary instead.");
    // Extract public_id from path if needed
    throw new Error("Legacy deleteFile not supported with Cloudinary");
  },
};
