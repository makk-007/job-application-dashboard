import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Trophy,
  AlertCircle,
  Building2,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { OfferDecision } from "../types";
import {
  OfferWithApplication,
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  estimateTotalComp,
} from "../../services/offers";
import { getApplications } from "../../services/applications";
import { ApplicationWithCompany } from "../types";
import { exportOffersCSV } from "../utils/dataExport";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useIsMounted } from "../hooks/useIsMounted";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { Skeleton } from "../components/ui/skeleton";
import {
  inputCls,
  selectCls,
  textareaCls,
} from "../components/ui/input-classes";

const DECISIONS: OfferDecision[] = ["pending", "accepted", "declined"];
const CURRENCIES = ["USD", "EUR", "GBP", "GHS", "CAD"];

const decisionConfig: Record<
  OfferDecision,
  { label: string; icon: typeof Clock; color: string; bg: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-[var(--status-screening-strong)]",
    bg: "bg-[var(--status-screening-tint)]",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    color: "text-[var(--status-offer-strong)]",
    bg: "bg-[var(--status-offer-tint)]",
  },
  declined: {
    label: "Declined",
    icon: XCircle,
    color: "text-[var(--status-rejected-strong)]",
    bg: "bg-[var(--status-rejected-tint)]",
  },
};

function formatMoney(value: number | null, currency: string): string {
  if (value === null || value === 0) return "Not specified";
  return `${currency} ${value.toLocaleString()}`;
}

function formatDeadline(date: string | null): string {
  if (!date) return "No deadline set";
  const days = Math.ceil(
    (new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
  );
  const formatted = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (days < 0) return `${formatted} (passed)`;
  if (days === 0) return `${formatted} (today)`;
  return `${formatted} (${days}d left)`;
}

// ── Add Offer Modal ──────────────────────────────────────────────────────

function AddOfferModal({
  applications,
  onClose,
  onSaved,
}: {
  applications: ApplicationWithCompany[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    applicationId: "",
    baseSalary: "",
    bonus: "",
    signingBonus: "",
    equity: "",
    currency: "USD",
    decisionDeadline: "",
    decision: "pending" as OfferDecision,
    benefitsNotes: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.applicationId) {
      setFieldError("Select an application");
      return;
    }
    setSaving(true);
    try {
      await createOffer({
        applicationId: form.applicationId,
        baseSalary: form.baseSalary ? Number(form.baseSalary) : null,
        bonus: form.bonus ? Number(form.bonus) : null,
        signingBonus: form.signingBonus ? Number(form.signingBonus) : null,
        equity: form.equity,
        currency: form.currency,
        decisionDeadline: form.decisionDeadline || null,
        decision: form.decision,
        benefitsNotes: form.benefitsNotes,
        notes: form.notes,
      });
      toast.success("Offer added");
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to add offer", { description: e.message });
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
            Add Offer
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
              onChange={(e) => {
                setForm((f) => ({ ...f, applicationId: e.target.value }));
                setFieldError(null);
              }}
              className={`${selectCls} ${fieldError ? "border-destructive" : ""}`}
            >
              <option value="">Select an application...</option>
              {applications.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.roleTitle} at {a.company.name}
                </option>
              ))}
            </select>
            {fieldError && (
              <p className="text-xs text-destructive mt-1">{fieldError}</p>
            )}
            {applications.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No applications without an offer yet are available. Move an
                application to Offer status first.
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Compensation
            </label>
            <div className="grid grid-cols-[22%_1fr_1fr_1fr] gap-1.5">
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                className={`${selectCls} shrink-0`}
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                placeholder="Base"
                value={form.baseSalary}
                onChange={(e) =>
                  setForm((f) => ({ ...f, baseSalary: e.target.value }))
                }
                className={inputCls}
              />
              <input
                type="number"
                min={0}
                placeholder="Bonus"
                value={form.bonus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bonus: e.target.value }))
                }
                className={inputCls}
              />
              <input
                type="number"
                min={0}
                placeholder="Signing"
                value={form.signingBonus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, signingBonus: e.target.value }))
                }
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Equity
            </label>
            <input
              value={form.equity}
              onChange={(e) =>
                setForm((f) => ({ ...f, equity: e.target.value }))
              }
              placeholder="e.g. 5,000 RSUs over 4 years"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Decision Deadline
              </label>
              <input
                type="date"
                value={form.decisionDeadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, decisionDeadline: e.target.value }))
                }
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Decision
              </label>
              <select
                value={form.decision}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    decision: e.target.value as OfferDecision,
                  }))
                }
                className={selectCls}
              >
                {DECISIONS.map((d) => (
                  <option key={d} value={d}>
                    {decisionConfig[d].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Benefits Notes
            </label>
            <textarea
              rows={2}
              value={form.benefitsNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, benefitsNotes: e.target.value }))
              }
              placeholder="Health insurance, PTO, remote stipend..."
              className={textareaCls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Notes
            </label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
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
              {saving ? "Saving…" : "Add Offer"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main Offers Page ───────────────────────────────────────────────────────

export function Offers() {
  const { deleteWithUndo } = useUndoableDelete();
  const isMounted = useIsMounted();
  const [offers, setOffers] = useState<OfferWithApplication[]>([]);
  const [applications, setApplications] = useState<ApplicationWithCompany[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<OfferWithApplication | null>(
    null,
  );
  const [savingDecisionId, setSavingDecisionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offersData, applicationsData] = await Promise.all([
        getOffers(),
        getApplications(),
      ]);
      if (isMounted()) {
        setOffers(offersData);
        setApplications(applicationsData);
      }
    } catch (e: any) {
      if (isMounted()) {
        setError(e.message);
        toast.error("Failed to load offers", { description: e.message });
      }
    } finally {
      if (isMounted()) setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    load();
  }, [load]);

  // Applications already in Offer status that do not have an offer record yet
  const availableApplications = useMemo(
    () =>
      applications.filter(
        (a) =>
          a.status === "offer" && !offers.some((o) => o.applicationId === a.id),
      ),
    [applications, offers],
  );

  const sortedOffers = useMemo(
    () =>
      [...offers].sort((a, b) => estimateTotalComp(b) - estimateTotalComp(a)),
    [offers],
  );

  const handleDecisionChange = async (
    offer: OfferWithApplication,
    decision: OfferDecision,
  ) => {
    setSavingDecisionId(offer.id);
    try {
      await updateOffer(offer.id, { decision });
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, decision } : o)),
      );
      toast.success("Decision updated", {
        description: `${offer.application.roleTitle}: ${decisionConfig[decision].label}`,
      });
    } catch (e: any) {
      toast.error("Failed to update decision", { description: e.message });
    } finally {
      setSavingDecisionId(null);
    }
  };

  const handleDelete = (offer: OfferWithApplication) => {
    deleteWithUndo({
      id: offer.id,
      label: "Offer deleted",
      description: `${offer.application.roleTitle} at ${offer.application.companyName}`,
      onRemoveLocally: () => {
        setOffers((prev) => prev.filter((o) => o.id !== offer.id));
      },
      onRestoreLocally: () => {
        setOffers((prev) => [offer, ...prev]);
      },
      performDelete: () => deleteOffer(offer.id),
      onDeleteFailed: (e) =>
        toast.error("Failed to delete offer", { description: e.message }),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Offers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compare every offer side by side
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => exportOffersCSV(offers)}
              title="Export to CSV"
              className="inline-flex items-center gap-1.5 px-3 h-9 border border-border text-sm font-medium rounded-md text-foreground hover:bg-accent transition-colors"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={load}
              aria-label="Refresh offers"
              className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              disabled={availableApplications.length === 0}
              title={
                availableApplications.length === 0
                  ? "Move an application to Offer status first"
                  : undefined
              }
              className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Plus className="size-4" />
              Add Offer
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
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
        ) : offers.length === 0 ? (
          <div className="text-center py-16">
            <Trophy
              className="size-10 text-muted-foreground/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground mb-1">
              No offers yet
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Move an application to Offer status, then add the offer details
              here to compare.
            </p>
            {availableApplications.length > 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 h-9 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Offer
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence initial={false}>
              {sortedOffers.map((offer, index) => {
                const isTopOffer =
                  index === 0 &&
                  sortedOffers.length > 1 &&
                  estimateTotalComp(offer) > 0;
                return (
                  <motion.div
                    key={offer.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={`bg-card rounded-xl border card-resting p-5 hover:card-raised transition-shadow duration-200 ${isTopOffer ? "ring-2 ring-[var(--status-offer-strong)]" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {offer.application.roleTitle}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Building2
                            className="size-3 shrink-0"
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {offer.application.companyName}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteTarget(offer)}
                        title="Delete offer"
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>

                    {isTopOffer && (
                      <span className="inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap px-2.5 py-0.5 text-[11px] bg-[var(--status-offer-tint)] text-[var(--status-offer-strong)] mb-3">
                        <Trophy
                          className="size-3 shrink-0"
                          aria-hidden="true"
                        />
                        Highest total comp
                      </span>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Base</span>
                        <span className="text-foreground tabular-nums font-medium">
                          {formatMoney(offer.baseSalary, offer.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bonus</span>
                        <span className="text-foreground tabular-nums">
                          {formatMoney(offer.bonus, offer.currency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Signing</span>
                        <span className="text-foreground tabular-nums">
                          {formatMoney(offer.signingBonus, offer.currency)}
                        </span>
                      </div>
                      {offer.equity && (
                        <div className="flex items-start justify-between text-sm gap-2">
                          <span className="text-muted-foreground shrink-0">
                            Equity
                          </span>
                          <span className="text-foreground text-right">
                            {offer.equity}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                        <span className="text-muted-foreground font-medium">
                          Est. Total
                        </span>
                        <span className="text-foreground tabular-nums font-semibold">
                          {formatMoney(
                            estimateTotalComp(offer),
                            offer.currency,
                          )}
                        </span>
                      </div>
                    </div>

                    {offer.benefitsNotes && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {offer.benefitsNotes}
                      </p>
                    )}

                    <p className="text-xs text-muted-foreground mb-3">
                      {formatDeadline(offer.decisionDeadline)}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {DECISIONS.map((d) => {
                        const isSelected = offer.decision === d;
                        const Icon = decisionConfig[d].icon;
                        return (
                          <button
                            key={d}
                            onClick={() => handleDecisionChange(offer, d)}
                            disabled={savingDecisionId === offer.id}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-50 ${isSelected ? `${decisionConfig[d].bg} ${decisionConfig[d].color}` : "bg-muted text-muted-foreground hover:bg-accent"}`}
                          >
                            <Icon className="size-3" aria-hidden="true" />
                            {decisionConfig[d].label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <AddOfferModal
            applications={availableApplications}
            onClose={() => setShowAddModal(false)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={`${deleteTarget.application.roleTitle} at ${deleteTarget.application.companyName}`}
          itemType="offer"
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
