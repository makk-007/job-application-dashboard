import { CheckCircle2, XCircle, Ban, Clock } from "lucide-react";
import {
  ApplicationSource,
  WorkType,
  InterviewRoundType,
  InterviewOutcome,
} from "../types";

export const SOURCES: ApplicationSource[] = [
  "referral",
  "job board",
  "recruiter",
  "company site",
  "networking",
  "other",
];

export const WORK_TYPES: WorkType[] = ["onsite", "remote", "hybrid"];

export const INTERVIEW_ROUND_TYPES: InterviewRoundType[] = [
  "phone_screen",
  "technical",
  "behavioral",
  "onsite",
  "final",
  "other",
];

export const INTERVIEW_ROUND_TYPE_LABEL: Record<InterviewRoundType, string> = {
  phone_screen: "Phone Screen",
  technical: "Technical",
  behavioral: "Behavioral",
  onsite: "Onsite",
  final: "Final Round",
  other: "Other",
};

export const INTERVIEW_OUTCOMES: InterviewOutcome[] = [
  "pending",
  "passed",
  "failed",
  "cancelled",
];

export const interviewOutcomeConfig: Record<
  InterviewOutcome,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-[var(--status-screening-strong)]",
    bg: "bg-[var(--status-screening-tint)]",
  },
  passed: {
    label: "Passed",
    icon: CheckCircle2,
    color: "text-[var(--status-offer-strong)]",
    bg: "bg-[var(--status-offer-tint)]",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-[var(--status-rejected-strong)]",
    bg: "bg-[var(--status-rejected-tint)]",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    color: "text-[var(--status-withdrawn-strong)]",
    bg: "bg-[var(--status-withdrawn-tint)]",
  },
};

export const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  resume: "Resume",
  cover_letter: "Cover Letter",
  portfolio: "Portfolio",
  other: "Other",
};
