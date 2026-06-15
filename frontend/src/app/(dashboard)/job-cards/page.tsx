"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobCardsApi, type CreateJobCardPayload, vehiclesApi, techniciansApi } from "@/lib/api";
import type { JobCardListItem, JobCardStatus, ServiceType, FuelLevel } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, ArrowRight, Printer, Mail, ClipboardList } from "lucide-react";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESSORIES = [
  "Jack",
  "Spare Tyre",
  "Spanner / Wheel Brace",
  "Fire Extinguisher",
  "Warning Triangle",
  "First Aid Kit",
  "Reflective Vest",
  "Tool Kit",
  "Owner's Manual",
  "Locking Wheel Nut Key",
];

const SERVICE_TYPES: ServiceType[] = [
  "RoutineMaintenance","OilChange","MajorService","TyreRotation","BrakeService",
  "TransmissionService","AirConditioningService","ElectricalDiagnostics","BodyRepair",
  "WarrantyRepair","RecallRepair","PDI","EmergencyRepair","Inspection","Other",
];

const FUEL_LEVELS: { value: FuelLevel; label: string }[] = [
  { value: "Empty", label: "Empty (0)" },
  { value: "Quarter", label: "1/4" },
  { value: "Half", label: "1/2" },
  { value: "ThreeQuarter", label: "3/4" },
  { value: "Full", label: "Full" },
];

function statusBadge(status: JobCardStatus) {
  if (status === "Open") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Open</Badge>;
  return <Badge className="bg-slate-200 text-slate-600">Closed</Badge>;
}

function serviceTypeLabel(s: ServiceType) {
  return s.replace(/([A-Z])/g, " $1").trim();
}

// ─── Create Dialog ─────────────────────────────────────────────────────────────

function CreateJobCardDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, number: string) => void;
}) {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>("RoutineMaintenance");
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("Half");
  const [mileage, setMileage] = useState("");
  const [technicianId, setTechnicianId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [accessories, setAccessories] = useState<string[]>([]);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-search", vehicleSearch],
    queryFn: () => vehiclesApi.list({ search: vehicleSearch || undefined, pageSize: 20 }),
    enabled: vehicleSearch.length >= 2 || vehicleSearch === "",
  });

  const { data: technicians } = useQuery({
    queryKey: ["technicians-active"],
    queryFn: () => techniciansApi.list(true),
  });

  const selectedVehicle = vehicles?.items.find(v => v.id === selectedVehicleId);

  const mutation = useMutation({
    mutationFn: (payload: CreateJobCardPayload) => jobCardsApi.create(payload),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(`Job card ${res.data.jobCardNumber} created`);
        onCreated(res.data.id, res.data.jobCardNumber);
        onClose();
      }
    },
    onError: () => toast.error("Failed to create job card"),
  });

  const toggleAccessory = (name: string) => {
    setAccessories(prev => prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]);
  };

  const handleSubmit = () => {
    if (!selectedVehicleId) return toast.error("Please select a vehicle");
    if (!mileage) return toast.error("Please enter mileage");
    mutation.mutate({
      vehicleId: selectedVehicleId,
      technicianId: technicianId || null,
      serviceType,
      fuelLevel,
      mileage: parseInt(mileage),
      notes: notes || null,
      additionalInfo: additionalInfo || null,
      accessoriesPresent: accessories,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" /> New Job Card
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Vehicle */}
          <div className="space-y-1">
            <Label>Vehicle <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Search by VIN or plate…"
              value={vehicleSearch}
              onChange={e => { setVehicleSearch(e.target.value); setSelectedVehicleId(""); }}
            />
            {vehicles && vehicles.items.length > 0 && !selectedVehicleId && (
              <div className="border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                {vehicles.items.map(v => (
                  <button
                    key={v.id}
                    className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                    onClick={() => { setSelectedVehicleId(v.id); setVehicleSearch(`${v.vin} — ${v.plateNumber ?? "No plate"}`); }}
                  >
                    <span className="font-medium">{v.vin}</span>
                    <span className="text-muted-foreground ml-2">{v.plateNumber} · {v.brandName} {v.modelName} {v.year}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedVehicle && (
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <span className="font-medium">{selectedVehicle.brandName} {selectedVehicle.modelName}</span>
                <span className="text-muted-foreground ml-2">{selectedVehicle.year} · {selectedVehicle.customerName ?? "No customer"}</span>
              </div>
            )}
          </div>

          {/* Service Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Service Type <span className="text-red-500">*</span></Label>
              <Select value={serviceType} onValueChange={v => setServiceType(v as ServiceType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{serviceTypeLabel(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Technician</Label>
              <Select value={technicianId} onValueChange={setTechnicianId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {technicians?.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mileage + Fuel Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Mileage (km) <span className="text-red-500">*</span></Label>
              <Input type="number" min={0} value={mileage} onChange={e => setMileage(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Fuel Level</Label>
              <Select value={fuelLevel} onValueChange={v => setFuelLevel(v as FuelLevel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUEL_LEVELS.map(f => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Accessories */}
          <div className="space-y-2">
            <Label>Accessories Present</Label>
            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/30">
              {ACCESSORIES.map(acc => (
                <div key={acc} className="flex items-center gap-2">
                  <Checkbox
                    id={`acc-${acc}`}
                    checked={accessories.includes(acc)}
                    onCheckedChange={() => toggleAccessory(acc)}
                  />
                  <label htmlFor={`acc-${acc}`} className="text-sm cursor-pointer">{acc}</label>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Customer complaints, visible damage, etc." />
          </div>
          <div className="space-y-1">
            <Label>Additional Info</Label>
            <Textarea value={additionalInfo} onChange={e => setAdditionalInfo(e.target.value)} rows={2} placeholder="Special instructions or references…" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? "Creating…" : "Create Job Card"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Share Dialog ──────────────────────────────────────────────────────────────

function ShareDialog({ jobCard, open, onClose }: {
  jobCard: JobCardListItem;
  open: boolean;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState(
    `Dear ${jobCard.customerName ?? "Customer"},\n\nThank you for visiting RwandaMotor. Please find below the details of your vehicle reception.\n\nJob Card: ${jobCard.jobCardNumber}\nVehicle: ${jobCard.vin} (${jobCard.plateNumber ?? "No plate"})\n\nBest regards,\nRwandaMotor Service Team`
  );

  const mutation = useMutation({
    mutationFn: () => jobCardsApi.share(jobCard.id, { recipientEmail: email, customMessage: msg }),
    onSuccess: () => { toast.success("Email sent"); onClose(); },
    onError: () => toast.error("Failed to send email"),
  });

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Share via Email</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Recipient Email</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@email.com" />
          </div>
          <div className="space-y-1">
            <Label>Message</Label>
            <Textarea rows={8} value={msg} onChange={e => setMsg(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!email || mutation.isPending}>
              <Mail className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Sending…" : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function JobCardsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobCardStatus | "">("");
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<JobCardListItem | null>(null);

  const params = useMemo(() => ({
    search: search || undefined,
    status: statusFilter || undefined,
    serviceType: serviceTypeFilter || undefined,
    pageNumber: page,
    pageSize: 25,
  }), [search, statusFilter, serviceTypeFilter, page]);

  const { data, isLoading } = useQuery({
    queryKey: ["job-cards", params],
    queryFn: () => jobCardsApi.list(params),
  });

  const convertMutation = useMutation({
    mutationFn: (id: string) => jobCardsApi.convertToDeliveryNote(id),
    onSuccess: (res) => {
      toast.success(`Delivery note ${res.data} created. Job card closed.`);
      queryClient.invalidateQueries({ queryKey: ["job-cards"] });
    },
    onError: () => toast.error("Conversion failed"),
  });

  const handleCreated = (_id: string, _number: string) => {
    queryClient.invalidateQueries({ queryKey: ["job-cards"] });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Job Cards</h1>
          <p className="text-muted-foreground text-sm">Vehicle reception records with auto-numbered delivery notes</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Job Card
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, plate, customer, number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as JobCardStatus | ""); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceTypeFilter} onValueChange={v => { setServiceTypeFilter(v as ServiceType | ""); setPage(1); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All service types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All service types</SelectItem>
            {SERVICE_TYPES.map(t => <SelectItem key={t} value={t}>{serviceTypeLabel(t)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Card #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Vehicle</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Received By</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Delivery Note</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                )}
                {!isLoading && data?.items.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground">No job cards found</td></tr>
                )}
                {data?.items.map(jc => (
                  <tr
                    key={jc.id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/job-cards/${jc.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-medium text-primary">{jc.jobCardNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{jc.vin}</div>
                      <div className="text-muted-foreground text-xs">{jc.plateNumber ?? "—"} · {jc.year}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{jc.customerName ?? <span className="text-muted-foreground">Unknown</span>}</div>
                      {jc.customerPhone && <div className="text-xs text-muted-foreground">{jc.customerPhone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{serviceTypeLabel(jc.serviceType)}</Badge>
                    </td>
                    <td className="px-4 py-3">{statusBadge(jc.status)}</td>
                    <td className="px-4 py-3 text-sm">{jc.receivedByName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {format(new Date(jc.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      {jc.deliveryNoteNumber
                        ? <span className="font-mono text-xs text-emerald-600">{jc.deliveryNoteNumber}</span>
                        : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {/* Print */}
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="Print"
                          onClick={() => router.push(`/job-cards/${jc.id}?print=1`)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>

                        {/* Share */}
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="Share via email"
                          onClick={() => setShareTarget(jc)}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>

                        {/* Convert */}
                        {jc.status === "Open" && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-orange-500"
                            title="Convert to Delivery Note"
                            disabled={convertMutation.isPending}
                            onClick={() => {
                              if (confirm(`Convert ${jc.jobCardNumber} to a Delivery Note? This will close it.`)) {
                                convertMutation.mutate(jc.id);
                              }
                            }}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
                        {/* View detail */}
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title="View"
                          onClick={() => router.push(`/job-cards/${jc.id}`)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * 25 + 1}–{Math.min(page * 25, data.totalCount)} of {data.totalCount}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!data.hasPreviousPage} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={!data.hasNextPage} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateJobCardDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleCreated}
      />
      {shareTarget && (
        <ShareDialog jobCard={shareTarget} open={true} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
