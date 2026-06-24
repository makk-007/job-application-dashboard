import { supabase } from "../app/lib/supabase";
import { JobDocument, DocumentType } from "../app/types";
import { parseSupabaseError } from "./errors";

function rowToDocument(row: any): JobDocument {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    name: row.name,
    versionLabel: row.version_label ?? "",
    fileUrl: row.file_url ?? "",
    createdAt: row.created_at,
  };
}

export async function getDocuments(): Promise<JobDocument[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map(rowToDocument);
}

export interface CreateDocumentInput {
  type?: DocumentType;
  name: string;
  versionLabel?: string;
  fileUrl?: string;
}

export async function createDocument(
  input: CreateDocumentInput,
): Promise<JobDocument> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in to add a document.");

  const { data, error } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      type: input.type ?? "other",
      name: input.name,
      version_label: input.versionLabel ?? "",
      file_url: input.fileUrl ?? "",
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToDocument(data);
}

export type UpdateDocumentInput = Partial<{
  type: DocumentType;
  name: string;
  versionLabel: string;
  fileUrl: string;
}>;

export async function updateDocument(
  id: string,
  updates: UpdateDocumentInput,
): Promise<JobDocument> {
  const dbUpdates: Record<string, any> = {};
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.versionLabel !== undefined)
    dbUpdates.version_label = updates.versionLabel;
  if (updates.fileUrl !== undefined) dbUpdates.file_url = updates.fileUrl;

  const { data, error } = await supabase
    .from("documents")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToDocument(data);
}

export async function deleteDocument(id: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw new Error(parseSupabaseError(error));
}

// ── Application-Document Linking ─────────────────────────────────────────

export interface ApplicationDocumentLink {
  id: string;
  applicationId: string;
  documentId: string;
}

function rowToLink(row: any): ApplicationDocumentLink {
  return {
    id: row.id,
    applicationId: row.application_id,
    documentId: row.document_id,
  };
}

/** Documents linked to a specific application (which resume/cover letter version was sent). */
export async function getApplicationDocuments(
  applicationId: string,
): Promise<(ApplicationDocumentLink & { document: JobDocument })[]> {
  const { data, error } = await supabase
    .from("application_documents")
    .select("*, document:documents(*)")
    .eq("application_id", applicationId);

  if (error) throw new Error(parseSupabaseError(error));
  return (data ?? []).map((row: any) => ({
    ...rowToLink(row),
    document: rowToDocument(row.document),
  }));
}

/** Count of applications a given document version has been sent to. */
export async function getDocumentUsageCount(
  documentId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("application_documents")
    .select("id", { count: "exact", head: true })
    .eq("document_id", documentId);

  if (error) throw new Error(parseSupabaseError(error));
  return count ?? 0;
}

export async function linkDocumentToApplication(
  applicationId: string,
  documentId: string,
): Promise<ApplicationDocumentLink> {
  const { data, error } = await supabase
    .from("application_documents")
    .insert({
      application_id: applicationId,
      document_id: documentId,
    })
    .select()
    .single();

  if (error) throw new Error(parseSupabaseError(error));
  return rowToLink(data);
}

export async function unlinkDocumentFromApplication(
  linkId: string,
): Promise<void> {
  const { error } = await supabase
    .from("application_documents")
    .delete()
    .eq("id", linkId);
  if (error) throw new Error(parseSupabaseError(error));
}
