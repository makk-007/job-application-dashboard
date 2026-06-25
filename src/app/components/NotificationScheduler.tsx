import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { getApplications } from "../../services/applications";
import { getInterviews } from "../../services/interviews";
import { getOffers } from "../../services/offers";
import {
  getNotificationPermission,
  checkInterviewReminders,
  checkStaleApplicationReminders,
  checkOfferDeadlineReminders,
} from "../utils/notifications";

/** How often to re-check for things worth notifying about, while the app is open. */
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Headless component mounted once at the app root. Runs notification
 * checks on an interval rather than per-page, so reminders fire
 * consistently regardless of which page the person is currently viewing,
 * and don't restart their polling cycle every time they navigate.
 */
export function NotificationScheduler() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (getNotificationPermission() !== "granted") return;

    const runChecks = async () => {
      try {
        const [applications, interviews, offers] = await Promise.all([
          getApplications(),
          getInterviews(),
          getOffers(),
        ]);
        checkInterviewReminders(interviews);
        checkStaleApplicationReminders(applications);
        checkOfferDeadlineReminders(offers);
      } catch {
        // Notifications are a best-effort background feature; a failed
        // check should not surface an error to the person using the app.
      }
    };

    runChecks();
    const interval = setInterval(runChecks, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user]);

  return null;
}
