const NEXT_COMPLIANCE_FIELD_IDS = [
  "next-inspection-date",
  "certification-next-inspection-due",
  "next-service-due",
];

const hasMeaningfulValue = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return false;
    }

    const normalizedValue = trimmedValue.toLowerCase();
    return normalizedValue !== "null" && normalizedValue !== "undefined";
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return true;
};

const findFieldValueDeep = (node, fieldId, visited = new Set()) => {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (visited.has(node)) {
    return null;
  }

  visited.add(node);

  if (!Array.isArray(node) && hasMeaningfulValue(node[fieldId])) {
    return node[fieldId];
  }

  const values = Array.isArray(node) ? node : Object.values(node);

  for (const value of values) {
    const resolvedValue = findFieldValueDeep(value, fieldId, visited);
    if (hasMeaningfulValue(resolvedValue)) {
      return resolvedValue;
    }
  }

  return null;
};

export const resolveNextComplianceDate = (
  template,
  formData = {},
  nextComplianceDate
) => {
  if (hasMeaningfulValue(nextComplianceDate)) {
    return nextComplianceDate;
  }

  for (const fieldId of NEXT_COMPLIANCE_FIELD_IDS) {
    if (hasMeaningfulValue(formData?.[fieldId])) {
      return formData[fieldId];
    }
  }

  if (template?.sections?.length) {
    for (const section of template.sections) {
      const sectionResponses = formData?.[section.id];
      if (!sectionResponses || typeof sectionResponses !== "object") {
        continue;
      }

      for (const fieldId of NEXT_COMPLIANCE_FIELD_IDS) {
        if (hasMeaningfulValue(sectionResponses[fieldId])) {
          return sectionResponses[fieldId];
        }
      }
    }
  }

  for (const fieldId of NEXT_COMPLIANCE_FIELD_IDS) {
    const resolvedValue = findFieldValueDeep(formData, fieldId);
    if (hasMeaningfulValue(resolvedValue)) {
      return resolvedValue;
    }
  }

  return null;
};

export const inspectionComplianceDateTestUtils = {
  NEXT_COMPLIANCE_FIELD_IDS,
  hasMeaningfulValue,
  findFieldValueDeep,
};
