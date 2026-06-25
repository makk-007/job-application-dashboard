import { AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface ConfirmDeleteModalProps {
  itemName: string;
  itemType: string;
  /** Number of other records (e.g. interviews, offers) that reference this item. Omit or pass 0 to skip the warning. */
  linkedCount?: number;
  /** Plural label for the linked records, e.g. "interviews" or "applications". */
  linkedLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  itemName,
  itemType,
  linkedCount = 0,
  linkedLabel = "other records",
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <AlertTriangle
              className="size-6 text-destructive"
              aria-hidden="true"
            />
          </div>
          <AlertDialogTitle className="text-base">
            Delete {itemType}?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-center">
            <span className="font-medium text-foreground">{itemName}</span> will
            be removed. You can undo this for a few seconds after deleting.
          </AlertDialogDescription>
          {linkedCount > 0 && (
            <AlertDialogDescription className="text-sm text-center text-orange-600 dark:text-orange-400">
              This {itemType} is linked to {linkedCount}{" "}
              {linkedCount === 1 ? linkedLabel.replace(/s$/, "") : linkedLabel}.
              Deleting it will remove that link too.
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 h-9 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-9 bg-destructive text-destructive-foreground rounded-md text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Delete
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
