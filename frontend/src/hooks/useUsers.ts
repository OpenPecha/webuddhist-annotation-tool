import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/api/users";
import { queryKeys } from "@/constants/queryKeys";
import type { UserResponse, UserUpdate, UserFilters, UserStats } from "@/api/types";

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Get current user info
 */
export const useCurrentUser = () => {
  return useQuery<UserResponse>({
    queryKey: queryKeys.users.currentUser,
    queryFn: () => usersApi.getCurrentUser(),
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: false, // Don't retry on auth failures
  });
};

/**
 * Get all users (admin only)
 */
export const useUsers = (filters?: UserFilters) => {
  return useQuery<UserResponse[]>({
    queryKey: [...queryKeys.users.all, filters],
    queryFn: () => usersApi.getAllUsers(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Get user by ID (admin only)
 */
export const useUser = (userId: number, enabled = true) => {
  return useQuery<UserResponse>({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.getUserById(userId),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Search users (admin only)
 */
export const useSearchUsers = (query: string, filters?: UserFilters) => {
  return useQuery<UserResponse[]>({
    queryKey: [...queryKeys.users.search(query), filters],
    queryFn: () => usersApi.searchUsers(query, filters),
    enabled: query.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
};

/**
 * Get user statistics
 */
export const useUserStats = () => {
  return useQuery<UserStats>({
    queryKey: queryKeys.users.stats,
    queryFn: () => usersApi.getUserStats(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Update current user info
 */
export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserUpdate) => usersApi.updateCurrentUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.currentUser });
    },
  });
};

/**
 * Update user (admin only)
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: UserUpdate }) =>
      usersApi.updateUser(userId, userData),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

/**
 * Delete user (admin only)
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => usersApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

/**
 * Toggle user active status (admin only)
 * This is a convenience hook that uses updateUser under the hood
 */
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      usersApi.updateUser(userId, { is_active: isActive }),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

