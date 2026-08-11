export const AUSTRALIAN_TIMEZONES = Object.freeze([
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Hobart",
]);

const STATE_TIMEZONE_MAP = Object.freeze({
  NSW: "Australia/Sydney",
  ACT: "Australia/Sydney",
  VIC: "Australia/Melbourne",
  QLD: "Australia/Brisbane",
  SA: "Australia/Adelaide",
  WA: "Australia/Perth",
  NT: "Australia/Darwin",
  TAS: "Australia/Hobart",
});

const TIMESTAMP_SOURCE_VALUES = Object.freeze([
  "device_auto",
  "manual_override",
  "server_fallback",
]);

const TIMEZONE_VALIDATION_FORMATTER_CACHE = new Map();
const DATE_TIME_FORMATTER_CACHE = new Map();

export const TIMESTAMP_SOURCES = TIMESTAMP_SOURCE_VALUES;

const buildTimezoneError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

export const isValidTimeZone = (timeZone) => {
  if (!timeZone || typeof timeZone !== "string") {
    return false;
  }

  try {
    Intl.DateTimeFormat("en-AU", { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const isValidAustralianTimeZone = (timeZone) =>
  AUSTRALIAN_TIMEZONES.includes(timeZone) && isValidTimeZone(timeZone);

export const getDefaultTimeZoneForState = (state) =>
  STATE_TIMEZONE_MAP[String(state || "").trim().toUpperCase()] ||
  "Australia/Sydney";

export const resolvePropertyTimeZone = (property) => {
  const explicitTimeZone = property?.timezone;
  if (isValidAustralianTimeZone(explicitTimeZone)) {
    return explicitTimeZone;
  }

  return getDefaultTimeZoneForState(property?.address?.state);
};

export const normalizePropertyTimeZone = ({ timeZone, state }) => {
  if (timeZone) {
    if (!isValidAustralianTimeZone(timeZone)) {
      throw buildTimezoneError(
        "Timezone must be a valid Australian IANA timezone, for example Australia/Sydney"
      );
    }

    return timeZone;
  }

  return getDefaultTimeZoneForState(state);
};

const getFormatter = (timeZone) => {
  const key = timeZone || "UTC";
  if (!TIMEZONE_VALIDATION_FORMATTER_CACHE.has(key)) {
    TIMEZONE_VALIDATION_FORMATTER_CACHE.set(
      key,
      new Intl.DateTimeFormat("en-CA", {
        timeZone: key,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    );
  }

  return TIMEZONE_VALIDATION_FORMATTER_CACHE.get(key);
};

const getDateTimeFormatter = (timeZone, withTime = false) => {
  const key = `${timeZone || "UTC"}:${withTime ? "datetime" : "date"}`;
  if (!DATE_TIME_FORMATTER_CACHE.has(key)) {
    DATE_TIME_FORMATTER_CACHE.set(
      key,
      new Intl.DateTimeFormat("en-AU", {
        timeZone: timeZone || "UTC",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        ...(withTime
          ? {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
              timeZoneName: "short",
            }
          : {}),
      })
    );
  }

  return DATE_TIME_FORMATTER_CACHE.get(key);
};

const getPartsInTimeZone = (date, timeZone) => {
  const formatter = getFormatter(timeZone);
  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return {
    year: Number(partMap.year),
    month: Number(partMap.month),
    day: Number(partMap.day),
    hour: Number(partMap.hour),
    minute: Number(partMap.minute),
    second: Number(partMap.second),
  };
};

const getTimeZoneOffsetMs = (date, timeZone) => {
  const parts = getPartsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );

  return asUtc - date.getTime();
};

const parseLocalTimestampParts = (value) => {
  if (!value || typeof value !== "string") {
    throw buildTimezoneError("Timestamp must be a non-empty string");
  }

  const normalized = value.trim();
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?(?:Z|[+\-]\d{2}:\d{2})?$/
  );

  if (!match) {
    throw buildTimezoneError(
      "Timestamp must be an ISO datetime like 2026-05-22T14:30 or 2026-05-22T14:30:00"
    );
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] || 0),
    millisecond: Number(String(match[7] || "0").padEnd(3, "0")),
    includesOffset: /(?:Z|[+\-]\d{2}:\d{2})$/.test(normalized),
    normalized,
  };
};

const convertLocalPartsToUtcDate = (parts, timeZone) => {
  const targetUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond
  );

  let utcMs = targetUtcMs;

  for (let i = 0; i < 3; i += 1) {
    const offsetMs = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    const nextUtcMs = targetUtcMs - offsetMs;
    if (nextUtcMs === utcMs) {
      break;
    }
    utcMs = nextUtcMs;
  }

  return new Date(utcMs);
};

export const normalizeTimestampSource = (value, hasManualOverride = false) => {
  if (value && TIMESTAMP_SOURCE_VALUES.includes(value)) {
    return value;
  }

  return hasManualOverride ? "manual_override" : "device_auto";
};

export const resolveEventTimestamp = ({
  eventLocalTimestamp,
  eventTimezone,
  timestampSource,
  fallbackDate = new Date(),
  maxFutureSkewMinutes = 15,
}) => {
  if (!eventLocalTimestamp) {
    return {
      eventAt: fallbackDate,
      eventTimezone: null,
      eventLocalInput: null,
      timestampSource: "server_fallback",
      serverReceivedAt: fallbackDate,
    };
  }

  const serverReceivedAt = new Date();
  const parts = parseLocalTimestampParts(eventLocalTimestamp);
  let resolvedDate;

  if (parts.includesOffset) {
    resolvedDate = new Date(parts.normalized);
  } else {
    if (!isValidTimeZone(eventTimezone)) {
      throw buildTimezoneError(
        "A valid IANA timezone is required for local timestamps"
      );
    }

    resolvedDate = convertLocalPartsToUtcDate(parts, eventTimezone);
  }

  if (Number.isNaN(resolvedDate.getTime())) {
    throw buildTimezoneError("Unable to parse event timestamp");
  }

  const maxFutureMs = maxFutureSkewMinutes * 60 * 1000;
  if (resolvedDate.getTime() - serverReceivedAt.getTime() > maxFutureMs) {
    throw buildTimezoneError(
      "Event timestamp cannot be significantly in the future"
    );
  }

  return {
    eventAt: resolvedDate,
    eventTimezone: eventTimezone || null,
    eventLocalInput: parts.normalized,
    timestampSource: normalizeTimestampSource(
      timestampSource,
      timestampSource === "manual_override"
    ),
    serverReceivedAt,
  };
};

export const formatDateInTimeZone = (value, timeZone) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return getDateTimeFormatter(timeZone, false).format(date);
};

export const formatDateTimeInTimeZone = (value, timeZone) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return getDateTimeFormatter(timeZone, true).format(date);
};

// Shift → [startHour, endHour] in 24h local time
const SHIFT_HOURS = {
  morning:   { start: 8,  end: 12 },
  afternoon: { start: 13, end: 17 },
  evening:   { start: 17, end: 21 },
};

/**
 * Given a dueDate string (YYYY-MM-DD or ISO), a shift name, and a property timezone,
 * returns { scheduledStartTime, scheduledEndTime } as UTC Date objects.
 *
 * e.g. morning shift on 2026-08-11 in Australia/Sydney
 *   → scheduledStartTime: 2026-08-10T22:00:00Z  (08:00 AEST = UTC+10)
 *   → scheduledEndTime:   2026-08-11T02:00:00Z  (12:00 AEST)
 */
export const deriveScheduledTimes = (dueDate, shift, timeZone = "Australia/Sydney") => {
  if (!dueDate || !shift || !SHIFT_HOURS[shift]) {
    return { scheduledStartTime: null, scheduledEndTime: null };
  }

  const tz = isValidTimeZone(timeZone) ? timeZone : "Australia/Sydney";
  const { start, end } = SHIFT_HOURS[shift];

  // Parse the date part only (ignore any time component / timezone in the input)
  const dateOnly = String(dueDate).slice(0, 10); // "YYYY-MM-DD"
  const startLocal = `${dateOnly}T${String(start).padStart(2, "0")}:00:00`;
  const endLocal   = `${dateOnly}T${String(end).padStart(2, "0")}:00:00`;

  const startParts = parseLocalTimestampParts(startLocal);
  const endParts   = parseLocalTimestampParts(endLocal);

  return {
    scheduledStartTime: convertLocalPartsToUtcDate(startParts, tz),
    scheduledEndTime:   convertLocalPartsToUtcDate(endParts, tz),
  };
};
