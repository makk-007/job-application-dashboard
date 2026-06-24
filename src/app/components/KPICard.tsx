import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  subtitle?: string;
  delay?: number;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  subtitle,
  delay = 0,
}: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-5 card-resting hover:card-raised transition-shadow duration-200"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className={`${bgColor} p-2 rounded-lg`}>
          <Icon className={`size-4 ${color}`} aria-hidden="true" />
        </div>
      </div>
      <div>
        <p className={`text-3xl font-semibold tabular-nums ${color}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </motion.div>
  );
}
