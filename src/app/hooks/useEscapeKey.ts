import { useEffect } from "react";

/**
 * Closes a hand-rolled modal or drawer when Escape is pressed. Radix-based
 * dialogs (AlertDialog, Dialog) already handle this internally; this hook
 * is for the custom motion.div overlays in this app that don't use Radix
 * and so don't get Escape-to-close for free.
 *
 * Pass `enabled = false` to temporarily disable (for example, while a
 * nested confirmation dialog is open and should take priority).
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape, enabled]);
}
