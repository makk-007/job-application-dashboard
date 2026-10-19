import { describe, expect, it } from "vitest";
import { formatInterviewDateTime, formatSalary } from "./formatters";

describe("formatSalary", () => {
  it("reports an unspecified salary when both ends are missing", () => {
    expect(formatSalary(null, null, "USD")).toBe("Not specified");
  });

  it("formats a range with an en dash", () => {
    expect(formatSalary(500, 900, "USD")).toBe("USD 500–900");
  });

  it("formats a single value when only one end is set", () => {
    expect(formatSalary(750, null, "EUR")).toBe("EUR 750");
    expect(formatSalary(null, 800, "EUR")).toBe("EUR 800");
  });
});

describe("formatInterviewDateTime", () => {
  it("handles a missing date", () => {
    expect(formatInterviewDateTime(null)).toBe("No date set");
  });

  it("formats a date as month, day and time", () => {
    // The exact text depends on the machine's time zone, so check the shape.
    expect(formatInterviewDateTime("2026-10-20T14:00:00Z")).toMatch(
      /^[A-Z][a-z]{2} \d{1,2}, \d{1,2}:\d{2}\s(AM|PM)$/,
    );
  });
});
