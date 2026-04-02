// Component preloader utility for better performance
export const preloadDashboardComponents = () => {
  import("@/components/Dashboard/AdminTaskSection");
  import("@/components/Dashboard/AdminStatisticsSection");
  import("@/components/Dashboard/AdminUsersSection");
};

export const preloadUserDashboard = () => {
  // Preload RegularUserDashboard for non-admin users
  import("@/components/Dashboard/RegularUserDashboard");
};

export const preloadAdminDashboard = () => {
  // Preload AdminDashboard for admin users
  import("@/components/Dashboard/AdminDashboard");

  // Also preload the most commonly used admin components
  preloadDashboardComponents();
};

// Preload components based on user role
export const preloadByUserRole = (userRole: string | undefined) => {
  if (userRole === "admin") {
    preloadAdminDashboard();
  } else {
    preloadUserDashboard();
  }
};

// Preload all dashboard components (use sparingly)
export const preloadAllDashboardComponents = () => {
  import("@/components/Dashboard/AdminDashboard");
  import("@/components/Dashboard/RegularUserDashboard");
  import("@/components/Dashboard/AdminTaskSection");
  import("@/components/Dashboard/AdminStatisticsSection");
  import("@/components/Dashboard/AdminUsersSection");
};
