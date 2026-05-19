import { useEffect, useState, type FormEvent } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { IoClose } from "react-icons/io5";

import type { AdminManualUserCreate, UserRole } from "@/api/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ROLE_LABELS, STAFF_FILTER_ROLES } from "./constants";

const inputClassName = cn(
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
  "ring-offset-background placeholder:text-muted-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
);

const emptyForm = (): AdminManualUserCreate => ({
  email: "",
  username: "",
  full_name: "",
  role: "annotator",
});

type AddUserDialogProps = Readonly<{
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: AdminManualUserCreate) => void;
}>;

export function AddUserDialog({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: AddUserDialogProps) {
  const [form, setForm] = useState<AdminManualUserCreate>(emptyForm);

  useEffect(() => {
    if (!isOpen) {
      setForm(emptyForm());
    }
  }, [isOpen]);

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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit({
      email: form.email.trim(),
      username: form.username.trim(),
      full_name: form.full_name.trim(),
      role: form.role,
    });
  };

  const setField = <K extends keyof AdminManualUserCreate>(
    key: K,
    value: AdminManualUserCreate[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  const canSubmit =
    form.email.trim().length > 0 &&
    form.username.trim().length > 0 &&
    form.full_name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <dialog
        open
        aria-labelledby="add-user-title"
        className="relative m-4 w-full max-w-md overflow-hidden rounded-xl border border-border bg-background p-0 text-left shadow-2xl"
      >
        <div className="flex items-start justify-between border-b px-6 py-4">
          <div>
            <h2 id="add-user-title" className="text-lg font-semibold text-foreground">
              Add user
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              New accounts are active by default. If the email already exists,
              only role and status are updated.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <IoClose className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div className="space-y-1.5">
            <label htmlFor="add-user-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="add-user-email"
              type="email"
              required
              autoComplete="off"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className={inputClassName}
              placeholder="name@example.com"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-user-name" className="text-sm font-medium">
              Full name
            </label>
            <input
              id="add-user-name"
              type="text"
              required
              autoComplete="name"
              value={form.full_name}
              onChange={(e) => setField("full_name", e.target.value)}
              className={inputClassName}
              placeholder="Jane Doe"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-user-username" className="text-sm font-medium">
              Username
            </label>
            <input
              id="add-user-username"
              type="text"
              required
              autoComplete="username"
              value={form.username}
              onChange={(e) => setField("username", e.target.value)}
              className={inputClassName}
              placeholder="jane.doe"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="add-user-role" className="text-sm font-medium">
              Role
            </label>
            <select
              id="add-user-role"
              value={form.role}
              onChange={(e) => setField("role", e.target.value as UserRole)}
              className={inputClassName}
              disabled={isSubmitting}
            >
              {STAFF_FILTER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !canSubmit}>
              {isSubmitting ? (
                <>
                  <AiOutlineLoading3Quarters className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save user"
              )}
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
