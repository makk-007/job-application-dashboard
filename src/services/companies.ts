import { supabase } from "../app/lib/supabase";
import { Company } from "../app/types";
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

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToCompany);
}

export async function getCompany(id: string): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToCompany(data);
}

export async function createCompany(input: {
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
}): Promise<Company> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add a company.");

  const { data, error } = await supabase
    .from("companies")
    .insert({
      user_id: user.id,
      name: input.name,
      website: input.website ?? "",
      industry: input.industry ?? "",
      notes: input.notes ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToCompany(data);
}

export async function updateCompany(
  id: string,
  updates: Partial<{
    name: string;
    website: string;
    industry: string;
    notes: string;
  }>,
): Promise<Company> {
  const { data, error } = await supabase
    .from("companies")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToCompany(data);
}

export async function deleteCompany(id: string): Promise<void> {
  const { error } = await supabase.from("companies").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

/**
 * Finds an existing company by case-insensitive exact name match, or
 * creates one if none exists. Used by the Add Application flow so the
 * user can type a company name directly without a separate "create
 * company first" step, while still avoiding duplicate company records.
 */
export async function findOrCreateCompanyByName(
  name: string,
): Promise<Company> {
  const trimmed = name.trim();
  const { data: existing, error: findError } = await supabase
    .from("companies")
    .select("*")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();

  if (findError) throw new Error(parseSupabaseError(findError));
  if (existing) return rowToCompany(existing);

  return createCompany({ name: trimmed });
}
