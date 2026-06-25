import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { JobSearchRound } from "../types";
import {
  getRounds,
  createRound as createRoundService,
  updateRound as updateRoundService,
  archiveRound as archiveRoundService,
  unarchiveRound as unarchiveRoundService,
  deleteRound as deleteRoundService,
  setActiveRound as setActiveRoundService,
} from "../../services/rounds";

interface RoundContextType {
  rounds: JobSearchRound[];
  activeRoundId: string | null;
  selectedRoundId: string | null;
  loading: boolean;
  error: string | null;
  // selectedRoundId is what the dashboard/list pages currently display.
  // Passing null selects "All Rounds".
  selectRound: (id: string | null) => void;
  setActiveRound: (id: string) => Promise<void>;
  createRound: (data: {
    name: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
  }) => Promise<JobSearchRound>;
  updateRound: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      startDate: string | null;
      endDate: string | null;
    }>,
  ) => Promise<void>;
  archiveRound: (id: string) => Promise<void>;
  unarchiveRound: (id: string) => Promise<void>;
  deleteRound: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RoundContext = createContext<RoundContextType | null>(null);

const SELECTED_ROUND_STORAGE_KEY = "jat:selectedRoundId";

export function RoundProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [rounds, setRounds] = useState<JobSearchRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(
    () => localStorage.getItem(SELECTED_ROUND_STORAGE_KEY) || null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeRoundId = rounds.find((r) => r.isActive)?.id ?? null;

  const refresh = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setRounds([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getRounds();
      setRounds(data);

      // If nothing is selected yet, or the previously selected round no
      // longer exists, default to the active round (or "All Rounds" if
      // there isn't one).
      setSelectedRoundId((prev) => {
        if (prev && data.some((r) => r.id === prev)) return prev;
        return data.find((r) => r.isActive)?.id ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load search rounds",
      );
    } finally {
      setLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persist the viewing selection across reloads
  useEffect(() => {
    if (selectedRoundId) {
      localStorage.setItem(SELECTED_ROUND_STORAGE_KEY, selectedRoundId);
    } else {
      localStorage.removeItem(SELECTED_ROUND_STORAGE_KEY);
    }
  }, [selectedRoundId]);

  const selectRound = (id: string | null) => {
    setSelectedRoundId(id);
  };

  const setActiveRound = async (id: string) => {
    await setActiveRoundService(id);
    await refresh();
  };

  const createRound = async (data: {
    name: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    isActive?: boolean;
  }) => {
    const created = await createRoundService(data);
    await refresh();
    return created;
  };

  const updateRound = async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      startDate: string | null;
      endDate: string | null;
    }>,
  ) => {
    await updateRoundService(id, data);
    await refresh();
  };

  const archiveRound = async (id: string) => {
    await archiveRoundService(id);
    await refresh();
  };

  const unarchiveRound = async (id: string) => {
    await unarchiveRoundService(id);
    await refresh();
  };

  const deleteRound = async (id: string) => {
    await deleteRoundService(id);
    if (selectedRoundId === id) setSelectedRoundId(null);
    await refresh();
  };

  return (
    <RoundContext.Provider
      value={{
        rounds,
        activeRoundId,
        selectedRoundId,
        loading,
        error,
        selectRound,
        setActiveRound,
        createRound,
        updateRound,
        archiveRound,
        unarchiveRound,
        deleteRound,
        refresh,
      }}
    >
      {children}
    </RoundContext.Provider>
  );
}

export function useRound() {
  const ctx = useContext(RoundContext);
  if (!ctx) throw new Error("useRound must be used within RoundProvider");
  return ctx;
}
