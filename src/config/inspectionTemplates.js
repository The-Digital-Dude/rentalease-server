export const defaultInspectionTemplates = [
  {
    jobType: "Electrical",
    title: "Electrical Safety Inspection",
    version: 1,
    metadata: {
      category: "compliance",
      durationEstimateMins: 45,
    },
    sections: [
      {
        id: "switchboard",
        title: "Switchboard Checks",
        description: "Verify safety and labelling at the main switchboard.",
        fields: [
          {
            id: "main-switch-functional",
            label: "Main isolating switch operates correctly",
            type: "boolean",
            required: true,
          },
          {
            id: "rcd-status",
            label: "RCD status",
            type: "select",
            required: true,
            options: [
              { value: "pass", label: "Pass" },
              { value: "fail", label: "Fail" },
              { value: "not-present", label: "Not Present" },
            ],
          },
          {
            id: "switchboard-photos",
            label: "Switchboard photos",
            type: "photo-multi",
            metadata: {
              max: 6,
            },
          },
          {
            id: "switchboard-notes",
            label: "Notes",
            type: "textarea",
            placeholder: "Record any defects or recommendations",
          },
        ],
      },
      {
        id: "outlets",
        title: "Power Points & Appliances",
        fields: [
          {
            id: "outlet-sample-tested",
            label: "Sampled outlets tested",
            type: "number",
            required: true,
            min: 0,
          },
          {
            id: "outlet-fail-count",
            label: "Outlets failed",
            type: "number",
            min: 0,
          },
          {
            id: "appliance-photos",
            label: "Appliance photos",
            type: "photo-multi",
            metadata: {
              max: 8,
            },
          },
        ],
      },
    ],
  },
  {
    jobType: "Gas",
    title: "Gas Safety Inspection",
    version: 1,
    metadata: {
      category: "compliance",
      durationEstimateMins: 35,
    },
    sections: [
      {
        id: "meter",
        title: "Meter & Pressure",
        fields: [
          {
            id: "meter-leak-test",
            label: "Leak test passed",
            type: "boolean",
            required: true,
          },
          {
            id: "meter-reading",
            label: "Meter reading",
            type: "number",
            step: 0.1,
          },
        ],
      },
      {
        id: "appliances",
        title: "Appliance Checks",
        description: "Capture each appliance outcome.",
        fields: [
          {
            id: "appliance-summary",
            label: "Appliance summary",
            type: "textarea",
          },
          {
            id: "appliance-photos",
            label: "Appliance photos",
            type: "photo-multi",
            metadata: {
              max: 10,
            },
          },
        ],
      },
    ],
  },
  {
    jobType: "Smoke",
    title: "Smoke Alarm Compliance",
    version: 1,
    metadata: {
      category: "compliance",
      durationEstimateMins: 25,
    },
    sections: [
      {
        id: "alarms",
        title: "Alarm Inventory",
        fields: [
          {
            id: "total-alarms",
            label: "Total alarms",
            type: "number",
            min: 0,
            required: true,
          },
          {
            id: "alarms-tested",
            label: "Alarms tested",
            type: "number",
            min: 0,
            required: true,
          },
          {
            id: "alarms-failed",
            label: "Alarms failed",
            type: "number",
            min: 0,
          },
        ],
      },
      {
        id: "placement",
        title: "Placement & Compliance",
        fields: [
          {
            id: "hallway-alarm",
            label: "Hallway alarm present",
            type: "boolean",
            required: true,
          },
          {
            id: "placement-notes",
            label: "Notes",
            type: "textarea",
          },
          {
            id: "placement-photos",
            label: "Placement photos",
            type: "photo-multi",
            metadata: {
              max: 6,
            },
          },
        ],
      },
    ],
  },
];

export default defaultInspectionTemplates;
