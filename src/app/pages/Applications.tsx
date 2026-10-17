import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Search,
  Filter,
  RefreshCw,
  Briefcase,
  AlertCircle,
  Trash2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { ApplicationWithCompany, ApplicationStatus, WorkType } from "../types";
import {
  getApplications,
  deleteApplication,
} from "../../services/applications";
import { exportApplicationsCSV } from "../utils/dataExport";
import { useRound } from "../context/RoundContext";
import { useUndoableDelete } from "../context/UndoableDeleteContext";
import { useIsMounted } from "../hooks/useIsMounted";
import { StatusBadge } from "../components/StatusBadge";
import { BulkDeleteConfirmModal } from "../components/BulkDeleteConfirmModal";
import { Skeleton } from "../components/ui/skeleton";
import { inputCls, selectCls } from "../components/ui/input-classes";
import { statusConfig, ALL_STATUSES, isStale } from "../utils/statusConfig";
import {
  AddApplicationModal,
} from "../components/applications/AddApplicationModal";
import { formatSalary } from "../utils/formatters";
import { WORK_TYPES } from "../utils/applicationOptions";
import {
  ApplicationDetailDrawer,
} from "../components/applications/ApplicationDetailDrawer";

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
          (a.location ?? "").toLowerCase().includes(query) ||
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
                            {app.location && (
                              <div className="text-xs text-muted-foreground/70">
                                {app.location}
                              </div>
                            )}
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
                          {app.location ? ` · ${app.location}` : ""}
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
