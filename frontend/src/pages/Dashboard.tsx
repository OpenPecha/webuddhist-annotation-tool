import React, { Suspense, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { FullScreenLoading } from "@/components/ui/loading";
import { preloadByUserRole } from "@/utils/componentPreloader";
import { usePermission } from "@/hooks";
import Home from "./Home";
import { useAuth0 } from "@auth0/auth0-react";

const RegularUserDashboard = React.lazy(() =>
  import("@/components/Dashboard").then((module) => ({
    default: module.RegularUserDashboard,
  }))
);

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth0();
  const { data: permission } = usePermission();

  useEffect(() => {
    if (permission?.role) {
      preloadByUserRole(permission.role);
    }
  }, [permission?.role]);

  if (!isAuthenticated || !user) {
    return <Home />;
  }
  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <Suspense fallback={<FullScreenLoading />}>
        <RegularUserDashboard />
      </Suspense>
    </div>
  );
};

export default Dashboard;
