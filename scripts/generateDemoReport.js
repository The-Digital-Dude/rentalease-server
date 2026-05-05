import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { buildInspectionReportPdf } from '../src/services/inspectionReportPdf.service.js';
import defaultInspectionTemplates from '../src/config/inspectionTemplates.js';
import fs from 'fs';
import path from 'path';

const generateDemoReport = async () => {
  // Mock data for report, template, job, property, technician
  const template = defaultInspectionTemplates.find(t => t.jobType === 'Electrical'); // Use an electrical template

  const report = {
    submittedAt: new Date().toISOString(),
    media: [], // Photos will go here
    formData: {
      "inspection-summary": {
        "inspection-date": new Date().toISOString(),
        "electrical-outcome": "no-faults",
        "smoke-outcome": "compliant",
        "summary-notes": "All good here."
      },
      "electrical-installations": {
        "installation-comments": "Wiring appears modern and in good condition.",
        "switchboard-accessible": "yes",
        "switchboard-labeling": "yes",
        "circuit-protection": "rcd",
        "wiring-condition": "good",
        "overall-condition": "good",
      },
      "safety-testing": {
        "testing-comments": "All tests passed successfully.",
        "rcd-testing": "pass"
      },
      "smoke-alarms": {
        "smoke-alarms-operational": "yes",
        "next-smoke-check-due": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        "smoke-notes": "All smoke alarms tested and functional.",
        "smoke-alarm-records": [
          {
            "location": "hallway",
            "brand": "Brooks",
            "model": "EIE3000",
            "power-source": "mains",
            "manufacture-date": "2020-01-01",
            "expiry-date": "2030-01-01",
            "age-years": 4,
            "battery-present": "yes",
            "physical-condition": "good",
            "compliance-status": "compliant",
            "alarm-comments": "Hallway alarm working correctly."
          },
          {
            "location": "bedroom-1",
            "brand": "PSA",
            "model": "SASA123",
            "power-source": "battery-9v",
            "manufacture-date": "2022-03-15",
            "expiry-date": "2027-03-15",
            "age-years": 2,
            "battery-present": "yes",
            "battery-replaced-today": "yes",
            "physical-condition": "good",
            "compliance-status": "compliant",
            "alarm-comments": "Bedroom 1 alarm. Battery replaced."
          },
        ]
      },
      "certification": {
        "certification-inspection-date": new Date().toISOString(),
        "certification-signed-at": "Melbourne",
        "technician-signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" // A tiny 1x1 transparent PNG
      }
    }
  };

  // Add some mock media items (photos)
  report.media.push(
    {
      fieldId: "electrical-installations",
      url: "https://via.placeholder.com/600x400?text=Electrical+Installation+Photo+1",
      gcsPath: null,
      metadata: { caption: "Main switchboard and circuit breakers." }
    },
    {
      fieldId: "electrical-installations",
      url: "https://via.placeholder.com/600x400?text=Electrical+Installation+Photo+2",
      gcsPath: null,
      metadata: { caption: "Wiring in the roof cavity." }
    },
    {
      fieldId: "smoke-alarms",
      url: "https://via.placeholder.com/600x400?text=Smoke+Alarm+Hallway",
      gcsPath: null,
      metadata: { caption: "Hallway smoke alarm (Brooks EIE3000)." }
    },
    {
      fieldId: "smoke-alarms",
      url: "https://via.placeholder.com/600x400?text=Smoke+Alarm+Bedroom",
      gcsPath: null,
      metadata: { caption: "Bedroom 1 smoke alarm (PSA SASA123)." }
    },
    {
      fieldId: "smoke-alarm-inventory-0", // For the first alarm in the repeatable section
      url: "https://via.placeholder.com/600x400?text=Smoke+Alarm+1+Detail",
      gcsPath: null,
      metadata: { caption: "Detail of Hallway Alarm." }
    },
    {
      fieldId: "smoke-alarm-inventory-1", // For the second alarm in the repeatable section
      url: "https://via.placeholder.com/600x400?text=Smoke+Alarm+2+Detail",
      gcsPath: null,
      metadata: { caption: "Detail of Bedroom 1 Alarm." }
    }
  );

  const job = {
    jobType: 'Electrical',
    dueDate: new Date().toISOString(),
  };

  const property = {
    address: {
      fullAddress: '123 Test Street, Testington, VIC 3000',
      street: '123 Test Street',
    },
  };

  const technician = {
    firstName: 'John',
    lastName: 'Doe',
    licenseNumber: 'EL-12345',
  };

  try {
    console.log('Generating PDF report...');
    const pdfBuffer = await buildInspectionReportPdf({
      report,
      template,
      job,
      property,
      technician,
    });

    const outputPath = path.resolve(__dirname, '../../demo-report.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`Demo report generated at: ${outputPath}`);
  } catch (error) {
    console.error('Error generating demo report:', error);
  }
};

generateDemoReport();
