import type { Offer, OfferDecision } from "../types";
import type { UpdateOfferInput } from "../../services/offers";

/** String-based form state, so inputs stay controlled while typing. */
export interface OfferFormState {
  applicationId: string;
  baseSalary: string;
  bonus: string;
  signingBonus: string;
  equity: string;
  currency: string;
  decisionDeadline: string;
  decision: OfferDecision;
  benefitsNotes: string;
  notes: string;
}

export const EMPTY_OFFER_FORM: OfferFormState = {
  applicationId: "",
  baseSalary: "",
  bonus: "",
  signingBonus: "",
  equity: "",
  currency: "USD",
  decisionDeadline: "",
  decision: "pending",
  benefitsNotes: "",
  notes: "",
};

function amountToField(value: number | null): string {
  return value === null ? "" : String(value);
}

/** Empty or non-numeric input becomes null (amount not specified). */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Pre-fills the form from a saved offer, for editing. */
export function offerToForm(offer: Offer): OfferFormState {
  return {
    applicationId: offer.applicationId,
    baseSalary: amountToField(offer.baseSalary),
    bonus: amountToField(offer.bonus),
    signingBonus: amountToField(offer.signingBonus),
    equity: offer.equity,
    currency: offer.currency,
    decisionDeadline: offer.decisionDeadline?.slice(0, 10) ?? "",
    decision: offer.decision,
    benefitsNotes: offer.benefitsNotes,
    notes: offer.notes,
  };
}

/**
 * Fields shared by create and edit. The decision is excluded on purpose:
 * it is changed from the offer card, which also syncs application status.
 */
export function formToOfferFields(
  form: OfferFormState,
): Omit<UpdateOfferInput, "decision"> {
  return {
    baseSalary: parseAmount(form.baseSalary),
    bonus: parseAmount(form.bonus),
    signingBonus: parseAmount(form.signingBonus),
    equity: form.equity,
    currency: form.currency,
    decisionDeadline: form.decisionDeadline || null,
    benefitsNotes: form.benefitsNotes,
    notes: form.notes,
  };
}
