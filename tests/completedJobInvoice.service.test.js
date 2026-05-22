import { jest } from "@jest/globals";

const mockSendUserEmail = jest.fn();
const mockSendInvoiceSentNotification = jest.fn();
const mockJobFindById = jest.fn();
const mockAgencyFindById = jest.fn();
const mockPropertyManagerFind = jest.fn();

let buildInvoiceReviewData;
let sendCompletedJobInvoiceDocuments;

const buildQueryResult = (value) => ({
  select: jest.fn().mockResolvedValue(value),
});

beforeAll(async () => {
  jest.unstable_mockModule("../src/config/gcs.js", () => ({
    bucket: {
      file: jest.fn(() => ({
        download: jest.fn(),
      })),
    },
  }));

  jest.unstable_mockModule("../src/models/Job.js", () => ({
    default: {
      findById: mockJobFindById,
    },
  }));

  jest.unstable_mockModule("../src/models/Agency.js", () => ({
    default: {
      findById: mockAgencyFindById,
    },
  }));

  jest.unstable_mockModule("../src/models/PropertyManager.js", () => ({
    default: {
      find: mockPropertyManagerFind,
    },
  }));

  jest.unstable_mockModule("../src/services/email.service.js", () => ({
    default: {
      defaultFrom: "billing@rentalease.test",
      sendUserEmail: mockSendUserEmail,
    },
  }));

  jest.unstable_mockModule("../src/services/notification.service.js", () => ({
    default: {
      sendInvoiceSentNotification: mockSendInvoiceSentNotification,
    },
  }));

  ({
    buildInvoiceReviewData,
    sendCompletedJobInvoiceDocuments,
  } = await import("../src/services/completedJobInvoice.service.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("completedJobInvoice.service", () => {
  test("buildInvoiceReviewData includes agency and active property managers", async () => {
    mockJobFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        jobType: "Gas",
        job_id: "JOB-101",
        reportFile: "uploads/demo-all-inspections/gas-compliant.pdf",
        property: {
          _id: "property-1",
          address: {
            fullAddress: "1 Main St, Sydney NSW 2000",
          },
        },
      }),
    });
    mockAgencyFindById.mockReturnValue(
      buildQueryResult({
        companyName: "Agency Co",
        contactPerson: "Alice Agency",
        email: "agency@example.com",
      })
    );
    mockPropertyManagerFind.mockReturnValue(
      buildQueryResult([
        {
          firstName: "Pat",
          lastName: "Manager",
          email: "pm1@example.com",
        },
        {
          fullName: "Sam Supervisor",
          email: "pm2@example.com",
        },
        {
          fullName: "Duplicate Agency",
          email: "agency@example.com",
        },
      ])
    );

    const reviewData = await buildInvoiceReviewData({
      jobId: "job-1",
      agencyId: "agency-1",
    });

    expect(reviewData.propertyAddress).toBe("1 Main St, Sydney NSW 2000");
    expect(reviewData.jobType).toBe("Gas");
    expect(reviewData.recipients.to).toEqual([
      { email: "agency@example.com", name: "Alice Agency" },
      { email: "pm1@example.com", name: "Pat Manager" },
      { email: "pm2@example.com", name: "Sam Supervisor" },
    ]);
  });

  test("buildInvoiceReviewData falls back to latest inspection report pdf when job reportFile is missing", async () => {
    mockJobFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        jobType: "Gas",
        job_id: "JOB-303",
        reportFile: null,
        latestInspectionReport: {
          pdf: {
            url: "https://files.example.com/job-303-report.pdf",
          },
        },
        property: {
          _id: "property-3",
          address: {
            fullAddress: "3 George St, Brisbane QLD 4000",
          },
        },
      }),
    });
    mockAgencyFindById.mockReturnValue(
      buildQueryResult({
        companyName: "Agency Co",
        contactPerson: "Alice Agency",
        email: "agency@example.com",
      })
    );
    mockPropertyManagerFind.mockReturnValue(buildQueryResult([]));

    const reviewData = await buildInvoiceReviewData({
      jobId: "job-3",
      agencyId: "agency-1",
    });

    expect(reviewData.reportFile).toBe(
      "https://files.example.com/job-303-report.pdf"
    );
    expect(reviewData.hasReport).toBe(true);
  });

  test("sendCompletedJobInvoiceDocuments emails default recipients and marks invoice sent", async () => {
    mockJobFindById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        jobType: "Smoke",
        job_id: "JOB-202",
        reportFile: "uploads/demo-all-inspections/smoke-compliant.pdf",
        property: {
          _id: "property-2",
          address: {
            fullAddress: "2 Queen St, Melbourne VIC 3000",
          },
        },
      }),
    });
    mockAgencyFindById.mockReturnValue(
      buildQueryResult({
        companyName: "Agency Co",
        contactPerson: "Alice Agency",
        email: "agency@example.com",
      })
    );
    mockPropertyManagerFind.mockReturnValue(
      buildQueryResult([
        {
          fullName: "Sam Supervisor",
          email: "pm@example.com",
        },
      ])
    );

    const invoice = {
      _id: "invoice-1",
      jobId: "job-2",
      agencyId: "agency-1",
      invoiceNumber: "INV-202",
      description: "Smoke alarm compliance",
      items: [
        {
          name: "Smoke service",
          quantity: 1,
          rate: 120,
          amount: 120,
        },
      ],
      subtotal: 120,
      tax: 0,
      totalCost: 120,
      status: "Draft",
      notes: "Completed on site",
      save: jest.fn().mockResolvedValue(undefined),
    };

    await sendCompletedJobInvoiceDocuments({
      invoice,
      subject: "Completed Job Documents - Smoke - 2 Queen St",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
      uploadedInvoiceAttachment: {
        originalname: "invoice.pdf",
        buffer: Buffer.from("invoice-pdf"),
      },
      sentBy: {
        id: "tech-1",
        name: "Test Technician",
        type: "Technician",
      },
    });

    expect(mockSendUserEmail).toHaveBeenCalledTimes(1);
    const emailPayload = mockSendUserEmail.mock.calls[0][0];
    expect(emailPayload.to).toEqual([
      { email: "agency@example.com", name: "Alice Agency" },
      { email: "pm@example.com", name: "Sam Supervisor" },
    ]);
    expect(emailPayload.attachments).toHaveLength(2);
    expect(emailPayload.attachments[0].filename).toBe("invoice.pdf");
    expect(emailPayload.attachments[1].filename).toBe(
      "inspection-report-JOB-202.pdf"
    );
    expect(invoice.status).toBe("Sent");
    expect(invoice.sentAt).toBeInstanceOf(Date);
    expect(invoice.save).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    await Promise.resolve();
    expect(mockSendInvoiceSentNotification).toHaveBeenCalledWith(invoice, {
      id: "tech-1",
      name: "Test Technician",
      type: "Technician",
    });
  });
});
