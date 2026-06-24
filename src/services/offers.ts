import { supabase } from "../app/lib/supabase";
import { Offer, OfferDecision } from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToOffer(row: any): Offer {
  return {
    id: row.id,
    applicationId: row.application_id,
    baseSalary: row.base_salary !== null ? Number(row.base_salary) : null,
    bonus: row.bonus !== null ? Number(row.bonus) : null,
    equity: row.equity ?? "",
    signingBonus: row.signing_bonus !== null ? Number(row.signing_bonus) : null,
    benefitsNotes: row.benefits_notes ?? "",
    currency: row.currency ?? "USD",
    decisionDeadline: row.decision_deadline,
    decision: row.decision,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Offer joined with its application's role/company, for the comparison page. */
export interface OfferWithApplication extends Offer {
  application: {
    id: string;
    roleTitle: string;
    companyName: string;
    workType: string;
  };
}

function rowToOfferWithApplication(row: any): OfferWithApplication {
  return {
    ...rowToOffer(row),
    application: {
      id: row.application.id,
      roleTitle: row.application.role_title,
      companyName: row.application.company?.name ?? "",
      workType: row.application.work_type,
    },
  };
}

const OFFER_SELECT =
  "*, application:applications(id, role_title, work_type, company:companies(name))";

export async function getOffers(): Promise<OfferWithApplication[]> {
  const { data, error } = await supabase
    .from("offers")
    .select(OFFER_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToOfferWithApplication);
}

export async function getApplicationOffer(
  applicationId: string,
): Promise<Offer | null> {
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("application_id", applicationId)
    .maybeSingle();

  if (error) throw new Error(parseSupabaseError(error));
  return data ? rowToOffer(data) : null;
}

export interface CreateOfferInput {
  applicationId: string;
  baseSalary?: number | null;
  bonus?: number | null;
  equity?: string;
  signingBonus?: number | null;
  benefitsNotes?: string;
  currency?: string;
  decisionDeadline?: string | null;
  decision?: OfferDecision;
  notes?: string;
}

export async function createOffer(input: CreateOfferInput): Promise<Offer> {
  const { data, error } = await supabase
    .from("offers")
    .insert({
      application_id: input.applicationId,
      base_salary: input.baseSalary ?? null,
      bonus: input.bonus ?? null,
      equity: input.equity ?? "",
      signing_bonus: input.signingBonus ?? null,
      benefits_notes: input.benefitsNotes ?? "",
      currency: input.currency ?? "USD",
      decision_deadline: input.decisionDeadline ?? null,
      decision: input.decision ?? "pending",
      notes: input.notes ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToOffer(data);
}

export type UpdateOfferInput = Partial<{
  baseSalary: number | null;
  bonus: number | null;
  equity: string;
  signingBonus: number | null;
  benefitsNotes: string;
  currency: string;
  decisionDeadline: string | null;
  decision: OfferDecision;
  notes: string;
}>;

export async function updateOffer(
  id: string,
  updates: UpdateOfferInput,
): Promise<Offer> {
  const dbUpdates: Record<string, any> = {};
  if (updates.baseSalary !== undefined)
    dbUpdates.base_salary = updates.baseSalary;
  if (updates.bonus !== undefined) dbUpdates.bonus = updates.bonus;
  if (updates.equity !== undefined) dbUpdates.equity = updates.equity;
  if (updates.signingBonus !== undefined)
    dbUpdates.signing_bonus = updates.signingBonus;
  if (updates.benefitsNotes !== undefined)
    dbUpdates.benefits_notes = updates.benefitsNotes;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.decisionDeadline !== undefined)
    dbUpdates.decision_deadline = updates.decisionDeadline;
  if (updates.decision !== undefined) dbUpdates.decision = updates.decision;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from("offers")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToOffer(data);
}

export async function deleteOffer(id: string): Promise<void> {
  const { error } = await supabase.from("offers").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

/**
 * Total estimated annual compensation for ranking/comparison purposes.
 * Signing bonus is included at full value even though it is one-time,
 * since for a single comparison (this offer vs that offer, right now)
 * the one-time cash is part of what a candidate is actually choosing
 * between. Equity is excluded from the numeric total since it has no
 * reliable common unit across offers (dollar-denominated grants vs
 * percentage vs share counts) and is shown separately as free text
 * instead.
 */
export function estimateTotalComp(offer: Offer): number {
  return (
    (offer.baseSalary ?? 0) + (offer.bonus ?? 0) + (offer.signingBonus ?? 0)
  );
}
