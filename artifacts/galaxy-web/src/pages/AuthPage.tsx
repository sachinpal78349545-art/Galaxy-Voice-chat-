import React, { useState } from "react";
import { storage, User } from "../lib/storage";

interface Props { onLogin: (user: User) => void; }

export default function AuthPage({ onLogin }: Props) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const user = storage.login(email, password);
    if (user) onLogin(user);
    else setError("Invalid email or password");
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim() || !email.trim() || password.length < 6) {
      setError("Fill all fields. Password must be 6+ chars.");
      return;
    }
    const user = storage.signup(username.trim(), email.trim(), password);
    onLogin(user);
  };

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", gap: 32, minHeight: "100vh",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", animation: "float 3s ease-in-out infinite" }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🌌</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Galaxy Voice</h1>
        <p style={{ color: "rgba(162,155,254,0.6)", fontSize: 13, marginTop: 4 }}>
          Find your galaxy ✨
        </p>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: "flex", background: "rgba(255,255,255,0.05)",
        borderRadius: 14, padding: 4, width: "100%",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
        {(["login", "signup"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "10px 0", borderRadius: 11, border: "none",
            background: tab === t ? "rgba(108,92,231,0.35)" : "transparent",
            color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.45)",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer",
            boxShadow: tab === t ? "0 0 12px rgba(108,92,231,0.3)" : "none",
            transition: "all 0.2s",
          }}>
            {t === "login" ? "Log In" : "Sign Up"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={tab === "login" ? handleLogin : handleSignup}
        style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        {tab === "signup" && (
          <input className="input-field" placeholder="Username" value={username}
            onChange={e => setUsername(e.target.value)} />
        )}
        <input className="input-field" placeholder="Email" type="email" value={email}
          onChange={e => setEmail(e.target.value)} />
        <input className="input-field" placeholder="Password" type="password" value={password}
          onChange={e => setPassword(e.target.value)} />
        {error && (
          <p style={{ color: "#ff6482", fontSize: 12, textAlign: "center" }}>{error}</p>
        )}
        <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 4, padding: "14px 0", fontSize: 15 }}>
          {tab === "login" ? "🚀 Enter the Galaxy" : "✨ Create Account"}
        </button>
      </form>

      {/* Demo hint */}
      <p style={{ color: "rgba(162,155,254,0.3)", fontSize: 11, textAlign: "center", lineHeight: 1.5 }}>
        No real backend — all data stored locally.<br />Voice powered by Agora (add your App ID to enable).
      </p>
    </div>
  );
}
