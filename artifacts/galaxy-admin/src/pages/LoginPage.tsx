import { useState } from "react";
import { useLocation } from "wouter";
import { Zap, Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdmin } from "@/App";
import { useEffect } from "react";

const ADMIN_USERNAME = import.meta.env.VITE_ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { adminUser, setAdminLoggedIn } = useAdmin();

  useEffect(() => {
    if (adminUser) navigate("/");
  }, [adminUser, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise(r => setTimeout(r, 400));

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      await setAdminLoggedIn(true);
      navigate("/");
    } else {
      setError("Invalid username or password.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">Galaxy Admin</h1>
          <p className="text-muted-foreground text-sm mt-1">SuperAdmin access only</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm text-foreground/80">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="off"
                  className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-foreground/80">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  className="pl-9 pr-9 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                "Sign In to Admin Panel"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Restricted to SuperAdmin accounts only
          </p>
        </div>
      </div>
    </div>
  );
}
