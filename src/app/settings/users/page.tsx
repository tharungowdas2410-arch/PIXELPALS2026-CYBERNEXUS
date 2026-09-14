"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  createUser,
  getUsers,
  resetUserPassword,
  updateUser,
  type UserItem,
} from "@/lib/api";

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create User Form State
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("security_analyst");
  const [creating, setCreating] = useState(false);

  // Password reset message
  const [resetFeedback, setResetFeedback] = useState<{ userId: string; tempPass?: string; message: string } | null>(null);

  const fetchUserDirectory = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load user directory. Admin permission required.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDirectory();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      setError(null);
      await createUser({
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        role: newRole,
      });
      setSuccessMsg(`User ${newEmail} created successfully.`);
      setShowCreate(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      await fetchUserDirectory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      setError(null);
      await updateUser(user.id, { is_active: !user.is_active });
      setSuccessMsg(`Updated status for ${user.email}`);
      await fetchUserDirectory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user status");
    }
  };

  const handleRoleChange = async (userId: string, newRoleValue: string) => {
    try {
      setError(null);
      await updateUser(userId, { role: newRoleValue });
      setSuccessMsg("User role updated successfully");
      await fetchUserDirectory();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user role");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      setError(null);
      const res = await resetUserPassword(userId);
      setResetFeedback({
        userId,
        tempPass: res.temporary_password,
        message: res.message,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reset user password");
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "destructive";
      case "ciso":
        return "default";
      case "security_analyst":
        return "secondary";
      case "risk_manager":
        return "outline";
      case "executive":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="User Administration & RBAC"
        description="Manage organization users, role assignments, account active states, and administrative password resets."
      >
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchUserDirectory} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        </div>
      </PageHeader>

      {error && (
        <Card className="border-rose-800 bg-rose-950/20 text-rose-300">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {successMsg && (
        <Card className="border-emerald-800 bg-emerald-950/20 text-emerald-300">
          <CardContent className="flex items-center gap-3 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm">{successMsg}</p>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Temporary Password Alert */}
      {resetFeedback && (
        <Card className="border-primary/50 bg-primary/10">
          <CardContent className="flex items-center justify-between py-3 text-xs">
            <div className="space-y-1">
              <span className="font-semibold block">Administrative Password Reset</span>
              <span>{resetFeedback.message}</span>
              {resetFeedback.tempPass && (
                <div className="mt-1 font-mono font-bold text-sm text-primary">
                  Temporary Password: <span className="bg-background px-2 py-0.5 rounded border">{resetFeedback.tempPass}</span>
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setResetFeedback(null)}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create User Collapsible Form */}
      {showCreate && (
        <Card className="border-primary/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Provision New User Account
            </CardTitle>
            <CardDescription className="text-xs">
              Requires email, password adhering to policy (8+ chars, numbers, symbols), and assigned RBAC role.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateUser} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <Input
                  required
                  placeholder="e.g. Alex Taylor"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Work Email</label>
                <Input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Initial Password</label>
                <Input
                  type="password"
                  required
                  placeholder="Min 8 chars, 1 num, 1 symbol"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">RBAC Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                >
                  <option value="admin">ADMIN</option>
                  <option value="ciso">CISO</option>
                  <option value="security_analyst">SECURITY ANALYST</option>
                  <option value="risk_manager">RISK MANAGER</option>
                  <option value="executive">EXECUTIVE</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Save & Provision User"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Users Directory Table */}
      <Card className="border-border/60">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base font-semibold">Active Directory Accounts</CardTitle>
          <CardDescription className="text-xs">
            {users.length} registered user identity profiles in this organization
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-y border-border bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="p-3">User / Identity</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Account Status</th>
                  <th className="p-3">Lockout Guard</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      <RefreshCw className="mx-auto h-5 w-5 animate-spin mb-2" />
                      Loading user directory...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/10 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        {u.full_name}
                        <span className="block font-mono text-[10px] text-muted-foreground font-normal">
                          {u.id.substring(0, 8)}...
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground font-mono text-[11px]">
                        {u.email}
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role.toLowerCase()}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="rounded border border-border bg-background px-2 py-0.5 text-[11px] font-semibold"
                        >
                          <option value="admin">ADMIN</option>
                          <option value="ciso">CISO</option>
                          <option value="security_analyst">SECURITY_ANALYST</option>
                          <option value="risk_manager">RISK_MANAGER</option>
                          <option value="executive">EXECUTIVE</option>
                        </select>
                      </td>
                      <td className="p-3">
                        {u.is_active ? (
                          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-950/20 text-emerald-400 text-[10px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-muted bg-muted text-muted-foreground text-[10px]">
                            Suspended
                          </Badge>
                        )}
                      </td>
                      <td className="p-3">
                        {u.is_locked ? (
                          <Badge variant="destructive" className="text-[10px] flex items-center gap-1 w-fit">
                            <Lock className="h-3 w-3" /> Locked ({u.failed_login_attempts})
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            Clean ({u.failed_login_attempts}/5)
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetPassword(u.id)}
                          className="h-7 text-xs"
                          title="Generate new temporary password"
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1" />
                          Reset PW
                        </Button>
                        <Button
                          variant={u.is_active ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleToggleActive(u)}
                          className="h-7 text-xs"
                        >
                          {u.is_active ? "Suspend" : "Activate"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
