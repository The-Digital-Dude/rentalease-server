describe("file upload HEIC support", () => {
  let fileUploadService;

  beforeAll(async () => {
    process.env.GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || "test-bucket";
    fileUploadService = (
      await import("../src/services/fileUpload.service.js")
    ).default;
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
});
