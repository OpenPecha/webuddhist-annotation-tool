import { useQuery } from "@tanstack/react-query";
import { useAuth0 } from "@auth0/auth0-react";
import { usersApi } from "@/api/users";
import { queryKeys } from "@/constants/queryKeys";
import type { UserRoleResponse } from "@/api/types";
import { UserRole } from "@/api/types";

/**
 * Fetches app role and internal user id for the Auth0 subject (requires Bearer token).
 */
export function useUserRole() {
  const { user, isAuthenticated } = useAuth0();
  const auth0Sub = user?.sub;

  return useQuery<UserRoleResponse>({
    queryKey: queryKeys.users.roleByAuth0(auth0Sub ?? ""),
    queryFn: () => usersApi.getUserRoleByAuth0Id(auth0Sub!),
    enabled: Boolean(isAuthenticated && auth0Sub),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

/**
 * Role and permission helpers for the signed-in user (uses {@link useUserRole}).
 */
export function usePermission() {
  const query = useUserRole();
  const role = query.data?.role;
  const userId = query.data?.user_id;

  return {
    ...query,
    role,
    userId,
    isAdmin: role === UserRole.ADMIN,
    isAnnotator: role === UserRole.ANNOTATOR,
    isReviewer: role === UserRole.REVIEWER,
    isRegularUser: role === UserRole.USER,
  };
}
