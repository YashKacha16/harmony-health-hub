import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import type { Role } from "@/lib/store";

export function RequireAuth({ children, module, action }: { children: ReactNode; module?: string; action?: string }) {
  const { user, hasPermission } = useAuth();
  if (!user) return <Navigate to="/login" />;
  
  if (module && action && !hasPermission(module, action)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Access denied</h2>
          <p className="text-sm text-muted-foreground mt-1">Your role does not have access to this page.</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
