import {
  Lightbulb,
  Send,
  PhoneCall,
  Users,
  Trophy,
  XCircle,
  Ban,
  LucideIcon,
} from "lucide-react";
import { ApplicationStatus } from "../types";

interface StatusConfigEntry {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

/**
 * Single source of truth for how each application status is represented
 * across badges, KPI cards, the Kanban board, and charts. Colors reference
 * the --status-* CSS variables defined in theme.css so light/dark mode
 * stay in sync automatically.
 */
export const statusConfig: Record<ApplicationStatus, StatusConfigEntry> = {
  lead: {
    label: "Lead",
    icon: Lightbulb,
    color: "text-[var(--status-lead-strong)]",
    bgColor: "bg-[var(--status-lead-tint)]",
  },
  applied: {
    label: "Applied",
    icon: Send,
    color: "text-[var(--status-applied-strong)]",
    bgColor: "bg-[var(--status-applied-tint)]",
  },
  screening: {
    label: "Screening",
    icon: PhoneCall,
    color: "text-[var(--status-screening-strong)]",
    bgColor: "bg-[var(--status-screening-tint)]",
  },
  interviewing: {
    label: "Interviewing",
    icon: Users,
    color: "text-[var(--status-interviewing-strong)]",
    bgColor: "bg-[var(--status-interviewing-tint)]",
  },
  offer: {
    label: "Offer",
    icon: Trophy,
    color: "text-[var(--status-offer-strong)]",
    bgColor: "bg-[var(--status-offer-tint)]",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    color: "text-[var(--status-rejected-strong)]",
    bgColor: "bg-[var(--status-rejected-tint)]",
  },
  withdrawn: {
    label: "Withdrawn",
    icon: Ban,
    color: "text-[var(--status-withdrawn-strong)]",
    bgColor: "bg-[var(--status-withdrawn-tint)]",
  },
};

/** Statuses in pipeline order, used for the Kanban board and funnel chart. */
export const PIPELINE_STATUSES: ApplicationStatus[] = [
  "lead",
  "applied",
  "screening",
  "interviewing",
  "offer",
];

/** Terminal statuses reachable from any non-terminal stage. */
export const TERMINAL_STATUSES: ApplicationStatus[] = ["rejected", "withdrawn"];

export const ALL_STATUSES: ApplicationStatus[] = [
  ...PIPELINE_STATUSES,
  ...TERMINAL_STATUSES,
];

/** Statuses where sitting still for a long time indicates a stale, unattended application. */
const STALE_ELIGIBLE_STATUSES: ApplicationStatus[] = ["applied", "screening"];

/** Number of days with no status change before an application is flagged as stale. */
export const STALE_THRESHOLD_DAYS = 21;

export const getDaysSince = (date: string | null): number | null => {
  if (!date) return null;
  return Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
};

/**
 * Whether an application has gone quiet: it has sat in Applied or
 * Screening for longer than the stale threshold with no status change.
 * This is a purely computed, presentation-only signal based on
 * updatedAt. It never writes back to the stored status, so the user's
 * own status choice always remains authoritative.
 */
export const isStale = (
  status: ApplicationStatus,
  updatedAt: string,
): boolean => {
  if (!STALE_ELIGIBLE_STATUSES.includes(status)) return false;
  const days = getDaysSince(updatedAt);
  return days !== null && days >= STALE_THRESHOLD_DAYS;
};
