import { describe, expect, it } from "vitest";
import { parseSupabaseError } from "./errors";

describe("parseSupabaseError", () => {
  it("returns a generic message when there is no error", () => {
    expect(parseSupabaseError(null)).toBe("An unexpected error occurred. Please try again.");
    expect(parseSupabaseError(undefined)).toBe("An unexpected error occurred. Please try again.");
  });

  it("maps an expired session", () => {
    expect(parseSupabaseError({ message: "JWT expired" })).toBe(
      "Your session has expired. Please sign in again.",
    );
  });

  it("maps database error codes", () => {
    expect(parseSupabaseError({ code: "23505" })).toMatch(/already exists/);
    expect(parseSupabaseError({ code: "23503" })).toMatch(/linked to other data/);
    expect(parseSupabaseError({ code: "23502" })).toMatch(/required field is missing/);
    expect(parseSupabaseError({ code: "42501" })).toMatch(/do not have permission/);
  });

  it("reports a missing row as not found, not as a permission problem", () => {
    const result = parseSupabaseError({
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
    });
    expect(result).toBe("The item could not be found. It may have been deleted.");
  });

  it("still reports permission failures by message", () => {
    expect(parseSupabaseError({ message: "permission denied for table applications" })).toMatch(
      /do not have permission/,
    );
  });

  it("explains check constraint failures by field", () => {
    expect(
      parseSupabaseError({
        code: "23514",
        message: 'new row violates check constraint "applications_status_check" (status)',
      }),
    ).toMatch(/status is not valid/);
    expect(
      parseSupabaseError({
        code: "23514",
        message: 'violates check constraint "applications_work_type_check" work_type',
      }),
    ).toMatch(/work type is not valid/);
  });

  it("maps network failures", () => {
    expect(parseSupabaseError({ message: "Failed to fetch" })).toMatch(/Could not reach the server/);
  });

  it("falls back to a generic message without exposing the raw error", () => {
    const raw = "internal detail xyzzy";
    const result = parseSupabaseError({ code: "99999", message: raw });
    expect(result).toMatch(/Something went wrong/);
    expect(result).not.toContain(raw);
  });
});
