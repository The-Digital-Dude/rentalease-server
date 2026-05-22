import {
  AUSTRALIAN_TIMEZONES,
  formatDateInTimeZone,
  getDefaultTimeZoneForState,
  normalizePropertyTimeZone,
  resolveEventTimestamp,
  resolvePropertyTimeZone,
} from "../src/utils/timezone.js";

describe("timezone utilities", () => {
  test("returns the default timezone for an Australian state", () => {
    expect(getDefaultTimeZoneForState("VIC")).toBe("Australia/Melbourne");
    expect(getDefaultTimeZoneForState("NSW")).toBe("Australia/Sydney");
  });

  test("normalizes a property timezone from state when none is provided", () => {
    expect(normalizePropertyTimeZone({ state: "QLD" })).toBe(
      "Australia/Brisbane"
    );
  });

  test("rejects unsupported property timezones", () => {
    expect(() =>
      normalizePropertyTimeZone({
        timeZone: "America/New_York",
        state: "VIC",
      })
    ).toThrow("Timezone must be a valid Australian IANA timezone");
  });

  test("resolves a property timezone from explicit field or state fallback", () => {
    expect(resolvePropertyTimeZone({ timezone: "Australia/Perth" })).toBe(
      "Australia/Perth"
    );
    expect(resolvePropertyTimeZone({ address: { state: "SA" } })).toBe(
      "Australia/Adelaide"
    );
  });

  test("converts a local device timestamp and timezone into UTC", () => {
    const resolved = resolveEventTimestamp({
      eventLocalTimestamp: "2024-05-22T14:30:00",
      eventTimezone: "Australia/Perth",
      timestampSource: "device_auto",
    });

    expect(resolved.eventAt.toISOString()).toBe("2024-05-22T06:30:00.000Z");
    expect(resolved.eventTimezone).toBe("Australia/Perth");
    expect(resolved.timestampSource).toBe("device_auto");
  });

  test("uses server fallback when timestamp payload is missing", () => {
    const fallbackDate = new Date("2026-05-22T10:00:00.000Z");
    const resolved = resolveEventTimestamp({ fallbackDate });

    expect(resolved.eventAt).toBe(fallbackDate);
    expect(resolved.timestampSource).toBe("server_fallback");
  });

  test("formats a date in the property timezone", () => {
    const formatted = formatDateInTimeZone(
      "2026-05-22T06:30:00.000Z",
      "Australia/Perth"
    );

    expect(formatted).toContain("22");
    expect(AUSTRALIAN_TIMEZONES).toContain("Australia/Perth");
  });
});
