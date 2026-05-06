const fs = require("fs");
const path = require("path");

const loadCreateMinimumSafetyStandardTemplate = () => {
  const configPath = path.resolve(
    __dirname,
    "../src/config/inspectionTemplates.js"
  );
  const source = fs.readFileSync(configPath, "utf8");
  const executableSource = source
    .replace(
      "export { createMinimumSafetyStandardTemplate };",
      ""
    )
    .replace(
      "export const defaultInspectionTemplates =",
      "const defaultInspectionTemplates ="
    )
    .replace("export default defaultInspectionTemplates;", "")
    .concat("\nreturn createMinimumSafetyStandardTemplate;");

  return new Function(executableSource)();
};

describe("Minimum Safety Standard DOCX checklist wording", () => {
  const getFieldMap = () => {
    const createMinimumSafetyStandardTemplate =
      loadCreateMinimumSafetyStandardTemplate();
    const template = createMinimumSafetyStandardTemplate(1, 1);
    const fields = new Map();

    for (const section of template.sections) {
      for (const field of section.fields || []) {
        fields.set(`${section.id}.${field.id}`, field);
      }
    }

    return fields;
  };

  test("keeps existing IDs while applying the DOCX questions", () => {
    const fields = getFieldMap();

    const expectedLabels = {
      "electrical-safety.switchboard-circuit-breaker":
        "Are all power outlets and lighting circuits connected to a switchboard-type circuit breaker complying with AS/NZS 3000?",
      "electrical-safety.rcd-present":
        "Are all power outlets and lighting circuits connected to a switchboard-type residual current device (RCD) complying with the relevant AS/NZS standards?",
      "bin-facilities.bin-general-standard":
        "Are both a rubbish bin and a recycling bin available for the renter's use - either council-supplied or vermin-proof and compatible with local collection services?",
      "living-room.living-room-external-door-standard":
        "Are all external doors (excluding any screen doors) fitted with compliant deadlocks?",
      "living-room.living-room-heater-fixed":
        "Is a fixed, energy-efficient heating system installed in the main living area?",
      "bedroom-1.bedroom-1-window-coverings-installed":
        "Does every window in a bedroom or living area have a curtain or blind that the renter can open and close to adequately block light and provide reasonable privacy?",
      "bedroom-1.bedroom-1-windows-can-open":
        "Are all openable external windows able to be set in both an open and closed position?",
      "living-room.living-room-lighting-standard":
        "Do all interior rooms, corridors, and hallways have access to appropriate natural or artificial light suitable for their intended function?",
      "living-room.living-room-mould-standard":
        "Are all rooms in the premises free from mould or dampness caused by or related to the building structure?",
      "living-room.living-room-ventilation-standard":
        "Do all habitable rooms, bathrooms, shower rooms, toilets, and laundry areas have adequate ventilation in line with the required performance or deemed-to-satisfy standards?",
      "living-room.living-room-bowing":
        "Is the rented premises structurally sound, weatherproof, and free from any significant risk of collapse, failure, or moisture ingress?",
      "kitchen.kitchen-stovetop-burners":
        "Is there a cooktop in good working order with at least two burners?",
      "laundry.laundry-cold-water-standard":
        "If laundry facilities are provided, are they connected to a reasonable supply of hot and cold water?",
      "bathroom-1.bathroom-1-showerhead-rating":
        "If a shower is present, does it have a shower head with a 3-star WELS rating (or a lower-rated head where a 3-star cannot be installed or would not operate effectively)?",
      "bathroom-1.bathroom-1-toilet-location":
        "Is the toilet located in an enclosed room intended for use as a toilet area (either standalone or combined bathroom/laundry)?",
    };

    for (const [fieldKey, label] of Object.entries(expectedLabels)) {
      expect(fields.get(fieldKey)?.label).toBe(label);
    }
  });
});
