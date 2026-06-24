"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  jobCardsApi, vehiclesApi, techniciansApi, brandsApi, customersApi,
  type CreateJobCardPayload,
} from "@/lib/api";
import type { JobCardListItem, JobCardStatus, ServiceType, FuelLevel, VehicleListItem } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, FileText, ArrowRight, Printer, Mail, ClipboardList, X, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useServiceTypes } from "@/hooks/use-service-types";
import { format } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCESSORIES = [
  "Jack", "Spare Tyre", "Spanner / Wheel Brace", "Fire Extinguisher",
  "Warning Triangle", "First Aid Kit", "Reflective Vest", "Tool Kit",
  "Owner's Manual", "Locking Wheel Nut Key",
];

// SERVICE_TYPES now comes from useServiceTypes() inside components

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
  // Vehicle fields
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

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState("");
  const [debouncedCSearch, setDebouncedCSearch] = useState("");
  const [showCDropdown, setShowCDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);

  // Inline new-customer form
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [newCustPhone, setNewCustPhone] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");

  // Debounce customer search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedCSearch(customerSearch), 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const { data: brands } = useQuery({ queryKey: ["brands"], queryFn: () => brandsApi.list() });
  const selectedBrand = brands?.find(b => b.id === brandId);
  const models = selectedBrand?.models ?? [];

  const { data: customerResults } = useQuery({
    queryKey: ["customers-quick", debouncedCSearch],
    queryFn: () => customersApi.list({ search: debouncedCSearch, pageSize: 8 }),
    enabled: debouncedCSearch.length >= 2 && !selectedCustomerId,
  });

  const vehicleMutation = useMutation({
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
          customerId: selectedCustomerId,
          customerName: selectedCustomerName,
          customerPhone: selectedCustomerPhone,
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

  const customerMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => customersApi.create(payload),
    onSuccess: (res) => {
      if (res.success && res.data) {
        setSelectedCustomerId(res.data);
        setSelectedCustomerName(newCustName.trim());
        setSelectedCustomerPhone(newCustPhone.trim() || null);
        setShowNewCustomer(false);
        setNewCustName(""); setNewCustPhone(""); setNewCustEmail("");
        toast.success("Customer created and assigned");
      }
    },
    onError: () => toast.error("Failed to create customer"),
  });

  // Reset form on close
  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVin(""); setPlateNumber(""); setBrandId(""); setModelId("");
      setYear(String(new Date().getFullYear()));
      setColor(""); setFuelType(""); setTransmission(""); setCurrentMileage("");
      setIsSoldByDealership(false);
      setCustomerSearch(""); setDebouncedCSearch(""); setShowCDropdown(false);
      setSelectedCustomerId(null); setSelectedCustomerName(null); setSelectedCustomerPhone(null);
      setShowNewCustomer(false); setNewCustName(""); setNewCustPhone(""); setNewCustEmail("");
    }
  }, [open]);

  const selectCustomer = (id: string, name: string, phone: string | null) => {
    setSelectedCustomerId(id);
    setSelectedCustomerName(name);
    setSelectedCustomerPhone(phone);
    setCustomerSearch(""); setShowCDropdown(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId(null); setSelectedCustomerName(null); setSelectedCustomerPhone(null);
  };

  const handleSubmit = () => {
    if (!vin.trim())  return toast.error("VIN is required");
    if (!brandId)     return toast.error("Brand is required");
    if (!modelId)     return toast.error("Model is required");
    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > new Date().getFullYear() + 1)
      return toast.error("Invalid year (1990 – " + (new Date().getFullYear() + 1) + ")");

    vehicleMutation.mutate({
      vin: vin.trim().toUpperCase(),
      plateNumber: plateNumber.trim() || null,
      brandId, modelId, year: yearNum,
      color: color || null,
      fuelType: fuelType || null,
      transmission: transmission || null,
      currentMileage: currentMileage ? parseInt(currentMileage) : null,
      isSoldByDealership,
      customerId: selectedCustomerId ?? undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <Input value={vin} onChange={e => setVin(e.target.value)} placeholder="JTMZF33V4MD…" className="uppercase" />
            </div>
            <div className="space-y-1">
              <Label>Plate Number</Label>
              <Input value={plateNumber} onChange={e => setPlateNumber(e.target.value)} placeholder="RAA 123A" />
            </div>
          </div>

          {/* Brand + Model */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Brand <span className="text-red-500">*</span></Label>
              <Select value={brandId} onValueChange={v => { setBrandId(v ?? ""); setModelId(""); }}>
                <SelectTrigger className="w-full">
                  <span className={`flex flex-1 text-left${!brandId ? " text-muted-foreground" : ""}`}>{brandId ? (brands?.find(b => b.id === brandId)?.name ?? "…") : "Select brand"}</span>
                </SelectTrigger>
                <SelectContent>
                  {brands?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Model <span className="text-red-500">*</span></Label>
              <Select value={modelId} onValueChange={v => setModelId(v ?? "")} disabled={!brandId || models.length === 0}>
                <SelectTrigger className="w-full">
                  <span className={`flex flex-1 text-left${!modelId ? " text-muted-foreground" : ""}`}>{modelId ? (models.find(m => m.id === modelId)?.name ?? "…") : (!brandId ? "Select brand first" : "Select model")}</span>
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Year + Color + Mileage */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Year <span className="text-red-500">*</span></Label>
              <Input type="number" min={1990} max={new Date().getFullYear() + 1} value={year} onChange={e => setYear(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <Input value={color} onChange={e => setColor(e.target.value)} placeholder="White" />
            </div>
            <div className="space-y-1">
              <Label>Mileage (km)</Label>
              <Input type="number" min={0} value={currentMileage} onChange={e => setCurrentMileage(e.target.value)} placeholder="0" />
            </div>
          </div>

          {/* Fuel + Transmission */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fuel Type</Label>
              <Select value={fuelType} onValueChange={v => setFuelType(v ?? "")}>
                <SelectTrigger className="w-full"><span className={`flex flex-1 text-left${!fuelType ? " text-muted-foreground" : ""}`}>{fuelType || "Select…"}</span></SelectTrigger>
                <SelectContent>{FUEL_TYPES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Transmission</Label>
              <Select value={transmission} onValueChange={v => setTransmission(v ?? "")}>
                <SelectTrigger className="w-full"><span className={`flex flex-1 text-left${!transmission ? " text-muted-foreground" : ""}`}>{transmission || "Select…"}</span></SelectTrigger>
                <SelectContent>{TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Customer ───────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Customer <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>

            {selectedCustomerId ? (
              /* Selected customer chip */
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{selectedCustomerName}</span>
                  {selectedCustomerPhone && (
                    <span className="text-muted-foreground ml-2 text-xs">{selectedCustomerPhone}</span>
                  )}
                </div>
                <button type="button" onClick={clearCustomer} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Search + create button */
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    placeholder="Search by name or phone…"
                    value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCDropdown(true); }}
                    onFocus={() => setShowCDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCDropdown(false), 150)}
                  />
                  {showCDropdown && debouncedCSearch.length >= 2 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-lg max-h-44 overflow-y-auto">
                      {!customerResults && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Searching…</div>
                      )}
                      {customerResults?.items.length === 0 && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No customer found.{" "}
                          <button
                            type="button"
                            className="text-primary underline"
                            onMouseDown={() => {
                              setShowCDropdown(false);
                              setShowNewCustomer(true);
                              setNewCustName(customerSearch.trim());
                            }}
                          >
                            Create &quot;{customerSearch.trim()}&quot;
                          </button>
                        </div>
                      )}
                      {customerResults?.items.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm border-b last:border-b-0"
                          onMouseDown={() => selectCustomer(c.id, c.fullName, c.phone)}
                        >
                          <span className="font-medium">{c.fullName}</span>
                          {c.phone && <span className="text-muted-foreground ml-2 text-xs">{c.phone}</span>}
                          {c.companyName && <span className="text-muted-foreground ml-1 text-xs">· {c.companyName}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Button
                  type="button" variant="outline" size="icon"
                  title="Create new customer"
                  onClick={() => setShowNewCustomer(v => !v)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Inline new-customer form */}
            {showNewCustomer && !selectedCustomerId && (
              <div className="rounded-md border border-dashed p-3 space-y-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Customer</p>
                <div className="space-y-1">
                  <Label className="text-xs">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={newCustName}
                    onChange={e => setNewCustName(e.target.value)}
                    placeholder="Jean Paul Sem"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Phone</Label>
                    <Input value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} placeholder="+250 788 000 000" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email</Label>
                    <Input type="email" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} placeholder="email@example.com" />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCustomer(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button" size="sm"
                    disabled={!newCustName.trim() || customerMutation.isPending}
                    onClick={() => customerMutation.mutate({
                      fullName: newCustName.trim(),
                      phone: newCustPhone.trim() || null,
                      email: newCustEmail.trim() || null,
                      category: "Retail",
                    })}
                  >
                    {customerMutation.isPending ? "Creating…" : "Create & Assign"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dealership flag */}
          <div className="flex items-center gap-2">
            <Checkbox id="sold-by-dealer" checked={isSoldByDealership} onCheckedChange={c => setIsSoldByDealership(!!c)} />
            <label htmlFor="sold-by-dealer" className="text-sm cursor-pointer">
              Sold by RwandaMotor (Dealership Fleet)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={vehicleMutation.isPending}>
              {vehicleMutation.isPending ? "Adding…" : "Add Vehicle"}
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const serviceTypes = useServiceTypes();

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
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to create job card");
    },
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
      vehicleId:  selectedVehicleId,
      customerId: selectedVehicle?.customerId ?? null,
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
                    {selectedVehicle.isSoldByDealership ? " · Dealership" : " · External"}
                  </span>
                </div>
              )}

              {/* Customer panel — auto-filled from vehicle */}
              {selectedVehicle && (
                <div className={`rounded-md border px-3 py-2 text-sm ${selectedVehicle.customerId ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mr-2">Customer:</span>
                  {selectedVehicle.customerId ? (
                    <span>
                      <span className="font-medium">{selectedVehicle.customerName}</span>
                      {selectedVehicle.customerPhone && (
                        <span className="text-muted-foreground ml-2">· {selectedVehicle.customerPhone}</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">No customer linked to this vehicle</span>
                  )}
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
                  <SelectTrigger className="w-full">
                    <span className="flex flex-1 text-left">
                      {serviceTypes.find(t => t.value === serviceType)?.label ?? serviceTypeLabel(serviceType)}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {serviceTypes.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Technician</Label>
                <Select value={technicianId} onValueChange={v => setTechnicianId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <span className={`flex flex-1 text-left${!technicianId ? " text-muted-foreground" : ""}`}>
                      {technicianId ? (technicians?.find(t => t.id === technicianId)?.fullName ?? "…") : "Unassigned"}
                    </span>
                  </SelectTrigger>
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
                  <SelectTrigger className="w-full"><span className="flex flex-1 text-left">{FUEL_LEVELS.find(f => f.value === fuelLevel)?.label ?? fuelLevel}</span></SelectTrigger>
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
                      onCheckedChange={() => toggleAccessory(acc)}
                    />
                    <label htmlFor={`acc-${acc}`} className="text-sm cursor-pointer">{acc}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Notes ── */}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Customer complaints, visible damage, etc."
              />
            </div>
            <div className="space-y-1">
              <Label>Additional Info</Label>
              <Textarea
                value={additionalInfo}
                onChange={e => setAdditionalInfo(e.target.value)}
                rows={2}
                placeholder="Special instructions or references…"
              />
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

      {/* Add vehicle sub-dialog — rendered as sibling, not nested */}
      <AddVehicleDialog
        open={addVehicleOpen}
        onClose={() => setAddVehicleOpen(false)}
        onCreated={(v) => {
          selectVehicle(v);
          setAddVehicleOpen(false);
        }}
      />
    </>
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
    `Dear ${jobCard.customerName ?? "Customer"},\n\nThank you for visiting RwandaMotor. Please find below the details of your vehicle reception.\n\nJob Card: ${jobCard.jobCardNumber}\nVehicle: ${jobCard.vin}${jobCard.plateNumber ? " (" + jobCard.plateNumber + ")" : ""}\n\nBest regards,\nRwandaMotor Service Team`
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
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="customer@email.com"
            />
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
  return (
    <Suspense>
      <JobCardsContent />
    </Suspense>
  );
}

function JobCardsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAuth();
  const isAdmin    = user?.role === "Admin";
  const canCreate  = hasPermission("jobCards.create");
  const canPrint   = hasPermission("jobCards.print");
  const canShare   = hasPermission("jobCards.share");
  const canConvert = hasPermission("jobCards.convert");
  const serviceTypesForFilter = useServiceTypes();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobCardStatus | "">(() => {
    const s = searchParams.get("status");
    return s === "Open" || s === "Closed" ? (s as JobCardStatus) : "";
  });
  const [serviceTypeFilter, setServiceTypeFilter] = useState<ServiceType | "">("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<JobCardListItem | null>(null);
  const [convertTarget, setConvertTarget] = useState<JobCardListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

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

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => jobCardsApi.deleteMany(ids),
    onSuccess: (res) => {
      toast.success(`${res.data} job card(s) deleted`);
      setSelectedIds(new Set());
      setDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["job-cards"] });
    },
    onError: () => toast.error("Delete failed"),
  });

  const items = data?.items ?? [];
  const pageIds = items.map(jc => jc.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));

  const toggleRow = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const togglePage = () =>
    setSelectedIds(prev => {
      const s = new Set(prev);
      allPageSelected ? pageIds.forEach(id => s.delete(id)) : pageIds.forEach(id => s.add(id));
      return s;
    });

  const handleCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["job-cards"] });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Job Cards</h1>
          <p className="text-muted-foreground text-sm hidden sm:block">
            Vehicle reception records with auto-numbered delivery notes
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && selectedIds.size > 0 && (
            <Button
              variant="destructive" size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete {selectedIds.size} selected
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> New Job Card
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search VIN, plate, customer, number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as JobCardStatus | ""); setPage(1); }}>
          <SelectTrigger className="w-36">
            <span className={`flex flex-1 text-left${!statusFilter ? " text-muted-foreground" : ""}`}>{statusFilter || "All statuses"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceTypeFilter} onValueChange={v => { setServiceTypeFilter(v as ServiceType | ""); setPage(1); }}>
          <SelectTrigger className="w-48">
            <span className={`flex flex-1 text-left${!serviceTypeFilter ? " text-muted-foreground" : ""}`}>
              {serviceTypeFilter
                ? (serviceTypesForFilter.find(t => t.value === serviceTypeFilter)?.label ?? serviceTypeLabel(serviceTypeFilter))
                : "All service types"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All service types</SelectItem>
            {serviceTypesForFilter.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
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
                  {isAdmin && (
                    <th className="px-4 py-3 w-10">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={togglePage}
                        aria-label="Select all on page"
                      />
                    </th>
                  )}
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
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground">Loading…</td>
                  </tr>
                )}
                {!isLoading && data?.items.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground">No job cards found</td>
                  </tr>
                )}
                {data?.items.map(jc => (
                  <tr
                    key={jc.id}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer${selectedIds.has(jc.id) ? " bg-muted/50" : ""}`}
                    onClick={() => router.push(`/job-cards/${jc.id}`)}
                  >
                    {isAdmin && (
                      <td className="px-4 py-3 w-10" onClick={e => { e.stopPropagation(); toggleRow(jc.id); }}>
                        <Checkbox checked={selectedIds.has(jc.id)} onCheckedChange={() => toggleRow(jc.id)} />
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono font-medium text-primary">{jc.jobCardNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{jc.vin}</div>
                      <div className="text-muted-foreground text-xs">{jc.plateNumber ?? "—"} · {jc.year}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{jc.customerName ?? <span className="text-muted-foreground">Unknown</span>}</div>
                      {jc.customerPhone && (
                        <div className="text-xs text-muted-foreground">{jc.customerPhone}</div>
                      )}
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
                        {canPrint && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Print"
                            onClick={() => router.push(`/job-cards/${jc.id}?print=1`)}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                        )}
                        {canShare && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8"
                            title="Share via email"
                            onClick={() => setShareTarget(jc)}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                        {jc.status === "Open" && canConvert && (
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-orange-500"
                            title="Convert to Delivery Note"
                            disabled={convertMutation.isPending}
                            onClick={() => setConvertTarget(jc)}
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        )}
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
                <Button
                  variant="outline" size="sm"
                  disabled={!data.hasPreviousPage}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev
                </Button>
                <Button
                  variant="outline" size="sm"
                  disabled={!data.hasNextPage}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {canCreate && (
        <CreateJobCardDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreated}
        />
      )}
      {shareTarget && (
        <ShareDialog
          jobCard={shareTarget}
          open={true}
          onClose={() => setShareTarget(null)}
        />
      )}

      {/* Convert to Delivery Note — confirmation dialog */}
      {convertTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConvertTarget(null)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Convert to Delivery Note?</h2>
                  <p className="text-sm text-muted-foreground font-mono">{convertTarget.jobCardNumber}</p>
                </div>
              </div>
              <div className="rounded-lg bg-muted/60 border border-border p-4 space-y-1 text-xs text-muted-foreground">
                <p className="font-medium text-foreground text-sm mb-2">This action will:</p>
                <p>✓ Close this job card permanently</p>
                <p>✓ Issue delivery note <span className="font-mono font-medium text-foreground">{"DN" + convertTarget.jobCardNumber.slice(2)}</span></p>
                <p>✓ Auto-create a service record</p>
                <p>✓ Update vehicle next service dates</p>
                {convertTarget.serviceType === "PDI" && (
                  <p className="text-blue-600 dark:text-blue-400">✓ Create sales history entry + schedule welcome call follow-up (PDI)</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">This cannot be undone. The job card will be permanently closed.</p>
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setConvertTarget(null)} disabled={convertMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  disabled={convertMutation.isPending}
                  onClick={() => {
                    const id = convertTarget.id;
                    setConvertTarget(null);
                    convertMutation.mutate(id);
                  }}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  {convertMutation.isPending ? "Converting…" : "Yes, Convert"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete confirmation dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConfirmOpen(false)} />
          <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Delete {selectedIds.size} job card{selectedIds.size !== 1 ? "s" : ""}?</h2>
                  <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-1">
                <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={bulkDeleteMutation.isPending}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={bulkDeleteMutation.isPending}
                  onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {bulkDeleteMutation.isPending ? "Deleting…" : "Yes, Delete"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
