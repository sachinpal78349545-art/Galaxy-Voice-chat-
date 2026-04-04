import { useState, useEffect } from "react";
import { storage, User, Room } from "./lib/storage";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import VoiceRoomPage from "./pages/VoiceRoomPage";
import ChatsPage from "./pages/ChatsPage";
import ProfilePage from "./pages/ProfilePage";
import "./index.css";

type NavPage = "home" | "rooms" | "chats" | "profile";

const NAV = [
  { id: "home",    icon: "🏠", label: "Home"    },
  { id: "rooms",   icon: "🎤", label: "Rooms"   },
  { id: "chats",   icon: "💬", label: "Chats"   },
  { id: "profile", icon: "👤", label: "Profile" },
] as const;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<NavPage>("home");
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);

  useEffect(() => {
    setUser(storage.getCurrentUser());
  }, []);

  const joinRoom = (room: Room) => setActiveRoom(room);
  const leaveRoom = () => { setActiveRoom(null); setPage("rooms"); };

  if (!user) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container">
          <AuthPage onLogin={u => setUser(u)} />
        </div>
      </div>
    );
  }

  if (activeRoom) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <VoiceRoomPage room={activeRoom} user={user} onLeave={leaveRoom} />
      </div>
    );
  }

  return (
    <div className="app-wrapper">
      <div className="stars" />
      <div className="app-container">
        {page === "home"    && <HomePage    user={user} onJoinRoom={joinRoom} />}
        {page === "rooms"   && <RoomsPage   user={user} onJoinRoom={joinRoom} />}
        {page === "chats"   && <ChatsPage   user={user} />}
        {page === "profile" && <ProfilePage user={user} onLogout={() => setUser(null)} onUpdate={u => setUser(u)} />}

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
