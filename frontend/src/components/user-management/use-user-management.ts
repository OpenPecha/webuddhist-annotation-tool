import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { AdminManualUserCreate, UserRole } from "@/api/types";
import {
  useSearchUsers,
  useToggleUserStatus,
  useUpdateUser,
  useUpsertManualUser,
  useUsers,
} from "@/hooks";

import type { RoleFilter, StatusFilter } from "./constants";
import { filterStaffUsers } from "./utils";

const SEARCH_DEBOUNCE_MS = 300;

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function useUserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("all");
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => globalThis.clearTimeout(timer);
  }, [searchQuery]);

  const isSearchActive = debouncedSearch.length > 0;

  const usersQuery = useUsers(
    {
      role: selectedRole === "all" ? undefined : selectedRole,
      exclude_role: "user",
      is_active:
        selectedStatus === "all" ? undefined : selectedStatus === "active",
    },
    { enabled: !isSearchActive }
  );

  const searchQueryResult = useSearchUsers(debouncedSearch);

  const updateUserMutation = useUpdateUser();
  const toggleUserStatusMutation = useToggleUserStatus();
  const upsertManualUserMutation = useUpsertManualUser();

  const displayUsers = useMemo(() => {
    const raw = isSearchActive
      ? (searchQueryResult.data ?? [])
      : (usersQuery.data ?? []);
    return filterStaffUsers(raw);
  }, [isSearchActive, searchQueryResult.data, usersQuery.data]);

  const isListLoading = isSearchActive
    ? searchQueryResult.isLoading
    : usersQuery.isLoading;

  const listError = isSearchActive ? searchQueryResult.error : usersQuery.error;

  const handleRoleChange = (userId: number, newRole: UserRole) => {
    updateUserMutation.mutate(
      { userId, userData: { role: newRole } },
      {
        onSuccess: (updatedUser) => {
          toast.success("User updated", {
            description: `${updatedUser.username} is now ${updatedUser.role}.`,
          });
        },
        onError: (error) => {
          toast.error("Update failed", {
            description: getErrorMessage(error, "Could not update user role."),
          });
        },
      }
    );
  };

  const handleStatusToggle = (userId: number, currentStatus: boolean) => {
    toggleUserStatusMutation.mutate(
      { userId, isActive: !currentStatus },
      {
        onSuccess: (updatedUser) => {
          const action = updatedUser.is_active ? "activated" : "deactivated";
          toast.success("Status updated", {
            description: `${updatedUser.username} was ${action}.`,
          });
        },
        onError: (error) => {
          toast.error("Status update failed", {
            description: getErrorMessage(error, "Could not update user status."),
          });
        },
      }
    );
  };

  const isUpdatingRole = (userId: number) =>
    updateUserMutation.isPending &&
    updateUserMutation.variables?.userId === userId;

  const isUpdatingStatus = (userId: number) =>
    toggleUserStatusMutation.isPending &&
    toggleUserStatusMutation.variables?.userId === userId;

  const handleAddUser = (data: AdminManualUserCreate) => {
    upsertManualUserMutation.mutate(data, {
      onSuccess: (result) => {
        const action = result.created ? "created" : "updated";
        toast.success(`User ${action}`, {
          description: result.created
            ? `${result.full_name || result.username} was added as ${result.role}.`
            : `${result.email} is now ${result.role} and active.`,
        });
        setIsAddUserOpen(false);
      },
      onError: (error) => {
        toast.error("Could not save user", {
          description: getErrorMessage(error, "Please check the form and try again."),
        });
      },
    });
  };

  return {
    isAddUserOpen,
    setIsAddUserOpen,
    handleAddUser,
    isAddingUser: upsertManualUserMutation.isPending,
    searchQuery,
    setSearchQuery,
    selectedRole,
    setSelectedRole,
    selectedStatus,
    setSelectedStatus,
    displayUsers,
    isListLoading,
    listError,
    handleRoleChange,
    handleStatusToggle,
    isUpdatingRole,
    isUpdatingStatus,
  };
}
