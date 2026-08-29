import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ClipboardList, Stethoscope, Pill, Settings as SettingsIcon, LogOut, Menu,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/store";

const NAV: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; roles: Role[] }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Doctor", "Nurse", "Receptionist", "Pharmacist"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["Admin", "Doctor"] },
  { to: "/reception", label: "Reception", icon: ClipboardList, roles: ["Admin", "Receptionist", "Doctor"] },
  { to: "/opd", label: "OPD", icon: Stethoscope, roles: ["Admin", "Doctor", "Nurse"] },
  { to: "/medical", label: "Medical / Pharmacy", icon: Pill, roles: ["Admin", "Pharmacist", "Doctor"] },
  { to: "/settings", label: "Settings", icon: SettingsIcon, roles: ["Admin", "Doctor"] },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  if (!user) return <>{children}</>;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">MediCore HMS</div>
          <div className="text-xs text-muted-foreground truncate">Hospital Management</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {items.map((n) => {
          const Active = isActive(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                Active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground font-semibold">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.role}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <div className="hidden md:block sticky top-0 h-screen">{Sidebar}</div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-sm font-medium text-muted-foreground truncate flex-1">
            {items.find((n) => isActive(n.to))?.label || "Dashboard"}
          </h1>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        <footer className="sticky bottom-0 z-30 py-2 text-center text-xs text-muted-foreground border-t bg-card/90 backdrop-blur">
          Developed and managed by Pheonix Infotech
        </footer>
      </div>
    </div>
  );
}
