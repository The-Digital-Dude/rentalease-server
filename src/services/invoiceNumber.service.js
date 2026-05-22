import Counter from "../models/Counter.js";

const INVOICE_NUMBER_PAD_LENGTH = 6;

const invoiceNumberConfigs = {
  invoice: {
    counterKey: "invoice",
    prefix: "INV-",
  },
  propertyManagerInvoice: {
    counterKey: "property_manager_invoice",
    prefix: "PM-INV-",
  },
};

export const formatInvoiceSequenceNumber = (
  type,
  sequence,
  padLength = INVOICE_NUMBER_PAD_LENGTH
) => {
  const config = invoiceNumberConfigs[type];
  if (!config) {
    throw new Error(`Unsupported invoice number type: ${type}`);
  }

  const normalizedSequence = Number(sequence);
  if (!Number.isInteger(normalizedSequence) || normalizedSequence <= 0) {
    throw new Error(`Invalid invoice sequence number: ${sequence}`);
  }

  return `${config.prefix}${String(normalizedSequence).padStart(
    padLength,
    "0"
  )}`;
};

export const getNextInvoiceNumber = async (type) => {
  const config = invoiceNumberConfigs[type];
  if (!config) {
    throw new Error(`Unsupported invoice number type: ${type}`);
  }

  const counter = await Counter.findOneAndUpdate(
    { key: config.counterKey },
    { $inc: { value: 1 } },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  return formatInvoiceSequenceNumber(type, counter.value);
};

export const INVOICE_NUMBER_TYPES = Object.freeze(
  Object.keys(invoiceNumberConfigs)
);
