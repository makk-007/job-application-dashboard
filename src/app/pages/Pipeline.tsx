import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Briefcase,
  AlertCircle,
  Building2,
  GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { ApplicationWithCompany, ApplicationStatus } from "../types";
import {
  getApplications,
  updateApplication,
} from "../../services/applications";
import { useRound } from "../context/RoundContext";
import { Skeleton } from "../components/ui/skeleton";
import { statusConfig, ALL_STATUSES, isStale } from "../utils/statusConfig";

function formatSalary(
  min: number | null,
  max: number | null,
  currency: string,
): string {
  if (min === null && max === null) return "Not specified";
  if (min !== null && max !== null) {
    return `${currency} ${min.toLocaleString()}-${max.toLocaleString()}`;
  }
  const value = min ?? max;
  return `${currency} ${value!.toLocaleString()}`;
}

interface CardProps {
  app: ApplicationWithCompany;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

function PipelineCard({ app, onDragStart, onDragEnd, isDragging }: CardProps) {
  const stale = isStale(app.status, app.updatedAt);

  return (
    <div
      draggable
      onDragStart={(e: React.DragEvent) => {
        e.dataTransfer.setData("text/plain", app.id);
        onDragStart(app.id);
      }}
      onDragEnd={onDragEnd}
      className="cursor-grab active:cursor-grabbing"
    >
      <motion.div
        layout
        layoutId={app.id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: isDragging ? 0.4 : 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15 }}
        className="bg-card border border-border rounded-lg p-3 card-resting hover:card-raised transition-shadow duration-150 group"
      >
        <div className="flex items-start gap-2">
          <GripVertical
            className="size-3.5 text-muted-foreground/40 mt-0.5 shrink-0 group-hover:text-muted-foreground/70 transition-colors"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">
              {app.roleTitle}
            </p>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground truncate">
              <Building2 className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{app.company.name}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatSalary(app.salaryMin, app.salaryMax, app.currency)}
              </span>
              {stale && (
                <span className="inline-flex items-center rounded-full font-medium whitespace-nowrap px-2 py-0.5 text-[10px] bg-destructive/10 text-destructive">
                  Stale
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function Pipeline() {
  const { selectedRoundId, loading: roundsLoading } = useRound();
  const [applications, setApplications] = useState<ApplicationWithCompany[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] =
    useState<ApplicationStatus | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApplications(await getApplications(selectedRoundId ?? undefined));
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to load pipeline", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    if (roundsLoading) return;
    load();
  }, [load, roundsLoading]);

  const columns = useMemo(() => {
    const map: Record<ApplicationStatus, ApplicationWithCompany[]> = {
      lead: [],
      applied: [],
      screening: [],
      interviewing: [],
      offer: [],
      rejected: [],
      withdrawn: [],
    };
    for (const app of applications) {
      map[app.status].push(app);
    }
    for (const status of ALL_STATUSES) {
      map[status].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }
    return map;
  }, [applications]);

  const handleDrop = async (status: ApplicationStatus) => {
    setDragOverStatus(null);
    const id = draggingId;
    setDraggingId(null);
    if (!id) return;

    const app = applications.find((a) => a.id === id);
    if (!app || app.status === status) return;

    const previousStatus = app.status;
    setApplications((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
    setUpdatingId(id);
    try {
      await updateApplication(id, { status });
      toast.success("Status updated", {
        description: `${app.roleTitle} moved to ${statusConfig[status].label}`,
      });
    } catch (e: any) {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: previousStatus } : a)),
      );
      toast.error("Failed to update status", { description: e.message });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Drag applications between stages to update their status
            </p>
          </div>
          <button
            onClick={load}
            aria-label="Refresh pipeline"
            className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors shrink-0"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-x-auto p-4 sm:p-8">
        {error ? (
          <div className="bg-card rounded-xl border p-12 text-center card-resting max-w-md mx-auto">
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
          <div className="flex gap-4 min-w-max h-full">
            {ALL_STATUSES.map((status) => {
              const config = statusConfig[status];
              const apps = columns[status];
              const isOver = dragOverStatus === status;

              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStatus(status);
                  }}
                  onDragLeave={() =>
                    setDragOverStatus((prev) => (prev === status ? null : prev))
                  }
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDrop(status);
                  }}
                  className={`w-72 shrink-0 rounded-xl border flex flex-col transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
                >
                  <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex size-2 rounded-full ${config.bgColor}`}
                        style={{
                          backgroundColor: `var(--status-${status}-strong)`,
                        }}
                        aria-hidden="true"
                      />
                      <h2 className="text-sm font-semibold text-foreground">
                        {config.label}
                      </h2>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums bg-muted px-1.5 py-0.5 rounded-md">
                      {apps.length}
                    </span>
                  </div>

                  <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px] max-h-[calc(100vh-220px)]">
                    {loading ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full rounded-lg" />
                      ))
                    ) : apps.length === 0 ? (
                      <div className="h-20 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground/60">
                          No applications
                        </p>
                      </div>
                    ) : (
                      <AnimatePresence initial={false}>
                        {apps.map((app) => (
                          <PipelineCard
                            key={app.id}
                            app={app}
                            isDragging={draggingId === app.id}
                            onDragStart={setDraggingId}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverStatus(null);
                            }}
                          />
                        ))}
                      </AnimatePresence>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && !error && applications.length === 0 && (
          <div className="text-center py-16">
            <Briefcase
              className="size-10 text-muted-foreground/30 mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-sm font-medium text-foreground mb-1">
              No applications yet
            </p>
            <p className="text-xs text-muted-foreground">
              Add an application to see it on the pipeline board.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
