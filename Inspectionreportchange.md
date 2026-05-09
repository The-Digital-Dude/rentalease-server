# Inspection Report Changes

## Implemented MSS Changes

- Final MSS checklist now follows `MSS_Checklist.docx` as the source of truth.
- MSS report keeps the existing surrounding report details:
  - Property configuration
  - Property / inspection summary
  - Inspector name and licence
  - Next inspection date
  - Technician sign-off
  - Declaration
  - Signature
  - Final notes
  - Disclaimer
- MSS checklist sections now include:
  1. Electrical Safety
  2. Bin Facilities (Vermin-Proof Bins)
  3. Locks - External Doors
  4. Heating - Main Living Area
  5. Window Coverings
  6. Window covering anchors
  7. Lighting
  8. Mould and Dampness
  9. Ventilation
  10. Structural Soundness
  11. Kitchen
  12. Laundry
  13. Bathroom Facilities
  14. Toilets
- Each MSS checklist section has a required unrestricted `photo-multi` field.
- MSS section photos render in the report using an aligned grid.
- Old MSS report/template behavior was backed up under:
  - `backups/mss-before-final-report-20260509-0929/`

## Current Audit Summary

| Report Type | Property Details | Technician Details | Declaration / Signature | Regulations / Standards | Next Compliance | Photos |
|---|---|---|---|---|---|---|
| MSS | Good | Good | Good | Mostly okay | Good | Good |
| Gas | Good | Good | Good | Needs correction | Good | Partial |
| Electrical | Partial | Good | Good | Needs correction | Good | Weak |
| Smoke | Partial | Good | Good | Needs correction | Good | Partial |

## Findings

### MSS

- MSS is currently the strongest inspection report structure.
- It has complete checklist sections and required section-level multi-photo support.
- It keeps property summary, technician details, declaration, signature, notes, and disclaimer.
- Recommended improvement: add or verify a clear front compliance summary so property managers can quickly see compliant vs non-compliant outcomes.

### Gas

- Property and technician details are strong.
- Declaration and signature are present.
- Backend enforces:
  - `gas-meter-photo`
  - appliance photo per gas appliance
- LP gas photo and rectification photos exist but are not required.
- Standards wording needs correction:
  - Gas report should not reference `AS 3786` as a gas standard.
  - Gas report should use gas-relevant standards such as `AS/NZS 5601.1` and applicable rental safety requirements.

### Electrical

- Technician details and certification are present.
- Property details rely mostly on shared report header/property context rather than a dedicated property details section.
- Inspection photo fields exist, but none are required.
- Backend does not enforce electrical photo uploads.
- Standards wording should be reviewed and aligned, especially around `AS/NZS 3019:2022`.

### Smoke

- Technician/declaration/signature structure is good.
- Property details are partial and focus on coverage assessment rather than full address details.
- Some smoke photo fields are marked required in the template:
  - Alarm Installation Context
  - Manufacturer Labels
  - Testing in Progress
- Backend does not generically enforce required photo fields.
- Standards wording should be corrected:
  - Smoke report should reference smoke alarm standards/requirements such as `AS 3786` and applicable Victorian rental obligations.
  - Avoid unrelated electrical standards in smoke report standards text.

## Recommended Next Changes

1. Add generic backend validation for required `photo` and `photo-multi` fields across all inspection templates.
2. Fix standards/regulation labels in PDF report generation:
   - Gas
   - Electrical
   - Smoke
   - MSS if needed
3. Make key Electrical photo evidence required, especially:
   - Switchboard
   - GPO tester/test evidence
   - Smoke alarm photo if electrical report remains combined with smoke evidence
4. Add full property details sections to Electrical and Smoke templates, or confirm the shared report header is sufficient and consistently visible.
5. Ensure each report shows:
   - Property details
   - Technician/licence details
   - Inspection regulations/standards
   - Declaration and signature
   - Next compliance schedule
   - Required photo evidence

## Shared Report Format Requirement

All inspection report types should follow the same general layout and ordering as the final MSS report so every report feels consistent and easy to review.

The shared report format should include these front/report-level details in the same manner across MSS, Gas, Electrical, and Smoke reports:

- Property details
- Inspection date
- Inspection summary
- Next compliance date
- Technician / inspector details
- Licence or registration number
- Regulations / standards applied
- Declaration
- Signature
- Inspection-specific questions and findings
- Required photo evidence
- Recommendations / action required

Gas, Electrical, and Smoke reports should be updated to match the MSS-style layout where practical. The goal is not to remove their existing inspection-specific questions, but to place the shared report details in a consistent structure across all reports.

Current mismatch:

- MSS already has a clean `property-summary` and `technician-signoff` structure.
- Gas uses separate `property-details`, `technician-details`, and `final-declaration` sections.
- Electrical places many details in `inspection-summary` and `certification`.
- Smoke splits details across `inspection-summary`, `property-coverage`, and `certification-declaration`.

Future implementation should normalize these so the generated reports have the same front-section order and presentation.

## Implementation Plan In Progress

The next implementation pass covers backend, technician mobile app, and web client compatibility.

- Backend PDF reports will use one shared front summary pattern for MSS, Gas, Electrical, and Smoke:
  - Property details
  - Inspection date
  - Inspection summary
  - Next compliance date
  - Technician / inspector details
  - Licence or registration number
  - Regulations / standards applied
  - Declaration status
  - Signature status
  - Recommendations / action required
- Technician comments, notes, action fields, and recommendation fields should appear in the front report as recommendations.
- Required `photo` and `photo-multi` fields must be enforced by the backend for all templates, even if the frontend validation is bypassed.
- Gas-specific photo rules remain in place for gas meter and per-appliance photos.
- Electrical report evidence should require switchboard, GPO tester/test evidence, and smoke alarm photos where the electrical report includes smoke alarm evidence.
- Smoke report required photos should be enforced server-side:
  - Alarm Installation Context
  - Manufacturer Labels
  - Testing in Progress
- Technician mobile app should support selecting multiple images in one action for `photo-multi` fields.
- Web client should remain compatible with the updated report output and continue opening generated PDFs from property report cards.

## Standards Correction Requirement

- Gas reports should reference gas-relevant standards and guidance, including `AS/NZS 5601.1` and Victorian rental gas safety check requirements.
- Electrical reports should reference electrical safety inspection/testing requirements and Victorian rental electrical safety check requirements.
- Smoke reports should reference smoke alarm obligations including `AS 3786` and Victorian rental smoke alarm check requirements.
- Avoid mixing smoke standards into Gas reports or electrical standards into Smoke reports.

## Non-Technical Monthly Summary - May 2026

This month the main focus was improving inspection reports, especially the final MSS report and the way photos appear in all reports.

### Backend / Server Changes

- The MSS report was finalized using the latest MSS checklist.
- The MSS checklist now covers:
  1. Electrical Safety
  2. Bin Facilities
  3. Locks / External Doors
  4. Heating
  5. Window Coverings
  6. Window Covering Anchors
  7. Lighting
  8. Mould and Dampness
  9. Ventilation
  10. Structural Soundness
  11. Kitchen
  12. Laundry
  13. Bathroom Facilities
  14. Toilets
- Each MSS section now requires photo evidence and supports multiple photos.
- Report photos were improved so they appear with the correct inspection section.
- Photos now render in a cleaner aligned layout inside generated PDFs.
- Demo reports were generated for Gas, Electrical, Smoke, and MSS.
- Smoke report compliance schedule wording and display were improved.
- Duplicate or unnecessary technician/inspector details were cleaned up in reports.
- Email sending and attachment error logging were improved.
- Tenant booking/report rendering flow was improved.

### Latest Backend Changes Not Yet Committed

- All report types are being brought closer to the same MSS-style report format.
- The front of the report now shows the important details more clearly:
  - Property details
  - Inspection date
  - Inspection summary
  - Next compliance date
  - Technician/licence details
  - Regulations and standards
  - Declaration status
  - Signature status
  - Recommendations / action required
- Technician comments, notes, and recommendations are now pulled forward into the report recommendation section.
- Required photo fields are now checked by the backend, so required photo evidence cannot be skipped.
- Electrical reports now require important evidence photos such as switchboard, GPO tester/test evidence, and smoke alarm photos.
- Gas, Electrical, and Smoke standards wording has been corrected so each report references the right type of safety requirement.
- Updated demo PDFs were generated again after these changes.

### Web CRM / Client Changes

- A public CRM booking route was added.
- The inspection booking page was improved.
- Technician selection in job creation was fixed.
- CC support was added to CRM email flows.

### Latest Web CRM Items Not Yet Committed

- One new public image file is present but not committed yet.
- No report-format code changes were needed in the web CRM because it already opens the generated PDF reports from the backend.

### Technician Mobile App Changes

- Inspection drafts are now preserved, helping technicians avoid losing progress while completing a report.
- Job completion/report form draft handling was improved.

### Latest Mobile App Changes Not Yet Committed

- Multi-photo fields now allow technicians to select multiple photos from the photo library in one action.
- Camera capture still works one photo at a time.
- Some app branding and build configuration files are also changed but are separate from the inspection report work.

### Overall Non-Technical Summary

The inspection reporting system is now more complete and more professional. MSS has been finalized, photos are handled better, reports are easier to read, and the important compliance details are shown more clearly near the front of the report. The technician app also better supports real inspection work by preserving drafts and allowing easier multi-photo upload.

## Verification Already Run

```bash
pnpm test -- minimumSafetyStandardChecklist.test.js --runInBand
pnpm test -- inspectionReportPdfMedia.test.js --runInBand
```

Both targeted test suites passed after the MSS changes.
