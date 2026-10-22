/**
 * Returns a readable message from a caught value. Catch variables are
 * `unknown`, so this accepts anything: Error objects, plain strings, and
 * objects that carry a `message`. Anything else gets the fallback text.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "An unexpected error occurred. Please try again.",
): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error as { message: unknown };
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
