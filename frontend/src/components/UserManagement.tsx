import { useState, type ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  IoSearch,
  IoPeople,
  IoShieldCheckmark,
  IoEye,
  IoCreateOutline,
} from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import type { UserRole, UserResponse } from "@/api/types";
import {
  useUsers,
  useSearchUsers,
  useUpdateUser,
  useToggleUserStatus,
} from "@/hooks";

type UserManagementProps = Readonly<{ className?: string }>;

type UserTableRowProps = Readonly<{
  user: UserResponse;
  isUpdatingRole: boolean;
  isUpdatingStatus: boolean;
  onRoleChange: (userId: number, newRole: UserRole) => void;
  onStatusToggle: (userId: number, currentStatus: boolean) => void;
}>;

function getRoleIcon(role: UserRole) {
  switch (role) {
    case "admin":
      return <IoShieldCheckmark className="w-4 h-4" />;
    case "reviewer":
      return <IoCreateOutline className="w-4 h-4" />;
    case "annotator":
      return <IoPeople className="w-4 h-4" />;
    case "user":
      return <IoEye className="w-4 h-4" />;
    default:
      return <IoEye className="w-4 h-4" />;
  }
}

function UserTableRow({
  user,
  isUpdatingRole,
  isUpdatingStatus,
  onRoleChange,
  onStatusToggle,
}: UserTableRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {getRoleIcon(user.role)}
          <span className="font-medium text-gray-900">
            {user.full_name || user.username}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
      <td className="px-4 py-3 text-sm text-gray-500">@{user.username}</td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
          disabled={isUpdatingRole}
          className="w-32 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="admin">Admin</option>
          <option value="reviewer">Reviewer</option>
          <option value="annotator">Annotator</option>
          <option value="user">User</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            user.is_active
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {user.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-4 py-3">
        <Button
          size="sm"
          variant={user.is_active ? "destructive" : "outline"}
          onClick={() => onStatusToggle(user.id, user.is_active)}
          disabled={isUpdatingStatus}
        >
          {user.is_active ? "Deactivate" : "Activate"}
        </Button>
      </td>
    </tr>
  );
}

export function UserManagement({ className }: UserManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  // Fetch users
  const {
    data: users = [],
    isLoading,
    error,
  } = useUsers({
    role: selectedRole === "all" ? undefined : selectedRole,
    is_active:
      selectedStatus === "all" ? undefined : selectedStatus === "active",
  });

  // Search users
  const { data: searchResults = [], isLoading: isSearching } = useSearchUsers(
    searchQuery
  );

  // Update user role mutation
  const updateUserMutation = useUpdateUser();

  // Toggle user status mutation
  const toggleUserStatusMutation = useToggleUserStatus();

  const handleRoleChange = (userId: number, newRole: UserRole) => {
    updateUserMutation.mutate(
      { userId, userData: { role: newRole } },
      {
        onSuccess: (updatedUser) => {
          toast.success("✅ User Updated", {
            description: `Successfully updated ${updatedUser.username}'s role to ${updatedUser.role}`,
          });
        },
        onError: (error) => {
          toast.error("❌ Update Failed", {
            description:
              error instanceof Error ? error.message : "Failed to update user role",
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
          toast.success("✅ User Status Updated", {
            description: `Successfully ${
              updatedUser.is_active ? "activated" : "deactivated"
            } ${updatedUser.username}`,
          });
        },
        onError: (error) => {
          toast.error("❌ Status Update Failed", {
            description:
              error instanceof Error
                ? error.message
                : "Failed to update user status",
          });
        },
      }
    );
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const displayUsers = searchQuery.length > 0 ? searchResults : users;

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>
              Error loading users:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  let usersListBody: ReactNode;
  if (isLoading || isSearching) {
    usersListBody = (
      <div className="flex items-center justify-center py-8">
        <AiOutlineLoading3Quarters className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-blue-600">Loading users...</span>
      </div>
    );
  } else if (displayUsers.length === 0) {
    usersListBody = (
      <div className="text-center py-8 text-gray-500">
        <IoPeople className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No users found</p>
      </div>
    );
  } else {
    usersListBody = (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse">
          <caption className="sr-only">User management table</caption>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Email
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Username
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {displayUsers.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                isUpdatingRole={updateUserMutation.isPending}
                isUpdatingStatus={toggleUserStatusMutation.isPending}
                onRoleChange={handleRoleChange}
                onStatusToggle={handleStatusToggle}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IoPeople className="w-5 h-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user accounts, roles, and permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <IoSearch className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by username or email..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedRole}
            onChange={(e) =>
              setSelectedRole(e.target.value as UserRole | "all")
            }
            className="w-full md:w-40 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="reviewer">Reviewer</option>
            <option value="annotator">Annotator</option>
            <option value="user">User</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) =>
              setSelectedStatus(e.target.value as "all" | "active" | "inactive")
            }
            className="w-full md:w-40 pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {usersListBody}
      </CardContent>
    </Card>
  );
}
