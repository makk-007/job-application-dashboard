import { ApplicationWithCompany } from "../types";
import { ContactWithCompany } from "../../services/contacts";
import { InterviewWithContext } from "../../services/interviews";
import { OfferWithApplication } from "../../services/offers";
import { JobDocument } from "../types";

function toCSVValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(toCSVValue).join(",")];
  for (const row of rows) {
    lines.push(row.map(toCSVValue).join(","));
  }
  return lines.join("\r\n");
}

function downloadFile(
  content: string,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── CSV Export ──────────────────────────────────────────────────────────

export function exportApplicationsCSV(
  applications: ApplicationWithCompany[],
): void {
  const headers = [
    "Role Title",
    "Company",
    "Status",
    "Source",
    "Work Type",
    "Relocation Required",
    "Relocation Sponsored",
    "Salary Min",
    "Salary Max",
    "Currency",
    "Applied Date",
    "Job Post URL",
    "Notes",
    "Updated At",
  ];
  const rows = applications.map((a) => [
    a.roleTitle,
    a.company.name,
    a.status,
    a.source,
    a.workType,
    a.relocationRequired ? "Yes" : "No",
    a.relocationSponsored ? "Yes" : "No",
    a.salaryMin ?? "",
    a.salaryMax ?? "",
    a.currency,
    a.appliedDate ?? "",
    a.jobPostUrl,
    a.notes,
    a.updatedAt,
  ]);
  downloadFile(buildCSV(headers, rows), "applications.csv", "text/csv");
}

export function exportContactsCSV(contacts: ContactWithCompany[]): void {
  const headers = [
    "Name",
    "Role",
    "Company",
    "Relationship",
    "Email",
    "Phone",
    "Last Contacted",
    "Notes",
  ];
  const rows = contacts.map((c) => [
    c.name,
    c.role,
    c.companyName ?? "",
    c.relationship,
    c.email,
    c.phone,
    c.lastContactedAt ?? "",
    c.notes,
  ]);
  downloadFile(buildCSV(headers, rows), "contacts.csv", "text/csv");
}

export function exportInterviewsCSV(interviews: InterviewWithContext[]): void {
  const headers = [
    "Role Title",
    "Company",
    "Round Type",
    "Scheduled At",
    "Interviewer",
    "Outcome",
    "Notes",
  ];
  const rows = interviews.map((i) => [
    i.application.roleTitle,
    i.application.companyName,
    i.roundType,
    i.scheduledAt ?? "",
    i.interviewerName ?? "",
    i.outcome,
    i.notes,
  ]);
  downloadFile(buildCSV(headers, rows), "interviews.csv", "text/csv");
}

export function exportOffersCSV(offers: OfferWithApplication[]): void {
  const headers = [
    "Role Title",
    "Company",
    "Base Salary",
    "Bonus",
    "Signing Bonus",
    "Equity",
    "Currency",
    "Decision Deadline",
    "Decision",
    "Benefits Notes",
    "Notes",
  ];
  const rows = offers.map((o) => [
    o.application.roleTitle,
    o.application.companyName,
    o.baseSalary ?? "",
    o.bonus ?? "",
    o.signingBonus ?? "",
    o.equity,
    o.currency,
    o.decisionDeadline ?? "",
    o.decision,
    o.benefitsNotes,
    o.notes,
  ]);
  downloadFile(buildCSV(headers, rows), "offers.csv", "text/csv");
}

export function exportDocumentsCSV(documents: JobDocument[]): void {
  const headers = ["Name", "Type", "Version Label", "File URL", "Created At"];
  const rows = documents.map((d) => [
    d.name,
    d.type,
    d.versionLabel,
    d.fileUrl,
    d.createdAt,
  ]);
  downloadFile(buildCSV(headers, rows), "documents.csv", "text/csv");
}

// ── JSON Export (full backup) ──────────────────────────────────────────────

export interface FullExportData {
  exportedAt: string;
  applications: ApplicationWithCompany[];
  contacts: ContactWithCompany[];
  interviews: InterviewWithContext[];
  offers: OfferWithApplication[];
  documents: JobDocument[];
}

export function exportFullJSON(data: Omit<FullExportData, "exportedAt">): void {
  const payload: FullExportData = {
    exportedAt: new Date().toISOString(),
    ...data,
  };
  downloadFile(
    JSON.stringify(payload, null, 2),
    "job-application-tracker-export.json",
    "application/json",
  );
}
