"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { followUpsApi, appointmentsApi, techniciansApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  ArrowLeft, PhoneCall, PhoneOff, CalendarClock, Mail, MessageSquare,
  CheckCircle2, Car, User, Clock, CalendarDays, XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

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

const APPT_STATUS_MAP: Record<string, { label: string; color: string }> = {
  Scheduled: { label: "Scheduled", color: "bg-blue-100 text-blue-700 border-blue-200" },
  Confirmed: { label: "Confirmed", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  Completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  Cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200" },
  NoShow:    { label: "No-show",   color: "bg-orange-100 text-orange-700 border-orange-200" },
};

const OUTCOME_MAP: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  Reached:                 { label: "Reached",                 icon: PhoneCall,     color: "text-emerald-600" },
  NoAnswer:                { label: "No Answer",               icon: PhoneOff,      color: "text-red-500" },
  LeftMessage:             { label: "Left Message",            icon: MessageSquare, color: "text-amber-600" },
  CallbackScheduled:       { label: "Callback Scheduled",      icon: CalendarClock, color: "text-violet-600" },
  ServiceReminderEmailSent:{ label: "Service Reminder Email",  icon: Mail,          color: "text-blue-600" },
  SatisfactionEmailSent:   { label: "Satisfaction Email Sent", icon: Mail,          color: "text-teal-600" },
  AppointmentBooked:       { label: "Appointment Booked",      icon: CheckCircle2,  color: "text-indigo-600" },
};

const REASON_LABELS: Record<string, string> = {
  WelcomeCall:         "Welcome Call",
  ServiceDueReminder:  "Service Due Reminder",
  SixMonthContact:     "6-Month Outreach",
  LostRecovery:        "Lost Recovery",
  ServiceDue15Days:    "Due in 15 Days",
};

const SERVICE_TYPE_OPTIONS = [
  { value: "RoutineMaintenance", label: "Routine Maintenance" },
  { value: "OilChange",          label: "Oil Change" },
  { value: "MajorService",       label: "Major Service" },
  { value: "BrakeService",       label: "Brake Service" },
  { value: "ElectricalDiagnostics", label: "Electrical Diagnostics" },
  { value: "WarrantyRepair",     label: "Warranty Repair" },
  { value: "Other",              label: "Other" },
];

// ─── Book Appointment Dialog ───────────────────────────────────────────────────

function BookAppointmentDialog({
  open, onClose, vehicleId, customerId, followUpId,
}: {
  open: boolean; onClose: () => void;
  vehicleId: string; customerId: string; followUpId: string;
}) {
  const qc = useQueryClient();
  const [date, setDate]         = useState("");
  const [duration, setDuration] = useState("60");
  const [serviceType, setType]  = useState("Other");
  const [techId, setTechId]     = useState("");
  const [notes, setNotes]       = useState("");

  const { data: techs = [] } = useQuery({
    queryKey: ["technicians-active"],
    queryFn:  () => techniciansApi.list(true),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      appointmentsApi.book({
        vehicleId, customerId, followUpId,
        technicianId:    techId || null,
        appointmentDate: date,
        durationMinutes: Number(duration),
        serviceType,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("Appointment booked");
      qc.invalidateQueries({ queryKey: ["follow-up", followUpId] });
      onClose();
    },
    onError: () => toast.error("Failed to book appointment"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Book Appointment</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Date & Time *</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Service Type</Label>
              <Select value={serviceType} onValueChange={(v) => setType(v ?? "Other")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPE_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" min={15} step={15} />
            </div>
          </div>
          <div>
            <Label>Technician (optional)</Label>
            <Select value={techId} onValueChange={(v) => setTechId(v ?? "")}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Auto-assign" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Auto-assign</SelectItem>
                {techs.map(t => <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 resize-none" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !date}>
              {mutation.isPending ? "Booking…" : "Book Appointment"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log Interaction Dialog ────────────────────────────────────────────────────

function LogInteractionDialog({
  open, onClose, followUpId,
}: {
  open: boolean; onClose: () => void; followUpId: string;
}) {
  const qc = useQueryClient();
  const [outcome, setOutcome] = useState("Reached");
  const [notes, setNotes]     = useState("");
  const [nextDate, setNextDate] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      followUpsApi.logInteraction(followUpId, {
        outcome,
        notes:           notes || null,
        nextContactDate: nextDate || null,
      }),
    onSuccess: () => {
      toast.success("Interaction logged");
      qc.invalidateQueries({ queryKey: ["follow-up", followUpId] });
      onClose();
    },
    onError: () => toast.error("Failed to log interaction"),
  });

  const buttons = [
    { value: "Reached",                  label: "Reached",           icon: PhoneCall },
    { value: "NoAnswer",                 label: "No Answer",         icon: PhoneOff },
    { value: "LeftMessage",              label: "Left Message",      icon: MessageSquare },
    { value: "CallbackScheduled",        label: "Schedule Callback", icon: CalendarClock },
    { value: "ServiceReminderEmailSent", label: "Service Email",     icon: Mail },
    { value: "SatisfactionEmailSent",    label: "Satisfaction Email",icon: Mail },
    { value: "AppointmentBooked",        label: "Appt. Booked",     icon: CheckCircle2 },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Log Interaction</DialogTitle></DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <Label>Outcome</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {buttons.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOutcome(value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all",
                    outcome === value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border hover:border-primary/40"
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
              <Label>Callback Date & Time</Label>
              <Input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 resize-none" placeholder="What was discussed?" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FollowUpDetailPage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();
  const qc      = useQueryClient();

  const [showLog, setShowLog]   = useState(false);
  const [showAppt, setShowAppt] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["follow-up", id],
    queryFn:  () => followUpsApi.get(id),
  });

  const closeMutation = useMutation({
    mutationFn: () => followUpsApi.close(id),
    onSuccess:  () => {
      toast.success("Follow-up closed");
      qc.invalidateQueries({ queryKey: ["follow-up", id] });
    },
  });

  const emailMutation = useMutation({
    mutationFn: (emailType: string) => followUpsApi.sendEmail(id, emailType),
    onSuccess:  () => toast.success("Email sent"),
    onError:    () => toast.error("Failed to send email"),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>Follow-up not found.</p>
        <Button variant="link" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const status   = STATUS_MAP[data.status]   ?? { label: data.status,   color: "" };
  const isClosed = data.status === "Closed"  || data.status === "Recovered";

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">Follow-up — {REASON_LABELS[data.reason] ?? data.reason}</h1>
          <p className="text-xs text-muted-foreground">Created {format(parseISO(data.createdAt), "dd MMM yyyy")}</p>
        </div>
        <div className="ml-auto">
          <Badge className={cn("border", status.color)}>{status.label}</Badge>
        </div>
      </div>

      {/* Vehicle + Customer */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <Car className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{data.vehicle.plateNumber ?? data.vehicle.vin}</p>
              <p className="text-xs text-muted-foreground">{data.vehicle.brand} {data.vehicle.model} {data.vehicle.year}</p>
              {data.vehicle.lastServiceDate && (
                <p className="text-xs text-muted-foreground mt-1">Last service: {format(parseISO(data.vehicle.lastServiceDate), "dd MMM yyyy")}</p>
              )}
              {data.vehicle.nextServiceDate && (
                <p className="text-xs text-muted-foreground">Next service: {format(parseISO(data.vehicle.nextServiceDate), "dd MMM yyyy")}</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-start gap-3">
            <User className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{data.customer.name}</p>
              {data.customer.phone && <p className="text-xs text-muted-foreground">{data.customer.phone}</p>}
              {data.customer.email && <p className="text-xs text-muted-foreground">{data.customer.email}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Due date */}
      <Card>
        <CardContent className="p-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>Due: <strong>{format(parseISO(data.dueDate), "dd MMM yyyy")}</strong></span>
          </div>
          {data.notes && <p className="text-sm text-muted-foreground italic">&quot;{data.notes}&quot;</p>}
        </CardContent>
      </Card>

      {/* Action Bar */}
      {!isClosed && (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" onClick={() => setShowLog(true)}>
            <PhoneCall className="w-3.5 h-3.5 mr-1.5" />Log Contact
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowAppt(true)}>
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />Book Appointment
          </Button>
          <Button size="sm" variant="outline" onClick={() => emailMutation.mutate("ServiceReminder")} disabled={emailMutation.isPending}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />Service Reminder Email
          </Button>
          <Button size="sm" variant="outline" onClick={() => emailMutation.mutate("SatisfactionCheck")} disabled={emailMutation.isPending}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />Satisfaction Email
          </Button>
          <Button size="sm" variant="ghost" className="text-muted-foreground ml-auto" onClick={() => closeMutation.mutate()} disabled={closeMutation.isPending}>
            <XCircle className="w-3.5 h-3.5 mr-1.5" />Close Follow-up
          </Button>
        </div>
      )}

      {/* Interaction Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Interaction Log ({data.interactions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No interactions yet. Log your first contact above.</p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-2 top-0 bottom-0 w-px bg-border" />
              {data.interactions.map((i, idx) => {
                const o    = OUTCOME_MAP[i.outcome] ?? { label: i.outcome, icon: MessageSquare, color: "text-muted-foreground" };
                const Icon = o.icon;
                return (
                  <div key={i.id} className={cn("relative pb-5", idx === data.interactions.length - 1 && "pb-0")}>
                    <div className={cn("absolute -left-3 top-0 w-5 h-5 rounded-full bg-background border-2 border-border flex items-center justify-center", o.color)}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm font-medium", o.color)}>{o.label}</span>
                        {i.createdBy && <span className="text-xs text-muted-foreground">by {i.createdBy}</span>}
                        <span className="text-xs text-muted-foreground ml-auto">{format(parseISO(i.createdAt), "dd MMM yyyy HH:mm")}</span>
                      </div>
                      {i.notes && <p className="text-sm text-muted-foreground mt-0.5">{i.notes}</p>}
                      {i.nextContactDate && (
                        <p className="text-xs text-violet-600 mt-0.5">
                          Callback: {format(parseISO(i.nextContactDate), "dd MMM yyyy HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointments */}
      {data.appointments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Appointments ({data.appointments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.appointments.map(a => {
              const as_ = APPT_STATUS_MAP[a.status] ?? { label: a.status, color: "" };
              return (
                <div key={a.id} className="flex items-center justify-between gap-4 py-2">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{format(parseISO(a.appointmentDate), "dd MMM yyyy HH:mm")}</p>
                      <p className="text-xs text-muted-foreground">{a.durationMinutes} min · {a.serviceType}</p>
                    </div>
                  </div>
                  <Badge className={cn("border text-[11px]", as_.color)}>{as_.label}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <LogInteractionDialog open={showLog} onClose={() => setShowLog(false)} followUpId={id} />
      <BookAppointmentDialog
        open={showAppt} onClose={() => setShowAppt(false)}
        vehicleId={data.vehicle.id} customerId={data.customer.id} followUpId={id}
      />
    </div>
  );
}
