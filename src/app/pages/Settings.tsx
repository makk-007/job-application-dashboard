import { useState } from "react";
import {
  Briefcase,
  Plus,
  Check,
  Archive,
  ArchiveRestore,
  Trash2,
  X,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useRound } from "../context/RoundContext";
import { inputCls, textareaCls } from "../components/ui/input-classes";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";

function AddRoundModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description?: string;
    isActive: boolean;
  }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [makeActive, setMakeActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreate({ name: name.trim(), description, isActive: makeActive });
      toast.success("Search round created", { description: name.trim() });
      onClose();
    } catch (e: any) {
      setError(e.message);
      toast.error("Failed to create search round", { description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card rounded-xl border card-raised w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">
            New Search Round
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
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 2026 Spring Search"
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={textareaCls}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={makeActive}
              onChange={(e) => setMakeActive(e.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-ring cursor-pointer"
            />
            Make this the active round
          </label>
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
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const {
    rounds,
    createRound,
    setActiveRound,
    archiveRound,
    unarchiveRound,
    deleteRound,
  } = useRound();
  const [showAddRound, setShowAddRound] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const activeRounds = rounds.filter((r) => !r.isArchived);
  const archivedRounds = rounds.filter((r) => r.isArchived);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-4 sm:px-8 py-4 sm:py-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account and search rounds
        </p>
      </header>

      <div className="p-4 sm:p-8 max-w-3xl space-y-6">
        <div className="bg-card rounded-xl border card-resting p-5">
          <h2 className="text-sm font-semibold text-foreground mb-4">
            Account
          </h2>
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
        </div>

        <div className="bg-card rounded-xl border card-resting p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Job Search Rounds
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Group applications into distinct search efforts, e.g. by season
                or year
              </p>
            </div>
            <button
              onClick={() => setShowAddRound(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors shrink-0"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New Round
            </button>
          </div>

          {activeRounds.length === 0 && archivedRounds.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase
                className="size-8 text-muted-foreground/30 mx-auto mb-2"
                aria-hidden="true"
              />
              <p className="text-sm text-muted-foreground">
                You don't have any search rounds yet. Create one to start
                organizing your applications.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeRounds.map((round) => (
                <div
                  key={round.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {round.name}
                      </p>
                      {round.isActive && (
                        <span
                          className="text-[10px] uppercase tracking-wide font-semibold shrink-0"
                          style={{ color: "var(--status-offer-strong)" }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    {round.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {round.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!round.isActive && (
                      <button
                        onClick={() => setActiveRound(round.id)}
                        title="Set as active round"
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                      >
                        <Check className="size-4" aria-hidden="true" />
                      </button>
                    )}
                    <button
                      onClick={() => archiveRound(round.id)}
                      title="Archive round"
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                    >
                      <Archive className="size-4" aria-hidden="true" />
                    </button>
                    <button
                      onClick={() =>
                        setDeleteTarget({ id: round.id, name: round.name })
                      }
                      title="Delete round"
                      className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}

              {archivedRounds.length > 0 && (
                <>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pt-3 pb-1">
                    Archived
                  </p>
                  {archivedRounds.map((round) => (
                    <div
                      key={round.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/30 opacity-75"
                    >
                      <p className="text-sm font-medium text-foreground truncate">
                        {round.name}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => unarchiveRound(round.id)}
                          title="Unarchive round"
                          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                        >
                          <ArchiveRestore
                            className="size-4"
                            aria-hidden="true"
                          />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({ id: round.id, name: round.name })
                          }
                          title="Delete round"
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddRound && (
        <AddRoundModal
          onClose={() => setShowAddRound(false)}
          onCreate={createRound}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteModal
          itemName={deleteTarget.name}
          itemType="search round"
          linkedCount={0}
          onConfirm={async () => {
            try {
              await deleteRound(deleteTarget.id);
              toast.success("Search round deleted");
            } catch (e: any) {
              toast.error("Failed to delete search round", {
                description: e.message,
              });
            } finally {
              setDeleteTarget(null);
            }
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
