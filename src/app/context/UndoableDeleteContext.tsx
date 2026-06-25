import {
  createContext,
  useContext,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { toast } from "sonner";

interface DeleteWithUndoArgs<T> {
  id: string;
  label: string;
  description?: string;
  onRemoveLocally: () => void;
  onRestoreLocally: () => void;
  performDelete: () => Promise<T>;
  onDeleteFailed?: (error: Error) => void;
  duration?: number;
}

interface UndoableDeleteContextType {
  deleteWithUndo: <T>(args: DeleteWithUndoArgs<T>) => void;
}

const UndoableDeleteContext = createContext<UndoableDeleteContextType | null>(
  null,
);

/**
 * Provides a delete-with-undo mechanism instead of deleting immediately.
 * The item disappears from the UI right away (the caller is responsible
 * for the optimistic removal), an undo toast is shown for `duration` ms,
 * and the actual delete only runs against the backend once the toast
 * expires without the user clicking Undo.
 *
 * This is mounted above the router (in App.tsx) rather than inside a page
 * component, so a pending deferred delete survives the user navigating to
 * a different page or closing the detail drawer during the undo window.
 * A page-local timer would otherwise be discarded on unmount, silently
 * cancelling the real delete and leaving the record undeleted while the
 * toast told the user it was gone.
 *
 * This avoids a soft-delete schema change (no deleted_at column, no
 * filtering changes to any existing query) while still giving the user
 * a real chance to recover from an accidental delete.
 */
export function UndoableDeleteProvider({ children }: { children: ReactNode }) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const deleteWithUndo = useCallback(<T,>(args: DeleteWithUndoArgs<T>) => {
    const {
      id,
      label,
      description,
      onRemoveLocally,
      onRestoreLocally,
      performDelete,
      onDeleteFailed,
      duration = 6000,
    } = args;

    // If this id already has a pending deferred delete (e.g. rapid
    // double-click), let the existing timer run rather than stacking
    // a second one.
    if (timers.current.has(id)) return;

    // Remove from the UI immediately so the action feels instant.
    onRemoveLocally();

    const toastId = toast(label, {
      description,
      duration,
      action: {
        label: "Undo",
        onClick: () => {
          const timer = timers.current.get(id);
          if (timer) {
            clearTimeout(timer);
            timers.current.delete(id);
          }
          onRestoreLocally();
        },
      },
    });

    const timer = setTimeout(async () => {
      timers.current.delete(id);
      try {
        await performDelete();
      } catch (e: any) {
        // The optimistic removal already happened; surface the failure
        // and restore the item rather than leaving the UI in a state
        // that disagrees with the database.
        onRestoreLocally();
        onDeleteFailed?.(e);
        toast.dismiss(toastId);
      }
    }, duration);

    timers.current.set(id, timer);
  }, []);

  return (
    <UndoableDeleteContext.Provider value={{ deleteWithUndo }}>
      {children}
    </UndoableDeleteContext.Provider>
  );
}

export function useUndoableDelete() {
  const ctx = useContext(UndoableDeleteContext);
  if (!ctx) {
    throw new Error(
      "useUndoableDelete must be used within an UndoableDeleteProvider",
    );
  }
  return ctx;
}
