import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile, updateUser } from "../lib/userService";

interface Props {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

const MENU_ITEMS = [
  { icon: "✏️", label: "Edit Profile",       action: "edit" },
  { icon: "💰", label: "My Wallet",           action: "wallet" },
  { icon: "📊", label: "My Activity",         action: "" },
  { icon: "✅", label: "Tasks",               action: "" },
  { icon: "📖", label: "Stories",             action: "" },
  { icon: "🔒", label: "Privacy Settings",    action: "" },
  { icon: "🔔", label: "Notifications",       action: "" },
  { icon: "🚫", label: "Blocked Users",       action: "" },
  { icon: "❓", label: "Help & Support",      action: "" },
  { icon: "⚠️", label: "Report Issue",        action: "" },
];

const RECHARGE_PACKAGES = [
  { coins: 100,  price: "$0.99",  bonus: "" },
  { coins: 500,  price: "$3.99",  bonus: "+50 Bonus" },
  { coins: 1000, price: "$6.99",  bonus: "+150 Bonus" },
  { coins: 5000, price: "$29.99", bonus: "+1000 Bonus" },
];

export default function ProfilePage({ user, onUpdate, onLogout, onEditProfile }: Props) {
  const [showWallet, setShowWallet] = useState(false);
  const [recharging, setRecharging] = useState<number | null>(null);

  const xpPct = Math.min(100, (user.xp / (user.level * 1000)) * 100);

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    onLogout();
  };

  const handleRecharge = async (coins: number, idx: number) => {
    setRecharging(idx);
    await new Promise(r => setTimeout(r, 1200));
    const updated: UserProfile = { ...user, coins: user.coins + coins };
    await updateUser(user.uid, { coins: updated.coins });
    onUpdate(updated);
    setRecharging(null);
    setShowWallet(false);
  };

  const handleMenu = (action: string) => {
    if (action === "edit") onEditProfile();
    if (action === "wallet") setShowWallet(true);
  };

  return (
    <div className="page-scroll">
      {/* Header gradient */}
      <div style={{
        padding: "52px 16px 20px",
        background: "linear-gradient(180deg, rgba(108,92,231,0.14) 0%, transparent 100%)",
      }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", animation: "float 4s ease-in-out infinite" }}>
            <div style={{
              width: 100, height: 100, borderRadius: 50, fontSize: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(108,92,231,0.2)", border: "3px solid rgba(108,92,231,0.5)",
              boxShadow: "0 0 32px rgba(108,92,231,0.45), 0 0 64px rgba(108,92,231,0.15)",
              cursor: "pointer",
            }} onClick={onEditProfile}>
              {user.avatar}
            </div>
            <div style={{
              position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
              background: "#6C5CE7", border: "2px solid #0F0F1A", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }} onClick={onEditProfile}>✏️</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900 }}>{user.name}</h2>
              {user.vip && <span className="badge badge-vip">👑 VIP</span>}
            </div>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", marginBottom: 6 }}>
              UID: {user.uid.slice(0, 14).toUpperCase()}
            </p>
            <span className="badge badge-accent" style={{ fontSize: 11 }}>⭐ Lv.{user.level}</span>
          </div>

          {/* XP bar */}
          <div style={{ width: "100%", marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 5 }}>
              <span>Level {user.level}</span><span>{user.xp}/{user.level * 1000} XP</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${xpPct}%`,
                background: "linear-gradient(90deg,#6C5CE7,#A29BFE)",
                boxShadow: "0 0 8px rgba(108,92,231,0.45)", transition: "width 0.5s",
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
            {[
              { label: "Followers", val: (user.followers || 0).toLocaleString() },
              { label: "Following", val: (user.following || 0).toLocaleString() },
              { label: "💎 Coins",  val: user.coins.toLocaleString() },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)", marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Wallet card */}
        <div className="card card-glow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
          <div style={{ fontSize: 28 }}>💎</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 2 }}>Coin Balance</p>
            <p style={{ fontSize: 22, fontWeight: 900 }}>{user.coins.toLocaleString()}</p>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowWallet(true)}>
            ＋ Recharge
          </button>
        </div>

        {/* Bio snippet */}
        {user.bio && (
          <div className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{user.bio}</p>
          </div>
        )}

        {/* Menu */}
        <div className="card card-glow" style={{ padding: "6px 8px" }}>
          {MENU_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <button
                onClick={() => handleMenu(item.action)}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  width: "100%", padding: "13px 10px", background: "none", border: "none",
                  cursor: "pointer", borderRadius: 12, fontFamily: "inherit", transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "none")}
              >
                <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "left", fontWeight: 600 }}>{item.label}</span>
                <span style={{ color: "rgba(162,155,254,0.3)", fontSize: 14 }}>›</span>
              </button>
              {i < MENU_ITEMS.length - 1 && <div className="divider" />}
            </React.Fragment>
          ))}
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-full" style={{ padding: "14px 0", fontSize: 15 }} onClick={handleLogout}>
          🚪 Log Out
        </button>
      </div>

      {/* Wallet modal */}
      {showWallet && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowWallet(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>💎 Recharge Coins</h2>
              <button onClick={() => setShowWallet(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECHARGE_PACKAGES.map((pkg, i) => (
                <button key={i} onClick={() => handleRecharge(pkg.coins, i)} disabled={recharging !== null}
                  style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                    background: recharging === i ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(108,92,231,0.2)", borderRadius: 16,
                    cursor: recharging !== null ? "not-allowed" : "pointer", fontFamily: "inherit", width: "100%",
                    transition: "all 0.2s",
                  }}>
                  <span style={{ fontSize: 26 }}>💎</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>
                      {pkg.coins.toLocaleString()} Coins
                      {pkg.bonus && <span style={{ fontSize: 11, color: "#00e676", marginLeft: 6 }}>{pkg.bonus}</span>}
                    </p>
                  </div>
                  {recharging === i ? (
                    <div style={{ width: 20, height: 20, borderRadius: 10, border: "2px solid rgba(108,92,231,0.3)", borderTopColor: "#A29BFE", animation: "spin 0.7s linear infinite" }} />
                  ) : (
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#A29BFE" }}>{pkg.price}</span>
                  )}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", textAlign: "center", marginTop: 14 }}>
              This is a demo — no real payment is processed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
