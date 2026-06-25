import { useState } from "react";
import { History, ChevronDown, Loader2, AlertCircle } from "lucide-react";
import { ApplicationStatus } from "../types";
import { statusConfig } from "../utils/statusConfig";

interface HistoryEntry {
  fromStatus: ApplicationStatus | null;
  toStatus: ApplicationStatus;
  changedAt: string;
}

interface StatusHistorySectionProps {
  fetchHistory: () => Promise<HistoryEntry[]>;
}

function formatChangedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Collapsible status-change timeline for an application's detail drawer.
 * History is fetched lazily on first expand rather than whenever the
 * drawer opens, since most drawer opens are for quick edits rather than
 * reviewing history.
 */
export function StatusHistorySection({
  fetchHistory,
}: StatusHistorySectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const handleToggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHistory();
        setEntries(data);
        setLoaded(true);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
      >
        <History
          className="size-3.5 text-muted-foreground"
          aria-hidden="true"
        />
        Status History
        <ChevronDown
          className={`size-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && (
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              Loading history...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              {error}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No status changes recorded yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry, i) => (
                <li
                  key={`${entry.changedAt}-${i}`}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <span className="text-xs text-muted-foreground tabular-nums shrink-0 w-36">
                    {formatChangedAt(entry.changedAt)}
                  </span>
                  <span className="text-muted-foreground">
                    {entry.fromStatus
                      ? statusConfig[entry.fromStatus].label
                      : "Created"}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">
                    {statusConfig[entry.toStatus].label}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
