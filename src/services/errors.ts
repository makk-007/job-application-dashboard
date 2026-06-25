/**
 * parseSupabaseError
 *
 * Translates raw Supabase / PostgREST errors into friendly, actionable
 * messages without exposing backend internals.
 *
 * Supabase errors have this shape:
 *   { code: string, message: string, details: string | null, hint: string | null }
 *
 * PostgreSQL error codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function parseSupabaseError(error: any): string {
  if (!error) return "An unexpected error occurred. Please try again.";

  const code: string = error.code ?? "";
  const message: string = (error.message ?? "").toLowerCase();

  // Authentication
  if (
    code === "PGRST301" ||
    message.includes("jwt") ||
    message.includes("auth")
  ) {
    return "Your session has expired. Please sign in again.";
  }

  // Check constraint violations (e.g. invalid status enum value)
  // PostgreSQL code 23514 = check_violation
  if (
    code === "23514" ||
    message.includes("check") ||
    message.includes("violates check constraint")
  ) {
    if (message.includes("status")) {
      return "That status is not valid for this item. Please choose a different status.";
    }
    if (message.includes("work_type")) {
      return "That work type is not valid. Please select onsite, remote, or hybrid.";
    }
    if (message.includes("source")) {
      return "That source is not valid. Please select a valid source option.";
    }
    if (message.includes("salary") || message.includes("amount")) {
      return "The value entered is not valid. Please enter a positive number.";
    }
    return "One of the values you entered is not allowed. Please check the fields and try again.";
  }

  // Not-null / required field violations
  // PostgreSQL code 23502 = not_null_violation
  if (
    code === "23502" ||
    message.includes("null value") ||
    message.includes("not-null")
  ) {
    return "A required field is missing. Please fill in all required fields and try again.";
  }

  // Unique constraint violations (duplicate entries)
  // PostgreSQL code 23505 = unique_violation
  if (
    code === "23505" ||
    message.includes("duplicate") ||
    message.includes("unique")
  ) {
    return "This entry already exists. Please use a different name or value.";
  }

  // Foreign key violations
  // PostgreSQL code 23503 = foreign_key_violation
  if (code === "23503" || message.includes("foreign key")) {
    return "This item is linked to other data and cannot be modified in that way.";
  }

  // Row-level security / permission denied
  // PostgreSQL code 42501 = insufficient_privilege; PostgREST PGRST116
  if (
    code === "42501" ||
    code === "PGRST116" ||
    message.includes("permission denied") ||
    message.includes("policy")
  ) {
    return "You do not have permission to perform this action.";
  }

  // Row not found
  // PostgREST returns PGRST116 for .single() with no rows
  if (
    code === "PGRST116" ||
    message.includes("no rows") ||
    message.includes("not found")
  ) {
    return "The item could not be found. It may have been deleted.";
  }

  // Network / connectivity
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("connection")
  ) {
    return "Could not reach the server. Please check your connection and try again.";
  }

  // Generic fallback : never expose the raw message
  return "Something went wrong. Please try again, or contact support if the problem persists.";
}
