import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthProvider";
import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { FullScreenLoading, AppLoading } from "@/components/ui/loading";
import { useAuth } from "./auth/use-auth-hook";
import { useAnnotationColors } from "./hooks/use-annotation-colors";

import { UserbackProvider } from "./providers/UserbackProvider";
import { Welcome } from "./components/Welcome";
import { AdminDashboard } from "./components/Dashboard";
import { AdminRoute } from "./components/AdminRoute";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Logout from "./pages/Logout";
import Callback from "./pages/Callback";
import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import { usersApi } from "./api/users";
import { useAuth0 } from "@auth0/auth0-react";
import type { RegisterUserData } from "./api/types";
// Lazy load page components
const Task = lazy(() => import("./pages/Task"));

/** Old review URLs open the annotation task view instead. */
function ReviewToTaskRedirect() {
  const { textId } = useParams<{ textId: string }>();
  return <Navigate to={textId ? `/task/${textId}` : "/dashboard"} replace />;
}

const queryClient = new QueryClient();


function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated } = useAuth();
  const { user } = useAuth0();
  const [isUserSynced, setIsUserSynced] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const { isLoaded: colorsLoaded } = useAnnotationColors();

  // Ensure user exists in DB before loading protected content
  useEffect(() => {
    if (!isAuthenticated || !user?.sub) {
      setIsUserSynced(false);
      return;
    }
    let cancelled = false;
    const syncUser = async () => {
      if (!user.sub) return;
      try {
        const userData: RegisterUserData = {
          auth0_user_id: user.sub,
          username: user.nickname ?? user.name ?? user.sub,
          email: user.email ?? "",
          full_name: user.name ?? undefined,
          picture: user.picture ?? undefined,
        };
        await usersApi.registerUser(userData);
        if (!cancelled) setIsUserSynced(true);
      } catch (err) {
        if (!cancelled) {
          setSyncError(err instanceof Error ? err.message : "Failed to set up account");
        }
      }
    };
    syncUser();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.sub, user?.nickname, user?.name, user?.email, user?.picture]);

  if (!isAuthenticated) {
    return <Welcome />;
  }

  if (!isUserSynced) {
    if (syncError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <p className="text-destructive font-medium">
            {syncError}. Please refresh to retry.
          </p>
        </div>
      );
    }
    return <AppLoading message="Setting up your account..." />;
  }

  if (!colorsLoaded) {
    return <AppLoading message="Loading settings..." />;
  }

  return (
    <Suspense fallback={<AppLoading message="Loading Dashboard..." />}>
      {children}
    </Suspense>
  );
}

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Home /> } />
        <Route
        path="/dashboard"
        element={
          <Layout>
            <Dashboard />
          </Layout>
        }
      />
    <Route path="/login" element={<Login />} />
     <Route path="/logout" element={<Logout />} />
     <Route path="/callback" element={<Callback />} />
      <Route
        path="/admin"
        element={
          <Layout>
            <AdminRoute>
              <Navbar />
              <Suspense fallback={<FullScreenLoading />}>
                <AdminDashboard />
              </Suspense>
            </AdminRoute>
          </Layout>
        }
      />
  
      <Route
        path="/task/:textId"
        element={
          <Suspense fallback={<AppLoading message="Loading Task..." />}>
            <Task />
          </Suspense>
        }
      />
      <Route path="/review/:textId" element={<ReviewToTaskRedirect />} />
    </Routes>
  );
}

function App() {


  return (
      <QueryClientProvider client={queryClient}>
          <BrowserRouter>
    <AuthProvider>
        <UserbackProvider>

            <AppContent />
            <Toaster />
        </UserbackProvider>
    </AuthProvider>
          </BrowserRouter>
      </QueryClientProvider>
  );
}

export default App;
