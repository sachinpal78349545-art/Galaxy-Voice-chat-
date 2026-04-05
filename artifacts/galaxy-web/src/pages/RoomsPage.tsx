import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/userService";
import { Room, ROOM_AVATARS, subscribeRooms, createRoom } from "../lib/roomService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; onJoinRoom: (r: Room) => void; }

const CATEGORIES = ["Chill", "Music", "Talk", "Gaming", "Comedy", "Study", "Debate", "News", "Sports"];

export default function RoomsPage({ user, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Hot" | "New">("All");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("Chill");
  const [creating, setCreating] = useState(false);
  const [roomPrivacy, setRoomPrivacy] = useState<"public" | "private" | "password">("public");
  const [roomPassword, setRoomPassword] = useState("");
  const [roomAvatar, setRoomAvatar] = useState("");
  const [micPerm, setMicPerm] = useState<"all" | "request" | "admin_only">("all");
  const [passwordPrompt, setPasswordPrompt] = useState<{ room: Room; pwd: string } | null>(null);
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
    if (roomPrivacy === "password" && !roomPassword.trim()) { showToast("Please set a password", "warning"); return; }
    setCreating(true);
    try {
      const room = await createRoom(user.uid, user.name, user.avatar, name.trim(), topic, {
        isPrivate: roomPrivacy === "private",
        password: roomPrivacy === "password" ? roomPassword.trim() : undefined,
        roomAvatar: roomAvatar || undefined,
        micPermission: micPerm,
      });
      showToast("Room created! Joining now...", "success", "\u{1F680}");
      setShowCreate(false);
      setName("");
      setRoomPassword("");
      setRoomPrivacy("public");
      setRoomAvatar("");
      setMicPerm("all");
      onJoinRoom(room);
    } catch (err) {
      showToast("Failed to create room. Try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = (room: Room) => {
    if (room.password && room.password !== "" && room.hostId !== user.uid && !(room.adminIds || []).includes(user.uid)) {
      setPasswordPrompt({ room, pwd: "" });
    } else {
      onJoinRoom(room);
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
            <div key={room.id} style={{ animation: `slide-up 0.25s ease ${i * 0.04}s both` }} className="card card-glow" onClick={() => handleJoinRoom(room)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0", cursor: "pointer" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, fontSize: 24,
                  background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{room.roomAvatar || room.coverEmoji || "\u{1F3A4}"}</div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{room.name}</span>
                    {room.isLive && <span className="badge badge-live"><span className="live-dot"/>LIVE</span>}
                    {room.password && <span style={{ fontSize: 10, color: "rgba(255,215,0,0.6)" }}>{"\u{1F512}"}</span>}
                    {room.isPrivate && !room.password && <span style={{ fontSize: 10, color: "rgba(255,100,130,0.6)" }}>{"\u{1F510}"}</span>}
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
                  onClick={e => { e.stopPropagation(); handleJoinRoom(room); }}
                >Join {"\u203A"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      {passwordPrompt && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => setPasswordPrompt(null)}>
          <div className="card" style={{ width: 300, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center" }}>{"\u{1F512}"} Password Required</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", textAlign: "center", marginBottom: 16 }}>
              Enter the password to join "{passwordPrompt.room.name}"
            </p>
            <input
              className="input-field"
              type="password"
              placeholder="Room password"
              value={passwordPrompt.pwd}
              onChange={e => setPasswordPrompt({ ...passwordPrompt, pwd: e.target.value })}
              onKeyDown={e => e.key === "Enter" && passwordPrompt.pwd.trim() && onJoinRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any)}
              style={{ marginBottom: 12 }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setPasswordPrompt(null)}>Cancel</button>
              <button className="btn btn-primary btn-full"
                disabled={!passwordPrompt.pwd.trim()}
                onClick={() => {
                  onJoinRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any);
                  setPasswordPrompt(null);
                }}>Join</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.85)", backdropFilter: "blur(10px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200,
        }} onClick={() => !creating && setShowCreate(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0", padding: 20,
            animation: "slide-up 0.3s ease", maxHeight: "85vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 14px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 18, textAlign: "center" }}>Create Voice Room {"\u{1F3A4}"}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 4, display: "block" }}>Room Avatar</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {ROOM_AVATARS.map(a => (
                    <button key={a} onClick={() => setRoomAvatar(roomAvatar === a ? "" : a)} style={{
                      width: 38, height: 38, borderRadius: 12, fontSize: 20,
                      border: roomAvatar === a ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: roomAvatar === a ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{a}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 4, display: "block" }}>Room Name</label>
                <input className="input-field" placeholder="e.g. Chill Vibes Only" value={name} onChange={e => setName(e.target.value)} disabled={creating} />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 4, display: "block" }}>Category</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {CATEGORIES.map(t => (
                    <button key={t} onClick={() => setTopic(t)} disabled={creating} style={{
                      padding: "7px 14px", borderRadius: 12, fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                      border: topic === t ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: topic === t ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                      color: topic === t ? "#A29BFE" : "rgba(162,155,254,0.4)", cursor: "pointer",
                    }}>{t}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>Room Access</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { key: "public", icon: "\u{1F30D}", label: "Public" },
                    { key: "private", icon: "\u{1F510}", label: "Private" },
                    { key: "password", icon: "\u{1F512}", label: "Password" },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => setRoomPrivacy(opt.key)} disabled={creating} style={{
                      flex: 1, padding: "10px 6px", borderRadius: 12, fontFamily: "inherit", textAlign: "center",
                      border: roomPrivacy === opt.key ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: roomPrivacy === opt.key ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                      color: roomPrivacy === opt.key ? "#A29BFE" : "rgba(162,155,254,0.4)", cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{opt.icon}</div>
                      <div style={{ fontSize: 10, fontWeight: 700 }}>{opt.label}</div>
                    </button>
                  ))}
                </div>
                {roomPrivacy === "password" && (
                  <input className="input-field" type="password" placeholder="Set room password" value={roomPassword}
                    onChange={e => setRoomPassword(e.target.value)} disabled={creating}
                    style={{ marginTop: 8 }} />
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>Mic Permission</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {([
                    { key: "all", icon: "\u{1F3A4}", label: "Everyone" },
                    { key: "request", icon: "\u270B", label: "Request" },
                    { key: "admin_only", icon: "\u{1F6E1}\uFE0F", label: "Admin" },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => setMicPerm(opt.key)} disabled={creating} style={{
                      flex: 1, padding: "10px 6px", borderRadius: 12, fontFamily: "inherit", textAlign: "center",
                      border: micPerm === opt.key ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: micPerm === opt.key ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                      color: micPerm === opt.key ? "#A29BFE" : "rgba(162,155,254,0.4)", cursor: "pointer",
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 2 }}>{opt.icon}</div>
                      <div style={{ fontSize: 9, fontWeight: 700 }}>{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full" style={{ padding: "14px 0", marginTop: 4 }} onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
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
