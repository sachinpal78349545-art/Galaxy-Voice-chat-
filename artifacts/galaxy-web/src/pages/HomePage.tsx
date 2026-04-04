import React, { useState, useEffect } from "react";
import { storage, User, Room } from "../lib/storage";

interface Props {
  user: User;
  onJoinRoom: (room: Room) => void;
}

const FILTERS = ["Hot", "New", "Follow"] as const;
type Filter = typeof FILTERS[number];

export default function HomePage({ user, onJoinRoom }: Props) {
  const [filter, setFilter] = useState<Filter>("Hot");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    setRooms(storage.getRooms());
  }, []);

  const filtered = rooms.filter(r => {
    if (filter === "Hot") return r.listeners > 5;
    if (filter === "New") return Date.now() - r.createdAt < 7200000;
    return true;
  });

  const notifCount = 3;

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "60px 16px 12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "rgba(108,92,231,0.14)", border: "1px solid rgba(108,92,231,0.3)",
            borderRadius: 20, padding: "6px 10px",
          }}>
            <span>💎</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{user.coins}</span>
            <span style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>+</span>
          </div>
          <div style={{
            background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: 20, padding: "6px 10px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFD700" }}>LVL {user.level}</span>
          </div>
        </div>

        <h1 style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.3 }}>Galaxy Voice ✨</h1>

        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>
            🏆
          </button>
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>
              🔔
            </button>
            {notifCount > 0 && (
              <div style={{
                position: "absolute", top: -2, right: -2,
                width: 16, height: 16, borderRadius: 8,
                background: "#ff6482", border: "2px solid #0F0F1A",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 700,
              }}>{notifCount}</div>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px 4px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14, padding: "11px 14px",
        }}>
          <span style={{ opacity: 0.4 }}>🔍</span>
          <span style={{ color: "rgba(162,155,254,0.35)", fontSize: 13 }}>Search rooms, users...</span>
        </div>
      </div>

      {/* Filters + Live count */}
      <div style={{
        display: "flex", alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 16px", marginBottom: 2,
      }}>
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "none", border: "none", cursor: "pointer",
            padding: "10px 14px", fontFamily: "inherit",
            fontSize: 14, fontWeight: 700,
            color: filter === f ? "#A29BFE" : "rgba(162,155,254,0.4)",
            borderBottom: filter === f ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{f}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(0,230,118,0.1)", border: "1px solid rgba(0,230,118,0.22)",
          borderRadius: 20, padding: "5px 10px",
        }}>
          <div className="live-dot" style={{ animation: "pulse-glow 1.5s infinite" }} />
          <span style={{ color: "#00e676", fontSize: 11, fontWeight: 700 }}>
            {rooms.filter(r => r.isLive).length} Rooms Live
          </span>
        </div>
      </div>

      {/* Room cards */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {filtered.map(room => (
          <RoomCard key={room.id} room={room} user={user} onJoin={() => onJoinRoom(room)} />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "rgba(162,155,254,0.4)" }}>
            <div style={{ fontSize: 40 }}>🌌</div>
            <p style={{ marginTop: 8 }}>No rooms yet. Create one!</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, user, onJoin }: { room: Room; user: User; onJoin: () => void }) {
  const occupiedSeats = room.seats.filter(s => s.userId !== null);

  return (
    <div className="card card-glow anim-slide-up" style={{ padding: 16, cursor: "pointer" }} onClick={onJoin}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
            {room.isLive && (
              <span className="badge badge-live" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span className="live-dot" />LIVE
              </span>
            )}
            <span className="badge badge-accent">{room.topic}</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 2, letterSpacing: -0.3 }}>{room.name}</h3>
          <p style={{ fontSize: 12, color: "rgba(162,155,254,0.45)" }}>hosted by {room.host}</p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          style={{
            background: "rgba(108,92,231,0.18)", border: "1px solid rgba(108,92,231,0.4)",
            color: "#A29BFE", borderRadius: 20, display: "flex", alignItems: "center", gap: 3,
          }}
          onClick={e => { e.stopPropagation(); onJoin(); }}
        >
          Join <span>›</span>
        </button>
      </div>

      {/* Speaker avatars */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
        {room.seats.map((seat, i) => (
          <div key={i} className={seat.isSpeaking ? "" : ""} style={{
            width: 36, height: 36, borderRadius: 18,
            background: seat.userId ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
            border: seat.userId ? "1.5px solid rgba(108,92,231,0.3)" : "1.5px dashed rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
            boxShadow: seat.isSpeaking ? "0 0 10px rgba(0,230,118,0.4)" : "none",
            transition: "box-shadow 0.3s",
          }}>
            {seat.isLocked ? "🔒" : seat.userId ? seat.avatar : (
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.18)" }}>+</span>
            )}
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 16 }}>
        <span style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
          🎙 {occupiedSeats.length}/{room.seats.length} speakers
        </span>
        <span style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
          🎧 {room.listeners} listening
        </span>
      </div>
    </div>
  );
}
