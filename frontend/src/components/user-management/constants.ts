import type { UserRole } from "@/api/types";

export const USER_ROLES: UserRole[] = ["admin", "reviewer", "annotator", "user"];

export const STAFF_FILTER_ROLES: UserRole[] = ["admin", "reviewer", "annotator"];

export type StatusFilter = "all" | "active" | "inactive";

export type RoleFilter = UserRole | "all";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  reviewer: "Reviewer",
  annotator: "Annotator",
  user: "User",
};
