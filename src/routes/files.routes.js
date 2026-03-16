import express from "express";
import { bucket } from "../config/gcs.js";

const router = express.Router();

const streamGCSFile = async (req, res) => {
  const { path: gcsPath } = req.query;

  if (!gcsPath) {
    return res.status(400).json({ status: "error", message: "Missing path parameter" });
  }

  // Basic path traversal guard
  if (gcsPath.includes("..") || gcsPath.startsWith("/")) {
    return res.status(400).json({ status: "error", message: "Invalid path" });
  }

  try {
    const file = bucket.file(gcsPath);
    const [exists] = await file.exists();

    if (!exists) {
      return res.status(404).json({ status: "error", message: "File not found" });
    }

    const [metadata] = await file.getMetadata();
    const contentType = metadata.contentType || "application/octet-stream";
    const contentLength = metadata.size;

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader(
      "Content-Disposition",
      contentType.startsWith("image/") ? "inline" : "inline"
    );

    // Stream the file directly to the response
    file.createReadStream().pipe(res);
  } catch (error) {
    console.error("Error serving GCS file:", error);
    res.status(500).json({ status: "error", message: "Failed to retrieve file" });
  }
};

// Backward-compatible PDF route for previously stored URLs.
router.get("/pdf", streamGCSFile);

// Generic object route for images and other files stored in GCS.
router.get("/object", streamGCSFile);

export default router;
