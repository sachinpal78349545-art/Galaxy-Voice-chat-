import React, { useState, useEffect } from "react";
import { storage, User, Room } from "../lib/storage";

interface Props { user: User; onJoinRoom: (room: Room) => void; }

const FILTERS = ["All", "Hot", "New"] as const;
type Filter = typeof FILTERS[number];

export default function RoomsPage({ user, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomTopic, setRoomTopic] = useState("Chill");

  useEffect(() => { setRooms(storage.getRooms()); }, []);

  const filtered = rooms.filter(r => {
    if (filter === "Hot") return r.listeners > 10;
    if (filter === "New") return Date.now() - r.createdAt < 3600000;
    return true;
  });

  const createRoom = () => {
    if (!roomName.trim()) return;
    const room = storage.createRoom(user.id, user.username, user.avatar, roomName, roomTopic);
    setRooms(storage.getRooms());
    setShowCreate(false);
    setRoomName("");
    onJoinRoom(room);
  };

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 16px 10px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Voice Rooms 🎤</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
          ＋ Create
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 16px" }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 16px", fontFamily: "inherit",
            fontSize: 14, fontWeight: 700,
            color: filter === f ? "#A29BFE" : "rgba(162,155,254,0.4)",
            borderBottom: filter === f ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{f}</button>
        ))}
      </div>

      {/* Room list */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(room => (
          <div key={room.id} className="card card-glow" style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14,
                background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                {room.seats[0]?.avatar || "🎤"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{room.name}</span>
                  {room.isLive && (
                    <span className="badge badge-live" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="live-dot" />LIVE
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 6 }}>by {room.host}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className="badge badge-accent" style={{ fontSize: 10 }}>{room.topic}</span>
                  <span style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>
                    🎙 {room.seats.filter(s=>s.userId).length}/{room.seats.length}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>
                    🎧 {room.listeners}
                  </span>
                </div>
              </div>
              <button
                className="btn btn-sm"
                style={{
                  background: "rgba(108,92,231,0.18)", border: "1px solid rgba(108,92,231,0.4)",
                  color: "#A29BFE", flexShrink: 0, display: "flex", alignItems: "center", gap: 2,
                }}
                onClick={() => onJoinRoom(room)}
              >
                Join ›
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create room modal */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.8)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 200, backdropFilter: "blur(8px)",
        }} onClick={() => setShowCreate(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Create Voice Room 🎤</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input className="input-field" placeholder="Room Name" value={roomName}
                onChange={e => setRoomName(e.target.value)} />
              <select className="input-field" value={roomTopic} onChange={e => setRoomTopic(e.target.value)}>
                {["Chill", "Music", "Talk", "Gaming", "Comedy", "Study", "News"].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button className="btn btn-primary btn-full" style={{ padding: "13px 0" }} onClick={createRoom}>
                🚀 Create & Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
