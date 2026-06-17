"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  History, Search, Filter, ChevronLeft, ChevronRight,
  UserCircle2, PlusCircle, Pencil, Trash2, LogIn, FileDown
} from "lucide-react";
import { activityApi, adminApi, type ActivityLogEntry } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────────────────

const ENTITY_LABELS: Record<string, string> = {
  Vehicle: "Vehicle",
  Customer: "Customer",
  JobCard: "Job Card",
  ServiceRecord: "Service Record",
  ImportLog: "Import",
  FollowUp: "Follow-up",
  PermissionGroup: "Permission Group",
  ServicePolicy: "Service Policy",
  Technician: "Technician",
  WorkshopBay: "Workshop Bay",
  Session: "Session",
};

const ENTITY_TYPES = Object.keys(ENTITY_LABELS);

const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  Created: { label: "Created", icon: PlusCircle, color: "text-emerald-600 dark:text-emerald-400" },
  Updated: { label: "Updated", icon: Pencil,    color: "text-blue-600 dark:text-blue-400" },
  Deleted: { label: "Deleted", icon: Trash2,    color: "text-red-600 dark:text-red-400" },
  Login:   { label: "Login",   icon: LogIn,     color: "text-violet-600 dark:text-violet-400" },
};

const ENTITY_LINK: Record<string, (id: string) => string> = {
  Vehicle:       id => `/vehicles/${id}`,
  Customer:      id => `/customers/${id}`,
  JobCard:       id => `/job-cards/${id}`,
  ServiceRecord: id => `/service-records/${id}`,
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { label: action, icon: FileDown, color: "text-muted-foreground" };
  const Icon = meta.icon;
  const bg: Record<string, string> = {
    Created: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
    Updated: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
    Deleted: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    Login:   "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
  };
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium",
      bg[action] ?? "bg-muted border-border"
    )}>
      <Icon className={cn("w-3 h-3", meta.color)} />
      <span className={meta.color}>{meta.label}</span>
    </span>
  );
}

function UserAvatar({ name, email }: { name: string; email: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  return (
    <Avatar className="w-8 h-8 shrink-0">
      <AvatarFallback className="text-xs gradient-primary text-white" title={email}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const date = parseISO(entry.occurredAt);
  const entityLabel = ENTITY_LABELS[entry.entityType] ?? entry.entityType;
  const href = entry.entityId && ENTITY_LINK[entry.entityType]
    ? ENTITY_LINK[entry.entityType](entry.entityId)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
    >
      <UserAvatar name={entry.userName} email={entry.userEmail} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{entry.userName}</span>
          <ActionBadge action={entry.action} />
          <span className="text-sm text-muted-foreground">
            {entityLabel}
            {entry.entityLabel && (
              <>
                {" "}
                {href ? (
                  <a href={href} className="font-mono text-primary hover:underline underline-offset-2">
                    {entry.entityLabel}
                  </a>
                ) : (
                  <span className="font-mono">{entry.entityLabel}</span>
                )}
              </>
            )}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{entry.userEmail}</p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground" title={format(date, "dd MMM yyyy HH:mm:ss")}>
          {formatDistanceToNow(date, { addSuffix: true })}
        </p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {format(date, "dd MMM, HH:mm")}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [userFilter, setUserFilter]         = useState("");
  const [entityTypeFilter, setEntityType]   = useState("all");
  const [actionFilter, setActionFilter]     = useState("all");
  const [dateFrom, setDateFrom]             = useState("");
  const [dateTo, setDateTo]                 = useState("");
  const [page, setPage]                     = useState(1);

  const params = useMemo(() => ({
    userId:     userFilter || undefined,
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action:     actionFilter     !== "all" ? actionFilter     : undefined,
    dateFrom:   dateFrom || undefined,
    dateTo:     dateTo   || undefined,
    pageNumber: page,
    pageSize:   50,
  }), [userFilter, entityTypeFilter, actionFilter, dateFrom, dateTo, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", params],
    queryFn: () => activityApi.list(params),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: () => adminApi.getUsers(),
    staleTime: 60_000,
  });

  const users = usersData ?? [];

  function resetFilters() {
    setUserFilter(""); setEntityType("all"); setActionFilter("all");
    setDateFrom(""); setDateTo(""); setPage(1);
  }

  const hasFilters = userFilter || entityTypeFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Activity Log</h1>
            <p className="text-sm text-muted-foreground">
              All user-initiated changes — who did what and when
            </p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-wrap gap-3 items-center"
      >
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Filter by user email or name..."
            className="pl-9"
            value={userFilter}
            onChange={e => { setUserFilter(e.target.value); setPage(1); }}
          />
        </div>

        <Select value={entityTypeFilter} onValueChange={v => { setEntityType(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entity types</SelectItem>
            {ENTITY_TYPES.map(t => (
              <SelectItem key={t} value={t}>{ENTITY_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={v => { setActionFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {Object.keys(ACTION_META).map(a => (
              <SelectItem key={a} value={a}>{ACTION_META[a].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            className="w-36 text-sm"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          />
          <span className="text-muted-foreground text-sm">→</span>
          <Input
            type="date"
            className="w-36 text-sm"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setPage(1); }}
          />
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1.5 text-muted-foreground">
            <Filter className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </motion.div>

      {/* Results card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Count bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <p className="text-sm text-muted-foreground">
            {isLoading ? (
              <Skeleton className="h-4 w-32 inline-block" />
            ) : (
              <>
                <span className="font-medium text-foreground">{data?.totalCount ?? 0}</span> events
                {data && data.totalPages > 1 && (
                  <> · page <span className="font-medium text-foreground">{page}</span> of {data.totalPages}</>
                )}
              </>
            )}
          </p>
          <div className="flex items-center gap-1">
            <UserCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{users.length} users tracked</span>
          </div>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
            <History className="w-12 h-12 opacity-20" />
            <p className="text-sm">No activity records found</p>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters}>Clear filters</Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.items.map(entry => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              variant="outline" size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
