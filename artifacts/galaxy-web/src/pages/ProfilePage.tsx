import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { UserProfile, updateUser, addCoins, claimDailyReward, addTransaction, getAchievementsList, Transaction, Achievement, DAILY_TASKS, getDailyTaskProgress, blockUser, unblockUser, getUser, reportUser, updatePrivacy, subscribeFriendRequests, respondFriendRequest, FriendRequest, sendFriendRequest, removeFriend, searchUsers, isSuperAdmin, setOfficialRole, removeOfficialRole, getUserByUserId, ensureSuperAdmin, followUser } from "../lib/userService";
import { submitFeedback, HELP_ARTICLES } from "../lib/supportService";
import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";
import { STORE_ITEMS, StoreItem, OwnedItem, getStoreItem, purchaseItem, getInventory, equipItem, unequipItem, getRarityColor, getFrameCssClass, isPngFrame, getPngFramePath } from "../lib/storeService";

interface Props {
  user: UserProfile;
  onUpdate: (u: UserProfile) => void;
  onLogout: () => void;
  onEditProfile: () => void;
  onMessage?: (uid: string) => void;
}

const MENU_ITEMS = [
  { icon: "\u270F\uFE0F", label: "Edit Profile", action: "edit" },
  { icon: "\u{1F6CD}\uFE0F", label: "Store", action: "store" },
  { icon: "\u{1F392}", label: "Backpack", action: "backpack" },
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

export default function ProfilePage({ user, onUpdate, onLogout, onEditProfile, onMessage }: Props) {
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
  const [showStore, setShowStore] = useState(false);
  const [showBackpack, setShowBackpack] = useState(false);
  const [storeCategory, setStoreCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [storeLoading, setStoreLoading] = useState<string | null>(null);
  const [ownedItems, setOwnedItems] = useState<OwnedItem[]>([]);
  const [backpackCategory, setBackpackCategory] = useState<"frame" | "entry" | "theme">("frame");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showOfficialRules, setShowOfficialRules] = useState(false);
  const [adminPromoteId, setAdminPromoteId] = useState("");
  const [adminLookupResult, setAdminLookupResult] = useState<UserProfile | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feedback" | "bug" | "suggestion">("feedback");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [recharging, setRecharging] = useState<number | null>(null);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
  const [showFollowersList, setShowFollowersList] = useState(false);
  const [showFollowingList, setShowFollowingList] = useState(false);
  const [followerProfiles, setFollowerProfiles] = useState<UserProfile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<UserProfile[]>([]);
  const [followerLoading, setFollowerLoading] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [momentCount, setMomentCount] = useState(0);
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

  const isAdmin = isSuperAdmin(user);

  useEffect(() => {
    if (isAdmin) ensureSuperAdmin(user.uid).catch(console.error);
  }, [isAdmin, user.uid]);

  useEffect(() => {
    const momentsRef = ref(db, "moments");
    const handler = onValue(momentsRef, snap => {
      if (!snap.exists()) { setMomentCount(0); return; }
      const val = snap.val();
      const count = Object.values(val).filter((m: any) => m.uid === user.uid).length;
      setMomentCount(count);
    });
    return () => off(momentsRef);
  }, [user.uid]);

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

  const loadFollowers = async () => {
    setFollowerLoading(true);
    try {
      const list = user.followersList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowerProfiles(profiles);
    } catch { showToast("Failed to load followers", "error"); }
    finally { setFollowerLoading(false); }
  };

  const loadFollowing = async () => {
    setFollowingLoading(true);
    try {
      const list = user.followingList || [];
      const profiles: UserProfile[] = [];
      for (const uid of list.slice(0, 50)) {
        const p = await getUser(uid);
        if (p) profiles.push(p);
      }
      setFollowingProfiles(profiles);
    } catch { showToast("Failed to load following", "error"); }
    finally { setFollowingLoading(false); }
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
    const req = friendRequests.find(r => r.id === reqId);
    await respondFriendRequest(user.uid, reqId, accept);
    setFriendRequests(prev => prev.filter(r => r.id !== reqId));
    if (accept && req) {
      showToast(`${req.fromName} added as friend! You can now chat.`, "success");
      try {
        await getOrCreateConversation(user.uid, user.name, user.avatar, req.fromUid, req.fromName, req.fromAvatar || "");
      } catch {}
    } else {
      showToast("Request declined", "info");
    }
  };

  const handleFriendBlock = async (req: FriendRequest) => {
    await respondFriendRequest(user.uid, req.id, false);
    await blockUser(user.uid, req.fromUid);
    setFriendRequests(prev => prev.filter(r => r.id !== req.id));
    showToast(`${req.fromName} blocked`, "info");
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

  const handleAdminLookup = async () => {
    if (!adminPromoteId.trim()) return;
    setAdminLoading(true);
    try {
      const found = await getUserByUserId(adminPromoteId.trim());
      setAdminLookupResult(found);
      if (!found) showToast("User not found", "warning");
    } catch {
      showToast("Lookup failed", "error");
    }
    setAdminLoading(false);
  };

  const handlePromoteOfficial = async () => {
    if (!adminLookupResult) return;
    setAdminLoading(true);
    try {
      await setOfficialRole(adminLookupResult.uid);
      showToast(`${adminLookupResult.name} promoted to Official!`, "success");
      setAdminLookupResult({ ...adminLookupResult, globalRole: "official", frame: "assets/frames/official_frame.png" });
    } catch {
      showToast("Failed to promote", "error");
    }
    setAdminLoading(false);
  };

  const handleDemoteOfficial = async () => {
    if (!adminLookupResult) return;
    setAdminLoading(true);
    try {
      await removeOfficialRole(adminLookupResult.uid);
      showToast(`${adminLookupResult.name} demoted to User`, "info");
      setAdminLookupResult({ ...adminLookupResult, globalRole: "user", frame: undefined });
    } catch {
      showToast("Failed to demote", "error");
    }
    setAdminLoading(false);
  };

  const loadInventory = async () => {
    const items = await getInventory(user.uid);
    setOwnedItems(items);
  };

  const handlePurchase = async (item: StoreItem) => {
    if (user.coins < item.price) { showToast("Not enough coins!", "warning"); return; }
    const owned = user.inventory || {};
    if (owned[item.id]) { showToast("Already owned!", "info"); return; }
    setStoreLoading(item.id);
    try {
      const ok = await purchaseItem(user.uid, item.id, user.coins);
      if (ok) {
        onUpdate({ ...user, coins: user.coins - item.price, inventory: { ...owned, [item.id]: { itemId: item.id, purchasedAt: Date.now(), equipped: false } } });
        showToast(`${item.name} purchased!`, "success");
      } else {
        showToast("Purchase failed", "error");
      }
    } catch { showToast("Purchase failed", "error"); }
    setStoreLoading(null);
  };

  const handleEquip = async (itemId: string) => {
    setStoreLoading(itemId);
    try {
      await equipItem(user.uid, itemId);
      const item = getStoreItem(itemId);
      const updatedInv = { ...(user.inventory || {}) };
      for (const [k, v] of Object.entries(updatedInv)) {
        const si = getStoreItem(v.itemId);
        if (si && item && si.category === item.category) updatedInv[k] = { ...v, equipped: false };
      }
      if (updatedInv[itemId]) updatedInv[itemId] = { ...updatedInv[itemId], equipped: true };
      const updates: Partial<typeof user> = { inventory: updatedInv };
      if (item?.category === "frame") updates.equippedFrame = itemId;
      if (item?.category === "entry") updates.equippedEntry = itemId;
      if (item?.category === "theme") updates.equippedTheme = itemId;
      onUpdate({ ...user, ...updates });
      await loadInventory();
      showToast(`${item?.name || "Item"} equipped!`, "success");
    } catch { showToast("Equip failed", "error"); }
    setStoreLoading(null);
  };

  const handleUnequip = async (itemId: string) => {
    setStoreLoading(itemId);
    try {
      await unequipItem(user.uid, itemId);
      const item = getStoreItem(itemId);
      const updatedInv = { ...(user.inventory || {}) };
      if (updatedInv[itemId]) updatedInv[itemId] = { ...updatedInv[itemId], equipped: false };
      const updates: Partial<typeof user> = { inventory: updatedInv };
      if (item?.category === "frame") updates.equippedFrame = undefined;
      if (item?.category === "entry") updates.equippedEntry = undefined;
      if (item?.category === "theme") updates.equippedTheme = undefined;
      onUpdate({ ...user, ...updates });
      await loadInventory();
      showToast("Item unequipped", "info");
    } catch { showToast("Unequip failed", "error"); }
    setStoreLoading(null);
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
    if (action === "store") { setShowStore(true); setStoreCategory("frame"); }
    if (action === "backpack") { loadInventory(); setShowBackpack(true); setBackpackCategory("frame"); }
    if (action === "report") setShowReport(true);
    if (action === "search") setShowSearch(true);
    if (action === "feedback") setShowFeedback(true);
    if (action === "help") setShowHelp(true);
    if (action === "admin") { setShowAdminPanel(true); setAdminPromoteId(""); setAdminLookupResult(null); }
  };

  return (
    <div className="page-scroll no-screenshot">
      <div style={{
        padding: "52px 16px 24px",
        background: "linear-gradient(180deg, rgba(108,92,231,0.14) 0%, rgba(108,92,231,0.02) 60%, transparent 100%)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}>
            {(() => {
              if (!user.equippedFrame || isAdmin || user.globalRole === "official") return null;
              if (isPngFrame(user.equippedFrame)) {
                const pngPath = getPngFramePath(user.equippedFrame);
                return pngPath ? <img src={`${import.meta.env.BASE_URL}${pngPath}`} alt="" className="png-frame-profile" /> : null;
              }
              const profileFrameCss = getFrameCssClass(user.equippedFrame);
              return profileFrameCss ? <div className={`store-frame-profile ${profileFrameCss}`} /> : null;
            })()}
            <div style={{
              width: 100, height: 100, borderRadius: 50, fontSize: 50,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
              border: isAdmin ? "3px solid #FFD700" : user.globalRole === "official" ? "3px solid #FFD700" : "3px solid rgba(108,92,231,0.5)",
              boxShadow: isAdmin
                ? "0 0 20px rgba(255,215,0,0.5), 0 0 40px rgba(191,0,255,0.25), 0 0 60px rgba(255,215,0,0.15), 0 8px 32px rgba(0,0,0,0.3)"
                : user.globalRole === "official"
                ? "0 0 20px rgba(255,215,0,0.4), 0 0 40px rgba(255,215,0,0.15), 0 8px 32px rgba(0,0,0,0.3)"
                : "0 0 32px rgba(108,92,231,0.4), 0 8px 32px rgba(0,0,0,0.3)",
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
              {user.equippedFrame && (() => { const fi = getStoreItem(user.equippedFrame); return fi ? <span style={{ fontSize: 16 }}>{fi.icon}</span> : null; })()}
              {user.vip && <span className="badge badge-vip">{"\u{1F451}"} VIP</span>}
              {isAdmin ? (
                <span className="super-admin-chat-tag" style={{ fontSize: 9, padding: "2px 10px" }}>
                  {"\u{1F451}"} SUPER ADMIN
                </span>
              ) : user.globalRole === "official" ? (
                <span className="official-chat-tag" style={{ fontSize: 9, padding: "2px 10px" }}>
                  {"\u{1F6E1}\uFE0F"} OFFICIAL
                </span>
              ) : null}
            </div>
            <p style={{ fontSize: 13, color: "rgba(162,155,254,0.5)", marginBottom: 4, fontFamily: "monospace", letterSpacing: 1 }}>
              ID: {user.userId || "N/A"}
            </p>
            <p style={{ fontSize: 10, color: "rgba(162,155,254,0.25)", marginBottom: 8, fontFamily: "monospace" }}>
              UID: {user.uid.slice(0, 14).toUpperCase()}
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
              {isAdmin ? (
                <>
                  <div className="super-admin-tag-wrapper">
                    <img src={`${import.meta.env.BASE_URL}assets/official/super_admin_v2.png`} alt="Super Admin" className="super-admin-tag" style={{ height: 28 }} />
                    <div className="super-admin-particles" />
                  </div>
                  <span className="founder-badge">{"\u{1F451}"} Founder</span>
                </>
              ) : (user.globalRole === "official") ? (
                <img src={`${import.meta.env.BASE_URL}assets/official/official_tag.svg`} alt="Official" style={{ height: 22, filter: "drop-shadow(0 0 6px rgba(0,206,201,0.5)) drop-shadow(0 0 12px rgba(9,132,227,0.3))" }} />
              ) : (
                <span className="badge badge-accent" style={{ fontSize: 11, padding: "4px 12px" }}>{"\u2B50"} Lv.{user.level}</span>
              )}
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

          <div style={{ display: "flex", gap: 14, marginTop: 8, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { label: "Followers", val: (user.followers || 0).toLocaleString(), action: () => { setShowFollowersList(true); loadFollowers(); } },
              { label: "Following", val: (user.following || 0).toLocaleString(), action: () => { setShowFollowingList(true); loadFollowing(); } },
              { label: "Friends", val: (user.friends || 0).toLocaleString(), action: () => { setShowFriendsList(true); loadFriends(); } },
              { label: "Moments", val: (momentCount).toLocaleString(), icon: "\u{1F4F8}" },
              { label: "Gifts", val: (user.totalEarnings || 0).toLocaleString(), icon: "\u{1F381}" },
              { label: "Coins", val: user.coins.toLocaleString(), icon: "\u{1F48E}", action: () => setShowWallet(true) },
            ].map(s => (
              <div key={s.label} onClick={"action" in s && s.action ? s.action as () => void : undefined} style={{ textAlign: "center", minWidth: 52, cursor: "action" in s && s.action ? "pointer" : "default" }}>
                <p style={{ fontSize: 16, fontWeight: 900, lineHeight: 1 }}>{"icon" in s && s.icon ? `${s.icon} ` : ""}{s.val}</p>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.45)", marginTop: 4 }}>{s.label}</p>
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

        {(user.globalRole === "official" || isAdmin) && (
          <button
            className="btn btn-full"
            style={{
              padding: "14px 0", fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg, rgba(0,255,255,0.08), rgba(191,0,255,0.08))",
              border: "1.5px solid rgba(0,255,255,0.3)",
              color: "#00ffff",
            }}
            onClick={() => setShowOfficialRules(true)}
          >
            {"\u{1F4DC}"} Official Guidelines
          </button>
        )}

        {isAdmin && (
          <button
            className="btn btn-full"
            style={{
              padding: "14px 0", fontSize: 15, fontWeight: 800,
              background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.05))",
              border: "1.5px solid rgba(255,215,0,0.4)",
              color: "#FFD700",
            }}
            onClick={() => handleMenu("admin")}
          >
            {"\u{1F6E1}\uFE0F"} Admin Panel
          </button>
        )}

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
                <div key={req.id} className="card" style={{ padding: 14, marginBottom: 10, border: "1px solid rgba(108,92,231,0.15)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 24, fontSize: 24,
                      background: "rgba(108,92,231,0.12)",
                      border: "2px solid rgba(108,92,231,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden",
                    }}>
                      {req.fromAvatar?.startsWith("http")
                        ? <img src={req.fromAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                        : <span>{req.fromAvatar || "\u{1F464}"}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{req.fromName}</p>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.35)", marginTop: 2 }}>
                        {new Date(req.timestamp).toLocaleDateString()} {"\u00B7"} wants to be friends
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleFriendResponse(req.id, true)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(0,230,118,0.2), rgba(0,230,118,0.08))",
                        color: "#00e676", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(0,230,118,0.15)",
                      }}
                    >{"\u2714"} Accept</button>
                    <button
                      onClick={() => handleFriendResponse(req.id, false)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg, rgba(255,82,82,0.2), rgba(255,82,82,0.08))",
                        color: "#ff5252", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                        boxShadow: "0 0 12px rgba(255,82,82,0.15)",
                      }}
                    >{"\u2715"} Decline</button>
                    <button
                      onClick={() => handleFriendBlock(req)}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: "rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 800, fontFamily: "inherit",
                      }}
                    >{"\u{1F6AB}"} Block</button>
                  </div>
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
                  <div onClick={() => { setShowFriendsList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} />
                      : fp.avatar}
                  </div>
                  <div onClick={() => { setShowFriendsList(false); setViewingProfile(fp); }} style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFriendsList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"}</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }} onClick={() => handleRemoveFriend(fp.uid)}>Remove</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFollowersList && (
        <BottomSheet onClose={() => setShowFollowersList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Followers ({user.followers || 0})</h2>
            <button onClick={() => setShowFollowersList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followerLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
                </div>
              ))
            ) : followerProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No followers yet</p>
            ) : (
              followerProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div onClick={() => { setShowFollowersList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} />
                      : fp.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setShowFollowersList(false); setViewingProfile(fp); }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFollowersList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"} Chat</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {showFollowingList && (
        <BottomSheet onClose={() => setShowFollowingList(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F465}"} Following ({user.following || 0})</h2>
            <button onClick={() => setShowFollowingList(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {followingLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="skeleton skeleton-circle" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}><div className="skeleton skeleton-text" style={{ width: "50%" }} /></div>
                </div>
              ))
            ) : followingProfiles.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No one followed yet</p>
            ) : (
              followingProfiles.map(fp => (
                <div key={fp.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <div onClick={() => { setShowFollowingList(false); setViewingProfile(fp); }} style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, cursor: "pointer",
                  }}>
                    {fp.avatar?.startsWith("http")
                      ? <img src={fp.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} />
                      : fp.avatar}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => { setShowFollowingList(false); setViewingProfile(fp); }}>
                    <p style={{ fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fp.name}</p>
                    <p style={{ fontSize: 10, color: fp.online ? "#00e676" : "rgba(162,155,254,0.35)" }}>{fp.online ? "Online" : "Offline"}</p>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ fontSize: 10, padding: "4px 10px", borderRadius: 10 }} onClick={async () => {
                    try {
                      await getOrCreateConversation(user.uid, user.name, user.avatar, fp.uid, fp.name, fp.avatar);
                      setShowFollowingList(false);
                      if (onMessage) onMessage(fp.uid);
                    } catch { showToast("Could not open chat", "error"); }
                  }}>{"\u{1F4AC}"} Chat</button>
                </div>
              ))
            )}
          </div>
        </BottomSheet>
      )}

      {viewingProfile && (
        <BottomSheet onClose={() => setViewingProfile(null)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>Profile</h2>
            <button onClick={() => setViewingProfile(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 80, height: 80, borderRadius: 40, fontSize: 40,
                background: isSuperAdmin(viewingProfile) ? "rgba(255,215,0,0.12)" : "rgba(108,92,231,0.15)",
                border: isSuperAdmin(viewingProfile) ? "3px solid rgba(255,215,0,0.5)" : "3px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                boxShadow: isSuperAdmin(viewingProfile) ? "0 0 20px rgba(255,215,0,0.3)" : "0 0 15px rgba(108,92,231,0.2)",
              }}>
                {viewingProfile.avatar?.startsWith("http")
                  ? <img src={viewingProfile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 40 }} />
                  : viewingProfile.avatar}
              </div>
              {isSuperAdmin(viewingProfile) && (
                <img src={`${import.meta.env.BASE_URL}assets/official/super_admin_v2.png`} alt="Super Admin" style={{ position: "absolute", bottom: -8, left: "50%", transform: "translateX(-50%)", height: 20 }} />
              )}
              {viewingProfile.globalRole === "official" && !isSuperAdmin(viewingProfile) && (
                <img src={`${import.meta.env.BASE_URL}assets/official/official_badge_new.png`} alt="Official" style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)", height: 18 }} />
              )}
            </div>
            <div style={{ textAlign: "center", marginTop: 4 }}>
              <p style={{ fontSize: 18, fontWeight: 900 }}>{viewingProfile.name}</p>
              {isSuperAdmin(viewingProfile) && (
                <span className="super-admin-chat-tag" style={{ fontSize: 9, padding: "2px 10px", borderRadius: 8 }}>{"\u{1F451}"} SUPER ADMIN</span>
              )}
              {viewingProfile.globalRole === "official" && !isSuperAdmin(viewingProfile) && (
                <span className="official-chat-tag" style={{ fontSize: 9, padding: "2px 10px", borderRadius: 8 }}>{"\u{1F6E1}\uFE0F"} OFFICIAL</span>
              )}
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 4 }}>Level {viewingProfile.level} {"\u00B7"} {viewingProfile.xp} XP</p>
              {viewingProfile.bio && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.5 }}>{viewingProfile.bio}</p>}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.followers || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Followers</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.following || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Following</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{viewingProfile.friends || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Friends</p></div>
              <div style={{ textAlign: "center" }}><p style={{ fontSize: 16, fontWeight: 900 }}>{"\u{1F381}"} {viewingProfile.totalEarnings || 0}</p><p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>Gifts</p></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8, width: "100%" }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  await getOrCreateConversation(user.uid, user.name, user.avatar, viewingProfile!.uid, viewingProfile!.name, viewingProfile!.avatar);
                  setViewingProfile(null);
                  if (onMessage) onMessage(viewingProfile!.uid);
                } catch { showToast("Could not open chat", "error"); }
              }}>{"\u{1F4AC}"} Message</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  const isF = (user.followingList || []).includes(viewingProfile!.uid);
                  if (isF) { showToast("Already following!", "info"); }
                  else {
                    const res = await followUser(user.uid, viewingProfile!.uid);
                    showToast(res.isMutual ? "You're now friends!" : "Followed!", "success");
                  }
                } catch { showToast("Follow failed", "error"); }
              }}>{(user.followingList || []).includes(viewingProfile.uid) ? "\u2705 Following" : "\u2795 Follow"}</button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }} onClick={async () => {
                try {
                  await sendFriendRequest(user.uid, user.name, user.avatar, viewingProfile!.uid);
                  showToast("Friend request sent!", "success");
                } catch { showToast("Request failed", "error"); }
              }}>{"\u{1F91D}"} Add Friend</button>
            </div>
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

      {showAdminPanel && (
        <BottomSheet onClose={() => setShowAdminPanel(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#FFD700" }}>{"\u{1F6E1}\uFE0F"} Admin Panel</h2>
            <button onClick={() => setShowAdminPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div className="card" style={{ padding: 16, marginBottom: 14, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, color: "#FFD700" }}>{"\u{1F451}"} Official Promoter</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 10 }}>
                Enter a User ID to promote or demote as Official
              </p>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input
                  type="text"
                  value={adminPromoteId}
                  onChange={e => { setAdminPromoteId(e.target.value); setAdminLookupResult(null); }}
                  placeholder="Enter User ID..."
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 12, border: "1px solid rgba(255,215,0,0.2)",
                    background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: 13, fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                <button className="btn btn-sm" style={{ background: "rgba(255,215,0,0.15)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.3)", fontWeight: 700, padding: "8px 16px" }}
                  onClick={handleAdminLookup} disabled={adminLoading}>
                  {adminLoading ? "..." : "\u{1F50D}"}
                </button>
              </div>
              {adminLookupResult && (
                <div style={{
                  padding: 14, borderRadius: 14,
                  background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 22, fontSize: 22,
                      background: "rgba(108,92,231,0.12)",
                      border: adminLookupResult.globalRole === "official" ? "2px solid #FFD700" : "2px solid rgba(108,92,231,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {adminLookupResult.avatar?.startsWith("http")
                        ? <img src={adminLookupResult.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
                        : adminLookupResult.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminLookupResult.name}</p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontFamily: "monospace" }}>ID: {adminLookupResult.userId}</p>
                      <p style={{ fontSize: 10, color: adminLookupResult.globalRole === "official" ? "#FFD700" : "rgba(162,155,254,0.4)", fontWeight: 700, marginTop: 2 }}>
                        {adminLookupResult.globalRole === "official" ? "\u{1F6E1}\uFE0F Official" : "\u{1F464} Regular User"}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {adminLookupResult.globalRole !== "official" ? (
                      <button className="btn btn-full btn-sm" style={{
                        background: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,215,0,0.1))",
                        border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700", fontWeight: 800, padding: "10px 0",
                      }} onClick={handlePromoteOfficial} disabled={adminLoading}>
                        {adminLoading ? "Processing..." : "\u{1F451} Promote to Official"}
                      </button>
                    ) : (
                      <button className="btn btn-full btn-sm btn-danger" style={{ padding: "10px 0", fontWeight: 800 }}
                        onClick={handleDemoteOfficial} disabled={adminLoading}>
                        {adminLoading ? "Processing..." : "\u274C Remove Official"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8, color: "#FFD700" }}>{"\u{1F5BC}\uFE0F"} Frame Assigner</h3>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6 }}>
                Officials automatically receive a golden frame on their avatar.
                The frame <span style={{ color: "rgba(255,215,0,0.7)", fontFamily: "monospace" }}>official_frame.png</span> is assigned when promoted.
              </p>
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 12,
                background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.1)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 20,
                  border: "2.5px solid #FFD700",
                  boxShadow: "0 0 12px rgba(255,215,0,0.4), 0 0 24px rgba(255,215,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, background: "rgba(108,92,231,0.12)",
                }}>{"\u{1F464}"}</div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#FFD700" }}>Golden Frame Preview</p>
                  <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>Active on all Official avatars</p>
                </div>
              </div>
            </div>
          </div>
        </BottomSheet>
      )}

      {showStore && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500, background: "#0F0F1A",
          display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowStore(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 16, color: "#fff" }}>{"\u2039"}</button>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F6CD}\uFE0F"} Store</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,215,0,0.1)", padding: "6px 12px", borderRadius: 20, border: "1px solid rgba(255,215,0,0.2)" }}>
              <span style={{ fontSize: 14 }}>{"\u{1F48E}"}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>{user.coins.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 0, padding: "0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([["frame", "\u{1F5BC}\uFE0F", "Frames"], ["entry", "\u26A1", "Entry FX"], ["theme", "\u{1F3A8}", "Themes"]] as const).map(([cat, ico, label]) => (
              <button key={cat} onClick={() => setStoreCategory(cat)} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: storeCategory === cat ? "rgba(108,92,231,0.15)" : "transparent",
                borderBottom: storeCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
                color: storeCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              }}>{ico} {label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {STORE_ITEMS.filter(i => i.category === storeCategory).map(item => {
              const owned = !!(user.inventory && user.inventory[item.id]);
              const equipped = user.inventory?.[item.id]?.equipped;
              const rc = getRarityColor(item.rarity);
              return (
                <div key={item.id} style={{
                  borderRadius: 16, overflow: "hidden",
                  border: `1px solid ${rc}30`,
                  background: "rgba(255,255,255,0.03)",
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{
                    height: 90, background: item.preview,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 40, position: "relative",
                  }}>
                    {item.category === "frame" && (() => {
                      if (isPngFrame(item.id)) {
                        const pngPath = getPngFramePath(item.id);
                        return pngPath ? (
                          <div style={{ position: "relative", width: 60, height: 60 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(108,92,231,0.3)", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                            <img src={`${import.meta.env.BASE_URL}${pngPath}`} alt="" style={{ position: "absolute", inset: -4, width: "calc(100% + 8px)", height: "calc(100% + 8px)", objectFit: "contain", pointerEvents: "none" }} />
                          </div>
                        ) : null;
                      }
                      const fc = getFrameCssClass(item.id);
                      return fc ? (
                        <div style={{ position: "absolute", width: 56, height: 56, borderRadius: "50%" }}>
                          <div className={`store-frame-overlay ${fc}`} style={{ inset: -6, width: "calc(100% + 12px)", height: "calc(100% + 12px)" }} />
                          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "rgba(108,92,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                            {item.icon}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {item.category !== "frame" && item.icon}
                    <span style={{
                      position: "absolute", top: 6, right: 6, fontSize: 9, fontWeight: 800,
                      padding: "2px 8px", borderRadius: 8,
                      background: `${rc}20`, color: rc, border: `1px solid ${rc}40`,
                      textTransform: "uppercase",
                    }}>{item.rarity}</span>
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "#fff" }}>{item.name}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      {owned ? (
                        equipped ? (
                          <span style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>{"\u2705"} Equipped</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 600 }}>Owned</span>
                        )
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD700" }}>{"\u{1F48E}"} {item.price}</span>
                      )}
                      {!owned && (
                        <button onClick={() => handlePurchase(item)} disabled={storeLoading === item.id || user.coins < item.price}
                          style={{
                            padding: "6px 14px", borderRadius: 10, border: "none", cursor: user.coins < item.price ? "not-allowed" : "pointer",
                            background: user.coins < item.price ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #6C5CE7, #8B7CF6)",
                            color: "#fff", fontSize: 11, fontWeight: 800, fontFamily: "inherit",
                            opacity: user.coins < item.price ? 0.5 : 1,
                          }}>
                          {storeLoading === item.id ? "..." : "Buy"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showBackpack && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500, background: "#0F0F1A",
          display: "flex", flexDirection: "column", maxWidth: 430, margin: "0 auto",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => setShowBackpack(false)} style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)", cursor: "pointer", fontSize: 16, color: "#fff" }}>{"\u2039"}</button>
            <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F392}"} Backpack</h2>
            <div style={{ width: 36 }} />
          </div>

          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([["frame", "\u{1F5BC}\uFE0F", "Frames"], ["entry", "\u26A1", "Entry FX"], ["theme", "\u{1F3A8}", "Themes"]] as const).map(([cat, ico, label]) => (
              <button key={cat} onClick={() => setBackpackCategory(cat)} style={{
                flex: 1, padding: "14px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: backpackCategory === cat ? "rgba(108,92,231,0.15)" : "transparent",
                borderBottom: backpackCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
                color: backpackCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
                fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              }}>{ico} {label}</button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
            {(() => {
              const inv = user.inventory || {};
              const categoryItems = Object.values(inv).filter(o => {
                const si = getStoreItem(o.itemId);
                return si && si.category === backpackCategory;
              });
              if (categoryItems.length === 0) {
                return (
                  <div style={{ textAlign: "center", padding: "60px 20px" }}>
                    <span style={{ fontSize: 48, opacity: 0.3 }}>{"\u{1F4E6}"}</span>
                    <p style={{ fontSize: 14, color: "rgba(162,155,254,0.4)", marginTop: 12 }}>No items yet</p>
                    <button className="btn btn-primary btn-sm" style={{ marginTop: 12 }} onClick={() => { setShowBackpack(false); setShowStore(true); setStoreCategory(backpackCategory); }}>
                      Visit Store
                    </button>
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoryItems.map(owned => {
                    const item = getStoreItem(owned.itemId);
                    if (!item) return null;
                    const rc = getRarityColor(item.rarity);
                    return (
                      <div key={owned.itemId} style={{
                        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
                        borderRadius: 16,
                        background: owned.equipped ? "rgba(108,92,231,0.1)" : "rgba(255,255,255,0.03)",
                        border: owned.equipped ? `1.5px solid ${rc}50` : "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <div style={{
                          width: 52, height: 52, borderRadius: 14, background: item.preview,
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
                          border: `2px solid ${rc}40`,
                          boxShadow: owned.equipped ? `0 0 16px ${rc}30` : "none",
                          position: "relative", overflow: "visible",
                        }}>
                          {isPngFrame(item.id) ? (() => {
                            const pp = getPngFramePath(item.id);
                            return pp ? <img src={`${import.meta.env.BASE_URL}${pp}`} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : item.icon;
                          })() : item.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{item.name}</p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: rc, fontWeight: 700, textTransform: "uppercase" }}>{item.rarity}</span>
                            {owned.equipped && <span style={{ fontSize: 10, color: "#00e676", fontWeight: 700 }}>{"\u2022"} Active</span>}
                          </div>
                        </div>
                        {owned.equipped ? (
                          <button onClick={() => handleUnequip(owned.itemId)} disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px", borderRadius: 12, border: "1px solid rgba(255,100,130,0.3)", cursor: "pointer",
                              background: "rgba(255,100,130,0.1)", color: "#ff6482", fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                            }}>
                            {storeLoading === owned.itemId ? "..." : "Remove"}
                          </button>
                        ) : (
                          <button onClick={() => handleEquip(owned.itemId)} disabled={storeLoading === owned.itemId}
                            style={{
                              padding: "8px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                              background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)", color: "#fff",
                              fontSize: 12, fontWeight: 800, fontFamily: "inherit",
                              boxShadow: "0 0 12px rgba(108,92,231,0.3)",
                            }}>
                            {storeLoading === owned.itemId ? "..." : "Equip"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showOfficialRules && (
        <BottomSheet onClose={() => setShowOfficialRules(false)}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#00ffff" }}>{"\u{1F4DC}"} Official Guidelines</h2>
            <button onClick={() => setShowOfficialRules(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <img src={`${import.meta.env.BASE_URL}assets/official/official_tag.svg`} alt="Official" style={{ height: 28, filter: "drop-shadow(0 0 8px rgba(0,206,201,0.5)) drop-shadow(0 0 14px rgba(9,132,227,0.3))" }} />
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 8 }}>As an Official, you represent the app</p>
            </div>
            {[
              { icon: "\u{1F91D}", rule: "Be respectful to all users.", color: "#00e676" },
              { icon: "\u26A0\uFE0F", rule: "Do not abuse Kick/Mute powers.", color: "#ff9800" },
              { icon: "\u2696\uFE0F", rule: "Solve conflicts neutrally.", color: "#00bcd4" },
              { icon: "\u{1F4E2}", rule: "Report severe violations to Super Admin.", color: "#ff5252" },
              { icon: "\u{1F451}", rule: "Your frame and tag represent the app's reputation.", color: "#FFD700" },
            ].map((item, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", marginBottom: 8,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${item.color}08, ${item.color}04)`,
                border: `1px solid ${item.color}25`,
              }}>
                <span style={{ fontSize: 20, flexShrink: 0, filter: `drop-shadow(0 0 4px ${item.color}60)` }}>{item.icon}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", lineHeight: 1.5, letterSpacing: 0.2 }}>
                  {item.rule}
                </p>
              </div>
            ))}
            <div style={{
              marginTop: 16, padding: "14px 16px", borderRadius: 14, textAlign: "center",
              background: "rgba(0,255,255,0.04)", border: "1px solid rgba(0,255,255,0.12)",
            }}>
              <p style={{ fontSize: 11, color: "rgba(0,255,255,0.6)", fontWeight: 700, lineHeight: 1.6 }}>
                Violation of these rules may result in removal of Official status.
                Always act with integrity and fairness.
              </p>
            </div>
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
