import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FBUser, getRedirectResult } from "firebase/auth";
import { auth } from "./lib/firebase";
import { UserProfile, initUser, subscribeUser, setupOnlinePresence, claimDailyReward } from "./lib/userService";
import { seedRoomsIfEmpty, Room } from "./lib/roomService";
import { seedConversations, subscribeConversations, Conversation } from "./lib/chatService";
import { Notification, subscribeNotifications, markNotificationRead, markAllNotificationsRead } from "./lib/notificationService";
import { ToastProvider, useToast } from "./lib/toastContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import VoiceRoomPage from "./pages/VoiceRoomPage";
import ChatsPage from "./pages/ChatsPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import "./index.css";

type NavPage = "home" | "rooms" | "chats" | "profile";

const NAV = [
  { id: "home", icon: "\u{1F3E0}", label: "Home" },
  { id: "rooms", icon: "\u{1F3A4}", label: "Rooms" },
  { id: "chats", icon: "\u{1F4AC}", label: "Chats" },
  { id: "profile", icon: "\u{1F464}", label: "Profile" },
] as const;

function AppContent() {
  const [fbUser, setFbUser] = useState<FBUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<NavPage>("home");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const presenceCleanup = useRef<(() => void) | null>(null);
  const userSubCleanup = useRef<(() => void) | null>(null);
  const notifSubCleanup = useRef<(() => void) | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        const u = result.user;
        initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "\u{1F30C}")
          .then(p => setProfile(p));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setFbUser(u);
      setAuthChecked(true);
      if (u) {
        try {
          const p = await initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "\u{1F30C}");
          setProfile(p);
          userSubCleanup.current?.();
          userSubCleanup.current = subscribeUser(u.uid, up => { if (up) setProfile(up); });
          presenceCleanup.current = setupOnlinePresence(u.uid);
          notifSubCleanup.current = subscribeNotifications(u.uid, setNotifications);
          await seedRoomsIfEmpty();
          await seedConversations(u.uid, p.name, p.avatar);

          const reward = await claimDailyReward(u.uid, p);
          if (reward) {
            showToast(`Daily reward: +${reward.coins} coins! (Day ${reward.streak} streak)`, "success", "\u{1F381}");
          }
        } catch (err) {
          console.error("Init error:", err);
          showToast("Connection error. Some features may be limited.", "error");
        }
      } else {
        setProfile(null);
        userSubCleanup.current?.();
        userSubCleanup.current = null;
        presenceCleanup.current?.();
        notifSubCleanup.current?.();
        notifSubCleanup.current = null;
      }
    });
    return () => {
      unsub();
      userSubCleanup.current?.();
      presenceCleanup.current?.();
      notifSubCleanup.current?.();
    };
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const changePage = (p: NavPage) => {
    setPage(p);
    setPageKey(k => k + 1);
  };

  const handleMarkAllRead = async () => {
    if (profile) {
      await markAllNotificationsRead(profile.uid);
    }
  };

  if (!authChecked) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, color: "rgba(162,155,254,0.7)" }}>
          <div style={{ fontSize: 56, animation: "float 2s ease-in-out infinite" }}>{"\u{1F30C}"}</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Loading ChaloTalk...</p>
        </div>
      </div>
    );
  }

  if (!fbUser || !profile) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container">
          <AuthPage onDone={() => {}} />
        </div>
      </div>
    );
  }

  if (showEdit) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container">
          <EditProfilePage user={profile} onUpdate={setProfile} onBack={() => setShowEdit(false)} />
        </div>
      </div>
    );
  }

  if (activeRoom) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <VoiceRoomPage roomId={activeRoom.id} user={profile} onLeave={() => { setActiveRoom(null); changePage("rooms"); }} />
      </div>
    );
  }

  const joinRoom = (room: Room) => setActiveRoom(room);

  return (
    <div className="app-wrapper">
      <div className="stars" />
      <div className="app-container">
        {page === "home" && (
          <div style={{ position: "absolute", top: 54, right: 56, zIndex: 100 }}>
            <button onClick={() => setShowNotifs(!showNotifs)} className="btn btn-ghost btn-sm" style={{ width: 35, height: 35, padding: 0, borderRadius: 11, fontSize: 16, position: "relative" }}>
              {"\u{1F514}"}
              {unreadNotifCount > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8,
                  background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, padding: "0 3px", border: "1.5px solid #0F0F1A",
                }}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
              )}
            </button>
          </div>
        )}

        {showNotifs && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
            display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 500, paddingTop: 80,
          }} onClick={() => setShowNotifs(false)}>
            <div className="card" style={{
              width: "92%", maxWidth: 380, maxHeight: "70vh", display: "flex", flexDirection: "column",
              padding: 20, animation: "slide-up 0.2s ease",
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
                <h3 style={{ fontSize: 16, fontWeight: 900 }}>{"\u{1F514}"} Notifications</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {unreadNotifCount > 0 && (
                    <button onClick={handleMarkAllRead} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "4px 10px" }}>Mark all read</button>
                  )}
                  <button onClick={() => setShowNotifs(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
                </div>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {notifications.length === 0 ? (
                  <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32, fontSize: 13 }}>No notifications yet</p>
                ) : (
                  notifications.slice(0, 30).map(n => (
                    <div key={n.id} onClick={() => { if (!n.read && profile) markNotificationRead(profile.uid, n.id); }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 4px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
                        background: n.read ? "none" : "rgba(108,92,231,0.06)",
                        borderRadius: 8,
                      }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{n.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: n.read ? "rgba(255,255,255,0.6)" : "#fff" }}>{n.title}</p>
                        <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>{n.body}</p>
                        <p style={{ fontSize: 9, color: "rgba(162,155,254,0.25)", marginTop: 3 }}>{formatTimeAgo(n.timestamp)}</p>
                      </div>
                      {!n.read && (
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: "#6C5CE7", flexShrink: 0, marginTop: 6 }} />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        <div key={pageKey} className="page-enter" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {page === "home" && <HomePage user={profile} onJoinRoom={joinRoom} />}
          {page === "rooms" && <RoomsPage user={profile} onJoinRoom={joinRoom} />}
          {page === "chats" && <ChatsPage user={profile} />}
          {page === "profile" && (
            <ProfilePage
              user={profile}
              onUpdate={setProfile}
              onLogout={() => { setFbUser(null); setProfile(null); }}
              onEditProfile={() => setShowEdit(true)}
            />
          )}
        </div>
        <nav className="bottom-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => changePage(item.id as NavPage)}
            >
              <span className="nav-icon" style={{ position: "relative" }}>
                {item.icon}
                {item.id === "chats" && profile && (
                  <ChatBadge uid={profile.uid} />
                )}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ChatBadge({ uid }: { uid: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = subscribeConversations(uid, (convs: Conversation[]) => {
      const total = convs.reduce((sum: number, c) => sum + ((c.unread || {})[uid] || 0), 0);
      setCount(total);
    });
    return unsub;
  }, [uid]);
  if (count <= 0) return null;
  return (
    <span style={{
      position: "absolute", top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7,
      background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 8, fontWeight: 800, padding: "0 3px", border: "1.5px solid #0F0F1A",
    }}>{count > 9 ? "9+" : count}</span>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
