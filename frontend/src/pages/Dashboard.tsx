import React, { Suspense, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { FullScreenLoading } from "@/components/ui/loading";
import { preloadByUserRole } from "@/utils/componentPreloader";
import { useCurrentUser } from "@/hooks";
import Home from "./Home";

const RegularUserDashboard = React.lazy(() =>
  import("@/components/Dashboard").then((module) => ({
    default: module.RegularUserDashboard,
  }))
);

const Dashboard = () => {
  const { data: currentUser } = useCurrentUser();

  // Preload components based on user role for better performance
  useEffect(() => {
    if (currentUser?.role) {
      preloadByUserRole(currentUser.role);
    }
  }, [currentUser?.role]);

  if (!currentUser) {
    return <Home/>;
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
