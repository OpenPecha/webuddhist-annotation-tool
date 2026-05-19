import { IoSearch } from "react-icons/io5";

import { cn } from "@/lib/utils";

import {
  ROLE_LABELS,
  STAFF_FILTER_ROLES,
  type RoleFilter,
  type StatusFilter,
} from "./constants";

const selectClassName = cn(
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

type UsersFiltersProps = Readonly<{
  searchQuery: string;
  selectedRole: RoleFilter;
  selectedStatus: StatusFilter;
  onSearchChange: (value: string) => void;
  onRoleChange: (role: RoleFilter) => void;
  onStatusChange: (status: StatusFilter) => void;
}>;

export function UsersFilters({
  searchQuery,
  selectedRole,
  selectedStatus,
  onSearchChange,
  onRoleChange,
  onStatusChange,
}: UsersFiltersProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row">
      <div className="relative flex-1">
        <IoSearch
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Search staff by username or email…"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={cn(
            selectClassName,
            "pl-10",
            "placeholder:text-muted-foreground"
          )}
          aria-label="Search users"
        />
      </div>
      <select
        value={selectedRole}
        onChange={(e) => onRoleChange(e.target.value as RoleFilter)}
        className={cn(selectClassName, "md:w-44")}
        aria-label="Filter by role"
      >
        <option value="all">All staff roles</option>
        {STAFF_FILTER_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      <select
        value={selectedStatus}
        onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
        className={cn(selectClassName, "md:w-40")}
        aria-label="Filter by status"
      >
        <option value="all">All status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
