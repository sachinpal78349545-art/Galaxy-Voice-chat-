import { useState, useEffect, useRef, useCallback } from "react";
import { ref, onValue, off, query, orderByChild, equalTo, limitToFirst, limitToLast } from "firebase/database";
import { db } from "../lib/firebase";
import { UserProfile, isSuperAdmin } from "../lib/userService";
import { Room, subscribeRooms, subscribeRoom } from "../lib/roomService";
import { getGiftLeaderboard, LeaderboardEntry } from "../lib/giftService";
import Header from "../components/home/Header";
import SearchBar from "../components/home/SearchBar";
import BannerCarousel from "../components/home/BannerCarousel";
import GameSection from "../components/home/GameCard";
import FriendSection from "../components/home/FriendCard";

interface OnlineUser { uid: string; name: string; avatar: string; level?: number; }
interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; onCreateRoom?: () => void; }

const PAGE_SIZE = 8;
const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function HomePage({ user, onJoinRoom, onCreateRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [topGifters, setTopGifters] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeRooms(r => { setRooms(r); setLoading(false); });
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
      setAllUsers(users.sort(() => Math.random() - 0.5).slice(0, 20));
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
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.host?.toLowerCase().includes(q) || r.topic?.toLowerCase().includes(q);
  }).sort((a, b) => b.listeners - a.listeners);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="hp-page" ref={scrollRef} onScroll={handleScroll}>
      <Header user={user} />
      <SearchBar onSearch={setSearch} />
      <BannerCarousel />
      <GameSection onCreateRoom={onCreateRoom} />

      {myRoom && (
        <div className="hp-my-room" onClick={() => onJoinRoom(myRoom)}>
          <div className="hp-my-room-avatar">
            {(myRoom.roomAvatar || user.avatar)?.startsWith?.("http")
              ? <img src={myRoom.roomAvatar?.startsWith?.("http") ? myRoom.roomAvatar : user.avatar} alt="" />
              : <span style={{ fontSize: 22 }}>{myRoom.roomAvatar || myRoom.coverEmoji || "\u{1F3A4}"}</span>}
          </div>
          <div className="hp-my-room-info">
            <div className="hp-my-room-name">
              {myRoom.name}
              {myRoom.isLive && <span className="badge badge-live" style={{ fontSize: 8, marginLeft: 6 }}><span className="live-dot" />{Object.keys(myRoom.roomUsers || {}).length}</span>}
            </div>
            <p className="hp-my-room-label">My Room</p>
          </div>
          <div className="hp-my-room-enter">Enter</div>
        </div>
      )}

      {onlineUsers.length > 0 && (
        <div className="hp-online-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title"><span style={{ color: "#00e676" }}>{"\u25CF"}</span> Online Now</h2>
            <span className="hp-section-more">{onlineUsers.length} users</span>
          </div>
          <div className="hp-online-scroll">
            {onlineUsers.slice(0, 15).map((u, i) => (
              <div key={u.uid} className="hp-online-user" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="hp-online-avatar">
                  {u.avatar?.startsWith?.("http") ? (
                    <img src={u.avatar} alt="" onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:20px">\u{1F464}</span>'; }} />
                  ) : <span style={{ fontSize: 20 }}>{u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}"}</span>}
                  <div className="hp-online-indicator" />
                </div>
                <span className="hp-online-name">{u.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {topGifters.length > 0 && (
        <div className="hp-gifters-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title">{"\u{1F451}"} Top Gifters</h2>
            <span className="hp-section-more">This Week</span>
          </div>
          <div className="hp-gifters-list">
            {topGifters.map((g, i) => (
              <div key={g.uid} className="hp-gifter-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="hp-gifter-rank" style={{ background: MEDAL_COLORS[i] || "rgba(108,92,231,0.3)", color: i === 0 ? "#000" : "#fff" }}>{i + 1}</div>
                <div className="hp-gifter-avatar">
                  {g.avatar?.startsWith?.("http")
                    ? <img src={g.avatar} alt="" onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:18px">\u{1F464}</span>'; }} />
                    : <span style={{ fontSize: 18 }}>{g.avatar && g.avatar.length <= 4 ? g.avatar : "\u{1F464}"}</span>}
                </div>
                <div className="hp-gifter-info">
                  <p className="hp-gifter-name">{g.name}</p>
                  <p className="hp-gifter-coins">{"\u{1F48E}"} {g.totalCoins.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FriendSection users={allUsers} />

      <div className="hp-rooms-section">
        <div className="hp-section-header">
          <h2 className="hp-section-title">{"\u{1F525}"} Live Rooms</h2>
          <div className="hp-live-count">
            <span className="live-dot" />
            <span>{rooms.filter(r => r.isLive).length} Live</span>
          </div>
        </div>

        <div className="hp-rooms-list">
          {loading ? (
            <div className="galaxy-loader">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Loading" />
              <p>Discovering rooms...</p>
            </div>
          ) : (
            <>
              {!myRoom && (
                <div className="hp-create-card" onClick={onCreateRoom}>
                  <div className="hp-create-icon">{"\u{1F3E0}"}</div>
                  <div className="hp-create-info">
                    <p className="hp-create-title">Create Your Room</p>
                    <p className="hp-create-sub">Start voice chatting now</p>
                  </div>
                  <div className="hp-create-btn">{"\uFF0B"} Create</div>
                </div>
              )}
              {visible.map((room, i) => (
                <div key={room.id} className="hp-room-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => onJoinRoom(room)}>
                  <div className="hp-room-avatar">
                    {(room.seats?.find(s => s.userId)?.avatar || room.coverEmoji || "\u{1F3A4}")?.startsWith?.("http")
                      ? <img src={room.seats?.find(s => s.userId)?.avatar || ""} alt="" onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size:24px">\u{1F3A4}</span>'; }} />
                      : <span style={{ fontSize: 24 }}>{room.coverEmoji || "\u{1F3A4}"}</span>}
                    {room.isLive && <div className="hp-room-live-badge"><span className="live-dot" style={{ width: 4, height: 4 }} /> LIVE</div>}
                  </div>
                  <div className="hp-room-info">
                    <h3 className="hp-room-name">{room.name}</h3>
                    <p className="hp-room-host">by {room.host}</p>
                    <div className="hp-room-stats">
                      <span className="hp-room-seats">{"\u{1F465}"} {room.seats?.filter(s => s.userId).length || 0}/{room.seats?.length || 12}</span>
                      <span className="hp-room-topic">{room.topic || "Chat"}</span>
                    </div>
                  </div>
                  <div className="hp-room-join">Join</div>
                </div>
              ))}
              {visible.length < filtered.length && (
                <div className="galaxy-loader" style={{ padding: "16px 0" }}>
                  <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" style={{ width: 28, height: 28 }} />
                </div>
              )}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.3)" }}>
                  <div style={{ fontSize: 44 }}>{"\u{1F30C}"}</div>
                  <p style={{ marginTop: 8, fontWeight: 600, fontSize: 13 }}>No rooms found</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div style={{ height: 80 }} />
    </div>
  );
}
