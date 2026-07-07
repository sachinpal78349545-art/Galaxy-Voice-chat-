import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import UsersPage from "@/pages/UsersPage";
import RechargePage from "@/pages/RechargePage";
import RoomsPage from "@/pages/RoomsPage";
import AlertsPage from "@/pages/AlertsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import GiftsPage from "@/pages/GiftsPage";
import BannersPage from "@/pages/BannersPage";
import PackagesPage from "@/pages/PackagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import VipPage from "@/pages/VipPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import Layout from "@/components/Layout";

const queryClient = new QueryClient();

const SESSION_KEY = "galaxy_admin_auth";

interface AuthContextType {
  adminUser: { name: string } | null;
  loading: boolean;
  setAdminLoggedIn: (v: boolean) => void;
}

export const AuthContext = createContext<AuthContextType>({
  adminUser: null,
  loading: false,
  setAdminLoggedIn: () => {},
});
export const useAdmin = () => useContext(AuthContext);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, loading } = useAdmin();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !adminUser) navigate("/login");
  }, [loading, adminUser, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading Galaxy Admin...</p>
        </div>
      </div>
    );
  }
  if (!adminUser) return null;
  return <>{children}</>;
}

function Guarded({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <Layout>{children}</Layout>
    </AuthGuard>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/"><Guarded><Dashboard /></Guarded></Route>
      <Route path="/users"><Guarded><UsersPage /></Guarded></Route>
      <Route path="/recharge"><Guarded><RechargePage /></Guarded></Route>
      <Route path="/rooms"><Guarded><RoomsPage /></Guarded></Route>
      <Route path="/alerts"><Guarded><AlertsPage /></Guarded></Route>
      <Route path="/reports"><Guarded><ReportsPage /></Guarded></Route>
      <Route path="/gifts"><Guarded><GiftsPage /></Guarded></Route>
      <Route path="/banners"><Guarded><BannersPage /></Guarded></Route>
      <Route path="/packages"><Guarded><PackagesPage /></Guarded></Route>
      <Route path="/notifications"><Guarded><NotificationsPage /></Guarded></Route>
      <Route path="/vip"><Guarded><VipPage /></Guarded></Route>
      <Route path="/leaderboard"><Guarded><LeaderboardPage /></Guarded></Route>
      <Route path="/settings"><Guarded><SettingsPage /></Guarded></Route>
    </Switch>
  );
}

function App() {
  const [adminUser, setAdminUser] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored === "true") {
      setAdminUser({ name: "SuperAdmin" });
    }
    setLoading(false);
  }, []);

  const setAdminLoggedIn = (v: boolean) => {
    if (v) {
      sessionStorage.setItem(SESSION_KEY, "true");
      setAdminUser({ name: "SuperAdmin" });
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      setAdminUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ adminUser, loading, setAdminLoggedIn }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
