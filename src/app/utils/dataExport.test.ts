import { describe, expect, it } from "vitest";
import { buildCSV, toCSVValue } from "./dataExport";

describe("toCSVValue", () => {
  it("returns an empty string for null and undefined", () => {
    expect(toCSVValue(null)).toBe("");
    expect(toCSVValue(undefined)).toBe("");
  });

  it("converts plain values to strings", () => {
    expect(toCSVValue("hello")).toBe("hello");
    expect(toCSVValue(42)).toBe("42");
    expect(toCSVValue(false)).toBe("false");
  });

  it("quotes values containing commas", () => {
    expect(toCSVValue("Acme, Inc.")).toBe('"Acme, Inc."');
  });

  it("doubles embedded quotes", () => {
    expect(toCSVValue('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes values containing newlines", () => {
    expect(toCSVValue("line one\nline two")).toBe('"line one\nline two"');
  });
});

describe("buildCSV", () => {
  it("joins the header and rows with CRLF", () => {
    expect(buildCSV(["name", "role"], [["Ada", "Engineer"], ["Bo", null]])).toBe(
      "name,role\r\nAda,Engineer\r\nBo,",
    );
  });

  it("returns only the header when there are no rows", () => {
    expect(buildCSV(["a", "b"], [])).toBe("a,b");
  });

  it("escapes headers and cells", () => {
    expect(buildCSV(["a,b"], [['x"y']])).toBe('"a,b"\r\n"x""y"');
  });
});
