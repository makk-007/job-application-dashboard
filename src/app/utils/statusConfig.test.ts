import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationStatus } from "../types";
import { STALE_THRESHOLD_DAYS, getDaysSince, isStale } from "./statusConfig";

const NOW = new Date("2026-10-18T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(NOW.getTime() - days * DAY_MS).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getDaysSince", () => {
  it("returns null when there is no date", () => {
    expect(getDaysSince(null)).toBeNull();
  });

  it("counts whole days", () => {
    expect(getDaysSince(daysAgo(3))).toBe(3);
  });

  it("rounds partial days down", () => {
    expect(getDaysSince(daysAgo(2.9))).toBe(2);
  });
});

describe("isStale", () => {
  it("flags applied and screening applications at the threshold", () => {
    expect(isStale("applied", daysAgo(STALE_THRESHOLD_DAYS))).toBe(true);
    expect(isStale("screening", daysAgo(STALE_THRESHOLD_DAYS + 10))).toBe(true);
  });

  it("does not flag applications just under the threshold", () => {
    expect(isStale("applied", daysAgo(STALE_THRESHOLD_DAYS - 1))).toBe(false);
  });

  it("does not flag recently updated applications", () => {
    expect(isStale("applied", daysAgo(0))).toBe(false);
  });

  it("never flags statuses other than applied and screening", () => {
    const others: ApplicationStatus[] = [
      "lead",
      "interviewing",
      "offer",
      "rejected",
      "withdrawn",
      "declined",
    ];
    for (const status of others) {
      expect(isStale(status, daysAgo(365))).toBe(false);
    }
  });
});
