import { supabase } from "../app/lib/supabase";
import { Interview, InterviewRoundType, InterviewOutcome } from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToInterview(row: any): Interview {
  return {
    id: row.id,
    applicationId: row.application_id,
    roundType: row.round_type,
    scheduledAt: row.scheduled_at,
    interviewerContactId: row.interviewer_contact_id,
    notes: row.notes ?? "",
    outcome: row.outcome,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Interview joined with its application's role/company and the interviewer contact, for list/calendar display. */
export interface InterviewWithContext extends Interview {
  application: {
    id: string;
    roleTitle: string;
    companyName: string;
  };
  interviewerName: string | null;
}

function rowToInterviewWithContext(row: any): InterviewWithContext {
  return {
    ...rowToInterview(row),
    application: {
      id: row.application.id,
      roleTitle: row.application.role_title,
      companyName: row.application.company?.name ?? "",
    },
    interviewerName: row.interviewer?.name ?? null,
  };
}

const INTERVIEW_SELECT =
  "*, application:applications(id, role_title, company:companies(name)), interviewer:contacts(name)";

/** All interviews across all applications for the signed-in user. */
export async function getInterviews(): Promise<InterviewWithContext[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToInterviewWithContext);
}

/** Interviews scoped to a single application, for the detail drawer. */
export async function getApplicationInterviews(
  applicationId: string,
): Promise<InterviewWithContext[]> {
  const { data, error } = await supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: true, nullsFirst: false });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToInterviewWithContext);
}

export interface CreateInterviewInput {
  applicationId: string;
  roundType?: InterviewRoundType;
  scheduledAt?: string | null;
  interviewerContactId?: string | null;
  notes?: string;
  outcome?: InterviewOutcome;
}

export async function createInterview(
  input: CreateInterviewInput,
): Promise<Interview> {
  const { data, error } = await supabase
    .from("interviews")
    .insert({
      application_id: input.applicationId,
      round_type: input.roundType ?? "other",
      scheduled_at: input.scheduledAt ?? null,
      interviewer_contact_id: input.interviewerContactId ?? null,
      notes: input.notes ?? "",
      outcome: input.outcome ?? "pending",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToInterview(data);
}

export type UpdateInterviewInput = Partial<{
  roundType: InterviewRoundType;
  scheduledAt: string | null;
  interviewerContactId: string | null;
  notes: string;
  outcome: InterviewOutcome;
}>;

export async function updateInterview(
  id: string,
  updates: UpdateInterviewInput,
): Promise<Interview> {
  const dbUpdates: Record<string, any> = {};
  if (updates.roundType !== undefined) dbUpdates.round_type = updates.roundType;
  if (updates.scheduledAt !== undefined)
    dbUpdates.scheduled_at = updates.scheduledAt;
  if (updates.interviewerContactId !== undefined)
    dbUpdates.interviewer_contact_id = updates.interviewerContactId;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.outcome !== undefined) dbUpdates.outcome = updates.outcome;

  const { data, error } = await supabase
    .from("interviews")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToInterview(data);
}

export async function deleteInterview(id: string): Promise<void> {
  const { error } = await supabase.from("interviews").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

/**
 * Interviews scheduled within the next `days` days (default 7), excluding
 * cancelled ones. Used by the dashboard's upcoming-interviews widget.
 */
export function getUpcomingInterviews(
  interviews: InterviewWithContext[],
  days = 7,
): InterviewWithContext[] {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return interviews
    .filter((i) => i.outcome !== "cancelled")
    .filter((i) => {
      if (!i.scheduledAt) return false;
      const date = new Date(i.scheduledAt);
      return date >= now && date <= cutoff;
    })
    .sort(
      (a, b) =>
        new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime(),
    );
}
