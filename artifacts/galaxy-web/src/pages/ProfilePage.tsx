import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile, updateUser, addCoins, claimDailyReward, addTransaction, getAchievementsList, Transaction, Achievement, DAILY_TASKS, getDailyTaskProgress, blockUser, unblockUser, getUser, reportUser, updatePrivacy, subscribeFriendRequests, respondFriendRequest, FriendRequest, sendFriendRequest, removeFriend, searchUsers } from "../lib/userService";
import { submitFeedback, HELP_ARTICLES } from "../lib/supportService";
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
  { icon: "\u2705", label: "Daily Tasks", action: "dailyTasks" },
  { icon: "\u{1F381}", label: "Daily Reward", action: "daily" },
  { icon: "\u{1F91D}", label: "Friend Requests", action: "friendRequests" },
  { icon: "\u{1F465}", label: "Friends List", action: "friendsList" },
  { icon: "\u{1F3C6}", label: "Achievements", action: "achievements" },
  { icon: "\u{1F512}", label: "Privacy & Settings", action: "privacy" },
  { icon: "\u{1F6AB}", label: "Blocked Users", action: "blocked" },
  { icon: "\u{1F50D}", label: "Find Users", action: "search" },
  { icon: "\u{1F4AC}", label: "Send Feedback", action: "feedback" },
  { icon: "\u2753", label: "Help Center", action: "help" },
  { icon: "\u26A0\uFE0F", label: "Report a Problem", action: "report" },
];

const RECHARGE_PACKAGES = [
  { coins: 100, price: "$0.99", bonus: "" },
  { coins: 500, price: "$3.99", bonus: "+50 Bonus" },
  { coins: 1000, price: "$6.99", bonus: "+150 Bonus" },
  { coins: 5000, price: "$29.99", bonus: "+1000 Bonus" },
];

const REPORT_REASONS = ["Harassment", "Spam", "Inappropriate Content", "Fake Profile", "Scam", "Other"];

export default function ProfilePage({ user, onUpdate, onLogout, onEditProfile }: Props) {
  const [showWallet, setShowWallet] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDailyTasks, setShowDailyTasks] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showHelpArticle, setShowHelpArticle] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"feedback" | "bug" | "suggestion">("feedback");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [recharging, setRecharging] = useState<number | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportTarget, setReportTarget] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [privacy, setPrivacy] = useState<NonNullable<UserProfile["privacy"]>>(user.privacy || {
    profileVisible: true, showOnline: true, allowMessages: "everyone", allowGifts: true,
    pushNotifications: true, messageNotifications: true, giftNotifications: true, roomInviteNotifications: true,
  });
  const { showToast } = useToast();

  const xpPct = Math.min(100, (user.xp / (user.level * 1000)) * 100);
  const achievements = getAchievementsList(user);
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const dailyTasks = getDailyTaskProgress(user);
  const transactions: Transaction[] = user.transactions ? Object.values(user.transactions).sort((a, b) => b.timestamp - a.timestamp) : [];

  useEffect(() => {
    const unsub = subscribeFriendRequests(user.uid, setFriendRequests);
    return unsub;
  }, [user.uid]);

  const loadFriends = async () => {
    const friends = user.friendsList || [];
    const profiles: UserProfile[] = [];
    for (const fid of friends.slice(0, 50)) {
      const p = await getUser(fid);
      if (p) profiles.push(p);
    }
    setFriendProfiles(profiles);
  };

  const loadBlocked = async () => {
    const blocked = user.blockedList || [];
    const profiles: UserProfile[] = [];
    for (const bid of blocked.slice(0, 50)) {
      const p = await getUser(bid);
      if (p) profiles.push(p);
    }
    setBlockedProfiles(profiles);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) { console.error("Logout error:", err); }
    onLogout();
  };

  const handleRecharge = async (coins: number, idx: number) => {
    setRecharging(idx);
    try {
      await new Promise(r => setTimeout(r, 1200));
      await addCoins(user.uid, coins);
      await addTransaction(user.uid, { type: "recharge", amount: coins, description: `Recharged ${coins} coins` });
      onUpdate({ ...user, coins: user.coins + coins });
      setShowWallet(false);
      showToast(`+${coins} coins added!`, "success", "\u{1F48E}");
    } catch {
      showToast("Recharge failed. Try again.", "error");
    } finally {
      setRecharging(null);
    }
  };

  const handleDailyReward = async () => {
    const result = await claimDailyReward(user.uid, user);
    if (result) {
      showToast(`Daily reward: +${result.coins} coins! Day ${result.streak} streak! \u{1F525}`, "success", "\u{1F381}");
    } else {
      showToast("Already claimed today! Come back tomorrow", "warning");
    }
  };

  const handleFriendResponse = async (reqId: string, accept: boolean) => {
    await respondFriendRequest(user.uid, reqId, accept);
    showToast(accept ? "Friend added!" : "Request declined", accept ? "success" : "info");
  };

  const handleUnblock = async (uid: string) => {
    await unblockUser(user.uid, uid);
    setBlockedProfiles(prev => prev.filter(p => p.uid !== uid));
    showToast("User unblocked", "info");
  };

  const handleRemoveFriend = async (uid: string) => {
    await removeFriend(user.uid, uid);
    setFriendProfiles(prev => prev.filter(p => p.uid !== uid));
    showToast("Friend removed", "info");
  };

  const handleSavePrivacy = async () => {
    try {
      await updatePrivacy(user.uid, privacy);
      showToast("Settings saved", "success");
      setShowPrivacy(false);
    } catch {
      showToast("Failed to save settings. Try again.", "error");
    }
  };

  const handleReport = async () => {
    if (!reportReason) { showToast("Please select a reason", "warning"); return; }
    try {
      await reportUser(user.uid, reportTarget || "general", reportReason, reportDetails);
      showToast("Report submitted. Thank you!", "success");
      setShowReport(false);
      setReportReason("");
      setReportDetails("");
      setReportTarget("");
    } catch {
      showToast("Failed to submit report. Try again.", "error");
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    const results = await searchUsers(searchQuery.trim());
    setSearchResults(results.filter(u => u.uid !== user.uid));
  };

  const handleAddFriend = async (target: UserProfile) => {
    await sendFriendRequest(user.uid, user.name, user.avatar, target.uid);
    showToast(`Friend request sent to ${target.name}!`, "success");
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackSubject.trim() || !feedbackMessage.trim()) {
      showToast("Please fill in all fields", "warning");
      return;
    }
    setFeedbackSending(true);
    try {
      await submitFeedback(user.uid, user.name, feedbackType, feedbackSubject.trim(), feedbackMessage.trim());
      showToast("Thank you for your feedback!", "success");
      setShowFeedback(false);
      setFeedbackSubject("");
      setFeedbackMessage("");
      setFeedbackType("feedback");
    } catch {
      showToast("Failed to send feedback. Try again.", "error");
    }
    setFeedbackSending(false);
  };

  const handleMenu = (action: string) => {
    if (action === "edit") onEditProfile();
    if (action === "wallet") setShowWallet(true);
    if (action === "achievements") setShowAchievements(true);
    if (action === "daily") handleDailyReward();
    if (action === "dailyTasks") setShowDailyTasks(true);
    if (action === "privacy") setShowPrivacy(true);
    if (action === "blocked") { setShowBlocked(true); loadBlocked(); }
    if (action === "friendRequests") setShowFriendRequests(true);
    if (action === "friendsList") { setShowFriendsList(true); loadFriends(); }
    if (action === "report") setShowReport(true);
    if (action === "search") setShowSearch(true);
    if (action === "feedback") setShowFeedback(true);
    if (action === "help") setShowHelp(true);
  };

  return (
    <div className="page-scroll no-screenshot">
      <div style={{
        padding: "52px 16px 24px",
        background: "linear-gradient(180deg, rgba(108,92,231,0.14) 0%, rgba(108,92,231,0.02) 60%, transparent 100%)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 100, height: 100, borderRadius: 50, fontSize: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
              border: "3px solid rgba(108,92,231,0.5)",
              boxShadow: "0 0 32px rgba(108,92,231,0.4), 0 8px 32px rgba(0,0,0,0.3)",
              cursor: "pointer", overflow: "hidden",
            }} onClick={onEditProfile}>
              {user.avatar.startsWith("http") ? (
                <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : user.avatar}
            </div>
            {user.online && (
              <div style={{ position: "absolute", bottom: 6, right: 6, width: 16, height: 16, borderRadius: 8, background: "#00e676", border: "2.5px solid #0F0F1A", boxShadow: "0 0 8px rgba(0,230,118,0.4)" }} />
            )}
            <div style={{
              position: "absolute", bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
              background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", border: "2px solid #0F0F1A", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              boxShadow: "0 2px 8px rgba(108,92,231,0.4)",
            }} onClick={onEditProfile}>{"\u270F\uFE0F"}</div>
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900 }}>{user.name}</h2>
              {user.vip && <span className="badge badge-vip">{"\u{1F451}"} VIP</span>}
            </div>
            <p style={{ fontSize: 13, color: "rgba(162,155,254,0.5)", marginBottom: 4, fontFamily: "monospace", letterSpacing: 1 }}>
              ID: {user.userId || "N/A"}
            </p>
            <p style={{ fontSize: 10, color: "rgba(162,155,254,0.25)", marginBottom: 8, fontFamily: "monospace" }}>
              UID: {user.uid.slice(0, 14).toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
              <span className="badge badge-accent" style={{ fontSize: 11, padding: "4px 12px" }}>{"\u2B50"} Lv.{user.level}</span>
              <span className="badge badge-gold" style={{ fontSize: 11, padding: "4px 12px" }}>{"\u{1F3C6}"} {unlockedCount}/{achievements.length}</span>
            </div>
          </div>

          <div style={{ width: "100%", marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 6 }}>
              <span>Level {user.level}</span><span>{user.xp.toLocaleString()}/{(user.level * 1000).toLocaleString()} XP</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
              <div style={{
                height: "100%", borderRadius: 3, width: `${xpPct}%`,
                background: "linear-gradient(90deg,#6C5CE7,#A29BFE,#8B7CF6)",
                boxShadow: "0 0 10px rgba(108,92,231,0.5)", transition: "width 0.6s ease",
              }} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 20, marginTop: 8, width: "100%", justifyContent: "center" }}>
            {[
              { label: "Followers", val: (user.followers || 0).toLocaleString() },
              { label: "Following", val: (user.following || 0).toLocaleString() },
              { label: "Friends", val: (user.friends || 0).toLocaleString() },
              { label: "Coins", val: user.coins.toLocaleString(), icon: "\u{1F48E}" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center", flex: 1 }}>
                <p style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{"icon" in s && s.icon ? `${s.icon} ` : ""}{s.val}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", marginTop: 4 }}>{s.label}</p>
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

        {friendRequests.length > 0 && (
          <div className="card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", border: "1px solid rgba(108,92,231,0.3)" }} onClick={() => setShowFriendRequests(true)}>
            <div style={{ fontSize: 28 }}>{"\u{1F91D}"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>Friend Requests</p>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>{friendRequests.length} pending</p>
            </div>
            <span className="badge badge-accent">{friendRequests.length}</span>
          </div>
        )}

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
                {item.action === "friendRequests" && friendRequests.length > 0 && (
                  <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#6C5CE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, padding: "0 4px" }}>{friendRequests.length}</span>
                )}
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

      {showWallet && (
        <BottomSheet onClose={() => setShowWallet(false)}>
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
        </BottomSheet>
      )}

      {showHistory && (
        <BottomSheet onClose={() => setShowHistory(false)}>
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
                    {tx.type === "recharge" ? "\u{1F48E}" : tx.type === "gift_sent" ? "\u{1F381}" : tx.type === "gift_received" ? "\u{1F4E5}" : tx.type === "daily_reward" ? "\u{1F31F}" : tx.type === "task_reward" ? "\u2705" : "\u2B50"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{tx.description}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>
                      {new Date(tx.timestamp).toLocaleDateString()} {new Date(tx.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color: tx.amount >= 0 ? "#00e676" : "#ff6482" }}>{tx.amount >= 0 ? "+" : ""}{tx.amount}</span>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showAchievements && (
        <BottomSheet onClose={() => setShowAchievements(false)}>
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
        </BottomSheet>
      )}

      {showDailyTasks && (
        <BottomSheet onClose={() => setShowDailyTasks(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u2705"} Daily Tasks</h2>
            <button onClick={() => setShowDailyTasks(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {dailyTasks.map(task => (
              <div key={task.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                background: task.completed ? "rgba(0,230,118,0.08)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${task.completed ? "rgba(0,230,118,0.2)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: 14,
              }}>
                <span style={{ fontSize: 24, filter: task.completed ? "none" : "grayscale(0.5)" }}>{task.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: task.completed ? "#00e676" : "#fff" }}>{task.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.07)" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min(100, (task.progress / task.target) * 100)}%`,
                        background: task.completed ? "#00e676" : "linear-gradient(90deg,#6C5CE7,#A29BFE)",
                        transition: "width 0.3s",
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", whiteSpace: "nowrap" }}>{task.progress}/{task.target}</span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: task.completed ? "#00e676" : "#FFD700" }}>
                    {task.completed ? "\u2705" : `+${task.reward}`}
                  </span>
                  {!task.completed && <p style={{ fontSize: 8, color: "rgba(162,155,254,0.3)" }}>coins</p>}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", textAlign: "center", marginTop: 14 }}>
            Tasks reset daily at midnight
          </p>
        </BottomSheet>
      )}

      {showPrivacy && (
        <BottomSheet onClose={() => setShowPrivacy(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F512}"} Privacy & Settings</h2>
            <button onClick={() => setShowPrivacy(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Privacy</p>
            <PrivacyToggle label="Profile Visible" value={privacy.profileVisible} onChange={v => setPrivacy({ ...privacy, profileVisible: v })} />
            <PrivacyToggle label="Show Online Status" value={privacy.showOnline} onChange={v => setPrivacy({ ...privacy, showOnline: v })} />
            <PrivacyToggle label="Allow Gifts" value={privacy.allowGifts} onChange={v => setPrivacy({ ...privacy, allowGifts: v })} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)", marginBottom: 8 }}>Who can message you</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["everyone", "friends", "nobody"] as const).map(opt => (
                  <button key={opt} onClick={() => setPrivacy({ ...privacy, allowMessages: opt })} style={{
                    flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                    background: privacy.allowMessages === opt ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                    color: privacy.allowMessages === opt ? "#A29BFE" : "rgba(162,155,254,0.4)",
                    fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                  }}>{opt}</button>
                ))}
              </div>
            </div>
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
            <p style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>Notifications</p>
            <PrivacyToggle label="Push Notifications" value={privacy.pushNotifications !== false} onChange={v => setPrivacy({ ...privacy, pushNotifications: v })} />
            <PrivacyToggle label="Message Notifications" value={privacy.messageNotifications !== false} onChange={v => setPrivacy({ ...privacy, messageNotifications: v })} />
            <PrivacyToggle label="Gift Notifications" value={privacy.giftNotifications !== false} onChange={v => setPrivacy({ ...privacy, giftNotifications: v })} />
            <PrivacyToggle label="Room Invite Notifications" value={privacy.roomInviteNotifications !== false} onChange={v => setPrivacy({ ...privacy, roomInviteNotifications: v })} />
          </div>
          <button className="btn btn-primary btn-full" style={{ marginTop: 20 }} onClick={handleSavePrivacy}>Save Settings</button>
        </BottomSheet>
      )}

      {showFriendRequests && (
        <BottomSheet onClose={() => setShowFriendRequests(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F91D}"} Friend Requests</h2>
            <button onClick={() => setShowFriendRequests(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendRequests.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No pending requests</p>
            ) : (
              friendRequests.map(req => (
                <div key={req.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{req.fromAvatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{req.fromName}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>{new Date(req.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => handleFriendResponse(req.id, true)}>{"\u2714"}</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "6px 12px" }} onClick={() => handleFriendResponse(req.id, false)}>{"\u2715"}</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFriendsList && (
        <BottomSheet onClose={() => setShowFriendsList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Friends ({user.friends || 0})</h2>
            <button onClick={() => setShowFriendsList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {friendProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No friends yet</p>
            ) : (
              friendProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{fp.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleRemoveFriend(fp.uid)}>Remove</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showBlocked && (
        <BottomSheet onClose={() => setShowBlocked(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F6AB}"} Blocked Users</h2>
            <button onClick={() => setShowBlocked(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {blockedProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No blocked users</p>
            ) : (
              blockedProfiles.map(bp => (
                <div key={bp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{bp.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{bp.name}</p>
                  </div>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleUnblock(bp.uid)}>Unblock</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showReport && (
        <BottomSheet onClose={() => setShowReport(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u26A0\uFE0F"} Report Issue</h2>
            <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input className="input-field" placeholder="User ID (optional)" value={reportTarget} onChange={e => setReportTarget(e.target.value)} style={{ borderRadius: 14, padding: "12px 14px" }} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {REPORT_REASONS.map(r => (
                <button key={r} onClick={() => setReportReason(r)} style={{
                  padding: "8px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: reportReason === r ? "rgba(255,100,130,0.2)" : "rgba(255,255,255,0.04)",
                  color: reportReason === r ? "#ff6482" : "rgba(162,155,254,0.5)",
                  fontSize: 12, fontWeight: 600,
                }}>{r}</button>
              ))}
            </div>
            <textarea
              className="input-field"
              placeholder="Describe the issue..."
              value={reportDetails}
              onChange={e => setReportDetails(e.target.value)}
              rows={3}
              style={{ borderRadius: 14, padding: "12px 14px", resize: "none", fontFamily: "inherit" }}
            />
            <button className="btn btn-danger btn-full" onClick={handleReport}>Submit Report</button>
          </div>
        </BottomSheet>
      )}

      {showSearch && (
        <BottomSheet onClose={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F50D}"} Find Users</h2>
            <button onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="input-field" placeholder="Search by name..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex: 1, borderRadius: 14, padding: "12px 14px" }} />
            <button className="btn btn-primary btn-sm" onClick={handleSearch}>{"\u{1F50D}"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {searchResults.map(sr => {
              const isFriend = (user.friendsList || []).includes(sr.uid);
              return (
                <div key={sr.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span style={{ fontSize: 24 }}>{sr.avatar}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{sr.name}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)" }}>Lv.{sr.level}</p>
                  </div>
                  {isFriend ? (
                    <span style={{ fontSize: 11, color: "#00e676", fontWeight: 600 }}>Friends</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleAddFriend(sr)}>Add Friend</button>
                  )}
                </div>
              );
            })}
          </div>
        </BottomSheet>
      )}

      {showFeedback && (
        <BottomSheet onClose={() => setShowFeedback(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F4AC}"} Send Feedback</h2>
            <button onClick={() => setShowFeedback(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {(["feedback", "bug", "suggestion"] as const).map(t => (
                <button key={t} onClick={() => setFeedbackType(t)} style={{
                  flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: feedbackType === t ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                  color: feedbackType === t ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                }}>
                  {t === "feedback" ? "\u{1F4DD}" : t === "bug" ? "\u{1F41B}" : "\u{1F4A1}"} {t}
                </button>
              ))}
            </div>
            <input
              className="input-field"
              placeholder="Subject"
              value={feedbackSubject}
              onChange={e => setFeedbackSubject(e.target.value)}
              style={{ borderRadius: 14, padding: "12px 14px" }}
            />
            <textarea
              className="input-field"
              placeholder="Tell us what's on your mind..."
              value={feedbackMessage}
              onChange={e => setFeedbackMessage(e.target.value)}
              rows={4}
              style={{ borderRadius: 14, padding: "12px 14px", resize: "none", fontFamily: "inherit" }}
            />
            <button className="btn btn-primary btn-full" onClick={handleSubmitFeedback} disabled={feedbackSending}>
              {feedbackSending ? "Sending..." : "Submit Feedback"}
            </button>
          </div>
        </BottomSheet>
      )}

      {showHelp && (
        <BottomSheet onClose={() => { setShowHelp(false); setShowHelpArticle(null); }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            {showHelpArticle ? (
              <button onClick={() => setShowHelpArticle(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "#A29BFE", fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
                {"\u2039"} Back
              </button>
            ) : (
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u2753"} Help Center</h2>
            )}
            <button onClick={() => { setShowHelp(false); setShowHelpArticle(null); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {showHelpArticle ? (() => {
              const article = HELP_ARTICLES.find(a => a.id === showHelpArticle);
              if (!article) return null;
              return (
                <div style={{ padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 32 }}>{article.icon}</span>
                    <h3 style={{ fontSize: 17, fontWeight: 800 }}>{article.title}</h3>
                  </div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.8 }}>{article.content}</p>
                </div>
              );
            })() : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {HELP_ARTICLES.map(article => (
                  <button key={article.id} onClick={() => setShowHelpArticle(article.id)} style={{
                    display: "flex", alignItems: "center", gap: 14, padding: "14px 12px",
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 14, cursor: "pointer", fontFamily: "inherit", width: "100%", transition: "background 0.15s",
                    textAlign: "left",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(108,92,231,0.08)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  >
                    <span style={{ fontSize: 22, width: 28, textAlign: "center" }}>{article.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{article.title}</span>
                    <span style={{ color: "rgba(162,155,254,0.3)", fontSize: 14 }}>{"\u203A"}</span>
                  </button>
                ))}
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)" }}>Need more help? Send us feedback!</p>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11 }} onClick={() => { setShowHelp(false); setShowFeedback(true); }}>
                    {"\u{1F4AC}"} Send Feedback
                  </button>
                </div>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 400,
    }} onClick={onClose}>
      <div className="card" style={{
        width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
        padding: 24, animation: "slide-up 0.3s ease", maxHeight: "75vh", display: "flex", flexDirection: "column",
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function PrivacyToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.8)" }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
        background: value ? "rgba(108,92,231,0.6)" : "rgba(255,255,255,0.1)",
        position: "relative", transition: "background 0.2s",
      }}>
        <div style={{
          width: 20, height: 20, borderRadius: 10, background: "#fff",
          position: "absolute", top: 3, left: value ? 25 : 3,
          transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }} />
      </button>
    </div>
  );
}
