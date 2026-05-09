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
      "windows-latches-summary",
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
      "3. Locks - External Entry Doors",
      "4. Heating - Main Living Area",
      "5. Window Coverings - Living & Sleeping Rooms",
      "6. Windows & Latches",
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
      "windows-latches-summary.bedroom-1-windows-can-open":
        "Bedroom 1: Are all openable external windows able to be set in both an open and closed position, and secured with a functioning latch, lock, or bolt against external entry?",
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
      "bathroom-facilities.bathroom-1-showerhead-rating":
        "Bathroom 1: If a shower is present, does it have a shower head with a 3-star WELS rating (or a lower-rated head where a 3-star cannot be installed or would not operate effectively)?",
      "toilet-summary.bathroom-1-toilet-location":
        "Bathroom 1: Is the toilet located in an enclosed room intended for use as a toilet area (either standalone or combined bathroom/laundry)?",
    };

    for (const [fieldKey, label] of Object.entries(expectedLabels)) {
      expect(fields.get(fieldKey)?.label).toBe(label);
    }
  });

  test("keeps only relevant existing photo fields in the checklist body", () => {
    const template = getTemplate();
    const checklistSections = template.sections.filter((section) =>
      /^\d+\./.test(section.title)
    );
    const photoFieldIds = checklistSections.flatMap((section) =>
      section.fields
        .filter((field) => field.type === "photo" || field.type === "photo-multi")
        .map((field) => field.id)
    );

    expect(new Set(photoFieldIds)).toEqual(
      new Set([
        "switchboard-photo",
        "bin-general-photo",
        "bin-recycle-photo",
        "front-entrance-external-door-photo",
        "front-entrance-deadlock-photos",
        "living-room-heater-photo",
        "living-room-window-photo",
        "bedroom-1-window-coverings-photo",
        "bedroom-2-window-coverings-photo",
        "bedroom-1-windows-photo",
        "bedroom-2-windows-photo",
        "bedroom-1-mould-photo",
        "bedroom-2-mould-photo",
        "bathroom-1-mould-photo",
        "bathroom-2-mould-photo",
        "kitchen-food-prep-photo",
        "kitchen-sink-photo",
        "kitchen-stovetop-photo",
        "kitchen-oven-photo",
        "bathroom-1-shower-photo",
        "bathroom-1-bath-photo",
        "bathroom-1-washbasin-photo",
        "bathroom-2-shower-photo",
        "bathroom-2-bath-photo",
        "bathroom-2-washbasin-photo",
        "bathroom-1-toilet-photo",
        "bathroom-2-toilet-photo",
      ])
    );
  });

  test("removes non-DOCX legacy MSS detail fields", () => {
    const fields = getFieldMap(getTemplate());

    [
      "executive-summary.inspection-summary",
      "overall-summary.summary-kitchen",
      "front-entrance.front-entrance-weather-protection",
      "electrical-safety.electrical-compliance",
      "living-room.living-room-heater-make-model",
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
