export const CANONICAL_AGENCY_SERVICES = [
  "Smoke Alarm",
  "Minimum Safety Standard",
  "Electrical and Smoke Alarm",
  "Gas Safety Check",
];

const LEGACY_SERVICE_MAP = {
  Gas: "Gas Safety Check",
  "Gas Safety": "Gas Safety Check",
  "Gas Safety Check": "Gas Safety Check",
  "Gas Safety Inspection": "Gas Safety Check",
  "Smoke Alarm": "Smoke Alarm",
  Smoke: "Smoke Alarm",
  "Smoke Alarm Inspection": "Smoke Alarm",
  "Smoke and Electricity": "Electrical and Smoke Alarm",
  Electrical: "Electrical and Smoke Alarm",
  "Electrical Safety": "Electrical and Smoke Alarm",
  "Electrical Safety Check": "Electrical and Smoke Alarm",
  "Electrical Safety Inspection": "Electrical and Smoke Alarm",
  "Minimum Compliance": "Minimum Safety Standard",
  MinimumSafetyStandard: "Minimum Safety Standard",
  "Minimum Safety Standard": "Minimum Safety Standard",
};

export const mapToCanonicalAgencyService = (value) =>
  LEGACY_SERVICE_MAP[value] || null;

export const normalizeAgencyServicePricing = (servicePricing = []) => {
  if (!Array.isArray(servicePricing)) {
    throw new Error("servicePricing must be an array");
  }

  const seen = new Set();
  const normalized = servicePricing.reduce((acc, item) => {
    if (!item) return acc;

    const serviceType = mapToCanonicalAgencyService(item.serviceType);
    if (!serviceType) {
      throw new Error(`Invalid agency service type: ${item.serviceType}`);
    }

    if (seen.has(serviceType)) {
      throw new Error(`Duplicate service pricing entry for ${serviceType}`);
    }

    const price = Number(item.price);
    if (Number.isNaN(price) || price < 0) {
      throw new Error(`Invalid price for ${serviceType}`);
    }

    seen.add(serviceType);
    acc.push({
      serviceType,
      price,
    });
    return acc;
  }, []);

  return normalized;
};

export const deriveComplianceSubscriptions = (servicePricing = []) =>
  servicePricing.map((item) => item.serviceType);

export const deriveSubscriptionAmount = (servicePricing = []) =>
  servicePricing.reduce((sum, item) => sum + Number(item.price || 0), 0);

export const getAgencyServicePriceForJobType = (agency, jobType) => {
  const serviceType = mapToCanonicalAgencyService(jobType);
  if (!serviceType) {
    return null;
  }

  const servicePricing = Array.isArray(agency?.servicePricing)
    ? agency.servicePricing
    : [];
  const matched = servicePricing.find(
    (item) => item.serviceType === serviceType
  );

  if (!matched) {
    return null;
  }

  return {
    serviceType,
    price: Number(matched.price || 0),
  };
};
