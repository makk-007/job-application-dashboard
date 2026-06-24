import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface BulkDeleteConfirmModalProps {
  count: number;
  itemLabel: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmation for deleting multiple selected records at once. This is
 * deliberately a separate, immediate, no-undo flow rather than reusing the
 * single-item undo-toast pattern: a bulk action says upfront that it
 * cannot be undone, which is the appropriate safety net for a
 * multi-record operation, and is clearer than silently deferring N
 * deletes behind a single brief toast.
 */
export function BulkDeleteConfirmModal({
  count,
  itemLabel,
  saving,
  onConfirm,
  onCancel,
}: BulkDeleteConfirmModalProps) {
  const plural = count === 1 ? itemLabel.replace(/s$/, "") : itemLabel;

  return (
    <AlertDialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle
              className="size-6 text-destructive"
              aria-hidden="true"
            />
          </div>
          <AlertDialogTitle className="text-base">
            Delete {count} selected {plural}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-center">
            Are you sure you want to delete {count} selected {plural}? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 h-9 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 h-9 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            {saving && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            Delete {count}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
