import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Plus,
  AlertCircle,
  X,
  Trash2,
  Copy,
  Loader2,
  ExternalLink,
  Plane,
  Globe2,
  Building2,
  Users,
  UserPlus,
  Mail,
  CalendarClock,
  FileText,
  Trophy,
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
} from "../../types";
import {
  getApplication,
  updateApplication,
  duplicateApplication,
  getStatusHistory,
  getChecklistItems,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
} from "../../../services/applications";
import {
  ContactWithCompany,
  getContacts,
  getApplicationContacts,
  linkContactToApplication,
  unlinkContactFromApplication,
} from "../../../services/contacts";
import {
  InterviewWithContext,
  getApplicationInterviews,
  createInterview,
  updateInterview,
  deleteInterview,
} from "../../../services/interviews";
import {
  getDocuments,
  getApplicationDocuments,
  linkDocumentToApplication,
  unlinkDocumentFromApplication,
} from "../../../services/documents";
import {
  getApplicationOffer,
  estimateTotalComp,
} from "../../../services/offers";
import { useCurrencies } from "../../context/CurrencyContext";
import { useUndoableDelete } from "../../context/UndoableDeleteContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { StatusHistorySection } from "../StatusHistorySection";
import { ConfirmDeleteModal } from "../ConfirmDeleteModal";
import { inputCls, selectCls, textareaCls } from "../ui/input-classes";
import {
  statusConfig,
  ALL_STATUSES,
  isStale,
  getDaysSince,
} from "../../utils/statusConfig";
import { formatInterviewDateTime } from "../../utils/formatters";
import {
  SOURCES,
  WORK_TYPES,
  INTERVIEW_ROUND_TYPES,
  INTERVIEW_ROUND_TYPE_LABEL,
  INTERVIEW_OUTCOMES,
  interviewOutcomeConfig,
  DOCUMENT_TYPE_LABEL,
} from "../../utils/applicationOptions";

export function ApplicationDetailDrawer({
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
  const { currencies } = useCurrencies();
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
  const [editLocation, setEditLocation] = useState(application.location);
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
    setEditLocation(application.location);
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
                  Location
                </label>
                {savingField === "location" && (
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <input
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                onBlur={() =>
                  editLocation !== app.location &&
                  saveField("location", editLocation)
                }
                className={inputCls}
                placeholder="e.g. Austin, TX"
              />
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
                  {currencies.map((c) => (
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
