import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { store, type Employee, type Role } from "./store";
import { apiService } from "@/api/apiService";

interface AuthCtx {
  user: Employee | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
  hasPermission: (module: string, action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "hms.auth";
const PERM_KEY = "hms.permissions";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
      const rawPerms = localStorage.getItem(PERM_KEY);
      if (rawPerms) setPermissions(JSON.parse(rawPerms));
    } catch {}
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const emp = await apiService.auth.login(email, password);
      // Ensure the returned user matches the local Employee type which uses lowercase role 
      // but Employee uses string, so it should be fine since we parse it out.
      // We need to cast it since API returns EmployeeBackendDto which is essentially the same structure.
      const userToStore = emp as unknown as Employee;
      localStorage.setItem(KEY, JSON.stringify(userToStore));
      setUser(userToStore);
      
      // Fetch permissions for the role
      try {
        const perms = await apiService.rolePermissions.getAll();
        const rolePerms = perms.filter(p => p.roleName === userToStore.role && p.isAllowed);
        localStorage.setItem(PERM_KEY, JSON.stringify(rolePerms));
        setPermissions(rolePerms);
      } catch (e) {
        console.error("Failed to load permissions", e);
      }
      
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Invalid credentials or inactive account" };
    }
  };

  const logout = async () => {
    try {
      await apiService.auth.logout();
    } catch (e) {
      console.error("Logout error", e);
    } finally {
      localStorage.removeItem(KEY);
      localStorage.removeItem(PERM_KEY);
      setUser(null);
      setPermissions([]);
    }
  };

  const hasRole = (roles: Role[]) => !!user && roles.includes(user.role);
  
  const hasPermission = (module: string, action: string) => {
    return permissions.some(p => p.moduleName === module && p.actionName === action);
  };
  
  const refreshPermissions = async () => {
    if (!user) return;
    try {
      const perms = await apiService.rolePermissions.getAll();
      const rolePerms = perms.filter(p => p.roleName === user.role && p.isAllowed);
      localStorage.setItem(PERM_KEY, JSON.stringify(rolePerms));
      setPermissions(rolePerms);
    } catch (e) {
      console.error("Failed to refresh permissions", e);
    }
  };

  return <Ctx.Provider value={{ user, login, logout, hasRole, hasPermission, refreshPermissions }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
