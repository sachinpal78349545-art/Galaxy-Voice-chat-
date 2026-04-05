import React, { useState, useEffect, useRef } from "react";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../lib/firebase";
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
  const [creating, setCreating] = useState(false);
  const [dpPreview, setDpPreview] = useState<string | null>(null);
  const [dpFile, setDpFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "warning");
      return;
    }
    setDpFile(file);
    const reader = new FileReader();
    reader.onload = () => setDpPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!name.trim()) { showToast("Please enter a room name", "warning"); return; }
    setCreating(true);
    try {
      let roomAvatarUrl: string | undefined;
      if (dpFile) {
        const fileExt = dpFile.name.split(".").pop() || "jpg";
        const path = `room-avatars/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const sRef = storageRef(storage, path);
        await uploadBytes(sRef, dpFile);
        roomAvatarUrl = await getDownloadURL(sRef);
      }
      const room = await createRoom(user.uid, user.name, user.avatar, name.trim(), "Talk", {
        roomAvatar: roomAvatarUrl || undefined,
      });
      setShowCreate(false);
      setName("");
      setDpFile(null);
      setDpPreview(null);
      onJoinRoom(room);
    } catch (err) {
      console.error("Create room error:", err);
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
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F3A4}"}</p>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No rooms yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Create one to get started!</p>
          </div>
        ) : (
          filtered.map((room, i) => (
            <div key={room.id} style={{ animation: `slide-up 0.25s ease ${i * 0.04}s both` }} className="card card-glow" onClick={() => onJoinRoom(room)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                {room.roomAvatar && room.roomAvatar.startsWith("http") ? (
                  <img src={room.roomAvatar} alt="" style={{
                    width: 48, height: 48, borderRadius: 14, objectFit: "cover",
                    border: "1px solid rgba(108,92,231,0.3)", flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, fontSize: 24,
                    background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{room.roomAvatar || room.coverEmoji || "\u{1F3A4}"}</div>
                )}
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
                  onClick={e => { e.stopPropagation(); onJoinRoom(room); }}
                >Join {"\u203A"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.9)", backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => !creating && setShowCreate(false)}>
          <div style={{
            width: "90%", maxWidth: 340, padding: "32px 24px",
            background: "rgba(15,15,30,0.95)", borderRadius: 28,
            border: "1px solid rgba(108,92,231,0.2)",
            animation: "popIn 0.25s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 20,
          }} onClick={e => e.stopPropagation()}>

            <h2 style={{ fontSize: 20, fontWeight: 900, textAlign: "center" }}>Create Room</h2>

            <button onClick={() => fileRef.current?.click()} disabled={creating} style={{
              width: 110, height: 110, borderRadius: "50%", cursor: "pointer",
              border: dpPreview ? "3px solid #6C5CE7" : "2px dashed rgba(108,92,231,0.4)",
              background: dpPreview ? "transparent" : "rgba(108,92,231,0.08)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden", transition: "all 0.2s",
            }}>
              {dpPreview ? (
                <img src={dpPreview} alt="Room DP" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 32, marginBottom: 4 }}>{"\u{1F4F7}"}</span>
                  <span style={{ fontSize: 10, color: "rgba(162,155,254,0.5)", fontWeight: 700 }}>Upload DP</span>
                </>
              )}
            </button>

            <input
              className="input-field"
              placeholder="Room Name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={creating}
              maxLength={40}
              style={{ width: "100%", textAlign: "center", fontSize: 16, padding: "14px 16px" }}
              autoFocus
            />

            <button
              className="btn btn-primary btn-full"
              style={{ padding: "15px 0", fontSize: 16, fontWeight: 800, borderRadius: 16, width: "100%" }}
              onClick={handleCreate}
              disabled={creating || !name.trim()}
            >
              {creating ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  Creating...
                </div>
              ) : "Create Room"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
