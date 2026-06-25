import { supabase } from "../app/lib/supabase";
import { Contact, ContactRelationship } from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToContact(row: any): Contact {
  return {
    id: row.id,
    userId: row.user_id,
    companyId: row.company_id,
    name: row.name,
    role: row.role ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",
    relationship: row.relationship,
    lastContactedAt: row.last_contacted_at,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Contact joined with its company name, for list display. */
export interface ContactWithCompany extends Contact {
  companyName: string | null;
}

function rowToContactWithCompany(row: any): ContactWithCompany {
  return {
    ...rowToContact(row),
    companyName: row.company?.name ?? null,
  };
}

const CONTACT_SELECT = "*, company:companies(name)";

export async function getContacts(): Promise<ContactWithCompany[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .order("name", { ascending: true });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToContactWithCompany);
}

export async function getContact(id: string): Promise<ContactWithCompany> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToContactWithCompany(data);
}

export interface CreateContactInput {
  companyId?: string | null;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  relationship?: ContactRelationship;
  lastContactedAt?: string | null;
  notes?: string;
}

export async function createContact(
  input: CreateContactInput,
): Promise<Contact> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add a contact.");

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      user_id: user.id,
      company_id: input.companyId ?? null,
      name: input.name,
      role: input.role ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      relationship: input.relationship ?? "other",
      last_contacted_at: input.lastContactedAt ?? null,
      notes: input.notes ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToContact(data);
}

export type UpdateContactInput = Partial<{
  companyId: string | null;
  name: string;
  role: string;
  email: string;
  phone: string;
  relationship: ContactRelationship;
  lastContactedAt: string | null;
  notes: string;
}>;

export async function updateContact(
  id: string,
  updates: UpdateContactInput,
): Promise<Contact> {
  const dbUpdates: Record<string, any> = {};
  if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.relationship !== undefined)
    dbUpdates.relationship = updates.relationship;
  if (updates.lastContactedAt !== undefined)
    dbUpdates.last_contacted_at = updates.lastContactedAt;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from("contacts")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToContact(data);
}

export async function deleteContact(id: string): Promise<void> {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

/** Marks a contact as contacted today. Convenience wrapper around updateContact. */
export async function markContactedToday(id: string): Promise<Contact> {
  const today = new Date().toISOString().split("T")[0];
  return updateContact(id, { lastContactedAt: today });
}

// ── Application-Contact Linking ─────────────────────────────────────────────

export interface ApplicationContactLink {
  id: string;
  applicationId: string;
  contactId: string;
  roleInProcess: string;
}

function rowToLink(row: any): ApplicationContactLink {
  return {
    id: row.id,
    applicationId: row.application_id,
    contactId: row.contact_id,
    roleInProcess: row.role_in_process ?? "",
  };
}

/** All contacts linked to a specific application, beyond the single primary contact. */
export async function getApplicationContacts(
  applicationId: string,
): Promise<(ApplicationContactLink & { contact: ContactWithCompany })[]> {
  const { data, error } = await supabase
    .from("application_contacts")
    .select(`*, contact:contacts(${CONTACT_SELECT})`)
    .eq("application_id", applicationId);

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map((row: any) => ({
    ...rowToLink(row),
    contact: rowToContactWithCompany(row.contact),
  }));
}

/** Every application a given contact is linked to, including via the link table. */
export async function getContactApplicationCount(
  contactId: string,
): Promise<number> {
  const [primaryResult, linkedResult] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId),
    supabase
      .from("application_contacts")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId),
  ]);

  if (primaryResult.error)
    throw new Error(parseSupabaseError(primaryResult.error));
  if (linkedResult.error)
    throw new Error(parseSupabaseError(linkedResult.error));

  return (primaryResult.count ?? 0) + (linkedResult.count ?? 0);
}

export async function linkContactToApplication(
  applicationId: string,
  contactId: string,
  roleInProcess?: string,
): Promise<ApplicationContactLink> {
  const { data, error } = await supabase
    .from("application_contacts")
    .insert({
      application_id: applicationId,
      contact_id: contactId,
      role_in_process: roleInProcess ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToLink(data);
}

export async function unlinkContactFromApplication(
  linkId: string,
): Promise<void> {
  const { error } = await supabase
    .from("application_contacts")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(parseSupabaseError(error));
}

// ── Follow-up Surfacing ──────────────────────────────────────────────────

/** Number of days with no contact before a relationship is flagged as needing follow-up. */
export const FOLLOW_UP_THRESHOLD_DAYS = 14;

/**
 * Whether a contact needs follow-up: either never logged as contacted, or
 * last contact was longer ago than the follow-up threshold. Used by the
 * dashboard's "Needs Follow-up" widget and the Contacts page badge.
 */
export function needsFollowUp(lastContactedAt: string | null): boolean {
  if (!lastContactedAt) return true;
  const days = Math.floor(
    (new Date().getTime() - new Date(lastContactedAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return days >= FOLLOW_UP_THRESHOLD_DAYS;
}
