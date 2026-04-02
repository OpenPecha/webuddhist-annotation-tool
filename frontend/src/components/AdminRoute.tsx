import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks";
import { AppLoading } from "@/components/ui/loading";
import { UserRole } from "@/api/types";

type AdminRouteProps = Readonly<{ children: ReactNode }>;

/**
 * Renders children only when the current user is an admin; otherwise redirects to /dashboard.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { data: user, isPending, isError } = useCurrentUser();

  if (isPending) {
    return <AppLoading message="Loading…" />;
  }

  if (isError || !user || user.role !== UserRole.ADMIN) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
