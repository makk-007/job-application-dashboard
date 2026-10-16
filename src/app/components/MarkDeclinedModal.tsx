import { ThumbsDown } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface MarkDeclinedModalProps {
  /** e.g. "Frontend Engineer at Acme" */
  applicationLabel: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Shown after an offer is marked as declined, asking whether to also move
 * the linked application to the Declined status so the Pipeline, Dashboard
 * and Applications list stay consistent with the offer decision.
 */
export function MarkDeclinedModal({
  applicationLabel,
  saving = false,
  onConfirm,
  onCancel,
}: MarkDeclinedModalProps) {
  return (
    <AlertDialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--status-declined-tint)] flex items-center justify-center mb-2">
            <ThumbsDown
              className="size-6 text-[var(--status-declined-strong)]"
              aria-hidden="true"
            />
          </div>
          <AlertDialogTitle className="text-base">
            Mark application as Declined?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-center">
            You declined the offer for{" "}
            <span className="font-medium text-foreground">
              {applicationLabel}
            </span>
            . Move the application to Declined too?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 h-9 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            Keep as Offer
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : "Mark as Declined"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
