import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FBUser, getRedirectResult, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { UserProfile, initUser, subscribeUser, setupOnlinePresence, claimDailyReward, isUserBanned, getBanTimeRemaining } from "./lib/userService";
import { Room } from "./lib/roomService";
import { subscribeConversations, Conversation } from "./lib/chatService";
import { Notification, subscribeNotifications } from "./lib/notificationService";
import { ToastProvider, useToast } from "./lib/toastContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import VoiceRoomPage from "./pages/VoiceRoomPage";
import ChatsPage from "./pages/ChatsPage";
import MomentPage from "./pages/MomentPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import NotificationPage from "./pages/NotificationPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import "./index.css";

type NavPage = "home" | "rooms" | "chats" | "moment" | "mine" | "notifications" | "search" | "explore";

const NAV = [
  { id: "home", icon: "\u{1F3E0}", label: "Home" },
  { id: "explore", icon: "\u{1F30C}", label: "Explore" },
  { id: "rooms", icon: "\u{1F3A4}", label: "Rooms" },
  { id: "chats", icon: "\u{1F4AC}", label: "Chats" },
  { id: "mine", icon: "\u{1F464}", label: "Mine" },
] as const;

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2200);
    const t2 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className={`splash-screen${fadeOut ? " splash-fade-out" : ""}`}>
      <div className="stars" />
      <div className="splash-content">
        <div className="splash-logo-ring">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Galaxy Voice Chat" className="splash-logo" />
        </div>
        <h1 className="splash-title">Galaxy Voice Chat</h1>
        <p className="splash-tagline">Find your voice, find your galaxy</p>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const [fbUser, setFbUser] = useState<FBUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<NavPage>("home");
  const [chatTargetUid, setChatTargetUid] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [pageKey, setPageKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [passwordPrompt, setPasswordPrompt] = useState<{ room: Room; pwd: string } | null>(null);
  const [chatActive, setChatActive] = useState(false);
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
    if (p !== "chats") { setChatTargetUid(null); setChatActive(false); }
    setPage(p);
    setPageKey(k => k + 1);
  };

  if (!authChecked) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, color: "rgba(162,155,254,0.7)" }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Galaxy Voice Chat" style={{ width: 64, height: 64, borderRadius: 18, animation: "float 2s ease-in-out infinite, logoGlow 3s ease-in-out infinite" }} />
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Loading Galaxy Voice Chat...</p>
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

  if (isUserBanned(profile)) {
    const banRemaining = getBanTimeRemaining(profile);
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(40,10,20,0.95), rgba(26,15,46,0.98))",
            border: "2px solid rgba(255,60,60,0.3)",
            borderRadius: 24,
            padding: "40px 28px",
            maxWidth: 360,
            width: "100%",
            boxShadow: "0 0 40px rgba(255,0,0,0.15), inset 0 0 60px rgba(255,0,0,0.05)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{"\u{1F6AB}"}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#ff4444", marginBottom: 8 }}>Account Suspended</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 20 }}>
              Your account has been suspended due to a violation of our community guidelines.
            </p>
            {banRemaining && (
              <div style={{
                background: "rgba(255,60,60,0.1)",
                border: "1px solid rgba(255,60,60,0.2)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <p style={{ fontSize: 11, color: "rgba(255,150,150,0.7)", marginBottom: 4 }}>Ban Duration</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ff6666" }}>{banRemaining}</p>
              </div>
            )}
            <button
              className="btn"
              onClick={() => { signOut(auth); }}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                background: "rgba(255,60,60,0.15)",
                border: "1px solid rgba(255,60,60,0.3)",
                color: "#ff6666",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >Sign Out</button>
          </div>
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
        <VoiceRoomPage roomId={activeRoom.id} user={profile} onLeave={() => { setActiveRoom(null); changePage("rooms"); }} enteredPassword={(activeRoom as any)._enteredPassword} onMessage={(uid) => { setActiveRoom(null); setChatTargetUid(uid); changePage("chats"); }} />
      </div>
    );
  }

  const joinRoom = (room: Room) => {
    if (room.password && room.password !== "" && room.hostId !== profile.uid && !(room.adminIds || []).includes(profile.uid)) {
      if ((room as any)._enteredPassword) {
        setActiveRoom(room);
      } else {
        setPasswordPrompt({ room, pwd: "" });
      }
    } else {
      setActiveRoom(room);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="stars" />
      <div className="app-container">
        {(page === "home" || page === "rooms" || (page === "chats" && !chatActive)) && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, maxWidth: 400, margin: "0 auto",
            zIndex: 100,
            display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
            background: "linear-gradient(180deg, rgba(8,4,24,0.98) 60%, transparent)",
          }}>
            <button onClick={() => changePage("search")} className="btn btn-ghost btn-sm" style={{
              width: 38, height: 38, padding: 0, borderRadius: 12, fontSize: 17,
            }}>{"\u{1F50D}"}</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => changePage("notifications")} className="btn btn-ghost btn-sm" style={{
              width: 38, height: 38, padding: 0, borderRadius: 12, fontSize: 17, position: "relative",
            }}>
              {"\u{1F514}"}
              {unreadNotifCount > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
                  background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, padding: "0 4px", border: "2px solid #0F0F1A",
                }}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
              )}
            </button>
          </div>
        )}

        <div key={pageKey} className="page-enter" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {page === "home" && <HomePage user={profile} onJoinRoom={joinRoom} />}
          {page === "explore" && <ExplorePage user={profile} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onNavigate={(p) => changePage(p as NavPage)} />}
          {page === "rooms" && <RoomsPage user={profile} onJoinRoom={joinRoom} />}
          {page === "chats" && <ChatsPage user={profile} initialChatUid={chatTargetUid} onChatActive={setChatActive} />}
          {page === "moment" && <MomentPage user={profile} onBack={() => changePage("explore")} />}
          {page === "notifications" && <NotificationPage user={profile} notifications={notifications} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onFollowBack={() => {}} />}
          {page === "search" && <SearchPage user={profile} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onBack={() => changePage("home")} />}
          {page === "mine" && (
            <ProfilePage
              user={profile}
              onUpdate={setProfile}
              onLogout={() => { setFbUser(null); setProfile(null); }}
              onEditProfile={() => setShowEdit(true)}
              onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }}
            />
          )}
        </div>
        <nav className="bottom-nav" style={{ display: chatActive ? "none" : undefined }}>
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => changePage(item.id as NavPage)}
            >
              <span className="nav-icon" style={{ position: "relative" }}>
                {item.icon}
                {item.id === "chats" && profile && <ChatBadge uid={profile.uid} />}
              </span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {passwordPrompt && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(5,1,18,0.85)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }} onClick={() => setPasswordPrompt(null)}>
            <div style={{
              width: 300, padding: 24, background: "rgba(15,15,26,0.95)", borderRadius: 20,
              border: "1px solid rgba(108,92,231,0.2)", animation: "popIn 0.2s ease",
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center", color: "#fff" }}>{"\u{1F512}"} Password Required</h3>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", textAlign: "center", marginBottom: 16 }}>
                Enter the password to join "{passwordPrompt.room.name}"
              </p>
              <input
                className="input-field"
                type="password"
                placeholder="Room password"
                value={passwordPrompt.pwd}
                onChange={e => setPasswordPrompt({ ...passwordPrompt, pwd: e.target.value })}
                onKeyDown={e => {
                  if (e.key === "Enter" && passwordPrompt.pwd.trim()) {
                    setActiveRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any);
                    setPasswordPrompt(null);
                  }
                }}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0" }} onClick={() => setPasswordPrompt(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: "10px 0" }}
                  disabled={!passwordPrompt.pwd.trim()}
                  onClick={() => {
                    setActiveRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any);
                    setPasswordPrompt(null);
                  }}>Join</button>
              </div>
            </div>
          </div>
        )}
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

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);

  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }

  return <AppInner />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
