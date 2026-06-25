import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  RefreshCw,
  Users,
  AlertCircle,
  X,
  Trash2,
  Mail,
  Phone,
  Building2,
  CheckCircle2,
  Clock,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { Contact, ContactRelationship } from "../types";
import {
  ContactWithCompany,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  markContactedToday,
  needsFollowUp,
  FOLLOW_UP_THRESHOLD_DAYS,
} from "../../services/contacts";
import { getCompanies } from "../../services/companies";
import { Company } from "../types";
import { exportContactsCSV } from "../utils/dataExport";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { useIsMounted } from "../hooks/useIsMounted";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { Skeleton } from "../components/ui/skeleton";
import {
  inputCls,
  selectCls,
  textareaCls,
} from "../components/ui/input-classes";

const RELATIONSHIPS: ContactRelationship[] = [
  "recruiter",
  "referral",
  "interviewer",
  "other",
];

const relationshipLabel = (r: ContactRelationship) =>
  r.charAt(0).toUpperCase() + r.slice(1);

const relationshipColor: Record<ContactRelationship, string> = {
  recruiter:
    "text-[var(--status-screening-strong)] bg-[var(--status-screening-tint)]",
  referral: "text-[var(--status-offer-strong)] bg-[var(--status-offer-tint)]",
  interviewer:
    "text-[var(--status-interviewing-strong)] bg-[var(--status-interviewing-tint)]",
  other: "text-[var(--status-lead-strong)] bg-[var(--status-lead-tint)]",
};

function getDaysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor(
    (new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
}

// ── Add / Edit Contact Modal ─────────────────────────────────────────────────

function ContactModal({
  contact,
  companies,
  onClose,
  onSaved,
}: {
  contact: ContactWithCompany | null;
  companies: Company[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!contact;
  const [form, setForm] = useState({
    name: contact?.name ?? "",
    companyId: contact?.companyId ?? "",
    role: contact?.role ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    relationship: contact?.relationship ?? ("other" as ContactRelationship),
    lastContactedAt: contact?.lastContactedAt ?? "",
    notes: contact?.notes ?? "",
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
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Enter a valid email address";
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
      const payload = {
        name: form.name.trim(),
        companyId: form.companyId || null,
        role: form.role,
        email: form.email,
        phone: form.phone,
        relationship: form.relationship,
        lastContactedAt: form.lastContactedAt || null,
        notes: form.notes,
      };
      if (isEdit) {
        await updateContact(contact!.id, payload);
        toast.success("Contact updated", { description: form.name.trim() });
      } else {
        await createContact(payload);
        toast.success("Contact added", { description: form.name.trim() });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error(
        isEdit ? "Failed to update contact" : "Failed to add contact",
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
            {isEdit ? "Edit Contact" : "Add Contact"}
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
                Name *
              </label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={`${inputCls} ${fieldErrors.name ? "border-destructive focus-visible:border-destructive" : ""}`}
                placeholder="e.g. Jane Smith"
              />
              {fieldErrors.name && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Role
              </label>
              <input
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputCls}
                placeholder="e.g. Technical Recruiter"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Company
              </label>
              <select
                value={form.companyId}
                onChange={(e) => set("companyId", e.target.value)}
                className={selectCls}
              >
                <option value="">No company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Relationship
              </label>
              <select
                value={form.relationship}
                onChange={(e) => set("relationship", e.target.value)}
                className={selectCls}
              >
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {relationshipLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={`${inputCls} ${fieldErrors.email ? "border-destructive focus-visible:border-destructive" : ""}`}
                placeholder="name@example.com"
              />
              {fieldErrors.email && (
                <p className="text-xs text-destructive mt-1">
                  {fieldErrors.email}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputCls}
                placeholder="555-0100"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Last Contacted
            </label>
            <input
              type="date"
              value={form.lastContactedAt}
              onChange={(e) => set("lastContactedAt", e.target.value)}
              className={inputCls}
            />
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Contacts Page ──────────────────────────────────────────────────────

export function Contacts() {
  const { deleteWithUndo } = useUndoableDelete();
  const isMounted = useIsMounted();
  const [contacts, setContacts] = useState<ContactWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [relationshipFilter, setRelationshipFilter] = useState<
    ContactRelationship | "all"
  >("all");
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] =
    useState<ContactWithCompany | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContactWithCompany | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactsData, companiesData] = await Promise.all([
        getContacts(),
        getCompanies(),
      ]);
      if (isMounted()) {
        setContacts(contactsData);
        setCompanies(companiesData);
      }
    } catch (e: any) {
      if (isMounted()) {
        setError(e.message);
        toast.error("Failed to load contacts", { description: e.message });
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
      contacts.filter((c) => {
        const query = searchQuery.toLowerCase();
        const matchSearch =
          !query ||
          c.name.toLowerCase().includes(query) ||
          (c.companyName ?? "").toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query);
        const matchRelationship =
          relationshipFilter === "all" || c.relationship === relationshipFilter;
        const matchFollowUp = !followUpOnly || needsFollowUp(c.lastContactedAt);
        return matchSearch && matchRelationship && matchFollowUp;
      }),
    [contacts, searchQuery, relationshipFilter, followUpOnly],
  );

  const followUpCount = useMemo(
    () => contacts.filter((c) => needsFollowUp(c.lastContactedAt)).length,
    [contacts],
  );

  const handleMarkContacted = async (contact: ContactWithCompany) => {
    try {
      const updated = await markContactedToday(contact.id);
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contact.id
            ? { ...c, lastContactedAt: updated.lastContactedAt }
            : c,
        ),
      );
      toast.success("Marked as contacted today", { description: contact.name });
    } catch (e: any) {
      toast.error("Failed to update contact", { description: e.message });
    }
  };

  const handleDelete = (contact: ContactWithCompany) => {
    deleteWithUndo({
      id: contact.id,
      label: "Contact deleted",
      description: contact.name,
      onRemoveLocally: () => {
        setContacts((prev) => prev.filter((c) => c.id !== contact.id));
      },
      onRestoreLocally: () => {
        setContacts((prev) => [...prev, contact]);
      },
      performDelete: () => deleteContact(contact.id),
      onDeleteFailed: (e) =>
        toast.error("Failed to delete contact", { description: e.message }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Contacts</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recruiters, referrals, and interviewers across your search
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => exportContactsCSV(contacts)}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-border text-sm font-medium rounded-md text-foreground hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={load}
              aria-label="Refresh contacts"
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => {
                setEditingContact(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              Add Contact
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
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 ${inputCls}`}
                />
              </div>
            </div>
            <select
              value={relationshipFilter}
              onChange={(e) =>
                setRelationshipFilter(
                  e.target.value as ContactRelationship | "all",
                )
              }
              className={`${selectCls} w-auto pr-8`}
            >
              <option value="all">All Relationships</option>
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>
                  {relationshipLabel(r)}
                </option>
              ))}
            </select>
            <button
              onClick={() => setFollowUpOnly((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium border transition-colors ${followUpOnly ? "bg-destructive/10 text-destructive border-destructive/30" : "border-border text-muted-foreground hover:bg-accent"}`}
            >
              <Clock className="size-3.5" aria-hidden="true" />
              Needs Follow-up
              {followUpCount > 0 && (
                <span className="text-[10px] tabular-nums bg-destructive/20 px-1.5 py-0.5 rounded-full">
                  {followUpCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border card-resting p-4 space-y-3"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
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
            <Users
              className="size-10 text-muted-foreground/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground mb-1">
              {contacts.length === 0 ? "No contacts yet" : "No contacts found"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {contacts.length === 0
                ? "Add recruiters, referrals, and interviewers as you meet them."
                : "Try adjusting your search or filters."}
            </p>
            {contacts.length === 0 && (
              <button
                onClick={() => {
                  setEditingContact(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Contact
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {filtered.map((contact) => {
                const followUp = needsFollowUp(contact.lastContactedAt);
                const daysSince = getDaysSince(contact.lastContactedAt);
                return (
                  <motion.div
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card rounded-xl border card-resting p-4 hover:card-raised transition-shadow duration-200"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {contact.name}
                        </p>
                        {contact.role && (
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.role}
                          </p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] ${relationshipColor[contact.relationship]}`}
                      >
                        {relationshipLabel(contact.relationship)}
                      </span>
                    </div>

                    {contact.companyName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                        <Building2
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        <span className="truncate">{contact.companyName}</span>
                      </div>
                    )}

                    <div className="space-y-1 mb-3">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors truncate"
                        >
                          <Mail
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          {contact.phone}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span
                        className={`text-xs ${followUp ? "text-destructive font-medium" : "text-muted-foreground"}`}
                      >
                        {daysSince === null
                          ? "Never contacted"
                          : daysSince === 0
                            ? "Contacted today"
                            : `${daysSince}d since contact`}
                      </span>
                      <div className="flex items-center gap-1">
                        {followUp && (
                          <button
                            onClick={() => handleMarkContacted(contact)}
                            title="Mark as contacted today"
                            className="p-1.5 text-muted-foreground hover:text-[var(--status-offer-strong)] hover:bg-[var(--status-offer-tint)] rounded-md transition-colors"
                          >
                            <CheckCircle2
                              className="size-3.5"
                              aria-hidden="true"
                            />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingContact(contact);
                            setShowModal(true);
                          }}
                          title="Edit contact"
                          className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(contact)}
                          title="Delete contact"
                          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <ContactModal
            key={editingContact?.id ?? "new"}
            contact={editingContact}
            companies={companies}
            onClose={() => setShowModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.name}
          itemType="contact"
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
