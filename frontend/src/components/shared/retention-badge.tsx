import { cn, RETENTION_STATUS_CONFIG } from "@/lib/utils";
import type { RetentionStatus } from "@/types";

const FALLBACK = { label: "Unknown", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50" };

export function RetentionBadge({ status }: { status: RetentionStatus }) {
  const config = RETENTION_STATUS_CONFIG[status] ?? FALLBACK;
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      config.bg, config.color
    )}>
      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
      {config.label}
    </span>
  );
}
