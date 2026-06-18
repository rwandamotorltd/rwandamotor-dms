"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { followUpsApi, type FollowUpListItem } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  PhoneCall, PhoneOff, CalendarClock, Mail, MessageSquare,
  Clock, AlertTriangle, CheckCircle2, Search, ExternalLink,
} from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  WelcomeCall:         "Welcome Call",
  ServiceDueReminder:  "Service Due Reminder",
  SixMonthContact:     "6-Month Outreach",
  LostRecovery:        "Lost Recovery",
  ServiceDue15Days:    "Due in 15 Days",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Pending:            { label: "Pending",            color: "bg-amber-100 text-amber-700 border-amber-200" },
  InProgress:         { label: "In Progress",        color: "bg-blue-100 text-blue-700 border-blue-200" },
  CallbackScheduled:  { label: "Callback Scheduled", color: "bg-violet-100 text-violet-700 border-violet-200" },
  AppointmentBooked:  { label: "Appointment Booked", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  Unreachable:        { label: "Unreachable",        color: "bg-orange-100 text-orange-700 border-orange-200" },
  Declined:           { label: "Declined",           color: "bg-red-100 text-red-700 border-red-200" },
  Recovered:          { label: "Recovered",          color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Closed:             { label: "Closed",             color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  Low:      { label: "Low",      color: "text-slate-500" },
  Medium:   { label: "Medium",   color: "text-amber-500" },
  High:     { label: "High",     color: "text-orange-500" },
  Critical: { label: "Critical", color: "text-red-600 font-semibold" },
};

const OUTCOME_OPTIONS = [
  { value: "Reached",                 label: "Reached",                icon: PhoneCall },
  { value: "NoAnswer",                label: "No Answer",              icon: PhoneOff },
  { value: "LeftMessage",             label: "Left Message",           icon: MessageSquare },
  { value: "CallbackScheduled",       label: "Schedule Callback",      icon: CalendarClock },
  { value: "ServiceReminderEmailSent",label: "Service Reminder Email", icon: Mail },
  { value: "SatisfactionEmailSent",   label: "Satisfaction Email",     icon: Mail },
  { value: "AppointmentBooked",       label: "Appointment Booked",     icon: CheckCircle2 },
];

// ─── Quick Action Dialog ───────────────────────────────────────────────────────

function QuickActionDialog({
  followUp, open, onClose,
}: {
  followUp: FollowUpListItem; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState("Reached");
  const [notes, setNotes]     = useState("");
  const [nextDate, setNextDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      followUpsApi.logInteraction(followUp.id, {
        outcome,
        notes:           notes || null,
        nextContactDate: nextDate || null,
      }),
    onSuccess: () => {
      toast.success("Interaction logged");
      qc.invalidateQueries({ queryKey: ["follow-ups"] });
      onClose();
    },
    onError: () => toast.error("Failed to log interaction"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Interaction — {followUp.vehiclePlate}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Customer</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              {followUp.customerName} {followUp.customerPhone && `· ${followUp.customerPhone}`}
            </p>
          </div>
          <div>
            <Label>Outcome</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {OUTCOME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOutcome(value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    outcome === value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40 hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {outcome === "CallbackScheduled" && (
            <div>
              <Label>Callback Date</Label>
              <Input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Add notes about the interaction..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Interaction"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row ───────────────────────────────────────────────────────────────────────

function FollowUpRow({ item, onAction }: { item: FollowUpListItem; onAction: () => void }) {
  const router   = useRouter();
  const status   = STATUS_MAP[item.status]   ?? { label: item.status,   color: "" };
  const priority = PRIORITY_MAP[item.priority] ?? { label: item.priority, color: "" };
  const overdue  = isAfter(new Date(), parseISO(item.dueDate));

  return (
    <Card className={cn("mb-2 hover:shadow-md transition-shadow", overdue && item.status === "Pending" && "border-orange-200")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{item.vehiclePlate}</span>
              <span className="text-muted-foreground text-sm">{item.vehicleBrand} {item.vehicleModel} {item.vehicleYear}</span>
              <Badge className={cn("text-[10px] border", status.color)}>{status.label}</Badge>
              <span className={cn("text-xs", priority.color)}>{priority.label}</span>
              {overdue && (item.status === "Pending" || item.status === "InProgress") && (
                <span className="flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
              <span>{item.customerName}</span>
              {item.customerPhone && <span>{item.customerPhone}</span>}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due {format(parseISO(item.dueDate), "dd MMM yyyy")}
              </span>
              <span>{REASON_LABELS[item.reason] ?? item.reason}</span>
              {item.interactionCount > 0 && (
                <span>{item.interactionCount} contact{item.interactionCount > 1 ? "s" : ""}</span>
              )}
              {item.lastContactDate && (
                <span>Last: {format(parseISO(item.lastContactDate), "dd MMM")}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={onAction} className="text-xs h-8">
              <PhoneCall className="w-3.5 h-3.5 mr-1" />
              Log
            </Button>
            <Button size="sm" variant="ghost" onClick={() => router.push("/follow-ups/" + item.id)} className="h-8 w-8 p-0">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FollowUpsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch]   = useState("");
  const [reason, setReason]   = useState(searchParams.get("reason") ?? "");
  const [status, setStatus]   = useState("");
  const [actionTarget, setActionTarget] = useState<FollowUpListItem | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["follow-ups", reason, status],
    queryFn: () => followUpsApi.list({ reason: reason || undefined, pageSize: 100 }),
  });

  const filtered = data.filter(f =>
    !search ||
    f.vehiclePlate.toLowerCase().includes(search.toLowerCase()) ||
    f.customerName.toLowerCase().includes(search.toLowerCase()) ||
    (f.customerPhone ?? "").includes(search)
  ).filter(f => !status || f.status === status);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Follow-ups</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} follow-up{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Search plate, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={reason} onValueChange={(v) => setReason(v ?? "")}>
          <SelectTrigger className="w-48 h-9"><SelectValue placeholder="All types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All types</SelectItem>
            {Object.entries(REASON_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "")}>
          <SelectTrigger className="w-44 h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl mb-2" />)
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <PhoneCall className="w-10 h-10 mb-3 opacity-30" />
          <p>No follow-ups found</p>
        </div>
      ) : (
        filtered.map(item => (
          <FollowUpRow key={item.id} item={item} onAction={() => setActionTarget(item)} />
        ))
      )}

      {actionTarget && (
        <QuickActionDialog followUp={actionTarget} open={!!actionTarget} onClose={() => setActionTarget(null)} />
      )}
    </div>
  );
}
