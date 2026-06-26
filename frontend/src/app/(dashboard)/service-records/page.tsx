"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type PaginationState
} from "@tanstack/react-table";
import { Search, Wrench, ChevronLeft, ChevronRight, Calendar, Pencil, X, Trash2, CheckSquare } from "lucide-react";
import { serviceRecordsApi, techniciansApi, type UpdateServiceRecordPayload } from "@/lib/api";
import type { ServiceRecordListItem, ServiceType } from "@/types";
import { formatDate, formatMileage, SERVICE_TYPE_LABELS } from "@/lib/utils";
import { useServiceTypes } from "@/hooks/use-service-types";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

// SERVICE_TYPES is now dynamic via useServiceTypes() inside each component

// ── Edit Modal ────────────────────────────────────────────────────────────────

interface EditFormState {
  mileageAtService: string;
  serviceType: string;
  technicianId: string;
  invoiceNumber: string;
  serviceDescription: string;
  notes: string;
  isWarrantyJob: boolean;
  totalCost: string;
}

function EditServiceRecordModal({
  record,
  onClose,
}: {
  record: ServiceRecordListItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<EditFormState>({
    mileageAtService: record.mileageAtService != null ? String(record.mileageAtService) : "",
    serviceType: record.serviceType ?? "",
    technicianId: record.technicianId ?? "",
    invoiceNumber: record.invoiceNumber ?? "",
    serviceDescription: record.serviceDescription ?? "",
    notes: record.notes ?? "",
    isWarrantyJob: record.isWarrantyJob ?? false,
    totalCost: record.totalCost != null ? String(record.totalCost) : "",
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["technicians"],
    queryFn: () => techniciansApi.list(),
  });

  const serviceTypes = useServiceTypes();

  const mutation = useMutation({
    mutationFn: (payload: UpdateServiceRecordPayload) => serviceRecordsApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-records"] });
      onClose();
    },
  });

  function setField(field: keyof EditFormState) {
    return (v: string) => setForm(prev => ({ ...prev, [field]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UpdateServiceRecordPayload = { id: record.id };
    const miles = parseInt(form.mileageAtService, 10);
    if (form.mileageAtService !== "" && !isNaN(miles)) payload.mileageAtService = miles;
    if (form.serviceType) payload.serviceType = form.serviceType;
    if (form.technicianId) payload.technicianId = form.technicianId;
    payload.invoiceNumber = form.invoiceNumber || null;
    payload.serviceDescription = form.serviceDescription || null;
    payload.notes = form.notes || null;
    payload.isWarrantyJob = form.isWarrantyJob;
    const cost = parseFloat(form.totalCost);
    if (form.totalCost !== "" && !isNaN(cost)) payload.totalCost = cost;
    mutation.mutate(payload);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Complete Service Record
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {record.vin} · {record.plateNumber ?? "—"} · {formatDate(record.serviceDate)}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="mileage">Mileage at Service</Label>
              <Input
                id="mileage"
                type="number"
                min={0}
                placeholder="e.g. 35000"
                value={form.mileageAtService}
                onChange={e => setField("mileageAtService")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="totalCost">Total Cost (RWF)</Label>
              <Input
                id="totalCost"
                type="number"
                min={0}
                step="0.01"
                placeholder="e.g. 150000"
                value={form.totalCost}
                onChange={e => setField("totalCost")(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Service Type</Label>
            <Select value={form.serviceType} onValueChange={(v: string | null) => setField("serviceType")(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select service type" />
              </SelectTrigger>
              <SelectContent>
                {serviceTypes.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Technician</Label>
            <Select value={form.technicianId} onValueChange={(v: string | null) => setField("technicianId")(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Assign technician" />
              </SelectTrigger>
              <SelectContent>
                {technicians.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.fullName} ({t.employeeCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invoice">Invoice Number</Label>
            <Input
              id="invoice"
              placeholder="e.g. INV-2024-001"
              value={form.invoiceNumber}
              onChange={e => setField("invoiceNumber")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Service Description</Label>
            <Textarea
              id="desc"
              rows={2}
              placeholder="Work performed..."
              value={form.serviceDescription}
              onChange={e => setField("serviceDescription")(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="Additional notes..."
              value={form.notes}
              onChange={e => setField("notes")(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="warranty"
              checked={form.isWarrantyJob}
              onChange={e => setForm(prev => ({ ...prev, isWarrantyJob: e.target.checked }))}
              className="w-4 h-4 rounded border-border accent-primary"
            />
            <Label htmlFor="warranty" className="cursor-pointer">Warranty Job</Label>
          </div>

          {mutation.isError && (
            <p className="text-sm text-destructive">Failed to save. Please try again.</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Delete Confirm Dialog ─────────────────────────────────────────────────────

function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  deleting,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Delete {count} record{count !== 1 ? "s" : ""}?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              This action cannot be undone. The selected service record{count !== 1 ? "s" : ""} will be permanently deleted.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ServiceRecordsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const canEdit   = hasPermission("serviceRecords.edit");
  const canDelete = hasPermission("serviceRecords.delete");
  const serviceTypesForFilter = useServiceTypes();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [editingRecord, setEditingRecord] = useState<ServiceRecordListItem | null>(null);

  // Delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteAllRecords, setDeleteAllRecords] = useState(false);

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as { _st?: number })._st);
    (window as unknown as { _st?: number })._st = window.setTimeout(() => {
      setDebouncedSearch(v);
      setPagination(p => ({ ...p, pageIndex: 0 }));
    }, 350) as unknown as number;
  };

  const { data, isLoading } = useQuery({
    queryKey: ["service-records", debouncedSearch, serviceType, dateFrom, dateTo, pagination],
    queryFn: () => serviceRecordsApi.list({
      search: debouncedSearch || undefined,
      serviceType: serviceType !== "all" ? serviceType : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      pageNumber: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => serviceRecordsApi.deleteMany(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-records"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => serviceRecordsApi.deleteAll({
      search: debouncedSearch || undefined,
      serviceType: serviceType !== "all" ? serviceType : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["service-records"] });
      qc.invalidateQueries({ queryKey: ["dashboard-kpis"] });
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
  });

  const currentIds = data?.items.map(r => r.id) ?? [];
  const allSelected = currentIds.length > 0 && currentIds.every(id => selectedIds.has(id));
  const someSelected = currentIds.some(id => selectedIds.has(id));
  const totalCount = data?.totalCount ?? 0;
  const hasMultiplePages = totalCount > pagination.pageSize;

  const toggleAll = () => {
    setDeleteAllRecords(false);
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        currentIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const toggleOne = (id: string) => {
    setDeleteAllRecords(false);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const COLUMNS: ColumnDef<ServiceRecordListItem>[] = [
    ...(canDelete ? [{
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
          onChange={toggleAll}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      ),
      cell: ({ row }: { row: { original: ServiceRecordListItem } }) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleOne(row.original.id)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
          onClick={e => e.stopPropagation()}
        />
      ),
    } as ColumnDef<ServiceRecordListItem>] : []),
    {
      header: "Vehicle",
      cell: ({ row: { original: r } }) => (
        <div>
          <p className="font-mono text-xs text-primary">{r.vin}</p>
          <p className="text-sm font-medium">{r.plateNumber ?? "—"} · {r.brandName} {r.modelName}</p>
        </div>
      ),
    },
    { header: "Customer", cell: ({ row }) => <span className="text-sm">{row.original.customerName ?? "—"}</span> },
    {
      header: "Service Date",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{formatDate(row.original.serviceDate)}</p>
          <p className="text-xs text-muted-foreground">{formatMileage(row.original.mileageAtService)}</p>
        </div>
      ),
    },
    {
      accessorKey: "serviceType",
      header: "Service Type",
      cell: ({ row }) => (
        row.original.serviceType
          ? (
            <Badge variant={row.original.isWarrantyJob ? "outline" : "secondary"} className="text-xs">
              {SERVICE_TYPE_LABELS[row.original.serviceType]}
              {row.original.isWarrantyJob && " (Warranty)"}
            </Badge>
          )
          : <span className="text-xs text-muted-foreground italic">Pending</span>
      ),
    },
    { header: "Technician", cell: ({ row }) => <span className="text-sm">{row.original.technicianName ?? "—"}</span> },
    {
      header: "Invoice",
      cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.invoiceNumber ?? "—"}</span>,
    },
    {
      header: "Next Service",
      cell: ({ row }) => (
        <div className="text-xs">
          <p>{formatDate(row.original.nextServiceDate)}</p>
          <p className="text-muted-foreground">{formatMileage(row.original.nextServiceMileage)}</p>
        </div>
      ),
    },
    ...(canEdit
      ? [{
          id: "actions",
          header: "",
          cell: ({ row }: { row: { original: ServiceRecordListItem } }) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setEditingRecord(row.original)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ),
        } as ColumnDef<ServiceRecordListItem>]
      : []),
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns: COLUMNS,
    rowCount: data?.totalCount ?? 0,
    state: { pagination },
    onPaginationChange: setPagination,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      {editingRecord && (
        <EditServiceRecordModal
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={deleteAllRecords ? totalCount : selectedIds.size}
          onConfirm={() => {
            if (deleteAllRecords) deleteAllMutation.mutate();
            else deleteMutation.mutate(Array.from(selectedIds));
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleteMutation.isPending || deleteAllMutation.isPending}
        />
      )}

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search VIN, plate, invoice..." value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <Select value={serviceType} onValueChange={(v: string | null) => { setServiceType((v ?? "all") as ServiceType | "all"); setPagination(p => ({ ...p, pageIndex: 0 })); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {serviceTypesForFilter.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input type="date" className="w-36 text-sm" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }} />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" className="w-36 text-sm" value={dateTo} onChange={e => { setDateTo(e.target.value); setPagination(p => ({ ...p, pageIndex: 0 })); }} />
        </div>
        {canDelete && (selectedIds.size > 0 || deleteAllRecords) && (
          <Button
            variant="destructive"
            className="gap-2 shrink-0"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            {deleteAllRecords
              ? `Delete all ${totalCount}`
              : `Delete ${selectedIds.size} record${selectedIds.size !== 1 ? "s" : ""}`}
          </Button>
        )}
      </motion.div>

      <div className="flex flex-col gap-2">
        {data && (
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{data.items.length}</span> of{" "}
            <span className="font-medium text-foreground">{totalCount}</span> records
            {canDelete && (deleteAllRecords
              ? <span className="ml-2 text-destructive font-medium">· All {totalCount} selected</span>
              : selectedIds.size > 0
                ? <span className="ml-2 text-primary font-medium">· {selectedIds.size} selected</span>
                : null
            )}
          </p>
        )}

        {/* "Select all records across pages" banner */}
        {canDelete && allSelected && hasMultiplePages && !deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary/8 border border-primary/20 text-sm"
          >
            <span className="text-foreground flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-primary" />
              All <strong>{data!.items.length}</strong> records on this page are selected.
            </span>
            <button
              className="font-semibold text-primary hover:underline underline-offset-2 shrink-0"
              onClick={() => setDeleteAllRecords(true)}
            >
              Select all {totalCount} records instead
            </button>
          </motion.div>
        )}

        {/* "All records selected" banner */}
        {canDelete && deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-destructive/8 border border-destructive/20 text-sm"
          >
            <span className="text-foreground">
              All <strong>{totalCount}</strong> service records matching current filters are selected.
            </span>
            <button
              className="font-semibold text-muted-foreground hover:text-foreground hover:underline underline-offset-2 shrink-0"
              onClick={() => { setDeleteAllRecords(false); setSelectedIds(new Set()); }}
            >
              Clear selection
            </button>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="border-border hover:bg-transparent">
                  {hg.headers.map(h => (
                    <TableHead key={h.id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wrench className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No service records found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={"border-border hover:bg-muted/30 transition-colors" + (canDelete && selectedIds.has(row.original.id) ? " bg-primary/5" : "")}
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
    </div>
  );
}
