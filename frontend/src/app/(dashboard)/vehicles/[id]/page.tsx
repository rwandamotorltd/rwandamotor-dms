"use client";

import { use, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Car, User, Wrench, Shield, Clock,
  CheckCircle2, Calendar, Gauge, Bell,
  Phone, Mail, Star, Pencil, X, FileText
} from "lucide-react";
import { vehiclesApi, servicePoliciesApi, type UpdateVehiclePayload } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { RetentionBadge } from "@/components/shared/retention-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { cn, formatDate, formatCurrency, formatMileage, formatDateDistance, SERVICE_TYPE_LABELS } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RetentionStatus, ServicePolicy } from "@/types";

// ─── Constants ────────────────────────────────────────────────

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "Other"];
const TRANSMISSIONS = ["Manual", "Automatic", "CVT", "AMT"];
const RETENTION_STATUSES: RetentionStatus[] = ["Active", "DueSoon", "Overdue", "Lost", "Recovered", "External"];

// ─── Edit Modal ───────────────────────────────────────────────────

interface EditFormState {
  plateNumber: string;
  color: string;
  fuelType: string;
  transmission: string;
  engineNumber: string;
  engineCapacityCC: string;
  currentMileage: string;
  warrantyStartDate: string;
  warrantyEndDate: string;
  warrantyKmLimit: string;
  servicePolicyId: string;
  retentionStatus: RetentionStatus;
  notes: string;
}

interface EditModalProps {
  form: EditFormState;
  policies: ServicePolicy[];
  onChange: (patch: Partial<EditFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
}

function EditVehicleModal({ form, policies, onChange, onSave, onClose, saving, error }: EditModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Pencil className="w-4 h-4 text-muted-foreground" />
            Edit Vehicle Details
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">
              {error}
            </div>
          )}

          {/* Row 1: Plate + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Plate Number</Label>
              <Input
                value={form.plateNumber}
                onChange={e => onChange({ plateNumber: e.target.value })}
                placeholder="e.g. RAC 123A"
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <Input
                value={form.color}
                onChange={e => onChange({ color: e.target.value })}
                placeholder="e.g. Silver"
              />
            </div>
          </div>

          {/* Row 2: Fuel Type + Transmission */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Fuel Type</Label>
              <Select value={form.fuelType} onValueChange={v => onChange({ fuelType: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select value={form.transmission} onValueChange={v => onChange({ transmission: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 3: Engine Number + Capacity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Engine Number</Label>
              <Input
                value={form.engineNumber}
                onChange={e => onChange({ engineNumber: e.target.value })}
                placeholder="Optional"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Engine Capacity (CC)</Label>
              <Input
                type="number"
                value={form.engineCapacityCC}
                onChange={e => onChange({ engineCapacityCC: e.target.value })}
                placeholder="e.g. 1500"
                min={0}
              />
            </div>
          </div>

          {/* Row 4: Current Mileage + Retention Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Current Mileage (km)</Label>
              <Input
                type="number"
                value={form.currentMileage}
                onChange={e => onChange({ currentMileage: e.target.value })}
                placeholder="e.g. 25000"
                min={0}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Retention Status</Label>
              <Select value={form.retentionStatus} onValueChange={v => onChange({ retentionStatus: v as RetentionStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RETENTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 5: Service Policy */}
          <div className="space-y-1.5">
            <Label>Service Policy</Label>
            <Select value={form.servicePolicyId} onValueChange={v => onChange({ servicePolicyId: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Use brand/model default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Use brand/model default</SelectItem>
                {policies.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Warranty section */}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Warranty</p>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={form.warrantyStartDate}
                onChange={e => onChange({ warrantyStartDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input
                type="date"
                value={form.warrantyEndDate}
                onChange={e => onChange({ warrantyEndDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>KM Limit</Label>
              <Input
                type="number"
                value={form.warrantyKmLimit}
                onChange={e => onChange({ warrantyKmLimit: e.target.value })}
                placeholder="e.g. 100000"
                min={0}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="Internal notes about this vehicle..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={saving}
            className="gradient-primary text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function Vehicle360Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit = hasPermission("vehicles.edit");

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: vehicle, isLoading, isError } = useQuery({
    queryKey: ["vehicle-360", id],
    queryFn: () => vehiclesApi.get360(id),
  });

  const { data: policies = [] } = useQuery({
    queryKey: ["service-policies"],
    queryFn: () => servicePoliciesApi.list(),
    enabled: canEdit,
  });

  const editMutation = useMutation({
    mutationFn: (payload: UpdateVehiclePayload) => vehiclesApi.update(payload),
    onSuccess: (res) => {
      if (!res.success) { setEditError(res.message ?? "Update failed"); return; }
      qc.invalidateQueries({ queryKey: ["vehicle-360", id] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setShowEdit(false);
      setEditForm(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? (err as { message?: string })?.message ?? "Update failed";
      setEditError(msg);
    },
  });

  const openEdit = () => {
    if (!vehicle) return;
    setEditForm({
      plateNumber: vehicle.plateNumber ?? "",
      color: vehicle.color ?? "",
      fuelType: vehicle.fuelType ?? "",
      transmission: vehicle.transmission ?? "",
      engineNumber: vehicle.engineNumber ?? "",
      engineCapacityCC: vehicle.engineCapacityCC != null ? String(vehicle.engineCapacityCC) : "",
      currentMileage: vehicle.currentMileage != null ? String(vehicle.currentMileage) : "",
      warrantyStartDate: vehicle.warrantyStartDate ? vehicle.warrantyStartDate.substring(0, 10) : "",
      warrantyEndDate: vehicle.warrantyEndDate ? vehicle.warrantyEndDate.substring(0, 10) : "",
      warrantyKmLimit: vehicle.warrantyKmLimit != null ? String(vehicle.warrantyKmLimit) : "",
      servicePolicyId: vehicle.servicePolicyId ?? "",
      retentionStatus: vehicle.retentionStatus,
      notes: "",
    });
    setEditError(null);
    setShowEdit(true);
  };

  const handleSave = () => {
    if (!editForm) return;
    const payload: UpdateVehiclePayload = {
      id,
      plateNumber: editForm.plateNumber || null,
      color: editForm.color || null,
      fuelType: editForm.fuelType || null,
      transmission: editForm.transmission || null,
      engineNumber: editForm.engineNumber || null,
      engineCapacityCC: editForm.engineCapacityCC ? parseInt(editForm.engineCapacityCC) : null,
      currentMileage: editForm.currentMileage ? parseInt(editForm.currentMileage) : null,
      warrantyStartDate: editForm.warrantyStartDate || null,
      warrantyEndDate: editForm.warrantyEndDate || null,
      warrantyKmLimit: editForm.warrantyKmLimit ? parseInt(editForm.warrantyKmLimit) : null,
      servicePolicyId: editForm.servicePolicyId || null,
      retentionStatus: editForm.retentionStatus,
      notes: editForm.notes || null,
    };
    editMutation.mutate(payload);
  };

  if (isLoading) return <Vehicle360Skeleton />;
  if (isError) return <div className="text-center py-20 text-muted-foreground">Failed to load vehicle data. Please try again.</div>;
  if (!vehicle) return <div className="text-center py-20 text-muted-foreground">Vehicle not found.</div>;

  const warrantyExpired = vehicle.warrantyEndDate && new Date(vehicle.warrantyEndDate) < new Date();
  const warrantyStatus = !vehicle.warrantyEndDate ? "No warranty data" : warrantyExpired ? "Expired" : "Active";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Link href="/vehicles" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2 text-muted-foreground")}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Vehicle Registry
        </Link>

        <div className="flex flex-col md:flex-row md:items-start gap-4">
          {/* Vehicle ID block */}
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shrink-0 shadow-lg">
              <Car className="w-9 h-9 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {vehicle.brandName} {vehicle.modelName}
                </h1>
                <RetentionBadge status={vehicle.retentionStatus} />
                {vehicle.isSoldByDealership && (
                  <Badge variant="secondary" className="text-xs">
                    <Star className="w-3 h-3 mr-1" /> Dealership
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="font-mono text-sm text-muted-foreground">{vehicle.vin}</span>
                {vehicle.plateNumber && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-mono font-semibold text-primary text-sm">{vehicle.plateNumber}</span>
                  </>
                )}
                <span className="text-muted-foreground">·</span>
                <span className="text-sm text-muted-foreground">{vehicle.year}</span>
              </div>
            </div>
          </div>

          {canEdit && (
            <Button
              onClick={openEdit}
              variant="outline"
              className="gap-2 shrink-0"
            >
              <Pencil className="w-4 h-4" />
              Edit Vehicle
            </Button>
          )}
        </div>
      </motion.div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard title="Total Services" value={vehicle.kpis.totalServices} icon={Wrench} variant="info" index={0} />
        <KpiCard
          title="Avg Interval"
          value={vehicle.kpis.averageServiceIntervalDays ? `${Math.round(vehicle.kpis.averageServiceIntervalDays)}d` : "—"}
          icon={Clock} variant="default" index={1}
        />
        <KpiCard title="Warranty Jobs" value={vehicle.kpis.warrantyJobCount} icon={Shield} variant="purple" index={2} />
        <KpiCard
          title="Last Serviced"
          value={vehicle.kpis.lastServiceDaysAgo != null ? `${vehicle.kpis.lastServiceDaysAgo}d ago` : "—"}
          icon={Calendar} variant={vehicle.kpis.lastServiceDaysAgo != null && vehicle.kpis.lastServiceDaysAgo > 180 ? "danger" : "default"}
          index={3}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Vehicle + Customer details */}
        <div className="space-y-4">
          {/* Vehicle Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" /> Vehicle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <DetailRow label="Brand" value={vehicle.brandName} />
              <DetailRow label="Model" value={vehicle.modelName} />
              <DetailRow label="Year" value={String(vehicle.year)} />
              <DetailRow label="Color" value={vehicle.color} />
              <DetailRow label="Fuel Type" value={vehicle.fuelType} />
              <DetailRow label="Transmission" value={vehicle.transmission} />
              <DetailRow label="Engine #" value={vehicle.engineNumber} mono />
              <DetailRow label="Engine CC" value={vehicle.engineCapacityCC != null ? vehicle.engineCapacityCC + " cc" : null} />
              <Separator />
              <DetailRow label="Sale Date" value={formatDate(vehicle.saleDate)} />
              <DetailRow label="Sale Price" value={formatCurrency(vehicle.salePrice)} />
              <DetailRow label="Service Policy" value={vehicle.servicePolicyName} />
            </CardContent>
          </Card>

          {/* Service Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Gauge className="w-4 h-4 text-muted-foreground" /> Service Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <DetailRow label="Current Mileage" value={formatMileage(vehicle.currentMileage)} />
              <DetailRow label="Last Service" value={formatDate(vehicle.lastServiceDate)} />
              <DetailRow label="Last Service KM" value={formatMileage(vehicle.lastServiceMileage)} />
              <Separator />
              <DetailRow label="Next Service" value={formatDate(vehicle.nextServiceDate)} highlight />
              <DetailRow label="Next Service KM" value={formatMileage(vehicle.nextServiceMileage)} highlight />
            </CardContent>
          </Card>

          {/* Warranty */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="w-4 h-4 text-muted-foreground" /> Warranty
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={warrantyExpired ? "destructive" : "secondary"} className="text-xs">
                  {warrantyStatus}
                </Badge>
              </div>
              <DetailRow label="Start Date" value={formatDate(vehicle.warrantyStartDate)} />
              <DetailRow label="End Date" value={formatDate(vehicle.warrantyEndDate)} />
              <DetailRow label="KM Limit" value={vehicle.warrantyKmLimit != null ? formatMileage(vehicle.warrantyKmLimit) : null} />
            </CardContent>
          </Card>

          {/* Customer */}
          {vehicle.customerName && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" /> Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="gradient-primary text-white text-sm">
                      {vehicle.customerName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    {vehicle.customerId ? (
                      <Link href={"/customers/" + vehicle.customerId} className="font-semibold hover:text-primary hover:underline underline-offset-2 transition-colors">
                        {vehicle.customerName}
                      </Link>
                    ) : (
                      <p className="font-semibold">{vehicle.customerName}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{vehicle.customerCategory}</p>
                  </div>
                </div>
                {vehicle.customerPhone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{vehicle.customerPhone}</span>
                  </div>
                )}
                {vehicle.customerEmail && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{vehicle.customerEmail}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Tabs with job cards, timeline, follow-ups, technicians */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="jobcards">
            <TabsList className="mb-4">
              <TabsTrigger value="jobcards">Job Cards ({vehicle.jobCards?.length ?? 0})</TabsTrigger>
              <TabsTrigger value="timeline">Service Records</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups</TabsTrigger>
              <TabsTrigger value="technicians">Technicians</TabsTrigger>
            </TabsList>

            {/* Job Cards */}
            <TabsContent value="jobcards" className="space-y-3">
              {(vehicle.jobCards?.length ?? 0) === 0 ? (
                <EmptyState icon={FileText} message="No job cards yet" />
              ) : (
                (vehicle.jobCards ?? []).map((jc, idx) => (
                  <motion.div key={jc.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Link href={"/job-cards/" + jc.id}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50">
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${jc.status === "Open" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"}`}>
                                <FileText className={`w-4 h-4 ${jc.status === "Open" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-semibold text-sm text-primary">{jc.jobCardNumber}</span>
                                  <Badge variant={jc.status === "Open" ? "outline" : "secondary"} className={`text-[10px] py-0 px-1.5 h-4 ${jc.status === "Open" ? "border-amber-400 text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                                    {jc.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                    {SERVICE_TYPE_LABELS[jc.serviceType] ?? jc.serviceType}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> {formatDate(jc.createdAt)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Gauge className="w-3 h-3" /> {formatMileage(jc.mileage)}
                                  </span>
                                  {jc.technicianName && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" /> {jc.technicianName}
                                    </span>
                                  )}
                                </div>
                                {jc.deliveryNoteNumber && (
                                  <p className="text-xs font-mono text-muted-foreground mt-0.5">DN: {jc.deliveryNoteNumber}</p>
                                )}
                                {jc.notes && (
                                  <p className="text-xs text-foreground/70 mt-1">{jc.notes}</p>
                                )}
                              </div>
                            </div>
                            {jc.closedAt && (
                              <div className="text-right text-xs text-muted-foreground shrink-0">
                                <p>Closed</p>
                                <p className="font-medium">{formatDate(jc.closedAt)}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Service Timeline */}
            <TabsContent value="timeline" className="space-y-3">
              {vehicle.serviceTimeline.length === 0 ? (
                <EmptyState icon={Wrench} message="No service records yet" />
              ) : (
                vehicle.serviceTimeline.map((item, idx) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.04 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Wrench className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{SERVICE_TYPE_LABELS[item.serviceType]}</span>
                                {item.isWarrantyJob && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-violet-600 border-violet-300">
                                    Warranty
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {formatDate(item.serviceDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gauge className="w-3 h-3" /> {formatMileage(item.mileage)}
                                </span>
                                {item.technicianName && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" /> {item.technicianName}
                                  </span>
                                )}
                                {item.invoiceNumber && (
                                  <span className="font-mono">{item.invoiceNumber}</span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-xs text-foreground mt-1.5">{item.notes}</p>
                              )}
                              {item.serviceDescription && !item.serviceDescription.startsWith("Auto-created") && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">{item.serviceDescription}</p>
                              )}
                              {item.parts.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {item.parts.map((p, pi) => (
                                    <span key={pi} className="text-[10px] bg-muted rounded px-1.5 py-0.5 font-mono">
                                      {p.partName} x{p.quantity}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>

            {/* Follow-ups */}
            <TabsContent value="followups" className="space-y-3">
              {vehicle.followUpHistory.length === 0 ? (
                <EmptyState icon={CheckCircle2} message="No follow-ups recorded" />
              ) : (
                vehicle.followUpHistory.map((f, idx) => {
                  const isWelcome = f.reason === "WelcomeCall";
                  const isServiceReminder = f.reason === "ServiceDueReminder";
                  const isAuto = isWelcome || isServiceReminder;
                  return (
                    <motion.div key={f.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                      <Card className={isWelcome ? "border-l-4 border-l-blue-400" : isServiceReminder ? "border-l-4 border-l-amber-400" : ""}>
                        <CardContent className="pt-4 pb-3">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isWelcome ? "bg-blue-100 dark:bg-blue-900/30" :
                              isServiceReminder ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"
                            }`}>
                              {isWelcome
                                ? <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                : isServiceReminder
                                  ? <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                  : <CheckCircle2 className="w-4 h-4 text-muted-foreground" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {isWelcome && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-blue-600 border-blue-300 dark:text-blue-400">
                                    Welcome Call
                                  </Badge>
                                )}
                                {isServiceReminder && (
                                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 text-amber-600 border-amber-300 dark:text-amber-400">
                                    Service Reminder
                                  </Badge>
                                )}
                                {!isAuto && (
                                  <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
                                    {f.reason || "Follow-up"}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] py-0 px-1.5 h-4 ${
                                    f.status === "Pending" ? "text-orange-600 border-orange-300" :
                                    f.status === "Contacted" ? "text-blue-600 border-blue-300" :
                                    f.status === "Recovered" ? "text-emerald-600 border-emerald-300" :
                                    "text-muted-foreground"
                                  }`}
                                >
                                  {f.status}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">{f.priority}</Badge>
                              </div>

                              {/* Context card for auto follow-ups */}
                              {isWelcome && f.status === "Pending" && (
                                <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 px-3 py-2 text-xs text-blue-700 dark:text-blue-300 space-y-0.5">
                                  <p className="font-medium">Welcome call checklist:</p>
                                  <p>· Welcome customer to the Rwandamotor family</p>
                                  <p>· Remind: 1st free service at 5,000 km or 1 year</p>
                                  <p>· Remind: always use genuine manufacturer parts</p>
                                  <p>· Confirm satisfaction with PDI delivery</p>
                                </div>
                              )}
                              {isServiceReminder && f.status === "Pending" && (
                                <div className="mt-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                                  <p className="font-medium">Service reminder — action required:</p>
                                  <p>· Contact customer to schedule a service appointment</p>
                                  <p>· Vehicle service is due soon (see Next Service date)</p>
                                  <p>· Recommend genuine parts for best performance</p>
                                </div>
                              )}

                              {f.notes && (
                                <p className="text-xs text-muted-foreground mt-1.5 italic">{f.notes}</p>
                              )}

                              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> Due: {formatDate(f.dueDate)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> {f.contactMethod}
                                </span>
                                {f.contactedAt && (
                                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="w-3 h-3" /> Contacted {formatDateDistance(f.contactedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
            </TabsContent>

            {/* Technicians */}
            <TabsContent value="technicians" className="space-y-3">
              {vehicle.technicianHistory.length === 0 ? (
                <EmptyState icon={User} message="No technician history" />
              ) : (
                vehicle.technicianHistory.map((t, idx) => (
                  <motion.div key={t.technicianId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}>
                    <Card>
                      <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="gradient-primary text-white text-sm">
                              {t.technicianName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{t.technicianName}</p>
                            <p className="text-xs text-muted-foreground">{t.visitCount} service{t.visitCount > 1 ? "s" : ""}</p>
                          </div>
                          <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min((t.visitCount / (vehicle.kpis.totalServices || 1)) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Modal */}
      {showEdit && editForm && (
        <EditVehicleModal
          form={editForm}
          policies={policies}
          onChange={patch => setEditForm(f => f ? { ...f, ...patch } : f)}
          onSave={handleSave}
          onClose={() => { setShowEdit(false); setEditForm(null); }}
          saving={editMutation.isPending}
          error={editError}
        />
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false, highlight = false }: {
  label: string; value: string | null | undefined; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`font-medium truncate text-right ${mono ? "font-mono text-xs" : ""} ${highlight ? "text-primary" : "text-foreground"}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Icon className="w-12 h-12 opacity-25" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function Vehicle360Skeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-16 h-16 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
        <Skeleton className="col-span-2 h-[600px] rounded-xl" />
      </div>
    </div>
  );
}
