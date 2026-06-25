import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  RefreshCw,
  CalendarClock,
  AlertCircle,
  X,
  Trash2,
  Download,
  Building2,
  User,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { InterviewRoundType, InterviewOutcome } from "../types";
import {
  InterviewWithContext,
  getInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
} from "../../services/interviews";
import { getApplications } from "../../services/applications";
import { ApplicationWithCompany } from "../types";
import { getContacts, ContactWithCompany } from "../../services/contacts";
import { downloadInterviewsICS } from "../utils/icsExport";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useIsMounted } from "../hooks/useIsMounted";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { Skeleton } from "../components/ui/skeleton";
import {
  inputCls,
  selectCls,
  textareaCls,
} from "../components/ui/input-classes";

const ROUND_TYPES: InterviewRoundType[] = [
  "phone_screen",
  "technical",
  "behavioral",
  "onsite",
  "final",
  "other",
];

const ROUND_TYPE_LABEL: Record<InterviewRoundType, string> = {
  phone_screen: "Phone Screen",
  technical: "Technical",
  behavioral: "Behavioral",
  onsite: "Onsite",
  final: "Final Round",
  other: "Other",
};

const OUTCOMES: InterviewOutcome[] = [
  "pending",
  "passed",
  "failed",
  "cancelled",
];

const outcomeConfig: Record<
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dateGroupLabel(iso: string | null): string {
  if (!iso) return "Unscheduled";
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  if (diffDays > 0 && diffDays < 7) return "This Week";
  if (diffDays < 0) return "Past";
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ── Add / Edit Interview Modal ───────────────────────────────────────────────

function InterviewModal({
  interview,
  applications,
  contacts,
  defaultApplicationId,
  onClose,
  onSaved,
}: {
  interview: InterviewWithContext | null;
  applications: ApplicationWithCompany[];
  contacts: ContactWithCompany[];
  defaultApplicationId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!interview;
  const [form, setForm] = useState({
    applicationId: interview?.applicationId ?? defaultApplicationId ?? "",
    roundType: interview?.roundType ?? ("phone_screen" as InterviewRoundType),
    scheduledAt: interview?.scheduledAt
      ? new Date(interview.scheduledAt).toISOString().slice(0, 16)
      : "",
    interviewerContactId: interview?.interviewerContactId ?? "",
    outcome: interview?.outcome ?? ("pending" as InterviewOutcome),
    notes: interview?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((fe) => {
      const n = { ...fe };
      delete n[k];
      return n;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.applicationId) {
      setFieldErrors({ applicationId: "Select an application" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        applicationId: form.applicationId,
        roundType: form.roundType,
        scheduledAt: form.scheduledAt
          ? new Date(form.scheduledAt).toISOString()
          : null,
        interviewerContactId: form.interviewerContactId || null,
        outcome: form.outcome,
        notes: form.notes,
      };
      if (isEdit) {
        await updateInterview(interview!.id, payload);
        toast.success("Interview updated");
      } else {
        await createInterview(payload);
        toast.success("Interview scheduled");
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error(
        isEdit ? "Failed to update interview" : "Failed to schedule interview",
        {
          description: e.message,
        },
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="bg-card rounded-xl border card-raised w-full sm:max-w-lg sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {isEdit ? "Edit Interview" : "Schedule Interview"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent transition-colors"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Application *
            </label>
            <select
              value={form.applicationId}
              onChange={(e) => set("applicationId", e.target.value)}
              disabled={isEdit}
              className={`${selectCls} ${fieldErrors.applicationId ? "border-destructive" : ""} ${isEdit ? "opacity-60" : ""}`}
            >
              <option value="">Select an application...</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.roleTitle} at {a.company.name}
                </option>
              ))}
            </select>
            {fieldErrors.applicationId && (
              <p className="text-xs text-destructive mt-1">
                {fieldErrors.applicationId}
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Round Type
              </label>
              <select
                value={form.roundType}
                onChange={(e) => set("roundType", e.target.value)}
                className={selectCls}
              >
                {ROUND_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ROUND_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Outcome
              </label>
              <select
                value={form.outcome}
                onChange={(e) => set("outcome", e.target.value)}
                className={selectCls}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {outcomeConfig[o].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Date and Time
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => set("scheduledAt", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Interviewer
            </label>
            <select
              value={form.interviewerContactId}
              onChange={(e) => set("interviewerContactId", e.target.value)}
              className={selectCls}
            >
              <option value="">No interviewer set</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.companyName ? ` (${c.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={textareaCls}
              placeholder="Questions asked, how it went, follow-up items..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-9 border border-border rounded-md text-sm text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Schedule"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Interviews Page ──────────────────────────────────────────────────

export function Interviews() {
  const { deleteWithUndo } = useUndoableDelete();
  const isMounted = useIsMounted();
  const [interviews, setInterviews] = useState<InterviewWithContext[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCompany[]>(
    [],
  );
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [outcomeFilter, setOutcomeFilter] = useState<InterviewOutcome | "all">(
    "all",
  );
  const [showModal, setShowModal] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<InterviewWithContext | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InterviewWithContext | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [interviewsData, applicationsData, contactsData] =
        await Promise.all([getInterviews(), getApplications(), getContacts()]);
      if (isMounted()) {
        setInterviews(interviewsData);
        setApplications(applicationsData);
        setContacts(contactsData);
      }
    } catch (e: any) {
      if (isMounted()) {
        setError(e.message);
        toast.error("Failed to load interviews", { description: e.message });
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      interviews.filter(
        (i) => outcomeFilter === "all" || i.outcome === outcomeFilter,
      ),
    [interviews, outcomeFilter],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, InterviewWithContext[]>();
    for (const interview of filtered) {
      const label = dateGroupLabel(interview.scheduledAt);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(interview);
    }
    return groups;
  }, [filtered]);

  const handleDelete = (interview: InterviewWithContext) => {
    deleteWithUndo({
      id: interview.id,
      label: "Interview deleted",
      description: `${ROUND_TYPE_LABEL[interview.roundType]} for ${interview.application.roleTitle}`,
      onRemoveLocally: () => {
        setInterviews((prev) => prev.filter((i) => i.id !== interview.id));
      },
      onRestoreLocally: () => {
        setInterviews((prev) => [...prev, interview]);
      },
      performDelete: () => deleteInterview(interview.id),
      onDeleteFailed: (e) =>
        toast.error("Failed to delete interview", { description: e.message }),
    });
  };

  const handleExport = () => {
    const withDates = interviews.filter((i) => i.scheduledAt);
    if (withDates.length === 0) {
      toast.error("No scheduled interviews to export");
      return;
    }
    downloadInterviewsICS(withDates);
    toast.success("Calendar file downloaded", {
      description: `${withDates.length} interview${withDates.length === 1 ? "" : "s"} exported`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Interviews
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every round, across every application
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              title="Export to calendar (.ics)"
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-border text-sm font-medium rounded-md text-foreground hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              Export
            </button>
            <button
              onClick={load}
              aria-label="Refresh interviews"
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => {
                setEditingInterview(null);
                setShowModal(true);
              }}
              disabled={applications.length === 0}
              title={
                applications.length === 0
                  ? "Add an application first"
                  : undefined
              }
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="size-4" />
              Schedule
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        <div className="bg-card rounded-xl border p-3 sm:p-4 mb-4 sm:mb-6 card-resting">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setOutcomeFilter("all")}
              className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${outcomeFilter === "all" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              All
            </button>
            {OUTCOMES.map((o) => (
              <button
                key={o}
                onClick={() => setOutcomeFilter(o)}
                className={`px-3 h-8 rounded-md text-sm font-medium transition-colors ${outcomeFilter === o ? `${outcomeConfig[o].bg} ${outcomeConfig[o].color}` : "text-muted-foreground hover:bg-accent"}`}
              >
                {outcomeConfig[o].label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="bg-card rounded-xl border p-12 text-center card-resting">
            <AlertCircle className="size-8 text-destructive mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <button
              onClick={load}
              className="px-4 h-9 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <CalendarClock
              className="size-10 text-muted-foreground/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground mb-1">
              {interviews.length === 0
                ? "No interviews scheduled"
                : "No interviews match this filter"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {interviews.length === 0
                ? "Schedule a round once an application moves to interviewing."
                : "Try a different outcome filter."}
            </p>
            {interviews.length === 0 && applications.length > 0 && (
              <button
                onClick={() => {
                  setEditingInterview(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" aria-hidden="true" />
                Schedule Interview
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([label, items]) => (
              <div key={label}>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  {label}
                </h2>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map((interview) => {
                      const OutcomeIcon = outcomeConfig[interview.outcome].icon;
                      return (
                        <motion.div
                          key={interview.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => {
                            setEditingInterview(interview);
                            setShowModal(true);
                          }}
                          className="bg-card border border-border rounded-xl p-4 card-resting hover:card-raised transition-shadow duration-150 cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] ${outcomeConfig[interview.outcome].bg} ${outcomeConfig[interview.outcome].color}`}
                                >
                                  <OutcomeIcon
                                    className="size-3 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {outcomeConfig[interview.outcome].label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {ROUND_TYPE_LABEL[interview.roundType]}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-foreground truncate">
                                {interview.application.roleTitle}
                              </p>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Building2
                                  className="size-3 shrink-0"
                                  aria-hidden="true"
                                />
                                <span className="truncate">
                                  {interview.application.companyName}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarClock
                                    className="size-3 shrink-0"
                                    aria-hidden="true"
                                  />
                                  {formatDateTime(interview.scheduledAt)}
                                </span>
                                {interview.interviewerName && (
                                  <span className="flex items-center gap-1">
                                    <User
                                      className="size-3 shrink-0"
                                      aria-hidden="true"
                                    />
                                    {interview.interviewerName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTarget(interview);
                              }}
                              title="Delete interview"
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                            >
                              <Trash2 className="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <InterviewModal
            key={editingInterview?.id ?? "new"}
            interview={editingInterview}
            applications={applications}
            contacts={contacts}
            onClose={() => setShowModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={`${ROUND_TYPE_LABEL[deleteTarget.roundType]} - ${deleteTarget.application.roleTitle}`}
          itemType="interview"
          onConfirm={() => {
            handleDelete(deleteTarget);
            setDeleteTarget(null);
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
