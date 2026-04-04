import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/userService";
import { storage, Room } from "../lib/storage";

interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; }

type Tab = "Hot" | "New" | "Follow";

const FAKE_USERS_ONLINE = [
  { name: "StarGazer", avatar: "🌟" }, { name: "CosmicDJ", avatar: "🎵" },
  { name: "LunaRose",  avatar: "🌙" }, { name: "NightOwl", avatar: "🦉" },
  { name: "VoidWalk",  avatar: "🌌" }, { name: "NebulaDev", avatar: "💻" },
  { name: "RocketX",   avatar: "🚀" }, { name: "ArcKnight", avatar: "⚡" },
];

export default function HomePage({ user, onJoinRoom }: Props) {
  const [tab, setTab] = useState<Tab>("Hot");
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => { setRooms(storage.getRooms()); }, []);

  const filtered = rooms.filter(r => {
    if (tab === "Hot") return r.listeners > 5;
    if (tab === "New") return Date.now() - r.createdAt < 7200000;
    return true;
  });

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ padding: "54px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: 20, padding: "6px 10px" }}>
            <span>💎</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{user.coins}</span>
          </div>
          <div style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.28)", borderRadius: 20, padding: "6px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFD700" }}>Lv.{user.level}</span>
          </div>
        </div>

        <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.3, color: "#A29BFE" }}>ChaloTalk ✨</h1>

        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 35, height: 35, padding: 0, borderRadius: 11, fontSize: 16 }}>🔔</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 35, height: 35, padding: 0, borderRadius: 11, fontSize: 16 }}>🔍</button>
        </div>
      </div>

      {/* Online strip */}
      <div style={{ padding: "0 16px 10px", display: "flex", gap: 12, overflowX: "auto" }}>
        {FAKE_USERS_ONLINE.map(u => (
          <div key={u.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <div style={{
                width: 46, height: 46, borderRadius: 23, fontSize: 22,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{u.avatar}</div>
              <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, background: "#00e676", border: "1.5px solid #0F0F1A" }} />
            </div>
            <span style={{ fontSize: 9, color: "rgba(162,155,254,0.5)", width: 46, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
          </div>
        ))}
      </div>

      {/* Tabs + live badge */}
      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 16px" }}>
        {(["Hot","New","Follow"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 14px",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: tab === t ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="badge badge-live" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="live-dot" />
          <span>{rooms.filter(r=>r.isLive).length} Live</span>
        </div>
      </div>

      {/* Room cards */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map(room => <RoomCard key={room.id} room={room} onJoin={() => onJoinRoom(room)} />)}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(162,155,254,0.3)" }}>
            <div style={{ fontSize: 48 }}>🌌</div>
            <p style={{ marginTop: 10, fontWeight: 600 }}>No rooms in this tab yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: Room; onJoin: () => void }) {
  const occupied = room.seats.filter(s => s.userId);
  return (
    <div className="card card-glow" style={{ cursor: "pointer" }} onClick={onJoin}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 7, flexWrap: "wrap" }}>
            {room.isLive && <span className="badge badge-live"><span className="live-dot"/>LIVE</span>}
            <span className="badge badge-accent">{room.category}</span>
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{room.name}</h3>
          <p style={{ fontSize: 12, color: "rgba(162,155,254,0.45)", marginBottom: 10 }}>by {room.host}</p>
          {/* Speaker avatars */}
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            {room.seats.map((s, i) => (
              <div key={i} style={{
                width: 32, height: 32, borderRadius: 16, fontSize: 16,
                background: s.userId ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                border: s.isSpeaking ? "1.5px solid rgba(0,230,118,0.6)" : s.userId ? "1.5px solid rgba(108,92,231,0.3)" : "1.5px dashed rgba(255,255,255,0.09)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: s.isSpeaking ? "0 0 8px rgba(0,230,118,0.3)" : "none",
              }}>
                {s.isLocked ? "🔒" : s.userId ? s.avatar : <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>+</span>}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(162,155,254,0.45)" }}>🎙 {occupied.length}/{room.seats.length}</span>
            <span style={{ fontSize: 12, color: "rgba(162,155,254,0.45)" }}>🎧 {room.listeners}</span>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.4)", color: "#A29BFE", flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onJoin(); }}
        >Join ›</button>
      </div>
    </div>
  );
}
