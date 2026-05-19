import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { UserResponse, UserRole } from "@/api/types";

import { ROLE_LABELS, USER_ROLES } from "./constants";
import { getRoleIcon, getUserDisplayName } from "./utils";

const selectClassName = cn(
  "h-9 w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

type UserTableRowProps = Readonly<{
  user: UserResponse;
  isUpdatingRole: boolean;
  isUpdatingStatus: boolean;
  onRoleChange: (userId: number, newRole: UserRole) => void;
  onStatusToggle: (userId: number, currentStatus: boolean) => void;
}>;

export function UserTableRow({
  user,
  isUpdatingRole,
  isUpdatingStatus,
  onRoleChange,
  onStatusToggle,
}: UserTableRowProps) {
  const RoleIcon = getRoleIcon(user.role);

  return (
    <tr className="border-b border-border/60 transition-colors hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <RoleIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="font-medium text-foreground">
            {getUserDisplayName(user)}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        @{user.username}
      </td>
      <td className="px-4 py-3">
        <select
          value={user.role}
          onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
          disabled={isUpdatingRole}
          className={selectClassName}
          aria-label={`Role for ${user.username}`}
        >
          {USER_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <Badge variant={user.is_active ? "default" : "secondary"}>
          {user.is_active ? "Active" : "Inactive"}
        </Badge>
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
