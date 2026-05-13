const fs = require("fs");
const path = require("path");

const loadCreateMinimumSafetyStandardTemplate = () => {
  const configPath = path.resolve(
    __dirname,
    "../src/config/inspectionTemplates.js"
  );
  const source = fs.readFileSync(configPath, "utf8");
  const executableSource = source
    .replace("export { createMinimumSafetyStandardTemplate };", "")
    .replace(
      "export const defaultInspectionTemplates =",
      "const defaultInspectionTemplates ="
    )
    .replace("export default defaultInspectionTemplates;", "")
    .concat("\nreturn createMinimumSafetyStandardTemplate;");

  return new Function(executableSource)();
};

describe("Minimum Safety Standard DOCX checklist template", () => {
  const getTemplate = () => {
    const createMinimumSafetyStandardTemplate =
      loadCreateMinimumSafetyStandardTemplate();
    return createMinimumSafetyStandardTemplate(2, 2);
  };

  const getFieldMap = (template) => {
    const fields = new Map();

    for (const section of template.sections) {
      for (const field of section.fields || []) {
        fields.set(`${section.id}.${field.id}`, field);
      }
    }

    return fields;
  };

  test("keeps essentials and exposes the 14 DOCX checklist sections", () => {
    const template = getTemplate();
    const checklistTitles = template.sections
      .filter((section) => /^\d+\./.test(section.title))
      .map((section) => section.title);

    expect(template.version).toBe(3);
    expect(template.sections.map((section) => section.id)).toEqual([
      "property-setup",
      "property-summary",
      "electrical-safety",
      "bin-facilities",
      "external-entry-doors",
      "heating-summary",
      "window-coverings-summary",
      "window-covering-anchors",
      "lighting-summary",
      "mould-dampness-summary",
      "ventilation-summary",
      "structural-soundness",
      "kitchen",
      "laundry",
      "bathroom-facilities",
      "toilet-summary",
      "technician-signoff",
    ]);
    expect(checklistTitles).toEqual([
      "1. Electrical Safety",
      "2. Bin Facilities (Vermin-Proof Bins)",
      "3. Locks - External Doors",
      "4. Heating - Main Living Area",
      "5. Window Coverings",
      "6. Window covering anchors",
      "7. Lighting",
      "8. Mould and Dampness",
      "9. Ventilation",
      "10. Structural Soundness",
      "11. Kitchen",
      "12. Laundry",
      "13. Bathroom Facilities",
      "14. Toilets",
    ]);
  });

  test("uses DOCX checklist wording for the inspection body", () => {
    const fields = getFieldMap(getTemplate());

    const expectedLabels = {
      "electrical-safety.switchboard-circuit-breaker":
        "Are all power outlets and lighting circuits connected to a switchboard-type circuit breaker complying with AS/NZS 3000?",
      "electrical-safety.rcd-present":
        "Are all power outlets and lighting circuits connected to a switchboard-type residual current device (RCD) complying with the relevant AS/NZS standards?",
      "bin-facilities.bin-general-standard":
        "Are both a rubbish bin and a recycling bin available for the renter's use - either council-supplied or vermin-proof and compatible with local collection services?",
      "external-entry-doors.living-room-external-door-standard":
        "Are all external doors (excluding any screen doors) fitted with compliant deadlocks?",
      "heating-summary.living-room-heater-fixed":
        "Is a fixed, energy-efficient heating system installed in the main living area?",
      "window-coverings-summary.living-room-window-coverings":
        "Does every window in a bedroom or living area have a curtain or blind that the renter can open and close to adequately block light and provide reasonable privacy?",
      "window-coverings-summary.openable-window-security":
        "Are all openable external windows able to be set in both an open and closed position, and secured with a functioning latch, lock, or bolt against external entry?",
      "window-covering-anchors.window-covering-anchor-installed":
        "Are all windows which has coverings, such as blinds and curtains have an anchor installed to secure the cords and prevent them from forming loops?",
      "lighting-summary.living-room-lighting-standard":
        "Do all interior rooms, corridors, and hallways have access to appropriate natural or artificial light suitable for their intended function?",
      "mould-dampness-summary.living-room-mould-standard":
        "Are all rooms in the premises free from mould or dampness caused by or related to the building structure?",
      "ventilation-summary.front-entrance-building-classification":
        "What is the designated building class of the rented premises?",
      "ventilation-summary.living-room-ventilation-standard":
        "Do all habitable rooms, bathrooms, shower rooms, toilets, and laundry areas have adequate ventilation in line with the required performance or deemed-to-satisfy standards?",
      "structural-soundness.living-room-bowing":
        "Is the rented premises structurally sound, weatherproof, and free from any significant risk of collapse, failure, or moisture ingress?",
      "kitchen.kitchen-stovetop-burners":
        "Is there a cooktop in good working order with at least two burners?",
      "laundry.laundry-cold-water-standard":
        "If laundry facilities are provided, are they connected to a reasonable supply of hot and cold water?",
      "bathroom-facilities.bathroom-showerhead-rating":
        "If a shower is present, does it have a shower head with a 3-star WELS rating (or a lower-rated head where a 3-star cannot be installed or would not operate effectively)?",
      "toilet-summary.toilet-location":
        "Is the toilet located in an enclosed room intended for use as a toilet area (either standalone or combined bathroom/laundry)?",
      "technician-signoff.mss-disclaimer": "Disclaimer",
    };

    for (const [fieldKey, label] of Object.entries(expectedLabels)) {
      expect(fields.get(fieldKey)?.label).toBe(label);
    }

    expect(fields.get("technician-signoff.mss-disclaimer")?.type).toBe(
      "static-text"
    );
    expect(fields.get("technician-signoff.mss-disclaimer")?.metadata).toMatchObject({
      readOnly: true,
      presentation: "plain-text",
      staticText: true,
    });
    expect(fields.get("technician-signoff.mss-disclaimer")?.defaultValue).toBe(
      "This property has been visually inspected by a compliance officer in accordance with applicable Australian Consumer and Competition Commission (ACCC) requirements and industry best practices."
    );
  });

  test("does not show repeated checklist source helper text in app sections", () => {
    const template = getTemplate();
    const checklistSections = template.sections.filter((section) =>
      /^\d+\./.test(section.title)
    );

    checklistSections.forEach((section) => {
      expect(section.description).toBeUndefined();
    });
  });

  test("requires one unrestricted multi-photo field in each checklist section", () => {
    const template = getTemplate();
    const checklistSections = template.sections.filter((section) =>
      /^\d+\./.test(section.title)
    );

    const photoFieldIds = checklistSections.map((section) => {
      const photoFields = section.fields.filter(
        (field) => field.type === "photo" || field.type === "photo-multi"
      );

      expect(photoFields).toHaveLength(1);
      expect(photoFields[0]).toMatchObject({
        type: "photo-multi",
        required: true,
      });
      expect(photoFields[0].metadata?.max).toBeUndefined();

      return photoFields[0].id;
    });

    expect(photoFieldIds).toEqual([
      "electrical-safety-photos",
      "bin-facilities-photos",
      "external-doors-photos",
      "heating-photos",
      "window-coverings-photos",
      "window-covering-anchors-photos",
      "lighting-photos",
      "mould-dampness-photos",
      "ventilation-photos",
      "structural-soundness-photos",
      "kitchen-photos",
      "laundry-photos",
      "bathroom-facilities-photos",
      "toilets-photos",
    ]);
  });

  test("keeps property summary and technician certification sections", () => {
    const fields = getFieldMap(getTemplate());

    [
      ["property-summary.inspection-date", "Inspection Date"],
      ["property-summary.inspector-name", "Inspector Name"],
      ["property-summary.inspector-license", "Inspector License Number"],
      ["property-summary.property-address", "Property Address"],
      ["technician-signoff.inspection-completion-date", "Inspection Completion Date"],
      ["technician-signoff.technician-signature", "Technician Signature"],
      ["technician-signoff.signature-date", "Date Signed"],
      ["technician-signoff.inspection-notes", "Final Inspection Notes"],
      ["technician-signoff.mss-disclaimer", "Disclaimer"],
    ].forEach(([fieldKey, label]) => {
      expect(fields.get(fieldKey)?.label).toBe(label);
    });

    expect(fields.get("technician-signoff.technician-signature")?.type).toBe(
      "signature"
    );
    expect(fields.has("technician-signoff.technician-name")).toBe(false);
    expect(fields.has("technician-signoff.technician-license")).toBe(false);
    expect(fields.has("technician-signoff.technician-declaration")).toBe(false);
    expect(fields.has("technician-signoff.declaration-statement")).toBe(false);
    expect(fields.has("property-summary.next-inspection-date")).toBe(false);
    expect(fields.get("property-summary.inspection-date")?.metadata).toMatchObject({
      readOnly: true,
      serverPrefilled: true,
    });
    expect(fields.get("property-summary.inspector-name")?.metadata).toMatchObject({
      readOnly: true,
      serverPrefilled: true,
    });
    expect(fields.get("property-summary.property-address")?.metadata).toMatchObject({
      readOnly: true,
      serverPrefilled: true,
    });
    expect(fields.get("property-summary.inspector-license")?.metadata).toBeUndefined();
  });

  test("removes non-DOCX legacy MSS detail fields", () => {
    const fields = getFieldMap(getTemplate());

    [
      "executive-summary.inspection-summary",
      "overall-summary.summary-kitchen",
      "front-entrance.front-entrance-weather-protection",
      "electrical-safety.electrical-compliance",
      "living-room.living-room-heater-make-model",
      "windows-latches-summary.bedroom-1-windows-can-open",
      "kitchen.kitchen-hot-water-seconds",
      "laundry.laundry-hot-water-seconds",
      "bedroom-1.bedroom-1-general-condition",
      "bathroom-1.bathroom-1-general-condition",
      "structural-cracking-summary.struct-cracking-living-room",
      "structural-warping-summary.struct-warping-living-room",
    ].forEach((fieldKey) => {
      expect(fields.has(fieldKey)).toBe(false);
    });
  });
});
