import { ApplicationWithCompany } from "../types";
import { InterviewWithContext } from "../../services/interviews";
import { OfferWithApplication } from "../../services/offers";
import { isStale } from "./statusConfig";

const STORAGE_KEY_PREFIX = "jat:notified:";

export type NotificationPermissionState =
  | "default"
  | "granted"
  | "denied"
  | "unsupported";

export function getNotificationPermission(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  const result = await Notification.requestPermission();
  return result;
}

function showNotification(title: string, body: string, tag: string): void {
  if (getNotificationPermission() !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/favicon.svg" });
  } catch {
    // Some browsers (notably iOS Safari) throw on direct Notification()
    // construction even when permission is granted. Silently no-op rather
    // than surfacing an error for what is a best-effort feature.
  }
}

/** Has this specific notification already been shown today, to avoid duplicate alerts on every poll/reload. */
function alreadyNotifiedToday(key: string): boolean {
  const stored = localStorage.getItem(STORAGE_KEY_PREFIX + key);
  if (!stored) return false;
  const today = new Date().toDateString();
  return stored === today;
}

function markNotifiedToday(key: string): void {
  localStorage.setItem(STORAGE_KEY_PREFIX + key, new Date().toDateString());
}

/**
 * Checks upcoming interviews and fires a browser notification for any
 * starting within the next hour, or that start tomorrow (checked once per
 * day per interview to avoid repeat alerts).
 */
export function checkInterviewReminders(
  interviews: InterviewWithContext[],
): void {
  const now = new Date();
  for (const interview of interviews) {
    if (!interview.scheduledAt || interview.outcome === "cancelled") continue;
    const scheduled = new Date(interview.scheduledAt);
    const msUntil = scheduled.getTime() - now.getTime();
    const hoursUntil = msUntil / (1000 * 60 * 60);

    if (hoursUntil > 0 && hoursUntil <= 1) {
      const key = `interview-1h-${interview.id}`;
      if (!alreadyNotifiedToday(key)) {
        showNotification(
          "Interview starting soon",
          `${interview.application.roleTitle} at ${interview.application.companyName} starts in under an hour.`,
          key,
        );
        markNotifiedToday(key);
      }
    } else if (hoursUntil > 1 && hoursUntil <= 24) {
      const key = `interview-24h-${interview.id}`;
      if (!alreadyNotifiedToday(key)) {
        showNotification(
          "Interview tomorrow",
          `${interview.application.roleTitle} at ${interview.application.companyName} is scheduled within 24 hours.`,
          key,
        );
        markNotifiedToday(key);
      }
    }
  }
}

/**
 * Fires a single batched notification for stale applications, rather than
 * one per application, since several going stale at once is common and a
 * wall of separate notifications is more annoying than useful.
 */
export function checkStaleApplicationReminders(
  applications: ApplicationWithCompany[],
): void {
  const stale = applications.filter((a) => isStale(a.status, a.updatedAt));
  if (stale.length === 0) return;

  const key = `stale-${new Date().toDateString()}`;
  if (alreadyNotifiedToday(key)) return;

  showNotification(
    "Applications need a follow-up",
    stale.length === 1
      ? `${stale[0].roleTitle} at ${stale[0].company.name} has not moved in a while.`
      : `${stale.length} applications have not moved in a while.`,
    key,
  );
  markNotifiedToday(key);
}

/**
 * Fires a notification once an offer's decision deadline is within 3 days,
 * for offers still marked pending.
 */
export function checkOfferDeadlineReminders(
  offers: OfferWithApplication[],
): void {
  const now = new Date();
  for (const offer of offers) {
    if (offer.decision !== "pending" || !offer.decisionDeadline) continue;
    const deadline = new Date(offer.decisionDeadline);
    const daysUntil = Math.ceil(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntil >= 0 && daysUntil <= 3) {
      const key = `offer-deadline-${offer.id}-${daysUntil}`;
      if (!alreadyNotifiedToday(key)) {
        showNotification(
          "Offer decision deadline approaching",
          daysUntil === 0
            ? `Your decision on ${offer.application.roleTitle} is due today.`
            : `Your decision on ${offer.application.roleTitle} is due in ${daysUntil} day${daysUntil === 1 ? "" : "s"}.`,
          key,
        );
        markNotifiedToday(key);
      }
    }
  }
}
