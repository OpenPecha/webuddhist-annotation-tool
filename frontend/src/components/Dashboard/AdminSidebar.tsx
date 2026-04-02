import React from "react";
import { Button } from "@/components/ui/button";
import {
  IoBarChart,
  IoList,
  IoPeople,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeAdminTab: "statistics" | "tasks" | "users";
  setActiveAdminTab: (tab: "statistics" | "tasks" | "users") => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  activeAdminTab,
  setActiveAdminTab,
}) => {
  const navBtn = (
    tab: typeof activeAdminTab,
    icon: React.ReactNode,
    label: string,
    hint: string
  ) => {
    const active = activeAdminTab === tab;
    return (
      <button
        type="button"
        onClick={() => setActiveAdminTab(tab)}
        title={sidebarOpen ? undefined : label}
        className={`group relative w-full rounded-xl border text-left transition-all duration-200 ${
          active
            ? "border-primary/35 bg-card shadow-[0_1px_0_oklch(0.99_0.01_85),0_12px_32px_-8px_oklch(0.55_0.18_45/0.2)]"
            : "border-transparent bg-transparent hover:border-border hover:bg-card/80"
        }`}
      >
        <div
          className={`flex items-center gap-3 px-3 py-2.5 ${
            sidebarOpen ? "" : "justify-center px-2"
          }`}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground group-hover:bg-accent group-hover:text-accent-foreground"
            }`}
          >
            {icon}
          </span>
          {sidebarOpen && (
            <span className="min-w-0 flex-1">
              <span
                className={`block font-display text-sm font-semibold tracking-tight ${
                  active ? "text-foreground" : "text-foreground/85"
                }`}
              >
                {label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                {hint}
              </span>
            </span>
          )}
        </div>
        {active && (
          <span
            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            aria-hidden
          />
        )}
      </button>
    );
  };

  return (
    <aside
      className={`absolute left-0 top-0 z-20 flex h-[calc(100vh-64px)] flex-col border-r border-border/80 bg-sidebar/95 shadow-[4px_0_24px_-12px_oklch(0.35_0.02_65/0.15)] backdrop-blur-md transition-[width] duration-300 ease-out ${
        sidebarOpen ? "w-64" : "w-[4.5rem]"
      }`}
    >
      <div className="flex flex-1 flex-col gap-6 p-3 pt-5">
        <div
          className={`flex items-center ${sidebarOpen ? "justify-between gap-2 px-1" : "flex-col gap-3"}`}
        >
          {sidebarOpen ? (
            <div className="min-w-0 pl-1">
              <p className="font-display text-lg font-semibold tracking-tight text-foreground">
                Administration
              </p>
              <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Pecha workspace
              </p>
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 font-display text-sm font-bold text-primary">
              A
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={sidebarOpen ? "Collapse admin sidebar" : "Expand admin sidebar"}
          >
            {sidebarOpen ? (
              <IoChevronBack className="h-4 w-4" />
            ) : (
              <IoChevronForward className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1.5">
          {navBtn(
            "statistics",
            <IoBarChart className="h-4 w-4" />,
            "Statistics",
            "Corpus status and charts"
          )}
          {navBtn(
            "tasks",
            <IoList className="h-4 w-4" />,
            "Documents",
            "Browse tasks and export JSON"
          )}
          {navBtn(
            "users",
            <IoPeople className="h-4 w-4" />,
            "Users",
            "Roles and account status"
          )}
        </nav>
      </div>
    </aside>
  );
};
