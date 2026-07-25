import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { store, type Employee, type Role } from "./store";

interface AuthCtx {
  user: Employee | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  hasRole: (roles: Role[]) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "hms.auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login = (email: string, password: string) => {
    const db = store.get();
    const emp = db.employees.find(
      (e) => e.email.toLowerCase() === email.toLowerCase() && e.password === password && e.active,
    );
    if (!emp) return { ok: false, error: "Invalid credentials or inactive account" };
    localStorage.setItem(KEY, JSON.stringify(emp));
    setUser(emp);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setUser(null);
  };

  const hasRole = (roles: Role[]) => !!user && roles.includes(user.role);

  return <Ctx.Provider value={{ user, login, logout, hasRole }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
