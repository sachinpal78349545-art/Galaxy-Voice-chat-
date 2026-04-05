import React, { useState, useEffect, useRef, useCallback } from "react";
import { UserProfile } from "../lib/userService";
import { Room, subscribeRooms } from "../lib/roomService";
import { getGiftLeaderboard, LeaderboardEntry } from "../lib/giftService";

interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; }
type Tab = "Hot" | "New" | "Following";

const FAKE_USERS_ONLINE = [
  { name: "StarGazer", avatar: "\u{1F31F}", status: "In Room" },
  { name: "CosmicDJ", avatar: "\u{1F3B5}", status: "Online" },
  { name: "LunaRose", avatar: "\u{1F319}", status: "Chilling" },
  { name: "NightOwl", avatar: "\u{1F989}", status: "Online" },
  { name: "VoidWalk", avatar: "\u{1F30C}", status: "In Room" },
  { name: "NebulaDev", avatar: "\u{1F4BB}", status: "Online" },
  { name: "RocketX", avatar: "\u{1F680}", status: "Singing" },
  { name: "ArcKnight", avatar: "\u26A1", status: "Online" },
];

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

export default function HomePage({ user, onJoinRoom }: Props) {
  const [tab, setTab] = useState<Tab>("Hot");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [topGifters, setTopGifters] = useState<LeaderboardEntry[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeRooms(r => {
      setRooms(r);
      setLoading(false);
    });
    return unsub;
  }, []);

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

  const trending = [...rooms].sort((a, b) => b.listeners - a.listeners).slice(0, 3);
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
          <div style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.28)", borderRadius: 20, padding: "6px 10px" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: "#FFD700" }}>Lv.{user.level}</span>
          </div>
        </div>
        <h1 style={{ fontSize: 17, fontWeight: 900, letterSpacing: -0.3, color: "#A29BFE" }}>ChaloTalk {"\u2728"}</h1>
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

      <div style={{ padding: "0 16px 12px" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {QUICK_CATEGORIES.map(cat => (
            <button
              key={cat.label}
              onClick={() => handleQuickJoin(cat.topic)}
              style={{
                flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                padding: "10px 14px", borderRadius: 16,
                background: quickFilter === cat.topic ? "rgba(108,92,231,0.25)" : "rgba(255,255,255,0.03)",
                border: quickFilter === cat.topic ? "1px solid rgba(108,92,231,0.5)" : "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", minWidth: 56,
              }}
            >
              <span style={{ fontSize: 22 }}>{cat.emoji}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: quickFilter === cat.topic ? "#A29BFE" : "rgba(162,155,254,0.5)" }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

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

      {topGifters.length > 0 && !search && (
        <div style={{ padding: "0 16px 12px" }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: "rgba(162,155,254,0.6)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>{"\u{1F451}"} Top Gifters This Week</h3>
          <div style={{
            display: "flex", gap: 8, overflowX: "auto",
            background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.12)",
            borderRadius: 16, padding: "12px 14px",
          }}>
            {topGifters.map((g, i) => (
              <div key={g.uid} style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, padding: "4px 8px" }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.15)",
                    border: `2px solid ${MEDAL_COLORS[i] || "rgba(108,92,231,0.3)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: i < 3 ? `0 0 10px ${MEDAL_COLORS[i]}33` : "none",
                  }}>{g.avatar}</div>
                  {i < 3 && (
                    <div style={{
                      position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
                      background: MEDAL_COLORS[i], display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 8, fontWeight: 900, color: i === 0 ? "#000" : "#fff",
                      border: "1.5px solid #0F0F1A",
                    }}>{i + 1}</div>
                  )}
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{g.name}</p>
                  <p style={{ fontSize: 9, color: "#FFD700", fontWeight: 700 }}>{"\u{1F48E}"} {g.totalCoins.toLocaleString()}</p>
                </div>
              </div>
            ))}
            {topGifters.length === 0 && (
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", padding: 8 }}>No gifts sent this week yet</p>
            )}
          </div>
        </div>
      )}

      {!search && trending.length > 0 && (
        <div style={{ padding: "0 16px 12px" }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: "rgba(162,155,254,0.6)", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>{"\u{1F525}"} Trending Now</h3>
          <div style={{ display: "flex", gap: 10, overflowX: "auto" }}>
            {trending.map(r => (
              <div key={r.id} onClick={() => onJoinRoom(r)} style={{
                flexShrink: 0, width: 150, background: "rgba(108,92,231,0.08)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 16, padding: 14,
                cursor: "pointer", transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>{r.coverEmoji || "\u{1F3A4}"}</div>
                <p style={{ fontSize: 12, fontWeight: 800, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 6 }}>by {r.host}</p>
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
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <div className="skeleton" style={{ width: 60, height: 16 }} />
                <div className="skeleton" style={{ width: 40, height: 16 }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: "70%" }} />
              <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              <div style={{ display: "flex", gap: 6 }}>
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="skeleton skeleton-circle" style={{ width: 32, height: 32 }} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <>
            {visible.map((room, i) => (
              <div key={room.id} style={{ animation: `slide-up 0.3s ease ${i * 0.05}s both` }}>
                <RoomCard room={room} onJoin={() => onJoinRoom(room)} />
              </div>
            ))}
            {visible.length < filtered.length && (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ width: 28, height: 28, borderRadius: 14, border: "2px solid rgba(108,92,231,0.3)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
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
  return (
    <div className="card card-glow" style={{ cursor: "pointer" }} onClick={onJoin}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16, fontSize: 28, flexShrink: 0,
          background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{room.coverEmoji || "\u{1F3A4}"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
            {room.isLive && <span className="badge badge-live"><span className="live-dot"/>LIVE</span>}
            <span className="badge badge-accent">{room.category}</span>
            {room.tags?.map(t => <span key={t} className="badge" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(162,155,254,0.4)", fontSize: 9 }}>#{t}</span>)}
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h3>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)", marginBottom: 8 }}>by {room.host}</p>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            {room.seats.slice(0, 9).map((s, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: 14, fontSize: 14,
                background: s.userId ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                border: s.isSpeaking ? "1.5px solid rgba(0,230,118,0.6)" : s.userId ? "1.5px solid rgba(108,92,231,0.3)" : "1.5px dashed rgba(255,255,255,0.09)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: s.isSpeaking ? "0 0 8px rgba(0,230,118,0.3)" : "none",
              }}>
                {s.isLocked ? "\u{1F512}" : s.userId ? s.avatar : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>+</span>}
              </div>
            ))}
            {room.seats.length > 9 && (
              <div style={{
                width: 28, height: 28, borderRadius: 14, fontSize: 9,
                background: "rgba(108,92,231,0.1)", border: "1.5px solid rgba(108,92,231,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(162,155,254,0.5)",
              }}>+{room.seats.length - 9}</div>
            )}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ fontSize: 12, color: "rgba(162,155,254,0.45)" }}>{"\u{1F399}"} {occupied.length}/{room.seats.length}</span>
            <span style={{ fontSize: 12, color: "rgba(162,155,254,0.45)" }}>{"\u{1F3A7}"} {room.listeners}</span>
          </div>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.4)", color: "#A29BFE", flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onJoin(); }}
        >Join {"\u203A"}</button>
      </div>
    </div>
  );
}
