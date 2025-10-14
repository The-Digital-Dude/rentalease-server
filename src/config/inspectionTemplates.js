const coverageOptions = [
  { value: "included", label: "Included" },
  { value: "not-included", label: "Not Included" },
  { value: "not-inspected", label: "Not Inspected" },
];

const inspectionStatusOptions = [
  { value: "satisfactory", label: "Satisfactory" },
  { value: "unsatisfactory", label: "Unsatisfactory" },
  { value: "not-inspected", label: "Not Inspected" },
];

const testingStatusOptions = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
  { value: "not-tested", label: "Not Tested" },
];

const yesNoOptions = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const smokeStatusOptions = [
  { value: "compliant", label: "Compliant" },
  { value: "requires-replacement", label: "Requires Replacement" },
  { value: "faulty", label: "Faulty" },
  { value: "not-present", label: "Not Present" },
];

const extentItems = [
  { id: "main-switchboard", label: "Main Switchboard" },
  { id: "main-earthing-system", label: "Main Earthing System" },
  { id: "kitchen", label: "Kitchen" },
  { id: "bathroom-main", label: "Bathroom (main)" },
  { id: "other-bathrooms", label: "Other bathrooms/ensuites" },
  { id: "laundry", label: "Laundry" },
  { id: "garage", label: "Garage" },
  { id: "living-room", label: "Living room" },
  { id: "other-living-areas", label: "Other living areas" },
  { id: "bedroom-main", label: "Bedroom (main)" },
  { id: "other-bedrooms", label: "Other bedrooms" },
  { id: "electric-water-heater", label: "Electric water heater" },
  { id: "electric-room-heaters", label: "Electric room/space heaters" },
  { id: "dishwasher", label: "Dishwasher" },
  { id: "solar-battery-system", label: "Solar/battery system" },
  { id: "swimming-pool-equipment", label: "Swimming pool equipment" },
];

const visualInspectionItems = [
  { id: "consumers-mains", label: "Consumers mains" },
  { id: "switchboards", label: "Switchboards" },
  { id: "exposed-earth-electrode", label: "Exposed earth electrode" },
  { id: "metallic-water-pipe-bond", label: "Metallic water pipe bond" },
  { id: "rcds", label: "RCDs (Safety switches)" },
  { id: "space-heaters", label: "Space heaters" },
  { id: "cooking-equipment", label: "Cooking equipment" },
  { id: "dishwasher-visual", label: "Dishwasher" },
  { id: "exhaust-fans", label: "Exhaust fans" },
  { id: "ceiling-fans", label: "Ceiling fans" },
  { id: "circuit-protection", label: "Circuit protection (circuit breakers / fuses)" },
  { id: "washing-machine-dryer", label: "Washing machine/dryer" },
  { id: "socket-outlets", label: "Socket-outlets" },
  { id: "light-fittings", label: "Light fittings" },
  { id: "installation-wiring", label: "Installation wiring" },
  { id: "solar-renewable", label: "Solar and other renewable systems" },
  { id: "electric-water-heater-visual", label: "Electric water heater" },
  { id: "swimming-pool-equipment-visual", label: "Swimming pool equipment" },
  { id: "air-conditioners", label: "Air conditioners" },
  { id: "vehicle-chargers", label: "Vehicle chargers" },
];

const polarityTestItems = [
  { id: "polarity-consumers-mains", label: "Consumers mains" },
  { id: "polarity-electric-water-heater", label: "Electric water heater" },
  { id: "polarity-circuit-protection", label: "Circuit protection (circuit breakers / fuses)" },
  { id: "polarity-air-conditioners", label: "Air conditioners" },
  { id: "polarity-rcds", label: "RCDs (Safety switches)" },
  { id: "polarity-cooking-equipment", label: "Cooking equipment" },
  { id: "polarity-dishwasher", label: "Dishwasher" },
  { id: "polarity-light-fittings", label: "Light fittings" },
  { id: "polarity-solar", label: "Solar and other renewable systems" },
  { id: "polarity-socket-outlets", label: "Socket-outlets" },
  { id: "polarity-swimming-pool", label: "Swimming pool equipment" },
  { id: "polarity-vehicle-chargers", label: "Vehicle chargers" },
];

const earthContinuityItems = [
  { id: "earth-mains", label: "Mains earth conductor" },
  { id: "earth-electric-water-heater", label: "Electric water heater" },
  { id: "earth-switchboard-enclosure", label: "Switchboards enclosure" },
  { id: "earth-air-conditioners", label: "Air conditioners" },
  { id: "earth-metallic-water-pipe", label: "Metallic water pipe bond" },
  { id: "earth-cooking-equipment", label: "Cooking equipment" },
  { id: "earth-socket-outlets", label: "Socket-outlets" },
  { id: "earth-light-fittings", label: "Light fittings" },
  { id: "earth-exhaust-fans", label: "Exhaust fans" },
  { id: "earth-ceiling-fans", label: "Ceiling fans" },
  { id: "earth-dishwasher", label: "Dishwasher" },
  { id: "earth-solar", label: "Solar and other renewable systems" },
  { id: "earth-swimming-pool", label: "Swimming pool equipment" },
  { id: "earth-vehicle-chargers", label: "Vehicle chargers" },
];

const createSmokeTableColumns = () => [
  { id: "voltage", label: "Voltage", type: "text", placeholder: "e.g. 9V" },
  {
    id: "status",
    label: "Status",
    type: "select",
    options: smokeStatusOptions,
    required: true,
  },
  { id: "location", label: "Location", type: "text", required: true },
  { id: "level", label: "Level", type: "text", placeholder: "e.g. G, 1" },
  { id: "expiration", label: "Expiration", type: "date" },
];

const createElectricalSmokeSections = () => [
  {
    id: "inspection-summary",
    title: "Inspection Summary",
    description: "Record key inspection details and outcomes.",
    fields: [
      {
        id: "inspection-date",
        label: "Inspection Date",
        type: "date",
        required: true,
      },
      {
        id: "previous-inspection-date",
        label: "Date of previous safety check (if any)",
        type: "date",
      },
      {
        id: "inspector-name",
        label: "Inspector name",
        type: "text",
        required: true,
      },
      {
        id: "license-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
      },
      {
        id: "registration-number",
        label: "Additional registration number",
        type: "text",
      },
      {
        id: "electrical-outcome",
        label: "Electrical safety check outcome",
        type: "select",
        options: [
          { value: "no-faults", label: "No faults identified" },
          { value: "faults-identified", label: "Faults identified" },
          { value: "repairs-required", label: "Repairs required" },
        ],
        required: true,
      },
      {
        id: "smoke-outcome",
        label: "Smoke alarm check outcome",
        type: "select",
        options: [
          { value: "no-faults", label: "No faults identified" },
          { value: "faults-identified", label: "Faults identified" },
          { value: "repairs-required", label: "Repairs required" },
        ],
        required: true,
      },
      {
        id: "summary-notes",
        label: "Next steps / notes",
        type: "textarea",
        placeholder: "Record recommended follow-up actions for the client",
      },
      {
        id: "contact-email",
        label: "Contact email",
        type: "text",
      },
      {
        id: "contact-phone",
        label: "Contact phone",
        type: "text",
      },
    ],
  },
  {
    id: "extent-of-installation",
    title: "Extent of Installation Checked",
    description:
      "Tick those parts of the installation included in the safety check. Mark NI if not inspected and add additional notes if required.",
    fields: [
      ...extentItems.map((item) => ({
        id: item.id,
        label: item.label,
        type: "select",
        options: coverageOptions,
        required: true,
      })),
      {
        id: "extent-notes",
        label: "Extent notes",
        type: "textarea",
        placeholder: "Document any limitations encountered",
      },
    ],
  },
  {
    id: "visual-inspection",
    title: "Visual Inspection",
    description:
      "Record the outcome of visual inspection per AS/NZS 3019 requirements.",
    fields: [
      ...visualInspectionItems.map((item) => ({
        id: item.id,
        label: item.label,
        type: "select",
        options: inspectionStatusOptions,
        required: true,
      })),
      {
        id: "visual-notes",
        label: "Visual inspection notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "testing-polarity",
    title: "Polarity & Correct Connections Testing",
    description:
      "Capture the outcome of polarity and correct connection testing.",
    fields: [
      ...polarityTestItems.map((item) => ({
        id: item.id,
        label: item.label,
        type: "select",
        options: testingStatusOptions,
        required: true,
      })),
      {
        id: "polarity-notes",
        label: "Testing notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "testing-earth",
    title: "Earth Continuity Testing",
    description: "Capture the outcome of earth continuity testing.",
    fields: [
      ...earthContinuityItems.map((item) => ({
        id: item.id,
        label: item.label,
        type: "select",
        options: testingStatusOptions,
        required: true,
      })),
      {
        id: "earth-continuity-notes",
        label: "Earth continuity notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "rcd-testing",
    title: "RCD Testing",
    fields: [
      {
        id: "rcd-test-result",
        label: "All RCDs have passed push and time tests",
        type: "select",
        options: [
          { value: "pass", label: "Pass" },
          { value: "fail", label: "Fail" },
          { value: "not-tested", label: "Not Tested" },
        ],
        required: true,
      },
      {
        id: "rcd-notes",
        label: "RCD notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "smoke-alarms",
    title: "Smoke Alarms",
    description:
      "Record compliance of smoke alarms including operational status and renewal dates.",
    fields: [
      {
        id: "smoke-alarms-operational",
        label: "All smoke alarms are correctly installed, operational, and tested",
        type: "select",
        options: yesNoOptions,
        required: true,
      },
      {
        id: "next-smoke-check-due",
        label: "Next smoke alarm check due",
        type: "date",
        required: true,
      },
      {
        id: "smoke-alarm-records",
        label: "Smoke alarm records",
        type: "table",
        columns: createSmokeTableColumns(),
        required: true,
      },
      {
        id: "smoke-notes",
        label: "Smoke alarm notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "certification",
    title: "Electrical Safety Check Certification",
    description:
      "Confirm completion of the electrical and smoke alarm safety check.",
    fields: [
      {
        id: "certification-electrician-name",
        label: "Electrical safety check completed by",
        type: "text",
        required: true,
      },
      {
        id: "certification-licence-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
      },
      {
        id: "certification-inspection-date",
        label: "Inspection date",
        type: "date",
        required: true,
      },
      {
        id: "certification-next-inspection-due",
        label: "Next inspection due by",
        type: "date",
        required: true,
      },
      {
        id: "certification-signed-at",
        label: "Signed at (timestamp)",
        type: "text",
        placeholder: "e.g. Oct 7, 2024 11:11 am",
      },
      {
        id: "certification-signature",
        label: "Signature",
        type: "signature",
      },
      {
        id: "certification-notes",
        label: "Certification notes",
        type: "textarea",
      },
    ],
  },
];

const gasTemplate = {
  jobType: "Gas",
  title: "Gas Safety Inspection",
  version: 2,
  metadata: {
    category: "compliance",
    durationEstimateMins: 60,
  },
  sections: [
    {
      id: "property-details",
      title: "Property Details",
      description: "Basic property and inspection information",
      fields: [
        {
          id: "inspection-date",
          label: "Inspection Date",
          type: "date",
          required: true,
        },
        {
          id: "inspector-name",
          label: "Inspector Name",
          type: "text",
          required: true,
        },
        {
          id: "license-number",
          label: "License Number",
          type: "text",
          required: true,
        },
        {
          id: "vba-record-number",
          label: "VBA Record Number",
          type: "text",
          required: false,
        },
      ],
    },
    {
      id: "gas-installation",
      title: "Gas Installation",
      description: "Check LP Gas cylinders and installation components",
      fields: [
        {
          id: "lp-gas-cylinders",
          label: "LP Gas cylinders and associated components (i.e. Regulators, pigtails) installed correctly",
          type: "yes-no-na",
          required: true,
        },
        {
          id: "gas-leakage-test",
          label: "Gas installation leakage test",
          type: "pass-fail",
          required: true,
        },
        {
          id: "gas-installation-comments",
          label: "Comments",
          type: "textarea",
          placeholder: "Add any observations about the gas installation",
        },
        {
          id: "gas-installation-photo",
          label: "Gas Installation Photo",
          type: "photo",
          required: false,
        },
      ],
    },
    {
      id: "appliance-1",
      title: "Appliance 1: Cooker",
      description: "Complete inspection checklist for the gas cooker",
      fields: [
        {
          id: "app1-isolation-valve",
          label: "Appliance isolation valve",
          type: "yes-no-na",
          required: true,
        },
        {
          id: "app1-electrically-safe",
          label: "Electrically safe",
          type: "yes-no",
          required: true,
        },
        {
          id: "app1-adequate-ventilation",
          label: "Adequate ventilation",
          type: "yes-no",
          required: true,
        },
        {
          id: "app1-adequate-clearances",
          label: "Adequate clearances to combustible surfaces",
          type: "yes-no",
          required: true,
        },
        {
          id: "app1-as4575-compliance",
          label: "Completed service in accordance with AS 4575 (VBA online system report)",
          type: "yes-no",
          required: true,
        },
        {
          id: "app1-comments",
          label: "Comments",
          type: "textarea",
          placeholder: "Add any observations about this appliance",
        },
        {
          id: "app1-location-photo",
          label: "Location Photo",
          type: "photo",
          helpText: "Take a photo showing the appliance in its location",
        },
        {
          id: "app1-data-plate",
          label: "Data Plate",
          type: "photo",
          helpText: "Take a photo of the manufacturer's data plate",
        },
      ],
    },
    {
      id: "appliance-2",
      title: "Appliance 2: Hot Water Heater",
      description: "Complete inspection checklist for the gas hot water heater",
      fields: [
        {
          id: "app2-isolation-valve",
          label: "Appliance isolation valve",
          type: "yes-no-na",
          required: true,
        },
        {
          id: "app2-electrically-safe",
          label: "Electrically safe",
          type: "yes-no",
          required: true,
        },
        {
          id: "app2-adequate-ventilation",
          label: "Adequate ventilation",
          type: "yes-no",
          required: true,
        },
        {
          id: "app2-adequate-clearances",
          label: "Adequate clearances to combustible surfaces",
          type: "yes-no",
          required: true,
        },
        {
          id: "app2-as4575-compliance",
          label: "Completed service in accordance with AS 4575 (VBA online system report)",
          type: "yes-no",
          required: true,
        },
        {
          id: "app2-comments",
          label: "Comments",
          type: "textarea",
          placeholder: "Add any observations about this appliance",
        },
        {
          id: "app2-location-photo",
          label: "Location Photo",
          type: "photo",
          helpText: "Take a photo showing the appliance in its location",
        },
        {
          id: "app2-data-plate",
          label: "Data Plate",
          type: "photo",
          helpText: "Take a photo of the manufacturer's data plate",
        },
      ],
    },
    {
      id: "appliance-3",
      title: "Appliance 3: Ducted Heater",
      description: "Complete inspection checklist for the gas ducted heater",
      fields: [
        {
          id: "app3-isolation-valve",
          label: "Appliance isolation valve",
          type: "yes-no-na",
          required: true,
        },
        {
          id: "app3-electrically-safe",
          label: "Electrically safe",
          type: "yes-no",
          required: true,
        },
        {
          id: "app3-adequate-ventilation",
          label: "Adequate ventilation",
          type: "yes-no",
          required: true,
        },
        {
          id: "app3-adequate-clearances",
          label: "Adequate clearances to combustible surfaces",
          type: "yes-no",
          required: true,
        },
        {
          id: "app3-as4575-compliance",
          label: "Completed service in accordance with AS 4575 (VBA online system report)",
          type: "yes-no",
          required: true,
        },
        {
          id: "app3-comments",
          label: "Comments",
          type: "textarea",
          placeholder: "Add any observations about this appliance",
        },
        {
          id: "app3-location-photo",
          label: "Location Photo",
          type: "photo",
          helpText: "Take a photo showing the appliance in its location",
        },
        {
          id: "app3-data-plate",
          label: "Data Plate",
          type: "photo",
          helpText: "Take a photo of the manufacturer's data plate",
        },
      ],
    },
    {
      id: "fault-identification",
      title: "Details Of Identified Faults & Remedial Action To Be Taken",
      description: "Document any faults found and required remedial actions",
      fields: [
        {
          id: "fault-identified",
          label: "Identified Fault(s)",
          type: "textarea",
          placeholder: "Describe any faults identified during the inspection",
        },
        {
          id: "rectification-required",
          label: "Rectification Required",
          type: "textarea",
          placeholder: "Detail the rectification work required",
        },
        {
          id: "fault-location",
          label: "Location",
          type: "text",
          placeholder: "Specify the location of the fault",
        },
        {
          id: "assessment-status",
          label: "Assessment",
          type: "select",
          options: [
            { value: "compliant", label: "Compliant" },
            { value: "non-compliant", label: "Non Compliant" },
            { value: "unsafe", label: "Unsafe" },
          ],
        },
        {
          id: "fault-image",
          label: "Assessment Image",
          type: "photo",
          helpText: "Take a photo of the identified fault",
        },
      ],
    },
    {
      id: "compliance-declaration",
      title: "Appliance Servicing Regulation",
      description: "AS4575 compliance declaration",
      fields: [
        {
          id: "serviced-as4575",
          label: "I have serviced all appliances in accordance with AS 4575",
          type: "yes-no",
          required: true,
        },
        {
          id: "created-vba-record",
          label: "I have created a record (VBA online) under regulation 36(2) or 37(2) of the Gas Safety Regulations 2018 and provided a copy to the rental provider under regulation 30(1)(ab) of the Residential Tenancies Regulations 2021",
          type: "yes-no",
          required: true,
        },
      ],
    },
    {
      id: "final-declaration",
      title: "Declaration",
      description: "Final compliance assessment and technician declaration",
      fields: [
        {
          id: "overall-assessment",
          label: "Overall Assessment",
          type: "select",
          required: true,
          options: [
            { value: "compliant", label: "Compliant – gas appliance or gas installation complies with the criteria for a 'gas safety check'" },
            { value: "non-compliant", label: "Non-Compliant – no immediate risk, however remedial work is required" },
            { value: "unsafe", label: "Unsafe – gas appliance or its installation is unsafe and requires disconnection and urgent work" },
          ],
        },
        {
          id: "technician-signature",
          label: "Signed by gasfitter",
          type: "signature",
          required: true,
        },
        {
          id: "next-check-due",
          label: "Next gas safety check due",
          type: "date",
          required: true,
          helpText: "Next gas safety check is due within 24 months",
        },
      ],
    },
  ],
};

const createElectricalTemplate = () => ({
  jobType: "Electrical",
  title: "Electrical & Smoke Safety Inspection",
  version: 2,
  metadata: {
    category: "compliance",
    durationEstimateMins: 60,
  },
  sections: createElectricalSmokeSections(),
});

const createSmokeTemplate = () => ({
  jobType: "Smoke",
  title: "Smoke Alarm & Electrical Safety Inspection",
  version: 2,
  metadata: {
    category: "compliance",
    durationEstimateMins: 45,
  },
  sections: createElectricalSmokeSections(),
});

export const defaultInspectionTemplates = [
  createElectricalTemplate(),
  gasTemplate,
  createSmokeTemplate(),
];

export default defaultInspectionTemplates;
