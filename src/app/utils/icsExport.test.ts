import { describe, expect, it } from "vitest";
import { InterviewWithContext } from "../../services/interviews";
import { buildInterviewsICS } from "./icsExport";

const makeInterview = (overrides: Partial<InterviewWithContext> = {}): InterviewWithContext => ({
  id: "int-1",
  applicationId: "app-1",
  roundType: "technical",
  scheduledAt: "2026-10-20T14:00:00Z",
  interviewerContactId: null,
  outcome: "pending",
  notes: "",
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  application: { id: "app-1", roleTitle: "Frontend Engineer", companyName: "Acme" },
  interviewerName: null,
  ...overrides,
});

const linesOf = (ics: string) => ics.split("\r\n");

describe("buildInterviewsICS", () => {
  it("builds an empty calendar when there are no interviews", () => {
    const lines = linesOf(buildInterviewsICS([]));
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines[lines.length - 1]).toBe("END:VCALENDAR");
    expect(lines).not.toContain("BEGIN:VEVENT");
  });

  it("skips interviews without a scheduled date", () => {
    const ics = buildInterviewsICS([makeInterview({ scheduledAt: null })]);
    expect(ics).not.toContain("BEGIN:VEVENT");
  });

  it("creates one event per scheduled interview with UTC times and a one hour block", () => {
    const lines = linesOf(buildInterviewsICS([makeInterview()]));
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines).toContain("UID:int-1@job-application-tracker");
    expect(lines).toContain("DTSTART:20261020T140000Z");
    expect(lines).toContain("DTEND:20261020T150000Z");
    expect(lines).toContain("SUMMARY:Technical Interview - Frontend Engineer at Acme");
  });

  it("escapes commas and semicolons in the summary", () => {
    const lines = linesOf(
      buildInterviewsICS([
        makeInterview({
          application: { id: "app-1", roleTitle: "Dev; Ops", companyName: "Acme, Inc." },
        }),
      ]),
    );
    expect(lines).toContain("SUMMARY:Technical Interview - Dev\\; Ops at Acme\\, Inc.");
  });

  it("separates description lines with escaped newlines", () => {
    const lines = linesOf(
      buildInterviewsICS([makeInterview({ interviewerName: "Bo", notes: "Bring a laptop" })]),
    );
    expect(lines).toContain(
      "DESCRIPTION:Role: Frontend Engineer\\nCompany: Acme\\nInterviewer: Bo\\nNotes: Bring a laptop",
    );
  });

  it("escapes commas and line breaks inside description values", () => {
    const lines = linesOf(
      buildInterviewsICS([
        makeInterview({
          application: { id: "app-1", roleTitle: "Frontend Engineer", companyName: "Acme, Inc." },
          notes: "line one\nline two",
        }),
      ]),
    );
    expect(lines).toContain(
      "DESCRIPTION:Role: Frontend Engineer\\nCompany: Acme\\, Inc.\\nNotes: line one\\nline two",
    );
  });

  it("falls back to a generic label for unknown round types", () => {
    const ics = buildInterviewsICS([makeInterview({ roundType: "mystery" as never })]);
    expect(ics).toContain("SUMMARY:Interview - Frontend Engineer at Acme");
  });
});
