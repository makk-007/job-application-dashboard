import { describe, expect, it } from "vitest";
import type { Offer } from "../types";
import {
  EMPTY_OFFER_FORM,
  formToOfferFields,
  offerToForm,
  parseAmount,
} from "./offerForm";

const makeOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "offer-1",
  applicationId: "app-1",
  baseSalary: 90000,
  bonus: 5000,
  equity: "5,000 RSUs over 4 years",
  signingBonus: null,
  benefitsNotes: "Health insurance\nRemote stipend",
  currency: "GHS",
  decisionDeadline: "2026-11-20",
  decision: "pending",
  notes: "Negotiate base",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

describe("parseAmount", () => {
  it("returns null for empty or blank input", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("   ")).toBeNull();
  });

  it("parses numeric strings, including zero", () => {
    expect(parseAmount("85000")).toBe(85000);
    expect(parseAmount("0")).toBe(0);
  });

  it("returns null for non-numeric input", () => {
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("offerToForm", () => {
  it("fills every field from the saved offer", () => {
    expect(offerToForm(makeOffer())).toEqual({
      applicationId: "app-1",
      baseSalary: "90000",
      bonus: "5000",
      signingBonus: "",
      equity: "5,000 RSUs over 4 years",
      currency: "GHS",
      decisionDeadline: "2026-11-20",
      decision: "pending",
      benefitsNotes: "Health insurance\nRemote stipend",
      notes: "Negotiate base",
    });
  });

  it("uses an empty deadline when none is set", () => {
    expect(offerToForm(makeOffer({ decisionDeadline: null }))
      .decisionDeadline).toBe("");
  });
});

describe("formToOfferFields", () => {
  it("round-trips a saved offer without changing values", () => {
    const offer = makeOffer();
    expect(formToOfferFields(offerToForm(offer))).toEqual({
      baseSalary: 90000,
      bonus: 5000,
      signingBonus: null,
      equity: "5,000 RSUs over 4 years",
      currency: "GHS",
      decisionDeadline: "2026-11-20",
      benefitsNotes: "Health insurance\nRemote stipend",
      notes: "Negotiate base",
    });
  });

  it("turns cleared amounts and deadline into null", () => {
    const form = {
      ...offerToForm(makeOffer()),
      baseSalary: "",
      decisionDeadline: "",
    };
    const fields = formToOfferFields(form);
    expect(fields.baseSalary).toBeNull();
    expect(fields.decisionDeadline).toBeNull();
  });

  it("never includes the decision", () => {
    expect(formToOfferFields(EMPTY_OFFER_FORM)).not.toHaveProperty("decision");
  });
});
