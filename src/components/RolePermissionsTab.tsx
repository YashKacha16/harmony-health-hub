import { useState, useEffect, useMemo } from "react";
import { Shield, Loader2, Plus, Trash2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiService, RolePermissionBackendDto } from "@/api/apiService";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const MODULES: Record<string, string[]> = {
  "Reception": ["Access"],
  "OPD": ["Access"],
  "Medical": ["Access"],
  "Settings": ["Access"],
  "Employees": ["Access"]
};

export function RolePermissionsTab() {
  const { user, refreshPermissions } = useAuth();
  const isAdmin = user?.role === "Admin";
  
  const [apiPermissions, setApiPermissions] = useState<RolePermissionBackendDto[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoleOpen, setNewRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  const refreshData = async () => {
    try {
      setLoading(true);
      const [permsRes, empRes] = await Promise.all([
        apiService.rolePermissions.getAll(),
        apiService.employees.getAll(),
      ]);
      setApiPermissions(permsRes || []);
      setEmployees(empRes || []);
    } catch (err) {
      console.error("Failed to fetch permissions:", err);
      toast.error("Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const roles = useMemo(() => {
    const rolesMap: Record<string, any> = {};

    apiPermissions.forEach((p) => {
      const name = p.roleName;
      if (!name) return;
      if (!rolesMap[name]) {
        rolesMap[name] = {
          id: name,
          name: name,
          userCount: 0,
          locked: p.isLocked || false,
          permissions: {},
        };
      }

      if (p.isAllowed) {
        if (!rolesMap[name].permissions[p.moduleName]) {
          rolesMap[name].permissions[p.moduleName] = [];
        }
        rolesMap[name].permissions[p.moduleName].push(p.actionName);
      }
    });

    const roleCounts: Record<string, number> = {};
    employees.forEach((emp) => {
      const role = emp.role;
      if (role) {
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      }
    });

    Object.keys(rolesMap).forEach((roleName) => {
      if (roleCounts[roleName] !== undefined) {
        rolesMap[roleName].userCount = roleCounts[roleName];
      }
    });

    // Add default roles if they don't exist yet
    ["Admin", "Doctor", "Receptionist", "Pharmacist"].forEach(defaultRole => {
      if (!rolesMap[defaultRole]) {
         rolesMap[defaultRole] = {
            id: defaultRole,
            name: defaultRole,
            userCount: roleCounts[defaultRole] || 0,
            locked: false,
            permissions: {}
         };
      }
    });

    return Object.values(rolesMap);
  }, [apiPermissions, employees]);

  const effectiveSelectedId = useMemo(() => {
    if (selectedId && roles.some((r) => r.id === selectedId)) return selectedId;
    return roles[0]?.id ?? "";
  }, [roles, selectedId]);

  const role = useMemo(
    () => roles.find((r) => r.id === effectiveSelectedId) ?? null,
    [roles, effectiveSelectedId],
  );

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setIsCreating(true);
    try {
      const roleName = newRoleName.trim();
      const promises: Promise<any>[] = [];
      
      Object.entries(MODULES).forEach(([mod, actions]) => {
        actions.forEach((action) => {
          promises.push(
            apiService.rolePermissions.save({
              roleName,
              moduleName: mod,
              actionName: action,
              isAllowed: false,
              isLocked: false,
            }),
          );
        });
      });

      await Promise.all(promises);

      toast.success("Role initialized");
      setNewRoleOpen(false);
      setNewRoleName("");
      refreshData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to create role");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleModule = async (mod: string, isAllowed: boolean) => {
    if (!role || role.locked || !isAdmin) return;

    setApiPermissions((prev) => {
      const next = [...prev];
      const idx = next.findIndex(p => p.roleName === role.name && p.moduleName === mod && p.actionName === "Access");
      if (idx >= 0) {
        next[idx] = { ...next[idx], isAllowed };
      } else {
        next.push({ id: Date.now(), roleName: role.name, moduleName: mod, actionName: "Access", isAllowed, isLocked: role.locked });
      }
      return next;
    });

    try {
      await apiService.rolePermissions.save({
        roleName: role.name,
        moduleName: mod,
        actionName: "Access",
        isAllowed: isAllowed,
        isLocked: role.locked,
      });
      await refreshPermissions();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to update ${mod}`);
      refreshData();
    }
  };

  const handleToggleLock = async (roleName: string, isLocked: boolean) => {
    try {
      await apiService.rolePermissions.toggleLock(roleName, isLocked);
      toast.success(`Role ${isLocked ? 'locked' : 'unlocked'}`);
      refreshData();
    } catch (e: any) {
      toast.error("Failed to toggle lock");
    }
  };

  const handleDeleteRole = async (roleName: string) => {
    const r = roles.find((x) => x.id === roleName);
    const userCount = r?.userCount ?? 0;
    if (userCount > 0) {
      toast.error(`This role is assigned to ${userCount} user(s).`);
      return;
    }
    
    if (!window.confirm(`Delete role "${roleName}" and all of its permissions?`)) return;

    const ids = apiPermissions
      .filter((p) => p.roleName === roleName && !p.isLocked)
      .map((p) => p.id);

    if (ids.length === 0) {
      toast.error("No permissions to delete, or they are locked.");
      return;
    }

    setIsDeletingRole(true);
    try {
      await Promise.all(ids.map((id) => apiService.rolePermissions.delete(id)));
      toast.success("Role deleted");
      setSelectedId("");
      refreshData();
    } catch (err: any) {
      toast.error("Failed to delete role permissions");
    } finally {
      setIsDeletingRole(false);
    }
  };

  const submitRenameRole = async () => {
    if (!role || role.locked) return;
    const next = renameValue.trim();
    if (!next || next === role.name) {
      setRenameOpen(false);
      return;
    }
    setIsRenaming(true);
    try {
      await apiService.rolePermissions.renameRole(role.name, next);
      toast.success("Role renamed");
      setRenameOpen(false);
      setSelectedId(next);
      refreshData();
    } catch (err: any) {
      toast.error("Failed to rename role");
    } finally {
      setIsRenaming(false);
    }
  };

  if (loading && roles.length === 0) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Roles & Permissions</h3>
          <p className="text-sm text-muted-foreground">Manage access control for different user roles.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setNewRoleOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" /> New Role
          </Button>
        )}
      </div>

      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3 flex items-center gap-2 text-sm text-amber-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>You need Admin privileges to modify roles and permissions.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        <Card className="p-2 space-y-1 h-fit">
          {roles.map((r) => (
            <div key={r.id} className="group relative">
              <button
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "w-full text-left rounded-md px-3 py-2 flex items-center gap-2",
                  r.id === effectiveSelectedId ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  <div className="text-[11px] text-muted-foreground">{r.userCount} users</div>
                </div>
                {r.locked && <span className="text-[10px] text-muted-foreground">locked</span>}
              </button>
              {!r.locked && isAdmin && r.userCount === 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDeleteRole(r.id); }}
                  disabled={isDeletingRole}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded hover:bg-destructive/10 text-destructive transition-opacity"
                >
                  {isDeletingRole ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </Card>

        <Card className="p-4 sm:p-5">
          {role ? (
            <>
              <div className="flex justify-between items-start mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">{role.name}</h3>
                    {!role.locked && isAdmin && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setRenameValue(role.name); setRenameOpen(true); }}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{role.userCount} users assigned</p>
                </div>
                {isAdmin && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={role.locked} onCheckedChange={(c) => handleToggleLock(role.name, !!c)} />
                    <span>Lock Role</span>
                  </label>
                )}
              </div>

              <div className="space-y-4">
                {Object.keys(MODULES).map((mod) => {
                  const isAllowed = role.permissions[mod]?.includes("Access") ?? false;

                  return (
                    <div key={mod} className="rounded-lg border bg-card p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isAllowed}
                          onCheckedChange={(c) => handleToggleModule(mod, !!c)}
                          disabled={role.locked || !isAdmin}
                        />
                        <span className="font-medium text-sm">{mod}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">Select a role</div>
          )}
        </Card>
      </div>

      <Dialog open={newRoleOpen} onOpenChange={setNewRoleOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Role Name</Label>
              <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="e.g. Manager" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewRoleOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRole} disabled={isCreating || !newRoleName.trim()}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename Role</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Role Name</Label>
              <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={submitRenameRole} disabled={isRenaming || !renameValue.trim()}>
              {isRenaming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
