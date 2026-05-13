import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { UserProfile, isSuperAdmin, getCurrentLanguage } from "../lib/userService";

interface Props {
  user: UserProfile;
  onLogout: () => void;
  onEditProfile: () => void;
  onClose: () => void;
  onNavigateToBlocked: () => void;
  onNavigateToPrivacy: () => void;
  onNavigateToLanguage: () => void;
  onNavigateToWallet: () => void;
  onNavigateToStore: () => void;
  onNavigateToDailyTasks: () => void;
  onNavigateToBackpack: () => void;
  onNavigateToFamily: () => void;
  onNavigateToFriendRequests: () => void;
  onNavigateToFriendsList: () => void;
  onNavigateToSearch: () => void;
  onNavigateToDailyReward: () => void;
  onNavigateToAchievements: () => void;
  onNavigateToHelp: () => void;
  onNavigateToFeedback: () => void;
  onNavigateToReport: () => void;
  onNavigateToAdmin?: () => void;
  onNavigateToOfficialRules?: () => void;
  onNavigateToRechargeApprovals?: () => void;
  onNavigateToGodMode?: () => void;
  onNavigateToReportQueue?: () => void;
  friendRequestsCount?: number;   // 👈 नया prop
}

export default function SettingsPage({
  user,
  onLogout,
  onEditProfile,
  onClose,
  onNavigateToBlocked,
  onNavigateToPrivacy,
  onNavigateToLanguage,
  onNavigateToWallet,
  onNavigateToStore,
  onNavigateToDailyTasks,
  onNavigateToBackpack,
  onNavigateToFamily,
  onNavigateToFriendRequests,
  onNavigateToFriendsList,
  onNavigateToSearch,
  onNavigateToDailyReward,
  onNavigateToAchievements,
  onNavigateToHelp,
  onNavigateToFeedback,
  onNavigateToReport,
  onNavigateToAdmin,
  onNavigateToOfficialRules,
  onNavigateToRechargeApprovals,
  onNavigateToGodMode,
  onNavigateToReportQueue,
  friendRequestsCount = 0,   // default 0
}: Props) {
  const isAdmin = isSuperAdmin(user);
  const currentLang = getCurrentLanguage();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {}
    onLogout();
  };

  const SettingItem = ({ icon, label, desc, onClick, badge }: any) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        transition: "0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168,85,247,0.1)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
    >
      <span style={{ fontSize: 26 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#fff", margin: 0 }}>{label}</p>
        <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", margin: 0 }}>{desc}</p>
      </div>
      {badge ? <span style={{ background: "#a855f7", padding: "2px 8px", borderRadius: 20, fontSize: 12 }}>{badge}</span> : null}
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 20 }}>›</span>
    </button>
  );

  return (
    <div className="page-scroll" style={{ background: "#0a0820", minHeight: "100vh", paddingBottom: 40 }}>
      <div style={{ padding: "50px 16px 20px" }}>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            fontSize: 24,
            cursor: "pointer",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ← Back to Profile
        </button>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 24, background: "linear-gradient(135deg,#fff,#a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          ⚙️ Settings
        </h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SettingItem icon="✏️" label="Edit Profile" desc="Change name, avatar & bio" onClick={onEditProfile} />
          <SettingItem icon="🌍" label="Language" desc={currentLang.toUpperCase()} onClick={onNavigateToLanguage} />
          <SettingItem icon="🔒" label="Privacy & Settings" desc="Control visibility & notifications" onClick={onNavigateToPrivacy} />
          <SettingItem icon="🚫" label="Blocked Users" desc={`${(user.blockedList || []).length} blocked users`} onClick={onNavigateToBlocked} />
          <SettingItem icon="💰" label="Wallet" desc={`${user.coins.toLocaleString()} coins`} onClick={onNavigateToWallet} />
          <SettingItem icon="🛍️" label="Store" desc="Frames, entry effects & themes" onClick={onNavigateToStore} />
          <SettingItem icon="✅" label="Daily Tasks" desc="Earn coins by completing tasks" onClick={onNavigateToDailyTasks} />
          <SettingItem icon="🎒" label="Backpack" desc="Your owned items" onClick={onNavigateToBackpack} />
          <SettingItem icon="👪" label="Family" desc="Join or create a family" onClick={onNavigateToFamily} />
          <SettingItem icon="🤝" label="Friend Requests" desc="Pending requests" onClick={onNavigateToFriendRequests} badge={friendRequestsCount} />
          <SettingItem icon="👥" label="Friends List" desc={`${user.friends || 0} friends`} onClick={onNavigateToFriendsList} />
          <SettingItem icon="🔍" label="Find Users" desc="Search by name or ID" onClick={onNavigateToSearch} />
          <SettingItem icon="🎁" label="Daily Reward" desc="Claim daily bonus" onClick={onNavigateToDailyReward} />
          <SettingItem icon="🏆" label="Achievements" desc="Track your progress" onClick={onNavigateToAchievements} />
          <SettingItem icon="❓" label="Help Center" desc="FAQs & guides" onClick={onNavigateToHelp} />
          <SettingItem icon="💬" label="Feedback" desc="Send us suggestions" onClick={onNavigateToFeedback} />
          <SettingItem icon="⚠️" label="Report a Problem" desc="Report issues" onClick={onNavigateToReport} />
        </div>

        {(user.globalRole === "official" || isAdmin) && (
          <>
            <div style={{ height: 1, background: "rgba(255,215,0,0.2)", margin: "30px 0 20px" }} />
            <p style={{ fontSize: 14, fontWeight: 800, color: "#FFD700", marginBottom: 12 }}>👑 Administration</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(user.globalRole === "official" || isAdmin) && (
                <SettingItem icon="📜" label="Official Guidelines" desc="Rules for officials" onClick={onNavigateToOfficialRules!} />
              )}
              {isAdmin && (
                <>
                  <SettingItem icon="🛡️" label="Admin Panel" desc="User management & promotions" onClick={onNavigateToAdmin!} />
                  <SettingItem icon="💳" label="Recharge Approvals" desc="Approve UPI recharge requests" onClick={onNavigateToRechargeApprovals!} />
                  <SettingItem icon="⚡" label="God Mode" desc="Super admin tools" onClick={onNavigateToGodMode!} />
                  <SettingItem icon="📋" label="Report Queue" desc="Review user reports" onClick={onNavigateToReportQueue!} />
                </>
              )}
            </div>
          </>
        )}

        <div style={{ height: 1, background: "rgba(255,100,130,0.1)", margin: "30px 0 20px" }} />
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 40,
            background: "rgba(255,60,60,0.1)",
            border: "1px solid rgba(255,60,60,0.3)",
            color: "#ff6482",
            fontWeight: 700,
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          🚪 Log Out
        </button>
      </div>
    </div>
  );
}