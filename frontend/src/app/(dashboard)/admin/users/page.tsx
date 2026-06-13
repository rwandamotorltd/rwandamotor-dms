"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Users, Plus, Pencil, X, ShieldCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import { adminApi, type CreateUserPayload, type UpdateUserPayload, type UserItem } from "@/lib/api";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = ["Admin", "TechnicalDirector", "CRMOfficer", "CRE"];

const ROLE_COLORS: Record<string, string> = {
  Admin:             "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400",
  TechnicalDirector: "bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
  CRMOfficer:        "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
  CRE:               "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
};

// ─── User Form Modal ───────────────────────────────────────────

interface UserFormState {
  fullName: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

const EMPTY_FORM: UserFormState = { fullName: "", email: "", password: "", role: "CRE", isActive: true };

interface UserModalProps {
  title: string;
  form: UserFormState;
  isCreate: boolean;
  onChange: (patch: Partial<UserFormState>) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
  error?: string | null;
}

function UserModal({ title, form, isCreate, onChange, onSave, onClose, saving, error }: UserModalProps) {
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
            <Select value={form.role} onValueChange={v => onChange({ role: v ?? "CRE" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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

// ─── Page ─────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  // All hooks declared before any early return (React rules)
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<UserFormState>(EMPTY_FORM);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editForm, setEditForm] = useState<UserFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState<string | null>(null);

  const [resetUser, setResetUser] = useState<UserItem | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== "Admin") router.replace("/dashboard");
  }, [user, router]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.getUsers(),
    enabled: user?.role === "Admin",
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => adminApi.createUser(payload),
    onSuccess: (res) => {
      if (!res.success) { setCreateError(res.message ?? "Failed to create user"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      setCreateError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setCreateError(msg ?? "Failed to create user");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateUserPayload) => adminApi.updateUser(payload),
    onSuccess: (res) => {
      if (!res.success) { setEditError(res.message ?? "Failed to update user"); return; }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      setEditError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? "Failed to update user");
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      adminApi.resetPassword(userId, newPassword),
    onSuccess: (res) => {
      if (!res.success) { setResetError(res.message ?? "Failed to reset password"); return; }
      setResetUser(null);
      setResetError(null);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResetError(msg ?? "Failed to reset password");
    },
  });

  if (user?.role !== "Admin") return null;

  const openEdit = (u: UserItem) => {
    setEditingUser(u);
    setEditForm({ fullName: u.fullName, email: u.email, password: "", role: u.role, isActive: u.isActive });
    setEditError(null);
  };

  const handleCreate = () => {
    createMutation.mutate({
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      role: createForm.role,
    });
  };

  const handleUpdate = () => {
    if (!editingUser) return;
    updateMutation.mutate({
      userId: editingUser.id,
      fullName: editForm.fullName.trim(),
      role: editForm.role,
      isActive: editForm.isActive,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            User Management
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Manage system users, roles and access</p>
        </div>
        <Button
          className="gradient-primary text-white gap-2"
          onClick={() => { setCreateForm(EMPTY_FORM); setCreateError(null); setShowCreate(true); }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New User</span>
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
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
                      <span className={"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium " + (ROLE_COLORS[u.role] ?? "bg-muted text-muted-foreground")}>
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
                        <button
                          onClick={() => { setResetUser(u); setResetError(null); }}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit user"
                        >
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

      {showCreate && (
        <UserModal
          title="New User"
          form={createForm}
          isCreate={true}
          onChange={patch => setCreateForm(f => ({ ...f, ...patch }))}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          saving={createMutation.isPending}
          error={createError}
        />
      )}

      {editingUser && (
        <UserModal
          title={"Edit — " + editingUser.fullName}
          form={editForm}
          isCreate={false}
          onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
          onSave={handleUpdate}
          onClose={() => setEditingUser(null)}
          saving={updateMutation.isPending}
          error={editError}
        />
      )}

      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          onSave={(newPassword) => resetMutation.mutate({ userId: resetUser.id, newPassword })}
          saving={resetMutation.isPending}
          error={resetError}
        />
      )}
    </div>
  );
}
