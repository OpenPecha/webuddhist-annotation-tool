import React from "react";
import { UserManagement } from "../UserManagement";

export const AdminUsersSection: React.FC = () => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-1 duration-500">
      <header className="max-w-2xl">
        <p className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Users
        </p>
        <p className="mt-3 font-sans text-base leading-relaxed text-muted-foreground">
          View everyone in the workspace, change roles, and activate or deactivate
          accounts.
        </p>
      </header>
      <UserManagement className="w-full overflow-hidden border-border/80 bg-card/90 shadow-[0_24px_48px_-28px_oklch(0.35_0.04_65/0.25)] backdrop-blur-sm" />
    </div>
  );
};
