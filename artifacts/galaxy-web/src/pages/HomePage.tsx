import { useState, useEffect, useRef, useMemo } from "react";
import { ref, onValue, off, query, orderByChild, equalTo, limitToFirst, limitToLast } from "firebase/database";
import { db } from "../lib/firebase";
import { UserProfile, isSuperAdmin } from "../lib/userService";
import { Room, subscribeRooms, subscribeRoom } from "../lib/roomService";
import { getGiftLeaderboard, LeaderboardEntry } from "../lib/giftService";
import Header from "../components/home/Header";
import BannerCarousel from "../components/home/BannerCarousel";
import GameSection from "../components/home/GameCard";
import FriendSection from "../components/home/FriendCard";

interface OnlineUser { uid: string; name: string; avatar: string; level?: number; }
interface Props { user: UserProfile; onJoinRoom: (room: Room) => void; onCreateRoom?: () => void; }

const MEDAL_COLORS = ["#FFD700", "#C0C0C0", "#CD7F32"];

function StarField() {
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 300,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 5,
      dur: Math.random() * 3 + 2,
      opacity: Math.random() * 0.6 + 0.2,
    })), []);

  return (
    <div className="hp-starfield">
      {stars.map(s => (
        <div
          key={s.id}
          className="hp-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}px`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

export default function HomePage({ user, onJoinRoom, onCreateRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [topGifters, setTopGifters] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeRooms(r => { setRooms(r); });
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

  return (
    <div className="hp-page" ref={scrollRef}>
      <StarField />
      <div className="hp-glow-orb hp-glow-orb-1" />
      <div className="hp-glow-orb hp-glow-orb-2" />
      <div className="hp-glow-orb hp-glow-orb-3" />

      <div className="hp-content">
        <Header user={user} />
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
        <div style={{ height: 90 }} />
      </div>
    </div>
  );
}
