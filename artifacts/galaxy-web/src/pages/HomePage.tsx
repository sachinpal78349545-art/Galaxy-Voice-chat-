import React, { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, off, query, orderByChild, equalTo, limitToFirst, limitToLast } from "firebase/database";
import { db } from "../lib/firebase";
import { UserProfile, isSuperAdmin } from "../lib/userService";
import { Room, subscribeRooms, subscribeRoom } from "../lib/roomService";
import { getGiftLeaderboard, LeaderboardEntry } from "../lib/giftService";

interface OnlineUser { uid: string; name: string; avatar: string; level?: number; }
interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; onCreateRoom?: () => void; }
type Tab = "Popular" | "New" | "Party";

const BANNERS = [
  {
    id: "welcome",
    gradient: "linear-gradient(135deg, #6C5CE7 0%, #a855f7 50%, #ec4899 100%)",
    title: "Welcome to Galaxy",
    subtitle: "Join voice rooms & make friends worldwide",
    emoji: "\u{1F30C}",
    badge: "NEW",
  },
  {
    id: "games",
    gradient: "linear-gradient(135deg, #f97316 0%, #ef4444 50%, #dc2626 100%)",
    title: "Room Games Live!",
    subtitle: "Play Ludo, Carrom, Dice & more with friends",
    emoji: "\u{1F3AE}",
    badge: "HOT",
  },
  {
    id: "gifts",
    gradient: "linear-gradient(135deg, #FFD700 0%, #f59e0b 50%, #d97706 100%)",
    title: "Send & Receive Gifts",
    subtitle: "Climb the leaderboard, earn rewards daily",
    emoji: "\u{1F381}",
    badge: "REWARDS",
  },
  {
    id: "pk",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #6366f1 100%)",
    title: "PK Battle Arena",
    subtitle: "Challenge other rooms & prove your power",
    emoji: "\u2694\uFE0F",
    badge: "BATTLE",
  },
  {
    id: "family",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)",
    title: "Create Your Family",
    subtitle: "Build your agency, grow together",
    emoji: "\u{1F46A}",
    badge: "SOCIAL",
  },
];

const GAME_BANNERS = [
  { id: "ludo", name: "Ludo", emoji: "\u{1F3B2}", color: "#ef4444", bg: "linear-gradient(135deg, #7f1d1d, #dc2626)", players: "2-4" },
  { id: "carrom", name: "Carrom", emoji: "\u{1F3AF}", color: "#f59e0b", bg: "linear-gradient(135deg, #78350f, #d97706)", players: "2" },
  { id: "dice", name: "Dice", emoji: "\u{1F3B2}", color: "#8b5cf6", bg: "linear-gradient(135deg, #4c1d95, #7c3aed)", players: "2+" },
  { id: "truth_dare", name: "Truth/Dare", emoji: "\u{1F525}", color: "#ec4899", bg: "linear-gradient(135deg, #831843, #db2777)", players: "3+" },
  { id: "karaoke", name: "Karaoke", emoji: "\u{1F3A4}", color: "#06b6d4", bg: "linear-gradient(135deg, #164e63, #0891b2)", players: "All" },
  { id: "pk_battle", name: "PK Battle", emoji: "\u2694\uFE0F", color: "#f97316", bg: "linear-gradient(135deg, #7c2d12, #ea580c)", players: "Room" },
];

const QUICK_CATEGORIES = [
  { emoji: "\u{1F525}", label: "Hot", topic: "__hot__" },
  { emoji: "\u{1F3B5}", label: "Music", topic: "Music" },
  { emoji: "\u{1F4AC}", label: "Chat", topic: "Chill" },
  { emoji: "\u{1F3AE}", label: "Gaming", topic: "Gaming" },
  { emoji: "\u{1F602}", label: "Comedy", topic: "Comedy" },
  { emoji: "\u{1F4DA}", label: "Study", topic: "Study" },
  { emoji: "\u{1F5E3}", label: "Debate", topic: "Debate" },
  { emoji: "\u2694\uFE0F", label: "PK", topic: "__pk__" },
  { emoji: "\u{1F3A4}", label: "Karaoke", topic: "Karaoke" },
  { emoji: "\u{1F4B0}", label: "Crypto", topic: "Crypto" },
];

const PAGE_SIZE = 8;
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function HomePage({ user, onJoinRoom, onCreateRoom }: Props) {
  const [tab, setTab] = useState<Tab>("Popular");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [topGifters, setTopGifters] = useState<LeaderboardEntry[]>([]);
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef(0);

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
    }
    setMyRoom(null);
    return undefined;
  }, [user.hasRoom, user.myRoomId]);

  useEffect(() => {
    const onlineRef = query(ref(db, "users"), orderByChild("online"), equalTo(true), limitToFirst(30));
    const handler = onValue(onlineRef, snap => {
      if (!snap.exists()) { setOnlineUsers([]); return; }
      const val = snap.val();
      const online: OnlineUser[] = [];
      Object.keys(val).forEach(uid => {
        if (uid !== user.uid) {
          const u = val[uid];
          online.push({ uid, name: u.name || "User", avatar: u.avatar || "\u{1F464}", level: u.level || 1 });
        }
      });
      setOnlineUsers(online.slice(0, 20));
    });
    return () => off(onlineRef);
  }, [user.uid]);

  useEffect(() => {
    const usersRef = query(ref(db, "users"), limitToLast(50));
    const handler = onValue(usersRef, snap => {
      if (!snap.exists()) { setAllUsers([]); return; }
      const val = snap.val();
      const users: OnlineUser[] = [];
      Object.keys(val).forEach(uid => {
        const u = val[uid];
        if (u.name && uid !== user.uid) {
          users.push({ uid, name: u.name || "User", avatar: u.avatar || "\u{1F464}", level: u.level || 1 });
        }
      });
      const shuffled = users.sort(() => Math.random() - 0.5).slice(0, 30);
      setAllUsers(shuffled);
    });
    return () => off(usersRef);
  }, [user.uid]);

  useEffect(() => {
    getGiftLeaderboard("weekly", "senders")
      .then(lb => setTopGifters(lb.slice(0, 5)))
      .catch(() => setTopGifters([]));
  }, []);

  useEffect(() => {
    if (bannerPaused) return;
    const interval = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [bannerPaused]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setVisibleCount(prev => prev + PAGE_SIZE);
    }
  }, []);

  const filtered = rooms.filter(r => {
    if (quickFilter) {
      if (quickFilter === "__hot__") return r.listeners > 3;
      if (quickFilter === "__pk__") return !!(r as any).pkBattleId;
      return r.topic === quickFilter;
    }
    if (tab === "Popular") return true;
    if (tab === "New") return Date.now() - r.createdAt < 7200000;
    if (tab === "Party") return r.listeners > 5;
    return true;
  }).sort((a, b) => b.listeners - a.listeners);

  const visible = filtered.slice(0, visibleCount);

  const handleBannerTouch = (e: React.TouchEvent, type: "start" | "end") => {
    if (type === "start") {
      touchStartX.current = e.touches[0].clientX;
      setBannerPaused(true);
    } else {
      const diff = e.changedTouches[0].clientX - touchStartX.current;
      if (Math.abs(diff) > 40) {
        if (diff < 0) setBannerIndex(prev => (prev + 1) % BANNERS.length);
        else setBannerIndex(prev => (prev - 1 + BANNERS.length) % BANNERS.length);
      }
      setBannerPaused(false);
    }
  };

  const formatId = (uid: string) => {
    const num = uid.replace(/\D/g, "").slice(0, 9);
    return num.length > 0 ? num : uid.slice(0, 8);
  };

  return (
    <div className="page-scroll" ref={scrollRef} onScroll={handleScroll}>
      <div style={{ padding: "54px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 19, overflow: "hidden",
            border: "2px solid rgba(108,92,231,0.5)",
            boxShadow: "0 0 12px rgba(108,92,231,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(191,0,255,0.1))",
            fontSize: 18,
          }}>
            {user.avatar?.startsWith?.("http")
              ? <img src={user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : (user.avatar && user.avatar.length <= 4 ? user.avatar : "\u{1F464}")}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{user.name}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: "#FFD700", background: "rgba(255,215,0,0.15)", padding: "1px 6px", borderRadius: 6 }}>
                {isSuperAdmin(user) ? "\u{1F451} S.Admin" : `Lv.${user.level}`}
              </span>
              <span style={{ fontSize: 9, color: "rgba(162,155,254,0.5)" }}>ID: {formatId(user.uid)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
            borderRadius: 16, padding: "5px 10px",
          }}>
            <span style={{ fontSize: 12 }}>{"\u{1F48E}"}</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{user.coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div
        style={{ padding: "8px 16px 12px", position: "relative", overflow: "hidden" }}
        onTouchStart={e => handleBannerTouch(e, "start")}
        onTouchEnd={e => handleBannerTouch(e, "end")}
      >
        <div ref={bannerRef} style={{
          display: "flex", transition: "transform 0.5s cubic-bezier(0.4,0,0.2,1)",
          transform: `translateX(-${bannerIndex * 100}%)`,
        }}>
          {BANNERS.map((banner) => (
            <div key={banner.id} style={{
              minWidth: "100%", borderRadius: 16, padding: "20px 18px",
              background: banner.gradient,
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 6px 24px rgba(0,0,0,0.3)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -20, right: -20, width: 100, height: 100,
                borderRadius: "50%", background: "rgba(255,255,255,0.08)",
              }} />
              <div style={{
                position: "absolute", bottom: -30, right: 30, width: 80, height: 80,
                borderRadius: "50%", background: "rgba(255,255,255,0.05)",
              }} />
              <div style={{ flex: 1, zIndex: 1 }}>
                <div style={{
                  display: "inline-block", background: "rgba(0,0,0,0.25)",
                  borderRadius: 8, padding: "2px 8px", fontSize: 9, fontWeight: 800,
                  color: "#fff", marginBottom: 6, letterSpacing: 1,
                }}>{banner.badge}</div>
                <h3 style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginBottom: 4, textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}>{banner.title}</h3>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", lineHeight: 1.4 }}>{banner.subtitle}</p>
              </div>
              <div style={{
                fontSize: 42, zIndex: 1,
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.3))",
                animation: "float 3s ease-in-out infinite",
              }}>{banner.emoji}</div>
            </div>
          ))}
        </div>
        <div style={{
          display: "flex", justifyContent: "center", gap: 6, marginTop: 10,
        }}>
          {BANNERS.map((_, i) => (
            <button
              key={i}
              onClick={() => { setBannerIndex(i); setBannerPaused(false); }}
              style={{
                width: bannerIndex === i ? 20 : 6, height: 6, borderRadius: 3,
                background: bannerIndex === i ? "#A29BFE" : "rgba(162,155,254,0.25)",
                border: "none", cursor: "pointer", transition: "all 0.3s",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding: "6px 16px 14px" }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {QUICK_CATEGORIES.map(cat => {
            const isActive = quickFilter === cat.topic;
            return (
              <button
                key={cat.label}
                onClick={() => setQuickFilter(isActive ? null : cat.topic)}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  padding: "10px 12px", borderRadius: 14, minWidth: 50,
                  background: isActive ? "rgba(108,92,231,0.25)" : "rgba(255,255,255,0.03)",
                  border: isActive ? "1px solid rgba(108,92,231,0.5)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: isActive ? "#A29BFE" : "rgba(162,155,254,0.5)" }}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{"\u{1F3AE}"} Games</h3>
          <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontWeight: 600 }}>Play in Rooms</span>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {GAME_BANNERS.map((game, i) => (
            <div key={game.id} style={{
              flexShrink: 0, width: 110, borderRadius: 14, padding: "14px 10px",
              background: game.bg, cursor: "pointer", transition: "transform 0.2s",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25)", textAlign: "center",
              animation: `slide-up 0.3s ease ${i * 0.06}s both`,
              position: "relative", overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -15, right: -15, width: 50, height: 50,
                borderRadius: "50%", background: "rgba(255,255,255,0.08)",
              }} />
              <div style={{ fontSize: 32, marginBottom: 6, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}>{game.emoji}</div>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{game.name}</p>
              <span style={{
                fontSize: 9, color: "rgba(255,255,255,0.7)", fontWeight: 600,
                background: "rgba(0,0,0,0.2)", borderRadius: 6, padding: "2px 6px",
              }}>{game.players} Players</span>
            </div>
          ))}
        </div>
      </div>

      {myRoom && (
        <div style={{ padding: "0 16px 14px" }}>
          <div
            onClick={() => onJoinRoom(myRoom)}
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(191,0,255,0.08))",
              border: "1.5px solid rgba(191,0,255,0.35)",
              borderRadius: 16, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
              boxShadow: "0 0 20px rgba(191,0,255,0.1)",
            }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: 14, flexShrink: 0, overflow: "hidden",
              border: "2px solid rgba(191,0,255,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(191,0,255,0.08)", fontSize: 22,
            }}>
              {(myRoom.roomAvatar || user.avatar)?.startsWith?.("http")
                ? <img src={myRoom.roomAvatar?.startsWith?.("http") ? myRoom.roomAvatar : user.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (myRoom.roomAvatar || myRoom.coverEmoji || "\u{1F3A4}")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 800 }}>{myRoom.name}</span>
              {myRoom.isLive && <span className="badge badge-live" style={{ fontSize: 8, marginLeft: 6 }}><span className="live-dot"/>{Object.keys(myRoom.roomUsers || {}).length}</span>}
              <p style={{ fontSize: 10, color: "rgba(191,0,255,0.5)", fontWeight: 700, marginTop: 2 }}>My Room</p>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #bf00ff, #6C5CE7)", borderRadius: 12,
              padding: "7px 14px", fontSize: 11, fontWeight: 800, color: "#fff",
            }}>Enter</div>
          </div>
        </div>
      )}

      {onlineUsers.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>
              <span style={{ color: "#00e676" }}>{"\u{25CF}"}</span> Online Now
            </h3>
            <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontWeight: 600 }}>{onlineUsers.length} users</span>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
            {onlineUsers.slice(0, 12).map((u, i) => (
              <div key={u.uid} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0,
                animation: `slide-up 0.3s ease ${i * 0.04}s both`,
              }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 24, fontSize: 22,
                    background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(108,92,231,0.05))",
                    border: "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {u.avatar?.startsWith?.("http") ? (
                      <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                    ) : (u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}")}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, background: "#00e676", border: "2px solid #0F0F1A" }} />
                </div>
                <span style={{ fontSize: 8, fontWeight: 600, color: "rgba(162,155,254,0.5)", width: 48, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topGifters.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{"\u{1F451}"} Top Gifters</h3>
            <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontWeight: 600 }}>This Week</span>
          </div>
          <div style={{
            display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2,
            background: "linear-gradient(135deg, rgba(255,215,0,0.05), rgba(108,92,231,0.03))",
            border: "1px solid rgba(255,215,0,0.12)",
            borderRadius: 14, padding: "10px",
          }}>
            {topGifters.map((g, i) => (
              <div key={g.uid} style={{
                display: "flex", alignItems: "center", gap: 8, flexShrink: 0, padding: "5px 8px",
                background: i === 0 ? "rgba(255,215,0,0.06)" : "transparent",
                borderRadius: 12,
              }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.1)",
                    border: `2px solid ${MEDAL_COLORS[i] || "rgba(108,92,231,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    {g.avatar?.startsWith?.("http")
                      ? <img src={g.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                      : (g.avatar && g.avatar.length <= 4 ? g.avatar : "\u{1F464}")}
                  </div>
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
          </div>
        </div>
      )}

      {allUsers.length > 0 && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{"\u{1F464}"} People Nearby</h3>
            <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontWeight: 600 }}>Discover</span>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
          }}>
            {allUsers.slice(0, 12).map((u, i) => (
              <div key={u.uid} style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(108,92,231,0.12)",
                borderRadius: 14, padding: "10px 4px 8px",
                animation: `slide-up 0.3s ease ${i * 0.04}s both`,
                cursor: "pointer",
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 22, fontSize: 20,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(191,0,255,0.08))",
                  border: "2px solid rgba(108,92,231,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden",
                }}>
                  {u.avatar?.startsWith?.("http") ? (
                    <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                  ) : (u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}")}
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#fff", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>{u.name}</span>
                <span style={{ fontSize: 8, color: "rgba(162,155,254,0.4)", fontWeight: 600 }}>ID: {formatId(u.uid)}</span>
                <span style={{
                  fontSize: 8, fontWeight: 700, color: "#FFD700",
                  background: "rgba(255,215,0,0.1)", borderRadius: 4, padding: "1px 5px",
                }}>Lv.{u.level || 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: "0 16px" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 4,
          borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: 10,
        }}>
          {(["Popular", "New", "Party"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setQuickFilter(null); }} style={{
              background: "none", border: "none", cursor: "pointer", padding: "10px 14px",
              fontFamily: "inherit", fontSize: 13, fontWeight: 700,
              color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.3)",
              borderBottom: tab === t ? "2px solid #6C5CE7" : "2px solid transparent",
              transition: "all 0.2s",
            }}>{t}</button>
          ))}
          <div style={{ flex: 1 }} />
          {quickFilter && (
            <button onClick={() => setQuickFilter(null)} style={{
              background: "rgba(108,92,231,0.12)", border: "1px solid rgba(108,92,231,0.25)",
              borderRadius: 10, padding: "3px 8px", cursor: "pointer", fontFamily: "inherit",
              fontSize: 9, color: "#A29BFE", fontWeight: 600,
            }}>{"\u2715"} {quickFilter === "__hot__" ? "Hot" : quickFilter === "__pk__" ? "PK" : quickFilter}</button>
          )}
          <div className="badge badge-live" style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10 }}>
            <span className="live-dot" />
            <span>{rooms.filter(r => r.isLive).length} Live</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 14px 100px", display: "flex", flexDirection: "column", gap: 10 }}>
        {!myRoom && !loading && (
          <div
            onClick={onCreateRoom}
            style={{
              cursor: "pointer",
              background: "linear-gradient(135deg, rgba(108,92,231,0.08), rgba(191,0,255,0.04))",
              border: "1.5px dashed rgba(191,0,255,0.3)",
              borderRadius: 14, padding: "12px 14px",
              display: "flex", alignItems: "center", gap: 12,
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              border: "1.5px dashed rgba(191,0,255,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(191,0,255,0.05)", fontSize: 20,
            }}>{"\u{1F3E0}"}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800 }}>Create Your Room</p>
              <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginTop: 1 }}>Start voice chatting now</p>
            </div>
            <div style={{
              background: "rgba(191,0,255,0.12)", border: "1px solid rgba(191,0,255,0.25)",
              borderRadius: 10, padding: "6px 12px", fontSize: 11, fontWeight: 800,
              color: "#bf00ff",
            }}>{"\uFF0B"} Create</div>
          </div>
        )}

        {loading ? (
          <div className="galaxy-loader">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" />
            <p>Discovering rooms...</p>
          </div>
        ) : (
          <>
            {visible.map((room, i) => (
              <div key={room.id} style={{ animation: `slide-up 0.3s ease ${i * 0.04}s both` }}>
                <RoomCard room={room} onJoin={() => onJoinRoom(room)} />
              </div>
            ))}
            {visible.length < filtered.length && (
              <div className="galaxy-loader" style={{ padding: "16px 0" }}>
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" style={{ width: 28, height: 28 }} />
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.3)" }}>
                <div style={{ fontSize: 44 }}>{"\u{1F30C}"}</div>
                <p style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>
                  {quickFilter ? `No ${quickFilter === "__hot__" ? "Hot" : quickFilter === "__pk__" ? "PK" : quickFilter} rooms` : "No rooms in this tab yet"}
                </p>
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
    <div style={{
      cursor: "pointer", padding: "12px 14px",
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(108,92,231,0.15)",
      borderRadius: 14, transition: "all 0.2s",
    }} onClick={onJoin}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, fontSize: 26,
            background: "linear-gradient(135deg, rgba(108,92,231,0.15), rgba(108,92,231,0.05))",
            border: "2px solid rgba(108,92,231,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {hostAvatar?.startsWith?.("http")
              ? <img src={hostAvatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 14, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F3A4}"; }} />
              : (hostAvatar && hostAvatar.length <= 4 ? hostAvatar : "\u{1F3A4}")}
          </div>
          {room.isLive && (
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              background: "#071a0e", border: "1.5px solid rgba(0,230,118,0.4)",
              borderRadius: 6, padding: "1px 4px", fontSize: 7, fontWeight: 800,
              color: "#00e676", display: "flex", alignItems: "center", gap: 2,
            }}>
              <span className="live-dot" style={{ width: 4, height: 4 }} /> LIVE
            </div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h3>
          <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginBottom: 5 }}>by {room.host}</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{
              fontSize: 10, fontWeight: 700,
              color: occupied.length >= room.seats.length - 1 ? "#ff6482" : "#A29BFE",
            }}>{"\u{1F465}"} {occupied.length}/{room.seats.length}</span>
            {liveCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(0,230,118,0.7)" }}>
                {"\u{1F441}"} {liveCount}
              </span>
            )}
            <span style={{
              fontSize: 9, fontWeight: 600,
              background: "rgba(108,92,231,0.12)", color: "#A29BFE",
              borderRadius: 6, padding: "1px 6px",
            }}>{room.topic || "Chat"}</span>
          </div>
        </div>
        <div style={{
          background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
          borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 800, color: "#fff",
          boxShadow: "0 2px 10px rgba(108,92,231,0.25)",
        }}>Join</div>
      </div>
    </div>
  );
}
