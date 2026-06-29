"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, Plus, Pencil, X, ShieldCheck, KeyRound, Eye, EyeOff,
  ShieldPlus, Trash2, Lock, Crown, UserCog,
} from "lucide-react";
import { adminApi, rolesApi, type CreateUserPayload, type UpdateUserPayload, type UserItem, type RoleItem } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

// ─── Role badge color helper ───────────────────────────────────

const BUILTIN_COLORS: Record<string, string> = {
  Admin:             "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  TechnicalDirector: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  CRMOfficer:        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  CRE:               "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
};

function roleBadgeClass(name: string) {
  return BUILTIN_COLORS[name] ?? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400";
}

// ─── User Form Modal ───────────────────────────────────────────

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

interface UserModalProps {
  title: string;
  form: UserFormState;
  isCreate: boolean;
  roles: RoleItem[];
  onChange: (patch: Partial<UserFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}

function UserModal({ title, form, isCreate, roles, onChange, onSave, onClose, saving, error }: UserModalProps) {
  const [showPwd, setShowPwd] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
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

          <div className="space-y-1.5">
            <Label>Full Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.fullName}
              onChange={e => onChange({ fullName: e.target.value })}
              placeholder="e.g. Jean Pierre Habimana"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => onChange({ email: e.target.value })}
              placeholder="user@rwandamotor.com"
              disabled={!isCreate}
            />
          </div>

          {isCreate && (
            <div className="space-y-1.5">
              <Label>Password <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={form.password}
                  onChange={e => onChange({ password: e.target.value })}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => onChange({ role: v ?? "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {roles.map(r => (
                  <SelectItem key={r.id} value={r.name}>
                    <span className="flex items-center gap-2">
                      {r.name}
                      {r.isBuiltIn && <Lock className="w-3 h-3 text-muted-foreground" />}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Label htmlFor="isActive" className="cursor-pointer">Active user</Label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.fullName.trim() || !form.email.trim() || (isCreate && !form.password.trim())}
            className="gradient-primary text-white"
          >
            {saving ? "Saving..." : isCreate ? "Create User" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────

interface ResetPwdModalProps {
  user: UserItem;
  onClose: () => void;
  onSave: (newPassword: string) => void;
  saving: boolean;
  error?: string | null;
}

function ResetPasswordModal({ user, onClose, onSave, saving, error }: ResetPwdModalProps) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const mismatch = confirm.length > 0 && pwd !== confirm;
  const valid = pwd.length >= 8 && pwd === confirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
            Reset Password
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Set a new password for <span className="font-medium text-foreground">{user.fullName}</span>
          </p>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>New Password <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type={showPwd ? "text" : "password"}
                value={pwd}
                onChange={e => setPwd(e.target.value)}
                placeholder="Min. 8 characters"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Confirm Password <span className="text-destructive">*</span></Label>
            <Input
              type={showPwd ? "text" : "password"}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              className={mismatch ? "border-destructive" : ""}
            />
            {mismatch && <p className="text-xs text-destructive">Passwords do not match</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={() => onSave(pwd)}
            disabled={saving || !valid}
            className="gradient-primary text-white"
          >
            {saving ? "Resetting..." : "Reset Password"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Role Form Modal ───────────────────────────────────────────

interface RoleFormState {
  name: string;
  displayName: string;
  description: string;
}

interface RoleModalProps {
  title: string;
  form: RoleFormState;
  isCreate: boolean;
  onChange: (patch: Partial<RoleFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}

function RoleModal({ title, form, isCreate, onChange, onSave, onClose, saving, error }: RoleModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldPlus className="w-4 h-4 text-muted-foreground" />
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

          {isCreate && (
            <div className="space-y-1.5">
              <Label>Role Identifier <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={e => onChange({ name: e.target.value.replace(/\s/g, "") })}
                placeholder="e.g. CCE (no spaces)"
              />
              <p className="text-xs text-muted-foreground">Used internally — letters/numbers only, no spaces.</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Display Name <span className="text-destructive">*</span></Label>
            <Input
              value={form.displayName}
              onChange={e => onChange({ displayName: e.target.value })}
              placeholder="e.g. Customer Care Executive"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={e => onChange({ description: e.target.value })}
              placeholder="What does this role do?"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button
            onClick={onSave}
            disabled={saving || !form.name.trim() || !form.displayName.trim()}
            className="gradient-primary text-white"
          >
            {saving ? "Saving..." : isCreate ? "Create Role" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

type Tab = "users" | "roles";

const EMPTY_USER: UserFormState = { fullName: "", email: "", password: "", role: "", isActive: true };
const EMPTY_ROLE: RoleFormState = { name: "", displayName: "", description: "" };

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("users");

  // ── User state ────────────────────────────────────────────────
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_USER);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_USER);
  const [editError, setEditError] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // ── Role state ────────────────────────────────────────────────
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [createRoleForm, setCreateRoleForm] = useState<RoleFormState>(EMPTY_ROLE);
  const [createRoleError, setCreateRoleError] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editRoleForm, setEditRoleForm] = useState<RoleFormState>(EMPTY_ROLE);
  const [editRoleError, setEditRoleError] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<RoleItem | null>(null);

  if (user && user.role !== "Admin") { router.replace("/dashboard"); return null; }

  // ── Queries ───────────────────────────────────────────────────
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.getUsers(),
    enabled: user?.role === "Admin",
  });

  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => rolesApi.list(),
    enabled: user?.role === "Admin",
  });

  // ── User mutations ────────────────────────────────────────────
  const createUserMut = useMutation({
    mutationFn: (p: CreateUserPayload) => adminApi.createUser(p),
    onSuccess: (res) => {
      if (!res.success) { setCreateError(res.message ?? "Failed to create user"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false); setCreateForm({ ...EMPTY_USER, role: roles[0]?.name ?? "" }); setCreateError(null);
      toast.success("User created");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? "Failed to create user");
    },
  });

  const updateUserMut = useMutation({
    mutationFn: (p: UpdateUserPayload) => adminApi.updateUser(p),
    onSuccess: (res) => {
      if (!res.success) { setEditError(res.message ?? "Failed to update user"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null); setEditError(null);
      toast.success("User updated");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? "Failed to update user");
    },
  });

  const resetMut = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminApi.resetPassword(userId, newPassword),
    onSuccess: (res) => {
      if (!res.success) { setResetError(res.message ?? "Failed to reset password"); return; }
      setResetUser(null); setResetError(null);
      toast.success("Password reset");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResetError(msg ?? "Failed to reset password");
    },
  });

  // ── Role mutations ────────────────────────────────────────────
  const createRoleMut = useMutation({
    mutationFn: (f: RoleFormState) => rolesApi.create(f.name, f.displayName, f.description || undefined),
    onSuccess: (res) => {
      if (!res.success) { setCreateRoleError(res.message ?? "Failed to create role"); return; }
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setShowCreateRole(false); setCreateRoleForm(EMPTY_ROLE); setCreateRoleError(null);
      toast.success("Role created");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateRoleError(msg ?? "Failed to create role");
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: ({ id, f }: { id: string; f: RoleFormState }) =>
      rolesApi.update(id, f.displayName, f.description || undefined),
    onSuccess: (res) => {
      if (!res.success) { setEditRoleError(res.message ?? "Failed to update role"); return; }
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setEditingRole(null); setEditRoleError(null);
      toast.success("Role updated");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditRoleError(msg ?? "Failed to update role");
    },
  });

  const deleteRoleMut = useMutation({
    mutationFn: (id: string) => rolesApi.delete(id),
    onSuccess: (res) => {
      if (!res.success) { toast.error(res.message ?? "Failed to delete role"); return; }
      qc.invalidateQueries({ queryKey: ["admin-roles"] });
      setDeletingRole(null);
      toast.success("Role deleted");
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? "Failed to delete role");
      setDeletingRole(null);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────
  const openCreateUser = () => {
    setCreateForm({ ...EMPTY_USER, role: roles[0]?.name ?? "" });
    setCreateError(null);
    setShowCreate(true);
  };

  const openEditUser = (u: UserItem) => {
    setEditingUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, password: "", role: u.role, isActive: u.isActive });
    setEditError(null);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            User &amp; Role Management
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage system users, roles and access</p>
        </div>
        {tab === "users" ? (
          <Button className="gradient-primary text-white gap-2" onClick={openCreateUser}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">New User</span>
          </Button>
        ) : (
          <Button className="gradient-primary text-white gap-2" onClick={() => { setCreateRoleForm(EMPTY_ROLE); setCreateRoleError(null); setShowCreateRole(true); }}>
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">New Role</span>
          </Button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["users", "roles"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "users" ? <UserCog className="w-4 h-4" /> : <Crown className="w-4 h-4" />}
            {t}
            {t === "users" && !usersLoading && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{users.length}</span>
            )}
            {t === "roles" && !rolesLoading && (
              <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-xs">{roles.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Users tab ── */}
      {tab === "users" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {usersLoading ? (
            <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Email</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Users className="w-10 h-10 opacity-30" />
                          <p className="text-sm">No users found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : users.map((u) => (
                    <TableRow key={u.id} className="border-border hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <p className="font-medium text-sm text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{u.email}</p>
                      </TableCell>
                      <TableCell className="py-3 hidden sm:table-cell">
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + roleBadgeClass(u.role)}>
                          {u.role}
                        </span>
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
                          <button onClick={() => openEditUser(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Edit user">
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
        </motion.div>
      )}

      {/* ── Roles tab ── */}
      {tab === "roles" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {rolesLoading ? (
            <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : (
            <div className="divide-y divide-border">
              {roles.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No roles defined</p>
                </div>
              ) : roles.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + roleBadgeClass(r.name)}>
                        {r.name}
                      </span>
                      {r.isBuiltIn && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" /> Built-in
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{r.userCount} user{r.userCount !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-sm font-medium text-foreground mt-0.5">{r.displayName}</p>
                    {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                  </div>
                  {!r.isBuiltIn && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingRole(r); setEditRoleForm({ name: r.name, displayName: r.displayName, description: r.description ?? "" }); setEditRoleError(null); }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Edit role"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeletingRole(r)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* ── User modals ── */}
      {showCreate && (
        <UserModal
          title="New User"
          form={createForm}
          isCreate={true}
          roles={roles}
          onChange={patch => setCreateForm(f => ({ ...f, ...patch }))}
          onSave={() => createUserMut.mutate({ fullName: createForm.fullName.trim(), email: createForm.email.trim(), password: createForm.password, role: createForm.role })}
          onClose={() => setShowCreate(false)}
          saving={createUserMut.isPending}
          error={createError}
        />
      )}

      {editingUser && (
        <UserModal
          title={"Edit — " + editingUser.fullName}
          form={editForm}
          isCreate={false}
          roles={roles}
          onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
          onSave={() => updateUserMut.mutate({ userId: editingUser.id, fullName: editForm.fullName.trim(), role: editForm.role, isActive: editForm.isActive })}
          onClose={() => setEditingUser(null)}
          saving={updateUserMut.isPending}
          error={editError}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSave={pwd => resetMut.mutate({ userId: resetUser.id, newPassword: pwd })}
          saving={resetMut.isPending}
          error={resetError}
        />
      )}

      {/* ── Role modals ── */}
      {showCreateRole && (
        <RoleModal
          title="New Role"
          form={createRoleForm}
          isCreate={true}
          onChange={patch => setCreateRoleForm(f => ({ ...f, ...patch }))}
          onSave={() => createRoleMut.mutate(createRoleForm)}
          onClose={() => setShowCreateRole(false)}
          saving={createRoleMut.isPending}
          error={createRoleError}
        />
      )}

      {editingRole && (
        <RoleModal
          title={"Edit — " + editingRole.displayName}
          form={editRoleForm}
          isCreate={false}
          onChange={patch => setEditRoleForm(f => ({ ...f, ...patch }))}
          onSave={() => updateRoleMut.mutate({ id: editingRole.id, f: editRoleForm })}
          onClose={() => setEditingRole(null)}
          saving={updateRoleMut.isPending}
          error={editRoleError}
        />
      )}

      {/* Delete role confirmation */}
      {deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingRole(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="font-semibold">Delete role &ldquo;{deletingRole.name}&rdquo;?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This cannot be undone. Roles with assigned users cannot be deleted.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDeletingRole(null)} disabled={deleteRoleMut.isPending}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteRoleMut.mutate(deletingRole.id)}
                disabled={deleteRoleMut.isPending}
              >
                {deleteRoleMut.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
