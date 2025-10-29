// Default placeholder image URL for testing
const DEFAULT_PLACEHOLDER_IMAGE = "https://picsum.photos/400/300";

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

const passFailOptions = [
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
];

const complianceStatusOptions = [
  { value: "compliant", label: "Compliant" },
  { value: "non-compliant", label: "Non-Compliant" },
  { value: "not-applicable", label: "Not Applicable" },
];

const meetsStandardOptions = [
  { value: "meets", label: "Meets Minimum Standards" },
  { value: "does_not_meet", label: "Does Not Meet Minimum Standards" },
  { value: "not_applicable", label: "Not Applicable" },
];

const presentOptions = [
  { value: "present", label: "Present in Room" },
  { value: "not_present", label: "Not Present in Room" },
  { value: "not_applicable", label: "Not Applicable" },
];

const lightingTypeOptions = [
  { value: "natural", label: "Natural" },
  { value: "artificial", label: "Artificial" },
  { value: "combination", label: "Combination" },
];

const ventilationTypeOptions = [
  { value: "natural", label: "Natural" },
  { value: "mechanical", label: "Mechanical" },
  { value: "borrowed", label: "Borrowed" },
  { value: "none", label: "None" },
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
  {
    id: "circuit-protection",
    label: "Circuit protection (circuit breakers / fuses)",
  },
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
  {
    id: "polarity-circuit-protection",
    label: "Circuit protection (circuit breakers / fuses)",
  },
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

const buildSmokeAlarmsSection = () => ({
  id: "smoke-alarms",
  title: "Smoke Alarms",
  description:
    "Record compliance of smoke alarms including operational status and renewal dates.",
  fields: [
    {
      id: "smoke-alarms-operational",
      label:
        "All smoke alarms are correctly installed, operational, and tested",
      type: "select",
      options: yesNoOptions,
      required: true,
      defaultValue: "yes",
    },
    {
      id: "next-smoke-check-due",
      label: "Next smoke alarm check due",
      type: "date",
      required: true,
      defaultValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 1 year from now
    },
    {
      id: "smoke-alarm-records",
      label: "Smoke alarm records",
      type: "table",
      columns: createSmokeTableColumns(),
      required: true,
      defaultValue: [
        {
          voltage: "9V",
          status: "compliant",
          location: "Hallway",
          level: "G",
          expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // 1 year from now
        },
      ],
    },
    {
      id: "smoke-notes",
      label: "Smoke alarm notes",
      type: "textarea",
    },
  ],
});

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
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "previous-inspection-date",
        label: "Date of previous safety check (if any)",
        type: "date",
        defaultValue: "2023-10-07",
      },
      {
        id: "inspector-name",
        label: "Inspector name",
        type: "text",
        required: true,
        defaultValue: "Daniel Smith",
      },
      {
        id: "license-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
        defaultValue: "32399",
      },
      {
        id: "registration-number",
        label: "Additional registration number",
        type: "text",
        defaultValue: "EW123456",
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
        defaultValue: "no-faults",
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
        defaultValue: "no-faults",
      },
      {
        id: "summary-notes",
        label: "Next steps / notes",
        type: "textarea",
        placeholder: "Record recommended follow-up actions for the client",
        defaultValue:
          "Good news! No electrical faults were found at this property.\nWe'll reach out in 2 years for your next compliance check. If you need any repairs or maintenance in the meantime, contact the RentalEase team for a free call-out and quote.",
      },
      {
        id: "contact-email",
        label: "Contact email",
        type: "text",
        defaultValue: "support@checkhero.com.au",
      },
      {
        id: "contact-phone",
        label: "Contact phone",
        type: "text",
        defaultValue: "03 7067 8237",
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
        defaultValue: "included",
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
        defaultValue: "satisfactory",
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
        defaultValue: "pass",
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
        defaultValue: "pass",
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
        defaultValue: "pass",
      },
      {
        id: "rcd-notes",
        label: "RCD notes",
        type: "textarea",
      },
    ],
  },
  buildSmokeAlarmsSection(),
  {
    id: "inspection-photos",
    title: "Inspection Photos",
    description:
      "Upload photos taken during the electrical and smoke alarm inspection.",
    fields: [
      {
        id: "switchboard-photos",
        label: "Switchboard",
        type: "photo-multi",
        helpText: "Take photos of the electrical switchboard and components",
      },
      {
        id: "smoke-alarm-photos",
        label: "Smoke Alarm",
        type: "photo-multi",
        helpText: "Take photos of smoke alarms showing location and details",
      },
      {
        id: "aircon-photos",
        label: "Aircon",
        type: "photo-multi",
        helpText:
          "Take photos of air conditioning units and electrical connections",
      },
      {
        id: "gpo-tester-photos",
        label: "GPO with tester lit up",
        type: "photo-multi",
        helpText:
          "Take photos of GPO outlets with electrical tester showing results",
      },
      {
        id: "oven-photos",
        label: "Oven",
        type: "photo-multi",
        helpText:
          "Take photos of oven and cooking equipment electrical connections",
      },
      {
        id: "rangehood-photos",
        label: "Rangehood",
        type: "photo-multi",
        helpText:
          "Take photos of rangehood and exhaust fan electrical connections",
      },
      {
        id: "additional-photos",
        label: "Additional Photos",
        type: "photo-multi",
        helpText: "Upload any additional photos relevant to the inspection",
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
        defaultValue: "Daniel Smith",
      },
      {
        id: "certification-licence-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
        defaultValue: "32399",
      },
      {
        id: "certification-inspection-date",
        label: "Inspection date",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "certification-next-inspection-due",
        label: "Next inspection due by",
        type: "date",
        required: true,
        defaultValue: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 2 years from now
      },
      {
        id: "certification-signed-at",
        label: "Signed at (timestamp)",
        type: "text",
        placeholder: "e.g. Oct 7, 2024 11:11 am",
        defaultValue: new Date().toLocaleDateString("en-AU", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
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
          label:
            "LP Gas cylinders and associated components (i.e. Regulators, pigtails) installed correctly",
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
          label:
            "Completed service in accordance with AS 4575 (VBA online system report)",
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
          label:
            "Completed service in accordance with AS 4575 (VBA online system report)",
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
          label:
            "Completed service in accordance with AS 4575 (VBA online system report)",
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
    /*  {
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
    }, */
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
          label:
            "I have created a record (VBA online) under regulation 36(2) or 37(2) of the Gas Safety Regulations 2018 and provided a copy to the rental provider under regulation 30(1)(ab) of the Residential Tenancies Regulations 2021",
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
            {
              value: "compliant",
              label:
                "Compliant – gas appliance or gas installation complies with the criteria for a 'gas safety check'",
            },
            {
              value: "non-compliant",
              label:
                "Non-Compliant – no immediate risk, however remedial work is required",
            },
            {
              value: "unsafe",
              label:
                "Unsafe – gas appliance or its installation is unsafe and requires disconnection and urgent work",
            },
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

const createElectricalSections = () => [
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
        defaultValue: new Date().toISOString().split("T")[0],
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
        defaultValue: "Jordan Smith",
      },
      {
        id: "license-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
        defaultValue: "A334455",
      },
      {
        id: "registration-number",
        label: "Additional registration number",
        type: "text",
        defaultValue: "REC002918",
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
        defaultValue: "no-faults",
      },
      {
        id: "summary-notes",
        label: "Next steps / notes",
        type: "textarea",
        placeholder: "Record recommended follow-up actions for the client",
        defaultValue:
          "Electrical safety compliance confirmed. No remedial work required.",
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
        defaultValue: "included",
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
        defaultValue: "satisfactory",
      })),
      {
        id: "visual-notes",
        label: "Visual inspection notes",
        type: "textarea",
        placeholder: "Add any additional context for the visual assessment",
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
        defaultValue: "pass",
      })),
      {
        id: "polarity-notes",
        label: "Testing notes",
        type: "textarea",
        placeholder: "Add any additional notes captured during testing",
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
        defaultValue: "pass",
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
        defaultValue: "pass",
      },
      {
        id: "rcd-notes",
        label: "RCD notes",
        type: "textarea",
      },
    ],
  },
  {
    id: "fault-identification",
    title: "Identified Faults & Remedial Actions",
    description: "Document any faults found and required remedial actions.",
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
        defaultValue: "compliant",
      },
      {
        id: "fault-image",
        label: "Assessment Image",
        type: "photo",
        helpText: "Take a photo of the identified fault",
      },
    ],
  },
  buildSmokeAlarmsSection(),
  {
    id: "inspection-photos",
    title: "Inspection Photos",
    description: "Upload photos taken during the electrical safety inspection.",
    fields: [
      {
        id: "switchboard-photos",
        label: "Switchboard",
        type: "photo-multi",
        helpText: "Capture the main switchboard and safety devices",
      },
      {
        id: "gpo-tester-photos",
        label: "GPO Test Evidence",
        type: "photo-multi",
        helpText:
          "Take photos of GPO outlets with electrical tester showing results",
      },
      {
        id: "meter-photos",
        label: "Supply Meter",
        type: "photo-multi",
        helpText: "Document the supply meter and service fuse",
      },
      {
        id: "additional-photos",
        label: "Additional Photos",
        type: "photo-multi",
        helpText: "Upload any additional photos relevant to the inspection",
      },
    ],
  },
  {
    id: "certification",
    title: "Technician Sign-Off",
    description: "Confirm completion of the electrical safety check.",
    fields: [
      {
        id: "certification-electrician-name",
        label: "Electrical safety check completed by",
        type: "text",
        required: true,
        defaultValue: "Jordan Smith",
      },
      {
        id: "certification-licence-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
        defaultValue: "A334455",
      },
      {
        id: "certification-inspection-date",
        label: "Inspection date",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "certification-next-inspection-due",
        label: "Next inspection due by",
        type: "date",
        required: true,
        defaultValue: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
      {
        id: "certification-declaration",
        label:
          "I conducted this inspection in accordance with the Residential Tenancies Regulations 2021 and AS/NZS 3019 – Electrical Installations.",
        type: "checkbox",
        required: true,
        defaultValue: true,
      },
      {
        id: "certification-signature",
        label: "Technician signature",
        type: "signature",
        required: true,
      },
      {
        id: "certification-signed-at",
        label: "Signed at (timestamp)",
        type: "text",
        placeholder: "e.g. Oct 7, 2024 11:11 am",
        defaultValue: new Date().toLocaleDateString("en-AU", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      },
      {
        id: "certification-notes",
        label: "Certification notes",
        type: "textarea",
        placeholder: "Add any final remarks",
      },
    ],
  },
];

const createElectricalTemplate = () => ({
  jobType: "Electrical",
  title: "Electrical Safety Inspection",
  version: 3,
  metadata: {
    category: "compliance",
    durationEstimateMins: 60,
    requiresSignature: true,
    requiresPhotos: true,
    summary: "Electrical installation safety inspection",
  },
  sections: createElectricalSections(),
});

const createSmokeTemplate = () => ({
  jobType: "Smoke",
  title: "Smoke Alarm Safety Inspection (Smoke Only)",
  version: 3,
  metadata: {
    category: "compliance",
    durationEstimateMins: 45,
    standards: ["AS 3786", "RTA VIC 2021"],
    requiresPhotos: true,
    requiresSignature: true,
    summary: "Smoke alarm compliance report (smoke only)",
  },
  sections: createSmokeOnlySections(),
});

// Legacy smoke template that uses electrical sections (for backward compatibility)
const createLegacySmokeTemplate = () => ({
  jobType: "Smoke",
  title: "Smoke Alarm & Electrical Safety Inspection",
  version: 2,
  metadata: {
    category: "compliance",
    durationEstimateMins: 45,
  },
  sections: createElectricalSmokeSections(),
});

const formatStatusFieldSet = (id, label, { helpText } = {}) => [
  {
    id,
    label,
    type: "select",
    required: true,
    options: meetsStandardOptions,
    defaultValue: "meets",
    helpText,
  },
  {
    id: `${id}-comments`,
    label: `${label} Comments`,
    type: "textarea",
    placeholder: "Provide details when standards are not met",
    defaultValue: "N/A",
  },
];

const formatPresenceFieldSet = (id, label) => [
  {
    id,
    label,
    type: "select",
    required: true,
    options: presentOptions,
    defaultValue: "present",
  },
  {
    id: `${id}-action`,
    label: `${label} Action`,
    type: "textarea",
    placeholder: "Describe action required when item is not present",
    defaultValue: "No action required",
  },
];

const buildStatusSection = (sectionId, title, rows, description) => ({
  id: sectionId,
  title,
  description,
  fields: rows
    .map((row) =>
      formatStatusFieldSet(row.id, row.label, { helpText: row.helpText })
    )
    .flat(),
});

const createRoomFieldId = (roomType, roomNumber, suffix) =>
  `${roomType}-${roomNumber}-${suffix}`;

const createBedroomSection = (bedroomNumber) => {
  const roomId = `bedroom-${bedroomNumber}`;
  const fieldId = (suffix) =>
    createRoomFieldId("bedroom", bedroomNumber, suffix);

  return {
    id: roomId,
    title: `Bedroom ${bedroomNumber}`,
    description: `Safety assessment for Bedroom ${bedroomNumber}`,
    fields: [
      {
        id: fieldId("general-condition"),
        label: "General Condition",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("external-door-present"),
        label: "Is there an external door present?",
        type: "yes-no",
        required: true,
        defaultValue: "no",
      },
      {
        id: fieldId("windows-present"),
        label: "Are there windows in the room?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("windows-operable-count"),
        label: "How many windows are designed to open and close?",
        type: "number",
        min: 0,
        placeholder: "Enter number of operable windows",
      },
      {
        id: fieldId("windows-operable"),
        label: "Are any of the windows designed to open and close?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("windows-can-open"),
        label: "Can all openable windows be set to open and closed position?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("windows-photo"),
        label: "Photo of every openable window with latch visible/missing",
        type: "photo-multi",
        metadata: { max: 6 },
        helpText:
          "Capture each openable window clearly showing latch hardware.",
      },
      {
        id: fieldId("windows-locks"),
        label: "Do all the openable windows have functioning latch or lock?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("windows-condition"),
        label: "Window Condition",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("windows-standard"),
        label: "MINIMUM STANDARDS: Do the windows meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("window-coverings-present"),
        label: "Is there a window in the room?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("window-coverings-photo"),
        label: "Photo of the window area",
        type: "photo",
      },
      {
        id: fieldId("window-coverings-installed"),
        label: "Do all the windows have window coverings?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("window-coverings-light"),
        label: "Do all the window coverings reasonably block out light?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("window-coverings-standard"),
        label:
          "MINIMUM STANDARDS: Do the window coverings meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("lighting-type"),
        label: "What type of lighting is present?",
        type: "select",
        options: lightingTypeOptions,
        required: true,
        defaultValue: "natural",
      },
      {
        id: fieldId("lighting-day"),
        label: "Does the room have adequate lighting during daylight hours?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("lighting-night"),
        label: "Does the room have adequate lighting during nighttime hours?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("lighting-standard"),
        label:
          "MINIMUM STANDARDS: Does the lighting meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("moisture-photo"),
        label: "Photo of moisture reading on a wall",
        type: "photo",
      },
      {
        id: fieldId("moisture-reading"),
        label: "Moisture reading meter (Dry or Wet?)",
        type: "text",
        placeholder: "Enter reading e.g. 0 or Dry",
        defaultValue: "0",
      },
      {
        id: fieldId("mould-present"),
        label: "Is there any mould present?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("mould-location"),
        label: "Where is mould present?",
        type: "text",
        defaultValue: "None",
      },
      {
        id: fieldId("mould-photo"),
        label: "Photo of the full mould area",
        type: "photo",
      },
      {
        id: fieldId("mould-photo-close"),
        label: "Close up photo of the mould",
        type: "photo",
      },
      {
        id: fieldId("water-staining"),
        label: "Is there any water staining or dampness present?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("mould-standard"),
        label:
          "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("mould-comment"),
        label: "Mould and dampness comments",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("ventilation-has"),
        label:
          "Does the room have means of ventilation with outdoor air to maintain adequate air supply?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("ventilation-type"),
        label: "Type of ventilation in the room",
        type: "select",
        options: ventilationTypeOptions,
        required: true,
        defaultValue: "natural",
      },
      {
        id: fieldId("ventilation-standard"),
        label:
          "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("ventilation-comment"),
        label: "Ventilation comments",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("bowing"),
        label:
          "Is there any severe bowing or leaning of walls in the property?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("bowing-standard"),
        label:
          "MINIMUM STANDARDS: Does the room meet bowing and leaning standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("cracking"),
        label: "Is there any cracking in the room?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("cracking-standard"),
        label:
          "MINIMUM STANDARDS: Does the area cracking meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("warping"),
        label: "Is there any warping or movement of floors in the property?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("warping-standard"),
        label:
          "MINIMUM STANDARDS: Does the room meet warping or movement standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("overall-standard"),
        label:
          "ROOM OVERALL: Does the area overall meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("overall-comment"),
        label: "Mandatory additional comments if the room fails",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("room-photo"),
        label: `Bedroom ${bedroomNumber} Photo`,
        type: "photo",
        required: true,
        defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
      },
    ],
  };
};

const createBathroomSection = (bathroomNumber) => {
  const roomId = `bathroom-${bathroomNumber}`;
  const fieldId = (suffix) =>
    createRoomFieldId("bathroom", bathroomNumber, suffix);

  return {
    id: roomId,
    title: `Bathroom ${bathroomNumber}`,
    description: `Safety assessment for Bathroom ${bathroomNumber}`,
    fields: [
      {
        id: fieldId("general-condition"),
        label: "General Condition",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("cold-water-adequate"),
        label: "Is there an adequate supply/flow of cold water?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("hot-water-adequate"),
        label: "Is there an adequate supply/flow of hot water?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("hot-water-seconds"),
        label: "How many seconds for the water to run hot?",
        type: "number",
        min: 0,
        placeholder: "Enter seconds",
      },
      {
        id: fieldId("hot-water-issues"),
        label: "Are there any issues with the hot water supply/flow?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("cold-water-standard"),
        label: "Does the cold water supply/flow meet minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("hot-water-standard"),
        label: "Does the hot water supply/flow meet minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("water-pressure"),
        label: "Water Pressure",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("drainage"),
        label: "Drainage",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("electrical-safety"),
        label: "Electrical Safety (outlets, lighting)",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("ventilation-type"),
        label: "Type of ventilation in the room",
        type: "select",
        options: ventilationTypeOptions,
        required: true,
        defaultValue: "mechanical",
      },
      {
        id: fieldId("ventilation-standard"),
        label:
          "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("borrowed-ventilation"),
        label: "Is there borrowed ventilation?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("ventilation-comment"),
        label: "Ventilation comments",
        type: "textarea",
      },
      {
        id: fieldId("waterproofing"),
        label: "Waterproofing and Sealing",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("safety-features"),
        label: "Safety Features (grab rails, non-slip)",
        type: "select",
        required: true,
        options: passFailOptions,
        defaultValue: "pass",
      },
      {
        id: fieldId("shower-present"),
        label: "Is there a shower in the bathroom?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("shower-photo"),
        label: "Photo of shower in the bathroom",
        type: "photo",
      },
      {
        id: fieldId("bath-present"),
        label: "Is there a bath in the bathroom?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("bath-photo"),
        label: "Photo of bath in the bathroom",
        type: "photo",
      },
      {
        id: fieldId("showerhead-rating"),
        label: "Is the energy rating of the shower head visible?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("washbasin-present"),
        label: "Is there a washbasin in the bathroom?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("washbasin-photo"),
        label: "Photo of washbasin in the bathroom",
        type: "photo",
      },
      {
        id: fieldId("washbasin-comment"),
        label: "Additional washbasin comments",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("toilet-present"),
        label: "Is there a toilet in the room?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("toilet-photo"),
        label: "Toilet photo",
        type: "photo",
      },
      {
        id: fieldId("toilet-location"),
        label: "Approved location of the toilet",
        type: "yes-no",
        helpText: "Confirm the toilet is located within an approved space.",
        defaultValue: "yes",
      },
      {
        id: fieldId("toilet-window"),
        label: "Is there a window that opens in the toilet room?",
        type: "yes-no",
        defaultValue: "yes",
      },
      {
        id: fieldId("toilet-working"),
        label: "Is the toilet in good working order?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("toilet-connection"),
        label: "Is the toilet connected to sewerage or waste treatment system?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("toilet-standard"),
        label: "MINIMUM STANDARDS: Does the toilet meet minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("mould-present"),
        label: "Is there any mould present?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("mould-location"),
        label: "Where is mould present?",
        type: "text",
        defaultValue: "None",
      },
      {
        id: fieldId("mould-photo"),
        label: "Photo of the full mould area",
        type: "photo",
      },
      {
        id: fieldId("mould-photo-close"),
        label: "Close up photo of the mould",
        type: "photo",
      },
      {
        id: fieldId("water-staining"),
        label: "Is there any water staining or dampness present?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("mould-standard"),
        label:
          "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("mould-comment"),
        label: "Mould and dampness comments",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("bowing"),
        label:
          "Is there any severe bowing or leaning of walls in the property?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("bowing-standard"),
        label:
          "MINIMUM STANDARDS: Does the room meet bowing and leaning standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("cracking"),
        label: "Is there any cracking in the room?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("cracking-standard"),
        label:
          "MINIMUM STANDARDS: Does the area cracking meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("warping"),
        label: "Is there any warping or movement of floors in the property?",
        type: "yes-no",
        defaultValue: "no",
      },
      {
        id: fieldId("warping-standard"),
        label:
          "MINIMUM STANDARDS: Does the room meet warping or movement standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("overall-standard"),
        label:
          "ROOM OVERALL: Does the area overall meet the minimum standards?",
        type: "yes-no",
        required: true,
        defaultValue: "yes",
      },
      {
        id: fieldId("overall-comment"),
        label: "Mandatory additional comments if the room fails",
        type: "textarea",
        defaultValue: "N/A",
      },
      {
        id: fieldId("room-photo"),
        label: `Bathroom ${bathroomNumber} Photo`,
        type: "photo",
        required: true,
        defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
      },
    ],
  };
};

const createLivingRoomSection = () => ({
  id: "living-room",
  title: "Living Room",
  description:
    "Assessment of the main living room, heating and compliance checks",
  fields: [
    {
      id: "living-room-photo",
      label: "Photo of room",
      type: "photo",
      defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
    },
    {
      id: "living-room-window-present",
      label: "Is there a window in the room?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-window-photo",
      label: "Photo of the window area",
      type: "photo",
    },
    {
      id: "living-room-window-coverings",
      label: "Do all the windows have window coverings?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-window-coverings-light",
      label: "Do the window coverings reasonably block out light?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-window-coverings-standard",
      label:
        "MINIMUM STANDARDS: Do the window coverings meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-fixed",
      label: "Is there a fixed heater in the main living area?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-photo",
      label: "Photo of the heating unit in the main living area",
      type: "photo",
    },
    {
      id: "living-room-heater-type",
      label: "Type of heating device",
      type: "text",
      placeholder: "e.g. Split system",
      defaultValue: "Split system",
    },
    {
      id: "living-room-heater-make-model",
      label: "Make and model of the heating unit",
      type: "text",
      placeholder: "Enter make and model",
      defaultValue: "Fujitsu Auto",
    },
    {
      id: "living-room-heater-plugged",
      label: "Is the heater plugged in?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-tested",
      label: "I confirm I have turned the heater on",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-working",
      label: "Is the heater turning on and in good working order?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-control",
      label: "Is the heater control accessible?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-heater-energy",
      label: "Visible energy rating",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-heater-standard",
      label:
        "MINIMUM STANDARDS: Does the main living area heating meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-external-door-present",
      label: "Is there an external door present?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-external-door-photo",
      label: "Photo of external door (outside and inside)",
      type: "photo-multi",
      metadata: { max: 2 },
    },
    {
      id: "living-room-external-door-deadlock",
      label: "Does the external door have a deadlock/deadlatch function?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-external-door-installable",
      label: "Is a deadlock/deadlatch able to be installed on this door?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-external-door-standard",
      label: "Does the external door meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-external-door-comment",
      label: "External door comments",
      type: "textarea",
      placeholder: "Record reason if door does not meet the standard",
      defaultValue: "N/A",
    },
    {
      id: "living-room-lighting-type",
      label: "What type of lighting is present?",
      type: "select",
      options: lightingTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "living-room-lighting-day",
      label: "Does the room have adequate lighting during daylight hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-lighting-night",
      label: "Does the room have adequate lighting during nighttime hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-lighting-standard",
      label: "MINIMUM STANDARDS: Does the lighting meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-moisture-photo",
      label: "Photo of moisture reading on a wall",
      type: "photo",
    },
    {
      id: "living-room-moisture-reading",
      label: "Moisture reading meter (Dry or Wet?)",
      type: "text",
      defaultValue: "0",
    },
    {
      id: "living-room-mould-present",
      label: "Is there any mould present?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-mould-comment",
      label: "Mould comments",
      type: "textarea",
      defaultValue: "N/A",
    },
    {
      id: "living-room-mould-standard",
      label:
        "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-ventilation-has",
      label:
        "Does the room have means of ventilation with outdoor air to maintain adequate air supply?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-ventilation-type",
      label: "Type of ventilation in the room",
      type: "select",
      options: ventilationTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "living-room-ventilation-standard",
      label:
        "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-bowing",
      label: "Is there any severe bowing or leaning of walls in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-cracking",
      label: "Is there any cracking in the room?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-warping",
      label: "Is there any warping or movement of floors in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "living-room-overall-standard",
      label: "ROOM OVERALL: Does the area overall meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "living-room-overall-comment",
      label: "Mandatory additional comments if the room fails",
      type: "textarea",
      defaultValue: "N/A",
    },
  ],
});

const createKitchenSection = () => ({
  id: "kitchen",
  title: "Kitchen",
  description: "Assessment of kitchen facilities and compliance",
  fields: [
    {
      id: "kitchen-photo",
      label: "Photo of room",
      type: "photo",
      defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
    },
    {
      id: "kitchen-food-prep",
      label: "Is there a dedicated food preparation area?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-food-prep-photo",
      label: "Photo of dedicated food preparation area",
      type: "photo",
    },
    {
      id: "kitchen-food-prep-standard",
      label:
        "MINIMUM STANDARDS: Does the food preparation area meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-oven-present",
      label: "Is there an oven in the kitchen?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-oven-photo",
      label: "Photo of oven",
      type: "photo",
    },
    {
      id: "kitchen-oven-working",
      label: "Is the oven in working order?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-oven-standard",
      label: "Does the oven meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-stovetop-present",
      label: "Is there a stovetop?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-stovetop-photo",
      label: "Photo of stovetop",
      type: "photo",
    },
    {
      id: "kitchen-stovetop-type",
      label: "Is the cooktop gas or electric?",
      type: "text",
      placeholder: "Gas or Electric",
      defaultValue: "Gas",
    },
    {
      id: "kitchen-stovetop-burners",
      label: "Are there at least 2 burners on the cooktop?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-stovetop-working",
      label: "Are two or more burners in good working condition?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-stovetop-standard",
      label: "Does the cooktop meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-sink-present",
      label: "Is there a sink in the kitchen?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-sink-photo",
      label: "Photo of sink",
      type: "photo",
    },
    {
      id: "kitchen-sink-working",
      label: "Is the sink in working order?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-sink-standard",
      label: "Does the sink meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-cold-water-adequate",
      label: "Is there an adequate supply/flow of cold water?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-hot-water-adequate",
      label: "Is there an adequate supply/flow of hot water?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-hot-water-seconds",
      label: "How many seconds for the water to run hot?",
      type: "number",
      min: 0,
      placeholder: "Enter seconds",
      defaultValue: 6,
    },
    {
      id: "kitchen-hot-water-issues",
      label: "Are there any issues with the hot water supply/flow?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-cold-water-standard",
      label: "Does the cold water supply/flow meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-hot-water-standard",
      label: "Does the hot water supply/flow meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-external-door-present",
      label: "Is there an external door present?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-lighting-type",
      label: "What type of lighting is present?",
      type: "select",
      options: lightingTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "kitchen-lighting-day",
      label: "Does the room have adequate lighting during daylight hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-lighting-night",
      label: "Does the room have adequate lighting during nighttime hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-lighting-standard",
      label: "MINIMUM STANDARDS: Does the lighting meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-moisture-photo",
      label: "Photo of moisture reading on a wall",
      type: "photo",
    },
    {
      id: "kitchen-moisture-reading",
      label: "Moisture reading meter (Dry or Wet?)",
      type: "text",
      defaultValue: "0",
    },
    {
      id: "kitchen-mould-present",
      label: "Is there any mould present?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-mould-comment",
      label: "Mould comments",
      type: "textarea",
      defaultValue: "N/A",
    },
    {
      id: "kitchen-mould-standard",
      label:
        "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-ventilation-has",
      label:
        "Does the room have means of ventilation with outdoor air to maintain adequate air supply?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-ventilation-type",
      label: "Type of ventilation in the room",
      type: "select",
      options: ventilationTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "kitchen-ventilation-standard",
      label:
        "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-bowing",
      label: "Is there any severe bowing or leaning of walls in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-cracking",
      label: "Is there any cracking in the room?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-warping",
      label: "Is there any warping or movement of floors in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "kitchen-overall-standard",
      label: "ROOM OVERALL: Does the area overall meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "kitchen-overall-comment",
      label: "Mandatory additional comments if the room fails",
      type: "textarea",
      defaultValue: "N/A",
    },
  ],
});

const createLaundrySection = () => ({
  id: "laundry",
  title: "Laundry",
  description: "Assessment of laundry water supply and compliance",
  fields: [
    {
      id: "laundry-photo",
      label: "Photo of room",
      type: "photo",
      defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
    },
    {
      id: "laundry-cold-water-adequate",
      label: "Is there an adequate supply/flow of cold water?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-hot-water-adequate",
      label: "Is there an adequate supply/flow of hot water?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-hot-water-seconds",
      label: "How many seconds for the water to run hot?",
      type: "number",
      min: 0,
      placeholder: "Enter seconds",
    },
    {
      id: "laundry-hot-water-issues",
      label: "Are there any issues with the hot water supply/flow?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-cold-water-standard",
      label: "Does the cold water supply/flow meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-hot-water-standard",
      label: "Does the hot water supply/flow meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-external-door-present",
      label: "Is there an external door present?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-external-door-photo",
      label: "Photo of external door (outside and inside)",
      type: "photo-multi",
      metadata: { max: 2 },
    },
    {
      id: "laundry-external-door-deadlock",
      label: "Does the external door have a deadlock/deadlatch function?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-external-door-standard",
      label: "Does the external door meet minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-window-present",
      label: "Are there windows in room?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-lighting-type",
      label: "What type of lighting is present?",
      type: "select",
      options: lightingTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "laundry-lighting-day",
      label: "Does the room have adequate lighting during daylight hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-lighting-night",
      label: "Does the room have adequate lighting during nighttime hours?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-lighting-standard",
      label: "MINIMUM STANDARDS: Does the lighting meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-moisture-photo",
      label: "Photo of moisture reading on a wall",
      type: "photo",
    },
    {
      id: "laundry-moisture-reading",
      label: "Moisture reading meter (Dry or Wet?)",
      type: "text",
      defaultValue: "0",
    },
    {
      id: "laundry-mould-present",
      label: "Is there any mould present?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-mould-standard",
      label:
        "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-ventilation-has",
      label:
        "Does the room have means of ventilation with outdoor air to maintain adequate air supply?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-ventilation-type",
      label: "Type of ventilation in the room",
      type: "select",
      options: ventilationTypeOptions,
      defaultValue: "natural",
    },
    {
      id: "laundry-ventilation-standard",
      label:
        "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-bowing",
      label: "Is there any severe bowing or leaning of walls in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-cracking",
      label: "Is there any cracking in the room?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-warping",
      label: "Is there any warping or movement of floors in the property?",
      type: "yes-no",
      defaultValue: "no",
    },
    {
      id: "laundry-overall-standard",
      label: "ROOM OVERALL: Does the area overall meet the minimum standards?",
      type: "yes-no",
      defaultValue: "yes",
    },
    {
      id: "laundry-overall-comment",
      label: "Mandatory additional comments if the room fails",
      type: "textarea",
      defaultValue: "N/A",
    },
  ],
});

const createMinimumSafetyStandardTemplate = (
  bedroomCount = 1,
  bathroomCount = 1
) => {
  const overallSummaryRows = [
    { id: "summary-recycle-general", label: "Recycle and General Waste" },
    { id: "summary-kitchen", label: "Kitchen" },
    { id: "summary-laundry", label: "Laundry" },
    { id: "summary-living-room", label: "Living Room" },
    { id: "summary-front-entrance", label: "Front Entrance" },
    { id: "summary-electrical", label: "Electrical Safety" },
  ];

  for (let i = 1; i <= bathroomCount; i++) {
    overallSummaryRows.push({
      id: `summary-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
  }

  for (let i = 1; i <= bedroomCount; i++) {
    overallSummaryRows.push({
      id: `summary-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
  }

  const lightingRows = [
    { id: "lighting-front-entrance", label: "Front Entrance" },
    { id: "lighting-living-room", label: "Living Room" },
    { id: "lighting-kitchen", label: "Kitchen" },
    { id: "lighting-laundry", label: "Laundry" },
  ];

  const mouldRows = [
    { id: "mould-front-entrance", label: "Front Entrance" },
    { id: "mould-living-room", label: "Living Room" },
    { id: "mould-kitchen", label: "Kitchen" },
    { id: "mould-laundry", label: "Laundry" },
  ];

  const ventilationRows = [
    { id: "ventilation-front-entrance", label: "Front Entrance" },
    { id: "ventilation-living-room", label: "Living Room" },
    { id: "ventilation-kitchen", label: "Kitchen" },
    { id: "ventilation-laundry", label: "Laundry" },
  ];

  const structuralBowingRows = [
    { id: "struct-bowing-living-room", label: "Living Room" },
    { id: "struct-bowing-laundry", label: "Laundry" },
    { id: "struct-bowing-kitchen", label: "Kitchen" },
    { id: "struct-bowing-front-entrance", label: "Front Entrance" },
  ];

  const structuralCrackingRows = [
    { id: "struct-cracking-living-room", label: "Living Room" },
    { id: "struct-cracking-laundry", label: "Laundry" },
    { id: "struct-cracking-kitchen", label: "Kitchen" },
    { id: "struct-cracking-front-entrance", label: "Front Entrance" },
  ];

  const structuralWarpingRows = [
    { id: "struct-warping-living-room", label: "Living Room" },
    { id: "struct-warping-laundry", label: "Laundry" },
    { id: "struct-warping-kitchen", label: "Kitchen" },
    { id: "struct-warping-front-entrance", label: "Front Entrance" },
  ];

  const windowCoveringRows = [
    { id: "window-coverings-living-room", label: "Living Room" },
  ];

  const windowLatchRows = [];

  const externalDoorRows = [
    { id: "external-door-front-entrance", label: "Front Entrance" },
    { id: "external-door-living-room", label: "Living Room" },
    { id: "external-door-laundry", label: "Laundry" },
  ];

  const heatingRows = [{ id: "heating-living-room", label: "Living Room" }];

  const coldWaterRows = [
    { id: "cold-water-kitchen", label: "Kitchen" },
    { id: "cold-water-laundry", label: "Laundry" },
  ];

  const hotWaterRows = [
    { id: "hot-water-kitchen", label: "Kitchen" },
    { id: "hot-water-laundry", label: "Laundry" },
  ];

  const kitchenFacilityRows = [
    { id: "kitchen-stovetop", label: "Stovetop" },
    { id: "kitchen-food-prep", label: "Food Preparation Area" },
    { id: "kitchen-oven", label: "Oven" },
    { id: "kitchen-sink", label: "Sink" },
  ];

  const toiletRows = [];

  const executiveFixtureFields = [];
  for (let i = 1; i <= bathroomCount; i++) {
    executiveFixtureFields.push(
      ...formatPresenceFieldSet(`bathroom-${i}-bath`, `Bathroom ${i} Bath`),
      ...formatPresenceFieldSet(`bathroom-${i}-shower`, `Bathroom ${i} Shower`),
      ...formatPresenceFieldSet(
        `bathroom-${i}-washbasin`,
        `Bathroom ${i} Washbasin`
      )
    );
  }

  for (let i = 1; i <= bedroomCount; i++) {
    lightingRows.push({ id: `lighting-bedroom-${i}`, label: `Bedroom ${i}` });
    mouldRows.push({ id: `mould-bedroom-${i}`, label: `Bedroom ${i}` });
    ventilationRows.push({
      id: `ventilation-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralBowingRows.push({
      id: `struct-bowing-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralCrackingRows.push({
      id: `struct-cracking-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    structuralWarpingRows.push({
      id: `struct-warping-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    windowCoveringRows.push({
      id: `window-coverings-bedroom-${i}`,
      label: `Bedroom ${i}`,
    });
    windowLatchRows.push({ id: `windows-bedroom-${i}`, label: `Bedroom ${i}` });
  }

  for (let i = 1; i <= bathroomCount; i++) {
    lightingRows.push({ id: `lighting-bathroom-${i}`, label: `Bathroom ${i}` });
    mouldRows.push({ id: `mould-bathroom-${i}`, label: `Bathroom ${i}` });
    ventilationRows.push({
      id: `ventilation-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralBowingRows.push({
      id: `struct-bowing-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralCrackingRows.push({
      id: `struct-cracking-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    structuralWarpingRows.push({
      id: `struct-warping-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    windowLatchRows.push({
      id: `windows-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    coldWaterRows.push({
      id: `cold-water-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    hotWaterRows.push({
      id: `hot-water-bathroom-${i}`,
      label: `Bathroom ${i}`,
    });
    toiletRows.push({ id: `toilet-bathroom-${i}`, label: `Bathroom ${i}` });
  }

  const baseSections = [
    {
      id: "property-setup",
      title: "Property Configuration",
      description:
        "Configure the number of bedrooms and bathrooms for this property",
      fields: [
        {
          id: "bedroom-count",
          label: "Number of Bedrooms",
          type: "number",
          required: true,
          min: 1,
          max: 20,
          defaultValue: bedroomCount,
          helpText: "Enter the total number of bedrooms in the property",
        },
        {
          id: "bathroom-count",
          label: "Number of Bathrooms",
          type: "number",
          required: true,
          min: 1,
          max: 10,
          defaultValue: bathroomCount,
          helpText: "Enter the total number of bathrooms in the property",
        },
      ],
    },
    buildStatusSection(
      "overall-summary",
      "Overall Property Summary (Minimum Standards)",
      overallSummaryRows,
      "Capture whether each key area meets the minimum standards and record any remedial actions required."
    ),
    {
      id: "property-summary",
      title: "Overall Property Summary",
      description: "Complete the overall property assessment summary",
      fields: [
        {
          id: "inspection-date",
          label: "Inspection Date",
          type: "date",
          required: true,
          defaultValue: new Date().toISOString().split("T")[0],
        },
        {
          id: "inspector-name",
          label: "Inspector Name",
          type: "text",
          required: true,
          placeholder: "Enter inspector's full name",
          defaultValue: "Auto Inspector",
        },
        {
          id: "inspector-license",
          label: "Inspector License Number",
          type: "text",
          required: true,
          placeholder: "Enter license/certification number",
          defaultValue: "LIC-0000",
        },
        {
          id: "property-address",
          label: "Property Address",
          type: "textarea",
          required: true,
          placeholder: "Enter complete property address",
          defaultValue: "123 Example Street, Exampleville",
        },
        {
          id: "owner-name",
          label: "Property Owner/Manager",
          type: "text",
          required: true,
          placeholder: "Enter owner or property manager name",
          defaultValue: "Auto Owner",
        },
        {
          id: "overall-compliance",
          label: "Overall Compliance Status",
          type: "select",
          required: true,
          options: complianceStatusOptions,
          defaultValue: "compliant",
        },
        {
          id: "property-photo",
          label: "Property Photo",
          type: "photo",
          required: true,
          helpText: "Take a photo of the property exterior",
          defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
        },
      ],
    },
    {
      id: "front-entrance",
      title: "Front Entrance",
      description:
        "Assess the primary entry including doors, hardware, and weather protection",
      fields: [
        {
          id: "front-entrance-house-photo",
          label: "Photo of house from street",
          type: "photo",
        },
        {
          id: "front-entrance-detail-photo",
          label: "Detailed photo of front entrance",
          type: "photo",
        },
        {
          id: "front-entrance-building-classification",
          label: "Building classification",
          type: "text",
          placeholder: "e.g. Class 1",
          defaultValue: "Class 1",
        },
        {
          id: "front-entrance-condition",
          label: "Front Entrance Condition",
          type: "select",
          required: true,
          options: passFailOptions,
          defaultValue: "pass",
        },
        {
          id: "front-entrance-security",
          label: "Is the entrance door secure and lockable?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "front-entrance-screen-door",
          label: "Security/Screen Door Installed",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "front-entrance-lighting",
          label: "Entrance Lighting Functional",
          type: "select",
          required: true,
          options: passFailOptions,
          defaultValue: "pass",
        },
        {
          id: "front-entrance-weather-protection",
          label: "Adequate Weather Protection",
          type: "select",
          required: true,
          options: passFailOptions,
          defaultValue: "pass",
          helpText:
            "Assess awnings, verandas, or other protection from weather",
        },
        {
          id: "front-entrance-external-door-present",
          label: "Is there an external door present?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-public-lobby",
          label: "Is this a public lobby door that opens to common property?",
          type: "yes-no",
          defaultValue: "no",
        },
        {
          id: "front-entrance-external-door-photo",
          label: "Photo of external door (outside and inside)",
          type: "photo-multi",
          metadata: { max: 2 },
        },
        {
          id: "front-entrance-deadlock-present",
          label: "Does the external door have a deadlock/deadlatch function?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-deadlock-photos",
          label: "Close-up photos of deadlock/deadlatch",
          type: "photo-multi",
          metadata: { max: 3 },
          helpText:
            "Capture outside, inside, and engaged positions of the lock",
        },
        {
          id: "front-entrance-deadlock-functional",
          label: "Is the deadlock/deadlatch feature functioning?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-deadlock-standard",
          label: "Does the external door meet minimum standards?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-window-present",
          label: "Are there windows in room?",
          type: "yes-no",
          defaultValue: "no",
        },
        {
          id: "front-entrance-mould-standard",
          label:
            "MINIMUM STANDARDS: Does the mould and dampness meet the minimum standards?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-ventilation-standard",
          label:
            "MINIMUM STANDARDS: Does the area ventilation meet the minimum standards?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-overall-standard",
          label:
            "ROOM OVERALL: Does the area overall meet the minimum standards?",
          type: "yes-no",
          defaultValue: "yes",
        },
        {
          id: "front-entrance-notes",
          label: "Front Entrance Notes",
          type: "textarea",
          placeholder:
            "Record observations or maintenance items relating to the entrance",
          defaultValue: "N/A",
        },
        {
          id: "front-entrance-photo",
          label: "Front Entrance Photo",
          type: "photo",
          required: true,
          helpText: "Capture the condition of the primary entrance",
          defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
        },
      ],
    },
    {
      id: "executive-summary",
      title: "Executive Summary",
      description: "Provide a comprehensive summary of the inspection findings",
      fields: [
        {
          id: "inspection-summary",
          label: "Inspection Summary",
          type: "textarea",
          required: true,
          placeholder:
            "Provide a detailed summary of the inspection findings, any issues identified, and recommended actions",
          helpText:
            "This summary will appear in the executive summary section of the report",
        },
        {
          id: "key-findings",
          label: "Key Findings",
          type: "textarea",
          required: true,
          placeholder: "List the main findings from the inspection",
        },
        {
          id: "recommendations",
          label: "Recommendations",
          type: "textarea",
          required: true,
          placeholder:
            "Provide specific recommendations for addressing any issues found",
        },
        {
          id: "next-inspection-date",
          label: "Next Inspection Due",
          type: "date",
          required: true,
          helpText:
            "When should the next minimum safety standard inspection be conducted",
          defaultValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0], // One year from now
        },
      ],
    },
    {
      id: "electrical-safety",
      title: "Electrical Safety",
      description: "Assessment of electrical systems and safety",
      fields: [
        {
          id: "switchboard-location",
          label: "Location of switchboard",
          type: "text",
          required: true,
          placeholder: "e.g. Front entrance of the home",
          defaultValue: "Front entrance of the home",
        },
        {
          id: "switchboard-photo",
          label: "Photo of switchboard",
          type: "photo",
          required: true,
          defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
        },
        {
          id: "electrical-compliance",
          label: "Electrical System Compliance",
          type: "select",
          required: true,
          options: complianceStatusOptions,
          defaultValue: "compliant",
        },
        {
          id: "switchboard-condition",
          label: "Switchboard Condition",
          type: "select",
          required: true,
          options: passFailOptions,
          defaultValue: "pass",
        },
        {
          id: "switchboard-circuit-breaker",
          label:
            "Is it apparent there is a circuit breaker connected to all lighting and power circuits?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "rcd-present",
          label: "RCD (Safety Switch) Present and Working",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "switchboard-meets-standard",
          label:
            "MINIMUM STANDARDS: Does the switchboard meet the minimum standards?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "electrical-outlets",
          label: "Power Outlets Condition",
          type: "select",
          required: true,
          options: passFailOptions,
          defaultValue: "pass",
        },
        {
          id: "electrical-notes",
          label: "Electrical Safety Notes",
          type: "textarea",
          placeholder: "Record any specific electrical issues or observations",
        },
        {
          id: "electrical-photo",
          label: "Electrical System Photo",
          type: "photo",
          required: true,
          helpText: "Take a photo of the main switchboard",
          defaultValue: DEFAULT_PLACEHOLDER_IMAGE,
        },
      ],
    },
    {
      id: "bin-facilities",
      title: "Bin Facilities",
      description: "Assessment of waste disposal facilities",
      fields: [
        {
          id: "bin-general-present",
          label: "Does the property have a council style GENERAL waste bin?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-general-condition",
          label:
            "Is the general waste bin in good working condition/vermin proof?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-general-photo",
          label: "Photo of council style GENERAL waste bin",
          type: "photo",
        },
        {
          id: "bin-general-standard",
          label:
            "MINIMUM STANDARDS: Does the general waste bin meet the minimum standards?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-recycle-present",
          label: "Does the property have a recycle council style waste bin?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-recycle-condition",
          label: "Is the recycle bin in good working condition/vermin proof?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-recycle-photo",
          label: "Photo of recycle council style waste bin",
          type: "photo",
        },
        {
          id: "bin-recycle-standard",
          label:
            "MINIMUM STANDARDS: Does the recycle bin meet the minimum standards?",
          type: "yes-no",
          required: true,
          defaultValue: "yes",
        },
        {
          id: "bin-notes",
          label: "Bin Facilities Notes",
          type: "textarea",
          placeholder: "Record any issues with bin facilities",
          defaultValue: "N/A",
        },
      ],
    },
  ];

  if (executiveFixtureFields.length) {
    baseSections.push({
      id: "executive-summary-fixtures",
      title: "Executive Summary – Fixtures",
      description:
        "Record the presence of key fixtures within each bathroom and note any required actions when items are absent.",
      fields: executiveFixtureFields,
    });
  }

  baseSections.push(
    buildStatusSection(
      "external-entry-doors",
      "External Entry Doors",
      externalDoorRows,
      "Assess whether external entry doors across the property meet minimum standards."
    )
  );

  baseSections.push(
    buildStatusSection(
      "heating-summary",
      "Heating",
      heatingRows,
      "Confirm the main living area is provided with compliant fixed heating."
    )
  );

  baseSections.push(
    buildStatusSection(
      "cold-water-supply",
      "Cold Water Supply",
      coldWaterRows,
      "Confirm cold water supply meets minimum standards in all required areas."
    )
  );

  baseSections.push(
    buildStatusSection(
      "hot-water-supply",
      "Hot Water Supply",
      hotWaterRows,
      "Confirm hot water supply meets minimum standards in all required areas."
    )
  );

  baseSections.push(
    buildStatusSection(
      "kitchen-facilities",
      "Kitchen Facilities",
      kitchenFacilityRows,
      "Assess the essential kitchen facilities required under the minimum standards."
    )
  );

  baseSections.push(
    buildStatusSection(
      "lighting-summary",
      "Lighting",
      lightingRows,
      "Confirm each area has adequate lighting meeting minimum standards."
    )
  );

  baseSections.push(
    buildStatusSection(
      "mould-dampness-summary",
      "Mould and Dampness",
      mouldRows,
      "Record areas where mould or dampness impact compliance."
    )
  );

  baseSections.push(
    buildStatusSection(
      "ventilation-summary",
      "Ventilation",
      ventilationRows,
      "Confirm ventilation provisions meet minimum standards across the property."
    )
  );

  baseSections.push(
    buildStatusSection(
      "structural-bowing-summary",
      "Structural – Bowing and Leaning",
      structuralBowingRows,
      "Identify areas with structural bowing or leaning concerns."
    )
  );

  baseSections.push(
    buildStatusSection(
      "structural-cracking-summary",
      "Structural – Cracking",
      structuralCrackingRows,
      "Identify areas with cracking concerns."
    )
  );

  baseSections.push(
    buildStatusSection(
      "structural-warping-summary",
      "Structural – Warping",
      structuralWarpingRows,
      "Identify areas with floor warping or movement."
    )
  );

  if (toiletRows.length) {
    baseSections.push(
      buildStatusSection(
        "toilet-summary",
        "Toilet Facilities",
        toiletRows,
        "Document whether each bathroom toilet meets minimum standards."
      )
    );
  }

  baseSections.push(
    buildStatusSection(
      "window-coverings-summary",
      "Window Coverings",
      windowCoveringRows,
      "Confirm window coverings meet minimum standards in relevant rooms."
    )
  );

  if (windowLatchRows.length) {
    baseSections.push(
      buildStatusSection(
        "windows-latches-summary",
        "Windows and Latches",
        windowLatchRows,
        "Document whether windows and associated latches meet minimum standards."
      )
    );
  }

  baseSections.push(createLivingRoomSection());
  baseSections.push(createKitchenSection());
  baseSections.push(createLaundrySection());

  // Add dynamic bedroom sections
  for (let i = 1; i <= bedroomCount; i++) {
    baseSections.push(createBedroomSection(i));
  }

  // Add dynamic bathroom sections
  for (let i = 1; i <= bathroomCount; i++) {
    baseSections.push(createBathroomSection(i));
  }

  return {
    jobType: "MinimumSafetyStandard",
    title: "Minimum Safety Standard Inspection",
    version: 2,
    metadata: {
      category: "compliance",
      durationEstimateMins: 120,
      requiresRoomCount: true,
      bedroomCount,
      bathroomCount,
    },
    sections: baseSections,
  };
};

export { createMinimumSafetyStandardTemplate };

// Enhanced smoke alarm specific options
const smokeAlarmTypeOptions = [
  { value: "photoelectric", label: "Photoelectric" },
  { value: "ionization", label: "Ionization" },
  { value: "dual-sensor", label: "Dual Sensor" },
  { value: "unknown", label: "Unknown" },
];

const smokePowerSourceOptions = [
  { value: "mains-240v", label: "Mains-powered (240 V)" },
  { value: "battery-9v", label: "Replaceable 9 V Battery" },
  { value: "lithium-10yr", label: "10-year Sealed Lithium" },
  { value: "dual-power", label: "Mains with Battery Backup" },
  { value: "other", label: "Other" },
];

const smokeInterconnectionOptions = [
  { value: "hard-wired", label: "Hard-wired" },
  { value: "wireless-rf", label: "Wireless RF" },
  { value: "not-interconnected", label: "Not Interconnected" },
  { value: "unknown", label: "Unknown" },
];

const smokeMountingOptions = [
  { value: "ceiling", label: "Ceiling" },
  { value: "wall", label: "Wall" },
];

const smokeLocationOptions = [
  { value: "hallway-bedrooms", label: "Hallway - near bedrooms" },
  { value: "living", label: "Living room" },
  { value: "kitchen", label: "Kitchen area" },
  { value: "laundry", label: "Laundry" },
  { value: "garage", label: "Garage" },
  { value: "stair-landing", label: "Stair landing" },
  { value: "bedroom", label: "Bedroom" },
  { value: "other", label: "Other" },
];

const smokeConditionOptions = [
  { value: "securely-mounted", label: "Securely mounted" },
  { value: "no-paint-dust", label: "No paint/dust" },
  { value: "no-damage", label: "No damage" },
  { value: "obstructed", label: "Obstructed" },
  { value: "needs-remount", label: "Needs re-mounting" },
  { value: "plate-missing", label: "Plate missing" },
];

const smokeNonComplianceReasons = [
  { value: "expired", label: "Expired (>10 years)" },
  { value: "failed-test", label: "Failed test" },
  { value: "missing-location", label: "Missing at required location" },
  { value: "wrong-type", label: "Wrong type" },
  { value: "poor-positioning", label: "Poor positioning" },
  { value: "damaged", label: "Damaged" },
  { value: "no-power", label: "No power" },
  { value: "no-interconnect", label: "No interconnect where required" },
  { value: "other", label: "Other" },
];

const smokeActionsTaken = [
  { value: "replaced-battery", label: "Replaced battery" },
  { value: "cleaned", label: "Cleaned" },
  { value: "remounted", label: "Re-mounted" },
  { value: "replaced-unit", label: "Replaced unit" },
  { value: "issued-work-order", label: "Issued work order" },
  { value: "no-action", label: "No action - notify client" },
];

// Create comprehensive smoke-only sections based on ChatGPT structure
const createSmokeOnlySections_OLD = () => [
  {
    id: "job-property-details",
    title: "Job & Property Details",
    description:
      "Technician and inspection information recorded for the smoke alarm report.",
    fields: [
      {
        id: "inspection-date",
        label: "Date of Inspection",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "access-notes",
        label: "Access Notes",
        type: "multi-select",
        options: [
          { value: "pets-present", label: "Pets present" },
          { value: "no-one-home", label: "No one home" },
          { value: "site-hazard", label: "Site hazard" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "access-notes-detail",
        label: "Access Notes Detail",
        type: "textarea",
        placeholder: "Additional details about access conditions",
      },
      {
        id: "previous-service-date",
        label: "Previous Smoke Service Date",
        type: "date",
        helpText: "If known",
      },
      {
        id: "previous-service-unknown",
        label: "Previous service date unknown",
        type: "checkbox",
        defaultValue: false,
      },
    ],
  },
  {
    id: "property-coverage-check",
    title: "Property Coverage Check (AS 3786 / RTA VIC)",
    description:
      "Verify required smoke alarm locations and coverage compliance.",
    fields: [
      {
        id: "storeys-covered",
        label: "Storeys covered",
        type: "multi-select",
        options: [
          { value: "ground", label: "Ground (G)" },
          { value: "level1", label: "Level 1 (L1)" },
          { value: "level2", label: "Level 2 (L2)" },
          { value: "basement", label: "Basement" },
        ],
        required: true,
      },
      {
        id: "hallway-bedrooms-present",
        label: "Hallway serving bedrooms (each level)",
        type: "yes-no-na",
        required: true,
        defaultValue: "yes",
      },
      {
        id: "between-sleeping-areas",
        label: "Between sleeping areas and remainder of storey",
        type: "yes-no-na",
        required: true,
        defaultValue: "yes",
      },
      {
        id: "every-storey-covered",
        label: "Every storey including where bedroom is not located",
        type: "yes-no-na",
        required: true,
        defaultValue: "yes",
      },
      {
        id: "attached-garage",
        label: "Attached garage (if internal access)",
        type: "yes-no-na",
        required: true,
        defaultValue: "na",
      },
      {
        id: "any-locations-missing",
        label: "Any locations missing an alarm?",
        type: "yes-no",
        required: true,
        defaultValue: "no",
      },
      {
        id: "missing-locations",
        label: "Missing alarm locations",
        type: "textarea",
        placeholder: "List locations where alarms are missing",
        helpText: "Only fill if any locations are missing alarms",
      },
    ],
  },
  {
    id: "alarm-inventory",
    title: "Alarm Inventory",
    description:
      "Detailed inspection of each smoke alarm (add one section per alarm).",
    fields: [
      {
        id: "alarm-count",
        label: "Total number of alarms inspected",
        type: "number",
        required: true,
        min: 1,
        defaultValue: 1,
      },
      {
        id: "alarm-records",
        label: "Smoke Alarm Records",
        type: "table",
        required: true,
        columns: [
          {
            id: "alarm-id",
            label: "Alarm ID",
            type: "text",
            required: true,
            placeholder: "Auto-generated",
          },
          {
            id: "location",
            label: "Location",
            type: "select",
            options: smokeLocationOptions,
            required: true,
          },
          {
            id: "location-other",
            label: "Location (Other)",
            type: "text",
            placeholder: "Specify if 'Other' selected",
          },
          {
            id: "mounting",
            label: "Mounting",
            type: "select",
            options: smokeMountingOptions,
            required: true,
          },
          {
            id: "brand",
            label: "Brand",
            type: "text",
            required: true,
          },
          {
            id: "model",
            label: "Model",
            type: "text",
          },
          {
            id: "model-not-visible",
            label: "Model not visible",
            type: "checkbox",
            defaultValue: false,
          },
          {
            id: "alarm-type",
            label: "Alarm Type",
            type: "select",
            options: smokeAlarmTypeOptions,
            required: true,
          },
          {
            id: "power-source",
            label: "Power Source",
            type: "select",
            options: smokePowerSourceOptions,
            required: true,
          },
          {
            id: "power-source-other",
            label: "Power Source (Other)",
            type: "text",
            placeholder: "Specify if 'Other' selected",
          },
          {
            id: "interconnection",
            label: "Interconnection",
            type: "select",
            options: smokeInterconnectionOptions,
            required: true,
          },
          {
            id: "interconnected-all-sound",
            label: "All interconnected alarms sounded during test",
            type: "yes-no-na",
            defaultValue: "na",
          },
          {
            id: "manufacture-date",
            label: "Manufacture Date (MFD)",
            type: "date",
            required: true,
          },
          {
            id: "manufacture-date-not-readable",
            label: "MFD not readable",
            type: "checkbox",
            defaultValue: false,
          },
          {
            id: "expiry-date",
            label: "Expiry Date on Label",
            type: "date",
          },
          {
            id: "expiry-date-not-stated",
            label: "Expiry not stated",
            type: "checkbox",
            defaultValue: false,
          },
          {
            id: "age-years",
            label: "Age (Years)",
            type: "number",
            helpText: "Auto-calculated from MFD",
          },
          {
            id: "over-10-years",
            label: "Unit >10 years old",
            type: "yes-no",
            helpText: "Auto-calculated",
          },
          {
            id: "battery-present",
            label: "Battery Present",
            type: "yes-no-na",
            defaultValue: "na",
          },
          {
            id: "battery-replaced-today",
            label: "Battery Replaced Today",
            type: "yes-no-na",
            defaultValue: "no",
          },
          {
            id: "battery-type",
            label: "Battery Type",
            type: "select",
            options: [
              { value: "9v-alkaline", label: "9V Alkaline" },
              { value: "lithium-10yr", label: "Lithium 10-year" },
              { value: "other", label: "Other" },
            ],
          },
          {
            id: "battery-brand",
            label: "Battery Brand/Lot",
            type: "text",
          },
          {
            id: "battery-expiry",
            label: "Battery Expiry",
            type: "date",
          },
          {
            id: "mains-led-on",
            label: "Mains Indicator LED On (240V units)",
            type: "yes-no-na",
            defaultValue: "na",
          },
          {
            id: "push-test-result",
            label: "Push-to-test sounds alarm",
            type: "pass-fail",
            required: true,
          },
          {
            id: "hush-silence-works",
            label: "Hush/silence works",
            type: "pass-fail-na",
            defaultValue: "na",
          },
          {
            id: "sound-level-db",
            label: "Sound Level Reading (dB)",
            type: "number",
            required: true,
            placeholder: "Measure ~3m away",
            min: 0,
            max: 150,
          },
          {
            id: "led-status",
            label: "LED Status",
            type: "select",
            options: [
              { value: "flashing-normal", label: "Flashing normal" },
              { value: "solid", label: "Solid" },
              { value: "off", label: "Off" },
              { value: "other", label: "Other" },
            ],
            required: true,
          },
          {
            id: "led-status-other",
            label: "LED Status (Other)",
            type: "text",
            placeholder: "Specify if 'Other' selected",
          },
          {
            id: "clearances-ok",
            label: "Clear of corners/walls/vents/fans",
            type: "yes-no",
            required: true,
            defaultValue: "yes",
          },
          {
            id: "distance-to-wall",
            label: "Distance to nearest wall (cm)",
            type: "number",
            min: 0,
            placeholder: "Distance in cm",
          },
          {
            id: "distance-to-corner",
            label: "Distance to corner/apex (cm)",
            type: "number",
            min: 0,
            placeholder: "Distance in cm",
          },
          {
            id: "distance-to-fan",
            label: "Distance to fan/AC vent (cm)",
            type: "number",
            min: 0,
            placeholder: "Distance in cm",
          },
          {
            id: "physical-condition",
            label: "Physical Condition",
            type: "multi-select",
            options: smokeConditionOptions,
            required: true,
          },
          {
            id: "alarm-comments",
            label: "Comments (per alarm)",
            type: "textarea",
            placeholder: "Additional notes for this alarm",
          },
          {
            id: "photo-context",
            label: "Photo: Installed location context",
            type: "photo",
            required: true,
            helpText: "Wide shot showing alarm installation",
          },
          {
            id: "photo-label",
            label: "Photo: Label showing brand/MFD/expiry",
            type: "photo",
            required: true,
            helpText: "Close-up of manufacturer label",
          },
          {
            id: "photo-test",
            label: "Photo: dB reading or test in progress",
            type: "photo",
            required: true,
            helpText: "Photo of dB meter reading or test button press",
          },
          {
            id: "photo-replaced",
            label: "Photo: Replaced unit (if applicable)",
            type: "photo",
            helpText: "Photo of new unit if replacement occurred",
          },
          {
            id: "compliance-status",
            label: "Compliance Status",
            type: "select",
            options: complianceStatusOptions,
            required: true,
          },
          {
            id: "non-compliance-reasons",
            label: "Non-Compliance Reasons",
            type: "multi-select",
            options: smokeNonComplianceReasons,
            helpText: "Select if status is Non-Compliant",
          },
          {
            id: "non-compliance-other",
            label: "Other Non-Compliance Reason",
            type: "text",
            placeholder: "Specify if 'Other' selected",
          },
          {
            id: "actions-taken",
            label: "Action Taken Today",
            type: "multi-select",
            options: smokeActionsTaken,
            required: true,
          },
          {
            id: "replaced-unit-brand",
            label: "Replacement: New Brand",
            type: "text",
            helpText: "If unit was replaced",
          },
          {
            id: "replaced-unit-model",
            label: "Replacement: New Model",
            type: "text",
            helpText: "If unit was replaced",
          },
          {
            id: "replaced-unit-mfd",
            label: "Replacement: New MFD",
            type: "date",
            helpText: "If unit was replaced",
          },
          {
            id: "replaced-unit-install-date",
            label: "Replacement: Install Date",
            type: "date",
            defaultValue: new Date().toISOString().split("T")[0],
            helpText: "If unit was replaced",
          },
          {
            id: "replaced-unit-warranty",
            label: "Replacement: Warranty Years",
            type: "number",
            min: 0,
            max: 15,
            helpText: "If unit was replaced",
          },
          {
            id: "replaced-interconnection-verified",
            label: "Replacement: Interconnection paired & verified",
            type: "yes-no-na",
            defaultValue: "na",
            helpText: "If unit was replaced",
          },
        ],
        defaultValue: [
          {
            "alarm-id": "001",
            location: "hallway-bedrooms",
            mounting: "ceiling",
            brand: "Fire Tek",
            "alarm-type": "photoelectric",
            "power-source": "mains-240v",
            interconnection: "hard-wired",
            "manufacture-date": "2013-03-23",
            "expiry-date": "2023-03-23",
            "push-test-result": "pass",
            "sound-level-db": 85,
            "led-status": "flashing-normal",
            "clearances-ok": "yes",
            "physical-condition": ["securely-mounted", "no-paint-dust"],
            "compliance-status": "non-compliant",
            "non-compliance-reasons": ["expired"],
            "actions-taken": ["issued-work-order"],
            "alarm-comments": "Expired 240 V mains alarm – needs replacing",
          },
        ],
      },
    ],
  },
  {
    id: "property-level-findings",
    title: "Property-Level Findings",
    description: "Overall inspection summary and findings.",
    fields: [
      {
        id: "alarms-inspected-count",
        label: "How many alarms inspected?",
        type: "number",
        required: true,
        min: 0,
        helpText: "Auto-calculated from alarm records",
      },
      {
        id: "alarms-replaced-count",
        label: "How many replaced today?",
        type: "number",
        required: true,
        min: 0,
        defaultValue: 0,
      },
      {
        id: "alarms-non-compliant-count",
        label: "How many non-compliant after visit?",
        type: "number",
        required: true,
        min: 0,
      },
      {
        id: "general-comments",
        label: "General Comments",
        type: "textarea",
        required: true,
        placeholder:
          "e.g., Two expired 240 V mains-powered smoke alarms identified; both require replacement.",
        defaultValue:
          "Two expired 240 V mains-powered smoke alarms identified. Replacement of both alarms is required immediately to restore compliance.",
      },
    ],
  },
  {
    id: "compliance-next-steps",
    title: "Compliance & Next Steps",
    description: "Overall compliance assessment and required actions.",
    fields: [
      {
        id: "overall-status",
        label: "Overall Compliance Status",
        type: "select",
        options: [
          { value: "compliant", label: "✅ Compliant" },
          { value: "non-compliant", label: "❌ Non-Compliant" },
        ],
        required: true,
      },
      {
        id: "rectifications-needed",
        label: "Rectifications Needed (Work Orders)",
        type: "table",
        columns: [
          {
            id: "issue",
            label: "Issue",
            type: "text",
            required: true,
            placeholder: "Describe the issue",
          },
          {
            id: "location",
            label: "Location",
            type: "text",
            required: true,
            placeholder: "Where the issue is located",
          },
          {
            id: "priority",
            label: "Priority",
            type: "select",
            options: [
              { value: "urgent", label: "Urgent" },
              { value: "standard", label: "Standard" },
            ],
            required: true,
            defaultValue: "standard",
          },
        ],
        defaultValue: [
          {
            issue: "Replace expired 240V mains-powered smoke alarms",
            location: "Near bedrooms",
            priority: "urgent",
          },
        ],
      },
      {
        id: "next-service-due",
        label: "Next smoke alarm service due",
        type: "date",
        required: true,
        defaultValue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0], // 1 year from now
      },
      {
        id: "standards-acknowledged",
        label: "Standards Acknowledged",
        type: "checkbox-group",
        options: [
          {
            value: "rta-2021",
            label: "Residential Tenancies Regulations 2021",
          },
          {
            value: "as-3786",
            label: "AS 3786 – Smoke Alarms",
          },
        ],
        required: true,
        defaultValue: ["rta-2021", "as-3786"],
      },
    ],
  },
  {
    id: "technician-signoff",
    title: "Technician Sign-Off",
    description: "Technician declaration and signature.",
    fields: [
      {
        id: "technician-declaration",
        label: "Technician Declaration",
        type: "checkbox",
        required: true,
        defaultValue: false,
        helpText:
          "I conducted this inspection in accordance with the Residential Tenancies Regulations 2021 and AS 3786 – Smoke Alarms.",
      },
      {
        id: "declaration-text",
        label: "Declaration Statement",
        type: "text",
        defaultValue:
          "I conducted this inspection in accordance with the Residential Tenancies Regulations 2021 and AS 3786 – Smoke Alarms.",
        required: true,
      },
      {
        id: "technician-signature",
        label: "Technician Signature",
        type: "signature",
        required: true,
      },
      {
        id: "signature-date",
        label: "Date Signed",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
    ],
  },
];

// NEW: Improved smoke-only template following Gas/Electrical patterns
const createSmokeOnlySections = () => [
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
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "previous-inspection-date",
        label: "Date of previous smoke alarm check (if any)",
        type: "date",
        helpText: "Leave blank if unknown",
      },
      {
        id: "inspector-name",
        label: "Inspector name",
        type: "text",
        required: true,
        defaultValue: "Daniel Smith",
      },
      {
        id: "license-number",
        label: "Licence/registration number",
        type: "text",
        required: true,
        defaultValue: "EW123456",
      },
      {
        id: "smoke-outcome",
        label: "Smoke alarm inspection outcome",
        type: "select",
        options: [
          { value: "all-compliant", label: "All alarms compliant" },
          { value: "issues-identified", label: "Issues identified" },
          { value: "replacements-required", label: "Replacements required" },
          { value: "urgent-work-required", label: "Urgent work required" },
        ],
        required: true,
        defaultValue: "all-compliant",
      },
      {
        id: "next-service-due",
        label: "Next service due",
        type: "date",
        required: true,
        helpText: "Usually 12 months from inspection date",
      },
      {
        id: "access-notes",
        label: "Access notes",
        type: "multi-select",
        options: [
          { value: "full-access", label: "Full access obtained" },
          { value: "pets-present", label: "Pets present" },
          { value: "tenant-present", label: "Tenant present" },
          { value: "no-one-home", label: "No one home" },
          { value: "keys-provided", label: "Keys provided" },
          { value: "limited-access", label: "Limited access" },
        ],
        defaultValue: ["full-access"],
      },
      {
        id: "access-notes-comments",
        label: "Access notes comments",
        type: "textarea",
        placeholder: "Additional details about property access",
      },
    ],
  },
  {
    id: "property-coverage",
    title: "Property Coverage Assessment",
    description:
      "Verify smoke alarm coverage meets AS 3786 and RTA requirements.",
    fields: [
      {
        id: "property-type",
        label: "Property type",
        type: "select",
        required: true,
        options: [
          { value: "house", label: "House" },
          { value: "townhouse", label: "Townhouse" },
          { value: "unit", label: "Unit/Apartment" },
          { value: "duplex", label: "Duplex" },
        ],
      },
      {
        id: "storeys-count",
        label: "Number of storeys",
        type: "number",
        required: true,
        min: 1,
        max: 4,
        defaultValue: 1,
      },
      {
        id: "bedroom-count",
        label: "Number of bedrooms",
        type: "number",
        required: true,
        min: 1,
        max: 8,
        defaultValue: 3,
      },
      {
        id: "hallway-bedrooms-covered",
        label: "Hallway serving bedrooms has smoke alarm",
        type: "yes-no",
        required: true,
        helpText: "AS 3786 mandatory requirement",
      },
      {
        id: "between-sleeping-living-covered",
        label: "Smoke alarm between sleeping areas and living areas",
        type: "yes-no",
        required: true,
        helpText: "AS 3786 mandatory requirement",
      },
      {
        id: "every-storey-covered",
        label: "Every storey has at least one smoke alarm",
        type: "yes-no",
        required: true,
        helpText: "AS 3786 mandatory requirement",
      },
      {
        id: "garage-internal-access",
        label: "Property has garage with internal access",
        type: "yes-no",
        required: true,
      },
      {
        id: "garage-smoke-alarm",
        label: "Garage with internal access has smoke alarm",
        type: "yes-no-na",
        helpText: "Required if garage has internal access",
      },
      {
        id: "additional-coverage",
        label: "Additional coverage areas",
        type: "multi-select",
        options: [
          { value: "kitchen", label: "Kitchen" },
          { value: "living-room", label: "Living room" },
          { value: "dining-room", label: "Dining room" },
          { value: "family-room", label: "Family room" },
          { value: "study", label: "Study" },
          { value: "stairway", label: "Stairway" },
          { value: "basement", label: "Basement" },
        ],
      },
      {
        id: "coverage-compliant",
        label: "Property coverage meets AS 3786 requirements",
        type: "yes-no",
        required: true,
      },
      {
        id: "coverage-deficiencies",
        label: "Coverage deficiencies",
        type: "textarea",
        placeholder: "Describe any areas lacking required smoke alarm coverage",
        helpText: "Complete if coverage is non-compliant",
      },
    ],
  },
  {
    id: "smoke-alarm-inventory",
    title: "Smoke Alarm Inventory",
    description: "Detailed inspection of each individual smoke alarm.",
    fields: [
      {
        id: "total-alarms-property",
        label: "Total smoke alarms on property",
        type: "number",
        required: true,
        min: 1,
        defaultValue: 1,
      },
      {
        id: "alarm-records",
        label: "Individual Alarm Records",
        type: "table",
        required: true,
        columns: [
          {
            id: "alarm-id",
            label: "Alarm ID",
            type: "text",
            required: true,
            placeholder: "ALM-01",
            helpText: "Unique identifier for this alarm",
          },
          {
            id: "location",
            label: "Location",
            type: "select",
            required: true,
            options: [
              { value: "hallway-bedrooms", label: "Hallway (bedrooms)" },
              { value: "hallway-main", label: "Main hallway" },
              { value: "living-room", label: "Living room" },
              { value: "kitchen", label: "Kitchen" },
              { value: "dining-room", label: "Dining room" },
              { value: "family-room", label: "Family room" },
              { value: "bedroom-main", label: "Main bedroom" },
              { value: "bedroom-2", label: "Bedroom 2" },
              { value: "bedroom-3", label: "Bedroom 3" },
              { value: "bedroom-4", label: "Bedroom 4" },
              { value: "study", label: "Study/Office" },
              { value: "garage", label: "Garage" },
              { value: "stairway", label: "Stairway" },
              { value: "basement", label: "Basement" },
              { value: "other", label: "Other" },
            ],
          },
          {
            id: "location-detail",
            label: "Location Detail",
            type: "text",
            placeholder: "Specific location description",
          },
          {
            id: "brand-model",
            label: "Brand & Model",
            type: "text",
            required: true,
            placeholder: "e.g., Clipsal 755SMA",
          },
          {
            id: "alarm-type",
            label: "Alarm Type",
            type: "select",
            required: true,
            options: [
              { value: "photoelectric", label: "Photoelectric" },
              { value: "ionisation", label: "Ionisation" },
              { value: "dual-sensor", label: "Dual sensor" },
              { value: "heat-detector", label: "Heat detector" },
            ],
          },
          {
            id: "power-source",
            label: "Power Source",
            type: "select",
            required: true,
            options: [
              { value: "240v-mains", label: "240V mains hardwired" },
              { value: "battery-replaceable", label: "Replaceable battery" },
              {
                value: "battery-sealed-lithium",
                label: "Sealed lithium battery",
              },
              {
                value: "mains-battery-backup",
                label: "Mains with battery backup",
              },
            ],
          },
          {
            id: "manufacture-date",
            label: "Manufacture Date",
            type: "date",
            helpText: "From manufacturer label",
          },
          {
            id: "manufacture-date-unknown",
            label: "Manufacture date unknown/unreadable",
            type: "checkbox",
            defaultValue: false,
          },
          {
            id: "age-years",
            label: "Age (Years)",
            type: "number",
            helpText: "Calculated from manufacture date",
          },
          {
            id: "expired-over-10-years",
            label: "Expired (over 10 years old)",
            type: "yes-no",
            required: true,
          },
          {
            id: "mounting-position",
            label: "Mounting Position",
            type: "select",
            required: true,
            options: [
              { value: "ceiling-centre", label: "Ceiling (centre of room)" },
              { value: "ceiling-wall-junction", label: "Ceiling near wall" },
              { value: "wall-mounted", label: "Wall mounted" },
            ],
          },
          {
            id: "positioning-compliant",
            label: "Positioning meets AS 3786",
            type: "yes-no",
            required: true,
            helpText:
              "Clearances: 50cm from walls, 60cm from corners, 150cm from fans",
          },
          {
            id: "physical-condition",
            label: "Physical Condition",
            type: "select",
            required: true,
            options: [
              { value: "excellent", label: "Excellent" },
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
              { value: "poor", label: "Poor" },
              { value: "damaged", label: "Damaged" },
            ],
          },
          {
            id: "test-button-result",
            label: "Test Button Result",
            type: "pass-fail",
            required: true,
          },
          {
            id: "sound-level-adequate",
            label: "Sound level adequate (≥85dB)",
            type: "yes-no",
            required: true,
          },
          {
            id: "sound-level-measured",
            label: "Sound Level Measured (dB)",
            type: "number",
            placeholder: "85",
            helpText: "If measured with dB meter",
          },
          {
            id: "interconnection",
            label: "Interconnection Type",
            type: "select",
            options: [
              { value: "none", label: "Not interconnected" },
              { value: "hardwired", label: "Hardwired interconnection" },
              { value: "wireless", label: "Wireless interconnection" },
            ],
            defaultValue: "none",
          },
          {
            id: "interconnection-working",
            label: "Interconnection working correctly",
            type: "yes-no-na",
            helpText: "N/A if not interconnected",
          },
          {
            id: "battery-condition",
            label: "Battery Condition",
            type: "select",
            options: [
              { value: "na-hardwired", label: "N/A - Hardwired only" },
              { value: "good", label: "Good" },
              { value: "low", label: "Low" },
              { value: "requires-replacement", label: "Requires replacement" },
              { value: "missing", label: "Missing" },
            ],
          },
          {
            id: "compliance-status",
            label: "Overall Compliance",
            type: "select",
            required: true,
            options: [
              { value: "compliant", label: "Compliant" },
              {
                value: "non-compliant-minor",
                label: "Non-compliant (minor issues)",
              },
              {
                value: "non-compliant-major",
                label: "Non-compliant (major issues)",
              },
              { value: "requires-replacement", label: "Requires replacement" },
            ],
          },
          {
            id: "action-required",
            label: "Action Required",
            type: "select",
            required: true,
            options: [
              { value: "none", label: "No action required" },
              { value: "clean", label: "Clean alarm" },
              { value: "reposition", label: "Reposition alarm" },
              { value: "replace-battery", label: "Replace battery" },
              { value: "replace-unit", label: "Replace entire unit" },
              { value: "repair", label: "Repair required" },
            ],
          },
          {
            id: "work-completed",
            label: "Work Completed Today",
            type: "multi-select",
            options: [
              { value: "none", label: "No work required" },
              { value: "cleaned", label: "Cleaned alarm" },
              { value: "battery-replaced", label: "Battery replaced" },
              { value: "unit-replaced", label: "Unit replaced" },
              { value: "repositioned", label: "Repositioned" },
              { value: "tested-only", label: "Tested only" },
            ],
            defaultValue: ["tested-only"],
          },
          {
            id: "comments",
            label: "Comments",
            type: "textarea",
            placeholder: "Additional notes about this alarm",
          },
        ],
        defaultValue: [
          {
            "alarm-id": "ALM-01",
            location: "hallway-bedrooms",
            "brand-model": "Clipsal 755SMA",
            "alarm-type": "photoelectric",
            "power-source": "battery-sealed-lithium",
            "expired-over-10-years": "no",
            "mounting-position": "ceiling-centre",
            "positioning-compliant": "yes",
            "physical-condition": "good",
            "test-button-result": "pass",
            "sound-level-adequate": "yes",
            interconnection: "none",
            "battery-condition": "good",
            "compliance-status": "compliant",
            "action-required": "none",
            "work-completed": ["tested-only"],
          },
        ],
      },
    ],
  },
  {
    id: "inspection-photos",
    title: "Inspection Photos",
    description: "Photographic evidence of smoke alarm inspection and testing.",
    fields: [
      {
        id: "property-overview-photos",
        label: "Property Overview",
        type: "photo-multi",
        helpText: "General photos showing property layout and alarm locations",
        metadata: { max: 4 },
      },
      {
        id: "alarm-context-photos",
        label: "Alarm Installation Context",
        type: "photo-multi",
        required: true,
        helpText:
          "Wide shots showing each alarm's installation location and context",
        metadata: { max: 8 },
      },
      {
        id: "alarm-label-photos",
        label: "Manufacturer Labels",
        type: "photo-multi",
        required: true,
        helpText:
          "Close-up photos of manufacturer labels showing brand, model, and manufacture date",
        metadata: { max: 8 },
      },
      {
        id: "test-procedure-photos",
        label: "Testing in Progress",
        type: "photo-multi",
        required: true,
        helpText:
          "Photos showing test button being pressed or dB meter readings",
        metadata: { max: 8 },
      },
      {
        id: "replacement-photos",
        label: "Replacement Work",
        type: "photo-multi",
        helpText: "Before and after photos if any alarms were replaced",
        metadata: { max: 6 },
      },
      {
        id: "defect-photos",
        label: "Defects or Issues",
        type: "photo-multi",
        helpText:
          "Photos documenting any defects, damage, or non-compliance issues",
        metadata: { max: 6 },
      },
      {
        id: "additional-photos",
        label: "Additional Photos",
        type: "photo-multi",
        helpText: "Any other relevant photos for the inspection report",
        metadata: { max: 4 },
      },
    ],
  },
  {
    id: "compliance-assessment",
    title: "Overall Compliance Assessment",
    description: "Final assessment of property-wide smoke alarm compliance.",
    fields: [
      {
        id: "total-alarms-inspected",
        label: "Total alarms inspected",
        type: "number",
        required: true,
        defaultValue: 1,
      },
      {
        id: "compliant-alarms-count",
        label: "Number of compliant alarms",
        type: "number",
        required: true,
        defaultValue: 1,
      },
      {
        id: "non-compliant-alarms-count",
        label: "Number of non-compliant alarms",
        type: "number",
        required: true,
        defaultValue: 0,
      },
      {
        id: "alarms-replaced-count",
        label: "Number of alarms replaced today",
        type: "number",
        required: true,
        defaultValue: 0,
      },
      {
        id: "overall-property-compliance",
        label: "Overall property compliance status",
        type: "select",
        required: true,
        options: [
          {
            value: "fully-compliant",
            label: "Fully Compliant - All requirements met",
          },
          {
            value: "compliant-with-minor-issues",
            label: "Compliant with minor maintenance items",
          },
          {
            value: "non-compliant-work-required",
            label: "Non-compliant - Work required",
          },
          {
            value: "non-compliant-urgent",
            label: "Non-compliant - Urgent work required",
          },
        ],
      },
      {
        id: "compliance-issues-summary",
        label: "Summary of compliance issues",
        type: "textarea",
        placeholder: "Describe any compliance issues found during inspection",
        helpText:
          "Include details of expired alarms, positioning issues, coverage gaps, etc.",
      },
      {
        id: "work-required",
        label: "Work required to achieve compliance",
        type: "textarea",
        placeholder: "List specific work items required",
        helpText: "Detail what needs to be done, by when, and by whom",
      },
      {
        id: "urgent-safety-concerns",
        label: "Urgent safety concerns identified",
        type: "yes-no",
        required: true,
      },
      {
        id: "urgent-concerns-details",
        label: "Details of urgent safety concerns",
        type: "textarea",
        placeholder: "Describe any immediate safety risks",
        helpText: "Complete if urgent safety concerns exist",
      },
      {
        id: "reinspection-required",
        label: "Re-inspection required after remedial work",
        type: "yes-no",
        required: true,
      },
      {
        id: "reinspection-timeframe",
        label: "Re-inspection timeframe",
        type: "select",
        options: [
          { value: "immediate", label: "Immediate (within 48 hours)" },
          { value: "1-week", label: "Within 1 week" },
          { value: "2-weeks", label: "Within 2 weeks" },
          { value: "1-month", label: "Within 1 month" },
          { value: "3-months", label: "Within 3 months" },
        ],
        helpText: "Required if re-inspection needed",
      },
      {
        id: "maintenance-recommendations",
        label: "Maintenance recommendations",
        type: "textarea",
        placeholder: "Non-urgent maintenance suggestions",
        helpText: "Suggestions for improving alarm performance or compliance",
      },
    ],
  },
  {
    id: "certification-declaration",
    title: "Certification & Declaration",
    description: "Inspector certification and legal declarations.",
    fields: [
      {
        id: "inspector-details-name",
        label: "Inspector Full Name",
        type: "text",
        required: true,
        defaultValue: "Daniel Smith",
      },
      {
        id: "inspector-details-license",
        label: "Licence/Registration Number",
        type: "text",
        required: true,
        defaultValue: "EW123456",
      },
      {
        id: "inspector-details-company",
        label: "Company/Organization",
        type: "text",
        required: true,
        defaultValue: "RentalEase Technical Services",
      },
      {
        id: "inspector-details-phone",
        label: "Contact Phone Number",
        type: "text",
        required: true,
        defaultValue: "+61 3 9876 5432",
      },
      {
        id: "inspection-standards-applied",
        label: "Standards and regulations applied",
        type: "multi-select",
        required: true,
        options: [
          {
            value: "as3786-2014",
            label:
              "AS 3786:2014 Smoke alarms using scattered light, transmitted light or ionization",
          },
          {
            value: "rta-vic-2021",
            label: "Residential Tenancies Act (Victoria) 2021",
          },
          {
            value: "building-regulations",
            label: "Building Regulations 2018 (Victoria)",
          },
          {
            value: "as3000",
            label: "AS/NZS 3000:2018 Electrical installations",
          },
        ],
        defaultValue: ["as3786-2014", "rta-vic-2021"],
      },
      {
        id: "declaration-qualified",
        label:
          "I declare that I am appropriately qualified and licensed to conduct this smoke alarm inspection",
        type: "checkbox",
        required: true,
      },
      {
        id: "declaration-standards",
        label:
          "I declare that this inspection has been conducted in accordance with the applicable Australian Standards and Victorian legislation",
        type: "checkbox",
        required: true,
      },
      {
        id: "declaration-accuracy",
        label:
          "I declare that the information recorded in this report is true and accurate to the best of my knowledge",
        type: "checkbox",
        required: true,
      },
      {
        id: "declaration-compliance",
        label:
          "I declare that the compliance assessment provided is based on the current condition of the smoke alarms at the time of inspection",
        type: "checkbox",
        required: true,
      },
      {
        id: "technician-signature",
        label: "Inspector Signature",
        type: "signature",
        required: true,
      },
      {
        id: "signature-date",
        label: "Signature Date",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "report-completion-date",
        label: "Report Completion Date",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().split("T")[0],
      },
      {
        id: "report-version",
        label: "Report Template Version",
        type: "text",
        defaultValue: "3.0 - Smoke Only",
        readOnly: true,
      },
    ],
  },
];

// Create comprehensive Gas + Smoke combined template
const createGasSmokeTemplate = () => ({
  jobType: "GasSmoke",
  title: "Gas Safety & Smoke Alarm Inspection",
  version: 3,
  metadata: {
    category: "compliance",
    durationEstimateMins: 90,
    standards: ["AS 3786", "RTA VIC 2021", "Gas Safety Standards"],
    requiresPhotos: true,
    requiresSignature: true,
    summary: "Combined gas safety and smoke alarm compliance inspection",
  },
  sections: [
    {
      id: "inspection-details",
      title: "Inspection Details",
      description: "Basic inspection information and scheduling",
      fields: [
        {
          id: "inspection-date",
          label: "Inspection Date",
          type: "date",
          required: true,
        },
        {
          id: "inspection-time",
          label: "Inspection Time",
          type: "time",
          required: true,
          defaultValue: "09:00",
        },
        {
          id: "next-service-due",
          label: "Next Service Due Date",
          type: "date",
          required: true,
          helpText:
            "Gas safety checks are required every 24 months, smoke alarms annually",
        },
      ],
    },
    {
      id: "gas-installation",
      title: "Gas Installation Assessment",
      description:
        "Comprehensive gas safety inspection including appliances and fittings",
      fields: [
        {
          id: "gas-meter-accessible",
          label: "Gas meter accessible and readable",
          type: "yes-no",
          required: true,
        },
        {
          id: "gas-shutoff-valve",
          label: "Gas shut-off valve operates correctly",
          type: "yes-no",
          required: true,
        },
        {
          id: "gas-piping-condition",
          label: "Gas piping condition and connections",
          type: "select",
          required: true,
          options: [
            { value: "satisfactory", label: "Satisfactory" },
            { value: "minor-issues", label: "Minor Issues Noted" },
            { value: "major-concerns", label: "Major Concerns" },
            { value: "requires-repair", label: "Requires Immediate Repair" },
          ],
        },
        {
          id: "gas-leakage-test",
          label: "Gas leakage test result",
          type: "pass-fail",
          required: true,
        },
        {
          id: "gas-appliances-count",
          label: "Number of gas appliances inspected",
          type: "number",
          required: true,
          min: 0,
          max: 20,
        },
        {
          id: "gas-appliances-condition",
          label: "Overall gas appliances condition",
          type: "select",
          required: true,
          options: [
            { value: "all-satisfactory", label: "All Satisfactory" },
            { value: "some-minor-issues", label: "Some Minor Issues" },
            { value: "major-concerns", label: "Major Concerns Present" },
            {
              value: "unsafe-appliances",
              label: "Unsafe Appliances Identified",
            },
          ],
        },
        {
          id: "gas-ventilation-adequate",
          label: "Ventilation adequate for gas appliances",
          type: "yes-no",
          required: true,
        },
        {
          id: "gas-safety-compliance",
          label: "Overall gas safety compliance status",
          type: "select",
          required: true,
          options: [
            { value: "compliant", label: "Fully Compliant" },
            { value: "minor-non-compliance", label: "Minor Non-Compliance" },
            { value: "major-non-compliance", label: "Major Non-Compliance" },
            { value: "unsafe", label: "Unsafe - Immediate Action Required" },
          ],
        },
        {
          id: "gas-inspection-comments",
          label: "Gas inspection comments and observations",
          type: "textarea",
          placeholder:
            "Document any specific findings, issues, or recommendations",
        },
      ],
    },
    {
      id: "smoke-alarm-assessment",
      title: "Smoke Alarm Assessment",
      description:
        "Comprehensive smoke alarm compliance and functionality check",
      fields: [
        {
          id: "smoke-alarms-present",
          label: "Smoke alarms present in required locations",
          type: "yes-no",
          required: true,
        },
        {
          id: "alarm-locations-compliant",
          label: "Alarm locations comply with AS 3786 standards",
          type: "yes-no",
          required: true,
        },
        {
          id: "alarms-interconnected",
          label: "All smoke alarms interconnected",
          type: "yes-no",
          required: true,
        },
        {
          id: "alarm-count-total",
          label: "Total number of smoke alarms",
          type: "number",
          required: true,
          min: 1,
          max: 20,
        },
        {
          id: "alarms-tested-functional",
          label: "Number of alarms tested and functional",
          type: "number",
          required: true,
          min: 0,
          max: 20,
        },
        {
          id: "power-source-compliant",
          label: "Power source compliance (240V mains + backup)",
          type: "yes-no",
          required: true,
        },
        {
          id: "alarm-age-compliance",
          label: "All alarms within 10-year age limit",
          type: "yes-no",
          required: true,
        },
        {
          id: "smoke-alarm-compliance",
          label: "Overall smoke alarm compliance status",
          type: "select",
          required: true,
          options: [
            { value: "compliant", label: "Fully Compliant" },
            { value: "minor-non-compliance", label: "Minor Non-Compliance" },
            { value: "major-non-compliance", label: "Major Non-Compliance" },
            { value: "non-compliant", label: "Non-Compliant" },
          ],
        },
        {
          id: "smoke-inspection-comments",
          label: "Smoke alarm inspection comments",
          type: "textarea",
          placeholder:
            "Document any specific findings, replacements, or recommendations",
        },
      ],
    },
    {
      id: "individual-alarm-records",
      title: "Individual Smoke Alarm Records",
      description: "Detailed record for each smoke alarm inspected",
      fields: [
        {
          id: "alarm-records",
          label: "Smoke Alarm Details",
          type: "table",
          required: true,
          columns: [
            {
              id: "alarm-id",
              label: "Alarm ID",
              type: "text",
              required: true,
              placeholder: "001",
            },
            {
              id: "location",
              label: "Location",
              type: "select",
              required: true,
              options: [
                { value: "hallway-bedrooms", label: "Hallway (Bedrooms)" },
                { value: "hallway-living", label: "Hallway (Living Areas)" },
                { value: "bedroom-1", label: "Bedroom 1" },
                { value: "bedroom-2", label: "Bedroom 2" },
                { value: "bedroom-3", label: "Bedroom 3" },
                { value: "living-room", label: "Living Room" },
                { value: "kitchen", label: "Kitchen" },
                { value: "stairway", label: "Stairway" },
                { value: "basement", label: "Basement" },
                { value: "other", label: "Other" },
              ],
            },
            {
              id: "location-other",
              label: "Other Location",
              type: "text",
              placeholder: "Specify if Other selected",
            },
            {
              id: "brand",
              label: "Brand",
              type: "text",
              required: true,
              placeholder: "e.g., Brooks, Lifeguard",
            },
            {
              id: "model",
              label: "Model",
              type: "text",
              required: true,
              placeholder: "Model number",
            },
            {
              id: "alarm-type",
              label: "Alarm Type",
              type: "select",
              required: true,
              options: [
                { value: "photoelectric", label: "Photoelectric" },
                { value: "ionisation", label: "Ionisation" },
                { value: "dual-sensor", label: "Dual Sensor" },
              ],
            },
            {
              id: "power-source",
              label: "Power Source",
              type: "select",
              required: true,
              options: [
                { value: "mains-240v", label: "240V Mains" },
                { value: "battery-only", label: "Battery Only" },
                {
                  value: "mains-battery-backup",
                  label: "240V Mains + Battery Backup",
                },
              ],
            },
            {
              id: "manufacture-date",
              label: "Manufacture Date",
              type: "date",
              required: true,
            },
            {
              id: "expiry-date",
              label: "Expiry Date",
              type: "date",
              required: true,
            },
            {
              id: "push-test-result",
              label: "Push Test Result",
              type: "pass-fail",
              required: true,
            },
            {
              id: "compliance-status",
              label: "Compliance Status",
              type: "select",
              required: true,
              options: [
                { value: "compliant", label: "Compliant" },
                { value: "non-compliant", label: "Non-Compliant" },
                {
                  value: "requires-replacement",
                  label: "Requires Replacement",
                },
              ],
            },
            {
              id: "alarm-comments",
              label: "Comments",
              type: "textarea",
              placeholder: "Any specific notes for this alarm",
            },
          ],
        },
      ],
    },
    {
      id: "actions-taken",
      title: "Actions Taken",
      description: "Record of maintenance and remedial actions performed",
      fields: [
        {
          id: "gas-repairs-performed",
          label: "Gas repairs or adjustments performed",
          type: "multi-select",
          options: [
            { value: "no-repairs", label: "No Repairs Required" },
            { value: "leak-repair", label: "Gas Leak Repair" },
            { value: "valve-replacement", label: "Valve Replacement" },
            { value: "piping-repair", label: "Piping Repair" },
            { value: "appliance-service", label: "Appliance Service" },
            {
              value: "ventilation-improvement",
              label: "Ventilation Improvement",
            },
            { value: "other-gas", label: "Other Gas Work" },
          ],
        },
        {
          id: "smoke-actions-performed",
          label: "Smoke alarm actions performed",
          type: "multi-select",
          options: [
            { value: "no-action", label: "No Action Required" },
            { value: "battery-replacement", label: "Battery Replacement" },
            { value: "alarm-replacement", label: "Alarm Unit Replacement" },
            { value: "cleaning", label: "Cleaning/Maintenance" },
            { value: "new-installation", label: "New Alarm Installation" },
            {
              value: "interconnection-repair",
              label: "Interconnection Repair",
            },
            { value: "other-smoke", label: "Other Smoke Alarm Work" },
          ],
        },
        {
          id: "materials-supplied",
          label: "Materials supplied",
          type: "textarea",
          placeholder: "List any parts, batteries, or equipment supplied",
        },
        {
          id: "follow-up-required",
          label: "Follow-up action required",
          type: "yes-no-na",
          required: true,
        },
        {
          id: "follow-up-details",
          label: "Follow-up details",
          type: "textarea",
          placeholder: "Describe any follow-up work required",
        },
      ],
    },
    {
      id: "compliance-summary",
      title: "Compliance Summary",
      description: "Overall compliance status and certification",
      fields: [
        {
          id: "overall-gas-compliance",
          label: "Overall gas safety compliance",
          type: "select",
          required: true,
          options: [
            { value: "compliant", label: "Compliant" },
            {
              value: "compliant-with-minor-issues",
              label: "Compliant with Minor Issues",
            },
            { value: "non-compliant", label: "Non-Compliant" },
            { value: "unsafe", label: "Unsafe - Immediate Action Required" },
          ],
        },
        {
          id: "overall-smoke-compliance",
          label: "Overall smoke alarm compliance",
          type: "select",
          required: true,
          options: [
            { value: "compliant", label: "Compliant" },
            {
              value: "compliant-with-minor-issues",
              label: "Compliant with Minor Issues",
            },
            { value: "non-compliant", label: "Non-Compliant" },
          ],
        },
        {
          id: "combined-compliance-status",
          label: "Combined compliance status",
          type: "select",
          required: true,
          options: [
            { value: "fully-compliant", label: "Fully Compliant" },
            { value: "minor-issues", label: "Minor Issues Noted" },
            { value: "major-non-compliance", label: "Major Non-Compliance" },
            { value: "unsafe", label: "Unsafe Conditions Present" },
          ],
        },
        {
          id: "compliance-certificate-issued",
          label: "Compliance certificate issued",
          type: "yes-no",
          required: true,
        },
        {
          id: "certificate-valid-until",
          label: "Certificate valid until",
          type: "date",
          required: true,
        },
        {
          id: "landlord-notification-required",
          label: "Landlord notification required",
          type: "yes-no",
          required: true,
        },
        {
          id: "summary-comments",
          label: "Summary comments and recommendations",
          type: "textarea",
          required: true,
          placeholder:
            "Provide overall assessment and any important recommendations",
        },
      ],
    },
    {
      id: "certification",
      title: "Technician Certification",
      description: "Technician declaration and signature",
      fields: [
        {
          id: "technician-declaration",
          label:
            "I declare that this inspection has been carried out in accordance with relevant standards and regulations",
          type: "checkbox",
          required: true,
        },
        {
          id: "gasfitter-license",
          label: "Gasfitter license number",
          type: "text",
          required: true,
          placeholder: "Licensed gasfitter number",
        },
        {
          id: "electrical-license",
          label: "Electrical license number (if applicable)",
          type: "text",
          placeholder: "Electrical license number",
        },
        {
          id: "technician-signature",
          label: "Technician signature",
          type: "signature",
          required: true,
        },
        {
          id: "completion-date",
          label: "Report completion date",
          type: "date",
          required: true,
        },
      ],
    },
  ],
});

// Create a basic MinimumSafetyStandard template for database seeding (will be dynamically generated in practice)
const createBasicMinimumSafetyStandardTemplate = () => ({
  jobType: "MinimumSafetyStandard",
  title: "Minimum Safety Standard Inspection",
  version: 2,
  metadata: {
    category: "compliance",
    durationEstimateMins: 120,
    requiresRoomCount: true,
  },
  sections: [
    {
      id: "property-setup",
      title: "Property Configuration",
      description:
        "This template will be dynamically generated based on property room counts",
      fields: [
        {
          id: "dynamic-notice",
          label: "Dynamic Template Notice",
          type: "text",
          defaultValue:
            "This template is dynamically generated based on bedroom and bathroom counts.",
        },
      ],
    },
  ],
});

// NEW: Comprehensive Electrical & Smoke Safety Inspection Template
const createComprehensiveElectricalSmokeTemplate = () => ({
  jobType: "Electrical",
  title: "Electrical & Smoke Safety Inspection",
  version: 5,
  metadata: {
    category: "compliance",
    durationEstimateMins: 90,
    requiresSignature: true,
    requiresPhotos: true,
    summary: "Comprehensive electrical and smoke alarm safety inspection",
  },
  sections: createElectricalSmokeSections(),
});

export const defaultInspectionTemplates = [
  createElectricalTemplate(),
  createComprehensiveElectricalSmokeTemplate(), // Add the new comprehensive template
  gasTemplate,
  createGasSmokeTemplate(),
  createSmokeTemplate(),
  createBasicMinimumSafetyStandardTemplate(),
];

export default defaultInspectionTemplates;
