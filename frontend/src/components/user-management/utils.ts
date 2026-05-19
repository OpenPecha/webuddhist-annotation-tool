import {
  IoCreateOutline,
  IoEye,
  IoPeople,
  IoShieldCheckmark,
} from "react-icons/io5";
import type { UserResponse, UserRole } from "@/api/types";

export function getUserDisplayName(user: UserResponse): string {
  return user.full_name || user.username;
}

/** Staff roles shown in admin user management (excludes default `user` accounts). */
export function filterStaffUsers(users: UserResponse[]): UserResponse[] {
  return users.filter((user) => user.role !== "user");
}

export function getRoleIcon(role: UserRole) {
  switch (role) {
    case "admin":
      return IoShieldCheckmark;
    case "reviewer":
      return IoCreateOutline;
    case "annotator":
      return IoPeople;
    default:
      return IoEye;
  }
}
