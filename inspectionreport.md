# Inspection Report Photo Alignment Plan

## Purpose

Inspection report photos must belong to the exact form section/component being checked. Gas inspection already follows this pattern more closely: the technician answers a section, captures photos in that same section, and the generated PDF renders those photos with the matching checks. Electrical, Smoke, and Minimum Safety Standard reports must follow the same rule.

This document describes how the inspection system currently works, the target behavior, acceptance criteria, and the proposed implementation. No implementation should be started until this plan is approved.

## Current Inspection Flow

1. A technician loads an inspection template for a job from `GET /inspection/jobs/:jobId/template`.
2. The template comes from `src/config/inspectionTemplates.js`.
3. The technician submits the report as multipart form data to `POST /inspection/jobs/:jobId`.
4. Text/check answers are submitted through `formData`.
5. Uploaded media files use field names like `media__<fieldId>`.
6. Optional `mediaMeta` can include labels and metadata such as:
   - `sectionId`
   - `itemIndex`
   - `caption`
7. `src/services/inspectionReport.service.js` normalizes media metadata and stores uploaded media on the `InspectionReport.media` array.
8. `src/services/inspectionReportPdf.service.js` generates the PDF by matching stored media back to sections and fields.

## Current Media Matching Behavior

Media is linked to report sections using:

- `fieldId`
- `metadata.sectionId`
- `metadata.itemIndex` for repeatable sections
- template photo fields of type `photo` and `photo-multi`

The backend now normalizes Mongoose `Map` metadata before rendering, so saved media metadata can be read correctly.

## Problem

Some reports still treat photos as a separate gallery instead of part of the relevant inspection section.

Examples:

- Electrical templates have an `inspection-photos` section with grouped uploads such as `switchboard-photos`, `gpo-tester-photos`, and `meter-photos`.
- Smoke templates have an `inspection-photos` section with grouped uploads such as `alarm-context-photos`, `alarm-label-photos`, and `test-procedure-photos`.
- Minimum Safety Standard already has many photos inside component sections, but some summary-style sections still need to be checked carefully.

The desired behavior is different:

- If the technician is checking a switchboard, switchboard photos should be captured in the switchboard/electrical section.
- If the technician is checking a smoke alarm, alarm photos should be captured with that alarm or smoke alarm section.
- If the technician is checking a bedroom, bathroom, kitchen, laundry, bin, entry door, heater, window, or mould issue, those photos should live in that exact section.

## Target Rule

Every report type must follow this rule:

> A photo field belongs in the same template section as the check it supports, and the PDF must render that photo directly with that section/component.

There should not be a generic `inspection-photos` section for normal component evidence unless it is truly additional/general evidence.

## Report Type Criteria

### Gas Inspection

Gas is the reference pattern.

Criteria:

- Property photos remain with property details if needed.
- LP gas checklist photos render with LP gas checks.
- General gas check photos render with general gas checks.
- Appliance photos render with each repeatable gas appliance item.
- Rectification photos render with rectification works.
- Photos should appear near the relevant checks in the PDF.

Current status:

- Mostly aligned.
- Repeatable appliance media uses `itemIndex`.
- This should be used as the model for other templates.

### Electrical Report

Required changes:

- Move grouped `inspection-photos` fields into relevant sections.
- `switchboard-photos` should live with switchboard/electrical installation checks.
- `gpo-tester-photos` should live with GPO/safety testing checks.
- `meter-photos` should live with meter/supply checks if that section exists; otherwise create a clear meter/supply section.
- `additional-photos` can remain only as optional general evidence.
- PDF should render each photo directly after, or inside, the section it supports.
- Avoid a final generic Electrical `Inspection Photos` gallery for normal component evidence.

Acceptance criteria:

- Technician sees photo upload controls inside the same form section as the Electrical check.
- The stored media has `sectionId` matching the check section.
- The PDF displays photos with the relevant Electrical checks.
- There is only one shared `Technician Details` row in the top summary.
- If the technician profile is missing licence/name, form-entered values are shown in the report.

### Smoke Report

Required changes:

- Move grouped `inspection-photos` fields into the relevant Smoke sections.
- Alarm context, label, test, and replacement photos should be captured per alarm where possible.
- If the smoke alarm records are repeatable, each alarm photo should use `itemIndex` and render with that alarm.
- Property overview and additional photos can remain as general evidence only if they are not tied to one alarm/check.
- PDF should render alarm photos with the matching alarm record.

Acceptance criteria:

- Each smoke alarm item can carry its own photos.
- Photo metadata includes `sectionId` and `itemIndex` for repeatable alarm records.
- The PDF displays photos below the corresponding alarm details.
- General Smoke photo gallery is only used for general/non-component photos.
- If the technician profile is missing licence/name, form-entered values are shown in the report.

### Minimum Safety Standard Report

Minimum Safety Standard already uses many section-specific photo fields.

Criteria:

- Bedroom photos stay inside each bedroom section.
- Bathroom photos stay inside each bathroom section.
- Living room photos stay inside living room.
- Kitchen photos stay inside kitchen.
- Laundry photos stay inside laundry.
- Front entrance and door photos stay inside front entrance.
- Electrical safety photos stay inside electrical safety.
- Bin photos stay inside bin facilities.
- Property exterior photo stays inside property summary.
- PDF must render each section's photos with that section.

Acceptance criteria:

- Every `photo` or `photo-multi` field in the Minimum Safety Standard template belongs to a specific section.
- PDF renders photos by section, not as a disconnected gallery.
- Dynamic bedroom/bathroom section photos render for every generated room.
- If the technician profile is missing licence/name, form-entered values are shown in the report.

## Template Design Rules

1. Photo fields must be placed inside the section they support.
2. Use `photo` for one required evidence image.
3. Use `photo-multi` for multiple images of the same component.
4. Do not use a catch-all `inspection-photos` section for required component checks.
5. Keep `additional-photos` only for optional extra evidence.
6. Repeatable sections must preserve `itemIndex`.
7. Photo field IDs should be specific and stable.

Examples:

```js
{
  id: "electrical-installations",
  title: "Electrical Installations",
  fields: [
    { id: "switchboard-accessible", type: "yes-no" },
    { id: "switchboard-photos", type: "photo-multi" }
  ]
}
```

```js
{
  id: "smoke-alarm-records",
  repeatable: true,
  fields: [
    { id: "location", type: "select" },
    { id: "photo-context", type: "photo" },
    { id: "photo-label", type: "photo" },
    { id: "photo-test", type: "photo" }
  ]
}
```

## Submission Rules

The frontend should submit photos with field names that identify the photo field:

```text
media__switchboard-photos
media__gpo-tester-photos
media__photo-context
```

For repeatable sections, the frontend should include metadata:

```json
{
  "photo-context": {
    "label": "Installed location context",
    "metadata": {
      "sectionId": "smoke-alarm-records",
      "itemIndex": 0,
      "caption": "Hallway smoke alarm"
    }
  }
}
```

If the frontend uses indexed field keys, the backend must still derive:

- original field ID
- section ID
- item index

## PDF Rendering Rules

1. Each renderer should render non-photo checks first.
2. Then render the photos for that same section.
3. For repeatable sections, render photos for the current item directly after that item.
4. General galleries should only render optional additional evidence.
5. A photo should not be duplicated in both a section and a general gallery.

## Proposed Implementation

### Phase 1: Template Cleanup

Electrical:

- Move `switchboard-photos` into Electrical installation/switchboard section.
- Move `gpo-tester-photos` into safety testing or GPO testing section.
- Move `meter-photos` into meter/supply section.
- Keep `additional-photos` as optional only if needed.

Smoke:

- Move alarm-specific photos into the repeatable smoke alarm record fields.
- Keep property overview/additional photos separate only if general.

Minimum Safety Standard:

- Audit every photo field and confirm it is in the correct section.
- Add missing section photo fields only where a check currently has no photo input but should.

### Phase 2: Submission Metadata

- Ensure frontend sends `sectionId` for all media.
- Ensure frontend sends `itemIndex` for repeatable records.
- Keep backend fallback derivation for older clients.

### Phase 3: PDF Renderer Alignment

- Electrical renderer should render photos inside each section.
- Smoke renderer should render alarm photos per alarm item.
- Minimum Safety Standard renderer should continue rendering section photos, with tests confirming all photo sections are visited.
- Generic `inspection-photos` galleries should be removed or limited to `additional-photos`.

### Phase 4: Regression Tests

Add/extend tests for:

- Electrical switchboard photos render with switchboard/electrical installation checks.
- Electrical GPO tester photos render with safety testing checks.
- Smoke alarm indexed photos render with the matching alarm record.
- Minimum Safety Standard dynamic bedroom/bathroom photos render with the generated room section.
- Media metadata works when stored as a Mongoose `Map`.
- A media item is not rendered twice.

## Acceptance Checklist

Before marking this complete:

- Gas still works as the reference behavior.
- Electrical required photos are inside relevant form sections.
- Smoke required photos are inside relevant form sections or repeatable alarm records.
- Minimum Safety Standard photos remain inside relevant room/component sections.
- PDF output places photos with their checks.
- Generic galleries contain only additional/general photos.
- Technician details appear once in the shared top summary.
- Technician details fall back to form-entered values when profile data is missing.
- Existing submitted reports still render as well as possible using fallback media matching.

## Open Questions Before Implementation

1. Should old reports keep rendering their existing `inspection-photos` galleries for backward compatibility?
2. Should `additional-photos` remain at the end of each report as general evidence?
3. For Smoke reports, should each smoke alarm record require all photos, or should some be optional?
4. Should Electrical get a new dedicated meter/supply section if one does not already exist?
5. Should frontend changes be handled in a separate repository, or is the frontend also in this workspace?

