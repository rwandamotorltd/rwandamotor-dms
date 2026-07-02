"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Settings, Hash, AlertTriangle, Users, ShieldCheck,
  Plus, Pencil, Trash2, X, Eye, EyeOff, KeyRound, Building2, Save,
  ChevronDown, ChevronRight, Database, Car, Wrench, Upload, Download,
  FileText, ExternalLink, Loader2, Palette,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  adminApi, permissionGroupsApi, companySettingsApi, catalogueApi, templatesApi, rolesApi,
  brandColorsApi,
  type UserItem, type CreateUserPayload, type UpdateUserPayload,
  type PermissionGroupItem, type CreatePermissionGroupPayload,
  type CatalogueBrandDto, type CatalogueModelDto, type BulkImportCatalogueResult,
  type CataloguePreviewResult, type CataloguePreviewRow,
  type RoleItem, type CreateBrandColorPayload,
} from "@/lib/api";
import type { BrandColor } from "@/types";
import { DOCUMENT_TYPE_LABELS } from "@/types/templates";
import { jobCardsApi } from "@/lib/api";
import type { CompanySettings, ServiceTypeItem } from "@/types";
import { DEFAULT_SERVICE_TYPES, parseServiceTypesConfig } from "@/hooks/use-service-types";
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

const ROLES_FALLBACK = ["Admin", "TechnicalDirector", "CRMOfficer", "CRE"];

const ROLE_COLORS: Record<string, string> = {
  Admin:             "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  TechnicalDirector: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  CRMOfficer:        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  CRE:               "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
};

// ─── Permission Matrix ────────────────────────────────────────

type PermLevel = "none" | "view" | "edit" | "full";

interface WidgetDef { key: string; label: string; }

interface ModuleDef {
  key: string;
  label: string;
  levels: PermLevel[];
  keys: Partial<Record<PermLevel, string[]>>;
  widgets?: WidgetDef[];  // individual toggles shown inside the module row
}

const MODULES: ModuleDef[] = [
  {
    key: "dashboard", label: "Dashboard",
    levels: ["none", "view"],
    keys: {
      view: ["nav.dashboard"],
    },
    widgets: [
      { key: "dashboard.kpi.followUps",  label: "Active Follow-ups" },
      { key: "dashboard.kpi.dueSoon",    label: "Due Soon" },
      { key: "dashboard.kpi.overdue",    label: "Overdue" },
      { key: "dashboard.kpi.lost",       label: "Lost" },
      { key: "dashboard.kpi.recovered",  label: "Recovered" },
      { key: "dashboard.retention",      label: "Retention Charts" },
      { key: "dashboard.jobCardsWidget", label: "Workshop KPIs" },
    ],
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
    key: "followUps", label: "Follow-ups",
    levels: ["none", "view", "full"],
    keys: {
      view: ["nav.followUps", "followUps.view"],
      full: ["nav.followUps", "followUps.view", "followUps.manage"],
    },
  },
  {
    key: "appointments", label: "Appointments",
    levels: ["none", "view", "full"],
    keys: {
      view: ["nav.appointments", "appointments.view"],
      full: ["nav.appointments", "appointments.view", "appointments.manage"],
    },
  },
  {
    key: "reports", label: "Reports",
    levels: ["none", "view"],
    keys: {
      view: ["nav.reports"],
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

const ALL_WIDGET_KEYS = MODULES.flatMap(m => m.widgets ?? []).map(w => w.key);

function permissionsToLevels(permissions: string[]): Record<string, PermLevel> {
  return Object.fromEntries(MODULES.map(m => [m.key, keysToLevel(m, permissions)]));
}

function permissionsToWidgetKeys(permissions: string[]): Set<string> {
  return new Set(permissions.filter(p => ALL_WIDGET_KEYS.includes(p)));
}

function levelsToPermissions(levels: Record<string, PermLevel>, widgetKeys: Set<string>): string[] {
  const keys = new Set<string>();
  for (const mod of MODULES) {
    const level = levels[mod.key] ?? "none";
    for (const k of mod.keys[level] ?? []) keys.add(k);
  }
  for (const k of widgetKeys) keys.add(k);
  return [...keys];
}

function PermissionMatrix({
  levels,
  widgetKeys,
  onChange,
  onToggleWidget,
}: {
  levels: Record<string, PermLevel>;
  widgetKeys: Set<string>;
  onChange: (levels: Record<string, PermLevel>) => void;
  onToggleWidget: (key: string) => void;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden text-sm overflow-x-auto">
      <div className="min-w-[360px]">
      <div className="grid grid-cols-5 bg-muted/50 border-b border-border">
        <div className="px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Module</div>
        {ALL_LEVELS.map(l => (
          <div key={l} className="px-1 py-2 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {LEVEL_LABELS[l]}
          </div>
        ))}
      </div>
      {MODULES.map((mod, i) => (
        <div key={mod.key} className={`border-b border-border last:border-0 ${i % 2 === 1 ? "bg-muted/20" : ""}`}>
          {/* Module level row */}
          <div className="grid grid-cols-5">
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
          {/* Widget checkboxes (shown when module level is not none) */}
          {mod.widgets && levels[mod.key] !== "none" && (
            <div className="col-span-5 px-4 pb-3 pt-0.5 border-t border-border/40 bg-muted/10">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Visible KPI cards</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {mod.widgets.map(w => (
                  <label key={w.key} className="flex items-center gap-2 text-xs cursor-pointer select-none hover:text-foreground text-muted-foreground transition-colors">
                    <input
                      type="checkbox"
                      className="rounded cursor-pointer accent-primary"
                      checked={widgetKeys.has(w.key)}
                      onChange={() => onToggleWidget(w.key)}
                    />
                    {w.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
      </div>
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
  title, form, isCreate, groups, roles, onChange, onSave, onClose, saving, error,
}: {
  title: string;
  form: UserFormState;
  isCreate: boolean;
  groups: PermissionGroupItem[];
  roles: string[];
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
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
                onClick={() => onChange({ useCustomPermissions: true, permissionGroupId: "", customPermissions: form.customPermissions.length > 0 ? form.customPermissions : levelsToPermissions(Object.fromEntries(MODULES.map(m => [m.key, "none"])), new Set()) })}
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
                  widgetKeys={permissionsToWidgetKeys(form.customPermissions)}
                  onChange={levels => onChange({ customPermissions: levelsToPermissions(levels, permissionsToWidgetKeys(form.customPermissions)) })}
                  onToggleWidget={key => {
                    const wk = permissionsToWidgetKeys(form.customPermissions);
                    if (wk.has(key)) wk.delete(key); else wk.add(key);
                    onChange({ customPermissions: levelsToPermissions(permissionsToLevels(form.customPermissions), wk) });
                  }}
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
  const [widgetKeys, setWidgetKeys] = useState<Set<string>>(() => permissionsToWidgetKeys(initial.permissions));

  const toggleWidget = (key: string) =>
    setWidgetKeys(prev => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

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
            <PermissionMatrix levels={levels} widgetKeys={widgetKeys} onChange={setLevels} onToggleWidget={toggleWidget} />
          </div>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onSave({ name: name.trim(), description: description.trim() || null, permissions: levelsToPermissions(levels, widgetKeys) })}
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
  const { user: currentUser, refreshUser } = useAuth();
  const { data: roleItems = [] } = useQuery({ queryKey: ["app-roles"], queryFn: () => rolesApi.list() });
  const roleNames = roleItems.length > 0 ? roleItems.map(r => r.name) : ROLES_FALLBACK;

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [editError, setEditError] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

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
    onSuccess: async (res, variables) => {
      if (!res.success) { setEditError(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null); setEditError(null);
      toast.success("User updated");
      // If admin just edited themselves, refresh the JWT so the new name is immediate
      if (variables.userId === currentUser?.userId) await refreshUser();
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

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: res => {
      if (!res.success) { toast.error(res.message ?? "Failed to delete user"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingUser(null);
      toast.success("User deleted");
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e?.response?.data?.message ?? "Failed to delete user");
      setDeletingUser(null);
    },
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
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        {u.id === currentUser?.userId ? (
                          <span className="p-1.5 rounded-md text-muted-foreground/30 cursor-not-allowed" title="Cannot delete your own account">
                            <Trash2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <button onClick={() => setDeletingUser(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title="Delete user">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
        <UserModal title="New User" form={createForm} isCreate groups={groups} roles={roleNames}
          onChange={p => setCreateForm(f => ({ ...f, ...p }))}
          onSave={() => createMutation.mutate({ fullName: createForm.fullName.trim(), email: createForm.email.trim(), password: createForm.password, role: createForm.role, permissionGroupId: createForm.permissionGroupId || null, customPermissions: createForm.useCustomPermissions ? createForm.customPermissions : null })}
          onClose={() => setShowCreate(false)} saving={createMutation.isPending} error={createError} />
      )}

      {editingUser && (
        <UserModal title={`Edit — ${editingUser.fullName}`} form={editForm} isCreate={false} groups={groups} roles={roleNames}
          onChange={p => setEditForm(f => ({ ...f, ...p }))}
          onSave={() => updateMutation.mutate({ userId: editingUser.id, fullName: editForm.fullName.trim(), role: editForm.role, isActive: editForm.isActive, permissionGroupId: editForm.permissionGroupId || null, customPermissions: editForm.useCustomPermissions ? editForm.customPermissions : null })}
          onClose={() => setEditingUser(null)} saving={updateMutation.isPending} error={editError} />
      )}

      {resetUser && (
        <ResetPasswordModal user={resetUser}
          onSave={pwd => resetMutation.mutate({ id: resetUser.id, pwd })}
          onClose={() => setResetUser(null)} saving={resetMutation.isPending} error={resetError} />
      )}

      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Delete User</h3>
                <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-foreground">
              Are you sure you want to delete <span className="font-medium">{deletingUser.fullName}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={deleteMutation.isPending}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteMutation.mutate(deletingUser.id)}
                disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </motion.div>
        </div>
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

const DEFAULT_JC_MSG  = "Dear {CustomerName}, your vehicle has been received and a repair order has been opened. Our team will keep you informed of progress.";
const DEFAULT_DN_MSG  = "Dear {CustomerName}, thank you for trusting RWANDAMOTOR LTD with your {VehicleModel}. It was a pleasure serving you and we hope our service met your expectations. We look forward to welcoming you again.";

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
  emailJobCardMessage: DEFAULT_JC_MSG,
  emailDeliveryNoteMessage: DEFAULT_DN_MSG,
  serviceTypesConfig: null,
  primaryColor: "#3b82f6",
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

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Email Messages</CardTitle>
          <CardDescription>
            Personalise the messages sent to customers. Job card supports{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{CustomerName}"}</code>.
            Delivery note also supports{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{VehicleModel}"}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
              Job Card opened — vehicle received
            </Label>
            <textarea
              className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={form.emailJobCardMessage ?? ""}
              onChange={e => patch({ emailJobCardMessage: e.target.value || null })}
              placeholder={DEFAULT_JC_MSG}
            />
            <p className="text-xs text-muted-foreground">
              Sent when a new repair order is created.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
              Delivery note issued — vehicle ready for collection
            </Label>
            <textarea
              className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={form.emailDeliveryNoteMessage ?? ""}
              onChange={e => patch({ emailDeliveryNoteMessage: e.target.value || null })}
              placeholder={DEFAULT_DN_MSG}
            />
            <p className="text-xs text-muted-foreground">
              Sent when a job card is converted to a delivery note.
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

// ─── Service Types Management Card ───────────────────────────────────────────

function ServiceTypesCard() {
  const qc = useQueryClient();
  const [types, setTypes]           = useState<ServiceTypeItem[]>(DEFAULT_SERVICE_TYPES);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel]   = useState("");
  const [newValue, setNewValue]     = useState("");
  const [newLabel, setNewLabel]     = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [selected, setSelected]     = useState<Set<number>>(new Set());

  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-settings"],
    queryFn:  companySettingsApi.get,
    staleTime: 10 * 60_000,
  });

  useEffect(() => {
    if (settings !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTypes(parseServiceTypesConfig(settings?.serviceTypesConfig));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (updatedTypes: ServiceTypeItem[]) => {
      if (!settings) throw new Error("Settings not loaded");
      return companySettingsApi.update({ ...settings, serviceTypesConfig: JSON.stringify(updatedTypes) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["company-settings"] }); toast.success("Service types saved"); },
    onError:   () => toast.error("Failed to save service types"),
  });

  const toggle = (idx: number) =>
    setTypes(prev => prev.map((t, i) => i === idx ? { ...t, isActive: !t.isActive } : t));

  const startEdit = (idx: number) => { setEditingIdx(idx); setEditLabel(types[idx].label); };

  const commitEdit = (idx: number) => {
    if (editLabel.trim()) setTypes(prev => prev.map((t, i) => i === idx ? { ...t, label: editLabel.trim() } : t));
    setEditingIdx(null);
  };

  const addType = () => {
    const value = newValue.trim().replace(/\s+/g, "");
    const label = newLabel.trim();
    if (!value || !label) return;
    if (types.some(t => t.value.toLowerCase() === value.toLowerCase())) {
      toast.error("A type with that key already exists");
      return;
    }
    setTypes(prev => [...prev, { value, label, isActive: true, isBuiltIn: false }]);
    setNewValue(""); setNewLabel(""); setShowAdd(false);
  };

  const removeCustom = (idx: number) => setTypes(prev => prev.filter((_, i) => i !== idx));

  const toggleSelect = (idx: number) =>
    setSelected(prev => { const n = new Set(prev); if (n.has(idx)) n.delete(idx); else n.add(idx); return n; });

  const allSelected = types.length > 0 && selected.size === types.length;
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(types.map((_, i) => i)));

  const deleteSelected = () => {
    setTypes(prev => prev.filter((_, i) => !selected.has(i)));
    setSelected(new Set());
  };

  if (isLoading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Service Types</CardTitle>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowAdd(v => !v)}>
            <Plus className="w-3.5 h-3.5" /> Add type
          </Button>
        </div>
        <CardDescription>Enable/disable or rename service types shown in job cards, appointments, and service records.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="flex gap-2 p-3 border border-dashed border-border rounded-lg">
            <div className="flex-1 space-y-1">
              <Input placeholder="Key (e.g. TyreBalance)" value={newValue}
                onChange={e => setNewValue(e.target.value)} className="h-8 text-sm" />
              <p className="text-[11px] text-muted-foreground">PascalCase, no spaces</p>
            </div>
            <div className="flex-1">
              <Input placeholder="Label (e.g. Tyre Balancing)" value={newLabel}
                onChange={e => setNewLabel(e.target.value)} className="h-8 text-sm"
                onKeyDown={e => e.key === "Enter" && addType()} />
            </div>
            <Button size="sm" onClick={addType} className="shrink-0">Add</Button>
            <button onClick={() => { setShowAdd(false); setNewValue(""); setNewLabel(""); }}
              className="p-1.5 rounded-md hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          {/* Select-all header */}
          <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 border-b border-border">
            <input type="checkbox" className="rounded cursor-pointer" checked={allSelected}
              onChange={toggleAll} title="Select all" />
            <span className="text-xs text-muted-foreground flex-1">
              {selected.size > 0 ? `${selected.size} selected` : `${types.length} types`}
            </span>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete {selected.size}
              </button>
            )}
          </div>

          <div className="divide-y divide-border">
            {types.map((t, idx) => (
              <div key={t.value} className={`flex items-center gap-3 px-3 py-2.5 bg-card transition-colors ${selected.has(idx) ? "bg-destructive/5" : ""}`}>
                <input type="checkbox" className="rounded cursor-pointer shrink-0"
                  checked={selected.has(idx)} onChange={() => toggleSelect(idx)} />
                <div className={`w-2 h-2 rounded-full shrink-0 ${t.isActive ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"}`} />

                {editingIdx === idx ? (
                  <Input autoFocus className="h-7 text-sm flex-1" value={editLabel}
                    onChange={e => setEditLabel(e.target.value)}
                    onBlur={() => commitEdit(idx)}
                    onKeyDown={e => { if (e.key === "Enter") commitEdit(idx); if (e.key === "Escape") setEditingIdx(null); }} />
                ) : (
                  <span className={`flex-1 text-sm truncate ${!t.isActive ? "text-muted-foreground line-through" : ""}`}>
                    {t.label}
                  </span>
                )}

                <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">{t.value}</span>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(idx)} title="Rename"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggle(idx)} title={t.isActive ? "Disable" : "Enable"}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                      t.isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    {t.isActive ? "Active" : "Off"}
                  </button>
                  <button onClick={() => removeCustom(idx)} title="Delete"
                    className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(types)} className="gap-2">
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save Service Types"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Catalogue Tab (Brands / Models / Service Types) ────────────────────────

interface BrandForm { name: string; code: string; country: string; }
interface ModelForm  { name: string; code: string; segment: string; }

function CatalogueTab() {
  const qc = useQueryClient();
  const [importing, setImporting]        = useState(false);
  const [previewing, setPreviewing]      = useState(false);
  const [previewData, setPreviewData]    = useState<CataloguePreviewResult | null>(null);
  const [pendingFile, setPendingFile]    = useState<File | null>(null);
  const fileInputRef                     = useRef<HTMLInputElement>(null);
  const [expandedBrand, setExpanded]     = useState<string | null>(null);
  const [editingBrand,  setEditBrand]    = useState<CatalogueBrandDto | null>(null);
  const [addingBrand,   setAddBrand]     = useState(false);
  const [editingModel,  setEditModel]    = useState<(CatalogueModelDto & { brandId: string }) | null>(null);
  const [addingModel,   setAddModel]     = useState<string | null>(null);
  const [brandForm,     setBrandForm]    = useState<BrandForm>({ name: "", code: "", country: "" });
  const [modelForm,     setModelForm]    = useState<ModelForm>({ name: "", code: "", segment: "" });
  const [selectedBrands, setSelBrands]  = useState<Set<string>>(new Set());
  const [selectedModels, setSelModels]  = useState<Set<string>>(new Set());

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
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreviewing(true);
    try {
      const result = await catalogueApi.preview(file);
      setPendingFile(file);
      setPreviewData(result);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Could not read file — check format (CSV/Excel) and try again");
    } finally {
      setPreviewing(false);
    }
  };

  const confirmImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const r: BulkImportCatalogueResult = await catalogueApi.bulkImport(pendingFile);
      const parts: string[] = [];
      if (r.brandsCreated)  parts.push(`${r.brandsCreated} brand${r.brandsCreated !== 1 ? "s" : ""} created`);
      if (r.modelsCreated)  parts.push(`${r.modelsCreated} model${r.modelsCreated !== 1 ? "s" : ""} created`);
      if (!parts.length)    parts.push("nothing new to import");
      toast.success(`Import complete — ${parts.join(", ")}`);
      invalidate();
      setPreviewData(null);
      setPendingFile(null);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Import failed");
    } finally {
      setImporting(false);
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

  const toggleBrand = (id: string) =>
    setSelBrands(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allBrandsSelected = brands.length > 0 && selectedBrands.size === brands.length;
  const toggleAllBrands   = () => setSelBrands(allBrandsSelected ? new Set() : new Set(brands.map(b => b.id)));

  const bulkDeleteBrands = async () => {
    const ids = [...selectedBrands];
    await Promise.all(ids.map(id => catalogueApi.deleteBrand(id)));
    setSelBrands(new Set());
    setExpanded(null);
    invalidate();
    toast.success(`${ids.length} brand${ids.length > 1 ? "s" : ""} removed`);
  };

  const toggleModel = (id: string) =>
    setSelModels(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const bulkDeleteModels = async (models: CatalogueModelDto[]) => {
    const ids = models.filter(m => selectedModels.has(m.id)).map(m => m.id);
    if (!ids.length) return;
    await Promise.all(ids.map(id => catalogueApi.deleteModel(id)));
    setSelModels(new Set());
    invalidate();
    toast.success(`${ids.length} model${ids.length > 1 ? "s" : ""} removed`);
  };

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
                disabled={importing || previewing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                {previewing ? "Reading…" : importing ? "Importing…" : "Import CSV"}
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

          {/* Bulk-select header for brands */}
          {!isLoading && brands.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 bg-muted/40 rounded-lg border border-border mb-2">
              <input type="checkbox" className="rounded cursor-pointer" checked={allBrandsSelected}
                onChange={toggleAllBrands} title="Select all brands" />
              <span className="text-xs text-muted-foreground flex-1">
                {selectedBrands.size > 0 ? `${selectedBrands.size} selected` : `${brands.length} brands`}
              </span>
              {selectedBrands.size > 0 && (
                <button
                  onClick={bulkDeleteBrands}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Delete {selectedBrands.size}
                </button>
              )}
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
                <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/40 transition-colors">
                  <input type="checkbox" className="rounded cursor-pointer shrink-0"
                    checked={selectedBrands.has(brand.id)}
                    onChange={() => toggleBrand(brand.id)}
                    onClick={e => e.stopPropagation()} />
                  <button
                    className="flex-1 flex items-center gap-3 text-left"
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
                </div>
              )}

              {/* Models (expanded) */}
              {expandedBrand === brand.id && (
                <div className="border-t border-border bg-muted/20">
                  {/* Model bulk-select bar */}
                  {brand.models.length > 0 && (
                    <div className="flex items-center gap-3 px-4 py-1.5 border-b border-border/50 bg-muted/30">
                      <input type="checkbox" className="rounded cursor-pointer"
                        checked={brand.models.length > 0 && brand.models.every(m => selectedModels.has(m.id))}
                        onChange={() => {
                          const allSel = brand.models.every(m => selectedModels.has(m.id));
                          setSelModels(prev => {
                            const n = new Set(prev);
                            if (allSel) brand.models.forEach(m => n.delete(m.id));
                            else brand.models.forEach(m => n.add(m.id));
                            return n;
                          });
                        }} />
                      <span className="text-xs text-muted-foreground flex-1">
                        {brand.models.filter(m => selectedModels.has(m.id)).length > 0
                          ? `${brand.models.filter(m => selectedModels.has(m.id)).length} selected`
                          : `${brand.models.length} models`}
                      </span>
                      {brand.models.some(m => selectedModels.has(m.id)) && (
                        <button
                          onClick={() => bulkDeleteModels(brand.models)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Delete {brand.models.filter(m => selectedModels.has(m.id)).length}
                        </button>
                      )}
                    </div>
                  )}

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
                        <div className={`flex items-center gap-3 px-4 py-2 text-sm ${selectedModels.has(model.id) ? "bg-destructive/5" : ""}`}>
                          <input type="checkbox" className="rounded cursor-pointer shrink-0"
                            checked={selectedModels.has(model.id)} onChange={() => toggleModel(model.id)} />
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

      <ServiceTypesCard />

      {/* ── Catalogue Import Preview Dialog ─────────────────────────────── */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setPreviewData(null); setPendingFile(null); }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="text-base font-semibold">Import Preview</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review what will be imported before confirming
                </p>
              </div>
              <button onClick={() => { setPreviewData(null); setPendingFile(null); }}
                className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary chips */}
            <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-border shrink-0 bg-muted/30">
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                {previewData.totalRows} rows total
              </span>
              {previewData.newBrands > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                  +{previewData.newBrands} new brand{previewData.newBrands !== 1 ? "s" : ""}
                </span>
              )}
              {previewData.newModels > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                  +{previewData.newModels} new model{previewData.newModels !== 1 ? "s" : ""}
                </span>
              )}
              {(previewData.existingBrands > 0 || previewData.existingModels > 0) && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  {previewData.existingBrands + previewData.existingModels} already exist (will skip)
                </span>
              )}
              {previewData.errorRows > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-destructive/10 text-destructive">
                  {previewData.errorRows} error{previewData.errorRows !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card border-b border-border">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground w-10">#</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Brand</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Model</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden sm:table-cell">Segment</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {previewData.rows.map((row: CataloguePreviewRow) => (
                    <tr key={row.rowNumber}
                      className={row.hasError ? "bg-destructive/5" : row.isNewBrand || row.isNewModel ? "bg-emerald-500/5" : ""}
                    >
                      <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                      <td className="px-3 py-2">
                        <span className="font-medium">{row.brandName || <span className="text-destructive italic">missing</span>}</span>
                        {row.isNewBrand && (
                          <span className="ml-1.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1 rounded">new</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span>{row.modelName || <span className="text-destructive italic">missing</span>}</span>
                        {row.isNewModel && (
                          <span className="ml-1.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 rounded">new</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{row.segment ?? "—"}</td>
                      <td className="px-3 py-2">
                        {row.hasError ? (
                          <span className="text-destructive text-[11px]">{row.error}</span>
                        ) : row.isNewBrand || row.isNewModel ? (
                          <span className="text-emerald-600 dark:text-emerald-400 text-[11px]">Will import</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 text-[11px]">Already exists</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-4 border-t border-border shrink-0">
              {previewData.errorRows > 0 && (
                <p className="text-xs text-destructive">
                  {previewData.errorRows} row{previewData.errorRows !== 1 ? "s" : ""} with errors will be skipped
                </p>
              )}
              {previewData.errorRows === 0 && previewData.newBrands === 0 && previewData.newModels === 0 && (
                <p className="text-xs text-muted-foreground">Nothing new to import — all items already exist</p>
              )}
              {previewData.errorRows === 0 && (previewData.newBrands > 0 || previewData.newModels > 0) && (
                <span className="text-xs text-muted-foreground" />
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => { setPreviewData(null); setPendingFile(null); }}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={importing || (previewData.newBrands === 0 && previewData.newModels === 0)}
                  onClick={confirmImport}
                  className="gradient-primary text-white"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {importing ? "Importing…" : `Import ${previewData.newBrands + previewData.newModels} item${(previewData.newBrands + previewData.newModels) !== 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Templates Tab ─────────────────────────────────────────────────────────

function TemplatesTab() {
  const router = useRouter();
  const qc     = useQueryClient();
  const docTypes = Object.keys(DOCUMENT_TYPE_LABELS);

  const { data: allTemplates = [] } = useQuery({
    queryKey: ["templates"],
    queryFn:  () => templatesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["templates"] }); toast.success("Template deleted"); },
    onError: () => toast.error("Failed to delete template"),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Design custom print layouts for each document type. Drag and position fields on an A4 canvas, then save as the default template.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {docTypes.map(docType => {
          const typeTemplates = allTemplates.filter(t => t.documentType === docType);
          const def = typeTemplates.find(t => t.isDefault) ?? typeTemplates[0];
          return (
            <Card key={docType}>
              <CardContent className="p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{DOCUMENT_TYPE_LABELS[docType]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {def ? `"${def.name}" · last updated ${new Date(def.updatedAt).toLocaleDateString()}` : "No template yet"}
                  </p>
                  {typeTemplates.length > 1 && (
                    <p className="text-xs text-muted-foreground">{typeTemplates.length} templates</p>
                  )}
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0"
                  onClick={() => router.push(`/settings/templates/${docType}`)}>
                  <ExternalLink className="w-3.5 h-3.5" />
                  {def ? "Edit" : "Create"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {allTemplates.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">All templates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Updated</th>
                <th className="w-20" />
              </tr></thead>
              <tbody>
                {allTemplates.map(t => (
                  <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <span className="font-medium">{t.name}</span>
                      {t.isDefault && <Badge variant="outline" className="ml-2 text-[10px]">Default</Badge>}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{DOCUMENT_TYPE_LABELS[t.documentType] ?? t.documentType}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(t.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1 justify-end">
                        <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          onClick={() => router.push(`/settings/templates/${t.documentType}`)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Roles Tab ────────────────────────────────────────────────

function RolesTab() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [formName, setFormName] = useState("");
  const [formDisplay, setFormDisplay] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["app-roles"],
    queryFn: () => rolesApi.list(),
  });

  const createMut = useMutation({
    mutationFn: (data: { name: string; displayName: string; description?: string }) =>
      rolesApi.create(data.name, data.displayName, data.description),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-roles"] }); setShowCreate(false); resetForm(); toast.success("Role created"); },
    onError: (e: { response?: { data?: { message?: string; title?: string } }; message?: string }) =>
      toast.error(e?.response?.data?.message ?? e?.response?.data?.title ?? e?.message ?? "Failed to create role"),
  });

  const updateMut = useMutation({
    mutationFn: (r: RoleItem) => rolesApi.update(r.id, formDisplay, formDesc || undefined),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-roles"] }); setEditingRole(null); toast.success("Role updated"); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? "Failed to update role"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["app-roles"] }); toast.success("Role deleted"); },
    onError: (e: { response?: { data?: { message?: string } } }) => toast.error(e?.response?.data?.message ?? "Cannot delete this role"),
  });

  function resetForm() { setFormName(""); setFormDisplay(""); setFormDesc(""); }

  function openEdit(r: RoleItem) {
    setEditingRole(r);
    setFormDisplay(r.displayName);
    setFormDesc(r.description ?? "");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base">Roles</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Define roles assigned to users. Built-in roles cannot be deleted.</p>
        </div>
        <Button size="sm" onClick={() => { resetForm(); setShowCreate(true); }} className="shrink-0">
          <Plus className="w-4 h-4 mr-1.5" />Add Role
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead className="hidden sm:table-cell">Description</TableHead>
              <TableHead className="text-center hidden sm:table-cell">Users</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
            )}
            {!isLoading && roles.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No roles found</TableCell></TableRow>
            )}
            {roles.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs font-medium">{r.name}</TableCell>
                <TableCell className="font-medium">{r.displayName}</TableCell>
                <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">{r.description ?? <span className="text-muted-foreground/40 italic">—</span>}</TableCell>
                <TableCell className="text-center hidden sm:table-cell">
                  <span className="text-sm font-medium">{r.userCount}</span>
                </TableCell>
                <TableCell className="text-center">
                  {r.isBuiltIn
                    ? <Badge variant="outline" className="text-[10px]">Built-in</Badge>
                    : <Badge variant="secondary" className="text-[10px]">Custom</Badge>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!r.isBuiltIn && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete role "${r.displayName}"?`)) deleteMut.mutate(r.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h2 className="text-lg font-semibold">New Role</h2>
            <div className="space-y-1.5">
              <Label>Role Name (key) <span className="text-destructive">*</span></Label>
              <Input value={formName} onChange={e => setFormName(e.target.value.replace(/\s/g, ""))} placeholder="e.g. SalesManager" />
              <p className="text-[10px] text-muted-foreground">No spaces. Used internally as the role identifier.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input value={formDisplay} onChange={e => setFormDisplay(e.target.value)} placeholder="e.g. Sales Manager" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Optional description" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMut.mutate({ name: formName.trim(), displayName: formDisplay.trim(), description: formDesc.trim() || undefined })} disabled={createMut.isPending || !formName.trim() || !formDisplay.trim()} className="gradient-primary text-white">
                {createMut.isPending ? "Saving…" : "Create Role"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit modal */}
      {editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingRole(null)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Edit Role</h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">{editingRole.name}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Display Name <span className="text-destructive">*</span></Label>
              <Input value={formDisplay} onChange={e => setFormDisplay(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
              <Button onClick={() => updateMut.mutate(editingRole)} disabled={updateMut.isPending || !formDisplay.trim()} className="gradient-primary text-white">
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Data / Danger Zone Tab ───────────────────────────────────────────────────

function DataTab() {
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const CONFIRM_PHRASE = "DELETE ALL DATA";

  const handlePurge = async () => {
    if (confirm !== CONFIRM_PHRASE) return;
    setLoading(true);
    try {
      await adminApi.purgeData();
      toast.success("All operational data has been purged. The system is ready for a fresh import.");
      setConfirm("");
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(d?.message ?? "Purge failed — check server logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="font-semibold text-sm">Data Management</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Manage the operational data stored in this system.</p>
      </div>

      {/* What is kept */}
      <Card>
        <CardContent className="pt-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Preserved after purge</p>
          <div className="flex flex-wrap gap-1.5">
            {["Users & passwords", "Company settings", "Brands & models (catalogue)", "Service policies",
              "Technicians", "Workshop bays", "Permission groups", "Roles", "Document templates"].map(item => (
              <span key={item} className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-400">
                {item}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <div className="rounded-xl border-2 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400">Purge All Operational Data</p>
            <p className="text-xs text-red-600 dark:text-red-500 mt-1">
              This permanently deletes all vehicles, customers, service records, job cards, sales history,
              appointments, follow-ups, notifications, and import logs. This action cannot be undone.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-red-100/50 dark:bg-red-950/30 p-3 text-xs text-red-700 dark:text-red-400 space-y-1">
          <p className="font-semibold">Will be permanently deleted:</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {["Vehicles", "Customers", "Service records", "Job cards", "Sales history",
              "Follow-ups", "Appointments", "Notifications", "Import logs", "Audit logs"].map(item => (
              <span key={item} className="px-1.5 py-0.5 rounded bg-red-200/60 dark:bg-red-900/50 text-red-700 dark:text-red-400">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-red-700 dark:text-red-400">
            Type <span className="font-mono font-bold">{CONFIRM_PHRASE}</span> to enable the button
          </label>
          <input
            className="w-full rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-red-950/20 px-3 py-2 text-sm font-mono placeholder-red-300 dark:placeholder-red-800 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder={CONFIRM_PHRASE}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={loading}
          />
        </div>

        <Button
          variant="destructive"
          disabled={confirm !== CONFIRM_PHRASE || loading}
          onClick={handlePurge}
          className="gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          {loading ? "Purging…" : "Purge All Data"}
        </Button>
      </div>
    </div>
  );
}

// ─── Brand Colors Tab ─────────────────────────────────────────────────────────

function ColorsTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingColor, setEditingColor] = useState<BrandColor | null>(null);
  const [form, setForm] = useState<CreateBrandColorPayload>({ name: "", hexValue: "#3b82f6" });

  const { data: colors = [], isLoading } = useQuery({
    queryKey: ["brand-colors"],
    queryFn: () => brandColorsApi.list(),
  });

  const { data: settings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: () => companySettingsApi.get(),
  });

  const createMut = useMutation({
    mutationFn: (p: CreateBrandColorPayload) => brandColorsApi.create(p),
    onSuccess: res => {
      if (!res.success) { toast.error(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["brand-colors"] });
      setShowForm(false);
      setForm({ name: "", hexValue: "#3b82f6" });
      toast.success("Color added");
    },
  });

  const updateMut = useMutation({
    mutationFn: (c: BrandColor) => brandColorsApi.update({ id: c.id, name: c.name, hexValue: c.hexValue, sortOrder: c.sortOrder }),
    onSuccess: res => {
      if (!res.success) { toast.error(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["brand-colors"] });
      setEditingColor(null);
      toast.success("Color updated");
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => brandColorsApi.delete(id),
    onSuccess: res => {
      if (!res.success) { toast.error(res.message ?? "Failed"); return; }
      qc.invalidateQueries({ queryKey: ["brand-colors"] });
      toast.success("Color deleted");
    },
  });

  const selectColorMut = useMutation({
    mutationFn: (hex: string) =>
      companySettingsApi.update({ ...EMPTY_COMPANY, ...settings, primaryColor: hex }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-settings"] });
      toast.success("Primary color updated — reload to see full effect");
    },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-muted-foreground" /> Brand Colors
          </CardTitle>
          <CardDescription>
            Manage your color palette. Click a color to set it as the active primary color.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <div className="space-y-2">
              {colors.map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border bg-muted/30">
                  <button
                    className="w-8 h-8 rounded-full border-2 border-border flex-shrink-0 shadow-sm cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: c.hexValue }}
                    title={`Set "${c.name}" as primary color`}
                    onClick={() => selectColorMut.mutate(c.hexValue)}
                  />
                  {editingColor?.id === c.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <Input
                        className="h-7 text-xs w-32"
                        value={editingColor.name}
                        onChange={e => setEditingColor(ec => ec ? { ...ec, name: e.target.value } : ec)}
                      />
                      <input
                        type="color"
                        className="w-8 h-7 rounded cursor-pointer border border-border"
                        value={editingColor.hexValue}
                        onChange={e => setEditingColor(ec => ec ? { ...ec, hexValue: e.target.value } : ec)}
                      />
                      <span className="text-xs text-muted-foreground font-mono">{editingColor.hexValue}</span>
                      <Button size="sm" className="h-7 text-xs" onClick={() => updateMut.mutate(editingColor)} disabled={updateMut.isPending}>Save</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingColor(null)}><X className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="ml-2 text-xs text-muted-foreground font-mono">{c.hexValue}</span>
                        {settings?.primaryColor === c.hexValue && (
                          <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingColor(c)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(c.id)} disabled={deleteMut.isPending}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {showForm ? (
            <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20">
              <input
                type="color"
                className="w-8 h-8 rounded cursor-pointer border border-border flex-shrink-0"
                value={form.hexValue}
                onChange={e => setForm(f => ({ ...f, hexValue: e.target.value }))}
              />
              <Input
                className="h-8 text-sm flex-1"
                placeholder="Color name (e.g. Brand Blue)"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <span className="text-xs text-muted-foreground font-mono w-20">{form.hexValue}</span>
              <Button size="sm" onClick={() => createMut.mutate(form)} disabled={!form.name.trim() || createMut.isPending}>Add</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setForm({ name: "", hexValue: "#3b82f6" }); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Color
            </Button>
          )}
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
    <div className="space-y-4 sm:space-y-6 max-w-5xl min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6" /> Settings
        </h1>
        <p className="text-muted-foreground text-sm mt-1 hidden sm:block">System configuration, users and permissions</p>
      </div>

      <Separator />

      <Tabs defaultValue="users">
        <TabsList className="mb-4 sm:mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="gap-1.5 text-xs sm:text-sm"><Users className="w-3.5 h-3.5" /><span className="hidden sm:inline">Users</span><span className="sm:hidden">Users</span></TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5 text-xs sm:text-sm"><ShieldCheck className="w-3.5 h-3.5" /><span className="hidden sm:inline">Permission Groups</span><span className="sm:hidden">Groups</span></TabsTrigger>
          <TabsTrigger value="sequence" className="gap-1.5 text-xs sm:text-sm"><Hash className="w-3.5 h-3.5" /><span className="hidden sm:inline">Sequence</span><span className="sm:hidden">Seq</span></TabsTrigger>
          <TabsTrigger value="company" className="gap-1.5 text-xs sm:text-sm"><Building2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Company</span><span className="sm:hidden">Co.</span></TabsTrigger>
          <TabsTrigger value="catalogue" className="gap-1.5 text-xs sm:text-sm"><Database className="w-3.5 h-3.5" /><span>Catalogue</span></TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs sm:text-sm"><FileText className="w-3.5 h-3.5" /><span>Templates</span></TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5 text-xs sm:text-sm"><KeyRound className="w-3.5 h-3.5" /><span>Roles</span></TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5 text-xs sm:text-sm"><Palette className="w-3.5 h-3.5" /><span>Colors</span></TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 data-[state=active]:text-red-700"><AlertTriangle className="w-3.5 h-3.5" /><span>Data</span></TabsTrigger>
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

        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>

        <TabsContent value="colors">
          <ColorsTab />
        </TabsContent>

        <TabsContent value="data">
          <DataTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
