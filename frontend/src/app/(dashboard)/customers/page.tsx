"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  useReactTable, getCoreRowModel, flexRender,
  type ColumnDef, type PaginationState, type RowSelectionState
} from "@tanstack/react-table";
import {
  Search, Users, ChevronLeft, ChevronRight, Car, Plus, Pencil, X,
  Download, Trash2, Building2, User, AlertTriangle, CheckSquare
} from "lucide-react";
import { customersApi, type UpdateCustomerPayload } from "@/lib/api";
import type { CustomerListItem, CustomerCategory, ContactMethod } from "@/types";
import { formatDate, CUSTOMER_CATEGORY_LABELS } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Constants ───────────────────────────────────────────────

const CATEGORY_COLORS: Record<CustomerCategory, string> = {
  Retail:     "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  Corporate:  "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  Government: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
  NGO:        "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
  Fleet:      "bg-orange-50 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400",
  VIP:        "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  External:   "bg-slate-50 dark:bg-slate-900/50 text-slate-600 dark:text-slate-400",
};

const COMPANY_CATEGORIES: CustomerCategory[] = ["Corporate", "Government", "NGO", "Fleet"];

const CATEGORIES: CustomerCategory[] = ["Retail", "Corporate", "Government", "NGO", "Fleet", "VIP", "External"];
const CONTACT_METHODS: ContactMethod[] = ["Phone", "SMS", "Email", "WhatsApp", "InPerson"];

function getCustomerType(c: CustomerListItem): "Company" | "Individual" {
  return COMPANY_CATEGORIES.includes(c.category) || !!c.companyName ? "Company" : "Individual";
}

// ─── CSV Export ───────────────────────────────────────────────

function exportToCsv(rows: CustomerListItem[]) {
  const headers = ["Name", "Type", "Category", "Company", "Phone", "Email", "City", "Address", "Vehicles", "Last Service", "Status"];
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csvRows = [
    headers.join(","),
    ...rows.map(r => [
      escape(r.fullName),
      getCustomerType(r),
      r.category,
      escape(r.companyName),
      escape(r.phone),
      escape(r.email),
      escape(r.city),
      escape(r.address),
      r.vehicleCount,
      r.lastServiceDate ? formatDate(r.lastServiceDate) : "",
      r.isActive ? "Active" : "Inactive",
    ].join(","))
  ];
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Customer Form ────────────────────────────────────────────

interface CustomerFormData {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  preferredContactMethod: ContactMethod;
  category: CustomerCategory;
  companyName: string;
  taxId: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_FORM: CustomerFormData = {
  fullName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  preferredContactMethod: "Phone",
  category: "Retail",
  companyName: "",
  taxId: "",
  notes: "",
  isActive: true,
};

function customerToForm(c: CustomerListItem): CustomerFormData {
  return {
    fullName: c.fullName,
    phone: c.phone ?? "",
    email: c.email ?? "",
    address: c.address ?? "",
    city: c.city ?? "",
    preferredContactMethod: "Phone",
    category: c.category,
    companyName: c.companyName ?? "",
    taxId: "",
    notes: "",
    isActive: c.isActive,
  };
}

// ─── Customer Modal ───────────────────────────────────────────

interface CustomerModalProps {
  title: string;
  form: CustomerFormData;
  onChange: (patch: Partial<CustomerFormData>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
  showIsActive?: boolean;
}

function CustomerModal({ title, form, onChange, onSave, onClose, saving, error, showIsActive }: CustomerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.fullName}
              onChange={e => onChange({ fullName: e.target.value })}
              placeholder="e.g. Jean Pierre Habimana"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => onChange({ category: v as CustomerCategory })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CUSTOMER_CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Contact</Label>
              <Select value={form.preferredContactMethod} onValueChange={v => onChange({ preferredContactMethod: v as ContactMethod })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONTACT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => onChange({ phone: e.target.value })} placeholder="+250 7XX XXX XXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => onChange({ email: e.target.value })} placeholder="name@example.com" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={e => onChange({ companyName: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Tax ID</Label>
              <Input value={form.taxId} onChange={e => onChange({ taxId: e.target.value })} placeholder="Optional" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={e => onChange({ city: e.target.value })} placeholder="e.g. Kigali" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={e => onChange({ address: e.target.value })} placeholder="Street / District" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => onChange({ notes: e.target.value })}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          {showIsActive && (
            <div className="flex items-center gap-3">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={e => onChange({ isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active customer</Label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving || !form.fullName.trim()} className="gradient-primary text-white">
            {saving ? "Saving..." : "Save Customer"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────

interface DeleteConfirmProps {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteConfirmDialog({ count, onConfirm, onCancel, deleting }: DeleteConfirmProps) {
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
            <h3 className="font-semibold text-base">Delete {count} customer{count !== 1 ? "s" : ""}?</h3>
            <p className="text-sm text-muted-foreground mt-0.5">This action cannot be undone.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} disabled={deleting}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : `Delete ${count}`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function CustomersPage() {
  const qc = useQueryClient();
  const { hasPermission } = useAuth();
  const canDeleteCustomers = hasPermission("customers.delete");
  const canEditCustomers   = hasPermission("customers.edit");
  const canCreateCustomers = hasPermission("customers.create");

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<CustomerCategory | "all">("all");
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });

  // Row selection (admin only)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);
  const [editForm, setEditForm] = useState<CustomerFormData>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // When true, the delete targets ALL records matching current filters (not just the selected page rows)
  const [deleteAllRecords, setDeleteAllRecords] = useState(false);

  // Export state
  const [exporting, setExporting] = useState(false);

  // Debounced search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as unknown as { _st?: number })._st);
    (window as unknown as { _st?: number })._st = window.setTimeout(() => {
      setDebouncedSearch(v);
      setPagination(p => ({ ...p, pageIndex: 0 }));
    }, 350) as unknown as number;
  };

  // Data query
  const { data, isLoading } = useQuery({
    queryKey: ["customers", debouncedSearch, category, pagination],
    queryFn: () => customersApi.list({
      search: debouncedSearch || undefined,
      category: category !== "all" ? category : undefined,
      pageNumber: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
    }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () => customersApi.create({
      fullName: createForm.fullName.trim(),
      phone: createForm.phone || null,
      email: createForm.email || null,
      address: createForm.address || null,
      city: createForm.city || null,
      preferredContactMethod: createForm.preferredContactMethod,
      category: createForm.category,
      companyName: createForm.companyName || null,
      taxId: createForm.taxId || null,
      notes: createForm.notes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setCreateError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? "Failed to create customer");
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: (payload: UpdateCustomerPayload) => customersApi.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setEditingCustomer(null);
      setEditError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? "Failed to update customer");
    },
  });

  // Delete selected rows mutation
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => customersApi.deleteMany(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setRowSelection({});
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      console.error("Delete failed:", msg);
      setShowDeleteConfirm(false);
    },
  });

  // Delete ALL matching records mutation (no IDs needed)
  const deleteAllMutation = useMutation({
    mutationFn: () => customersApi.deleteAll({
      search: debouncedSearch || undefined,
      category: category !== "all" ? category : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers"] });
      setRowSelection({});
      setShowDeleteConfirm(false);
      setDeleteAllRecords(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      console.error("Delete all failed:", msg);
      setShowDeleteConfirm(false);
    },
  });

  const openEdit = (c: CustomerListItem) => {
    setEditingCustomer(c);
    setEditForm(customerToForm(c));
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingCustomer) return;
    editMutation.mutate({
      id: editingCustomer.id,
      fullName: editForm.fullName.trim(),
      phone: editForm.phone || null,
      email: editForm.email || null,
      address: editForm.address || null,
      city: editForm.city || null,
      preferredContactMethod: editForm.preferredContactMethod,
      category: editForm.category,
      companyName: editForm.companyName || null,
      taxId: editForm.taxId || null,
      notes: editForm.notes || null,
      isActive: editForm.isActive,
    });
  };

  // Export all matching records
  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await customersApi.list({
        search: debouncedSearch || undefined,
        category: category !== "all" ? category : undefined,
        pageNumber: 1,
        pageSize: 10000,
      });
      exportToCsv(all.items);
    } finally {
      setExporting(false);
    }
  };

  // Selected IDs (page-level)
  const selectedRows = data?.items.filter((_, i) => rowSelection[i]) ?? [];
  const selectedIds = selectedRows.map(r => r.id);
  const allPageSelected = data && data.items.length > 0 && selectedRows.length === data.items.length;
  const totalCount = data?.totalCount ?? 0;
  const hasMultiplePages = totalCount > pagination.pageSize;

  // ─── Columns ─────────────────────────────────────────────────
  const columns: ColumnDef<CustomerListItem>[] = [
    // Checkbox (delete permission only)
    ...(canDeleteCustomers ? [{
      id: "select",
      header: ({ table }: { table: ReturnType<typeof useReactTable<CustomerListItem>> }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          ref={el => { if (el) el.indeterminate = table.getIsSomePageRowsSelected(); }}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      ),
      cell: ({ row }: { row: ReturnType<ReturnType<typeof useReactTable<CustomerListItem>>["getRowModel"]>["rows"][number] }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
          onClick={e => e.stopPropagation()}
        />
      ),
    } as ColumnDef<CustomerListItem>] : []),

    {
      header: "Customer",
      cell: ({ row: { original: c } }) => (
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className="gradient-primary text-white text-xs">
              {c.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <Link
              href={"/customers/" + c.id}
              className="font-medium text-sm text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors"
            >
              {c.fullName}
            </Link>
            {c.companyName && <p className="text-xs text-muted-foreground">{c.companyName}</p>}
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = getCustomerType(row.original);
        return (
          <div className={
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium " +
            (type === "Company"
              ? "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400"
              : "bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400")
          }>
            {type === "Company"
              ? <Building2 className="w-3 h-3" />
              : <User className="w-3 h-3" />}
            {type}
          </div>
        );
      },
    },
    {
      header: "Contact",
      cell: ({ row: { original: c } }) => (
        <div>
          <p className="text-sm">{c.phone ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{c.email ?? ""}</p>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + CATEGORY_COLORS[row.original.category]}>
          {CUSTOMER_CATEGORY_LABELS[row.original.category]}
        </span>
      ),
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row: { original: c } }) => (
        <div>
          <p className="text-sm">{c.city ?? "—"}</p>
          {c.address && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{c.address}</p>}
        </div>
      ),
    },
    {
      header: "Vehicles",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Car className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-semibold text-sm">{row.original.vehicleCount}</span>
        </div>
      ),
    },
    {
      header: "Last Service",
      cell: ({ row }) => (
        <span className="text-sm">{formatDate(row.original.lastServiceDate)}</span>
      ),
    },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? "secondary" : "outline"} className="text-xs">
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => canEditCustomers ? (
        <button
          onClick={() => openEdit(row.original)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Edit customer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      ) : null,
    },
  ];

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    rowCount: data?.totalCount ?? 0,
    state: { pagination, rowSelection },
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: canDeleteCustomers,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, phone, or email..." value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        <Select value={category} onValueChange={v => setCategory(v as CustomerCategory | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CUSTOMER_CATEGORY_LABELS[c]}</SelectItem>)}
          </SelectContent>
        </Select>

        {/* Export button */}
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={handleExport}
          disabled={exporting || isLoading}
        >
          <Download className="w-4 h-4" />
          {exporting ? "Exporting..." : "Export CSV"}
        </Button>

        {/* Delete selected */}
        {canDeleteCustomers && (selectedIds.length > 0 || deleteAllRecords) && (
          <Button
            variant="destructive"
            className="gap-2 shrink-0"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            {deleteAllRecords ? `Delete all ${totalCount}` : `Delete ${selectedIds.length} selected`}
          </Button>
        )}

        {canCreateCustomers && (
          <Button
            className="gradient-primary text-white gap-2 shrink-0"
            onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(null); setShowCreate(true); }}
          >
            <Plus className="w-4 h-4" />
            New Customer
          </Button>
        )}
      </motion.div>

      {/* Count + selection controls */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          {data && (
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium text-foreground">{data.items.length}</span> of{" "}
              <span className="font-medium text-foreground">{data.totalCount}</span> customers
              {canDeleteCustomers && (deleteAllRecords
                ? <span className="ml-2 text-destructive font-medium">· All {totalCount} selected</span>
                : selectedIds.length > 0
                  ? <span className="ml-2 text-primary font-medium">· {selectedIds.length} selected</span>
                  : null
              )}
            </p>
          )}
          {canDeleteCustomers && data && data.items.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              onClick={() => {
                setDeleteAllRecords(false);
                if (Object.keys(rowSelection).length === data.items.length) {
                  setRowSelection({});
                } else {
                  const all: RowSelectionState = {};
                  data.items.forEach((_, i) => { all[i] = true; });
                  setRowSelection(all);
                }
              }}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              {Object.keys(rowSelection).length === data.items.length ? "Deselect all" : "Select all on page"}
            </button>
          )}
        </div>

        {/* "Select all records across pages" banner */}
        {canDeleteCustomers && allPageSelected && hasMultiplePages && !deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-primary/8 border border-primary/20 text-sm"
          >
            <span className="text-foreground">
              All <strong>{data!.items.length}</strong> customers on this page are selected.
            </span>
            <button
              className="font-semibold text-primary hover:underline underline-offset-2 shrink-0"
              onClick={() => setDeleteAllRecords(true)}
            >
              Select all {totalCount} customers instead
            </button>
          </motion.div>
        )}

        {/* "All records selected" banner */}
        {canDeleteCustomers && deleteAllRecords && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg bg-destructive/8 border border-destructive/20 text-sm"
          >
            <span className="text-foreground">
              All <strong>{totalCount}</strong> customers matching current filters are selected.
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
                  <TableCell colSpan={columns.length} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Users className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No customers found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  className={"border-border hover:bg-muted/30 transition-colors " + (row.getIsSelected() ? "bg-primary/5 hover:bg-primary/10" : "")}
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

      {/* Create Modal */}
      {showCreate && (
        <CustomerModal
          title="New Customer"
          form={createForm}
          onChange={patch => setCreateForm(f => ({ ...f, ...patch }))}
          onSave={() => createMutation.mutate()}
          onClose={() => setShowCreate(false)}
          saving={createMutation.isPending}
          error={createError}
          showIsActive={false}
        />
      )}

      {/* Edit Modal */}
      {editingCustomer && (
        <CustomerModal
          title={"Edit — " + editingCustomer.fullName}
          form={editForm}
          onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
          onSave={handleSaveEdit}
          onClose={() => setEditingCustomer(null)}
          saving={editMutation.isPending}
          error={editError}
          showIsActive={true}
        />
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          count={deleteAllRecords ? totalCount : selectedIds.length}
          onConfirm={() => {
            if (deleteAllRecords) {
              deleteAllMutation.mutate();
            } else {
              deleteMutation.mutate(selectedIds);
            }
          }}
          onCancel={() => setShowDeleteConfirm(false)}
          deleting={deleteMutation.isPending || deleteAllMutation.isPending}
        />
      )}
    </div>
  );
}
