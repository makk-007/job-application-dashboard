import { Toaster as Sonner, ToasterProps } from "sonner";
import { useTheme } from "../../context/ThemeContext";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          // All toasts share the card style; only the icon carries the type.
          success: "[&_[data-icon]]:text-[var(--status-offer-strong)]",
          error:
            "[&_[data-icon]]:text-destructive dark:[&_[data-icon]]:text-destructive-foreground",
          warning: "[&_[data-icon]]:text-[var(--status-screening-strong)]",
          info: "[&_[data-icon]]:text-[var(--status-applied-strong)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
