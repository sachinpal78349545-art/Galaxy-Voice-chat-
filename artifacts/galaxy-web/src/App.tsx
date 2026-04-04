import { useState, useEffect } from "react";
import { onAuthStateChanged, User as FBUser, getRedirectResult } from "firebase/auth";
import { auth } from "./lib/firebase";
import { UserProfile, initUser, subscribeUser } from "./lib/userService";
import { storage, Room } from "./lib/storage";
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
  { id: "home",    icon: "🏠", label: "Home"    },
  { id: "rooms",   icon: "🎤", label: "Rooms"   },
  { id: "chats",   icon: "💬", label: "Chats"   },
  { id: "profile", icon: "👤", label: "Profile" },
] as const;

export default function App() {
  const [fbUser, setFbUser] = useState<FBUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<NavPage>("home");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Handle Google redirect result
  useEffect(() => {
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        const u = result.user;
        initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "🌌")
          .then(p => setProfile(p));
      }
    }).catch(console.error);
  }, []);

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      setFbUser(u);
      setAuthChecked(true);
      if (u) {
        const p = await initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "🌌");
        setProfile(p);
        // Subscribe to realtime updates
        subscribeUser(u.uid, up => { if (up) setProfile(up); });
      } else {
        setProfile(null);
      }
    });
    return unsub;
  }, []);

  // Loading spinner
  if (!authChecked) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, color: "rgba(162,155,254,0.7)" }}>
          <div style={{ fontSize: 56, animation: "float 2s ease-in-out infinite" }}>🌌</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Loading ChaloTalk...</p>
        </div>
      </div>
    );
  }

  // Not logged in
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

  // Edit profile (full screen)
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

  // Voice room (full screen)
  if (activeRoom) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <VoiceRoomPage room={activeRoom} user={profile} onLeave={() => { setActiveRoom(null); setPage("rooms"); }} />
      </div>
    );
  }

  const joinRoom = (room: Room) => setActiveRoom(room);

  return (
    <div className="app-wrapper">
      <div className="stars" />
      <div className="app-container">
        {page === "home"    && <HomePage    user={profile} onJoinRoom={joinRoom} />}
        {page === "rooms"   && <RoomsPage   user={profile} onJoinRoom={joinRoom} />}
        {page === "chats"   && <ChatsPage   user={profile} />}
        {page === "profile" && (
          <ProfilePage
            user={profile}
            onUpdate={setProfile}
            onLogout={() => { setFbUser(null); setProfile(null); }}
            onEditProfile={() => setShowEdit(true)}
          />
        )}

        {/* Bottom Navigation */}
        <nav className="bottom-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => setPage(item.id as NavPage)}
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
