# Feature 4 – Inspection Form Submission & Report Generation

This document captures the plan for implementing dynamic inspection forms, automated PDF report generation, and property inspection history management across the RentalEase platform.

## 1. Domain Model Updates

### 1.1 New `InspectionTemplate`
- **Goal**: Serve job-type-specific form definitions to technician clients.
- **Location**: `src/models/InspectionTemplate.js` (Mongoose) with seed JSON in `src/config/inspectionTemplates.js`.
- **Shape**:
  ```json
  {
    "jobType": "Electrical",
    "title": "Electrical Safety Inspection",
    "version": 1,
    "sections": [
      {
        "id": "switchboard",
        "title": "Switchboard",
        "description": "Assess the the switchboard components",
        "fields": [
          { "id": "main-switch", "label": "Main Switch Functional", "type": "boolean", "required": true },
          { "id": "switchboard-photos", "label": "Supporting Photos", "type": "photo-multi", "max": 5 }
        ]
      }
    ]
  }
  ```
- Expose helper to fetch templates by job type and version.
- Admin editing not required yet; data seeded and maintainable via JSON.

### 1.2 New `InspectionReport`
- **Goal**: Persist completed inspection submissions.
- **Location**: `src/models/InspectionReport.js`.
- **Fields**:
  - `job` (ObjectId → `Job`, required)
  - `property` (ObjectId → `Property`, required)
  - `technician` (ObjectId → `Technician`, required)
  - `templateId` + `jobType` + `templateVersion`
  - `formData` – captured values (Schema.Types.Mixed)
  - `sectionsSummary` – flattened summary for PDFs/search
  - `media` – array of Cloudinary uploads (id, url, label, fieldId)
  - `notes` – technician free-form
  - `pdf` – { url, cloudinaryId, generatedAt }
  - `submittedAt`, `submittedBy`
- Add indexes on `property`, `job`, `jobType`, `submittedAt` for query performance.

### 1.3 Property Schema Extension
- Add `inspectionHistory` virtual (read-only) that resolves from `InspectionReport`.
- Avoid embedding to keep Property document small.

## 2. API Surface

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/v1/inspections/templates` | GET | Technician, Superuser | List templates or fetch by `jobType`.
| `/api/v1/jobs/:id/inspections` | POST | Technician | Submit inspection form + media, generate PDF, persist report, mark job complete optionally.
| `/api/v1/jobs/:id/inspection-report` | GET | Technician (own job) | Fetch latest report metadata for confirmation.
| `/api/v1/properties/:id/inspections` | GET | Superuser, PropertyManager | Paginated inspection history with filters (jobType, date range).
| `/api/v1/inspections/:reportId` | GET | Auth stakeholders | Retrieve report metadata + signed download URL.

Implementation Notes:
- Reuse `fileUploadService.fields` for `photos[]` uploads; require `multipart/form-data`.
- Accept JSON payload `formData` with nested sections, keyed by `fieldId`.
- Link created report back to `Job` via `job.inspectionReport` for O(1) lookup.

## 3. PDF Generation

- Introduce `src/services/inspectionReportPdf.service.js` using `pdfkit`.
- Input: `InspectionReport` + resolved `Property`, `Technician`, `Job`.
- Output: Buffer stream; upload via `fileUploadService.uploadToCloudinary` to `inspection-reports/` folder.
- Layout basics:
  1. Cover: property address, job ID, technician, submission timestamp.
  2. Section per form section: table-like listing field label + value.
  3. Append thumbnails/links for photo fields.
  4. Footer: page numbers, company branding placeholder.
- Return Cloudinary URL & ID for persistence.

## 4. Submission Workflow

1. Technician opens job → selects job type (defaults to `job.jobType`).
2. Client requests `/inspections/templates?jobType=Electrical`.
3. Render dynamic form with support for:
   - `text`, `textarea`, `number`, `boolean`, `select`, `date`, `time`, `photo`, `photo-multi`, `signature` (future-proof, optional to implement now).
4. Technician fills form, captures photos (persist in temp state), adds general notes.
5. Client submits via multipart POST:
   - Fields: `jobType`, `templateVersion`, `formData` (JSON), `notes`, `completeJob` (boolean), optional invoice data, `photos[fieldId][]`.
6. Backend pipeline:
   - Validate job assignment & template compatibility.
   - Process photo uploads → Cloudinary URLs in `media` array.
   - Persist `InspectionReport` document.
   - Generate & upload PDF; update document with link.
   - If `completeJob` flag true → reuse existing completion logic (without requiring manual `reportFile`) by injecting generated PDF URL and invoice data.
   - Append property inspection history entry (via new route or jobRef).
   - Trigger notifications (optional email to property manager with PDF link).
7. Response: report metadata + job completion status for client UI.

## 5. Dashboard Consumption

- Extend Superuser & Property Manager dashboards:
  - Add new widget/table for inspection history (job type, technician, submitted date, link to PDF, job status).
  - Provide download action calling `/api/v1/inspections/:reportId`.
- Ensure authorization constraints (Property Manager only sees reports for assigned properties).

## 6. Frontend (Technician App) Updates

- Replace current `JobCompletionModal` with multi-step flow (`SelectTemplateStep`, `InspectionFormStep`, `ReviewAndInvoiceStep`).
- Introduce form renderer component that maps template field definitions to React Native inputs.
- Manage media uploads using Expo ImagePicker or camera (existing pattern?).
- Submit using the new endpoint; if invoice data required, integrate existing invoice builder step.
- After success, show confirmation and disable legacy PDF upload UI.

## 7. Notifications (Optional but recommended)

- Use `emailService` to send Property Manager + Superuser summary email when new report arrives.
- Include PDF link and key findings (highest priority flags, failed boolean checks).

## 8. Rollout & Backward Compatibility

- Keep existing `/jobs/:id/complete` endpoint functional for legacy clients.
- When technician app upgrades, it will call new inspection submission endpoint and optionally patch job completion by referencing generated report file.
- Validate that generated PDF URL is accepted by existing admin portals expecting `job.reportFile`.

## 9. Testing Strategy

- Unit tests for template validator and PDF service (snapshot PDF metadata?).
- Integration tests for `/jobs/:id/inspections` (mock Cloudinary using jest spies).
- Frontend manual QA: form rendering per template, offline caching fallback (if required), submission error handling.

