describe("file upload HEIC support", () => {
  let fileUploadService;
  let cleanupInspectionUploadTempFiles;

  beforeAll(async () => {
    process.env.GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "test-bucket";
    const module = await import("../src/services/fileUpload.service.js");
    fileUploadService = module.default;
    cleanupInspectionUploadTempFiles = module.cleanupInspectionUploadTempFiles;
  });

  test("allows HEIC and HEIF uploads by MIME type", () => {
    expect(
      fileUploadService.isAllowedUploadFile({
        mimetype: "image/heic",
        originalname: "meter.heic",
      })
    ).toBe(true);
    expect(
      fileUploadService.isAllowedUploadFile({
        mimetype: "image/heif",
        originalname: "meter.heif",
      })
    ).toBe(true);
  });

  test("allows iOS HEIC uploads with generic MIME type when the extension is HEIC", () => {
    expect(
      fileUploadService.isAllowedUploadFile({
        mimetype: "application/octet-stream",
        originalname: "gas-meter.HEIC",
      })
    ).toBe(true);
  });

  test("does not allow generic MIME type without a HEIC or HEIF extension", () => {
    expect(
      fileUploadService.isAllowedUploadFile({
        mimetype: "application/octet-stream",
        originalname: "gas-meter.exe",
      })
    ).toBe(false);
  });

  test("detects HEIC uploads by MIME type or extension", () => {
    expect(
      fileUploadService.isHeicUpload({
        contentType: "image/heic",
        fileName: "meter",
      })
    ).toBe(true);
    expect(
      fileUploadService.isHeicUpload({
        contentType: "application/octet-stream",
        fileName: "meter.heif",
      })
    ).toBe(true);
    expect(
      fileUploadService.isHeicUpload({
        contentType: "image/jpeg",
        fileName: "meter.jpg",
      })
    ).toBe(false);
  });

  test("leaves non-HEIC image storage metadata unchanged", async () => {
    const buffer = Buffer.from("not-an-image");
    const normalized = await fileUploadService.normalizeImageForStorage(buffer, {
      fileName: "meter.jpg",
      contentType: "image/jpeg",
    });

    expect(normalized).toEqual({
      buffer,
      fileName: "meter.jpg",
      contentType: "image/jpeg",
      wasConverted: false,
    });
  });

  test("cleans up inspection temp upload files", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");
    const tempPath = path.join(
      os.tmpdir(),
      `inspection-upload-${Date.now()}.tmp`
    );

    await fs.writeFile(tempPath, "temp");
    await cleanupInspectionUploadTempFiles([{ path: tempPath }]);

    await expect(fs.access(tempPath)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
