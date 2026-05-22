import { jest } from "@jest/globals";

const mockFindOneAndUpdate = jest.fn();

jest.unstable_mockModule("../src/models/Counter.js", () => ({
  default: {
    findOneAndUpdate: mockFindOneAndUpdate,
  },
}));

const {
  formatInvoiceSequenceNumber,
  getNextInvoiceNumber,
} = await import("../src/services/invoiceNumber.service.js");

describe("invoiceNumber.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("formats standard invoice numbers with fixed-width padding", () => {
    expect(formatInvoiceSequenceNumber("invoice", 1)).toBe("INV-000001");
    expect(formatInvoiceSequenceNumber("invoice", 245)).toBe("INV-000245");
  });

  test("formats property manager invoice numbers with fixed-width padding", () => {
    expect(formatInvoiceSequenceNumber("propertyManagerInvoice", 7)).toBe(
      "PM-INV-000007"
    );
  });

  test("gets the next standard invoice number from the shared counter", async () => {
    mockFindOneAndUpdate.mockResolvedValue({ value: 18 });

    const invoiceNumber = await getNextInvoiceNumber("invoice");

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { key: "invoice" },
      { $inc: { value: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    expect(invoiceNumber).toBe("INV-000018");
  });

  test("gets the next property manager invoice number from the shared counter", async () => {
    mockFindOneAndUpdate.mockResolvedValue({ value: 302 });

    const invoiceNumber = await getNextInvoiceNumber("propertyManagerInvoice");

    expect(invoiceNumber).toBe("PM-INV-000302");
  });
});
