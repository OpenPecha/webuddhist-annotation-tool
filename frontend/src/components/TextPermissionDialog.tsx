import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoClose, IoMailOutline, IoSearch } from "react-icons/io5";

import type { TextPermissionResponse, UserInfo } from "@/api/types";
import { Button } from "@/components/ui/button";
import { useSearchUsers } from "@/hooks";

type TextPermissionDialogProps = Readonly<{
  isOpen: boolean;
  textId: number;
  isSubmitting: boolean;
  isRevokingUserId?: number | null;
  existingPermissions: TextPermissionResponse[];
  onClose: () => void;
  onSubmit: (payload: {
    granteeUserId: number;
    permission: "read" | "write";
  }) => void;
  onRevoke: (granteeUserId: number) => void;
}>;

export function TextPermissionDialog({
  isOpen,
  textId,
  isSubmitting,
  isRevokingUserId = null,
  existingPermissions,
  onClose,
  onSubmit,
  onRevoke,
}: TextPermissionDialogProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchValue("");
      setDebouncedQuery("");
      setSelectedUser(null);
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const timer = globalThis.setTimeout(() => {
      setDebouncedQuery(searchValue.trim());
    }, 300);

    return () => globalThis.clearTimeout(timer);
  }, [isOpen, searchValue]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const {
    data: suggestions = [],
    isFetching,
    error,
  } = useSearchUsers(debouncedQuery.length >= 2 ? debouncedQuery : "", {
    text_id: textId,
    limit: 10,
  });

  const existingPermission = useMemo(() => {
    if (!selectedUser) return undefined;
    return existingPermissions.find(
      (entry) => entry.grantee_user_id === selectedUser.id
    );
  }, [existingPermissions, selectedUser]);
  const existingPermissionsList = useMemo(
    () =>
      [...existingPermissions].sort((first, second) => {
        const firstLabel =
          first.grantee?.email ||
          first.grantee?.full_name ||
          first.grantee?.username ||
          String(first.grantee_user_id);
        const secondLabel =
          second.grantee?.email ||
          second.grantee?.full_name ||
          second.grantee?.username ||
          String(second.grantee_user_id);
        return firstLabel.localeCompare(secondLabel);
      }),
    [existingPermissions]
  );

  const showSuggestions = searchValue.trim().length >= 2;
  let submitLabel = "Grant edit access";
  if (existingPermission) {
    submitLabel = "Update access";
  }
  if (isSubmitting) {
    submitLabel = "Saving...";
  }
  let selectedUserHelperText =
    "This user will be added to the shared access list with edit access.";
  if (existingPermission?.permission === "write") {
    selectedUserHelperText = "This user already has edit access.";
  } else if (existingPermission?.permission === "read") {
    selectedUserHelperText =
      "This user currently has view access and will be upgraded to edit.";
  }

  const handleSelectUser = (user: UserInfo) => {
    setSelectedUser(user);
    setSearchValue(user.email || user.username);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    setSelectedUser((currentSelectedUser) => {
      const matchesCurrentSelection =
        currentSelectedUser &&
        value.trim().toLowerCase() ===
          (currentSelectedUser.email || currentSelectedUser.username).toLowerCase();
      return matchesCurrentSelection ? currentSelectedUser : null;
    });
  };

  const handleSubmit = () => {
    if (!selectedUser) return;
    onSubmit({ granteeUserId: selectedUser.id, permission: "write" });
  };

  const handleSelectExistingPermission = (entry: TextPermissionResponse) => {
    const user: UserInfo = entry.grantee ?? {
      id: entry.grantee_user_id,
      username: `user-${entry.grantee_user_id}`,
      email: undefined,
      full_name: undefined,
    };
    setSelectedUser(user);
    setSearchValue(user.email || user.username);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="share-permission-title"
        className="relative m-4 w-full max-w-xl overflow-hidden rounded-xl border border-border bg-background p-0 text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 id="share-permission-title" className="text-lg font-semibold text-foreground">
              Share Text
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage who can edit this text. Everyone else remains view-only.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isSubmitting}>
            <IoClose className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">People with access</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Click a person to load their current permission, or revoke access in one click.
              </p>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
              {existingPermissionsList.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  No one else has access yet.
                </div>
              ) : (
                existingPermissionsList.map((entry) => {
                  const isSelected = selectedUser?.id === entry.grantee_user_id;
                  const grantee = entry.grantee;
                  const displayName =
                    grantee?.full_name ||
                    grantee?.username ||
                    `User ${entry.grantee_user_id}`;
                  const displayEmail =
                    grantee?.email ||
                    grantee?.username ||
                    `User ${entry.grantee_user_id}`;
                  const permissionLabel =
                    entry.permission === "write" ? "Can edit" : "Can view";

                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0 ${
                        isSelected ? "bg-accent/50" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectExistingPermission(entry)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-medium text-foreground">
                          {displayName}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          {displayEmail}
                        </p>
                      </button>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {permissionLabel}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRevoke(entry.grantee_user_id)}
                        disabled={isSubmitting || isRevokingUserId === entry.grantee_user_id}
                        className="shrink-0"
                      >
                        {isRevokingUserId === entry.grantee_user_id ? "Revoking..." : "Revoke"}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Add people</h3>
            <label
              htmlFor="share-user-email"
              className="text-sm font-medium text-foreground"
            >
              User email
            </label>
            <div className="relative">
              <IoSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="share-user-email"
                ref={searchInputRef}
                type="text"
                value={searchValue}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Start typing an email address..."
                className="w-full rounded-lg border border-input bg-background py-2.5 pl-10 pr-4 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Search by email with debounce. Sharing grants edit access by default.
            </p>
          </div>

          {selectedUser && (
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-start gap-3">
                <IoMailOutline className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {selectedUser.full_name || selectedUser.username}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {selectedUser.email || selectedUser.username}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedUserHelperText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {showSuggestions && (
            <div className="rounded-lg border border-border">
              <div className="border-b px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Matching users
              </div>
              <div className="max-h-64 overflow-y-auto">
                {isFetching && (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                    <AiOutlineLoading3Quarters className="h-4 w-4 animate-spin" />
                    Searching users...
                  </div>
                )}

                {!isFetching && error instanceof Error && (
                  <div className="px-4 py-4 text-sm text-red-600">
                    {error.message}
                  </div>
                )}

                {!isFetching && !error && suggestions.length === 0 && debouncedQuery.length >= 2 && (
                  <div className="px-4 py-4 text-sm text-muted-foreground">
                    No matching users found.
                  </div>
                )}

                {!isFetching &&
                  suggestions.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const currentPermissionForUser = existingPermissions.find(
                      (entry) => entry.grantee_user_id === user.id
                    );

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`flex w-full items-start justify-between gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-accent/60 ${
                          isSelected ? "bg-accent/80" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {user.full_name || user.username}
                          </p>
                          <p className="truncate text-sm text-muted-foreground">
                            {user.email || user.username}
                          </p>
                        </div>
                        {currentPermissionForUser && (
                          <span className="shrink-0 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                            {currentPermissionForUser.permission}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUser || isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
