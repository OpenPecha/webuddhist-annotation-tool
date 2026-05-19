import { apiClient } from "./utils";
import type {
  AdminManualUserCreate,
  ManualUserUpsertResponse,
  UserResponse,
  UserUpdate,
  UserFilters,
  UserStats,
  UserCreate,
  RegisterUserData,
  UserRoleResponse,
} from "./types";

export const usersApi = {
  createUser: async (userData: UserCreate): Promise<UserResponse> => {
    return apiClient.post<UserResponse>("/users/", userData);
  },

  /** Register or sync user on login. Upserts by auth0_user_id; works without auth token. */
  registerUser: async (userData: RegisterUserData): Promise<UserResponse> => {
    return apiClient.post<UserResponse>("/users/register", userData);
  },
  getCurrentUser: async (): Promise<UserResponse> => {
    return apiClient.get<UserResponse>("/users/me");
  },

  getUserRoleByAuth0Id: async (
    auth0UserId: string
  ): Promise<UserRoleResponse> => {
    return apiClient.get<UserRoleResponse>(
      `/users/auth0/${encodeURIComponent(auth0UserId)}/role`
    );
  },

  // Update current user info
  updateCurrentUser: async (userData: UserUpdate): Promise<UserResponse> => {
    return apiClient.put<UserResponse>("/users/me", userData);
  },

  /** Create or update staff user by email (admin only). */
  upsertManualUser: async (
    userData: AdminManualUserCreate
  ): Promise<ManualUserUpsertResponse> => {
    return apiClient.post<ManualUserUpsertResponse>("/users/manual", userData);
  },

  // Get all users (admin only)
  getAllUsers: async (filters?: UserFilters): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>(
      "/users/",
      filters as Record<string, string | number | boolean | undefined>
    );
  },

  // Get user by ID (admin only)
  getUserById: async (userId: number): Promise<UserResponse> => {
    return apiClient.get<UserResponse>(`/users/${userId}`);
  },

  // Update user (admin only)
  updateUser: async (
    userId: number,
    userData: UserUpdate
  ): Promise<UserResponse> => {
    return apiClient.put<UserResponse>(`/users/${userId}`, userData);
  },

  // Delete user (admin only)
  deleteUser: async (userId: number): Promise<void> => {
    return apiClient.delete<void>(`/users/${userId}`);
  },

  // Search users (admin only)
  searchUsers: async (
    query: string,
    filters?: UserFilters
  ): Promise<UserResponse[]> => {
    return apiClient.get<UserResponse[]>("/users/search/", {
      q: query,
      ...filters,
    } as Record<string, string | number | boolean | undefined>);
  },

  // Get user statistics
  getUserStats: async (): Promise<UserStats> => {
    return apiClient.get<UserStats>("/users/stats");
  },
};
