import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/userService";
import { Room, subscribeRooms, createRoom } from "../lib/roomService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; onJoinRoom: (r: Room) => void; }

export default function RoomsPage({ user, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Hot" | "New">("All");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("Chill");
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = subscribeRooms(r => { setRooms(r); setLoading(false); });
    return unsub;
  }, []);

  const filtered = rooms.filter(r => {
    if (filter === "Hot") return r.listeners > 10;
    if (filter === "New") return Date.now() - r.createdAt < 3600000;
    return true;
  });

  const handleCreate = async () => {
    if (!name.trim()) { showToast("Please enter a room name", "warning"); return; }
    setCreating(true);
    try {
      const room = await createRoom(user.uid, user.name, user.avatar, name.trim(), topic);
      showToast("Room created! Joining now...", "success", "\u{1F680}");
      setShowCreate(false);
      setName("");
      onJoinRoom(room);
    } catch (err) {
      showToast("Failed to create room. Try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 10px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Rooms {"\u{1F3A4}"}</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>{"\uFF0B"} Create</button>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 16px" }}>
        {(["All", "Hot", "New"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 16px",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            color: filter === f ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: filter === f ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton skeleton-text" style={{ width: "60%" }} />
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              </div>
            </div>
          ))
        ) : (
          filtered.map((room, i) => (
            <div key={room.id} style={{ animation: `slide-up 0.25s ease ${i * 0.04}s both` }} className="card card-glow" onClick={() => onJoinRoom(room)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0", cursor: "pointer" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, fontSize: 24,
                  background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{room.coverEmoji || room.seats[0]?.avatar || "\u{1F3A4}"}</div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{room.name}</span>
                    {room.isLive && <span className="badge badge-live"><span className="live-dot"/>LIVE</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginBottom: 4 }}>by {room.host}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge badge-accent" style={{ fontSize: 10 }}>{room.topic}</span>
                    <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{"\u{1F399}"} {room.seats.filter(s => s.userId).length}/{room.seats.length}</span>
                    <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{"\u{1F3A7}"} {room.listeners}</span>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.4)", color: "#A29BFE", flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); onJoinRoom(room); }}
                >Join {"\u203A"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
        }} onClick={() => !creating && setShowCreate(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0", padding: 24,
            animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 20 }}>Create Voice Room {"\u{1F3A4}"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input-field" placeholder="Room name (e.g. Chill Vibes)" value={name} onChange={e => setName(e.target.value)} disabled={creating} />
              <select className="input-field" value={topic} onChange={e => setTopic(e.target.value)} disabled={creating}>
                {["Chill", "Music", "Talk", "Gaming", "Comedy", "Study", "Debate", "News", "Sports"].map(t => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-full" style={{ padding: "14px 0" }} onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 8, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                    Creating...
                  </div>
                ) : (
                  <>{"\u{1F680}"} Create & Join</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
