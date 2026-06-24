import { supabase } from "../app/lib/supabase";
import {
  Application,
  ApplicationWithCompany,
  ApplicationStatus,
  ChecklistItem,
  Company,
} from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToCompany(row: any): Company {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    website: row.website ?? "",
    industry: row.industry ?? "",
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToApplication(row: any): Application {
  return {
    id: row.id,
    userId: row.user_id,
    roundId: row.round_id,
    companyId: row.company_id,
    contactId: row.contact_id,
    roleTitle: row.role_title,
    jobPostUrl: row.job_post_url ?? "",
    source: row.source,
    workType: row.work_type,
    relocationRequired: row.relocation_required,
    relocationSponsored: row.relocation_sponsored,
    salaryMin: row.salary_min !== null ? Number(row.salary_min) : null,
    salaryMax: row.salary_max !== null ? Number(row.salary_max) : null,
    currency: row.currency ?? "USD",
    status: row.status,
    appliedDate: row.applied_date,
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToApplicationWithCompany(row: any): ApplicationWithCompany {
  return {
    ...rowToApplication(row),
    company: rowToCompany(row.company),
  };
}

function rowToChecklistItem(row: any): ChecklistItem {
  return {
    id: row.id,
    applicationId: row.application_id,
    item: row.item,
    completed: row.completed,
    createdAt: row.created_at,
  };
}

const APPLICATION_SELECT = "*, company:companies(*)";

/**
 * Fetches all applications for the signed-in user, joined with their
 * company. Pass roundId to scope to a single job search round; omit it to
 * get every application regardless of round.
 */
export async function getApplications(
  roundId?: string,
): Promise<ApplicationWithCompany[]> {
  let query = supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .order("updated_at", { ascending: false });

  if (roundId) {
    query = query.eq("round_id", roundId);
  }

  const { data, error } = await query;
  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToApplicationWithCompany);
}

export async function getApplication(
  id: string,
): Promise<ApplicationWithCompany> {
  const { data, error } = await supabase
    .from("applications")
    .select(APPLICATION_SELECT)
    .eq("id", id)
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToApplicationWithCompany(data);
}

export interface CreateApplicationInput {
  companyId: string;
  roundId?: string | null;
  contactId?: string | null;
  roleTitle: string;
  jobPostUrl?: string;
  source?: Application["source"];
  workType?: Application["workType"];
  relocationRequired?: boolean;
  relocationSponsored?: boolean;
  salaryMin?: number | null;
  salaryMax?: number | null;
  currency?: string;
  status?: ApplicationStatus;
  appliedDate?: string | null;
  notes?: string;
}

export async function createApplication(
  input: CreateApplicationInput,
): Promise<Application> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add an application.");

  const status = input.status ?? "lead";

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      round_id: input.roundId ?? null,
      company_id: input.companyId,
      contact_id: input.contactId ?? null,
      role_title: input.roleTitle,
      job_post_url: input.jobPostUrl ?? "",
      source: input.source ?? "job board",
      work_type: input.workType ?? "onsite",
      relocation_required: input.relocationRequired ?? false,
      relocation_sponsored: input.relocationSponsored ?? false,
      salary_min: input.salaryMin ?? null,
      salary_max: input.salaryMax ?? null,
      currency: input.currency ?? "USD",
      status,
      applied_date: input.appliedDate ?? null,
      notes: input.notes ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));

  // Log the initial status the same way every later transition is logged,
  // so an application's full lifecycle is visible from creation onward.
  await logStatusChange(user.id, data.id, null, status);

  return rowToApplication(data);
}

export type UpdateApplicationInput = Partial<{
  roundId: string | null;
  companyId: string;
  contactId: string | null;
  roleTitle: string;
  jobPostUrl: string;
  source: Application["source"];
  workType: Application["workType"];
  relocationRequired: boolean;
  relocationSponsored: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  notes: string;
}>;

/**
 * Updates an application. If the update includes a status change, the
 * transition is logged to status_history automatically so callers never
 * need to remember to log it separately.
 */
export async function updateApplication(
  id: string,
  updates: UpdateApplicationInput,
): Promise<Application> {
  const dbUpdates: Record<string, any> = {};
  if (updates.roundId !== undefined) dbUpdates.round_id = updates.roundId;
  if (updates.companyId !== undefined) dbUpdates.company_id = updates.companyId;
  if (updates.contactId !== undefined) dbUpdates.contact_id = updates.contactId;
  if (updates.roleTitle !== undefined) dbUpdates.role_title = updates.roleTitle;
  if (updates.jobPostUrl !== undefined)
    dbUpdates.job_post_url = updates.jobPostUrl;
  if (updates.source !== undefined) dbUpdates.source = updates.source;
  if (updates.workType !== undefined) dbUpdates.work_type = updates.workType;
  if (updates.relocationRequired !== undefined)
    dbUpdates.relocation_required = updates.relocationRequired;
  if (updates.relocationSponsored !== undefined)
    dbUpdates.relocation_sponsored = updates.relocationSponsored;
  if (updates.salaryMin !== undefined) dbUpdates.salary_min = updates.salaryMin;
  if (updates.salaryMax !== undefined) dbUpdates.salary_max = updates.salaryMax;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.appliedDate !== undefined)
    dbUpdates.applied_date = updates.appliedDate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  let previousStatus: ApplicationStatus | null = null;
  if (updates.status !== undefined) {
    const { data: current, error: fetchError } = await supabase
      .from("applications")
      .select("status")
      .eq("id", id)
      .single();
    if (fetchError) throw new Error(parseSupabaseError(fetchError));
    previousStatus = current.status as ApplicationStatus;
  }

  const { data, error } = await supabase
    .from("applications")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));

  if (updates.status !== undefined && updates.status !== previousStatus) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logStatusChange(user.id, id, previousStatus, updates.status);
    }
  }

  return rowToApplication(data);
}

export async function deleteApplication(id: string): Promise<void> {
  const { error } = await supabase.from("applications").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function deleteApplications(ids: string[]): Promise<void> {
  const { error } = await supabase.from("applications").delete().in("id", ids);
  if (error) throw new Error(parseSupabaseError(error));
}

export async function duplicateApplication(id: string): Promise<Application> {
  const original = await getApplication(id);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw new Error("You must be signed in to duplicate an application.");

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: user.id,
      round_id: original.roundId,
      company_id: original.companyId,
      contact_id: original.contactId,
      role_title: `${original.roleTitle} (Copy)`,
      job_post_url: original.jobPostUrl,
      source: original.source,
      work_type: original.workType,
      relocation_required: original.relocationRequired,
      relocation_sponsored: original.relocationSponsored,
      salary_min: original.salaryMin,
      salary_max: original.salaryMax,
      currency: original.currency,
      status: "lead",
      applied_date: null,
      notes: original.notes,
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));

  await logStatusChange(user.id, data.id, null, "lead");

  // Copy checklist items, resetting completion so the duplicate starts fresh.
  const { data: items } = await supabase
    .from("checklist")
    .select("item")
    .eq("application_id", id);

  if (items && items.length > 0) {
    await supabase.from("checklist").insert(
      items.map((i) => ({
        application_id: data.id,
        item: i.item,
        completed: false,
      })),
    );
  }

  return rowToApplication(data);
}

// ── Status History ──────────────────────────────────────────────────────

async function logStatusChange(
  userId: string,
  applicationId: string,
  fromStatus: ApplicationStatus | null,
  toStatus: ApplicationStatus,
): Promise<void> {
  const { error } = await supabase.from("status_history").insert({
    user_id: userId,
    application_id: applicationId,
    from_status: fromStatus,
    to_status: toStatus,
  });
  // Status history is supplementary; a failure here should not block the
  // status change itself from having already succeeded.
  if (error) console.error("Failed to log status change:", error);
}

export async function getStatusHistory(
  applicationId: string,
): Promise<
  {
    fromStatus: ApplicationStatus | null;
    toStatus: ApplicationStatus;
    changedAt: string;
  }[]
> {
  const { data, error } = await supabase
    .from("status_history")
    .select("from_status, to_status, changed_at")
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: true });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map((row) => ({
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
  }));
}

// ── Checklist ──────────────────────────────────────────────────────────────

export async function getChecklistItems(
  applicationId: string,
): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist")
    .select("*")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToChecklistItem);
}

export async function addChecklistItem(
  applicationId: string,
  item: string,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("checklist")
    .insert({ application_id: applicationId, item, completed: false })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToChecklistItem(data);
}

export async function updateChecklistItem(
  id: string,
  updates: Partial<{ item: string; completed: boolean }>,
): Promise<ChecklistItem> {
  const { data, error } = await supabase
    .from("checklist")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToChecklistItem(data);
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { error } = await supabase.from("checklist").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}
