import { useState } from "react";
import { useLocation } from "wouter";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAdmin } from "@/App";
import {
  LayoutDashboard, Users, CreditCard, Radio, Bell, Settings,
  LogOut, Menu, X, Flag, ChevronRight, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/users", label: "Users", icon: Users },
  { path: "/recharge", label: "Recharge", icon: CreditCard },
  { path: "/rooms", label: "Rooms", icon: Radio },
  { path: "/alerts", label: "Global Alerts", icon: Bell },
  { path: "/reports", label: "Reports", icon: Flag },
  { path: "/settings", label: "Settings", icon: Settings },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { adminUser } = useAdmin();
  const { toast } = useToast();

  async function handleLogout() {
    try {
      await signOut(auth);
      navigate("/login");
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Galaxy Admin</p>
            <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Control Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ path, label, icon: Icon }) => {
          const active = path === "/" ? location === "/" : location.startsWith(path);
          return (
            <button
              key={path}
              onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-primary/80")} />
              <span className="flex-1 text-left">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-primary" />}
            </button>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-sidebar-accent/30">
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
            {adminUser?.avatar || "🌟"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate">{adminUser?.name || "SuperAdmin"}</p>
            <p className="text-[10px] text-primary/80">Super Admin</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10 text-xs"
        >
          <LogOut className="w-3.5 h-3.5 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 flex flex-col w-56 bg-sidebar border-r border-sidebar-border">
            <button
              className="absolute top-4 right-4 text-sidebar-foreground/60 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-3">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">Galaxy Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
