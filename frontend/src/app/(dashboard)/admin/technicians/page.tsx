"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Wrench, Plus, Pencil, Trash2, X, AlertTriangle } from "lucide-react";
import {
  techniciansApi,
  type TechnicianItem,
  type CreateTechnicianPayload,
  type UpdateTechnicianPayload,
} from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Constants ────────────────────────────────────────────────

const SPECIALIZATIONS = [
  "Electrical & Diagnostics",
  "Engine & Transmission",
  "Body & Suspension",
  "General Service",
  "Air Conditioning",
  "Tyres & Alignment",
  "Brakes & Suspension",
  "Electronics",
  "Quick Service / Lube",
  "Bodywork & Paint",
];

// ─── Form state ───────────────────────────────────────────────

interface TechFormState {
  fullName: string;
  employeeCode: string;
  phone: string;
  email: string;
  specialization: string;
  certificationLevel: string;
  isActive: boolean;
}

const EMPTY_FORM: TechFormState = {
  fullName: "",
  employeeCode: "",
  phone: "",
  email: "",
  specialization: "",
  certificationLevel: "",
  isActive: true,
};

// ─── Modal ────────────────────────────────────────────────────

interface TechModalProps {
  title: string;
  form: TechFormState;
  isCreate: boolean;
  onChange: (patch: Partial<TechFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}

function TechModal({ title, form, isCreate, onChange, onSave, onClose, saving, error }: TechModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            {title}
          </h2>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.fullName}
                onChange={e => onChange({ fullName: e.target.value })}
                placeholder="e.g. Jean Paul Nkurunziza"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Employee Code <span className="text-destructive">*</span></Label>
              <Input
                value={form.employeeCode}
                onChange={e => onChange({ employeeCode: e.target.value })}
                placeholder="e.g. TEC-005"
                className="font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={e => onChange({ phone: e.target.value })}
                placeholder="+250 7XX XXX XXX"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => onChange({ email: e.target.value })}
                placeholder="tech@rwandamotor.com"
              />
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Specialization</Label>
              <select
                value={form.specialization}
                onChange={e => onChange({ specialization: e.target.value })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">— Select specialization —</option>
                {SPECIALIZATIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5 col-span-2">
              <Label>Certification Level</Label>
              <Input
                value={form.certificationLevel}
                onChange={e => onChange({ certificationLevel: e.target.value })}
                placeholder="e.g. Level 3"
              />
            </div>
          </div>

          {!isCreate && (
            <div className="flex items-center gap-3 pt-1">
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={e => onChange({ isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active technician</Label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.fullName.trim() || !form.employeeCode.trim()}
            className="gradient-primary text-white"
          >
            {saving ? "Saving..." : isCreate ? "Create Technician" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────

function DeleteConfirmModal({
  tech,
  onConfirm,
  onClose,
  deleting,
}: {
  tech: TechnicianItem;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold">Delete Technician</h3>
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
          </div>
          <p className="text-sm">
            Are you sure you want to delete <span className="font-medium">{tech.fullName}</span> ({tech.employeeCode})?
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function AdminTechniciansPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // All hooks declared before any early return
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<TechFormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingTech, setEditingTech] = useState<TechnicianItem | null>(null);
  const [editForm, setEditForm] = useState<TechFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingTech, setDeletingTech] = useState<TechnicianItem | null>(null);

  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (user && user.role !== "Admin") router.replace("/dashboard");
  }, [user, router]);

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ["technicians", showAll],
    queryFn: () => techniciansApi.list(!showAll),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateTechnicianPayload) => techniciansApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setCreateError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? "Failed to create technician");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateTechnicianPayload) => techniciansApi.update(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      setEditingTech(null);
      setEditError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? "Failed to update technician");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => techniciansApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["technicians"] });
      setDeletingTech(null);
    },
  });

  if (user?.role !== "Admin") return null;

  const openEdit = (t: TechnicianItem) => {
    setEditingTech(t);
    setEditForm({
      fullName: t.fullName,
      employeeCode: t.employeeCode,
      phone: t.phone ?? "",
      email: t.email ?? "",
      specialization: t.specialization ?? "",
      certificationLevel: t.certificationLevel ?? "",
      isActive: t.isActive,
    });
    setEditError(null);
  };

  const handleCreate = () => {
    createMutation.mutate({
      fullName: createForm.fullName.trim(),
      employeeCode: createForm.employeeCode.trim(),
      phone: createForm.phone || null,
      email: createForm.email || null,
      specialization: createForm.specialization || null,
      certificationLevel: createForm.certificationLevel || null,
    });
  };

  const handleUpdate = () => {
    if (!editingTech) return;
    updateMutation.mutate({
      id: editingTech.id,
      fullName: editForm.fullName.trim(),
      employeeCode: editForm.employeeCode.trim(),
      phone: editForm.phone || null,
      email: editForm.email || null,
      specialization: editForm.specialization || null,
      certificationLevel: editForm.certificationLevel || null,
      isActive: editForm.isActive,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            Technician Management
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage workshop technicians and their details</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(v => !v)}
          >
            {showAll ? "Active only" : "Show all"}
          </Button>
          <Button
            className="gradient-primary text-white gap-2"
            onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(null); setShowCreate(true); }}
          >
            <Plus className="w-4 h-4" />
            New Technician
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card shadow-sm overflow-hidden"
      >
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Code</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Specialization</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phone</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {technicians.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Wrench className="w-10 h-10 opacity-30" />
                      <p className="text-sm">No technicians found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : technicians.map((t) => (
                <TableRow key={t.id} className="border-border hover:bg-muted/30 transition-colors">
                  <TableCell className="py-3">
                    <p className="font-medium text-sm text-foreground">{t.fullName}</p>
                    {t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="font-mono text-xs text-muted-foreground">{t.employeeCode}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm">{t.specialization ?? "—"}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm text-muted-foreground">{t.phone ?? "—"}</span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant="secondary"
                      className={`text-xs ${t.isActive ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
                    >
                      {t.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(t)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit technician"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingTech(t)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete technician"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>

      {showCreate && (
        <TechModal
          title="New Technician"
          form={createForm}
          isCreate={true}
          onChange={patch => setCreateForm(f => ({ ...f, ...patch }))}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          saving={createMutation.isPending}
          error={createError}
        />
      )}

      {editingTech && (
        <TechModal
          title={"Edit — " + editingTech.fullName}
          form={editForm}
          isCreate={false}
          onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
          onSave={handleUpdate}
          onClose={() => setEditingTech(null)}
          saving={updateMutation.isPending}
          error={editError}
        />
      )}

      {deletingTech && (
        <DeleteConfirmModal
          tech={deletingTech}
          onConfirm={() => deleteMutation.mutate(deletingTech.id)}
          onClose={() => setDeletingTech(null)}
          deleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
