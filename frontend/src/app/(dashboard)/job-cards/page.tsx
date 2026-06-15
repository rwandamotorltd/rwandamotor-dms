"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  jobCardsApi, vehiclesApi, techniciansApi, brandsApi,
  type CreateJobCardPayload,
} from "@/lib/api";
import type { JobCardListItem, JobCardStatus, ServiceType, FuelLevel, VehicleListItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, ArrowRight, Printer, Mail, ClipboardList, X } from "lucide-react";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESSORIES = [
  "Jack", "Spare Tyre", "Spanner / Wheel Brace", "Fire Extinguisher",
  "Warning Triangle", "First Aid Kit", "Reflective Vest", "Tool Kit",
  "Owner's Manual", "Locking Wheel Nut Key",
];

const SERVICE_TYPES: ServiceType[] = [
  "RoutineMaintenance","OilChange","MajorService","TyreRotation","BrakeService",
  "TransmissionService","AirConditioningService","ElectricalDiagnostics","BodyRepair",
  "WarrantyRepair","RecallRepair","PDI","EmergencyRepair","Inspection","Other",
];

const FUEL_LEVELS: { value: FuelLevel; label: string }[] = [
  { value: "Empty",        label: "Empty (0)" },
  { value: "Quarter",      label: "1/4" },
  { value: "Half",         label: "1/2" },
  { value: "ThreeQuarter", label: "3/4" },
  { value: "Full",         label: "Full" },
];

const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "LPG"];
const TRANSMISSIONS = ["Manual", "Automatic", "CVT", "DSG"];

function statusBadge(status: JobCardStatus) {
  if (status === "Open")
    return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-200">Open</Badge>;
  return <Badge className="bg-slate-200 text-slate-600">Closed</Badge>;
}

function serviceTypeLabel(s: ServiceType) {
  return s.replace(/([A-Z])/g, " $1").trim();
}

// ─── Add Vehicle Dialog ────────────────────────────────────────────────────────

function AddVehicleDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (vehicle: VehicleListItem) => void;
}) {
  const [vin, setVin] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [brandId, setBrandId] = useState("");
  const [modelId, setModelId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [color, setColor] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [currentMileage, setCurrentMileage] = useState("");
  const [isSoldByDealership, setIsSoldByDealership] = useState(false);

  const { data: brands } = useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsApi.list(),
  });

  const selectedBrand = brands?.find(b => b.id === brandId);
  const models = selectedBrand?.models ?? [];

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => vehiclesApi.create(payload),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success("Vehicle added successfully");
        onCreated({
          id: res.data as string,
          vin: vin.trim().toUpperCase(),
          plateNumber: plateNumber.trim() || null,
          brandName: selectedBrand?.name ?? "",
          brandCode: "",
          modelName: models.find(m => m.id === modelId)?.name ?? "",
          year: parseInt(year),
          customerName: null,
          customerPhone: null,
          saleDate: null,
          lastServiceDate: null,
          nextServiceDate: null,
          nextServiceMileage: null,
          currentMileage: currentMileage ? parseInt(currentMileage) : null,
          retentionStatus: isSoldByDealership ? "Active" : "External",
          warrantyEndDate: null,
          isSoldByDealership,
        });
        onClose();
      }
    },
    onError: () => toast.error("Failed to add vehicle"),
  });

  // Reset form on close
  useEffect(() => {
    if (!open) {
      setVin(""); setPlateNumber(""); setBrandId(""); setModelId("");
      setYear(String(new Date().getFullYear()));
      setColor(""); setFuelType(""); setTransmission(""); setCurrentMileage("");
      setIsSoldByDealership(false);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!vin.trim())  return toast.error("VIN is required");
    if (!brandId)     return toast.error("Brand is required");
    if (!modelId)     return toast.error("Model is required");
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1)
      return toast.error("Invalid year (1990 – " + (new Date().getFullYear() + 1) + ")");

    mutation.mutate({
      vin: vin.trim().toUpperCase(),
      plateNumber: plateNumber.trim() || null,
      brandId,
      modelId,
      year: yearNum,
      color: color || null,
      fuelType: fuelType || null,
      transmission: transmission || null,
      currentMileage: currentMileage ? parseInt(currentMileage) : null,
      isSoldByDealership,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add New Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* VIN + Plate */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>VIN <span className="text-red-500">*</span></Label>
              <Input
                value={vin}
                onChange={e => setVin(e.target.value)}
                placeholder="e.g. JTMZF33V4MD…"
                className="uppercase"
              />
            </div>
            <div className="space-y-1">
              <Label>Plate Number</Label>
              <Input
                value={plateNumber}
                onChange={e => setPlateNumber(e.target.value)}
                placeholder="RAA 123A"
              />
            </div>
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Brand <span className="text-red-500">*</span></Label>
              <Select value={brandId} onValueChange={v => { setBrandId(v ?? ""); setModelId(""); }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Model <span className="text-red-500">*</span></Label>
              <Select value={modelId} onValueChange={v => setModelId(v ?? "")} disabled={!brandId || models.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={!brandId ? "Select brand first" : "Select model"} />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Year + Color + Mileage */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Year <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1990}
                max={new Date().getFullYear() + 1}
                value={year}
                onChange={e => setYear(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="White" />
            </div>
            <div className="space-y-1">
              <Label>Mileage (km)</Label>
              <Input
                type="number"
                min={0}
                value={currentMileage}
                onChange={e => setCurrentMileage(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* Fuel + Transmission */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fuel Type</Label>
              <Select value={fuelType} onValueChange={v => setFuelType(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Transmission</Label>
              <Select value={transmission} onValueChange={v => setTransmission(v ?? "")}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dealership flag */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="sold-by-dealer"
              checked={isSoldByDealership}
              onCheckedChange={c => setIsSoldByDealership(!!c)}
            />
            <label htmlFor="sold-by-dealer" className="text-sm cursor-pointer">
              Sold by RwandaMotor (Dealership Fleet)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={mutation.isPending}>
              {mutation.isPending ? "Adding…" : "Add Vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Job Card Dialog ────────────────────────────────────────────────────

function CreateJobCardDialog({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleListItem | null>(null);
  const [serviceType, setServiceType] = useState<ServiceType>("RoutineMaintenance");
  const [fuelLevel, setFuelLevel] = useState<FuelLevel>("Half");
  const [mileage, setMileage] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [notes, setNotes] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Debounce vehicle search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(vehicleSearch), 300);
    return () => clearTimeout(t);
  }, [vehicleSearch]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setVehicleSearch(""); setDebouncedSearch(""); setShowSuggestions(false);
      setSelectedVehicleId(""); setSelectedVehicle(null);
      setServiceType("RoutineMaintenance"); setFuelLevel("Half");
      setMileage(""); setTechnicianId(""); setNotes(""); setAdditionalInfo("");
      setAccessories([]);
    }
  }, [open]);

  const { data: searchResults } = useQuery({
    queryKey: ["vehicles-search", debouncedSearch],
    queryFn: () => vehiclesApi.list({ search: debouncedSearch, pageSize: 10 }),
    enabled: debouncedSearch.length >= 2 && !selectedVehicleId,
  });

  const { data: technicians } = useQuery({
    queryKey: ["technicians-active"],
    queryFn: () => techniciansApi.list(true),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateJobCardPayload) => jobCardsApi.create(payload),
    onSuccess: (res) => {
      if (res.success && res.data) {
        toast.success(`Job card ${res.data.jobCardNumber} created`);
        onCreated();
        onClose();
      } else {
        toast.error(res.message ?? "Failed to create job card");
      }
    },
    onError: () => toast.error("Failed to create job card"),
  });

  const selectVehicle = (v: VehicleListItem) => {
    setSelectedVehicleId(v.id);
    setSelectedVehicle(v);
    setVehicleSearch(`${v.vin}${v.plateNumber ? " · " + v.plateNumber : ""}`);
    setShowSuggestions(false);
  };

  const clearVehicle = () => {
    setSelectedVehicleId(""); setSelectedVehicle(null); setVehicleSearch("");
  };

  const toggleAccessory = (name: string) => {
    setAccessories(prev =>
      prev.includes(name) ? prev.filter(a => a !== name) : [...prev, name]
    );
  };

  const handleSubmit = () => {
    if (!selectedVehicleId) return toast.error("Please select a vehicle");
    if (!mileage)           return toast.error("Please enter mileage");
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
    <>
      <Dialog open={open} onOpenChange={o => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" /> New Job Card
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* ── Vehicle Search ── */}
            <div className="space-y-1">
              <Label>Vehicle <span className="text-red-500">*</span></Label>
              <div className="flex gap-2">
                <div className="relative flex-1" ref={searchRef}>
                  <Input
                    placeholder="Type VIN or plate number to search…"
                    value={vehicleSearch}
                    disabled={!!selectedVehicleId}
                    onChange={e => {
                      setVehicleSearch(e.target.value);
                      setSelectedVehicleId("");
                      setSelectedVehicle(null);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (!selectedVehicleId) setShowSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  {selectedVehicleId && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={clearVehicle}
                      title="Clear selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Autocomplete dropdown */}
                  {showSuggestions && debouncedSearch.length >= 2 && !selectedVehicleId && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg max-h-48 overflow-y-auto">
                      {!searchResults && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                      )}
                      {searchResults?.items.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No vehicles found for &quot;{debouncedSearch}&quot;.{" "}
                          <button
                            type="button"
                            className="text-primary underline"
                            onMouseDown={() => { setShowSuggestions(false); setAddVehicleOpen(true); }}
                          >
                            Add new vehicle
                          </button>
                        </div>
                      )}
                      {searchResults?.items.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                          onMouseDown={() => selectVehicle(v)}
                        >
                          <span className="font-mono font-medium">{v.vin}</span>
                          <span className="text-muted-foreground ml-2">
                            {v.plateNumber ?? "No plate"} · {v.brandName} {v.modelName} {v.year}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add new vehicle button */}
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Add new vehicle"
                  onClick={() => setAddVehicleOpen(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected vehicle info */}
              {selectedVehicle && (
                <div className="rounded-md bg-muted/60 px-3 py-2 text-sm flex items-center gap-2">
                  <span className="font-medium">{selectedVehicle.brandName} {selectedVehicle.modelName}</span>
                  <span className="text-muted-foreground">
                    {selectedVehicle.year}
                    {selectedVehicle.customerName ? " · " + selectedVehicle.customerName : ""}
                    {selectedVehicle.isSoldByDealership ? " · Dealership" : ""}
                  </span>
                </div>
              )}

              {!selectedVehicleId && debouncedSearch.length < 2 && (
                <p className="text-xs text-muted-foreground">
                  Type at least 2 characters to search, or click <Plus className="inline w-3 h-3" /> to add a new vehicle.
                </p>
              )}
            </div>

            {/* ── Service Type + Technician ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Service Type <span className="text-red-500">*</span></Label>
                <Select value={serviceType} onValueChange={v => setServiceType(v as ServiceType)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{serviceTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Technician</Label>
                <Select value={technicianId} onValueChange={v => setTechnicianId(v ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {technicians?.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Mileage + Fuel Level ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Mileage (km) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={mileage}
                  onChange={e => setMileage(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Fuel Level</Label>
                <Select value={fuelLevel} onValueChange={v => setFuelLevel(v as FuelLevel)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_LEVELS.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Accessories ── */}
            <div className="space-y-2">
              <Label>Accessories Present</Label>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3 bg-muted/30">
                {ACCESSORIES.map(acc => (
                  <div key={acc} className="flex items-center gap-2">
                    <Checkbox
                      id={`acc-${acc}`}
                      checked={accessories.includes(acc)}
            