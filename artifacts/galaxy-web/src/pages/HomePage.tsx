import React, { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../lib/firebase";
import { UserProfile, isSuperAdmin } from "../lib/userService";
import { Room, subscribeRooms, subscribeRoom } from "../lib/roomService";
import { getGiftLeaderboard, LeaderboardEntry } from "../lib/giftService";

interface OnlineUser { uid: string; name: string; avatar: string; }
interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; onCreateRoom?: () => void; }
type Tab = "Hot" | "New" | "Following";

const QUICK_CATEGORIES = [
  { emoji: "\u{1F3B5}", label: "Music", topic: "Music" },
  { emoji: "\u{1F4AC}", label: "Chat", topic: "Chill" },
  { emoji: "\u{1F3AE}", label: "Gaming", topic: "Gaming" },
  { emoji: "\u{1F602}", label: "Comedy", topic: "Comedy" },
  { emoji: "\u{1F4DA}", label: "Study", topic: "Study" },
  { emoji: "\u{1F5E3}", label: "Debate", topic: "Debate" },
];

const PAGE_SIZE = 8;

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function HomePage({ user, onJoinRoom, onCreateRoom }: Props) {
  const [tab, setTab] = useState<Tab>("Hot");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [topGifters, setTopGifters] = useState<LeaderboardEntry[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeRooms(r => {
      setRooms(r);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user.hasRoom && user.myRoomId) {
      const unsub = subscribeRoom(user.myRoomId, r => setMyRoom(r));
      return unsub;
    } else {
      setMyRoom(null);
    }
  }, [user.hasRoom, user.myRoomId]);

  useEffect(() => {
    const usersRef = ref(db, "users");
    const handler = onValue(usersRef, snap => {
      if (!snap.exists()) { setOnlineUsers([]); return; }
      const val = snap.val();
      const online: OnlineUser[] = [];
      Object.keys(val).forEach(uid => {
        const u = val[uid];
        if (u.online && uid !== user.uid) {
          online.push({ uid, name: u.name || "User", avatar: u.avatar || "\u{1F464}" });
        }
      });
      setOnlineUsers(online.slice(0, 20));
    });
    return () => off(usersRef);
  }, [user.uid]);

  useEffect(() => {
    getGiftLeaderboard("weekly", "senders")
      .then(lb => setTopGifters(lb.slice(0, 5)))
      .catch(() => setTopGifters([]));
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, []);

  const filtered = rooms.filter(r => {
    if (search) {
      const q = search.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchTag = r.tags?.some(t => t.includes(q));
      const matchTopic = r.topic.toLowerCase().includes(q);
      if (!matchName && !matchTag && !matchTopic) return false;
    }
    if (quickFilter) {
      if (r.topic !== quickFilter) return false;
    }
    if (tab === "Hot") return r.listeners > 5;
    if (tab === "New") return Date.now() - r.createdAt < 7200000;
    return true;
  });

  const trending = [...rooms].sort((a, b) => {
    if (a.id === "11111") return -1;
    if (b.id === "11111") return 1;
    return b.listeners - a.listeners;
  }).slice(0, 3);
  const visible = filtered.slice(0, visibleCount);

  const handleQuickJoin = (topic: string) => {
    const match = rooms.find(r => r.topic === topic && r.isLive);
    if (match) {
      onJoinRoom(match);
    } else {
      setQuickFilter(quickFilter === topic ? null : topic);
    }
  };

  return (
    <div className="page-scroll" ref={scrollRef} onScroll={handleScroll}>
      <div style={{ padding: "54px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)", borderRadius: 20, padding: "6px 10px" }}>
            <span>{"\u{1F48E}"}</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{user.coins.toLocaleString()}</span>
          </div>
          <div style={{ background: isSuperAdmin(user) ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(191,0,255,0.15))" : "rgba(255,215,0,0.12)", border: `1px solid ${isSuperAdmin(user) ? "rgba(255,215,0,0.4)" : "rgba(255,215,0,0.28)"}`, borderRadius: 20, padding: "6px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFD700", textShadow: isSuperAdmin(user) ? "0 0 6px rgba(255,215,0,0.4)" : "none" }}>{isSuperAdmin(user) ? "\u{1F451} S.Admin" : `Lv.${user.level}`}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.3, background: "linear-gradient(135deg,#A29BFE,#6C5CE7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Galaxy</span>
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 35, height: 35, padding: 0, borderRadius: 11, fontSize: 16 }}>{"\u{1F514}"}</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 35, height: 35, padding: 0, borderRadius: 11, fontSize: 16 }} onClick={() => setShowSearch(!showSearch)}>{"\u{1F50D}"}</button>
        </div>
      </div>

      {showSearch && (
        <div style={{ padding: "0 16px 10px", animation: "slide-up 0.2s ease" }}>
          <input
            className="input-field"
            placeholder="Search rooms, topics, tags..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{ borderRadius: 22, padding: "10px 16px", fontSize: 13 }}
          />
        </div>
      )}

      <div style={{ padding: "4px 16px 18px" }}>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4, justifyContent: "space-between" }}>
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              className={`category-btn-neon${quickFilter === cat.topic ? " active" : ""}`}
              onClick={() => handleQuickJoin(cat.topic)}
              style={{
                flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
                padding: "12px 14px", borderRadius: 16,
                background: quickFilter === cat.topic ? "rgba(108,92,231,0.25)" : "rgba(255,255,255,0.03)",
                border: quickFilter === cat.topic ? "1px solid rgba(108,92,231,0.5)" : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", minWidth: 52,
              }}
            >
              <span className="category-icon-neon" style={{ fontSize: 24 }}>{cat.emoji}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: quickFilter === cat.topic ? "#A29BFE" : "rgba(162,155,254,0.5)" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "0 16px 16px" }}>
        {myRoom ? (
          <div
            onClick={() => onJoinRoom(myRoom)}
            style={{
              cursor: "pointer",
              background: "linear-gradient(160deg, rgba(108,92,231,0.18), rgba(191,0,255,0.08))",
              border: "2px solid rgba(191,0,255,0.4)",
              borderRadius: 20, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 0 20px rgba(191,0,255,0.12), inset 0 0 20px rgba(108,92,231,0.05)",
              transition: "all 0.3s",
              animation: "slide-up 0.3s ease",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0, overflow: "hidden",
              border: "2px solid rgba(191,0,255,0.5)",
              boxShadow: "0 0 12px rgba(191,0,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(191,0,255,0.1))",
              fontSize: 24,
            }}>
              {(myRoom.roomAvatar || user.avatar)?.startsWith?.("http")
                ? <img src={myRoom.roomAvatar?.startsWith?.("http") ? myRoom.roomAvatar : user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (myRoom.roomAvatar || myRoom.coverEmoji || "\u{1F3A4}")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: 14, fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myRoom.name}</span>
                {myRoom.isLive && <span className="badge badge-live" style={{ fontSize: 9 }}><span className="live-dot"/>{Object.keys(myRoom.roomUsers || {}).length}</span>}
              </div>
              <p style={{ fontSize: 11, color: "rgba(191,0,255,0.6)", fontWeight: 700 }}>My Room</p>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #bf00ff, #6C5CE7)", borderRadius: 14,
              padding: "8px 16px", fontSize: 12, fontWeight: 800, color: "#fff",
              boxShadow: "0 4px 14px rgba(191,0,255,0.3)",
            }}>Enter</div>
          </div>
        ) : (
          <div
            onClick={onCreateRoom}
            style={{
              cursor: "pointer",
              background: "linear-gradient(160deg, rgba(108,92,231,0.1), rgba(191,0,255,0.05))",
              border: "1.5px dashed rgba(191,0,255,0.35)",
              borderRadius: 20, padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 14,
              transition: "all 0.3s",
              animation: "slide-up 0.3s ease",
            }}
          >
            <div style={{
              width: 52, height: 52, borderRadius: 16, flexShrink: 0, overflow: "hidden",
              border: "1.5px dashed rgba(191,0,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(191,0,255,0.06)", fontSize: 24,
            }}>
              {user.avatar?.startsWith?.("http")
                ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
                : "\u{1F3E0}"}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 800 }}>Create Your Room</p>
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)", marginTop: 2 }}>Start your own voice room</p>
            </div>
            <div style={{
              background: "rgba(191,0,255,0.15)", border: "1px solid rgba(191,0,255,0.3)",
              borderRadius: 14, padding: "8px 16px", fontSize: 12, fontWeight: 800,
              color: "#bf00ff",
            }}>{"\uFF0B"} Create</div>
          </div>
        )}
      </div>

      {onlineUsers.length > 0 && (
        <div style={{ padding: "0 16px 18px", display: "flex", gap: 10, overflowX: "auto" }}>
          {onlineUsers.map((u, i) => (
            <div key={u.uid} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0,
              animation: `slide-up 0.3s ease ${i * 0.05}s both`,
            }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 25, fontSize: 24,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                  border: "2px solid rgba(108,92,231,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(108,92,231,0.15)", overflow: "hidden",
                }}>
                  {u.avatar?.startsWith?.("http") ? (
                    <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                  ) : (u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}")}
                </div>
                <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: 6, background: "#00e676", border: "2px solid #0F0F1A" }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: "rgba(162,155,254,0.55)", width: 50, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
            </div>
          ))}
        </div>
      )}

      {topGifters.length > 0 && !search && (
        <div style={{ padding: "0 16px 20px" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1.5 }}>{"\u{1F451}"} Top Gifters This Week</h3>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2,
            background: "linear-gradient(160deg, rgba(255,215,0,0.06), rgba(108,92,231,0.04))",
            border: "1px solid rgba(255,215,0,0.15)",
            borderRadius: 18, padding: "14px 12px",
            boxShadow: "0 2px 16px rgba(255,215,0,0.05)",
          }}>
            {topGifters.map((g, i) => (
              <div key={g.uid} style={{
                display: "flex", alignItems: "center", gap: 10, flexShrink: 0, padding: "6px 10px",
                background: i === 0 ? "rgba(255,215,0,0.08)" : "transparent",
                borderRadius: 14,
              }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 20, fontSize: 20,
                    background: "rgba(108,92,231,0.15)",
                    border: `2.5px solid ${MEDAL_COLORS[i] || "rgba(108,92,231,0.3)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: i < 3 ? `0 0 14px ${MEDAL_COLORS[i]}40` : "none",
                  }}>
                    {g.avatar?.startsWith?.("http")
                      ? <img src={g.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (g.avatar && g.avatar.length <= 4 ? g.avatar : "\u{1F464}")}
                  </div>
                  {i < 3 && (
                    <div style={{
                      position: "absolute", top: -5, right: -5, width: 18, height: 18, borderRadius: 9,
                      background: MEDAL_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 900, color: i === 0 ? "#000" : "#fff",
                      border: "2px solid #0F0F1A", boxShadow: `0 2px 6px ${MEDAL_COLORS[i]}55`,
                    }}>{i + 1}</div>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{g.name}</p>
                  <p style={{ fontSize: 10, color: "#FFD700", fontWeight: 700 }}>{"\u{1F48E}"} {g.totalCoins.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!search && trending.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <h3 style={{ fontSize: 12, fontWeight: 800, color: "rgba(162,155,254,0.5)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>{"\u{1F525}"} Trending Now</h3>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 2 }}>
            {trending.map((r, i) => (
              <div key={r.id} onClick={() => onJoinRoom(r)} style={{
                flexShrink: 0, width: 156,
                background: "linear-gradient(160deg, rgba(108,92,231,0.12), rgba(108,92,231,0.04))",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: "16px 14px",
                cursor: "pointer", transition: "all 0.2s",
                boxShadow: "0 4px 16px rgba(108,92,231,0.08)",
                animation: `slide-up 0.3s ease ${i * 0.08}s both`,
              }}>
                <div style={{ fontSize: 34, marginBottom: 8, filter: "drop-shadow(0 2px 6px rgba(108,92,231,0.3))" }}>{r.coverEmoji || "\u{1F3A4}"}</div>
                <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 8 }}>by {r.host}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="badge badge-live" style={{ fontSize: 9 }}><span className="live-dot"/>{r.listeners}</span>
                  <span className="badge badge-accent" style={{ fontSize: 9 }}>{r.topic}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 16px" }}>
        {(["Hot", "New", "Following"] as Tab[]).map(t => (
          <button key={t} onClick={() => { setTab(t); setQuickFilter(null); }} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 14px",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: tab === t ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{t}</button>
        ))}
        <div style={{ flex: 1 }} />
        {quickFilter && (
          <button onClick={() => setQuickFilter(null)} style={{
            background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
            borderRadius: 12, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
            fontSize: 10, color: "#A29BFE", fontWeight: 600, marginRight: 6,
          }}>{"\u2715"} {quickFilter}</button>
        )}
        <div className="badge badge-live" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span className="live-dot" />
          <span>{rooms.filter(r => r.isLive).length} Live</span>
        </div>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
        {loading ? (
          <div className="galaxy-loader">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" />
            <p>Discovering rooms...</p>
          </div>
        ) : (
          <>
            {visible.map((room, i) => (
              <div key={room.id} style={{ animation: `slide-up 0.3s ease ${i * 0.05}s both` }}>
                <RoomCard room={room} onJoin={() => onJoinRoom(room)} />
              </div>
            ))}
            {visible.length < filtered.length && (
              <div className="galaxy-loader" style={{ padding: "20px 0" }}>
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" style={{ width: 32, height: 32 }} />
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "48px 0", color: "rgba(162,155,254,0.3)" }}>
                <div style={{ fontSize: 48 }}>{"\u{1F30C}"}</div>
                <p style={{ marginTop: 10, fontWeight: 600 }}>{search ? "No rooms match your search" : quickFilter ? `No ${quickFilter} rooms live` : "No rooms in this tab yet"}</p>
                {quickFilter && (
                  <button onClick={() => setQuickFilter(null)} className="btn btn-ghost btn-sm" style={{ marginTop: 10 }}>Clear Filter</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RoomCard({ room, onJoin }: { room: Room; onJoin: () => void }) {
  const occupied = room.seats.filter(s => s.userId);
  const hostSeat = room.seats.find(s => s.userId);
  const hostAvatar = hostSeat?.avatar || room.coverEmoji || "\u{1F3A4}";
  const liveCount = Object.keys(room.roomUsers || {}).length || room.listeners;

  return (
    <div className="card card-glow" style={{ cursor: "pointer", padding: 14 }} onClick={onJoin}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 18, fontSize: 28,
            background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
            border: "2px solid rgba(108,92,231,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(108,92,231,0.15)",
          }}>
            {hostAvatar?.startsWith?.("http")
              ? <img src={hostAvatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 16, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F3A4}"; }} />
              : (hostAvatar && hostAvatar.length <= 4 ? hostAvatar : "\u{1F3A4}")}
          </div>
          {room.isLive && (
            <div style={{
              position: "absolute", bottom: -3, right: -3,
              background: "#071a0e", border: "1.5px solid rgba(0,230,118,0.5)",
              borderRadius: 8, padding: "1px 5px", fontSize: 7, fontWeight: 800,
              color: "#00e676", display: "flex", alignItems: "center", gap: 2,
            }}>
              <span className="live-dot" style={{ width: 4, height: 4 }} /> LIVE
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h3>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)", marginBottom: 6 }}>by {room.host}</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: occupied.length >= room.seats.length - 1 ? "#ff6482" : "#A29BFE",
            }}>{"\u{1F465}"} {liveCount}/{room.seats.length}</span>
            <span className="badge badge-accent" style={{ fontSize: 8 }}>{room.topic || room.category}</span>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.4)", color: "#A29BFE", flexShrink: 0, padding: "8px 14px" }}
          onClick={e => { e.stopPropagation(); onJoin(); }}
        >Join</button>
      </div>
    </div>
  );
}
