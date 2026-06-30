import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUser, SUPER_ADMIN_USER_ID } from "@/lib/adminService";
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

interface AdminUser {
  firebaseUser: User;
  userId: string;
  name: string;
  avatar: string;
  uid: string;
}

interface AuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({ adminUser: null, loading: true });
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
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) { setAdminUser(null); setLoading(false); return; }
      try {
        const profile = await getUser(firebaseUser.uid);
        if (profile && profile.userId === SUPER_ADMIN_USER_ID) {
          setAdminUser({ firebaseUser, uid: firebaseUser.uid, userId: profile.userId, name: profile.name || "SuperAdmin", avatar: profile.avatar || "🌟" });
        } else {
          await auth.signOut();
          setAdminUser(null);
        }
      } catch { setAdminUser(null); }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ adminUser, loading }}>
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
