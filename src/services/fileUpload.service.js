const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const staffDocumentsDir = path.join(uploadsDir, 'staff-documents');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(staffDocumentsDir)) {
  fs.mkdirSync(staffDocumentsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, staffDocumentsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = `${file.fieldname}-${uniqueSuffix}${fileExtension}`;
    cb(null, fileName);
  }
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  // Allowed file types for documents
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed.'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per upload
  }
});

// Export multer configurations
module.exports = {
  // Single file upload
  single: (fieldName) => upload.single(fieldName),
  
  // Multiple files upload for same field
  array: (fieldName, maxCount = 5) => upload.array(fieldName, maxCount),
  
  // Multiple files upload for different fields
  fields: (fields) => upload.fields(fields),
  
  // Upload configuration for staff documents
  staffDocuments: upload.fields([
    { name: 'licensingDocuments', maxCount: 3 },
    { name: 'insuranceDocuments', maxCount: 3 }
  ]),
  
  // Helper function to delete files
  deleteFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  },
  
  // Helper function to get file info
  getFileInfo: (file) => {
    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path
    };
  },
  
  // Helper function to process uploaded files
  processUploadedFiles: (files) => {
    const result = {};
    
    if (files) {
      Object.keys(files).forEach(fieldName => {
        result[fieldName] = files[fieldName].map(file => ({
          filename: file.filename,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          path: file.path,
          uploadDate: new Date()
        }));
      });
    }
    
    return result;
  }
}; 