"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type PaginationState, type RowSelectionState
} from "@tanstack/react-table";
import {
  Search, Filter, Car, ChevronLeft, ChevronRight,
  Pencil, Check, X, Layers, CheckSquare, SquareDashed,
  Save, AlertTriangle, Trash2, Download
} from "lucide-react";
import { vehiclesApi, type UpdateVehiclePayload, type BulkUpdatePayload } from "@/lib/api";
import type { VehicleListItem, RetentionStatus } from "@/types";
import { RetentionBadge } from "@/components/shared/retention-badge";
import { cn, formatDate, formatMileage } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── Constants ─────────────────────────────────────────────────
const RETENTION_STATUSES: { value: RetentionStatus; label: string }[] = [
  { value: "Active",    label: "Active" },
  { value: "DueSoon",  label: "Due Soon" },
  { value: "Overdue",  label: "Overdue" },
  { value: "Lost",     label: "Lost" },
  { value: "Recovered",label: "Recovered" },
  { value: "External", label: "External" },
];

// ─── Types ──────────────────────────────────────────────────────
interface EditingCell {
  vehicleId: string;
  field: "plateNumber" | "currentMileage" | "notes";
  value: string;
}

interface BulkForm {
  retentionStatus: RetentionStatus | "";
  notesAppend: string;
}

// ─── Small helpers ──────────────────────────────────────────────
function BulkApplyButton({ isPending, count, disabled, onApply }: {
  isPending: boolean; count: number; disabled: boolean; onApply: () => void;
}) {
  return (
    <Button onClick={onApply} disabled={isPending || disabled} className="gap-2">
      {isPending
        ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        : <Save className="w-4 h-4" />}
      Apply to {count} {count === 1 ? "Vehicle" : "Vehicles"}
    </Button>
  );
}

// ─── Delete Confirm Dialog ──────────────────────────────────────
function DeleteConfirmDialog({
  count, onConfirm, onCancel, deleting,
}: { count: number; onConfirm: () => void; onCancel: () => void; deleting: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-base">Delete {count} vehicle{count !== 1 ? "s" : ""}?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting..." : `Delete ${count}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── CSV Export ─────────────────────────────────────────────────
function exportVehiclesToCsv(rows: VehicleListItem[]) {
  const headers = [
    "VIN", "Plate", "Brand", "Model", "Year",
    "Customer", "Phone", "Sale Date",
    "Current Mileage (km)", "Last Service", "Next Service", "Next Service (km)",
    "Retention Status", "Warranty End", "Sold by Dealership",
  ];
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csvRows = [
    headers.join(","),
    ...rows.map(v => [
      escape(v.vin),
      escape(v.plateNumber),
      escape(v.brandName),
      escape(v.modelName),
      v.year,
      escape(v.customerName),
      escape(v.customerPhone),
      v.saleDate ? formatDate(v.saleDate) : "",
      v.currentMileage ?? "",
      v.lastServiceDate ? formatDate(v.lastServiceDate) : "",
      v.nextServiceDate ? formatDate(v.nextServiceDate) : "",
      v.nextServiceMileage ?? "",
      v.retentionStatus,
      v.warrantyEndDate ? formatDate(v.warrantyEndDate) : "",
      v.isSoldByDealership ? "Yes" : "No",
    ].join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `vehicles-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Main Page ──────────────────────────────────────────────────
export default function VehiclesPage() {
  return (
    <Suspense>
      <VehiclesContent />
    </Suspense>
  );
}

function VehiclesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canEditVehicles = hasPermission("vehicles.edit");

  // Filters
  const [search, setSearch]               = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter]   = useState<RetentionStatus | "all">(
    (searchParams.get("status") as RetentionStatus) ?? "all"
  );
  const [isSold, setIsSold]               = useState<"all" | "true" | "false">(
    (searchParams.get("isSoldByDealership") as "true" | "false") ?? "all"
  );
  const [pagination, setPagination]       = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Selection + edit state
  const [rowSelection, setRowSelection]   = useState<RowSelectionState>({});
  const [bulkMode, setBulkMode]           = useState(false);
  const [editingCell, setEditingCell]     = useState<EditingCell | null>(null);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm]           = useState<BulkForm>({ retentionStatus: "", notesAppend: "" });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAllRecords, setDeleteAllRecords]   = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const s = searchParams.get("status") as RetentionStatus | null;
    const sold = searchParams.get("isSoldByDealership") as "true" | "false" | null;
    if (s) setStatusFilter(s);
    if (sold) setIsSold(sold);
  }, [searchParams]);

  const handleSearch = useCallback((v: string) => {
    setSearch(v);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(v);
      setPagination(p => ({ ...p, pageIndex: 0 }));
    }, 350);
  }, []);

  const handleStatusChange = (v: string | null) => {
    const val = v ?? "all";
    setStatusFilter(val as RetentionStatus | "all");
    setPagination(p => ({ ...p, pageIndex: 0 }));
    const params = new URLSearchParams(window.location.search);
    if (val === "all") params.delete("status"); else params.set("status", val);
    router.replace(`/vehicles?${params.toString()}`, { scroll: false });
  };

  // Data
  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", debouncedSearch, statusFilter, isSold, pagination],
    queryFn: () => vehiclesApi.list({
      search: debouncedSearch || undefined,
      retentionStatus: statusFilter !== "all" ? statusFilter : undefined,
      isSoldByDealership: isSold === "all" ? undefined : isSold === "true",
      pageNumber: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  });

  // Mutations
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateVehiclePayload) => vehiclesApi.update(payload),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["vehicles"] }); setEditingCell(null); },
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: BulkUpdatePayload) => vehiclesApi.bulkUpdate(payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setBulkDialogOpen(false);
      setRowSelection({});
      setBulkForm({ retentionStatus: "", notesAppend: "" });
      alert(`${res.data ?? 0} vehicle(s) updated successfully`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => vehiclesApi.deleteMany(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setRowSelection({});
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => vehiclesApi.deleteAll({
      search: debouncedSearch || undefined,
      retentionStatus: statusFilter !== "all" ? statusFilter : undefined,
      isSoldByDealership: isSold === "all" ? undefined : isSold === "true",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setRowSelection({});
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
  });

  // Export — fetches all matching records and downloads as CSV
  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await vehiclesApi.list({
        search: debouncedSearch || undefined,
        retentionStatus: statusFilter !== "all" ? statusFilter : undefined,
        isSoldByDealership: isSold === "all" ? undefined : isSold === "true",
        pageNumber: 1,
        pageSize: 10000,
      });
      exportVehiclesToCsv(all.items);
    } finally {
      setExporting(false);
    }
  };

  // Selection helpers
  const selectedIds = Object.keys(rowSelection).filter(k => rowSelection[k]);
  const selectedVehicleIds = selectedIds
    .map(idx => data?.items[parseInt(idx)]?.id)
    .filter(Boolean) as string[];

  const totalCount = data?.totalCount ?? 0;
  const allPageSelected = data && data.items.length > 0 && selectedVehicleIds.length === data.items.length;
  const hasMultiplePages = totalCount > pagination.pageSize;

  // Inline save
  const saveInlineEdit = () => {
    if (!editingCell) return;
    const payload: UpdateVehiclePayload = { id: editingCell.vehicleId };
    if (editingCell.field === "plateNumber")    payload.plateNumber    = editingCell.value;
    if (editingCell.field === "currentMileage") payload.currentMileage = parseInt(editingCell.value) || undefined;
    if (editingCell.field === "notes")          payload.notes          = editingCell.value;
    updateMutation.mutate(payload);
  };

  // Columns
  const COLUMNS: ColumnDef<VehicleListItem>[] = [
    {
      id: "select",
      header: ({ table }) => bulkMode ? (
        <button
          onClick={() => { setDeleteAllRecords(false); table.toggleAllPageRowsSelected(); }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {table.getIsAllPageRowsSelected()
            ? <CheckSquare className="w-4 h-4" />
            : <SquareDashed className="w-4 h-4" />}
        </button>
      ) : null,
      cell: ({ row }) => bulkMode ? (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      ) : null,
      size: 40,
    },
    {
      accessorKey: "plateNumber",
      header: "Plate",
      cell: ({ row }) => {
        const v = row.original;
        const isEditing = canEditVehicles && editingCell?.vehicleId === v.id && editingCell.field === "plateNumber";
        if (isEditing) return (
          <div className="flex items-center gap-1">
            <Input autoFocus className="h-7 w-28 text-xs font-mono px-2"
              value={editingCell.value}
              onChange={e => setEditingCell(c => c && { ...c, value: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setEditingCell(null); }}
            />
            <button onClick={saveInlineEdit} className="text-emerald-500 hover:text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingCell(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
        return (
          <div className="flex items-center gap-1.5 group">
            <span className="font-mono font-semibold text-foreground text-sm">{v.plateNumber ?? "—"}</span>
            {canEditVehicles && (
              <button
                onClick={() => setEditingCell({ vehicleId: v.id, field: "plateNumber", value: v.plateNumber ?? "" })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "vin",
      header: "VIN",
      cell: ({ row }) => (
        <Link href={`/vehicles/${row.original.id}`} className="font-mono text-xs text-primary hover:underline">
          {row.original.vin}
        </Link>
      ),
    },
    {
      header: "Vehicle",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm text-foreground">{row.original.brandName} {row.original.modelName}</p>
          <p className="text-xs text-muted-foreground">{row.original.year}</p>
        </div>
      ),
    },
    {
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-foreground">{row.original.customerName ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{row.original.customerPhone ?? ""}</p>
        </div>
      ),
    },
    {
      header: "Mileage",
      cell: ({ row }) => {
        const v = row.original;
        const isEditing = canEditVehicles && editingCell?.vehicleId === v.id && editingCell.field === "currentMileage";
        if (isEditing) return (
          <div className="flex items-center gap-1">
            <Input autoFocus type="number" className="h-7 w-24 text-xs px-2"
              value={editingCell.value}
              onChange={e => setEditingCell(c => c && { ...c, value: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter") saveInlineEdit(); if (e.key === "Escape") setEditingCell(null); }}
            />
            <button onClick={saveInlineEdit} className="text-emerald-500 hover:text-emerald-400"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setEditingCell(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
          </div>
        );
        return (
          <div className="flex items-center gap-1.5 group">
            <div>
              <p className="text-sm">{formatDate(v.lastServiceDate)}</p>
              <p className="text-xs text-muted-foreground">{formatMileage(v.currentMileage)}</p>
            </div>
            {canEditVehicles && (
              <button
                onClick={() => setEditingCell({ vehicleId: v.id, field: "currentMileage", value: String(v.currentMileage ?? "") })}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      header: "Next Service",
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{formatDate(row.original.nextServiceDate)}</p>
          <p className="text-xs text-muted-foreground">{formatMileage(row.original.nextServiceMileage)}</p>
        </div>
      ),
    },
    {
      accessorKey: "retentionStatus",
      header: "Status",
      cell: ({ row }) => <RetentionBadge status={row.original.retentionStatus} />,
    },
    {
      header: "Warranty",
      cell: ({ row }) => {
        const expired = row.original.warrantyEndDate && new Date(row.original.warrantyEndDate) < new Date();
        return (
          <Badge variant={expired ? "secondary" : "default"} className="text-xs">
            {expired ? "Expired" : row.original.warrantyEndDate ? formatDate(row.original.warrantyEndDate) : "—"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link href={`/vehicles/${row.original.id}`} className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-primary hover:text-primary/80")}>
          360° View
        </Link>
      ),
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns: COLUMNS,
    rowCount: data?.totalCount ?? 0,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: (updater) => { setDeleteAllRecords(false); setRowSelection(updater); },
    manualPagination: true,
    enableRowSelection: bulkMode,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleBulkApply = () => {
    const status = (bulkForm.retentionStatus || undefined) as RetentionStatus | undefined;
    const append = bulkForm.notesAppend.trim() || undefined;
    bulkMutation.mutate({ vehicleIds: selectedVehicleIds, retentionStatus: status, notesAppend: append });
  };

  const handleBulkStatusChange = (v: string | null) => {
    setBulkForm(f => ({ ...f, retentionStatus: (v ?? "") as RetentionStatus | "" }));
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by VIN, plate, customer, brand..." value={search} onChange={e => handleSearch(e.target.value)} />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {RETENTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={isSold} onValueChange={(v) => { setIsSold((v ?? "all") as "all" | "true" | "false"); setPagination(p => ({ ...p, pageIndex: 0 })); }}>
          <SelectTrigger className="w-40">
            <Car className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vehicles</SelectItem>
            <SelectItem value="true">Dealership Fleet</SelectItem>
            <SelectItem value="false">External</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting || isLoading}
          className="gap-2 shrink-0"
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>

        {canEditVehicles && (
          <Button
            variant={bulkMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setBulkMode(v => !v); setRowSelection({}); setDeleteAllRecords(false); }}
            className="gap-2 shrink-0"
          >
            <Layers className="w-4 h-4" />
            {bulkMode ? "Exit Bulk" : "Bulk Edit"}
          </Button>
        )}
      </motion.div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {bulkMode && selectedVehicleIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5"
          >
            <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-medium text-foreground">
              {deleteAllRecords
                ? <span className="text-destructive font-semibold">All {totalCount} vehicles selected</span>
                : <>{selectedVehicleIds.length} vehicle{selectedVehicleIds.length !== 1 ? "s" : ""} selected</>}
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => { setRowSelection({}); setDeleteAllRecords(false); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Clear
            </Button>
            {!deleteAllRecords && (
              <Button size="sm" onClick={() => setBulkDialogOpen(true)} className="gap-2">
                <Save className="w-3.5 h-3.5" /> Apply Changes
              </Button>
            )}
            {hasPermission("vehicles.delete") && (
              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteAllRecords ? `Delete all ${totalCount}` : `Delete ${selectedVehicleIds.length}`}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats + "select all records" banners */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          {data && (
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{data.items.length}</span> of{" "}
              <span className="font-medium text-foreground">{totalCount}</span> vehicles
              {statusFilter !== "all" && (
                <span className="ml-2">
                  · filtered by <span className="font-medium text-foreground">{statusFilter}</span>
                  <button onClick={() => handleStatusChange("all")} className="ml-1.5 text-primary hover:underline text-xs">clear</button>
                </span>
              )}
              {bulkMode && deleteAllRecords && (
                <span className="ml-2 text-destructive font-medium">· All {totalCount} selected</span>
              )}
              {bulkMode && !deleteAllRecords && selectedVehicleIds.length > 0 && (
                <span className="ml-2 text-primary font-medium">· {selectedVehicleIds.length} selected</span>
              )}
            </p>
          )}
        </div>

        {/* "Select all records across pages" banner */}
        {hasPermission("vehicles.delete") && bulkMode && allPageSelected && hasMultiplePages && !deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary/8 border border-primary/20 text-sm"
          >
            <span className="text-foreground">
              All <strong>{data!.items.length}</strong> vehicles on this page are selected.
            </span>
            <button
              className="font-semibold text-primary hover:underline underline-offset-2 shrink-0"
              onClick={() => setDeleteAllRecords(true)}
            >
              Select all {totalCount} vehicles instead
            </button>
          </motion.div>
        )}

        {/* "All records selected" banner */}
        {hasPermission("vehicles.delete") && bulkMode && deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-destructive/8 border border-destructive/20 text-sm"
          >
            <span className="text-foreground">
              All <strong>{totalCount}</strong> vehicles matching current filters are selected.
            </span>
            <button
              className="font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-2 shrink-0"
              onClick={() => { setDeleteAllRecords(false); setRowSelection({}); }}
            >
              Clear selection
            </button>
          </motion.div>
        )}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="border-border hover:bg-transparent">
                  {hg.headers.map(h => (
                    <TableHead key={h.id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Car className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No vehicles found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "border-border hover:bg-muted/30 transition-colors",
                    row.getIsSelected() && "bg-primary/5 hover:bg-primary/10"
                  )}
                  onClick={bulkMode ? () => { setDeleteAllRecords(false); row.toggleSelected(); } : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Pagination */}
      {data && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {pagination.pageIndex + 1} of {data.totalPages}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Bulk Edit — {selectedVehicleIds.length} Vehicle{selectedVehicleIds.length !== 1 ? "s" : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-3 py-2 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Only filled fields will be applied. Leave blank to keep existing values.
            </div>
            <div className="space-y-1.5">
              <Label>Retention Status</Label>
              <Select value={bulkForm.retentionStatus} onValueChange={handleBulkStatusChange}>
                <SelectTrigger><SelectValue placeholder="— keep unchanged —" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— keep unchanged —</SelectItem>
                  {RETENTION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Append to Notes</Label>
              <Input
                placeholder="Text to append to selected vehicles' notes…"
                value={bulkForm.notesAppend}
                onChange={e => setBulkForm(f => ({ ...f, notesAppend: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">This text will be appended, not replace, existing notes.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancel</Button>
            <BulkApplyButton
              isPending={bulkMutation.isPending}
              count={selectedVehicleIds.length}
              disabled={!bulkForm.retentionStatus && !bulkForm.notesAppend.trim()}
              onApply={handleBulkApply}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={deleteAllRecords ? totalCount : selectedVehicleIds.length}
          onConfirm={() => {
            if (deleteAllRecords) deleteAllMutation.mutate();
            else deleteMutation.mutate(selectedVehicleIds);
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleteMutation.isPending || deleteAllMutation.isPending}
        />
      )}
    </div>
  );
}
