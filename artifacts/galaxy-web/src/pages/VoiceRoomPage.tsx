import React, { useState, useEffect, useRef } from "react";
import {
  Room, RoomSeat, RoomUser, RoomMessage, ROOM_THEMES, ROOM_AVATARS,
  subscribeRoom, subscribeRoomMessages, sendRoomMessage,
  raiseHand, kickFromSeat, muteUserSeat, toggleLockSeat, toggleMuteSeat,
  leaveSeat, joinSeat, setCoHost, isOwnerOrAdmin, getUserRole,
  joinRoom, leaveRoom, setAdmin, removeAdmin, banUser, unbanUser,
  kickUserFromRoom, updateRoomSettings, endRoom, deleteRoom,
} from "../lib/roomService";
import { UserProfile, gainXP, sendGift, incrementStat } from "../lib/userService";
import { recordGift, getGiftLeaderboard, LeaderboardEntry, LeaderboardPeriod } from "../lib/giftService";
import { sendNotification } from "../lib/notificationService";
import { voiceService } from "../lib/voiceService";
import { useToast } from "../lib/toastContext";

interface Props { roomId: string; user: UserProfile; onLeave: () => void; }

const EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u2728", "\u{1F602}", "\u{1F3B5}", "\u{1F44F}", "\u{1F31F}", "\u{1F4AF}", "\u{1F680}", "\u{1F60D}", "\u{1F389}", "\u{1F48E}"];
const GIFTS = [
  { emoji: "\u{1F381}", name: "Gift Box", cost: 10 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 50 },
  { emoji: "\u{1F451}", name: "Crown", cost: 100 },
  { emoji: "\u{1F339}", name: "Rose", cost: 20 },
  { emoji: "\u{1F38A}", name: "Confetti", cost: 30 },
  { emoji: "\u{1F340}", name: "Clover", cost: 15 },
  { emoji: "\u{1F98B}", name: "Butterfly", cost: 25 },
  { emoji: "\u2B50", name: "Star", cost: 40 },
  { emoji: "\u{1F3B6}", name: "Music", cost: 35 },
  { emoji: "\u{1F4B0}", name: "Money Bag", cost: 200 },
  { emoji: "\u{1F3C6}", name: "Trophy", cost: 500 },
  { emoji: "\u{1F52E}", name: "Crystal Ball", cost: 75 },
];

export default function VoiceRoomPage({ roomId, user, onLeave }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [floats, setFloats] = useState<{ id: number; item: string; x: number; big?: boolean }[]>([]);
  const [elapsed, setElapsed] = useState("0:00");
  const [showVolume, setShowVolume] = useState(false);
  const [volumeSliders, setVolumeSliders] = useState<Record<number, number>>({});
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lbPeriod, setLbPeriod] = useState<LeaderboardPeriod>("daily");
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>([]);
  const [speakingUids, setSpeakingUids] = useState<Set<number>>(new Set());
  const [giftAnim, setGiftAnim] = useState<{ emoji: string; sender: string; receiver: string } | null>(null);
  const [showCloseMenu, setShowCloseMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [welcomeAnim, setWelcomeAnim] = useState<string | null>(null);
  const [showSeatSheet, setShowSeatSheet] = useState<number | null>(null);
  const [showProfileCard, setShowProfileCard] = useState<{ uid: string; name: string; avatar: string; seatIdx: number } | null>(null);
  const [settingsTab, setSettingsTab] = useState<"general" | "mic" | "banned">("general");
  const [editName, setEditName] = useState("");
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const joinedRef = useRef(false);
  const voiceInitRef = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeRoom(roomId, r => {
      if (!r && joinedRef.current) {
        showToast("Room has ended", "info");
        onLeave();
        return;
      }
      setRoom(r);
      if (r && !joinedRef.current) {
        joinedRef.current = true;
        joinRoom(roomId, user.uid, user.name, user.avatar).then(res => {
          if (!res.joined) {
            showToast(res.reason || "Cannot join room", "error");
            onLeave();
            return;
          }
          incrementStat(user.uid, "roomsJoined").catch(console.error);
          sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F389}", text: `Welcome ${user.name} to the room \u{1F389}`, type: "welcome" }).catch(console.error);
          setWelcomeAnim(user.name);
          setTimeout(() => setWelcomeAnim(null), 3500);
        }).catch(err => {
          console.error("Join error:", err);
          showToast("Failed to join room", "error");
          onLeave();
        });
      }
    });
    const unsub2 = subscribeRoomMessages(roomId, setMessages);
    return () => { unsub1(); unsub2(); };
  }, [roomId]);

  useEffect(() => {
    if (!room || voiceInitRef.current) return;
    voiceInitRef.current = true;
    (async () => {
      const ok = await voiceService.init();
      if (ok) {
        const numericUid = Math.abs(hashCode(user.uid)) % 1000000;
        await voiceService.join(roomId, numericUid);
        voiceService.onSpeaker((uid, vol) => {
          setSpeakingUids(prev => {
            const next = new Set(prev);
            if (vol > 15) next.add(uid);
            else next.delete(uid);
            return next;
          });
        });
      }
    })();
    return () => { voiceService.leave(); };
  }, [room?.id]);

  useEffect(() => {
    if (!room) return;
    const t = setInterval(() => {
      const diff = Date.now() - room.createdAt;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      if (hrs > 0) setElapsed(`${hrs}:${String(mins % 60).padStart(2, "0")}:${String(Math.floor((diff / 1000) % 60)).padStart(2, "0")}`);
      else setElapsed(`${mins}:${String(Math.floor((diff / 1000) % 60)).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, [room?.createdAt]);

  useEffect(() => {
    if (!room || voiceService.joined) return;
    const t = setInterval(() => {
      setRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          seats: prev.seats.map(s =>
            s.userId && !s.isMuted ? { ...s, isSpeaking: Math.random() > 0.45 } : { ...s, isSpeaking: false }
          ),
        };
      });
    }, 2000);
    return () => clearInterval(t);
  }, [room?.id]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const isOwner = room?.hostId === user.uid;
  const hasControl = room ? isOwnerOrAdmin(room, user.uid) : false;
  const myRole = room ? getUserRole(room, user.uid) : "user";
  const liveCount = room ? Object.keys(room.roomUsers || {}).length || room.listeners : 0;

  const spawnFloat = (item: string, big = false) => {
    const id = floatId.current++;
    const x = 10 + Math.random() * 60;
    setFloats(prev => [...prev, { id, item, x, big }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), big ? 3200 : 2800);
  };

  const sendChat = async () => {
    const text = inputText.trim();
    if (!text || !room) return;
    try {
      await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text, type: "text" });
      setInputText("");
      gainXP(user.uid, 3, user.xp, user.level).catch(console.error);
      incrementStat(user.uid, "messagesSent").catch(console.error);
    } catch (err) {
      console.error("Chat send error:", err);
      showToast("Failed to send message", "error");
    }
  };

  const sendEmojiMsg = async (e: string) => {
    spawnFloat(e);
    setShowEmoji(false);
    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: e, type: "emoji" }).catch(console.error);
  };

  const handleGift = async (gift: typeof GIFTS[0]) => {
    if (!room) return;
    const hostSeat = room.seats.find(s => s.userId && s.userId !== user.uid);
    const recipientId = hostSeat?.userId || room.hostId;
    const recipientName = hostSeat?.username || room.host;
    const success = await sendGift(user.uid, user, recipientId, gift.emoji, gift.cost);
    if (!success) { showToast(`Not enough coins! Need ${gift.cost}`, "warning", "\u{1F48E}"); return; }
    setGiftAnim({ emoji: gift.emoji, sender: user.name, receiver: recipientName });
    setTimeout(() => setGiftAnim(null), 3000);
    for (let i = 0; i < 3; i++) setTimeout(() => spawnFloat(gift.emoji, true), i * 300);
    setShowGift(false);
    showToast(`Sent ${gift.emoji} ${gift.name} to ${recipientName}`, "success");
    recordGift({ senderId: user.uid, senderName: user.name, senderAvatar: user.avatar, receiverId: recipientId, receiverName: recipientName, receiverAvatar: hostSeat?.avatar || "\u{1F3A4}", giftEmoji: gift.emoji, coins: gift.cost, timestamp: Date.now() }).catch(console.error);
    sendNotification(recipientId, { type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}!`, icon: gift.emoji, fromUid: user.uid, fromName: user.name }).catch(console.error);
    sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent ${gift.emoji} ${gift.name} to ${recipientName}`, type: "gift" }).catch(console.error);
  };

  const handleRaiseHand = async () => {
    if (!room) return;
    const mySeat = room.seats.findIndex(s => s.userId === user.uid);
    if (mySeat >= 0) {
      const raised = !room.seats[mySeat].handRaised;
      await raiseHand(roomId, mySeat, raised);
      showToast(raised ? "Hand raised! \u270B" : "Hand lowered", "info");
    } else {
      if (room.micPermission === "admin_only" && !hasControl) {
        showToast("Only owner/admins can take seats", "warning");
        return;
      }
      const emptySeat = room.seats.findIndex(s => !s.userId && !s.isLocked);
      if (emptySeat >= 0) {
        if (room.micPermission === "request" && !hasControl) {
          showToast("Mic request sent to owner/admin", "info");
          sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${user.name} is requesting to speak`, type: "system" }).catch(console.error);
          return;
        }
        await joinSeat(roomId, emptySeat, user.uid, user.name, user.avatar);
        showToast("Joined a seat!", "success");
      } else {
        showToast("No seats available", "warning");
      }
    }
  };

  const handleSeatAction = async (action: string, seatIdx: number) => {
    if (!room || !hasControl) return;
    try {
      if (action === "kick") {
        const seatUser = room.seats[seatIdx]?.username;
        await kickFromSeat(roomId, seatIdx);
        showToast(`${seatUser} removed from seat`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${seatUser} was removed from seat`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        await muteUserSeat(roomId, seatIdx);
        showToast("User muted", "info");
      } else if (action === "unmute") {
        await toggleMuteSeat(roomId, seatIdx, false);
        showToast("User unmuted", "info");
      } else if (action === "lock") {
        await toggleLockSeat(roomId, seatIdx, !room.seats[seatIdx].isLocked);
        showToast(room.seats[seatIdx].isLocked ? "Seat unlocked" : "Seat locked", "info");
      } else if (action === "cohost") {
        const isCo = room.seats[seatIdx].isCoHost;
        await setCoHost(roomId, seatIdx, !isCo);
        showToast(isCo ? "Co-host removed" : "Co-host assigned!", "success");
      } else if (action === "admin") {
        const uid = room.seats[seatIdx].userId;
        if (uid) {
          const isAdm = (room.adminIds || []).includes(uid);
          if (isAdm) { await removeAdmin(roomId, uid); showToast("Admin removed", "info"); }
          else { await setAdmin(roomId, uid); showToast("Admin assigned!", "success"); }
        }
      }
    } catch (err) {
      console.error("Seat action error:", err);
      showToast("Action failed", "error");
    }
    setShowHostControls(false);
    setSelectedSeat(null);
  };

  const handleUserAction = async (action: string, uid: string) => {
    if (!room) return;
    try {
      const ru = room.roomUsers?.[uid];
      const uname = ru?.name || "User";
      if (action === "make_admin") {
        await setAdmin(roomId, uid);
        showToast(`${uname} is now an Admin`, "success");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6E1}\uFE0F", text: `${uname} was promoted to Admin`, type: "system" }).catch(console.error);
      } else if (action === "remove_admin") {
        await removeAdmin(roomId, uid);
        showToast(`${uname} admin removed`, "info");
      } else if (action === "kick") {
        await kickUserFromRoom(roomId, uid);
        showToast(`${uname} kicked from room`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${uname} was kicked from the room`, type: "system" }).catch(console.error);
      } else if (action === "ban") {
        await banUser(roomId, uid);
        showToast(`${uname} banned`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u26D4", text: `${uname} was banned from the room`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        const seatIdx = room.seats.findIndex(s => s.userId === uid);
        if (seatIdx >= 0) { await muteUserSeat(roomId, seatIdx); showToast(`${uname} muted`, "info"); }
      }
    } catch (err) {
      console.error("User action error:", err);
      showToast("Action failed", "error");
    }
    setSelectedUserUid(null);
  };

  const handleMicToggle = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await voiceService.setMuted(newMuted);
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) toggleMuteSeat(roomId, mySeat, newMuted).catch(console.error);
    }
  };

  const handleVolumeChange = (uid: number, vol: number) => {
    setVolumeSliders(prev => ({ ...prev, [uid]: vol }));
    voiceService.setRemoteVolume(uid, vol);
  };

  const handleLeave = async () => {
    await voiceService.leave();
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) await leaveSeat(roomId, mySeat).catch(console.error);
      await leaveRoom(roomId, user.uid).catch(console.error);
      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F44B}", text: `${user.name} left the room`, type: "leave" }).catch(console.error);
    }
    onLeave();
  };

  const handleEndRoom = async () => {
    await voiceService.leave();
    if (room) await endRoom(roomId).catch(console.error);
    onLeave();
  };

  const handleSaveSettings = async () => {
    if (!room) return;
    try {
      const updates: any = {};
      if (editName.trim() && editName.trim() !== room.name) updates.name = editName.trim();
      if (Object.keys(updates).length > 0) {
        await updateRoomSettings(roomId, updates);
        showToast("Settings saved!", "success");
      }
    } catch { showToast("Save failed", "error"); }
  };

  const loadLeaderboard = async (period: LeaderboardPeriod) => {
    setLbPeriod(period);
    const entries = await getGiftLeaderboard(period, "senders");
    setLbEntries(entries);
  };

  const roomTheme = ROOM_THEMES.find(t => t.id === (room?.theme || "galaxy")) || ROOM_THEMES[0];
  const roomUsers = room?.roomUsers ? Object.values(room.roomUsers) : [];
  roomUsers.sort((a, b) => {
    const ro = { owner: 0, admin: 1, user: 2 };
    return (ro[a.role] || 2) - (ro[b.role] || 2);
  });

  if (!room) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto", background: "linear-gradient(160deg, #1A0F2E, #0F0F1A)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
        <p style={{ fontSize: 13, color: "rgba(162,155,254,0.5)" }}>Joining room...</p>
      </div>
    );
  }

  return (
    <div className="no-screenshot" style={{
      position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto",
      background: roomTheme.bg, display: "flex", flexDirection: "column",
    }}>
      {floats.map(f => (
        <div key={f.id} style={{
          position: "absolute", bottom: "42%", right: `${f.x}%`, fontSize: f.big ? 52 : 38, zIndex: 500,
          pointerEvents: "none", animation: f.big ? "giftFly 3.2s ease-out forwards" : "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

      {giftAnim && (
        <div style={{
          position: "absolute", top: "22%", left: "50%", transform: "translateX(-50%)",
          zIndex: 600, textAlign: "center", pointerEvents: "none", animation: "giftReveal 3s ease forwards",
        }}>
          <div style={{ fontSize: 80, animation: "giftBounce 0.6s ease infinite" }}>{giftAnim.emoji}</div>
          <div style={{ fontSize: 14, color: "#FFD700", fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.8)", marginTop: 8 }}>
            {giftAnim.sender} {"\u27A4"} {giftAnim.receiver}
          </div>
        </div>
      )}

      {welcomeAnim && (
        <div style={{
          position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
          zIndex: 700, textAlign: "center", pointerEvents: "none",
          animation: "welcomeEntry 3.5s ease forwards",
        }}>
          <div style={{ fontSize: 48, marginBottom: 8, animation: "float 1s ease-in-out infinite" }}>{"\u2728"}</div>
          <div style={{
            background: "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.1))",
            border: "1.5px solid rgba(108,92,231,0.4)", borderRadius: 20, padding: "12px 24px",
            backdropFilter: "blur(16px)",
          }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Welcome {welcomeAnim}!</p>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.6)", marginTop: 2 }}>Enjoy the room {"\u{1F389}"}</p>
          </div>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "48px 12px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
      }}>
        <div onClick={() => { setShowSettings(true); setEditName(room.name); setSettingsTab("general"); }}
          style={{
            width: 44, height: 44, borderRadius: 14, fontSize: 24,
            background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
            border: "2px solid rgba(108,92,231,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0, boxShadow: "0 2px 12px rgba(108,92,231,0.2)",
          }}>
          {room.roomAvatar || room.coverEmoji || "\u{1F3A4}"}
        </div>
        <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
          onClick={() => { setShowSettings(true); setEditName(room.name); setSettingsTab("general"); }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{room.name}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className="badge badge-live" style={{ fontSize: 9, padding: "1px 6px", gap: 3 }}>
              <span className="live-dot" style={{ width: 5, height: 5 }} /> LIVE
            </span>
            <span style={{ fontSize: 10, color: "rgba(162,155,254,0.5)" }}>{liveCount} online</span>
            <span style={{ fontSize: 10, color: "rgba(162,155,254,0.3)" }}>{"\u23F1"} {elapsed}</span>
          </div>
          <span style={{ fontSize: 9, color: "rgba(162,155,254,0.25)", fontFamily: "monospace" }}>ID: {room.id.slice(5, 21)}</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, fontSize: 15 }}
            onClick={() => setShowUsersPanel(true)}>{"\u{1F465}"}</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 34, height: 34, padding: 0, borderRadius: 10, fontSize: 15 }}
            onClick={() => { setShowLeaderboard(true); loadLeaderboard("daily"); }}>{"\u{1F3C6}"}</button>
          <button onClick={() => setShowCloseMenu(true)} style={{
            width: 34, height: 34, borderRadius: 10, border: "1px solid rgba(255,100,130,0.3)",
            background: "rgba(255,100,130,0.1)", cursor: "pointer", fontSize: 16, color: "#ff6482",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2715"}</button>
        </div>
      </div>

      {myRole !== "user" && (
        <div style={{
          display: "flex", gap: 4, padding: "6px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0,
        }}>
          <span className={`badge ${myRole === "owner" ? "badge-gold" : "badge-accent"}`} style={{ fontSize: 9 }}>
            {myRole === "owner" ? "\u{1F451} Owner" : "\u{1F6E1}\uFE0F Admin"}
          </span>
          {room.micPermission && room.micPermission !== "all" && (
            <span className="badge badge-accent" style={{ fontSize: 9 }}>
              {"\u{1F3A4}"} Mic: {room.micPermission === "request" ? "Request" : "Admin Only"}
            </span>
          )}
          {room.isPrivate && <span className="badge badge-accent" style={{ fontSize: 9 }}>{"\u{1F512}"} Private</span>}
        </div>
      )}

      <div style={{ padding: "10px 10px 6px", flexShrink: 0 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8,
          background: "rgba(108,92,231,0.03)", borderRadius: 20, padding: "14px 6px",
          border: "1px solid rgba(108,92,231,0.06)",
        }}>
          {room.seats.map((seat, i) => (
            <SeatCell
              key={i}
              seat={seat}
              seatIndex={i}
              role={seat.userId ? getUserRole(room, seat.userId) : "user"}
              isMe={seat.userId === user.uid}
              hasControl={hasControl}
              isSpeaking={seat.userId ? (voiceService.joined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : seat.isSpeaking) : false}
              onTap={() => {
                if (seat.userId === user.uid) return;
                if (seat.userId) {
                  setShowProfileCard({ uid: seat.userId, name: seat.username || "User", avatar: seat.avatar || "\u{1F464}", seatIdx: i });
                } else if (!seat.isLocked) {
                  setShowSeatSheet(i);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 12px" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 6, paddingBottom: 4 }}>
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isMe={msg.userId === user.uid} />
          ))}
          <div ref={msgEnd} />
        </div>
      </div>

      <div style={{
        padding: "8px 12px 22px", borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(8,4,24,0.85)", backdropFilter: "blur(14px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Say something..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <button className="btn btn-primary btn-sm" style={{ borderRadius: 22, padding: "10px 16px", flexShrink: 0 }}
            onClick={sendChat}>{"\u27A4"}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <PopupBtn icon={"\u{1F60A}"} active={showEmoji} onToggle={() => { setShowEmoji(!showEmoji); setShowGift(false); setShowVolume(false); }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: 200 }}>
              {EMOJIS.map(e => (
                <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                  onClick={() => sendEmojiMsg(e)}>{e}</button>
              ))}
            </div>
          </PopupBtn>

          <button className="btn btn-ghost btn-sm" style={{ width: 44, height: 44, borderRadius: 13, padding: 0, fontSize: 20 }}
            onClick={handleRaiseHand}>{"\u270B"}</button>

          <button onClick={handleMicToggle} style={{
            width: 62, height: 62, borderRadius: 31, border: "none", cursor: "pointer",
            background: isMuted ? "rgba(255,100,130,0.18)" : "linear-gradient(135deg,#6C5CE7,#A29BFE)",
            color: "#fff", fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isMuted ? "0 0 18px rgba(255,100,130,0.4)" : "0 0 28px rgba(108,92,231,0.6), 0 0 56px rgba(108,92,231,0.25)",
            animation: !isMuted ? "pulse-glow 2s infinite" : "none",
            transition: "all 0.25s",
          }}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</button>

          <PopupBtn icon={"\u{1F381}"} active={showGift} onToggle={() => { setShowGift(!showGift); setShowEmoji(false); setShowVolume(false); }}>
            <div style={{ width: 210 }}>
              <div style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 6, fontWeight: 700 }}>{"\u{1F48E}"} {user.coins} coins</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {GIFTS.map(g => (
                  <button key={g.emoji} onClick={() => handleGift(g)} style={{
                    background: user.coins >= g.cost ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(108,92,231,0.2)", borderRadius: 12,
                    cursor: user.coins >= g.cost ? "pointer" : "not-allowed",
                    padding: "5px 7px", display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                    opacity: user.coins >= g.cost ? 1 : 0.4,
                  }}>
                    <span style={{ fontSize: 18 }}>{g.emoji}</span>
                    <span style={{ fontSize: 8, color: "#FFD700", fontWeight: 700 }}>{g.cost}</span>
                  </button>
                ))}
              </div>
            </div>
          </PopupBtn>

          <PopupBtn icon={"\u{1F50A}"} active={showVolume} onToggle={() => { setShowVolume(!showVolume); setShowEmoji(false); setShowGift(false); }}>
            <div style={{ width: 190 }}>
              <div style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 8, fontWeight: 700 }}>Volume Control</div>
              {room.seats.filter(s => s.userId && s.userId !== user.uid).map(s => {
                const uid = Math.abs(hashCode(s.userId!)) % 1000000;
                return (
                  <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 13 }}>{s.avatar}</span>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", width: 45, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.username}</span>
                    <input type="range" min="0" max="100" value={volumeSliders[uid] ?? 100}
                      onChange={e => handleVolumeChange(uid, parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "#6C5CE7", height: 3 }} />
                  </div>
                );
              })}
              {room.seats.filter(s => s.userId && s.userId !== user.uid).length === 0 && (
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", textAlign: "center" }}>No other speakers</p>
              )}
            </div>
          </PopupBtn>
        </div>
      </div>

      {showCloseMenu && (
        <Overlay onClose={() => setShowCloseMenu(false)}>
          <div className="card" style={{ width: 280, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center" }}>{"\u{1F6AA}"} Leave Room?</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 20, textAlign: "center" }}>
              {isOwner ? "As the owner, you can leave or end the room for everyone." : "Are you sure you want to leave?"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => { setShowCloseMenu(false); handleLeave(); }}>
                {"\u{1F44B}"} Leave Room
              </button>
              {isOwner && (
                <button className="btn btn-danger btn-full" onClick={() => { setShowCloseMenu(false); handleEndRoom(); }}>
                  {"\u{1F6D1}"} End Room for Everyone
                </button>
              )}
              <button className="btn btn-ghost btn-full" onClick={() => setShowCloseMenu(false)} style={{ color: "rgba(162,155,254,0.4)" }}>
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {showHostControls && selectedSeat !== null && room.seats[selectedSeat]?.userId && (
        <Overlay onClose={() => { setShowHostControls(false); setSelectedSeat(null); }}>
          <div className="card" style={{ width: 280, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, fontSize: 22,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{room.seats[selectedSeat].avatar}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800 }}>{room.seats[selectedSeat].username}</p>
                <RoleBadge role={getUserRole(room, room.seats[selectedSeat].userId!)} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction(room.seats[selectedSeat].isMuted ? "unmute" : "mute", selectedSeat)}>
                {room.seats[selectedSeat].isMuted ? "\u{1F50A} Unmute" : "\u{1F507} Mute"}
              </button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("kick", selectedSeat)}>{"\u{1F6AB}"} Remove from Seat</button>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("lock", selectedSeat)}>
                {room.seats[selectedSeat].isLocked ? "\u{1F513} Unlock Seat" : "\u{1F512} Lock Seat"}
              </button>
              {isOwner && (
                <>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("admin", selectedSeat)}>
                    {(room.adminIds || []).includes(room.seats[selectedSeat].userId!) ? "\u274C Remove Admin" : "\u{1F6E1}\uFE0F Make Admin"}
                  </button>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("cohost", selectedSeat)}>
                    {room.seats[selectedSeat].isCoHost ? "\u274C Remove Co-Host" : "\u{1F451} Make Co-Host"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showUsersPanel && (
        <Overlay onClose={() => { setShowUsersPanel(false); setSelectedUserUid(null); }}>
          <div className="card" style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 300,
            borderRadius: "20px 0 0 20px", padding: 0, animation: "slideFromRight 0.3s ease",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 900 }}>{"\u{1F465}"} Users ({roomUsers.length})</h3>
              <button onClick={() => setShowUsersPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {roomUsers.map(ru => (
                <div key={ru.uid} onClick={() => hasControl && ru.uid !== user.uid && ru.role !== "owner" ? setSelectedUserUid(selectedUserUid === ru.uid ? null : ru.uid) : null}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 6px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: hasControl && ru.uid !== user.uid && ru.role !== "owner" ? "pointer" : "default",
                    background: selectedUserUid === ru.uid ? "rgba(108,92,231,0.08)" : "transparent",
                    borderRadius: 12, transition: "background 0.2s",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.12)", border: `1.5px solid ${ru.role === "owner" ? "rgba(255,215,0,0.5)" : ru.role === "admin" ? "rgba(108,92,231,0.5)" : "rgba(108,92,231,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{ru.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ru.name}</span>
                      {ru.uid === user.uid && <span style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>(you)</span>}
                    </div>
                    <RoleBadge role={ru.role} />
                  </div>
                  {ru.seatIndex !== null && ru.seatIndex !== undefined && (
                    <span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>Seat {ru.seatIndex + 1}</span>
                  )}
                </div>
              ))}
              {selectedUserUid && (
                <div style={{ padding: "8px 4px", animation: "slide-up 0.2s ease" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {isOwner && !(room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("make_admin", selectedUserUid)}>{"\u{1F6E1}\uFE0F"} Admin</button>
                    )}
                    {isOwner && (room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("remove_admin", selectedUserUid)}>{"\u274C"} Remove Admin</button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("mute", selectedUserUid)}>{"\u{1F507}"} Mute</button>
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("kick", selectedUserUid)}>{"\u{1F6AB}"} Kick</button>
                    {isOwner && (
                      <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("ban", selectedUserUid)}>{"\u26D4"} Ban</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showSettings && (
        <Overlay onClose={() => setShowSettings(false)}>
          <div className="card" style={{
            width: "92%", maxWidth: 380, maxHeight: "75vh", padding: 0,
            animation: "popIn 0.25s ease", display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 900 }}>{"\u2699\uFE0F"} Room Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {(["general", "mic", "banned"] as const).map(tab => (
                <button key={tab} onClick={() => setSettingsTab(tab)} style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: settingsTab === tab ? "rgba(108,92,231,0.12)" : "transparent",
                  color: settingsTab === tab ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                  borderBottom: settingsTab === tab ? "2px solid #6C5CE7" : "2px solid transparent",
                }}>{tab}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
              {settingsTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 20, fontSize: 32, margin: "0 auto 8px",
                      background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.4)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>{room.roomAvatar || "\u{1F3A4}"}</div>
                    {hasControl && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginTop: 8 }}>
                        {ROOM_AVATARS.map(a => (
                          <button key={a} onClick={() => updateRoomSettings(roomId, { roomAvatar: a }).then(() => showToast("Avatar updated!", "success")).catch(console.error)}
                            style={{
                              width: 34, height: 34, borderRadius: 10, border: room.roomAvatar === a ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                              background: room.roomAvatar === a ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{a}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 4, display: "block" }}>Room Name</label>
                    {hasControl ? (
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)}
                          style={{ flex: 1, borderRadius: 14, padding: "10px 14px", fontSize: 13 }} />
                        <button className="btn btn-primary btn-sm" onClick={handleSaveSettings} style={{ fontSize: 11, padding: "8px 14px" }}>Save</button>
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{room.name}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(162,155,254,0.6)" }}>{"\u{1F3C6}"} Room Level</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>Lv.{room.roomLevel || 1}</span>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>Theme</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {ROOM_THEMES.map(t => (
                        <button key={t.id} onClick={() => hasControl && updateRoomSettings(roomId, { theme: t.id }).then(() => showToast("Theme updated!", "success")).catch(console.error)}
                          style={{
                            padding: "6px 12px", borderRadius: 10, border: (room.theme || "galaxy") === t.id ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                            background: (room.theme || "galaxy") === t.id ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                            cursor: hasControl ? "pointer" : "default", fontSize: 11, fontWeight: 600, color: (room.theme || "galaxy") === t.id ? "#A29BFE" : "rgba(162,155,254,0.4)",
                            fontFamily: "inherit",
                          }}>{t.name}</button>
                      ))}
                    </div>
                  </div>
                  {hasControl && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "rgba(162,155,254,0.6)" }}>{"\u{1F512}"} Private Room</span>
                      <button onClick={() => updateRoomSettings(roomId, { isPrivate: !room.isPrivate }).then(() => showToast(room.isPrivate ? "Room is now Public" : "Room is now Private", "info")).catch(console.error)}
                        style={{
                          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                          background: room.isPrivate ? "#6C5CE7" : "rgba(255,255,255,0.15)", position: "relative",
                          transition: "background 0.2s",
                        }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3,
                          left: room.isPrivate ? 23 : 3, transition: "left 0.2s",
                        }} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {settingsTab === "mic" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 4 }}>Who can take a mic seat?</p>
                  {(["all", "request", "admin_only"] as const).map(perm => (
                    <button key={perm} onClick={() => hasControl && updateRoomSettings(roomId, { micPermission: perm }).then(() => showToast("Mic permission updated!", "success")).catch(console.error)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                        borderRadius: 14, border: (room.micPermission || "all") === perm ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                        background: (room.micPermission || "all") === perm ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                        cursor: hasControl ? "pointer" : "default", fontFamily: "inherit", color: "#fff", textAlign: "left",
                      }}>
                      <span style={{ fontSize: 18 }}>{perm === "all" ? "\u{1F3A4}" : perm === "request" ? "\u270B" : "\u{1F6E1}\uFE0F"}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{perm === "all" ? "Everyone" : perm === "request" ? "Request Only" : "Admin Only"}</p>
                        <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                          {perm === "all" ? "Anyone can take a seat" : perm === "request" ? "Users must request, owner/admin approves" : "Only owner and admins can speak"}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {settingsTab === "banned" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 4 }}>Banned Users ({(room.bannedUsers || []).length})</p>
                  {(room.bannedUsers || []).length === 0 ? (
                    <p style={{ fontSize: 13, color: "rgba(162,155,254,0.3)", textAlign: "center", padding: 20 }}>No banned users</p>
                  ) : (
                    (room.bannedUsers || []).map(uid => (
                      <div key={uid} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}>
                        <span style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", fontFamily: "monospace" }}>{uid.slice(0, 16)}...</span>
                        {isOwner && (
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                            onClick={() => unbanUser(roomId, uid).then(() => showToast("User unbanned", "success")).catch(console.error)}>Unban</button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showLeaderboard && (
        <Overlay onClose={() => setShowLeaderboard(false)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: 20, animation: "slide-up 0.3s ease",
            maxHeight: "60vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900 }}>{"\u{1F3C6}"} Gift Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["daily", "weekly", "monthly"] as LeaderboardPeriod[]).map(p => (
                <button key={p} onClick={() => loadLeaderboard(p)} style={{
                  flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: lbPeriod === p ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                  color: lbPeriod === p ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                }}>{p}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {lbEntries.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 24 }}>No gifts yet</p>
              ) : (
                lbEntries.map((entry, i) => (
                  <div key={entry.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 15, fontWeight: 900, width: 22, textAlign: "center", color: i < 3 ? "#FFD700" : "rgba(162,155,254,0.4)" }}>
                      {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `${i + 1}`}
                    </span>
                    <span style={{ fontSize: 18 }}>{entry.avatar}</span>
                    <p style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{entry.name}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD700" }}>{"\u{1F48E}"}{entry.totalCoins}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showSeatSheet !== null && (
        <Overlay onClose={() => setShowSeatSheet(null)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: "20px 20px 32px",
            animation: "sheetUp 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 15, fontWeight: 900, textAlign: "center", marginBottom: 4 }}>Seat {showSeatSheet + 1}</h3>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", textAlign: "center", marginBottom: 18 }}>Choose an action</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary btn-full" style={{ fontSize: 14, padding: "14px 0" }}
                onClick={() => {
                  const idx = showSeatSheet;
                  setShowSeatSheet(null);
                  if (room && idx !== null) {
                    if (room.micPermission === "admin_only" && !hasControl) {
                      showToast("Only owner/admins can take seats", "warning");
                      return;
                    }
                    if (room.micPermission === "request" && !hasControl) {
                      showToast("Mic request sent to owner/admin", "info");
                      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${user.name} is requesting to speak`, type: "system" }).catch(console.error);
                      return;
                    }
                    joinSeat(roomId, idx, user.uid, user.name, user.avatar).then(() => {
                      showToast("Joined seat!", "success");
                    }).catch(console.error);
                  }
                }}>
                {"\u{1F3A4}"} Take Mic
              </button>
              {hasControl && (
                <button className="btn btn-ghost btn-full" style={{ fontSize: 14, padding: "14px 0" }}
                  onClick={() => {
                    const idx = showSeatSheet;
                    setShowSeatSheet(null);
                    if (idx !== null) {
                      toggleLockSeat(roomId, idx, true).then(() => showToast("Seat locked", "info")).catch(console.error);
                    }
                  }}>
                  {"\u{1F512}"} Lock Mic
                </button>
              )}
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13, color: "rgba(162,155,254,0.4)" }}
                onClick={() => setShowSeatSheet(null)}>Cancel</button>
            </div>
          </div>
        </Overlay>
      )}

      {showProfileCard && (
        <Overlay onClose={() => setShowProfileCard(null)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: "20px 20px 32px",
            animation: "sheetUp 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 32, fontSize: 32,
                background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
                border: "3px solid rgba(108,92,231,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(108,92,231,0.3)",
              }}>
                {showProfileCard.avatar?.startsWith("http")
                  ? <img src={showProfileCard.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 32, objectFit: "cover" }} />
                  : showProfileCard.avatar}
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900 }}>{showProfileCard.name}</h3>
              <div style={{ display: "flex", gap: 8 }}>
                {(() => {
                  const ru = room?.roomUsers?.[showProfileCard.uid];
                  return (
                    <>
                      <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontFamily: "monospace" }}>ID: {showProfileCard.uid.slice(0, 8)}</span>
                      <RoleBadge role={ru?.role || getUserRole(room!, showProfileCard.uid)} />
                    </>
                  );
                })()}
              </div>
              <span className="badge badge-accent" style={{ fontSize: 10 }}>{"\u{1F3C6}"} Lv.{room?.roomLevel || 1}</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary btn-full" style={{ fontSize: 13, padding: "12px 0" }}
                onClick={() => { setShowProfileCard(null); showToast("Follow sent!", "success"); }}>
                {"\u2795"} Follow
              </button>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13, padding: "12px 0" }}
                onClick={() => {
                  const pc = showProfileCard;
                  setShowProfileCard(null);
                  setSelectedSeat(pc.seatIdx);
                  setShowHostControls(true);
                }}>
                {"\u2699\uFE0F"} Manage
              </button>
            </div>
            {hasControl && (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11 }}
                  onClick={() => { handleSeatAction("mute", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F507}"} Mute
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: 11 }}
                  onClick={() => { handleSeatAction("kick", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F6AB}"} Remove
                </button>
              </div>
            )}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,1,18,0.75)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
    }} onClick={onClose}>
      {children}
    </div>
  );
}

function PopupBtn({ icon, active, onToggle, children }: { icon: string; active: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <button className="btn btn-ghost btn-sm"
        style={{ width: 44, height: 44, borderRadius: 13, padding: 0, fontSize: 20, background: active ? "rgba(108,92,231,0.15)" : undefined }}
        onClick={onToggle}>{icon}</button>
      {active && (
        <div style={{
          position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
          background: "rgba(15,5,30,0.97)", border: "1px solid rgba(108,92,231,0.2)",
          borderRadius: 16, padding: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
          animation: "popIn 0.15s ease",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "user" }) {
  if (role === "owner") return <span className="badge badge-gold" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F451}"} Owner</span>;
  if (role === "admin") return <span className="badge badge-accent" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F6E1}\uFE0F"} Admin</span>;
  return null;
}

function ChatBubble({ msg, isMe }: { msg: RoomMessage; isMe: boolean }) {
  const isSystem = msg.type === "system" || msg.type === "join" || msg.type === "leave" || msg.type === "welcome";
  const isGift = msg.type === "gift";
  const isWelcome = msg.type === "welcome";

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 6,
      animation: isWelcome ? "welcomeMsg 0.5s ease" : "slide-up 0.15s ease",
      padding: "3px 6px", borderRadius: 10,
      background: isWelcome ? "rgba(108,92,231,0.1)"
        : isGift ? "rgba(255,215,0,0.06)"
        : isSystem ? "rgba(0,230,118,0.04)"
        : "transparent",
      border: isWelcome ? "1px solid rgba(108,92,231,0.2)" : "none",
    }}>
      {!isSystem && (
        <div style={{
          width: 22, height: 22, borderRadius: 11, fontSize: 12, flexShrink: 0,
          background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>{msg.avatar}</div>
      )}
      <div style={{ flex: 1 }}>
        {isSystem ? (
          <span style={{
            fontSize: 12, lineHeight: 1.4,
            color: isWelcome ? "#A29BFE" : msg.type === "leave" ? "rgba(255,100,130,0.6)" : "#00e676",
            fontWeight: isWelcome ? 700 : 500, fontStyle: "italic",
          }}>{msg.text}</span>
        ) : (
          <>
            <span style={{
              fontSize: 10, color: isMe ? "#A29BFE" : "rgba(162,155,254,0.5)",
              marginRight: 5, fontWeight: 700,
            }}>{msg.username}</span>
            <span style={{
              fontSize: msg.type === "emoji" ? 22 : 13, lineHeight: 1.4,
              color: isGift ? "#FFD700" : isMe ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
              fontWeight: isGift ? 700 : 400,
            }}>{msg.text}</span>
          </>
        )}
      </div>
    </div>
  );
}

function hashCode(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

interface SeatCellProps {
  seat: RoomSeat;
  seatIndex: number;
  role: "owner" | "admin" | "user";
  isMe: boolean;
  hasControl: boolean;
  isSpeaking: boolean;
  onTap: () => void;
}

function SeatCell({ seat, seatIndex, role, isMe, hasControl, isSpeaking, onTap }: SeatCellProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      cursor: (!isMe && seat.userId) || (!seat.userId && !seat.isLocked) ? "pointer" : "default",
      transition: "transform 0.15s ease",
    }} onClick={onTap}>
      <div style={{ position: "relative" }}>
        {isSpeaking && (
          <>
            <div style={{
              position: "absolute", inset: -5, borderRadius: "50%",
              border: "2px solid rgba(0,230,118,0.6)",
              animation: "speaking-ring 1s ease-in-out infinite", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: -10, borderRadius: "50%",
              border: "1.5px solid rgba(0,230,118,0.25)",
              animation: "speaking-ring 1.3s ease-in-out infinite 0.2s", pointerEvents: "none",
            }} />
          </>
        )}
        <div style={{
          width: 46, height: 46, borderRadius: 23, fontSize: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: seat.userId
            ? (isMe ? "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.15))" : "linear-gradient(135deg, rgba(108,92,231,0.18), rgba(108,92,231,0.08))")
            : "rgba(255,255,255,0.02)",
          border: seat.isLocked ? "2px solid rgba(255,215,0,0.3)"
            : isSpeaking ? "2px solid rgba(0,230,118,0.7)"
            : seat.userId ? "2px solid rgba(108,92,231,0.4)"
            : "2px dashed rgba(255,255,255,0.08)",
          boxShadow: role === "owner" && seat.userId ? "0 0 16px rgba(255,215,0,0.3), 0 3px 12px rgba(108,92,231,0.2)"
            : isSpeaking ? "0 0 22px rgba(0,230,118,0.45), 0 0 44px rgba(0,230,118,0.15)"
            : seat.userId ? "0 3px 12px rgba(108,92,231,0.15)" : "none",
          transition: "all 0.3s ease",
        }}>
          {seat.isLocked ? "\u{1F512}" : seat.userId ? (
            seat.avatar?.startsWith("http") ? <img src={seat.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 23, objectFit: "cover" }} /> : seat.avatar
          ) : (
            <span style={{ fontSize: 14, color: "rgba(255,255,255,0.12)" }}>+</span>
          )}
        </div>
        {role === "owner" && seat.userId && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 12, filter: "drop-shadow(0 1px 4px rgba(255,215,0,0.5))" }}>{"\u{1F451}"}</div>
        )}
        {role === "admin" && seat.userId && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 10 }}>{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && seat.userId && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 10 }}>{"\u{1F396}\uFE0F"}</div>
        )}
        {seat.userId && seat.isMuted && (
          <div style={{
            position: "absolute", bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7,
            background: "rgba(255,100,130,0.95)", border: "2px solid #0F0F1A",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7,
          }}>{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div style={{
            position: "absolute", top: -6, right: -4, fontSize: 12,
            animation: "handWave 0.8s ease-in-out infinite",
            filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
          }}>{"\u270B"}</div>
        )}
      </div>
      <span style={{
        fontSize: 8, fontWeight: 600, textAlign: "center",
        color: seat.userId ? (isMe ? "#A29BFE" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.15)",
        maxWidth: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {seat.isLocked ? "Locked" : seat.username || "Empty"}
      </span>
    </div>
  );
}
