import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, signInAnonymously } from "firebase/auth";
import { auth } from "../lib/firebase";

interface Props { onDone: () => void; }

export default function AuthPage({ onDone }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOTP, setShowOTP] = useState(false);
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
        try {
          await signInWithRedirect(auth, provider);
        } catch (e2: any) {
          setError("Sign in failed. Please try opening the app in a new tab.");
        }
      } else if (e.code === "auth/cancelled-popup-request") {
        setLoading(false);
        return;
      } else {
        setError(e.message || "Sign in failed. Check Firebase console.");
      }
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (phone.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setOtpLoading(true);
    setError("");
    await new Promise(r => setTimeout(r, 1500));
    setOtpSent(true);
    setOtpLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      setError("Please enter a 6-digit code");
      return;
    }
    setOtpLoading(true);
    setError("");
    try {
      await signInAnonymously(auth);
      onDone();
    } catch (e: any) {
      setError("Verification failed. Please try again.");
      setOtpLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await signInAnonymously(auth);
      onDone();
    } catch (e: any) {
      console.warn("Guest login error:", e?.code, e?.message);
      if (e?.code === "auth/admin-restricted-operation" || e?.code === "auth/operation-not-allowed") {
        setError("Guest login is not enabled. Please use Google or Phone login.");
      } else {
        setError("Guest login failed. Please try again.");
      }
      setLoading(false);
    }
  };

  if (showOTP) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 24,
      }}>
        <button onClick={() => { setShowOTP(false); setOtpSent(false); setError(""); }} style={{
          position: "absolute", top: 52, left: 16, background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, width: 38, height: 38,
          cursor: "pointer", fontSize: 18, color: "#fff",
        }}>{"\u2039"}</button>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>{"\u{1F4F1}"}</div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>{otpSent ? "Enter Code" : "Phone Login"}</h2>
          <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 13, marginTop: 6 }}>
            {otpSent ? `We sent a code to ${phone}` : "Enter your phone number to get started"}
          </p>
        </div>

        {!otpSent ? (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              className="input-field"
              placeholder="+1 234 567 8900"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              style={{ borderRadius: 22, padding: "16px 18px", fontSize: 16, textAlign: "center", letterSpacing: 1 }}
              type="tel"
            />
            <button onClick={handleSendOTP} disabled={otpLoading} style={{
              width: "100%", padding: "16px", borderRadius: 22, border: "none", cursor: otpLoading ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", color: "#fff",
              fontSize: 15, fontWeight: 800, fontFamily: "inherit",
              boxShadow: "0 4px 24px rgba(108,92,231,0.4)",
            }}>
              {otpLoading ? "Sending..." : "Send Code"}
            </button>
          </div>
        ) : (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  maxLength={1}
                  value={otpCode[i] || ""}
                  onChange={e => {
                    const val = e.target.value;
                    if (val.length <= 1 && /^\d*$/.test(val)) {
                      const newCode = otpCode.split("");
                      newCode[i] = val;
                      setOtpCode(newCode.join(""));
                      if (val && i < 5) {
                        const next = e.target.nextElementSibling as HTMLInputElement;
                        next?.focus();
                      }
                    }
                  }}
                  style={{
                    width: 44, height: 52, borderRadius: 14, border: "1px solid rgba(108,92,231,0.3)",
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 22, fontWeight: 800,
                    textAlign: "center", fontFamily: "inherit",
                  }}
                />
              ))}
            </div>
            <button onClick={handleVerifyOTP} disabled={otpLoading} style={{
              width: "100%", padding: "16px", borderRadius: 22, border: "none", cursor: otpLoading ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg,#6C5CE7,#A29BFE)", color: "#fff",
              fontSize: 15, fontWeight: 800, fontFamily: "inherit",
              boxShadow: "0 4px 24px rgba(108,92,231,0.4)",
            }}>
              {otpLoading ? "Verifying..." : "Verify"}
            </button>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", textAlign: "center" }}>
              Demo mode: any 6-digit code works
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(255,100,130,0.1)", border: "1px solid rgba(255,100,130,0.25)",
            borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#ff6482", textAlign: "center", width: "100%",
          }}>{error}</div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px", gap: 28,
    }}>
      <div style={{ textAlign: "center", animation: "float 3.5s ease-in-out infinite" }}>
        <div style={{ fontSize: 72, marginBottom: 10, filter: "drop-shadow(0 0 20px rgba(108,92,231,0.6))" }}>{"\u{1F30C}"}</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1,
          background: "linear-gradient(135deg,#A29BFE,#6C5CE7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ChaloTalk
        </h1>
        <p style={{ color: "rgba(162,155,254,0.5)", fontSize: 14, marginTop: 6 }}>
          Find your voice, find your galaxy {"\u2728"}
        </p>
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          { icon: "\u{1F3A4}", text: "Live voice rooms with real people" },
          { icon: "\u{1F31F}", text: "Level up, earn coins & VIP badges" },
          { icon: "\u{1F4AC}", text: "Chat & connect with the community" },
        ].map(f => (
          <div key={f.text} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(108,92,231,0.12)",
            borderRadius: 14, padding: "12px 16px",
          }}>
            <span style={{ fontSize: 22 }}>{f.icon}</span>
            <span style={{ fontSize: 13, color: "rgba(162,155,254,0.7)", fontWeight: 500 }}>{f.text}</span>
          </div>
        ))}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            width: "100%", padding: "16px", borderRadius: 22, border: "none", cursor: loading ? "not-allowed" : "pointer",
            background: loading ? "rgba(255,255,255,0.08)" : "white",
            color: "#1A0F2E", display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            fontSize: 15, fontWeight: 800, fontFamily: "inherit",
            boxShadow: loading ? "none" : "0 4px 24px rgba(255,255,255,0.15)",
            transition: "all 0.2s",
          }}
        >
          {loading ? (
            <>
              <div style={{ width: 20, height: 20, borderRadius: 10, border: "2.5px solid rgba(108,92,231,0.3)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
              <span style={{ color: "rgba(162,155,254,0.7)" }}>Signing in...</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        <button onClick={() => setShowOTP(true)} style={{
          width: "100%", padding: "16px", borderRadius: 22,
          border: "1px solid rgba(108,92,231,0.3)", cursor: "pointer",
          background: "rgba(108,92,231,0.1)", color: "#A29BFE",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontSize: 15, fontWeight: 800, fontFamily: "inherit",
        }}>
          {"\u{1F4F1}"} Login with Phone
        </button>

        <button onClick={handleGuestLogin} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.08)", cursor: loading ? "not-allowed" : "pointer",
          background: "rgba(255,255,255,0.03)", color: "rgba(162,155,254,0.6)",
          fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        }}>
          Continue as Guest
        </button>

        {error && (
          <div style={{
            background: "rgba(255,100,130,0.1)", border: "1px solid rgba(255,100,130,0.25)",
            borderRadius: 14, padding: "12px 16px", fontSize: 13, color: "#ff6482", textAlign: "center", lineHeight: 1.5,
          }}>
            {error}
            {error.includes("new tab") && (
              <div style={{ marginTop: 8 }}>
                <a href={window.location.href} target="_blank" rel="noreferrer"
                  style={{ color: "#A29BFE", textDecoration: "underline" }}>
                  Open in new tab {"\u2192"}
                </a>
              </div>
            )}
          </div>
        )}
      </div>

      <p style={{ color: "rgba(162,155,254,0.25)", fontSize: 11, textAlign: "center" }}>
        By continuing, you agree to ChaloTalk's Terms of Service
      </p>
    </div>
  );
}
