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
