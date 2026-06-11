"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { type LucideIcon, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  index?: number;
  /** If provided the card becomes a clickable link to this URL */
  href?: string;
}

const VARIANT_STYLES = {
  default:  { bg: "bg-card", icon: "bg-muted text-muted-foreground", accent: "" },
  success:  { bg: "bg-card", icon: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400", accent: "border-l-emerald-500" },
  warning:  { bg: "bg-card", icon: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",   accent: "border-l-amber-500" },
  danger:   { bg: "bg-card", icon: "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400",           accent: "border-l-red-500" },
  info:     { bg: "bg-card", icon: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",        accent: "border-l-blue-500" },
  purple:   { bg: "bg-card", icon: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400",accent: "border-l-violet-500" },
};

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = "default", index = 0, href }: KpiCardProps) {
  const styles = VARIANT_STYLES[variant];
  const hasAccent = variant !== "default";

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn(
        "rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm transition-all duration-150",
        styles.bg,
        hasAccent && "border-l-4",
        hasAccent && styles.accent,
        href
          ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 group"
          : "hover:shadow-md"
      )}
    >
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", styles.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5 leading-none">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
        {trend && (
          <div className={cn(
            "inline-flex items-center gap-1 text-xs font-medium mt-1.5 px-1.5 py-0.5 rounded",
            trend.value >= 0 ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50" :
                               "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50"
          )}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
          </div>
        )}
      </div>
      {href && (
        <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/80 shrink-0 self-center transition-colors" />
      )}
    </motion.div>
  );

  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}
