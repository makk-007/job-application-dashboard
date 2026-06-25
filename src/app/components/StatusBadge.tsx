import { ApplicationStatus } from "../types";
import { statusConfig } from "../utils/statusConfig";

interface StatusBadgeProps {
  status: ApplicationStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function StatusBadge({
  status,
  size = "md",
  showIcon = false,
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClass =
    size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs";
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap
        ${sizeClass}
        ${config.color} ${config.bgColor}`}
    >
      {showIcon && <Icon className="size-3 shrink-0" aria-hidden="true" />}
      {config.label}
    </span>
  );
}
