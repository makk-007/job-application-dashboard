// ============================================================
// Job Application Tracker - Core Types
// ============================================================
// Types for tables used by later batches (Contact, Interview, Document,
// Offer) are included now so application code added in those batches does
// not require renaming or restructuring types already in place.

export type ApplicationStatus =
  | "lead"
  | "applied"
  | "screening"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ApplicationSource =
  | "referral"
  | "job board"
  | "recruiter"
  | "company site"
  | "networking"
  | "other";

export type WorkType = "onsite" | "remote" | "hybrid";

export type ContactRelationship =
  | "recruiter"
  | "referral"
  | "interviewer"
  | "other";

export type InterviewRoundType =
  | "phone_screen"
  | "technical"
  | "behavioral"
  | "onsite"
  | "final"
  | "other";

export type InterviewOutcome = "pending" | "passed" | "failed" | "cancelled";

export type DocumentType = "resume" | "cover_letter" | "portfolio" | "other";

export type OfferDecision = "pending" | "accepted" | "declined";

// ── Job Search Round ──────────────────────────────────────────────────────

export interface JobSearchRound {
  id: string;
  userId: string;
  name: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Company ────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  userId: string;
  name: string;
  website: string;
  industry: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Contact (full CRUD ships in Batch 3) ───────────────────────────────────

export interface Contact {
  id: string;
  userId: string;
  companyId: string | null;
  name: string;
  role: string;
  email: string;
  phone: string;
  relationship: ContactRelationship;
  lastContactedAt: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Application ─────────────────────────────────────────────────────────

export interface Application {
  id: string;
  userId: string;
  roundId: string | null;
  companyId: string;
  contactId: string | null;
  roleTitle: string;
  jobPostUrl: string;
  source: ApplicationSource;
  workType: WorkType;
  relocationRequired: boolean;
  relocationSponsored: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  status: ApplicationStatus;
  appliedDate: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Application joined with its company, for list/detail display. */
export interface ApplicationWithCompany extends Application {
  company: Company;
}

// ── Checklist ───────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  applicationId: string;
  item: string;
  completed: boolean;
  createdAt: string;
}

// ── Interview (full CRUD ships in Batch 4) ─────────────────────────────────

export interface Interview {
  id: string;
  applicationId: string;
  roundType: InterviewRoundType;
  scheduledAt: string | null;
  interviewerContactId: string | null;
  notes: string;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string;
}

// ── Document (full CRUD ships in Batch 5) ──────────────────────────────────

export interface JobDocument {
  id: string;
  userId: string;
  type: DocumentType;
  name: string;
  versionLabel: string;
  fileUrl: string;
  createdAt: string;
}

// ── Offer (full CRUD ships in Batch 5) ─────────────────────────────────────

export interface Offer {
  id: string;
  applicationId: string;
  baseSalary: number | null;
  bonus: number | null;
  equity: string;
  signingBonus: number | null;
  benefitsNotes: string;
  currency: string;
  decisionDeadline: string | null;
  decision: OfferDecision;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Status History ──────────────────────────────────────────────────────

export interface StatusHistoryEntry {
  id: string;
  userId: string;
  applicationId: string;
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}
