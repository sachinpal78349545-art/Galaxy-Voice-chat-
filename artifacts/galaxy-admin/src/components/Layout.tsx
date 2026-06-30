import { useState } from "react";
import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdmin } from "@/App";
import {
  LayoutDashboard, Users, CreditCard, Radio, Bell, Settings,
  LogOut, Menu, X, Flag, ChevronRight, Zap, Gift, Image,
  Package, Send, Crown, Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Users",
    items: [
      { path: "/users", label: "All Users", icon: Users },
      { path: "/vip", label: "VIP & Officials", icon: Crown },
      { path: "/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    label: "Finance",
    items: [
      { path: "/recharge", label: "Recharges", icon: CreditCard },
      { path: "/packages", label: "Coin Packages", icon: Package },
    ],
  },
  {
    label: "Content",
    items: [
      { path: "/rooms", label: "Rooms", icon: Radio },
      { path: "/gifts", label: "Gifts", icon: Gift },
      { path: "/banners", label: "Banners", icon: Image },
    ],
  },
  {
    label: "Broadcast",
    items: [
      { path: "/alerts", label: "Global Alerts", icon: Bell },
      { path: "/notifications", label: "Notifications", icon: Send },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { adminUser } = useAdmin();
  const { toast } = useToast();

  async function handleLogout() {
    try { await signOut(auth); navigate("/login"); }
    catch { toast({ title: "Logout failed", variant: "destructive" }); }
  }

  function isActive(path: string) {
    return path === "/" ? location === "/" : location.startsWith(path);
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Galaxy Admin</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Control Panel v1.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => { navigate(path); setSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group",
                      active
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-primary/70")} />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <ChevronRight className="w-3 h-3 text-primary/70 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5 rounded-lg bg-sidebar-accent/20">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
            {adminUser?.avatar || "🌟"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-none">{adminUser?.name || "SuperAdmin"}</p>
            <p className="text-[10px] text-primary/70 mt-0.5">Super Admin</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 text-xs h-7">
          <LogOut className="w-3 h-3 mr-2" />Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-52 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col w-52 bg-sidebar border-r border-sidebar-border">
            <button className="absolute top-3 right-3 text-sidebar-foreground/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center h-13 px-4 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-3 h-8 w-8">
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">Galaxy Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
