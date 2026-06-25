import { supabase } from "../app/lib/supabase";
import { JobSearchRound } from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToRound(row: any): JobSearchRound {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? "",
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    isActive: row.is_active ?? false,
    isArchived: row.is_archived ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getRounds(): Promise<JobSearchRound[]> {
  const { data, error } = await supabase
    .from("job_search_rounds")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToRound);
}

export async function createRound(input: {
  name: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
}): Promise<JobSearchRound> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to create a search round.");

  // If this new round is being created as active, deactivate any existing
  // active round first so the one-active-round-per-user constraint holds.
  if (input.isActive) {
    await supabase
      .from("job_search_rounds")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .eq("is_active", true);
  }

  const { data, error } = await supabase
    .from("job_search_rounds")
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description ?? "",
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      is_active: input.isActive ?? false,
      is_archived: false,
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToRound(data);
}

export async function updateRound(
  id: string,
  updates: Partial<{
    name: string;
    description: string;
    startDate: string | null;
    endDate: string | null;
  }>,
): Promise<JobSearchRound> {
  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined)
    dbUpdates.description = updates.description;
  if (updates.startDate !== undefined) dbUpdates.start_date = updates.startDate;
  if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;

  const { data, error } = await supabase
    .from("job_search_rounds")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToRound(data);
}

export async function setActiveRound(id: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error: deactivateError } = await supabase
    .from("job_search_rounds")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  if (deactivateError) throw new Error(parseSupabaseError(deactivateError));

  const { error } = await supabase
    .from("job_search_rounds")
    .update({ is_active: true })
    .eq("id", id);

  if (error) throw new Error(parseSupabaseError(error));
}

export async function archiveRound(id: string): Promise<void> {
  const { error } = await supabase
    .from("job_search_rounds")
    .update({ is_active: false, is_archived: true })
    .eq("id", id);

  if (error) throw new Error(parseSupabaseError(error));
}

export async function unarchiveRound(id: string): Promise<void> {
  const { error } = await supabase
    .from("job_search_rounds")
    .update({ is_archived: false })
    .eq("id", id);

  if (error) throw new Error(parseSupabaseError(error));
}

export async function deleteRound(id: string): Promise<void> {
  const { error } = await supabase
    .from("job_search_rounds")
    .delete()
    .eq("id", id);

  if (error) throw new Error(parseSupabaseError(error));
}
