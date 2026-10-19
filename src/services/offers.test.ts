import { describe, expect, it } from "vitest";
import { Offer } from "../app/types";
import { estimateTotalComp } from "./offers";

const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "offer-1",
  applicationId: "app-1",
  baseSalary: null,
  bonus: null,
  equity: "",
  signingBonus: null,
  benefitsNotes: "",
  currency: "USD",
  decisionDeadline: null,
  decision: "pending",
  notes: "",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

describe("estimateTotalComp", () => {
  it("adds base salary, bonus and signing bonus", () => {
    const offer = makeOffer({ baseSalary: 100000, bonus: 10000, signingBonus: 5000 });
    expect(estimateTotalComp(offer)).toBe(115000);
  });

  it("treats missing amounts as zero", () => {
    expect(estimateTotalComp(makeOffer({ baseSalary: 90000 }))).toBe(90000);
    expect(estimateTotalComp(makeOffer({ bonus: 2000, signingBonus: 3000 }))).toBe(5000);
  });

  it("returns zero when no amounts are set", () => {
    expect(estimateTotalComp(makeOffer())).toBe(0);
  });

  it("ignores equity text", () => {
    expect(estimateTotalComp(makeOffer({ baseSalary: 80000, equity: "0.5% over 4 years" }))).toBe(80000);
  });

  it("orders offers by total compensation", () => {
    const low = makeOffer({ id: "low", baseSalary: 80000, bonus: 5000 });
    const high = makeOffer({ id: "high", baseSalary: 70000, signingBonus: 30000 });
    const ranked = [low, high].sort((a, b) => estimateTotalComp(b) - estimateTotalComp(a));
    expect(ranked.map((o) => o.id)).toEqual(["high", "low"]);
  });
});
