import { IoPeople } from "react-icons/io5";

import type { UserResponse, UserRole } from "@/api/types";

import { UserTableRow } from "./user-table-row";

type UsersTableProps = Readonly<{
  users: UserResponse[];
  isUpdatingRole: (userId: number) => boolean;
  isUpdatingStatus: (userId: number) => boolean;
  onRoleChange: (userId: number, newRole: UserRole) => void;
  onStatusToggle: (userId: number, currentStatus: boolean) => void;
}>;

const TABLE_HEADERS = [
  "Name",
  "Email",
  "Username",
  "Role",
  "Status",
  "Actions",
] as const;

export function UsersTable({
  users,
  isUpdatingRole,
  isUpdatingStatus,
  onRoleChange,
  onStatusToggle,
}: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <IoPeople className="mb-4 h-12 w-12 opacity-40" aria-hidden />
        <p className="text-sm">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <caption className="sr-only">User management table</caption>
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {TABLE_HEADERS.map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              isUpdatingRole={isUpdatingRole(user.id)}
              isUpdatingStatus={isUpdatingStatus(user.id)}
              onRoleChange={onRoleChange}
              onStatusToggle={onStatusToggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
