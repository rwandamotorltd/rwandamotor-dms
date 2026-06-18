"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appointmentsApi, type AppointmentDto } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock,
  CheckCircle2, XCircle, AlertTriangle, User,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek,
  isSameMonth, isSameDay, isToday, addMonths, subMonths, parseISO, addWeeks, subWeeks,
  startOfDay, endOfDay, addDays, subDays,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

type ViewMode = "month" | "week" | "day";

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  Scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200",     dot: "bg-blue-500" },
  Confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700 border-indigo-200", dot: "bg-indigo-500" },
  Completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200",         dot: "bg-red-400" },
  NoShow:    { label: "No-show",   color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-400" },
};

const PENDING_STATUSES = new Set(["Scheduled", "Confirmed"]);

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({ appt, compact = false }: { appt: AppointmentDto; compact?: boolean }) {
  const qc      = useQueryClient();
  const status  = STATUS_MAP[appt.status] ?? { label: appt.status, color: "", dot: "bg-gray-400" };
  const isPending = PENDING_STATUSES.has(appt.status);

  const confirmMut = useMutation({
    mutationFn: () => appointmentsApi.confirm(appt.id),
    onSuccess: () => { toast.success("Confirmed"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });
  const completeMut = useMutation({
    mutationFn: () => appointmentsApi.complete(appt.id),
    onSuccess: () => { toast.success("Marked complete"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });
  const cancelMut = useMutation({
    mutationFn: () => appointmentsApi.cancel(appt.id),
    onSuccess: () => { toast.success("Cancelled"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });
  const noShowMut = useMutation({
    mutationFn: () => appointmentsApi.noShow(appt.id),
    onSuccess: () => { toast.success("Marked no-show"); qc.invalidateQueries({ queryKey: ["appointments"] }); },
  });

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] truncate", status.color)}>
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", status.dot)} />
        <span className="truncate font-medium">{format(parseISO(appt.appointmentDate), "HH:mm")} {appt.vehiclePlate}</span>
      </div>
    );
  }

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{appt.vehiclePlate}</span>
              <Badge className={cn("border text-[10px]", status.color)}>{status.label}</Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(parseISO(appt.appointmentDate), "HH:mm")} · {appt.durationMinutes} min
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {appt.customerName}
              </span>
              <span>{appt.serviceType}</span>
              {appt.technicianName && <span>{appt.technicianName}</span>}
            </div>
            {appt.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{appt.notes}"</p>}
          </div>
          {isPending && (
            <div className="flex gap-1.5 shrink-0 flex-wrap">
              {appt.status === "Scheduled" && (
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => confirmMut.mutate()}>
                  <CheckCircle2 className="w-3 h-3 mr-1" />Confirm
                </Button>
              )}
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => completeMut.mutate()}>
                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />Complete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-orange-600" onClick={() => noShowMut.mutate()}>
                <AlertTriangle className="w-3 h-3 mr-1" />No-show
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => cancelMut.mutate()}>
                <XCircle className="w-3 h-3 mr-1" />Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Month Calendar ────────────────────────────────────────────────────────────

function MonthView({ date, appointments }: { date: Date; appointments: AppointmentDto[] }) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end   = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days  = eachDayOfInterval({ start, end });

  const byDay = new Map<string, AppointmentDto[]>();
  for (const a of appointments) {
    const key = format(parseISO(a.appointmentDate), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  return (
    <div>
      <div className="grid grid-cols-7 mb-1">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
        {days.map(day => {
          const key   = format(day, "yyyy-MM-dd");
          const appts = byDay.get(key) ?? [];
          return (
            <div key={key} className={cn("bg-background min-h-[80px] p-1.5", !isSameMonth(day, date) && "opacity-40", isToday(day) && "bg-primary/5")}>
              <span className={cn("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1", isToday(day) && "bg-primary text-primary-foreground")}>
                {format(day, "d")}
              </span>
              <div className="space-y-0.5">
                {appts.slice(0, 3).map(a => <AppointmentCard key={a.id} appt={a} compact />)}
                {appts.length > 3 && <div className="text-[10px] text-muted-foreground px-1">+{appts.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Week View ─────────────────────────────────────────────────────────────────

function WeekView({ date, appointments }: { date: Date; appointments: AppointmentDto[] }) {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const days  = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const byDay = new Map<string, AppointmentDto[]>();
  for (const a of appointments) {
    const key = format(parseISO(a.appointmentDate), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map(day => {
        const key   = format(day, "yyyy-MM-dd");
        const appts = byDay.get(key) ?? [];
        return (
          <div key={key} className="min-h-[200px]">
            <div className={cn("text-center text-xs font-medium pb-2 mb-2 border-b", isToday(day) && "text-primary font-bold")}>
              <div>{format(day, "EEE")}</div>
              <div className="text-base">{format(day, "d")}</div>
            </div>
            <div className="space-y-1">
              {appts.map(a => <AppointmentCard key={a.id} appt={a} compact />)}
              {appts.length === 0 && <div className="text-[10px] text-muted-foreground text-center pt-4">—</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Day View ──────────────────────────────────────────────────────────────────

function DayView({ date, appointments }: { date: Date; appointments: AppointmentDto[] }) {
  const dayAppts = appointments
    .filter(a => isSameDay(parseISO(a.appointmentDate), date))
    .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">{format(date, "EEEE, d MMMM yyyy")}</h3>
      {dayAppts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
          <p className="text-sm">No appointments on this day</p>
        </div>
      ) : (
        dayAppts.map(a => <AppointmentCard key={a.id} appt={a} />)
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const [view, setView]       = useState<ViewMode>("month");
  const [current, setCurrent] = useState(new Date());

  const rangeFrom = view === "month"
    ? format(startOfWeek(startOfMonth(current), { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00")
    : view === "week"
    ? format(startOfWeek(current, { weekStartsOn: 1 }), "yyyy-MM-dd'T'00:00:00")
    : format(startOfDay(current), "yyyy-MM-dd'T'00:00:00");

  const rangeTo = view === "month"
    ? format(endOfWeek(endOfMonth(current), { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59")
    : view === "week"
    ? format(endOfWeek(current, { weekStartsOn: 1 }), "yyyy-MM-dd'T'23:59:59")
    : format(endOfDay(current), "yyyy-MM-dd'T'23:59:59");

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", rangeFrom, rangeTo],
    queryFn:  () => appointmentsApi.list({ from: rangeFrom, to: rangeTo }),
  });

  function navigate(dir: -1 | 1) {
    if (view === "month")      setCurrent(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
    else if (view === "week")  setCurrent(prev => dir === 1 ? addWeeks(prev, 1)  : subWeeks(prev, 1));
    else                       setCurrent(prev => dir === 1 ? addDays(prev, 1)   : subDays(prev, 1));
  }

  const titleLabel = view === "month"
    ? format(current, "MMMM yyyy")
    : view === "week"
    ? `${format(startOfWeek(current, { weekStartsOn: 1 }), "d MMM")} – ${format(endOfWeek(current, { weekStartsOn: 1 }), "d MMM yyyy")}`
    : format(current, "EEEE, d MMMM yyyy");

  const pendingCount = appointments.filter(a => PENDING_STATUSES.has(a.status)).length;

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          {pendingCount > 0 && <p className="text-sm text-muted-foreground">{pendingCount} pending</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {(["month", "week", "day"] as ViewMode[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-3 text-sm font-medium min-w-[160px] text-center" onClick={() => setCurrent(new Date())}>
              {titleLabel}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <>
          {view === "month" && <MonthView date={current} appointments={appointments} />}
          {view === "week"  && <WeekView  date={current} appointments={appointments} />}
          {view === "day"   && <DayView   date={current} appointments={appointments} />}
        </>
      )}
    </div>
  );
}
