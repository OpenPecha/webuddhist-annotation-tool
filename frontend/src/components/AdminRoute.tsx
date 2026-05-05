import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermission } from "@/hooks";
import { AppLoading } from "@/components/ui/loading";

type AdminRouteProps = Readonly<{ children: ReactNode }>;

/**
 * Renders children only when the current user is an admin; otherwise redirects to /dashboard.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { isPending, isError, isAdmin } = usePermission();

  if (isPending) {
    return <AppLoading message="Loading…" />;
  }

  if (isError || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
