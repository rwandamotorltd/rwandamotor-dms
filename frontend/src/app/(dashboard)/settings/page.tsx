"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings, Hash, AlertTriangle, Users, ShieldCheck,
  Plus, Pencil, Trash2, X, Eye, EyeOff, KeyRound, Building2, Save,
  ChevronDown, ChevronRight, Database, Car, Wrench, Upload, Download
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  adminApi, permissionGroupsApi, companySettingsApi, catalogueApi,
  type UserItem, type CreateUserPayload, type UpdateUserPayload,
  type PermissionGroupItem, type CreatePermissionGroupPayload,
  type CatalogueBrandDto, type CatalogueModelDto, type BulkImportCatalogueResult,
} from "@/lib/api";
import { jobCardsApi } from "@/lib/api";
import type { CompanySettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────

const ROLES = ["Admin", "TechnicalDirector", "CRMOfficer", "CRE"];

const ROLE_COLORS: Record<string, string> = {
  Admin:             "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  TechnicalDirector: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  CRMOfficer:        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  CRE:               "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
};

// ─── Permission Matrix ────────────────────────────────────────

type PermLevel = "none" | "view" | "edit" | "full";

interface ModuleDef {
  key: string;
  label: string;
  levels: PermLevel[];
  keys: Partial<Record<PermLevel, string[]>>;
}

const MODULES: ModuleDef[] = [
  {
    key: "dashboard", label: "Dashboard",
    levels: ["none", "view"],
    keys: {
      view: ["nav.dashboard", "dashboard.kpi", "dashboard.retention", "dashboard.jobCardsWidget"],
    },
  },
  {
    key: "vehicles", label: "Vehicles",
    levels: ["none", "view", "edit", "full"],
    keys: {
      view: ["nav.vehicles"],
      edit: ["nav.vehicles", "vehicles.create", "vehicles.edit"],
      full: ["nav.vehicles", "vehicles.create", "vehicles.edit", "vehicles.delete"],
    },
  },
  {
    key: "customers", label: "Customers",
    levels: ["none", "view", "edit", "full"],
    keys: {
      view: ["nav.customers"],
      edit: ["nav.customers", "customers.create", "customers.edit"],
      full: ["nav.customers", "customers.create", "customers.edit", "customers.delete"],
    },
  },
  {
    key: "serviceRecords", label: "Service Records",
    levels: ["none", "view", "edit", "full"],
    keys: {
      view: ["nav.serviceRecords"],
      edit: ["nav.serviceRecords", "serviceRecords.create", "serviceRecords.edit"],
      full: ["nav.serviceRecords", "serviceRecords.create", "serviceRecords.edit", "serviceRecords.delete"],
    },
  },
  {
    key: "jobCards", label: "Job Cards",
    levels: ["none", "view", "edit", "full"],
    keys: {
      view: ["nav.jobCards"],
      edit: ["nav.jobCards", "jobCards.create", "jobCards.edit", "jobCards.convert", "jobCards.print", "jobCards.share"],
      full: ["nav.jobCards", "jobCards.create", "jobCards.edit", "jobCards.convert", "jobCards.print", "jobCards.share", "jobCards.delete"],
    },
  },
  {
    key: "retention", label: "Retention",
    levels: ["none", "view", "full"],
    keys: {
      view: ["nav.retention"],
      full: ["nav.retention", "retention.manage"],
    },
  },
  {
    key: "import", label: "Import Center",
    levels: ["none", "view"],
    keys: {
      view: ["nav.import"],
    },
  },
  {
    key: "settings", label: "Settings",
    levels: ["none", "view", "full"],
    keys: {
      view: ["nav.settings"],
      full: ["nav.settings", "settings.users", "settings.company", "settings.groups"],
    },
  },
  {
    key: "salesRecords", label: "Sales Records",
    levels: ["none", "view"],
    keys: {
      view: ["nav.sales"],
    },
  },
  {
    key: "activity", label: "Activity Log",
    levels: ["none", "view"],
    keys: {
      view: ["nav.activity"],
    },
  },
];

const LEVEL_LABELS: Record<PermLevel, string> = {
  none: "None",
  view: "View only",
  edit: "Edit",
  full: "Full",
};

const ALL_LEVELS: PermLevel[] = ["none", "view", "edit", "full"];

function keysToLevel(mod: ModuleDef, permissions: string[]): PermLevel {
  for (const level of (["full", "edit", "view"] as PermLevel[])) {
    if (!mod.levels.includes(level)) continue;
    const required = mod.keys[level] ?? [];
    if (required.length > 0 && required.every(k => permissions.includes(k))) return level;
  }
  return "none";
}

function permissionsToLevels(permissions: string[]): Record<string, PermLevel> {
  return Object.fromEntries(MODULES.map(m => [m.key, keysToLevel(m, permissions)]));
}

function levelsToPermissions(levels: Record<string, PermLevel>): string[] {
  const keys = new Set<string>();
  for (const mod of MODULES) {
    const level = levels[mod.key] ?? "none";
    for (const k of mod.keys[level] ?? []) keys.add(k);
  }
  return [...keys];
}

function PermissionMatrix({
  levels,
  onChange,
}: {
  levels: Record<string, PermLevel>;
  onChange: (levels: Record<string, PermLevel>) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden text-sm">
      <div className="grid grid-cols-5 bg-muted/50 border-b border-border">
        <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Module</div>
        {ALL_LEVELS.map(l => (
          <div key={l} className="px-1 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {LEVEL_LABELS[l]}
          </div>
        ))}
      </div>
      {MODULES.map((mod, i) => (
        <div key={mod.key} className={`grid grid-cols-5 border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
          <div className="px-3 py-2.5 font-medium text-sm flex items-center">{mod.label}</div>
          {ALL_LEVELS.map(level => {
            const supported = mod.levels.includes(level);
            const selected = levels[mod.key] === level;
            return (
              <div key={level} className="flex items-center justify-center py-2.5">
                {supported ? (
                  <button
                    type="button"
                    onClick={() => onChange({ ...levels, [mod.key]: level })}
                    className={`w-4 h-4 rounded-full border-2 transition-colors ${
                      selected ? "bg-primary border-primary" : "border-muted-foreground/30 hover:border-primary/60"
                    }`}
                    aria-label={`Set ${mod.label} to ${LEVEL_LABELS[level]}`}
                  />
                ) : (
                  <span className="text-muted-foreground/20 select-none">—</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── User Form Modal ──────────────────────────────────────────

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
  permissionGroupId: string;
  useCustomPermissions: boolean;
  customPermissions: string[];
}

const EMPTY_USER_FORM: UserFormState = {
  fullName: "", email: "", password: "", role: "CRE", isActive: true, permissionGroupId: "",
  useCustomPermissions: false, customPermissions: [],
};

function UserModal({
  title, form, isCreate, groups, onChange, onSave, onClose, saving, error,
}: {
  title: string;
  form: UserFormState;
  isCreate: boolean;
  groups: PermissionGroupItem[];
  onChange: (patch: Partial<UserFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" /> {title}
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

          <div className="space-y-1.5">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input value={form.fullName} onChange={e => onChange({ fullName: e.target.value })} placeholder="Jean Pierre Habimana" />
          </div>

          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input type="email" value={form.email} onChange={e => onChange({ email: e.target.value })}
              placeholder="user@rwandamotor.com" disabled={!isCreate} />
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={form.password}
                  onChange={e => onChange({ password: e.target.value })} placeholder="Min. 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => onChange({ role: v ?? "CRE" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ useCustomPermissions: false, customPermissions: [] })}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${!form.useCustomPermissions ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                Permission Group
              </button>
              <button
                type="button"
                onClick={() => onChange({ useCustomPermissions: true, permissionGroupId: "", customPermissions: form.customPermissions.length > 0 ? form.customPermissions : levelsToPermissions(Object.fromEntries(MODULES.map(m => [m.key, "none"]))) })}
                className={`flex-1 py-1.5 px-3 rounded-lg border text-xs font-medium transition-colors ${form.useCustomPermissions ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >
                Custom Permissions
              </button>
            </div>

            {!form.useCustomPermissions ? (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Group (overrides role defaults)</Label>
                <Select value={form.permissionGroupId} onValueChange={v => onChange({ permissionGroupId: v ?? "" })}>
                  <SelectTrigger>
                    <span className={!form.permissionGroupId ? "text-muted-foreground" : ""}>
                      {form.permissionGroupId
                        ? (groups.find(g => g.id === form.permissionGroupId)?.name ?? "…")
                        : "Use role defaults"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Use role defaults</SelectItem>
                    {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Module permissions for this user</Label>
                <PermissionMatrix
                  levels={permissionsToLevels(form.customPermissions)}
                  onChange={levels => onChange({ customPermissions: levelsToPermissions(levels) })}
                />
              </div>
            )}
          </div>

          {!isCreate && (
            <div className="flex items-center gap-3 pt-1">
              <input id="isActive" type="checkbox" checked={form.isActive}
                onChange={e => onChange({ isActive: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-primary" />
              <Label htmlFor="isActive" className="cursor-pointer">Active user</Label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={onSave}
            disabled={saving || !form.fullName.trim() || !form.email.trim() || (isCreate && !form.password.trim())}
            className="gradient-primary text-white">
            {saving ? "Saving…" : isCreate ? "Create User" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Reset Password Modal ─────────────────────────────────────

function ResetPasswordModal({
  user: target, onClose, onSave, saving, error,
}: {
  user: UserItem; onClose: () => void; onSave: (pwd: string) => void; saving: boolean; error?: string | null;
}) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const mismatch = confirm.length > 0 && pwd !== confirm;
  const valid = pwd.length >= 8 && pwd === confirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4" /> Reset Password</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">New password for <span className="font-medium text-foreground">{target.fullName}</span></p>
          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">{error}</div>}
          <div className="space-y-1.5">
            <Label>New Password</Label>
            <div className="relative">
              <Input type={show ? "text" : "password"} value={pwd} onChange={e => setPwd(e.target.value)}
                placeholder="Min. 8 characters" className="pr-10" />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Confirm</Label>
            <Input type={show ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)}
              className={mismatch ? "border-destructive" : ""} />
            {mismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave(pwd)} disabled={saving || !valid} className="gradient-primary text-white">
            {saving ? "Resetting…" : "Reset Password"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Permission Group Modal ───────────────────────────────────

function PermissionGroupModal({
  title, initial, onSave, onClose, saving, error,
}: {
  title: string;
  initial: { name: string; description: string; permissions: string[] };
  onSave: (data: CreatePermissionGroupPayload) => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}) {
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [levels, setLevels] = useState<Record<string, PermLevel>>(() => permissionsToLevels(initial.permissions));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5 flex-1">
          {error && <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">{error}</div>}

          <div className="space-y-1.5">
            <Label>Group Name <span className="text-destructive">*</span></Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Reception Staff" />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-sm font-semibold">Permissions</Label>
            <PermissionMatrix levels={levels} onChange={setLevels} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), description: description.trim() || null, permissions: levelsToPermissions(levels) })}
            disabled={saving || !name.trim()} className="gradient-primary text-white">
            {saving ? "Saving…" : "Save Group"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────

function UsersTab({ groups }: { groups: PermissionGroupItem[] }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.getUsers(),
  });

  const createMutation = useMutation({
    mutationFn: (p: CreateUserPayload) => adminApi.createUser(p),
    onSuccess: res => {
      if (!res.success) { setCreateError(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false); setCreateForm(EMPTY_USER_FORM); setCreateError(null);
      toast.success("User created");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setCreateError(e?.response?.data?.message ?? "Failed to create user"),
  });

  const updateMutation = useMutation({
    mutationFn: (p: UpdateUserPayload) => adminApi.updateUser(p),
    onSuccess: res => {
      if (!res.success) { setEditError(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null); setEditError(null);
      toast.success("User updated");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setEditError(e?.response?.data?.message ?? "Failed to update user"),
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) => adminApi.resetPassword(id, pwd),
    onSuccess: res => {
      if (!res.success) { setResetError(res.message ?? "Failed"); return; }
      setResetUser(null); setResetError(null);
      toast.success("Password reset");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setResetError(e?.response?.data?.message ?? "Failed to reset password"),
  });

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditForm({
      fullName: u.fullName, email: u.email, password: "", role: u.role, isActive: u.isActive,
      permissionGroupId: u.permissionGroupId ?? "",
      useCustomPermissions: u.customPermissions.length > 0,
      customPermissions: u.customPermissions,
    });
    setEditError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage system users and their access levels</p>
        <Button onClick={() => { setCreateForm(EMPTY_USER_FORM); setCreateError(null); setShowCreate(true); }}
          className="gradient-primary text-white gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">New User</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">User</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Email</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase">Role</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Permission Group</TableHead>
                  <TableHead className="text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found</TableCell></TableRow>
                ) : users.map(u => (
                  <TableRow key={u.id} className="border-border hover:bg-muted/30">
                    <TableCell className="py-3">
                      <p className="font-medium text-sm">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                    </TableCell>
                    <TableCell className="py-3 hidden sm:table-cell text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="py-3">
                      <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground")}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 hidden md:table-cell">
                      {u.customPermissions.length > 0
                        ? <Badge variant="outline" className="text-xs border-primary/40 text-primary">Custom</Badge>
                        : u.permissionGroupName
                        ? <Badge variant="outline" className="text-xs">{u.permissionGroupName}</Badge>
                        : <span className="text-xs text-muted-foreground">Role defaults</span>}
                    </TableCell>
                    <TableCell className="py-3 hidden sm:table-cell">
                      <Badge variant={u.isActive ? "secondary" : "outline"} className="text-xs">
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setResetUser(u); setResetError(null); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors" title="Reset password">
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {showCreate && (
        <UserModal title="New User" form={createForm} isCreate groups={groups}
          onChange={p => setCreateForm(f => ({ ...f, ...p }))}
          onSave={() => createMutation.mutate({ fullName: createForm.fullName.trim(), email: createForm.email.trim(), password: createForm.password, role: createForm.role, permissionGroupId: createForm.permissionGroupId || null, customPermissions: createForm.useCustomPermissions ? createForm.customPermissions : null })}
          onClose={() => setShowCreate(false)} saving={createMutation.isPending} error={createError} />
      )}

      {editingUser && (
        <UserModal title={`Edit — ${editingUser.fullName}`} form={editForm} isCreate={false} groups={groups}
          onChange={p => setEditForm(f => ({ ...f, ...p }))}
          onSave={() => updateMutation.mutate({ userId: editingUser.id, fullName: editForm.fullName.trim(), role: editForm.role, isActive: editForm.isActive, permissionGroupId: editForm.permissionGroupId || null, customPermissions: editForm.useCustomPermissions ? editForm.customPermissions : null })}
          onClose={() => setEditingUser(null)} saving={updateMutation.isPending} error={editError} />
      )}

      {resetUser && (
        <ResetPasswordModal user={resetUser}
          onSave={pwd => resetMutation.mutate({ id: resetUser.id, pwd })}
          onClose={() => setResetUser(null)} saving={resetMutation.isPending} error={resetError} />
      )}
    </div>
  );
}

// ─── Permission Groups Tab ────────────────────────────────────

function PermGroupsTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PermissionGroupItem | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["permission-groups"],
    queryFn: () => permissionGroupsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (p: CreatePermissionGroupPayload) => permissionGroupsApi.create(p),
    onSuccess: res => {
      if (!res.success) { setCreateError(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["permission-groups"] });
      setShowCreate(false); setCreateError(null);
      toast.success("Permission group created");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setCreateError(e?.response?.data?.message ?? "Failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...p }: { id: string } & CreatePermissionGroupPayload) =>
      permissionGroupsApi.update(id, p),
    onSuccess: res => {
      if (!res.success) { setEditError(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["permission-groups"] });
      setEditing(null); setEditError(null);
      toast.success("Permission group updated");
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      setEditError(e?.response?.data?.message ?? "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => permissionGroupsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permission-groups"] });
      toast.success("Group deleted");
    },
    onError: () => toast.error("Failed to delete group"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Create reusable permission sets and assign them to users</p>
        <Button onClick={() => { setCreateError(null); setShowCreate(true); }} className="gradient-primary text-white gap-2">
          <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Group</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No permission groups yet. Create one to override role defaults.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <Card key={g.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{g.name}</h3>
                      <Badge variant="secondary" className="text-xs">{g.permissions.length} permissions</Badge>
                    </div>
                    {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {g.permissions.slice(0, 8).map(p => (
                        <span key={p} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{p}</span>
                      ))}
                      {g.permissions.length > 8 && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">+{g.permissions.length - 8} more</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => { setEditing(g); setEditError(null); }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${g.name}"? Users assigned to this group will revert to role defaults.`))
                          deleteMutation.mutate(g.id);
                      }}
                      className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showCreate && (
        <PermissionGroupModal title="New Permission Group"
          initial={{ name: "", description: "", permissions: [] }}
          onSave={data => createMutation.mutate(data)}
          onClose={() => setShowCreate(false)} saving={createMutation.isPending} error={createError} />
      )}

      {editing && (
        <PermissionGroupModal title={`Edit — ${editing.name}`}
          initial={{ name: editing.name, description: editing.description ?? "", permissions: editing.permissions }}
          onSave={data => updateMutation.mutate({ id: editing.id, ...data })}
          onClose={() => setEditing(null)} saving={updateMutation.isPending} error={editError} />
      )}
    </div>
  );
}

// ─── Sequence Override Tab ────────────────────────────────────

function SequenceTab() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [startingSequence, setStartingSequence] = useState(1);

  const mutation = useMutation({
    mutationFn: () => jobCardsApi.updateSequence(year, startingSequence),
    onSuccess: () => toast.success(`Sequence for ${year} reset — first card: OR${String(year).slice(-2)}${String(startingSequence).padStart(5, "0")}`),
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e?.response?.data?.message ?? "Failed to update sequence"),
  });

  const preview = `OR${String(year).slice(-2)}${String(startingSequence).padStart(5, "0")}`;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Hash className="w-4 h-4" /> Job Card Sequence Override</CardTitle>
        <CardDescription>Set the starting number for job card IDs in a given year. Resets the counter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input type="number" min={2020} max={2099} value={year} onChange={e => setYear(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Starting Number</Label>
            <Input type="number" min={1} value={startingSequence} onChange={e => setStartingSequence(Number(e.target.value))} />
          </div>
        </div>

        <div className="rounded-md bg-muted px-4 py-3 text-sm">
          First job card for <span className="font-medium">{year}</span> will be:{" "}
          <span className="font-mono font-bold text-primary">{preview}</span>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            This <strong>resets the counter</strong>. Next cards: {preview},{" "}
            {`OR${String(year).slice(-2)}${String(startingSequence + 1).padStart(5, "0")}`},{" "}
            {`OR${String(year).slice(-2)}${String(startingSequence + 2).padStart(5, "0")}`}…
          </span>
        </div>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || startingSequence < 1 || year < 2020} size="sm">
          {mutation.isPending ? "Saving…" : "Save Sequence"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Company Tab ───────────────────────────────────────────────

const EMPTY_COMPANY: CompanySettings = {
  companyName: "RwandaMotor",
  address: null,
  phone: null,
  email: null,
  tinNumber: null,
  website: null,
  jobCardShowHeader: true,
  jobCardShowFooter: true,
  deliveryNoteShowHeader: true,
  deliveryNoteShowFooter: true,
  footerDisclaimer: "RwandaMotor declines all responsibility for materials not listed above.",
};

function CompanyTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
  });

  const [form, setForm] = useState<CompanySettings>(EMPTY_COMPANY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => companySettingsApi.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Company settings saved");
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? "Failed to save company settings";
      toast.error(msg);
    },
  });

  const patch = (p: Partial<CompanySettings>) => setForm(f => ({ ...f, ...p }));

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" /> Company Information
          </CardTitle>
          <CardDescription>
            These details appear on printed documents (job cards, delivery notes).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Company Name <span className="text-destructive">*</span></Label>
              <Input value={form.companyName} onChange={e => patch({ companyName: e.target.value })} placeholder="RwandaMotor" />
            </div>
            <div className="space-y-1.5">
              <Label>TIN Number</Label>
              <Input value={form.tinNumber ?? ""} onChange={e => patch({ tinNumber: e.target.value || null })} placeholder="000000000" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={e => patch({ phone: e.target.value || null })} placeholder="+250 788 000 000" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email ?? ""} onChange={e => patch({ email: e.target.value || null })} placeholder="admin@rwandamotor.com" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Address</Label>
              <Input value={form.address ?? ""} onChange={e => patch({ address: e.target.value || null })} placeholder="KG 123 St, Kigali, Rwanda" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Website</Label>
              <Input value={form.website ?? ""} onChange={e => patch({ website: e.target.value || null })} placeholder="www.rwandamotor.com" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Print Configuration</CardTitle>
          <CardDescription>
            Control which sections appear on each document type when printed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Job Card toggles */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-medium">Job Card</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.jobCardShowHeader}
                  onChange={e => patch({ jobCardShowHeader: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Show company header</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.jobCardShowFooter}
                  onChange={e => patch({ jobCardShowFooter: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Show footer disclaimer</span>
              </label>
            </div>

            {/* Delivery Note toggles */}
            <div className="rounded-lg border border-border p-4 space-y-3">
              <p className="text-sm font-medium">Delivery Note</p>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.deliveryNoteShowHeader}
                  onChange={e => patch({ deliveryNoteShowHeader: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Show company header</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.deliveryNoteShowFooter}
                  onChange={e => patch({ deliveryNoteShowFooter: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Show footer disclaimer</span>
              </label>
            </div>
          </div>

          {/* Footer disclaimer text */}
          <div className="space-y-1.5">
            <Label>Footer Disclaimer / Terms</Label>
            <textarea
              className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={form.footerDisclaimer ?? ""}
              onChange={e => patch({ footerDisclaimer: e.target.value || null })}
              placeholder="RwandaMotor declines all responsibility for materials not listed above."
            />
            <p className="text-xs text-muted-foreground">
              Appears at the bottom of printed documents when footer is enabled.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="gap-2">
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving…" : "Save Company Settings"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────

// ─── Catalogue Tab ─────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: { key: string; label: string }[] = [
  { key: "RoutineMaintenance",     label: "Routine Maintenance" },
  { key: "OilChange",             label: "Oil Change" },
  { key: "MajorService",          label: "Major Service" },
  { key: "TyreRotation",          label: "Tyre Rotation" },
  { key: "BrakeService",          label: "Brake Service" },
  { key: "TransmissionService",   label: "Transmission Service" },
  { key: "AirConditioningService",label: "Air Conditioning" },
  { key: "ElectricalDiagnostics", label: "Electrical Diagnostics" },
  { key: "BodyRepair",            label: "Body Repair" },
  { key: "WarrantyRepair",        label: "Warranty Repair" },
  { key: "RecallRepair",          label: "Recall Repair" },
  { key: "PDI",                   label: "PDI (Pre-Delivery Inspection)" },
  { key: "EmergencyRepair",       label: "Emergency Repair" },
  { key: "Inspection",            label: "Inspection" },
  { key: "Other",                 label: "Other" },
];

interface BrandForm { name: string; code: string; country: string; }
interface ModelForm  { name: string; code: string; segment: string; }

function CatalogueTab() {
  const qc = useQueryClient();
  const [importing, setImporting]      = useState(false);
  const fileInputRef                   = useRef<HTMLInputElement>(null);
  const [expandedBrand, setExpanded]   = useState<string | null>(null);
  const [editingBrand,  setEditBrand]  = useState<CatalogueBrandDto | null>(null);
  const [addingBrand,   setAddBrand]   = useState(false);
  const [editingModel,  setEditModel]  = useState<(CatalogueModelDto & { brandId: string }) | null>(null);
  const [addingModel,   setAddModel]   = useState<string | null>(null); // brandId
  const [brandForm,     setBrandForm]  = useState<BrandForm>({ name: "", code: "", country: "" });
  const [modelForm,     setModelForm]  = useState<ModelForm>({ name: "", code: "", segment: "" });

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["catalogue-brands"],
    queryFn:  () => catalogueApi.getBrands(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["catalogue-brands"] });
    qc.invalidateQueries({ queryKey: ["brands"] });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const r: BulkImportCatalogueResult = await catalogueApi.bulkImport(file);
      const parts: string[] = [];
      if (r.brandsCreated)  parts.push(`${r.brandsCreated} brand${r.brandsCreated !== 1 ? "s" : ""} created`);
      if (r.modelsCreated)  parts.push(`${r.modelsCreated} model${r.modelsCreated !== 1 ? "s" : ""} created`);
      if (!parts.length)    parts.push("nothing new to import");
      toast.success(`Import complete — ${parts.join(", ")}`);
      invalidate();
    } catch {
      toast.error("Import failed — check the file format and try again");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const createBrand = useMutation({
    mutationFn: () => catalogueApi.createBrand({ name: brandForm.name, code: brandForm.code, country: brandForm.country || undefined }),
    onSuccess: () => { toast.success("Brand created"); setAddBrand(false); setBrandForm({ name: "", code: "", country: "" }); invalidate(); },
    onError:   () => toast.error("Failed to create brand"),
  });

  const updateBrand = useMutation({
    mutationFn: (b: CatalogueBrandDto) => catalogueApi.updateBrand(b.id, { name: brandForm.name, code: brandForm.code, country: brandForm.country || undefined, isActive: b.isActive }),
    onSuccess: () => { toast.success("Brand updated"); setEditBrand(null); invalidate(); },
    onError:   () => toast.error("Failed to update brand"),
  });

  const deleteBrand = useMutation({
    mutationFn: (id: string) => catalogueApi.deleteBrand(id),
    onSuccess: () => { toast.success("Brand removed"); invalidate(); },
    onError:   () => toast.error("Failed to remove brand"),
  });

  const createModel = useMutation({
    mutationFn: (brandId: string) => catalogueApi.createModel(brandId, { name: modelForm.name, code: modelForm.code, segment: modelForm.segment || undefined }),
    onSuccess: () => { toast.success("Model created"); setAddModel(null); setModelForm({ name: "", code: "", segment: "" }); invalidate(); },
    onError:   () => toast.error("Failed to create model"),
  });

  const updateModel = useMutation({
    mutationFn: (m: CatalogueModelDto & { brandId: string }) => catalogueApi.updateModel(m.id, { name: modelForm.name, code: modelForm.code, segment: modelForm.segment || undefined, isActive: m.isActive }),
    onSuccess: () => { toast.success("Model updated"); setEditModel(null); invalidate(); },
    onError:   () => toast.error("Failed to update model"),
  });

  const deleteModel = useMutation({
    mutationFn: (id: string) => catalogueApi.deleteModel(id),
    onSuccess: () => { toast.success("Model removed"); invalidate(); },
    onError:   () => toast.error("Failed to remove model"),
  });

  const openEditBrand = (b: CatalogueBrandDto) => {
    setBrandForm({ name: b.name, code: b.code, country: b.country ?? "" });
    setEditBrand(b);
  };

  const openEditModel = (m: CatalogueModelDto, brandId: string) => {
    setModelForm({ name: m.name, code: m.code, segment: m.segment ?? "" });
    setEditModel({ ...m, brandId });
  };

  return (
    <div className="space-y-8">
      {/* Brands & Models */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Brands &amp; Models</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/catalogue-template.csv"
                download
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Template
              </a>
              <Button
                size="sm" variant="outline" className="gap-1.5"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                {importing ? "Importing…" : "Import CSV"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button size="sm" className="gap-1.5 gradient-primary text-white"
                onClick={() => { setAddBrand(true); setBrandForm({ name: "", code: "", country: "" }); }}>
                <Plus className="w-4 h-4" /> Add Brand
              </Button>
            </div>
          </div>
          <CardDescription>Manage vehicle brands and their model lines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {/* Add Brand form */}
          {addingBrand && (
            <div className="border border-primary/30 rounded-lg p-3 bg-primary/5 space-y-3 mb-4">
              <p className="text-sm font-medium">New Brand</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-1"><Label className="text-xs">Name *</Label><Input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} placeholder="Toyota" className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Code *</Label><Input value={brandForm.code} onChange={e => setBrandForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="TYT" className="h-8 text-sm" /></div>
                <div className="col-span-3 space-y-1"><Label className="text-xs">Country of origin</Label><Input value={brandForm.country} onChange={e => setBrandForm(f => ({ ...f, country: e.target.value }))} placeholder="Japan" className="h-8 text-sm" /></div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => setAddBrand(false)}>Cancel</Button>
                <Button size="sm" disabled={!brandForm.name || !brandForm.code || createBrand.isPending}
                  onClick={() => createBrand.mutate()}>Save</Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : brands.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No brands yet. Add the first one above.</p>
          ) : brands.map(brand => (
            <div key={brand.id} className="border border-border rounded-lg overflow-hidden">
              {/* Brand row */}
              {editingBrand?.id === brand.id ? (
                <div className="p-3 bg-primary/5 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1"><Label className="text-xs">Name</Label><Input value={brandForm.name} onChange={e => setBrandForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" /></div>
                    <div className="space-y-1"><Label className="text-xs">Code</Label><Input value={brandForm.code} onChange={e => setBrandForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="h-8 text-sm" /></div>
                    <div className="col-span-3 space-y-1"><Label className="text-xs">Country</Label><Input value={brandForm.country} onChange={e => setBrandForm(f => ({ ...f, country: e.target.value }))} className="h-8 text-sm" /></div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditBrand(null)}>Cancel</Button>
                    <Button size="sm" disabled={updateBrand.isPending} onClick={() => updateBrand.mutate(brand)}><Save className="w-3.5 h-3.5 mr-1" />Save</Button>
                  </div>
                </div>
              ) : (
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-left"
                  onClick={() => setExpanded(expandedBrand === brand.id ? null : brand.id)}
                >
                  {expandedBrand === brand.id
                    ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                  <span className="font-medium text-sm flex-1">{brand.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{brand.code}</span>
                  {brand.country && <span className="text-xs text-muted-foreground hidden sm:inline">· {brand.country}</span>}
                  <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{brand.models.length} models</Badge>
                  {!brand.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                  <div className="flex items-center gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => openEditBrand(brand)}><Pencil className="w-3.5 h-3.5" /></button>
                    <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Remove brand "${brand.name}"?`)) deleteBrand.mutate(brand.id); }}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </button>
              )}

              {/* Models (expanded) */}
              {expandedBrand === brand.id && (
                <div className="border-t border-border bg-muted/20">
                  {brand.models.map(model => (
                    <div key={model.id} className="border-b border-border/50 last:border-0">
                      {editingModel?.id === model.id ? (
                        <div className="p-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2 space-y-1"><Label className="text-xs">Name</Label><Input value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" /></div>
                            <div className="space-y-1"><Label className="text-xs">Code</Label><Input value={modelForm.code} onChange={e => setModelForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="h-8 text-sm" /></div>
                            <div className="col-span-3 space-y-1"><Label className="text-xs">Segment</Label><Input value={modelForm.segment} onChange={e => setModelForm(f => ({ ...f, segment: e.target.value }))} placeholder="SUV, Sedan…" className="h-8 text-sm" /></div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="ghost" size="sm" onClick={() => setEditModel(null)}>Cancel</Button>
                            <Button size="sm" disabled={updateModel.isPending} onClick={() => updateModel.mutate(editingModel!)}><Save className="w-3.5 h-3.5 mr-1" />Save</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2 text-sm">
                          <span className="flex-1 font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground font-mono">{model.code}</span>
                          {model.segment && <span className="text-xs text-muted-foreground hidden sm:inline">{model.segment}</span>}
                          {!model.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Inactive</Badge>}
                          <div className="flex items-center gap-1">
                            <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" onClick={() => openEditModel(model, brand.id)}><Pencil className="w-3 h-3" /></button>
                            <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Remove model "${model.name}"?`)) deleteModel.mutate(model.id); }}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add model form */}
                  {addingModel === brand.id ? (
                    <div className="p-3 space-y-2 border-t border-border/50">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1"><Label className="text-xs">Model Name *</Label><Input value={modelForm.name} onChange={e => setModelForm(f => ({ ...f, name: e.target.value }))} placeholder="Corolla" className="h-8 text-sm" /></div>
                        <div className="space-y-1"><Label className="text-xs">Code *</Label><Input value={modelForm.code} onChange={e => setModelForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="COR" className="h-8 text-sm" /></div>
                        <div className="col-span-3 space-y-1"><Label className="text-xs">Segment</Label><Input value={modelForm.segment} onChange={e => setModelForm(f => ({ ...f, segment: e.target.value }))} placeholder="Sedan, SUV, Pickup…" className="h-8 text-sm" /></div>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => { setAddModel(null); setModelForm({ name: "", code: "", segment: "" }); }}>Cancel</Button>
                        <Button size="sm" disabled={!modelForm.name || !modelForm.code || createModel.isPending}
                          onClick={() => createModel.mutate(brand.id)}>Add Model</Button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors border-t border-border/50"
                      onClick={() => { setAddModel(brand.id); setModelForm({ name: "", code: "", segment: "" }); }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add model to {brand.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Service Types */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Service Types</CardTitle>
          </div>
          <CardDescription>System-defined service types available on job cards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SERVICE_TYPE_LABELS.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Service types are system-defined. Contact your administrator to add new types.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === "Admin";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard");
  }, [user, isAdmin, router]);

  // Pre-load groups for the Users tab's dropdown
  const { data: groups = [] } = useQuery({
    queryKey: ["permission-groups"],
    queryFn: () => permissionGroupsApi.list(),
    enabled: isAdmin,
  });

  if (!isAdmin) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1">System configuration, users and permissions</p>
      </div>

      <Separator />

      <Tabs defaultValue="users">
        <TabsList className="mb-6">
          <TabsTrigger value="users" className="gap-2"><Users className="w-4 h-4" />Users</TabsTrigger>
          <TabsTrigger value="groups" className="gap-2"><ShieldCheck className="w-4 h-4" />Permission Groups</TabsTrigger>
          <TabsTrigger value="sequence" className="gap-2"><Hash className="w-4 h-4" />Sequence</TabsTrigger>
          <TabsTrigger value="company" className="gap-2"><Building2 className="w-4 h-4" />Company</TabsTrigger>
          <TabsTrigger value="catalogue" className="gap-2"><Database className="w-4 h-4" />Catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab groups={groups} />
        </TabsContent>

        <TabsContent value="groups">
          <PermGroupsTab />
        </TabsContent>

        <TabsContent value="sequence">
          <SequenceTab />
        </TabsContent>

        <TabsContent value="company">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="catalogue">
          <CatalogueTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
