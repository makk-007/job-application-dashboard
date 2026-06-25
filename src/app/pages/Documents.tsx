import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  RefreshCw,
  FileText,
  AlertCircle,
  X,
  Trash2,
  ExternalLink,
  Search,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { DocumentType, JobDocument } from "../types";
import {
  getDocuments,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentUsageCount,
} from "../../services/documents";
import { exportDocumentsCSV } from "../utils/dataExport";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useIsMounted } from "../hooks/useIsMounted";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { Skeleton } from "../components/ui/skeleton";
import { inputCls, selectCls } from "../components/ui/input-classes";

const DOCUMENT_TYPES: DocumentType[] = [
  "resume",
  "cover_letter",
  "portfolio",
  "other",
];

const documentTypeLabel: Record<DocumentType, string> = {
  resume: "Resume",
  cover_letter: "Cover Letter",
  portfolio: "Portfolio",
  other: "Other",
};

const documentTypeColor: Record<DocumentType, string> = {
  resume: "text-[var(--status-applied-strong)] bg-[var(--status-applied-tint)]",
  cover_letter:
    "text-[var(--status-interviewing-strong)] bg-[var(--status-interviewing-tint)]",
  portfolio: "text-[var(--status-offer-strong)] bg-[var(--status-offer-tint)]",
  other: "text-[var(--status-lead-strong)] bg-[var(--status-lead-tint)]",
};

// ── Add / Edit Document Modal ────────────────────────────────────────────

function DocumentModal({
  document: doc,
  onClose,
  onSaved,
}: {
  document: JobDocument | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!doc;
  const [form, setForm] = useState({
    type: doc?.type ?? ("resume" as DocumentType),
    name: doc?.name ?? "",
    versionLabel: doc?.versionLabel ?? "",
    fileUrl: doc?.fileUrl ?? "",
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
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.fileUrl && !/^https?:\/\//i.test(form.fileUrl))
      errs.fileUrl = "Link must start with http:// or https://";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        name: form.name.trim(),
        versionLabel: form.versionLabel,
        fileUrl: form.fileUrl,
      };
      if (isEdit) {
        await updateDocument(doc!.id, payload);
        toast.success("Document updated", { description: form.name.trim() });
      } else {
        await createDocument(payload);
        toast.success("Document added", { description: form.name.trim() });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error(
        isEdit ? "Failed to update document" : "Failed to add document",
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
        className="bg-card rounded-xl border card-raised w-full sm:max-w-md sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            {isEdit ? "Edit Document" : "Add Document"}
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
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className={selectCls}
            >
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {documentTypeLabel[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={`${inputCls} ${fieldErrors.name ? "border-destructive focus-visible:border-destructive" : ""}`}
              placeholder="e.g. Software Engineer Resume"
            />
            {fieldErrors.name && (
              <p className="text-xs text-destructive mt-1">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Version Label
            </label>
            <input
              value={form.versionLabel}
              onChange={(e) => set("versionLabel", e.target.value)}
              className={inputCls}
              placeholder="e.g. v3 - emphasized backend experience"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              File Link
            </label>
            <input
              value={form.fileUrl}
              onChange={(e) => set("fileUrl", e.target.value)}
              className={`${inputCls} ${fieldErrors.fileUrl ? "border-destructive focus-visible:border-destructive" : ""}`}
              placeholder="https://drive.google.com/..."
            />
            {fieldErrors.fileUrl && (
              <p className="text-xs text-destructive mt-1">
                {fieldErrors.fileUrl}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Link to wherever the file lives (Drive, Dropbox, etc.). Files are
              not uploaded directly.
            </p>
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
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Document"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Documents Page ──────────────────────────────────────────────────

export function Documents() {
  const { deleteWithUndo } = useUndoableDelete();
  const isMounted = useIsMounted();
  const [documents, setDocuments] = useState<JobDocument[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [editingDocument, setEditingDocument] = useState<JobDocument | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<JobDocument | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const docs = await getDocuments();
      const counts = await Promise.all(
        docs.map((d) => getDocumentUsageCount(d.id)),
      );
      if (isMounted()) {
        setDocuments(docs);
        setUsageCounts(
          Object.fromEntries(docs.map((d, i) => [d.id, counts[i]])),
        );
      }
    } catch (e: any) {
      if (isMounted()) {
        setError(e.message);
        toast.error("Failed to load documents", { description: e.message });
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
      documents.filter((d) => {
        const query = searchQuery.toLowerCase();
        const matchSearch =
          !query ||
          d.name.toLowerCase().includes(query) ||
          d.versionLabel.toLowerCase().includes(query);
        const matchType = typeFilter === "all" || d.type === typeFilter;
        return matchSearch && matchType;
      }),
    [documents, searchQuery, typeFilter],
  );

  const handleDelete = (doc: JobDocument) => {
    deleteWithUndo({
      id: doc.id,
      label: "Document deleted",
      description: doc.name,
      onRemoveLocally: () => {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      },
      onRestoreLocally: () => {
        setDocuments((prev) => [doc, ...prev]);
      },
      performDelete: () => deleteDocument(doc.id),
      onDeleteFailed: (e) =>
        toast.error("Failed to delete document", { description: e.message }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Documents
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Resume and cover letter versions, ready to attach to applications
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => exportDocumentsCSV(documents)}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-border text-sm font-medium rounded-md text-foreground hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={load}
              aria-label="Refresh documents"
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => {
                setEditingDocument(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" />
              Add Document
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
                  placeholder="Search documents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 ${inputCls}`}
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as DocumentType | "all")
              }
              className={`${selectCls} w-auto pr-8`}
            >
              <option value="all">All Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {documentTypeLabel[t]}
                </option>
              ))}
            </select>
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
            <FileText
              className="size-10 text-muted-foreground/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground mb-1">
              {documents.length === 0
                ? "No documents yet"
                : "No documents found"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              {documents.length === 0
                ? "Add resume and cover letter versions to attach them to applications."
                : "Try adjusting your search or filters."}
            </p>
            {documents.length === 0 && (
              <button
                onClick={() => {
                  setEditingDocument(null);
                  setShowModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {filtered.map((doc) => (
                <motion.div
                  key={doc.id}
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
                        {doc.name}
                      </p>
                      {doc.versionLabel && (
                        <p className="text-xs text-muted-foreground truncate">
                          {doc.versionLabel}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] ${documentTypeColor[doc.type]}`}
                    >
                      {documentTypeLabel[doc.type]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border mt-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      Used in {usageCounts[doc.id] ?? 0}{" "}
                      {usageCounts[doc.id] === 1
                        ? "application"
                        : "applications"}
                    </span>
                    <div className="flex items-center gap-1">
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
                        onClick={() => {
                          setEditingDocument(doc);
                          setShowModal(true);
                        }}
                        title="Edit document"
                        className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        title="Delete document"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <DocumentModal
            key={editingDocument?.id ?? "new"}
            document={editingDocument}
            onClose={() => setShowModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.name}
          itemType="document"
          linkedCount={usageCounts[deleteTarget.id] ?? 0}
          linkedLabel="applications"
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
