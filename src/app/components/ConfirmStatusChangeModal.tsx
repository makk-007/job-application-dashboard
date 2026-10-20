import { ReactNode } from "react";
import { ThumbsDown, Trophy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

/** Which status the modal proposes, used only for the icon and colours. */
type Tone = "declined" | "offer";

const TONES = {
  declined: {
    Icon: ThumbsDown,
    bg: "bg-[var(--status-declined-tint)]",
    fg: "text-[var(--status-declined-strong)]",
  },
  offer: {
    Icon: Trophy,
    bg: "bg-[var(--status-offer-tint)]",
    fg: "text-[var(--status-offer-strong)]",
  },
} as const;

interface ConfirmStatusChangeModalProps {
  tone: Tone;
  title: string;
  /** Description text; keep it to inline content. */
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  saving?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Asks whether to move an application to a different status after an offer
 * decision changed, so the Pipeline, Dashboard and Applications list stay
 * consistent with the offer decision.
 */
export function ConfirmStatusChangeModal({
  tone,
  title,
  children,
  confirmLabel,
  cancelLabel,
  saving = false,
  onConfirm,
  onCancel,
}: ConfirmStatusChangeModalProps) {
  const { Icon, bg, fg } = TONES[tone];
  return (
    <AlertDialog open onOpenChange={(open) => !open && !saving && onCancel()}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader className="items-center text-center sm:text-center">
          <div
            className={`w-12 h-12 rounded-full ${bg} flex items-center justify-center mb-2`}
          >
            <Icon className={`size-6 ${fg}`} aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-base">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-center">
            {children}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-row gap-3 mt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 h-9 border border-border rounded-md text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 h-9 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving…" : confirmLabel}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
