import React from "react";
import { Button } from "@/components/ui/button";
import {
  IoPeople,
  IoBarChart,
  IoDocumentText,
  IoSettings,
  IoCloudUpload,
  IoList,
  IoDownload,
  IoFolderOpen,
} from "react-icons/io5";

interface AdminSidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  activeAdminTab:
    | "statistics"
    | "users"
    | "work"
    | "bulk-upload"
    | "tasks"
    | "export"
    | "annotation-lists";
  setActiveAdminTab: (
    tab: "statistics" | "users" | "work" | "bulk-upload" | "tasks" | "export" | "annotation-lists"
  ) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  sidebarOpen,
  setSidebarOpen,
  activeAdminTab,
  setActiveAdminTab,
}) => {
  const navBtn = (tab: typeof activeAdminTab, icon: React.ReactNode, label: string) => {
    const active = activeAdminTab === tab;
    return (
      <button
        onClick={() => setActiveAdminTab(tab)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
          active
            ? "bg-primary/15 text-primary border border-primary/30 font-medium"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        }`}
      >
        {icon}
        {sidebarOpen && <span>{label}</span>}
      </button>
    );
  };

  return (
    <div
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } transition-all duration-300 bg-card shadow-md border-r border-border h-[calc(100vh-64px)] absolute left-0 z-10`}
    >
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2
            className={`font-display font-semibold text-xl text-foreground ${
              sidebarOpen ? "block" : "hidden"
            }`}
          >
            Admin Panel
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2"
          >
            <IoSettings className="w-4 h-4" />
          </Button>
        </div>

        <nav className="space-y-1 flex-1">
          {navBtn("work", <IoDocumentText className="w-5 h-5 shrink-0" />, "Work Management")}
          {navBtn("tasks", <IoList className="w-5 h-5 shrink-0" />, "Task Listing")}
          {navBtn("statistics", <IoBarChart className="w-5 h-5 shrink-0" />, "Statistics")}
          {navBtn("users", <IoPeople className="w-5 h-5 shrink-0" />, "Users")}
          {navBtn("bulk-upload", <IoCloudUpload className="w-5 h-5 shrink-0" />, "Bulk Upload")}
          {navBtn("export", <IoDownload className="w-5 h-5 shrink-0" />, "Export Data")}
          {navBtn("annotation-lists", <IoFolderOpen className="w-5 h-5 shrink-0" />, "Annotation Lists")}
        </nav>
      </div>
    </div>
  );
};
