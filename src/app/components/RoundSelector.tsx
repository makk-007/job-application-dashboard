import { Briefcase, ChevronDown, Check, Layers } from "lucide-react";
import { useRound } from "../context/RoundContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface RoundSelectorProps {
  /** Compact icon-only trigger for tight spaces like the mobile top bar. */
  compact?: boolean;
}

export function RoundSelector({ compact = false }: RoundSelectorProps) {
  const { rounds, selectedRoundId, loading, selectRound } = useRound();

  if (loading) {
    return (
      <div
        className={
          compact
            ? "h-8 w-8 rounded-lg bg-sidebar-accent/50 animate-pulse"
            : "h-10 rounded-lg bg-sidebar-accent/50 animate-pulse"
        }
      />
    );
  }

  if (rounds.length === 0) {
    return null;
  }

  const selectedRound = rounds.find((r) => r.id === selectedRoundId) ?? null;
  const label = selectedRound ? selectedRound.name : "All Rounds";

  if (compact) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`Current search round: ${label}`}
            title={label}
            className="p-2 text-sidebar-foreground hover:bg-sidebar-accent rounded-lg transition-colors"
          >
            <Briefcase className="size-4" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <RoundMenuItems
            rounds={rounds}
            selectedRoundId={selectedRoundId}
            onSelect={selectRound}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-sidebar-border bg-card text-sidebar-foreground hover:border-sidebar-primary/40 hover:bg-sidebar-accent/50 transition-colors card-resting">
          <Briefcase
            className="size-4 shrink-0 text-sidebar-primary"
            aria-hidden="true"
          />
          <span className="flex-1 text-left text-sm font-medium truncate">
            {label}
          </span>
          <ChevronDown
            className="size-3.5 shrink-0 opacity-60"
            aria-hidden="true"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <RoundMenuItems
          rounds={rounds}
          selectedRoundId={selectedRoundId}
          onSelect={selectRound}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RoundMenuItems({
  rounds,
  selectedRoundId,
  onSelect,
}: {
  rounds: ReturnType<typeof useRound>["rounds"];
  selectedRoundId: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <>
      <DropdownMenuLabel>Viewing Round</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {rounds.map((round) => (
        <DropdownMenuItem
          key={round.id}
          onClick={() => onSelect(round.id)}
          className="flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2 truncate">
            <span className="truncate">{round.name}</span>
            {round.isActive && (
              <span
                className="text-[10px] uppercase tracking-wide font-semibold shrink-0"
                style={{ color: "var(--status-offer-strong)" }}
              >
                Active
              </span>
            )}
          </span>
          {selectedRoundId === round.id && (
            <Check
              className="size-3.5 shrink-0 text-primary"
              aria-hidden="true"
            />
          )}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={() => onSelect(null)}
        className="flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          <Layers className="size-3.5 shrink-0" aria-hidden="true" />
          All Rounds
        </span>
        {selectedRoundId === null && (
          <Check
            className="size-3.5 shrink-0 text-primary"
            aria-hidden="true"
          />
        )}
      </DropdownMenuItem>
    </>
  );
}
