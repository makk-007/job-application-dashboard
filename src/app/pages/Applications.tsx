import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Briefcase,
  AlertCircle,
  X,
  Trash2,
  Copy,
  Loader2,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plane,
  Globe2,
  Building2,
  Users,
  UserPlus,
  Mail,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Ban,
  Clock,
  FileText,
  Trophy,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  ApplicationWithCompany,
  ApplicationStatus,
  ApplicationSource,
  WorkType,
  ChecklistItem,
  InterviewRoundType,
  InterviewOutcome,
  JobDocument,
  Offer,
} from "../types";
import {
  getApplications,
  getApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  duplicateApplication,
  getStatusHistory,
  getChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../services/applications";
import { findOrCreateCompanyByName } from "../../services/companies";
import {
  ContactWithCompany,
  getContacts,
  getApplicationContacts,
  linkContactToApplication,
  unlinkContactFromApplication,
} from "../../services/contacts";
import {
  InterviewWithContext,
  getApplicationInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
} from "../../services/interviews";
import {
  getDocuments,
  getApplicationDocuments,
  linkDocumentToApplication,
  unlinkDocumentFromApplication,
} from "../../services/documents";
import { getApplicationOffer, estimateTotalComp } from "../../services/offers";
import { exportApplicationsCSV } from "../utils/dataExport";
import { useRound } from "../context/RoundContext";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useIsMounted } from "../hooks/useIsMounted";
import { StatusBadge } from "../components/StatusBadge";
import { StatusHistorySection } from "../components/StatusHistorySection";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { BulkDeleteConfirmModal } from "../components/BulkDeleteConfirmModal";
import { Skeleton } from "../components/ui/skeleton";
import {
  inputCls,
  selectCls,
  textareaCls,
} from "../components/ui/input-classes";
import {
  statusConfig,
  ALL_STATUSES,
  isStale,
  getDaysSince,
} from "../utils/statusConfig";

const SOURCES: ApplicationSource[] = [
  "referral",
  "job board",
  "recruiter",
  "company site",
  "networking",
  "other",
];

const WORK_TYPES: WorkType[] = ["onsite", "remote", "hybrid"];
const CURRENCIES = ["USD", "EUR", "GBP", "GHS", "CAD"];

const INTERVIEW_ROUND_TYPES: InterviewRoundType[] = [
  "phone_screen",
  "technical",
  "behavioral",
  "onsite",
  "final",
  "other",
];

const INTERVIEW_ROUND_TYPE_LABEL: Record<InterviewRoundType, string> = {
  phone_screen: "Phone Screen",
  technical: "Technical",
  behavioral: "Behavioral",
  onsite: "Onsite",
  final: "Final Round",
  other: "Other",
};

const INTERVIEW_OUTCOMES: InterviewOutcome[] = [
  "pending",
  "passed",
  "failed",
  "cancelled",
];

const interviewOutcomeConfig: Record<
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

function formatInterviewDateTime(iso: string | null): string {
  if (!iso) return "No date set";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const DOCUMENT_TYPE_LABEL: Record<string, string> = {
  resume: "Resume",
  cover_letter: "Cover Letter",
  portfolio: "Portfolio",
  other: "Other",
};

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (min === null && max === null) return "Not specified";
  if (min !== null && max !== null) {
    return `${currency} ${min.toLocaleString()}–${max.toLocaleString()}`;
  }
  const value = min ?? max;
  return `${currency} ${value!.toLocaleString()}`;
}

// ── Add Application Modal ─────────────────────────────────────────────────

function AddApplicationModal({
  activeRoundId,
  onClose,
  onSaved,
}: {
  activeRoundId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    companyName: "",
    roleTitle: "",
    jobPostUrl: "",
    source: "job board" as ApplicationSource,
    workType: "onsite" as WorkType,
    relocationRequired: false,
    relocationSponsored: false,
    salaryMin: "",
    salaryMax: "",
    currency: "USD",
    appliedDate: "",
    notes: "",
    status: "lead" as ApplicationStatus,
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

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = "Company name is required";
    if (!form.roleTitle.trim()) errs.roleTitle = "Role title is required";
    if (form.jobPostUrl && !/^https?:\/\//i.test(form.jobPostUrl))
      errs.jobPostUrl = "Link must start with http:// or https://";
    if (form.salaryMin && Number(form.salaryMin) < 0)
      errs.salaryMin = "Salary cannot be negative";
    if (form.salaryMax && Number(form.salaryMax) < 0)
      errs.salaryMax = "Salary cannot be negative";
    if (
      form.salaryMin &&
      form.salaryMax &&
      Number(form.salaryMax) < Number(form.salaryMin)
    )
      errs.salaryMax = "Maximum must be greater than minimum";
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const company = await findOrCreateCompanyByName(form.companyName);
      await createApplication({
        companyId: company.id,
        roundId: activeRoundId,
        roleTitle: form.roleTitle.trim(),
        jobPostUrl: form.jobPostUrl,
        source: form.source,
        workType: form.workType,
        relocationRequired: form.relocationRequired,
        relocationSponsored: form.relocationSponsored,
        salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
        salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
        currency: form.currency,
        appliedDate: form.appliedDate || null,
        notes: form.notes,
        status: form.status,
      });
      toast.success("Application added", {
        description: `${form.roleTitle.trim()} at ${company.name}`,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to add application", { description: e.message });
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
            Add Application
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Company *
              </label>
              <input
                value={form.companyName}
                onChange={(e) => set("companyName", e.target.value)}
                className={`${inputCls} ${fieldErrors.companyName ? "border-destructive focus-visible:border-destructive" : ""}`}
                placeholder="e.g. Acme Corp"
              />
              {fieldErrors.companyName && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.companyName}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Role Title *
              </label>
              <input
                value={form.roleTitle}
                onChange={(e) => set("roleTitle", e.target.value)}
                className={`${inputCls} ${fieldErrors.roleTitle ? "border-destructive focus-visible:border-destructive" : ""}`}
                placeholder="e.g. Product Manager"
              />
              {fieldErrors.roleTitle && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.roleTitle}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Source
              </label>
              <select
                value={form.source}
                onChange={(e) => set("source", e.target.value)}
                className={selectCls}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={selectCls}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusConfig[s].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Work Type
              </label>
              <select
                value={form.workType}
                onChange={(e) => set("workType", e.target.value)}
                className={selectCls}
              >
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Applied Date
              </label>
              <input
                type="date"
                value={form.appliedDate}
                onChange={(e) => set("appliedDate", e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.relocationRequired}
                onChange={(e) => set("relocationRequired", e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
              Relocation required
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={form.relocationSponsored}
                onChange={(e) => set("relocationSponsored", e.target.checked)}
                className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
              Relocation sponsored
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Salary Range
            </label>
            <div className="grid grid-cols-[20%_1fr_1fr] gap-1.5">
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className={`${selectCls} shrink-0`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={form.salaryMin}
                onChange={(e) => set("salaryMin", e.target.value)}
                className={`${inputCls} ${fieldErrors.salaryMin ? "border-destructive" : ""}`}
              />
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={form.salaryMax}
                onChange={(e) => set("salaryMax", e.target.value)}
                className={`${inputCls} ${fieldErrors.salaryMax ? "border-destructive" : ""}`}
              />
            </div>
            {(fieldErrors.salaryMin || fieldErrors.salaryMax) && (
              <p className="text-xs text-destructive mt-1">
                {fieldErrors.salaryMin || fieldErrors.salaryMax}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Job Post URL
            </label>
            <input
              value={form.jobPostUrl}
              onChange={(e) => set("jobPostUrl", e.target.value)}
              placeholder="https://..."
              className={`${inputCls} ${fieldErrors.jobPostUrl ? "border-destructive focus-visible:border-destructive" : ""}`}
            />
            {fieldErrors.jobPostUrl && (
              <p className="text-xs text-destructive mt-1">
                {fieldErrors.jobPostUrl}
              </p>
            )}
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
              {saving ? "Saving…" : "Add Application"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Application Detail Drawer ───────────────────────────────────────────────

function ApplicationDetailDrawer({
  application,
  onClose,
  onUpdated,
  onDeleted,
  onDuplicated,
}: {
  application: ApplicationWithCompany;
  onClose: () => void;
  onUpdated: (a: ApplicationWithCompany) => void;
  onDeleted: (id: string) => void;
  onDuplicated: (a: ApplicationWithCompany) => void;
}) {
  const { deleteWithUndo } = useUndoableDelete();
  const [app, setApp] = useState<ApplicationWithCompany>(application);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingField, setSavingField] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  useEscapeKey(onClose, !showDeleteModal);
  const [notes, setNotes] = useState(application.notes ?? "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState("");
  const [notesTimer, setNotesTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [editRoleTitle, setEditRoleTitle] = useState(application.roleTitle);
  const [editWorkType, setEditWorkType] = useState(application.workType);
  const [editSource, setEditSource] = useState(application.source);
  const [editAppliedDate, setEditAppliedDate] = useState(
    application.appliedDate ?? "",
  );
  const [editSalaryMin, setEditSalaryMin] = useState(
    application.salaryMin !== null ? String(application.salaryMin) : "",
  );
  const [editSalaryMax, setEditSalaryMax] = useState(
    application.salaryMax !== null ? String(application.salaryMax) : "",
  );
  const [editCurrency, setEditCurrency] = useState(application.currency);
  const [editJobPostUrl, setEditJobPostUrl] = useState(application.jobPostUrl);
  const [editRelocationRequired, setEditRelocationRequired] = useState(
    application.relocationRequired,
  );
  const [editRelocationSponsored, setEditRelocationSponsored] = useState(
    application.relocationSponsored,
  );

  const [linkedContacts, setLinkedContacts] = useState<
    (ContactWithCompany & { linkId: string; roleInProcess: string })[]
  >([]);
  const [allContacts, setAllContacts] = useState<ContactWithCompany[]>([]);
  const [contactToAdd, setContactToAdd] = useState("");
  const [linkingContact, setLinkingContact] = useState(false);

  const [interviews, setInterviews] = useState<InterviewWithContext[]>([]);
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [savingInterview, setSavingInterview] = useState(false);
  const [editingInterviewId, setEditingInterviewId] = useState<string | null>(
    null,
  );
  const [interviewForm, setInterviewForm] = useState({
    roundType: "phone_screen" as InterviewRoundType,
    scheduledAt: "",
    interviewerContactId: "",
    outcome: "pending" as InterviewOutcome,
    notes: "",
  });

  const [linkedDocuments, setLinkedDocuments] = useState<
    (JobDocument & { linkId: string })[]
  >([]);
  const [allDocuments, setAllDocuments] = useState<JobDocument[]>([]);
  const [documentToAdd, setDocumentToAdd] = useState("");
  const [linkingDocument, setLinkingDocument] = useState(false);

  const [offer, setOffer] = useState<Offer | null>(null);

  useEffect(() => {
    setApp(application);
    setNotes(application.notes ?? "");
    setEditRoleTitle(application.roleTitle);
    setEditWorkType(application.workType);
    setEditSource(application.source);
    setEditAppliedDate(application.appliedDate ?? "");
    setEditSalaryMin(
      application.salaryMin !== null ? String(application.salaryMin) : "",
    );
    setEditSalaryMax(
      application.salaryMax !== null ? String(application.salaryMax) : "",
    );
    setEditCurrency(application.currency);
    setEditJobPostUrl(application.jobPostUrl);
    setEditRelocationRequired(application.relocationRequired);
    setEditRelocationSponsored(application.relocationSponsored);
    loadChecklist();
    loadContacts();
    loadInterviews();
    loadDocuments();
    loadOffer();
  }, [application.id]);

  const loadChecklist = async () => {
    try {
      setChecklist(await getChecklistItems(application.id));
    } catch (e: any) {
      toast.error("Failed to load checklist", { description: e.message });
    }
  };

  const loadInterviews = async () => {
    try {
      setInterviews(await getApplicationInterviews(application.id));
    } catch (e: any) {
      toast.error("Failed to load interviews", { description: e.message });
    }
  };

  const resetInterviewForm = () => {
    setInterviewForm({
      roundType: "phone_screen",
      scheduledAt: "",
      interviewerContactId: "",
      outcome: "pending",
      notes: "",
    });
    setEditingInterviewId(null);
  };

  const handleAddInterview = async () => {
    setSavingInterview(true);
    try {
      const payload = {
        applicationId: app.id,
        roundType: interviewForm.roundType,
        scheduledAt: interviewForm.scheduledAt
          ? new Date(interviewForm.scheduledAt).toISOString()
          : null,
        interviewerContactId: interviewForm.interviewerContactId || null,
        outcome: interviewForm.outcome,
        notes: interviewForm.notes,
      };
      if (editingInterviewId) {
        await updateInterview(editingInterviewId, payload);
        toast.success("Interview updated");
      } else {
        await createInterview(payload);
        toast.success("Interview added");
      }
      resetInterviewForm();
      setShowAddInterview(false);
      await loadInterviews();
    } catch (e: any) {
      toast.error("Failed to save interview", { description: e.message });
    } finally {
      setSavingInterview(false);
    }
  };

  const handleEditInterview = (interview: InterviewWithContext) => {
    setInterviewForm({
      roundType: interview.roundType,
      scheduledAt: interview.scheduledAt
        ? new Date(interview.scheduledAt).toISOString().slice(0, 16)
        : "",
      interviewerContactId: interview.interviewerContactId ?? "",
      outcome: interview.outcome,
      notes: interview.notes,
    });
    setEditingInterviewId(interview.id);
    setShowAddInterview(true);
  };

  const handleDeleteInterview = async (id: string) => {
    try {
      await deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i.id !== id));
      toast.success("Interview removed");
    } catch (e: any) {
      toast.error("Failed to remove interview", { description: e.message });
    }
  };

  const loadDocuments = async () => {
    try {
      const [links, all] = await Promise.all([
        getApplicationDocuments(application.id),
        getDocuments(),
      ]);
      setLinkedDocuments(links.map((l) => ({ ...l.document, linkId: l.id })));
      setAllDocuments(all);
    } catch (e: any) {
      toast.error("Failed to load documents", { description: e.message });
    }
  };

  const loadOffer = async () => {
    try {
      setOffer(await getApplicationOffer(application.id));
    } catch (e: any) {
      toast.error("Failed to load offer", { description: e.message });
    }
  };

  const handleLinkDocument = async () => {
    if (!documentToAdd) return;
    setLinkingDocument(true);
    try {
      await linkDocumentToApplication(app.id, documentToAdd);
      const doc = allDocuments.find((d) => d.id === documentToAdd);
      toast.success("Document linked", { description: doc?.name });
      setDocumentToAdd("");
      await loadDocuments();
    } catch (e: any) {
      toast.error("Failed to link document", { description: e.message });
    } finally {
      setLinkingDocument(false);
    }
  };

  const handleUnlinkDocument = async (linkId: string, name: string) => {
    try {
      await unlinkDocumentFromApplication(linkId);
      setLinkedDocuments((prev) => prev.filter((d) => d.linkId !== linkId));
      toast.success("Document unlinked", { description: name });
    } catch (e: any) {
      toast.error("Failed to unlink document", { description: e.message });
    }
  };

  const loadContacts = async () => {
    try {
      const [links, all] = await Promise.all([
        getApplicationContacts(application.id),
        getContacts(),
      ]);
      setLinkedContacts(
        links.map((l) => ({
          ...l.contact,
          linkId: l.id,
          roleInProcess: l.roleInProcess,
        })),
      );
      setAllContacts(all);
    } catch (e: any) {
      toast.error("Failed to load contacts", { description: e.message });
    }
  };

  const handleLinkContact = async () => {
    if (!contactToAdd) return;
    setLinkingContact(true);
    try {
      await linkContactToApplication(app.id, contactToAdd);
      const contact = allContacts.find((c) => c.id === contactToAdd);
      toast.success("Contact linked", {
        description: contact?.name,
      });
      setContactToAdd("");
      await loadContacts();
    } catch (e: any) {
      toast.error("Failed to link contact", { description: e.message });
    } finally {
      setLinkingContact(false);
    }
  };

  const handleUnlinkContact = async (linkId: string, name: string) => {
    try {
      await unlinkContactFromApplication(linkId);
      setLinkedContacts((prev) => prev.filter((c) => c.linkId !== linkId));
      toast.success("Contact unlinked", { description: name });
    } catch (e: any) {
      toast.error("Failed to unlink contact", { description: e.message });
    }
  };

  const saveField = async (field: string, value: any) => {
    setSavingField(field);
    try {
      await updateApplication(app.id, { [field]: value === "" ? null : value });
      const updated = { ...app, [field]: value === "" ? null : value };
      setApp(updated);
      onUpdated(updated);
      toast.success("Saved", {
        description: `${field.replace(/([A-Z])/g, " $1").trim()} updated`,
      });
    } catch (e: any) {
      toast.error("Failed to save", { description: e.message });
    } finally {
      setSavingField(null);
    }
  };

  const completed = checklist.filter((c) => c.completed).length;
  const total = checklist.length;
  const progress = total > 0 ? (completed / total) * 100 : 0;

  const handleStatusChange = async (status: ApplicationStatus) => {
    setSavingStatus(true);
    try {
      await updateApplication(app.id, { status });
      const updated = { ...app, status };
      setApp(updated);
      onUpdated(updated);
      toast.success("Status updated", {
        description: statusConfig[status].label,
      });
    } catch (e: any) {
      toast.error("Failed to update status", { description: e.message });
    } finally {
      setSavingStatus(false);
    }
  };

  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesTimer) clearTimeout(notesTimer);
    const t = setTimeout(async () => {
      setSavingNotes(true);
      try {
        await updateApplication(app.id, { notes: val });
        const updated = { ...app, notes: val };
        setApp(updated);
        onUpdated(updated);
      } catch (e: any) {
        toast.error("Failed to save notes", { description: e.message });
      } finally {
        setSavingNotes(false);
      }
    }, 800);
    setNotesTimer(t);
  };

  const handleToggleCheck = async (itemId: string, checked: boolean) => {
    try {
      await updateChecklistItem(itemId, { completed: checked });
      setChecklist((prev) =>
        prev.map((c) => (c.id === itemId ? { ...c, completed: checked } : c)),
      );
    } catch (e: any) {
      toast.error("Failed to update checklist", { description: e.message });
    }
  };

  const handleAddCheck = async () => {
    if (!newCheckItem.trim()) return;
    try {
      const item = await addChecklistItem(app.id, newCheckItem.trim());
      setChecklist((prev) => [...prev, item]);
      setNewCheckItem("");
      toast.success("Checklist item added");
    } catch (e: any) {
      toast.error("Failed to add checklist item", { description: e.message });
    }
  };

  const handleDeleteCheck = (itemId: string) => {
    const removedItem = checklist.find((c) => c.id === itemId);
    if (!removedItem) return;
    const beforeChecklist = checklist;

    deleteWithUndo({
      id: itemId,
      label: "Checklist item removed",
      description: removedItem.item,
      onRemoveLocally: () => {
        setChecklist((prev) => prev.filter((c) => c.id !== itemId));
      },
      onRestoreLocally: () => {
        setChecklist(beforeChecklist);
      },
      performDelete: () => deleteChecklistItem(itemId),
      onDeleteFailed: (e) =>
        toast.error("Failed to remove checklist item", {
          description: e.message,
        }),
    });
  };

  const handleDuplicate = async () => {
    try {
      const duplicate = await duplicateApplication(app.id);
      toast.success("Application duplicated", {
        description: `${duplicate.roleTitle} copied as a new lead`,
      });
      const full = await getApplication(duplicate.id);
      onDuplicated(full);
    } catch (e: any) {
      toast.error("Failed to duplicate application", {
        description: e.message,
      });
    }
  };

  const daysSinceApplied = getDaysSince(editAppliedDate || app.appliedDate);
  const stale = isStale(app.status, app.updatedAt);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed right-0 top-0 h-full w-full sm:max-w-2xl bg-card card-raised z-50 flex flex-col overflow-hidden border-l border-border"
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="min-w-0 pr-4">
            <h2 className="text-xl font-semibold text-card-foreground truncate">
              {app.roleTitle}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium">
                <Building2 className="size-3" aria-hidden="true" />
                {app.company.name}
              </span>
              {stale && (
                <span className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] bg-destructive/10 text-destructive">
                  <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
                  Stale
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDuplicate}
              aria-label="Duplicate application"
              title="Duplicate as a new lead"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <Copy className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              aria-label="Delete application"
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close panel"
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Role Title
                </label>
                {savingField === "roleTitle" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <input
                value={editRoleTitle}
                onChange={(e) => setEditRoleTitle(e.target.value)}
                onBlur={() =>
                  editRoleTitle !== app.roleTitle &&
                  editRoleTitle.trim() &&
                  saveField("roleTitle", editRoleTitle.trim())
                }
                className={inputCls}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Work Type
                </label>
                {savingField === "workType" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <select
                value={editWorkType}
                onChange={(e) => {
                  setEditWorkType(e.target.value as WorkType);
                  saveField("workType", e.target.value);
                }}
                className={selectCls}
              >
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Source
                </label>
                {savingField === "source" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <select
                value={editSource}
                onChange={(e) => {
                  setEditSource(e.target.value as ApplicationSource);
                  saveField("source", e.target.value);
                }}
                className={selectCls}
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Applied Date
                </label>
                {savingField === "appliedDate" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <input
                type="date"
                value={editAppliedDate}
                onChange={(e) => setEditAppliedDate(e.target.value)}
                onBlur={() =>
                  editAppliedDate !== (app.appliedDate ?? "") &&
                  saveField("appliedDate", editAppliedDate || null)
                }
                className={inputCls}
              />
              {daysSinceApplied !== null && daysSinceApplied >= 0 && (
                <p className="text-xs mt-1 text-muted-foreground tabular-nums">
                  {daysSinceApplied === 0
                    ? "Applied today"
                    : `${daysSinceApplied} days ago`}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Salary Range
                </label>
                {savingField === "salaryMin" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <div className="grid grid-cols-[28%_1fr_1fr] gap-1.5">
                <select
                  value={editCurrency}
                  onChange={(e) => {
                    setEditCurrency(e.target.value);
                    saveField("currency", e.target.value);
                  }}
                  className={`${selectCls} shrink-0`}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  placeholder="Min"
                  value={editSalaryMin}
                  onChange={(e) => setEditSalaryMin(e.target.value)}
                  onBlur={() => {
                    const val = editSalaryMin ? Number(editSalaryMin) : null;
                    if (val !== app.salaryMin) saveField("salaryMin", val);
                  }}
                  className={inputCls}
                />
                <input
                  type="number"
                  min={0}
                  placeholder="Max"
                  value={editSalaryMax}
                  onChange={(e) => setEditSalaryMax(e.target.value)}
                  onBlur={() => {
                    const val = editSalaryMax ? Number(editSalaryMax) : null;
                    if (val !== app.salaryMax) saveField("salaryMax", val);
                  }}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-muted-foreground">
                  Job Post URL
                </label>
                {savingField === "jobPostUrl" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <input
                value={editJobPostUrl}
                onChange={(e) => setEditJobPostUrl(e.target.value)}
                onBlur={() =>
                  editJobPostUrl !== app.jobPostUrl &&
                  saveField("jobPostUrl", editJobPostUrl)
                }
                placeholder="https://..."
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-5">
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editRelocationRequired}
                onChange={(e) => {
                  setEditRelocationRequired(e.target.checked);
                  saveField("relocationRequired", e.target.checked);
                }}
                className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
              <Plane
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Relocation required
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={editRelocationSponsored}
                onChange={(e) => {
                  setEditRelocationSponsored(e.target.checked);
                  saveField("relocationSponsored", e.target.checked);
                }}
                className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
              />
              <Globe2
                className="size-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Relocation sponsored
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Application Status
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_STATUSES.map((status) => {
                const config = statusConfig[status];
                const isSelected = app.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={savingStatus}
                    style={
                      isSelected
                        ? { borderColor: `var(--status-${status}-strong)` }
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${isSelected ? `${config.color} ${config.bgColor}` : "bg-muted text-muted-foreground border-transparent hover:border-border"}`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-foreground">
                Checklist Progress
              </label>
              <span className="text-sm text-muted-foreground tabular-nums">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-brand-400 to-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Checklist{" "}
              <span className="ml-2 text-xs text-muted-foreground font-normal tabular-nums">
                {completed}/{total}
              </span>
            </label>
            <div className="space-y-2">
              {checklist.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors group"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => handleToggleCheck(item.id, !item.completed)}
                    className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
                  />
                  <motion.span
                    initial={false}
                    animate={{ opacity: item.completed ? 0.6 : 1 }}
                    transition={{ duration: 0.15 }}
                    className={`flex-1 text-sm ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {item.item}
                  </motion.span>
                  <button
                    onClick={() => handleDeleteCheck(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 hover:text-destructive rounded transition-all"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </motion.div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCheck()}
                placeholder="Add checklist item..."
                className={`flex-1 ${inputCls}`}
              />
              <button
                onClick={handleAddCheck}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Plus className="size-4" />
                Add
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">
                Interviews
              </label>
              <button
                onClick={() => {
                  if (showAddInterview) {
                    resetInterviewForm();
                    setShowAddInterview(false);
                  } else {
                    resetInterviewForm();
                    setShowAddInterview(true);
                  }
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline underline-offset-4"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                {showAddInterview ? "Cancel" : "Add Round"}
              </button>
            </div>

            {interviews.length === 0 && !showAddInterview ? (
              <p className="text-sm text-muted-foreground mb-3">
                No interview rounds logged yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {interviews.map((interview) => {
                  const OutcomeIcon =
                    interviewOutcomeConfig[interview.outcome].icon;
                  return (
                    <li
                      key={interview.id}
                      className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-muted/50"
                    >
                      <button
                        onClick={() => handleEditInterview(interview)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap px-2 py-0.5 text-[10px] ${interviewOutcomeConfig[interview.outcome].bg} ${interviewOutcomeConfig[interview.outcome].color}`}
                          >
                            <OutcomeIcon
                              className="size-2.5 shrink-0"
                              aria-hidden="true"
                            />
                            {interviewOutcomeConfig[interview.outcome].label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {INTERVIEW_ROUND_TYPE_LABEL[interview.roundType]}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarClock
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {formatInterviewDateTime(interview.scheduledAt)}
                          {interview.interviewerName &&
                            ` · ${interview.interviewerName}`}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeleteInterview(interview.id)}
                        title="Remove interview"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {showAddInterview && (
              <div className="p-3 rounded-lg border border-border space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={interviewForm.roundType}
                    onChange={(e) =>
                      setInterviewForm((f) => ({
                        ...f,
                        roundType: e.target.value as InterviewRoundType,
                      }))
                    }
                    className={selectCls}
                  >
                    {INTERVIEW_ROUND_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {INTERVIEW_ROUND_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={interviewForm.outcome}
                    onChange={(e) =>
                      setInterviewForm((f) => ({
                        ...f,
                        outcome: e.target.value as InterviewOutcome,
                      }))
                    }
                    className={selectCls}
                  >
                    {INTERVIEW_OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {interviewOutcomeConfig[o].label}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  type="datetime-local"
                  value={interviewForm.scheduledAt}
                  onChange={(e) =>
                    setInterviewForm((f) => ({
                      ...f,
                      scheduledAt: e.target.value,
                    }))
                  }
                  className={inputCls}
                />
                <select
                  value={interviewForm.interviewerContactId}
                  onChange={(e) =>
                    setInterviewForm((f) => ({
                      ...f,
                      interviewerContactId: e.target.value,
                    }))
                  }
                  className={selectCls}
                >
                  <option value="">No interviewer set</option>
                  {allContacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <textarea
                  rows={2}
                  value={interviewForm.notes}
                  onChange={(e) =>
                    setInterviewForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  placeholder="Notes..."
                  className={textareaCls}
                />
                <button
                  onClick={handleAddInterview}
                  disabled={savingInterview}
                  className="w-full h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {savingInterview
                    ? "Saving…"
                    : editingInterviewId
                      ? "Save Changes"
                      : "Add Interview"}
                </button>
              </div>
            )}
          </div>

          {app.status === "offer" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Offer
              </label>
              {offer ? (
                <div className="p-3 rounded-lg bg-[var(--status-offer-tint)] border border-[var(--status-offer-strong)]/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-[var(--status-offer-strong)]">
                      <Trophy
                        className="size-3.5 shrink-0"
                        aria-hidden="true"
                      />
                      Est. Total Comp
                    </span>
                    <span className="text-sm font-semibold text-[var(--status-offer-strong)] tabular-nums">
                      {offer.currency}{" "}
                      {estimateTotalComp(offer).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Decision:{" "}
                    {offer.decision.charAt(0).toUpperCase() +
                      offer.decision.slice(1)}
                    {offer.decisionDeadline &&
                      ` · Deadline ${new Date(offer.decisionDeadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No offer details added yet. Add them from the Offers page.
                </p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-foreground">
                Documents
              </label>
            </div>
            {linkedDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">
                No documents linked to this application yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {linkedDocuments.map((doc) => (
                  <li
                    key={doc.linkId}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText
                        className="size-3.5 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {DOCUMENT_TYPE_LABEL[doc.type]}
                          {doc.versionLabel ? ` · ${doc.versionLabel}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open file"
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                          <ExternalLink
                            className="size-3.5"
                            aria-hidden="true"
                          />
                        </a>
                      )}
                      <button
                        onClick={() =>
                          handleUnlinkDocument(doc.linkId, doc.name)
                        }
                        title="Unlink document"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select
                value={documentToAdd}
                onChange={(e) => setDocumentToAdd(e.target.value)}
                className={`flex-1 ${selectCls}`}
              >
                <option value="">Select a document to link...</option>
                {allDocuments
                  .filter((d) => !linkedDocuments.some((ld) => ld.id === d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.versionLabel ? ` (${d.versionLabel})` : ""}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleLinkDocument}
                disabled={!documentToAdd || linkingDocument}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-sm shrink-0"
              >
                <Plus className="size-4" />
                Link
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">
              Contacts
            </label>
            {linkedContacts.length === 0 ? (
              <p className="text-sm text-muted-foreground mb-3">
                No contacts linked to this application yet.
              </p>
            ) : (
              <ul className="space-y-2 mb-3">
                {linkedContacts.map((contact) => (
                  <li
                    key={contact.linkId}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Users
                        className="size-3.5 text-muted-foreground shrink-0"
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.role || contact.relationship}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          title={contact.email}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                          <Mail className="size-3.5" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        onClick={() =>
                          handleUnlinkContact(contact.linkId, contact.name)
                        }
                        title="Unlink contact"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <select
                value={contactToAdd}
                onChange={(e) => setContactToAdd(e.target.value)}
                className={`flex-1 ${selectCls}`}
              >
                <option value="">Select a contact to link...</option>
                {allContacts
                  .filter((c) => !linkedContacts.some((lc) => lc.id === c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.companyName ? ` (${c.companyName})` : ""}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleLinkContact}
                disabled={!contactToAdd || linkingContact}
                className="px-4 h-9 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5 text-sm shrink-0"
              >
                <UserPlus className="size-4" />
                Link
              </button>
            </div>
          </div>

          <StatusHistorySection fetchHistory={() => getStatusHistory(app.id)} />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">
                Notes
              </label>
              {savingNotes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Saving…
                </span>
              )}
            </div>
            <textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about this application..."
              rows={4}
              className={textareaCls}
            />
          </div>

          {app.jobPostUrl && (
            <a
              href={app.jobPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <ExternalLink className="size-4" />
              View Job Posting
            </a>
          )}
        </div>
      </motion.div>

      {showDeleteModal && (
        <ConfirmDeleteModal
          itemName={`${app.roleTitle} at ${app.company.name}`}
          itemType="application"
          onConfirm={() => {
            setShowDeleteModal(false);
            onDeleted(app.id);
            onClose();
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </>
  );
}

// ── Main Applications Page ──────────────────────────────────────────────────

export function Applications() {
  const { selectedRoundId, activeRoundId, loading: roundsLoading } = useRound();
  const { deleteWithUndo } = useUndoableDelete();
  const isMounted = useIsMounted();
  const [applications, setApplications] = useState<ApplicationWithCompany[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">(
    "all",
  );
  const [workTypeFilter, setWorkTypeFilter] = useState<WorkType | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationWithCompany | null>(
    null,
  );
  const [sortKey, setSortKey] = useState<"roleTitle" | "company" | "updatedAt">(
    "updatedAt",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const PAGE_SIZE = 10;

  const handleSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // selectedRoundId of null means "All Rounds", so omit the filter
      const data = await getApplications(selectedRoundId ?? undefined);
      if (isMounted()) setApplications(data);
    } catch (e: any) {
      if (isMounted()) {
        setError(e.message);
        toast.error("Failed to load applications", { description: e.message });
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [selectedRoundId, isMounted]);

  useEffect(() => {
    if (roundsLoading) return;
    load();
  }, [load, roundsLoading]);

  useEffect(() => {
    setSelectedApp(null);
  }, [selectedRoundId]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [searchQuery, statusFilter, workTypeFilter, selectedRoundId]);

  const filtered = useMemo(
    () =>
      applications.filter((a) => {
        const query = searchQuery.toLowerCase();
        const matchSearch =
          !query ||
          a.roleTitle.toLowerCase().includes(query) ||
          a.company.name.toLowerCase().includes(query) ||
          (a.notes ?? "").toLowerCase().includes(query);
        const matchStatus = statusFilter === "all" || a.status === statusFilter;
        const matchWorkType =
          workTypeFilter === "all" || a.workType === workTypeFilter;
        return matchSearch && matchStatus && matchWorkType;
      }),
    [applications, searchQuery, statusFilter, workTypeFilter],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "roleTitle") cmp = a.roleTitle.localeCompare(b.roleTitle);
      else if (sortKey === "company")
        cmp = a.company.name.localeCompare(b.company.name);
      else if (sortKey === "updatedAt") {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const allOnPageSelected =
    paginated.length > 0 && paginated.every((a) => selectedIds.has(a.id));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        paginated.forEach((a) => next.delete(a.id));
      } else {
        paginated.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const handleUpdated = (updated: ApplicationWithCompany) => {
    setApplications((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    if (selectedApp?.id === updated.id) setSelectedApp(updated);
  };

  const handleDeleted = (id: string) => {
    const removedApp = applications.find((a) => a.id === id);
    if (!removedApp) return;

    deleteWithUndo({
      id,
      label: "Application deleted",
      description: `${removedApp.roleTitle} at ${removedApp.company.name}`,
      onRemoveLocally: () => {
        setApplications((prev) => prev.filter((a) => a.id !== id));
        setSelectedApp(null);
      },
      onRestoreLocally: () => {
        setApplications((prev) => [...prev, removedApp]);
        setSelectedApp(removedApp);
      },
      performDelete: () => deleteApplication(id),
      onDeleteFailed: (e) =>
        toast.error("Failed to delete application", {
          description: e.message,
        }),
    });
  };

  const handleDuplicated = (duplicate: ApplicationWithCompany) => {
    setApplications((prev) => [...prev, duplicate]);
    setSelectedApp(duplicate);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setBulkDeleting(true);
    try {
      const results = await Promise.allSettled(
        ids.map((id) => deleteApplication(id)),
      );
      const succeededIds = ids.filter(
        (_, i) => results[i].status === "fulfilled",
      );
      const failed = results.length - succeededIds.length;

      if (succeededIds.length > 0) {
        toast.success(
          `Deleted ${succeededIds.length} ${succeededIds.length === 1 ? "application" : "applications"}`,
          failed > 0
            ? { description: `${failed} could not be deleted` }
            : undefined,
        );
      }
      if (succeededIds.length === 0 && failed > 0) {
        toast.error("Failed to delete applications");
      }

      setApplications((prev) =>
        prev.filter((a) => !succeededIds.includes(a.id)),
      );
      setSelectedIds(new Set());
      setShowBulkDelete(false);
      if (selectedApp && succeededIds.includes(selectedApp.id))
        setSelectedApp(null);
    } catch (e: any) {
      toast.error("Failed to delete selected applications", {
        description: e.message,
      });
    } finally {
      setBulkDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Applications
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track every role from lead to offer
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-sm text-muted-foreground hidden sm:block tabular-nums">
              {filtered.length} of {applications.length} applications
            </div>
            <button
              onClick={() => exportApplicationsCSV(applications)}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-border text-sm font-medium rounded-md text-foreground hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={load}
              aria-label="Refresh applications"
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              Add Application
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        <div className="bg-card rounded-xl border p-3 sm:p-4 mb-4 sm:mb-6 card-resting">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 ${inputCls}`}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ApplicationStatus | "all")
                }
                className={`${selectCls} w-auto pr-8`}
              >
                <option value="all">All Status</option>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusConfig[s].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <select
                value={workTypeFilter}
                onChange={(e) =>
                  setWorkTypeFilter(e.target.value as WorkType | "all")
                }
                className={`${selectCls} w-auto pr-8`}
              >
                <option value="all">All Work Types</option>
                {WORK_TYPES.map((w) => (
                  <option key={w} value={w}>
                    {w.charAt(0).toUpperCase() + w.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between gap-3 bg-secondary/50 border border-border rounded-lg px-4 py-3 mb-4 sm:mb-6">
            <span className="text-sm text-foreground">
              {selectedIds.size}{" "}
              {selectedIds.size === 1 ? "application" : "applications"} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 h-8 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowBulkDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 h-8 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90 transition-colors"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-card rounded-xl border card-resting overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    {[
                      "Role",
                      "Company",
                      "Status",
                      "Work Type",
                      "Salary",
                      "Updated",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-40" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20 rounded-md" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-24" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-20" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
        ) : (
          <>
            <div className="bg-card rounded-xl border card-resting overflow-hidden hidden sm:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allOnPageSelected}
                          onChange={toggleSelectAllOnPage}
                          aria-label="Select all applications on this page"
                          className="size-4 rounded border-border accent-[var(--brand-600)] cursor-pointer"
                        />
                      </th>
                      {[
                        { label: "Role", key: "roleTitle" as const },
                        { label: "Company", key: "company" as const },
                        { label: "Status", key: null },
                        { label: "Work Type", key: null },
                        { label: "Salary", key: null },
                        { label: "Updated", key: "updatedAt" as const },
                      ].map(({ label, key }) => (
                        <th
                          key={label}
                          onClick={key ? () => handleSort(key) : undefined}
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider select-none ${key ? "text-muted-foreground hover:text-foreground cursor-pointer transition-colors" : "text-muted-foreground"}`}
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {key &&
                              (sortKey === key ? (
                                sortDir === "asc" ? (
                                  <ArrowUp
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                ) : (
                                  <ArrowDown
                                    className="size-3"
                                    aria-hidden="true"
                                  />
                                )
                              ) : (
                                <ArrowUpDown
                                  className="size-3 opacity-40"
                                  aria-hidden="true"
                                />
                              ))}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {paginated.map((app) => {
                      const stale = isStale(app.status, app.updatedAt);
                      return (
                        <motion.tr
                          key={app.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ duration: 0.2 }}
                          onClick={() => setSelectedApp(app)}
                          className={`hover:bg-muted/30 cursor-pointer transition-colors ${selectedApp?.id === app.id ? "bg-muted/40" : ""}`}
                        >
                          <td
                            className="w-10 px-4 py-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedIds.has(app.id)}
                              onChange={() => toggleSelected(app.id)}
                              aria-label={`Select ${app.roleTitle}`}
                              className="size-4 rounded border-border accent-[var(--brand-600)] cursor-pointer"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-foreground">
                              {app.roleTitle}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-muted-foreground">
                              {app.company.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5">
                              <StatusBadge status={app.status} />
                              {stale && (
                                <span className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] bg-destructive/10 text-destructive">
                                  Stale
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-muted-foreground capitalize">
                              {app.workType}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground tabular-nums">
                              {formatSalary(
                                app.salaryMin,
                                app.salaryMax,
                                app.currency,
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-muted-foreground tabular-nums">
                              {new Date(app.updatedAt).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-16">
                    <Briefcase
                      className="size-10 text-muted-foreground/30 mx-auto mb-3"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-foreground mb-1">
                      {applications.length === 0
                        ? "No applications yet"
                        : "No applications found"}
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {applications.length === 0
                        ? "Start tracking your job search by adding an application."
                        : "Try adjusting your search or filters."}
                    </p>
                    {applications.length === 0 && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        Add Application
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="hidden sm:flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    aria-label="First page"
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Previous page"
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 || p === totalPages || Math.abs(p - page) <= 1,
                    )
                    .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("…");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "…" ? (
                        <span
                          key={`ellipsis-${i}`}
                          className="h-8 w-8 flex items-center justify-center text-sm text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p as number)}
                          aria-label={`Page ${p}`}
                          aria-current={page === p ? "page" : undefined}
                          className={`h-8 w-8 flex items-center justify-center rounded-md border text-sm transition-colors ${page === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
                        >
                          {p}
                        </button>
                      ),
                    )}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Next page"
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    ›
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    aria-label="Last page"
                    className="h-8 w-8 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Mobile card list - visible on small screens only */}
        <div className="sm:hidden space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border card-resting p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16 rounded-md" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))
          ) : error ? null : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase
                className="size-10 text-muted-foreground/30 mx-auto mb-3"
                aria-hidden="true"
              />
              <p className="text-sm font-medium text-foreground mb-1">
                {applications.length === 0
                  ? "No applications yet"
                  : "No applications found"}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {applications.length === 0
                  ? "Start tracking your job search by adding an application."
                  : "Try adjusting your search or filters."}
              </p>
              {applications.length === 0 && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add Application
                </button>
              )}
            </div>
          ) : (
            paginated.map((app) => {
              const stale = isStale(app.status, app.updatedAt);
              return (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedApp(app)}
                  className={`bg-card rounded-xl border card-resting p-4 cursor-pointer hover:card-raised transition-shadow duration-200 ${selectedApp?.id === app.id ? "ring-2 ring-ring" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(app.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleSelected(app.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select ${app.roleTitle}`}
                        className="size-4 mt-0.5 rounded border-border accent-[var(--brand-600)] cursor-pointer shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {app.roleTitle}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {app.company.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{app.workType}</span>
                    <span className="tabular-nums">
                      {formatSalary(app.salaryMin, app.salaryMax, app.currency)}
                    </span>
                  </div>
                  {stale && (
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] bg-destructive/10 text-destructive">
                        Stale
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="sm:hidden flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground tabular-nums">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="h-9 px-3 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
              >
                ‹ Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="h-9 px-3 flex items-center justify-center rounded-md border border-border text-sm disabled:opacity-40 hover:bg-accent transition-colors"
              >
                Next ›
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddApplicationModal
            key="add-modal"
            activeRoundId={activeRoundId}
            onClose={() => setShowAddModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedApp && (
          <ApplicationDetailDrawer
            key={selectedApp.id}
            application={selectedApp}
            onClose={() => setSelectedApp(null)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            onDuplicated={handleDuplicated}
          />
        )}
      </AnimatePresence>

      {showBulkDelete && (
        <BulkDeleteConfirmModal
          count={selectedIds.size}
          itemLabel="applications"
          saving={bulkDeleting}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDelete(false)}
        />
      )}
    </div>
  );
}
