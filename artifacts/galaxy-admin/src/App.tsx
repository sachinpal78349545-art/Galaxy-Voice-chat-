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
    if (!loading && !adminUser) {
      navigate("/login");
    }
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

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <AuthGuard>
          <Layout>
            <Dashboard />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/users">
        <AuthGuard>
          <Layout>
            <UsersPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/recharge">
        <AuthGuard>
          <Layout>
            <RechargePage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/rooms">
        <AuthGuard>
          <Layout>
            <RoomsPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/alerts">
        <AuthGuard>
          <Layout>
            <AlertsPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/reports">
        <AuthGuard>
          <Layout>
            <ReportsPage />
          </Layout>
        </AuthGuard>
      </Route>
      <Route path="/settings">
        <AuthGuard>
          <Layout>
            <SettingsPage />
          </Layout>
        </AuthGuard>
      </Route>
    </Switch>
  );
}

function App() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setAdminUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await getUser(firebaseUser.uid);
        if (profile && profile.userId === SUPER_ADMIN_USER_ID) {
          setAdminUser({
            firebaseUser,
            uid: firebaseUser.uid,
            userId: profile.userId,
            name: profile.name || "SuperAdmin",
            avatar: profile.avatar || "🌟",
          });
        } else {
          await auth.signOut();
          setAdminUser(null);
        }
      } catch {
        setAdminUser(null);
      }
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
