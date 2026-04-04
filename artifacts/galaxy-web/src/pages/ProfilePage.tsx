import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile, updateUser, claimDailyReward, addTransaction, getAchievementsList, Transaction, Achievement } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Props {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
}

const MENU_ITEMS = [
  { icon: "\u270F\uFE0F", label: "Edit Profile", action: "edit" },
  { icon: "\u{1F4B0}", label: "My Wallet", action: "wallet" },
  { icon: "\u{1F4CA}", label: "My Activity", action: "" },
  { icon: "\u2705", label: "Daily Tasks", action: "daily" },
  { icon: "\u{1F4D6}", label: "Stories", action: "" },
  { icon: "\u{1F3C6}", label: "Achievements", action: "achievements" },
  { icon: "\u{1F512}", label: "Privacy Settings", action: "" },
  { icon: "\u{1F514}", label: "Notifications", action: "" },
  { icon: "\u{1F6AB}", label: "Blocked Users", action: "" },
  { icon: "\u2753", label: "Help & Support", action: "" },
  { icon: "\u26A0\uFE0F", label: "Report Issue", action: "" },
];

const RECHARGE_PACKAGES = [
  { coins: 100, price: "$0.99", bonus: "" },
  { coins: 500, price: "$3.99", bonus: "+50 Bonus" },
  { coins: 1000, price: "$6.99", bonus: "+150 Bonus" },
  { coins: 5000, price: "$29.99", bonus: "+1000 Bonus" },
];

export default function ProfilePage({ user, onUpdate, onLogout, onEditProfile }: Props) {
  const [showWallet, setShowWallet] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recharging, setRecharging] = useState<number | null>(null);
  const { showToast } = useToast();

  const xpPct = Math.min(100, (user.xp / (user.level * 1000)) * 100);
  const achievements = getAchievementsList(user);
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  const transactions: Transaction[] = user.transactions ? Object.values(user.transactions).sort((a, b) => b.timestamp - a.timestamp) : [];

  const handleLogout = async () => {
    try { await signOut(auth); } catch {}
    onLogout();
  };

  const handleRecharge = async (coins: number, idx: number) => {
    setRecharging(idx);
    await new Promise(r => setTimeout(r, 1200));
    const updated: UserProfile = { ...user, coins: user.coins + coins };
    await updateUser(user.uid, { coins: updated.coins });
    await addTransaction(user.uid, { type: "recharge", amount: coins, description: `Recharged ${coins} coins` });
    onUpdate(updated);
    setRecharging(null);
    setShowWallet(false);
    showToast(`+${coins} coins added!`, "success", "\u{1F48E}");
  };

  const handleDailyReward = async () => {
    const result = await claimDailyReward(user.uid, user);
    if (result) {
      showToast(`Daily reward: +${result.coins} coins! Day ${result.streak} streak! \u{1F525}`, "success", "\u{1F381}");
    } else {
      showToast("Already claimed today! Come back tomorrow", "warning");
    }
  };

  const handleMenu = (action: string) => {
    if (action === "edit") onEditProfile();
    if (action === "wallet") setShowWallet(true);
    if (action === "achievements") setShowAchievements(true);
    if (action === "daily") handleDailyReward();
  };

  return (
    <div className="page-scroll">
      <div style={{
        padding: "52px 16px 20px",
        background: "linear-gradient(180deg, rgba(108,92,231,0.14) 0%, transparent 100%)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", animation: "float 4s ease-in-out infinite" }}>
            <div style={{
              width: 100, height: 100, borderRadius: 50, fontSize: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(108,92,231,0.2)", border: "3px solid rgba(108,92,231,0.5)",
              boxShadow: "0 0 32px rgba(108,92,231,0.45), 0 0 64px rgba(108,92,231,0.15)",
              cursor: "pointer", overflow: "hidden",
            }} onClick={onEditProfile}>
              {user.avatar.startsWith("http") ? (
                <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : user.avatar}
            </div>
            {user.online && (
              <div style={{ position: "absolute", bottom: 6, right: 6, width: 16, height: 16, borderRadius: 8, background: "#00e676", border: "2.5px solid #0F0F1A" }} />
            )}
            <div style={{
              position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
              background: "#6C5CE7", border: "2px solid #0F0F1A", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
            }} onClick={onEditProfile}>{"\u270F\uFE0F"}</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900 }}>{user.name}</h2>
              {user.vip && <span className="badge badge-vip">{"\u{1F451}"} VIP</span>}
            </div>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", marginBottom: 6 }}>
              UID: {user.uid.slice(0, 14).toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <span className="badge badge-accent" style={{ fontSize: 11 }}>{"\u2B50"} Lv.{user.level}</span>
              <span className="badge badge-gold" style={{ fontSize: 11 }}>{"\u{1F3C6}"} {unlockedCount}/{achievements.length}</span>
            </div>
          </div>

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

          <div style={{ display: "flex", gap: 24, marginTop: 6 }}>
            {[
              { label: "Followers", val: (user.followers || 0).toLocaleString() },
              { label: "Following", val: (user.following || 0).toLocaleString() },
              { label: "Friends", val: (user.friends || 0).toLocaleString() },
              { label: "\u{1F48E} Coins", val: user.coins.toLocaleString() },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{s.val}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", marginTop: 3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="card card-glow" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px" }}>
          <div style={{ fontSize: 28 }}>{"\u{1F48E}"}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 2 }}>Coin Balance</p>
            <p style={{ fontSize: 22, fontWeight: 900 }}>{user.coins.toLocaleString()}</p>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => setShowWallet(true)}>
            {"\uFF0B"} Recharge
          </button>
        </div>

        {/* Daily reward card */}
        <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }} onClick={handleDailyReward}>
          <div style={{ fontSize: 28 }}>{"\u{1F381}"}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Daily Reward</p>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>
              {user.dailyReward?.streak ? `${user.dailyReward.streak} day streak \u{1F525}` : "Claim your first reward!"}
            </p>
          </div>
          <span className="badge badge-accent">Claim</span>
        </div>

        {user.bio && (
          <div className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>{user.bio}</p>
          </div>
        )}

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
                <span style={{ color: "rgba(162,155,254,0.3)", fontSize: 14 }}>{"\u203A"}</span>
              </button>
              {i < MENU_ITEMS.length - 1 && <div className="divider" />}
            </React.Fragment>
          ))}
        </div>

        <button className="btn btn-danger btn-full" style={{ padding: "14px 0", fontSize: 15 }} onClick={handleLogout}>
          {"\u{1F6AA}"} Log Out
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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F48E}"} Recharge Coins</h2>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowHistory(true); setShowWallet(false); }} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>{"\u{1F4CB}"} History</button>
                <button onClick={() => setShowWallet(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
              </div>
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
                  <span style={{ fontSize: 26 }}>{"\u{1F48E}"}</span>
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
              Demo mode {"\u2014"} no real payment processed.
            </p>
          </div>
        </div>
      )}

      {/* Transaction history */}
      {showHistory && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowHistory(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease", maxHeight: "70vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4CB}"} Transaction History</h2>
              <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {transactions.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No transactions yet</p>
              ) : (
                transactions.slice(0, 50).map(tx => (
                  <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 20 }}>
                      {tx.type === "recharge" ? "\u{1F48E}" : tx.type === "gift_sent" ? "\u{1F381}" : tx.type === "gift_received" ? "\u{1F4E5}" : tx.type === "daily_reward" ? "\u{1F31F}" : "\u2B50"}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{tx.description}</p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>
                        {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 14, fontWeight: 800,
                      color: tx.amount >= 0 ? "#00e676" : "#ff6482",
                    }}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Achievements modal */}
      {showAchievements && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
        }} onClick={() => setShowAchievements(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease", maxHeight: "70vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F3C6}"} Achievements ({unlockedCount}/{achievements.length})</h2>
              <button onClick={() => setShowAchievements(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
              {achievements.map(a => (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                  background: a.unlocked ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${a.unlocked ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 14, opacity: a.unlocked ? 1 : 0.5,
                }}>
                  <span style={{ fontSize: 28, filter: a.unlocked ? "none" : "grayscale(1)" }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: a.unlocked ? "#fff" : "rgba(255,255,255,0.5)" }}>{a.title}</p>
                    <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{a.description}</p>
                  </div>
                  {a.unlocked && <span style={{ fontSize: 20 }}>{"\u2705"}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
