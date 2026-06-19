"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  appointmentsApi, vehiclesApi, techniciansApi,
  type AppointmentDto, type BookAppointmentPayload, type TechnicianItem,
} from "@/lib/api";
import type { VehicleListItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, Wrench,
  CheckCircle2, XCircle, AlertTriangle, CalendarDays,
} from "lucide-react";
import {
  format, startOfWeek, endOfWeek, addWeeks, subWeeks,
  isToday, parseISO, addDays,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  Scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  Completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  NoShow:    { label: "No-show",   color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const PENDING = new Set(["Scheduled", "Confirmed"]);

const SERVICE_TYPES = [
  { value: "RoutineMaintenance",  label: "Routine Maintenance" },
  { value: "OilChange",           label: "Oil Change" },
  { value: "TireService",         label: "Tyre Service" },
  { value: "BrakeService",        label: "Brake Service" },
  { value: "DiagnosticsRepair",   label: "Diagnostics & Repair" },
  { value: "BodyworkPainting",    label: "Bodywork & Painting" },
  { value: "PDI",                 label: "Pre-Delivery Inspection" },
  { value: "Other",               label: "Other" },
];

const DURATIONS = [15, 30, 45, 60, 90, 120];

// ─── New Appointment Dialog ────────────────────────────────────────────────────

function NewAppointmentDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [plate,       setPlate]       = useState("");
  const [vehicleId,   setVehicleId]   = useState("");
  const [customerId,  setCustomerId]  = useState("");
  const [customerName,setCustomerName]= useState("");
  const [date,        setDate]        = useState(format(new Date(), "yyyy-MM-dd"));
  const [time,        setTime]        = useState("09:00");
  const [serviceType, setServiceType] = useState("RoutineMaintenance");
  const [duration,    setDuration]    = useState(60);
  const [technicianId,setTechnicianId]= useState("");
  const [notes,       setNotes]       = useState("");

  const { data: vehicleResult } = useQuery({
    queryKey: ["vehicle-search", plate],
    queryFn: () => vehiclesApi.list({ search: plate, pageSize: 8 }),
    enabled: plate.length >= 2,
  });
  const vehicles = vehicleResult?.items ?? [];

  const { data: techs = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => techniciansApi.list(),
  });

  const mutation = useMutation({
    mutationFn: (payload: BookAppointmentPayload) => appointmentsApi.book(payload),
    onSuccess: () => {
      toast.success("Appointment booked");
      qc.invalidateQueries({ queryKey: ["appointments"] });
      onClose();
      reset();
    },
    onError: () => toast.error("Failed to book appointment"),
  });

  function reset() {
    setPlate(""); setVehicleId(""); setCustomerId(""); setCustomerName("");
    setDate(format(new Date(), "yyyy-MM-dd")); setTime("09:00");
    setServiceType("RoutineMaintenance"); setDuration(60);
    setTechnicianId(""); setNotes("");
  }

  function selectVehicle(v: VehicleListItem) {
    setPlate(v.plateNumber ?? v.vin);
    setVehicleId(v.id);
    setCustomerId(v.customerId ?? "");
    setCustomerName(v.customerName ?? "");
  }

  function submit() {
    if (!vehicleId || !customerId) { toast.error("Select a vehicle first"); return; }
    mutation.mutate({
      vehicleId, customerId,
      appointmentDate: `${date}T${time}:00`,
      durationMinutes: duration,
      serviceType,
      technicianId: technicianId || null,
      notes: notes || null,
    });
  }

  const showDropdown = plate.length >= 2 && vehicles.length > 0 && !vehicleId;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) { onClose(); reset(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Appointment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          {/* Vehicle search */}
          <div>
            <Label>Vehicle Plate</Label>
            <div className="relative mt-1">
              <Input
                placeholder="Type plate e.g. RAB 123A"
                value={plate}
                onChange={e => { setPlate(e.target.value); setVehicleId(""); setCustomerId(""); setCustomerName(""); }}
                className="uppercase"
              />
              {showDropdown && (
                <div className="absolute z-50 top-full mt-1 w-full rounded-lg border bg-popover shadow-md overflow-hidden">
                  {vehicles.map((v) => (
                    <button
                      key={v.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
                      onClick={() => selectVehicle(v)}
                    >
                      <span className="font-medium">{v.plateNumber ?? v.vin}</span>
                      <span className="text-muted-foreground">{v.brandName} {v.modelName} {v.year}</span>
                      {v.customerName && <span className="ml-auto text-xs text-muted-foreground">{v.customerName}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {vehicleId && (
              <p className="text-xs text-emerald-600 mt-1">
                {plate} {customerName && `· ${customerName}`}
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Time</Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} className="mt-1" />
            </div>
          </div>

          {/* Service type + Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={v => setServiceType(v ?? "RoutineMaintenance")}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration</Label>
              <Select value={String(duration)} onValueChange={v => setDuration(v ? Number(v) : 60)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} min</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Technician */}
          {techs.length > 0 && (
            <div>
              <Label>Technician (optional)</Label>
              <Select value={technicianId} onValueChange={v => setTechnicianId(v ?? "")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Any available" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any available</SelectItem>
                  {techs.map((t: TechnicianItem) => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Customer concerns, special instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" onClick={() => { onClose(); reset(); }}>Cancel</Button>
            <Button onClick={submit} disabled={mutation.isPending || !vehicleId}>
              {mutation.isPending ? "Booking…" : "Book Appointment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Appointment Row ───────────────────────────────────────────────────────────

function ApptRow({ appt }: { appt: AppointmentDto }) {
  const qc     = useQueryClient();
  const status = STATUS_MAP[appt.status] ?? { label: appt.status, color: "" };
  const pending = PENDING.has(appt.status);

  const confirmMut  = useMutation({ mutationFn: () => appointmentsApi.confirm(appt.id),  onSuccess: () => { toast.success("Confirmed");     qc.invalidateQueries({ queryKey: ["appointments"] }); } });
  const completeMut = useMutation({ mutationFn: () => appointmentsApi.complete(appt.id), onSuccess: () => { toast.success("Completed");     qc.invalidateQueries({ queryKey: ["appointments"] }); } });
  const noShowMut   = useMutation({ mutationFn: () => appointmentsApi.noShow(appt.id),   onSuccess: () => { toast.success("Marked no-show"); qc.invalidateQueries({ queryKey: ["appointments"] }); } });
  const cancelMut   = useMutation({ mutationFn: () => appointmentsApi.cancel(appt.id),   onSuccess: () => { toast.success("Cancelled");     qc.invalidateQueries({ queryKey: ["appointments"] }); } });

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">
        {format(parseISO(appt.appointmentDate), "HH:mm")}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{appt.vehiclePlate}</span>
          <Badge className={cn("text-[10px] border px-1.5 py-0", status.color)}>{status.label}</Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{appt.customerName}</span>
          <span className="flex items-center gap-1"><Wrench className="w-3 h-3" />{appt.serviceType}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{appt.durationMinutes}m</span>
          {appt.technicianName && <span>{appt.technicianName}</span>}
        </div>
        {appt.notes && <p className="text-xs text-muted-foreground italic mt-0.5">&quot;{appt.notes}&quot;</p>}
      </div>
      {pending && (
        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {appt.status === "Scheduled" && (
            <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => confirmMut.mutate()} disabled={confirmMut.isPending}>
              <CheckCircle2 className="w-3 h-3 mr-1 text-indigo-500" />Confirm
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => completeMut.mutate()} disabled={completeMut.isPending}>
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" />Done
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-orange-500" onClick={() => noShowMut.mutate()} disabled={noShowMut.isPending} title="No-show">
            <AlertTriangle className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => cancelMut.mutate()} disabled={cancelMut.isPending} title="Cancel">
            <XCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Day Group ─────────────────────────────────────────────────────────────────

function DayGroup({ day, appointments }: { day: Date; appointments: AppointmentDto[] }) {
  const sorted = [...appointments].sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate));
  const today  = isToday(day);

  return (
    <div>
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md mb-0.5",
        today ? "text-primary bg-primary/8" : "text-muted-foreground"
      )}>
        <span>{format(day, "EEE d")}</span>
        {today && <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[9px] normal-case tracking-normal font-medium">Today</span>}
        {sorted.length > 0 && <span className="ml-auto font-normal normal-case">{sorted.length} appt{sorted.length > 1 ? "s" : ""}</span>}
      </div>
      {sorted.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground/50 italic">No appointments</div>
      ) : (
        <div className="border rounded-lg overflow-hidden divide-y divide-border">
          {sorted.map(a => <ApptRow key={a.id} appt={a} />)}
        </div>
      )}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { hasPermission } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showNew, setShowNew]     = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days    = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", format(weekStart, "yyyy-MM-dd"), format(weekEnd, "yyyy-MM-dd")],
    queryFn: () => appointmentsApi.list({
      from: format(weekStart, "yyyy-MM-dd'T'00:00:00"),
      to:   format(weekEnd,   "yyyy-MM-dd'T'23:59:59"),
    }),
  });

  const filtered = statusFilter
    ? appointments.filter(a => a.status === statusFilter)
    : appointments;

  const byDay = new Map<string, AppointmentDto[]>();
  for (const a of filtered) {
    const key = format(parseISO(a.appointmentDate), "yyyy-MM-dd");
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  const pendingCount = appointments.filter(a => PENDING.has(a.status)).length;

  if (!hasPermission("appointments.view") && !hasPermission("appointments.manage")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <AlertTriangle className="w-10 h-10 text-muted-foreground" />
        <p className="font-medium text-muted-foreground">Access restricted</p>
        <p className="text-sm text-muted-foreground">You do not have permission to view appointments.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold">Appointments</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {pendingCount > 0 ? `${pendingCount} pending action` : "All up to date"}
          </p>
        </div>
        <Button size="sm" onClick={() => setShowNew(true)} className="h-9">
          <Plus className="w-4 h-4 mr-1.5" />New Appointment
        </Button>
      </div>

      {/* Week nav + filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 border rounded-lg overflow-hidden">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setWeekStart(prev => subWeeks(prev, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            className="px-3 text-sm font-medium whitespace-nowrap"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          >
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>
          Today
        </Button>
        <div className="ml-auto">
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? "")}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              {Object.entries(STATUS_MAP).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Agenda */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {days.map(day => (
            <DayGroup
              key={format(day, "yyyy-MM-dd")}
              day={day}
              appointments={byDay.get(format(day, "yyyy-MM-dd")) ?? []}
            />
          ))}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No appointments this week</p>
              <Button size="sm" variant="outline" className="mt-4" onClick={() => setShowNew(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />Book one now
              </Button>
            </div>
          )}
        </div>
      )}

      <NewAppointmentDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
