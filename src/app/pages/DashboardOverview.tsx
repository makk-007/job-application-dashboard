import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Briefcase,
  Send,
  PhoneCall,
  Users,
  Trophy,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from "recharts";
import { KPICard } from "../components/KPICard";
import { StatusBadge } from "../components/StatusBadge";
import { Skeleton } from "../components/ui/skeleton";
import { getApplications } from "../../services/applications";
import { ApplicationWithCompany } from "../types";
import { useRound } from "../context/RoundContext";
import {
  statusConfig,
  PIPELINE_STATUSES,
  isStale,
} from "../utils/statusConfig";

export function DashboardOverview() {
  const { selectedRoundId, rounds, loading: roundsLoading } = useRound();
  const [applications, setApplications] = useState<ApplicationWithCompany[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setApplications(await getApplications(selectedRoundId ?? undefined));
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to load dashboard", { description: e.message });
    } finally {
      setLoading(false);
    }
  }, [selectedRoundId]);

  useEffect(() => {
    if (roundsLoading) return;
    load();
  }, [load, roundsLoading]);

  const selectedRoundName = useMemo(() => {
    if (!selectedRoundId) return "All Rounds";
    return rounds.find((r) => r.id === selectedRoundId)?.name ?? "All Rounds";
  }, [rounds, selectedRoundId]);

  const stats = useMemo(
    () => ({
      total: applications.length,
      lead: applications.filter((a) => a.status === "lead").length,
      applied: applications.filter((a) => a.status === "applied").length,
      screening: applications.filter((a) => a.status === "screening").length,
      interviewing: applications.filter((a) => a.status === "interviewing")
        .length,
      offer: applications.filter((a) => a.status === "offer").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
      withdrawn: applications.filter((a) => a.status === "withdrawn").length,
    }),
    [applications],
  );

  const responseRate = useMemo(() => {
    const appliedOrFurther = applications.filter((a) =>
      ["applied", "screening", "interviewing", "offer", "rejected"].includes(
        a.status,
      ),
    ).length;
    const movedPastApplied = applications.filter((a) =>
      ["screening", "interviewing", "offer"].includes(a.status),
    ).length;
    if (appliedOrFurther === 0) return null;
    return Math.round((movedPastApplied / appliedOrFurther) * 100);
  }, [applications]);

  const funnelData = PIPELINE_STATUSES.map((status) => ({
    status: statusConfig[status].label,
    count: applications.filter((a) => a.status === status).length,
    fill: `var(--status-${status}-strong)`,
  }));

  const staleApplications = useMemo(
    () =>
      applications
        .filter((a) => isStale(a.status, a.updatedAt))
        .sort(
          (a, b) =>
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
        )
        .slice(0, 5),
    [applications],
  );

  const recentActivity = useMemo(
    () =>
      [...applications]
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )
        .slice(0, 6),
    [applications],
  );

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="bg-card rounded-xl border p-12 text-center card-resting max-w-md">
          <AlertCircle className="size-8 text-destructive mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={load}
            className="px-4 h-9 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedRoundName}
            </p>
          </div>
          <button
            onClick={load}
            aria-label="Refresh dashboard"
            className="p-2 text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 space-y-6">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-xl border p-5 space-y-3 card-resting"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
                <Skeleton className="h-8 w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <KPICard
              title="Total Applications"
              value={stats.total}
              icon={Briefcase}
              color="text-foreground"
              bgColor="bg-muted"
              delay={0}
            />
            <KPICard
              title="Applied"
              value={stats.applied}
              icon={Send}
              color="text-[var(--status-applied-strong)]"
              bgColor="bg-[var(--status-applied-tint)]"
              delay={0.05}
            />
            <KPICard
              title="Screening"
              value={stats.screening}
              icon={PhoneCall}
              color="text-[var(--status-screening-strong)]"
              bgColor="bg-[var(--status-screening-tint)]"
              delay={0.1}
            />
            <KPICard
              title="Interviewing"
              value={stats.interviewing}
              icon={Users}
              color="text-[var(--status-interviewing-strong)]"
              bgColor="bg-[var(--status-interviewing-tint)]"
              delay={0.15}
            />
            <KPICard
              title="Offers"
              value={stats.offer}
              icon={Trophy}
              color="text-[var(--status-offer-strong)]"
              bgColor="bg-[var(--status-offer-tint)]"
              subtitle={
                responseRate !== null
                  ? `${responseRate}% response rate`
                  : undefined
              }
              delay={0.2}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card rounded-xl border card-resting p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Pipeline Funnel
            </h2>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : applications.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Briefcase
                  className="size-8 text-muted-foreground/30 mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm text-muted-foreground">
                  Add an application to see your pipeline
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ left: 16 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--border)"
                  />
                  <XAxis type="number" allowDecimals={false} hide />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={100}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={22}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-card rounded-xl border card-resting p-5">
            <h2 className="text-sm font-semibold text-foreground mb-4">
              Needs Attention
            </h2>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : staleApplications.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Nothing is stale right now. Nice work staying on top of
                  things.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {staleApplications.map((app) => (
                  <motion.li
                    key={app.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {app.roleTitle}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {app.company.name}
                      </p>
                    </div>
                    <StatusBadge status={app.status} size="sm" />
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="bg-card rounded-xl border card-resting p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Recent Activity
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase
                className="size-8 text-muted-foreground/30 mx-auto mb-2"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                Your recently updated applications will show up here.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentActivity.map((app) => (
                <li
                  key={app.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {app.roleTitle}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {app.company.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground tabular-nums hidden sm:inline">
                      {new Date(app.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <StatusBadge status={app.status} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
