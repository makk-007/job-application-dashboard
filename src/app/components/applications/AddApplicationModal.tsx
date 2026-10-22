import { useState } from "react";
import { motion } from "motion/react";
import { AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ApplicationStatus, ApplicationSource, WorkType } from "../../types";
import { createApplication } from "../../../services/applications";
import { findOrCreateCompanyByName } from "../../../services/companies";
import { useCurrencies } from "../../context/CurrencyContext";
import { inputCls, selectCls, textareaCls } from "../ui/input-classes";
import { statusConfig, ALL_STATUSES } from "../../utils/statusConfig";
import { SOURCES, WORK_TYPES } from "../../utils/applicationOptions";
import { getErrorMessage } from "../../utils/errorMessage";

export function AddApplicationModal({
  activeRoundId,
  onClose,
  onSaved,
}: {
  activeRoundId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { currencies } = useCurrencies();
  const [form, setForm] = useState({
    companyName: "",
    roleTitle: "",
    jobPostUrl: "",
    location: "",
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
        location: form.location.trim(),
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
    } catch (e) {
      setError(getErrorMessage(e));
      toast.error("Failed to add application", {
        description: getErrorMessage(e),
      });
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
                Location
              </label>
              <input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                className={inputCls}
                placeholder="e.g. Austin, TX"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                {currencies.map((c) => (
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
