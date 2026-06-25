import { InterviewWithContext } from "../../services/interviews";

function formatICSDate(iso: string): string {
  // ICS wants UTC basic format: YYYYMMDDTHHMMSSZ
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

const ROUND_TYPE_LABEL: Record<string, string> = {
  phone_screen: "Phone Screen",
  technical: "Technical Interview",
  behavioral: "Behavioral Interview",
  onsite: "Onsite Interview",
  final: "Final Round",
  other: "Interview",
};

/**
 * Builds a single .ics calendar file containing one VEVENT per interview
 * that has a scheduled date. Interviews without a scheduled_at are
 * skipped, since a calendar event requires a date.
 */
export function buildInterviewsICS(interviews: InterviewWithContext[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Job Application Tracker//Interviews//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const interview of interviews) {
    if (!interview.scheduledAt) continue;

    const summary = escapeICSText(
      `${ROUND_TYPE_LABEL[interview.roundType] ?? "Interview"} - ${interview.application.roleTitle} at ${interview.application.companyName}`,
    );
    const descriptionParts = [
      `Role: ${interview.application.roleTitle}`,
      `Company: ${interview.application.companyName}`,
      interview.interviewerName
        ? `Interviewer: ${interview.interviewerName}`
        : null,
      interview.notes ? `Notes: ${interview.notes}` : null,
    ].filter(Boolean);
    const description = escapeICSText(descriptionParts.join("\\n"));

    const start = formatICSDate(interview.scheduledAt);
    // Default to a 1-hour block since interviews.scheduled_at stores only a start time.
    const endDate = new Date(
      new Date(interview.scheduledAt).getTime() + 60 * 60 * 1000,
    ).toISOString();
    const end = formatICSDate(endDate);

    lines.push(
      "BEGIN:VEVENT",
      `UID:${interview.id}@job-application-tracker`,
      `DTSTAMP:${formatICSDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

/** Triggers a browser download of the given interviews as a .ics file. */
export function downloadInterviewsICS(
  interviews: InterviewWithContext[],
): void {
  const ics = buildInterviewsICS(interviews);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "interviews.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
