import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FBUser, getRedirectResult } from "firebase/auth";
import { auth } from "./lib/firebase";
import { UserProfile, initUser, subscribeUser, setupOnlinePresence, claimDailyReward } from "./lib/userService";
import { seedRoomsIfEmpty, Room } from "./lib/roomService";
import { seedConversations } from "./lib/chatService";
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
  const presenceCleanup = useRef<(() => void) | null>(null);
  const userSubCleanup = useRef<(() => void) | null>(null);
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
      }
    });
    return () => {
      unsub();
      userSubCleanup.current?.();
      presenceCleanup.current?.();
    };
  }, []);

  const changePage = (p: NavPage) => {
    setPage(p);
    setPageKey(k => k + 1);
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
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
