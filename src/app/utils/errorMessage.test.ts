import { describe, expect, it } from "vitest";
import { getErrorMessage } from "./errorMessage";

const GENERIC = "An unexpected error occurred. Please try again.";

describe("getErrorMessage", () => {
  it("returns the message of an Error", () => {
    expect(getErrorMessage(new Error("Could not save"))).toBe("Could not save");
  });

  it("returns a thrown string as is", () => {
    expect(getErrorMessage("Something broke")).toBe("Something broke");
  });

  it("reads the message of a plain object", () => {
    expect(getErrorMessage({ message: "From an object" })).toBe(
      "From an object",
    );
  });

  it("falls back to the generic message for unusable values", () => {
    expect(getErrorMessage(undefined)).toBe(GENERIC);
    expect(getErrorMessage(null)).toBe(GENERIC);
    expect(getErrorMessage(42)).toBe(GENERIC);
    expect(getErrorMessage({})).toBe(GENERIC);
    expect(getErrorMessage(new Error(""))).toBe(GENERIC);
  });

  it("uses a custom fallback when given", () => {
    expect(getErrorMessage(undefined, "Custom fallback")).toBe(
      "Custom fallback",
    );
  });
});
