import React, { useState, Suspense, useEffect, type ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { Loading } from "@/components/ui/loading";

const AdminTaskSection = React.lazy(() =>
  import("./AdminTaskSection").then((module) => ({
    default: module.AdminTaskSection,
  }))
);
const AdminStatisticsSection = React.lazy(() =>
  import("./AdminStatisticsSection").then((module) => ({
    default: module.AdminStatisticsSection,
  }))
);
const AdminUsersSection = React.lazy(() =>
  import("./AdminUsersSection").then((module) => ({
    default: module.AdminUsersSection,
  }))
);

export const AdminDashboard: React.FC = () => {
  const [activeAdminTab, setActiveAdminTab] = useState<
    "statistics" | "tasks" | "users"
  >("statistics");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      import("./AdminTaskSection");
      import("./AdminStatisticsSection");
      import("./AdminUsersSection");
    }, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  const renderActiveTab = () => {
    let section: ReactNode;
    switch (activeAdminTab) {
      case "statistics":
        section = <AdminStatisticsSection />;
        break;
      case "tasks":
        section = <AdminTaskSection />;
        break;
      case "users":
        section = <AdminUsersSection />;
        break;
      default:
        section = <AdminStatisticsSection />;
    }
    return <Suspense fallback={<Loading />}>{section}</Suspense>;
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] overflow-hidden bg-[oklch(0.97_0.012_85)]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
        style={{
          backgroundImage: `
            radial-gradient(ellipse 120% 80% at 0% -20%, oklch(0.72 0.14 45 / 0.18), transparent 55%),
            radial-gradient(ellipse 90% 70% at 100% 0%, oklch(0.55 0.08 165 / 0.12), transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 100%, oklch(0.88 0.04 85 / 0.35), transparent 45%)
          `,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <AdminSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeAdminTab={activeAdminTab}
        setActiveAdminTab={setActiveAdminTab}
      />

      <div
        className={`relative z-[1] transition-[margin] duration-300 ease-out ${
          sidebarOpen ? "ml-64" : "ml-[4.5rem]"
        } min-h-[calc(100vh-64px)]`}
      >
          {renderActiveTab()}
      </div>
    </div>
  );
};
