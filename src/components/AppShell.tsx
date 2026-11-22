import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, ClipboardList, Stethoscope, Pill, Settings as SettingsIcon, LogOut, Menu, BedDouble, Receipt, FlaskConical, X
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/store";

const NAV: { to: string; label: string; icon: React.ComponentType<{ className?: string }>; requiredModule?: string; requiredAction?: string }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/employees", label: "Employees", icon: Users, requiredModule: "Employees", requiredAction: "Access" },
  { to: "/reception", label: "Reception", icon: ClipboardList, requiredModule: "Reception", requiredAction: "Access" },
  { to: "/opd", label: "OPD", icon: Stethoscope, requiredModule: "OPD", requiredAction: "Access" },
  { to: "/ipd", label: "IPD", icon: BedDouble, requiredModule: "OPD", requiredAction: "Access" },
  { to: "/billing", label: "Billing", icon: Receipt, requiredModule: "Reception", requiredAction: "Access" },
  { to: "/medical", label: "Medical / Pharmacy", icon: Pill, requiredModule: "Medical", requiredAction: "Access" },
  { to: "/laboratory", label: "Laboratory", icon: FlaskConical, requiredModule: "Laboratory", requiredAction: "Access" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, requiredModule: "Settings", requiredAction: "Access" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!user) return <>{children}</>;

  const items = NAV.filter((n) => {
    if (!n.requiredModule) return true;
    return hasPermission(n.requiredModule, n.requiredAction || "View");
  });

  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const renderSidebar = (isMobile = false) => (
    <aside className={cn("flex h-full flex-col bg-sidebar text-sidebar-foreground", isMobile ? "w-full" : "w-64 border-r")}>
      <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg shadow-sm">
            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate">Lifecare Hospital</div>
            <div className="text-[11px] text-muted-foreground truncate">Hospital Management</div>
          </div>
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {items.map((n) => {
          const Active = isActive(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
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

      <div className="border-t border-sidebar-border p-3 bg-sidebar/50">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-card/40 border border-border/40">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">{user.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{user.role}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
            onClick={() => { logout(); navigate({ to: "/login" }); }}
            aria-label="Sign out"
            title="Sign out"
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
      <div className="hidden md:block sticky top-0 h-screen">{renderSidebar(false)}</div>

      {/* Mobile drawer with backdrop and smooth slide-in animation */}
      <div 
        className={cn(
          "fixed inset-0 z-50 md:hidden transition-all duration-300",
          open ? "pointer-events-auto visible" : "pointer-events-none invisible"
        )}
      >
        {/* Backdrop */}
        <div 
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out",
            open ? "opacity-100" : "opacity-0"
          )} 
          onClick={() => setOpen(false)} 
        />
        {/* Drawer panel */}
        <div 
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] sm:w-[320px] max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {renderSidebar(true)}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 backdrop-blur px-4 md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
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
