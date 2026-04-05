import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase";
import logoUrl from "/logo.png?url";

interface Props { onDone: () => void; }

export default function AuthPage({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"main" | "email-login" | "email-signup" | "phone">("main");
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [nameVal, setNameVal] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);
    setError("");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      await signInWithPopup(auth, provider);
      onDone();
    } catch (e: any) {
      if (e.code === "auth/popup-blocked" || e.code === "auth/popup-closed-by-user") {
        try { await signInWithRedirect(auth, provider); } catch { setError("Sign in failed. Please try opening the app in a new tab."); }
      } else if (e.code === "auth/cancelled-popup-request") {
        setLoading(false); return;
      } else {
        setError(e.message || "Sign in failed.");
      }
      setLoading(false);
    }
  };

  const handleEmailSignup = async () => {
    if (!nameVal.trim()) { setError("Please enter your name"); return; }
    if (!emailVal.trim() || !passwordVal) { setError("Please fill in all fields"); return; }
    if (passwordVal.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, emailVal.trim(), passwordVal);
      await updateProfile(cred.user, { displayName: nameVal.trim() });
      onDone();
    } catch (e: any) {
      if (e.code === "auth/email-already-in-use") setError("Email already registered. Try logging in.");
      else if (e.code === "auth/invalid-email") setError("Invalid email address.");
      else if (e.code === "auth/weak-password") setError("Password too weak. Use at least 6 characters.");
      else setError(e.message || "Signup failed.");
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailVal.trim() || !passwordVal) { setError("Please fill in all fields"); return; }
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, emailVal.trim(), passwordVal);
      onDone();
    } catch (e: any) {
      if (e.code === "auth/user-not-found" || e.code === "auth/invalid-credential") setError("Invalid email or password.");
      else if (e.code === "auth/wrong-password") setError("Incorrect password.");
      else if (e.code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError(e.message || "Login failed.");
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) { setError("Please enter a valid phone number"); return; }
    setOtpLoading(true); setError("");
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true); setOtpLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) { setError("Please enter a 6-digit code"); return; }
    setOtpLoading(true); setError("");
    try { await signInAnonymously(auth); onDone(); } catch { setError("Verification failed."); setOtpLoading(false); }
  };

  const handleGuestLogin = async () => {
    setLoading(true); setError("");
    try { await signInAnonymously(auth); onDone(); } catch (e: any) {
      if (e?.code === "auth/admin-restricted-operation" || e?.code === "auth/operation-not-allowed") setError("Guest login is not enabled.");
      else setError("Guest login failed.");
      setLoading(false);
    }
  };

  const goBack = () => { setMode("main"); setError(""); setOtpSent(false); setEmailVal(""); setPasswordVal(""); setNameVal(""); };

  const backBtn = (
    <button onClick={goBack} style={{
      position: "absolute", top: 52, left: 16, background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, width: 40, height: 40,
      cursor: "pointer", fontSize: 18, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    }}>{"\u2039"}</button>
  );

  const errorBox = error && (
    <div style={{
      background: "rgba(255,100,130,0.1)", border: "1px solid rgba(255,100,130,0.25)",
      borderRadius: 16, padding: "12px 16px", fontSize: 13, color: "#ff6482", textAlign: "center", width: "100%", lineHeight: 1.5,
    }}>
      {error}
      {error.includes("new tab") && (
        <div style={{ marginTop: 8 }}>
          <a href={window.location.href} target="_blank" rel="noreferrer" style={{ color: "#A29BFE", textDecoration: "underline" }}>
            Open in new tab {"\u2192"}
          </a>
        </div>
      )}
    </div>
  );

  if (mode === "email-signup") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20 }}>
        {backBtn}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F680}"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>Create Account</h2>
          <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 6 }}>Join the Galaxy community</p>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input-field" placeholder="Your Name" value={nameVal} onChange={e => setNameVal(e.target.value)} style={{ borderRadius: 22, padding: "14px 18px" }} />
          <input className="input-field" placeholder="Email" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} style={{ borderRadius: 22, padding: "14px 18px" }} />
          <input className="input-field" placeholder="Password (min 6 chars)" type="password" value={passwordVal} onChange={e => setPasswordVal(e.target.value)} style={{ borderRadius: 22, padding: "14px 18px" }}
            onKeyDown={e => e.key === "Enter" && handleEmailSignup()} />
          <button onClick={handleEmailSignup} disabled={loading} className="btn btn-primary btn-full" style={{ padding: 16, borderRadius: 22, fontSize: 15, fontWeight: 800 }}>
            {loading ? "Creating..." : "Sign Up"}
          </button>
          <button onClick={() => { setMode("email-login"); setError(""); }} style={{
            background: "none", border: "none", cursor: "pointer", color: "#A29BFE", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 8,
          }}>Already have an account? Log in</button>
        </div>
        {errorBox}
      </div>
    );
  }

  if (mode === "email-login") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 20 }}>
        {backBtn}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{"\u{1F512}"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>Welcome Back</h2>
          <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 6 }}>Log in to your account</p>
        </div>
        <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="input-field" placeholder="Email" type="email" value={emailVal} onChange={e => setEmailVal(e.target.value)} style={{ borderRadius: 22, padding: "14px 18px" }} />
          <input className="input-field" placeholder="Password" type="password" value={passwordVal} onChange={e => setPasswordVal(e.target.value)} style={{ borderRadius: 22, padding: "14px 18px" }}
            onKeyDown={e => e.key === "Enter" && handleEmailLogin()} />
          <button onClick={handleEmailLogin} disabled={loading} className="btn btn-primary btn-full" style={{ padding: 16, borderRadius: 22, fontSize: 15, fontWeight: 800 }}>
            {loading ? "Logging in..." : "Log In"}
          </button>
          <button onClick={() => { setMode("email-signup"); setError(""); }} style={{
            background: "none", border: "none", cursor: "pointer", color: "#A29BFE", fontSize: 13, fontWeight: 600, fontFamily: "inherit", padding: 8,
          }}>Don't have an account? Sign up</button>
        </div>
        {errorBox}
      </div>
    );
  }

  if (mode === "phone") {
    return (
      <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 24 }}>
        {backBtn}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>{"\u{1F4F1}"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>{otpSent ? "Enter Code" : "Phone Login"}</h2>
          <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {otpSent ? `We sent a code to ${phone}` : "Enter your phone number to get started"}
          </p>
        </div>
        {!otpSent ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <input className="input-field" placeholder="+1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)}
              style={{ borderRadius: 22, padding: "16px 18px", fontSize: 16, textAlign: "center", letterSpacing: 1 }} type="tel" />
            <button onClick={handleSendOTP} disabled={otpLoading} className="btn btn-primary btn-full" style={{ padding: 16, borderRadius: 22, fontSize: 15, fontWeight: 800 }}>
              {otpLoading ? "Sending..." : "Send Code"}
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input key={i} maxLength={1} value={otpCode[i] || ""}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length <= 1 && /^\d*$/.test(val)) {
                      const newCode = otpCode.split(""); newCode[i] = val; setOtpCode(newCode.join(""));
                      if (val && i < 5) { const next = e.target.nextElementSibling as HTMLInputElement; next?.focus(); }
                    }
                  }}
                  style={{
                    width: 46, height: 54, borderRadius: 14, border: "1.5px solid rgba(108,92,231,0.3)",
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, fontWeight: 800,
                    textAlign: "center", fontFamily: "inherit", outline: "none", transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocus={e => { e.target.style.borderColor = "rgba(108,92,231,0.7)"; e.target.style.boxShadow = "0 0 0 3px rgba(108,92,231,0.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "rgba(108,92,231,0.3)"; e.target.style.boxShadow = "none"; }}
                />
              ))}
            </div>
            <button onClick={handleVerifyOTP} disabled={otpLoading} className="btn btn-primary btn-full" style={{ padding: 16, borderRadius: 22, fontSize: 15, fontWeight: 800 }}>
              {otpLoading ? "Verifying..." : "Verify"}
            </button>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", textAlign: "center" }}>Demo mode: any 6-digit code works</p>
          </div>
        )}
        {errorBox}
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 28 }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ animation: "logoGlow 3s ease-in-out infinite", marginBottom: 16 }}>
          <img src={logoUrl} alt="Galaxy Voice Chat" style={{ width: 96, height: 96, borderRadius: 28, boxShadow: "0 8px 40px rgba(108,92,231,0.5)" }} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5,
          background: "linear-gradient(135deg,#A29BFE,#6C5CE7,#8B7CF6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Galaxy Voice Chat
        </h1>
        <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>Find your voice, find your galaxy {"\u2728"}</p>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "\u{1F3A4}", text: "Live voice rooms with real people" },
          { icon: "\u{1F31F}", text: "Level up, earn coins & VIP badges" },
          { icon: "\u{1F4AC}", text: "Chat & connect with the community" },
        ].map((f, i) => (
          <div key={f.text} style={{
            display: "flex", alignItems: "center", gap: 14,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.12)",
            borderRadius: 16, padding: "14px 18px", animation: `slide-up 0.4s ease ${0.1 + i * 0.1}s both`,
          }}>
            <span style={{ fontSize: 24, filter: "drop-shadow(0 2px 8px rgba(108,92,231,0.3))" }}>{f.icon}</span>
            <span style={{ fontSize: 14, color: "rgba(162,155,254,0.7)", fontWeight: 500 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        <button onClick={() => setMode("email-signup")} style={{
          width: "100%", padding: 16, borderRadius: 24, border: "none", cursor: "pointer",
          background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 15, fontWeight: 800, fontFamily: "inherit",
          boxShadow: "0 4px 24px rgba(108,92,231,0.4)", transition: "all 0.2s",
        }}>
          {"\u2709\uFE0F"} Sign Up with Email
        </button>

        <button onClick={() => setMode("email-login")} style={{
          width: "100%", padding: 16, borderRadius: 24,
          border: "1.5px solid rgba(108,92,231,0.3)", cursor: "pointer",
          background: "linear-gradient(135deg, rgba(108,92,231,0.12), rgba(108,92,231,0.06))", color: "#A29BFE",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 15, fontWeight: 800, fontFamily: "inherit", transition: "all 0.2s",
        }}>
          {"\u{1F512}"} Log In with Email
        </button>

        <button onClick={signInWithGoogle} disabled={loading} style={{
          width: "100%", padding: 14, borderRadius: 24, border: "none", cursor: loading ? "not-allowed" : "pointer",
          background: loading ? "rgba(255,255,255,0.08)" : "white",
          color: "#1A0F2E", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 14, fontWeight: 800, fontFamily: "inherit",
          boxShadow: loading ? "none" : "0 4px 20px rgba(255,255,255,0.12)", transition: "all 0.2s",
        }}>
          {loading ? (
            <>
              <div style={{ width: 18, height: 18, borderRadius: 9, border: "2.5px solid rgba(108,92,231,0.3)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "rgba(162,155,254,0.7)" }}>Signing in...</span>
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setMode("phone")} style={{
            flex: 1, padding: 12, borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
            background: "rgba(255,255,255,0.03)", color: "rgba(162,155,254,0.6)",
            fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s",
          }}>
            {"\u{1F4F1}"} Phone
          </button>
          <button onClick={handleGuestLogin} disabled={loading} style={{
            flex: 1, padding: 12, borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.08)", cursor: loading ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,0.03)", color: "rgba(162,155,254,0.6)",
            fontSize: 12, fontWeight: 700, fontFamily: "inherit", transition: "all 0.2s",
          }}>
            {"\u{1F464}"} Guest
          </button>
        </div>

        {errorBox}
      </div>

      <p style={{ color: "rgba(162,155,254,0.25)", fontSize: 11, textAlign: "center" }}>
        By continuing, you agree to Galaxy Voice Chat's Terms of Service
      </p>
    </div>
  );
}
