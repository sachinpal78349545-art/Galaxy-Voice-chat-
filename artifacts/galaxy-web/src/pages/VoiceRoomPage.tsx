import React, { useState, useEffect, useRef } from "react";
import { Room, RoomMessage, subscribeRoom, subscribeRoomMessages, sendRoomMessage, raiseHand, kickFromSeat, muteUserSeat, toggleLockSeat, toggleMuteSeat, leaveSeat, joinSeat, setCoHost, isHostOrCoHost } from "../lib/roomService";
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
  const [showHostControls, setShowHostControls] = useState(false);
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
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const joinedRef = useRef(false);
  const voiceInitRef = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeRoom(roomId, r => {
      setRoom(r);
      if (r && !joinedRef.current) {
        joinedRef.current = true;
        incrementStat(user.uid, "roomsJoined").catch(err => console.error("Stat error:", err));
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
      gainXP(user.uid, 3, user.xp, user.level).catch(err => console.error("XP error:", err));
      incrementStat(user.uid, "messagesSent").catch(err => console.error("Stat error:", err));
    } catch (err) {
      console.error("Chat send error:", err);
      showToast("Failed to send message", "error");
    }
  };

  const sendEmojiMsg = async (e: string) => {
    spawnFloat(e);
    setShowEmoji(false);
    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: e, type: "emoji" }).catch(err => {
      console.error("Emoji send error:", err);
      showToast("Failed to send emoji", "error");
    });
  };

  const handleGift = async (gift: typeof GIFTS[0]) => {
    if (!room) return;
    const hostSeat = room.seats.find(s => s.userId && s.userId !== user.uid);
    const recipientId = hostSeat?.userId || room.hostId;
    const recipientName = hostSeat?.username || room.host;
    const success = await sendGift(user.uid, user, recipientId, gift.emoji, gift.cost);
    if (!success) {
      showToast(`Not enough coins! Need ${gift.cost} coins`, "warning", "\u{1F48E}");
      return;
    }

    setGiftAnim({ emoji: gift.emoji, sender: user.name, receiver: recipientName });
    setTimeout(() => setGiftAnim(null), 3000);

    for (let i = 0; i < 3; i++) {
      setTimeout(() => spawnFloat(gift.emoji, true), i * 300);
    }
    setShowGift(false);
    showToast(`Sent ${gift.emoji} ${gift.name} to ${recipientName} (-${gift.cost} coins)`, "success");

    recordGift({
      senderId: user.uid, senderName: user.name, senderAvatar: user.avatar,
      receiverId: recipientId, receiverName: recipientName, receiverAvatar: hostSeat?.avatar || "\u{1F3A4}",
      giftEmoji: gift.emoji, coins: gift.cost, timestamp: Date.now(),
    }).catch(err => console.error("Gift record error:", err));

    sendNotification(recipientId, {
      type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}!`,
      icon: gift.emoji, fromUid: user.uid, fromName: user.name,
    }).catch(err => console.error("Notif error:", err));

    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent ${gift.emoji} ${gift.name} to ${recipientName}`, type: "gift" }).catch(err => console.error("Gift message error:", err));
  };

  const handleRaiseHand = async () => {
    if (!room) return;
    const mySeat = room.seats.findIndex(s => s.userId === user.uid);
    if (mySeat >= 0) {
      const raised = !room.seats[mySeat].handRaised;
      await raiseHand(roomId, mySeat, raised);
      showToast(raised ? "Hand raised! \u270B" : "Hand lowered", "info");
    } else {
      const emptySeat = room.seats.findIndex(s => !s.userId && !s.isLocked);
      if (emptySeat >= 0) {
        await joinSeat(roomId, emptySeat, user.uid, user.name, user.avatar);
        showToast("Joined a seat!", "success");
      } else {
        showToast("No seats available", "warning");
      }
    }
  };

  const hasControl = room ? isHostOrCoHost(room, user.uid) : false;
  const isHost = room?.hostId === user.uid;

  const handleHostAction = async (action: string, seatIdx: number) => {
    if (!room || !hasControl) return;
    try {
      if (action === "kick") {
        await kickFromSeat(roomId, seatIdx);
        showToast("User removed from seat", "info");
      } else if (action === "mute") {
        await muteUserSeat(roomId, seatIdx);
        showToast("User muted", "info");
      } else if (action === "lock") {
        await toggleLockSeat(roomId, seatIdx, !room.seats[seatIdx].isLocked);
        showToast(room.seats[seatIdx].isLocked ? "Seat unlocked" : "Seat locked", "info");
      } else if (action === "cohost") {
        const isCo = room.seats[seatIdx].isCoHost;
        await setCoHost(roomId, seatIdx, !isCo);
        showToast(isCo ? "Co-host removed" : "Co-host assigned!", "success");
      }
    } catch (err) {
      console.error("Host action error:", err);
      showToast("Action failed", "error");
    }
    setShowHostControls(false);
    setSelectedSeat(null);
  };

  const handleMicToggle = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await voiceService.setMuted(newMuted);
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) {
        toggleMuteSeat(roomId, mySeat, newMuted).catch(err => console.error("Mute error:", err));
      }
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
      if (mySeat >= 0) await leaveSeat(roomId, mySeat).catch(err => console.error("Leave seat error:", err));
    }
    onLeave();
  };

  const loadLeaderboard = async (period: LeaderboardPeriod) => {
    setLbPeriod(period);
    const entries = await getGiftLeaderboard(period, "senders");
    setLbEntries(entries);
  };

  const openLeaderboard = () => {
    setShowLeaderboard(true);
    loadLeaderboard("daily");
  };

  if (!room) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto", background: "linear-gradient(160deg, #1A0F2E 0%, #0F0F1A 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto",
      background: "linear-gradient(160deg, #1A0F2E 0%, #0F0F1A 100%)",
      display: "flex", flexDirection: "column",
    }}>
      {floats.map(f => (
        <div key={f.id} style={{
          position: "absolute", bottom: "42%", right: `${f.x}%`, fontSize: f.big ? 52 : 38, zIndex: 500,
          pointerEvents: "none", animation: f.big ? "giftFly 3.2s ease-out forwards" : "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

      {giftAnim && (
        <div style={{
          position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)",
          zIndex: 600, textAlign: "center", pointerEvents: "none", animation: "giftReveal 3s ease forwards",
        }}>
          <div style={{ fontSize: 80, animation: "giftBounce 0.6s ease infinite" }}>{giftAnim.emoji}</div>
          <div style={{ fontSize: 14, color: "#FFD700", fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.8)", marginTop: 8 }}>
            {giftAnim.sender} {"\u27A4"} {giftAnim.receiver}
          </div>
        </div>
      )}

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "50px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 2 }}>{room.name}</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>{room.host}</p>
            <span style={{ fontSize: 10, color: "rgba(0,230,118,0.7)" }}>{"\u25CF"} {room.seats.filter(s => s.userId).length + room.listeners} online</span>
            <span style={{ fontSize: 10, color: "rgba(162,155,254,0.3)" }}>{"\u23F1"} {elapsed}</span>
          </div>
          <span style={{ fontSize: 9, color: "rgba(162,155,254,0.25)", fontFamily: "monospace" }}>ID: {room.id.slice(0, 16)}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "6px 10px" }} onClick={openLeaderboard}>{"\u{1F3C6}"}</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "6px 10px" }} onClick={() => { navigator.clipboard?.writeText(room.id); showToast("Room ID copied!", "info"); }}>{"\u{1F517}"}</button>
          <button className="btn btn-danger btn-sm" onClick={handleLeave}>Leave</button>
        </div>
      </div>

      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10,
          background: "rgba(108,92,231,0.04)", borderRadius: 20, padding: "16px 8px",
          border: "1px solid rgba(108,92,231,0.08)",
        }}>
          {room.seats.map((seat, i) => (
            <SeatCell
              key={i}
              seat={seat}
              isHost={i === 0}
              isMe={seat.userId === user.uid}
              hasControl={hasControl}
              isSpeaking={seat.userId ? (voiceService.joined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : seat.isSpeaking) : false}
              onTap={() => {
                if (hasControl && seat.userId && seat.userId !== user.uid) {
                  setSelectedSeat(i);
                  setShowHostControls(true);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 8, paddingBottom: 6 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8,
              animation: "slide-up 0.2s ease",
              padding: "4px 8px", borderRadius: 12,
              background: msg.type === "gift" ? "rgba(255,215,0,0.06)" : msg.type === "system" ? "rgba(0,230,118,0.04)" : "transparent",
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: 12, fontSize: 13, flexShrink: 0,
                background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>{msg.avatar}</div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginRight: 6, fontWeight: 700 }}>{msg.username}</span>
                <span style={{
                  fontSize: 13, lineHeight: 1.4,
                  color: msg.type === "gift" ? "#FFD700" : msg.type === "system" ? "#00e676" : msg.userId === user.uid ? "#A29BFE" : "rgba(255,255,255,0.75)",
                  fontWeight: msg.type === "gift" ? 700 : 400,
                }}>{msg.text}</span>
              </div>
            </div>
          ))}
          <div ref={msgEnd} />
        </div>
      </div>

      <div style={{
        padding: "8px 14px 24px", borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(8,4,24,0.8)", backdropFilter: "blur(14px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Chat here..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <button className="btn btn-primary btn-sm" style={{ borderRadius: 22, padding: "10px 18px", flexShrink: 0 }}
            onClick={sendChat}>{"\u27A4"}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}
              onClick={() => { setShowEmoji(!showEmoji); setShowGift(false); setShowVolume(false); }}>{"\u{1F60A}"}</button>
            {showEmoji && (
              <div style={{
                position: "absolute", bottom: 54, left: 0, background: "rgba(15,5,30,0.97)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: 10,
                display: "flex", flexWrap: "wrap", gap: 6, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
              }}>
                {EMOJIS.map(e => (
                  <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                    onClick={() => sendEmojiMsg(e)}>{e}</button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-ghost btn-sm"
            style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}
            onClick={handleRaiseHand}>{"\u270B"}</button>

          <button onClick={handleMicToggle} style={{
            width: 66, height: 66, borderRadius: 33, border: "none", cursor: "pointer",
            background: isMuted ? "rgba(255,100,130,0.18)" : "linear-gradient(135deg,#6C5CE7,#A29BFE)",
            color: "#fff", fontSize: 26, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isMuted ? "0 0 18px rgba(255,100,130,0.4)" : "0 0 28px rgba(108,92,231,0.6), 0 0 56px rgba(108,92,231,0.25)",
            animation: !isMuted ? "pulse-glow 2s infinite" : "none",
            transition: "all 0.25s",
          }}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</button>

          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}
              onClick={() => { setShowGift(!showGift); setShowEmoji(false); setShowVolume(false); }}>{"\u{1F381}"}</button>
            {showGift && (
              <div style={{
                position: "absolute", bottom: 54, right: 0, background: "rgba(15,5,30,0.97)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: 10,
                display: "flex", flexDirection: "column", gap: 4, width: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
              }}>
                <div style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 4, fontWeight: 700 }}>Send Gift ({"\u{1F48E}"}{user.coins} coins)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {GIFTS.map(g => (
                    <button key={g.emoji} onClick={() => handleGift(g)} style={{
                      background: user.coins >= g.cost ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(108,92,231,0.2)", borderRadius: 12,
                      cursor: user.coins >= g.cost ? "pointer" : "not-allowed",
                      padding: "6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      opacity: user.coins >= g.cost ? 1 : 0.4,
                    }}>
                      <span style={{ fontSize: 20 }}>{g.emoji}</span>
                      <span style={{ fontSize: 9, color: "#FFD700", fontWeight: 700 }}>{g.cost}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}
              onClick={() => { setShowVolume(!showVolume); setShowEmoji(false); setShowGift(false); }}>{"\u{1F50A}"}</button>
            {showVolume && (
              <div style={{
                position: "absolute", bottom: 54, right: 0, background: "rgba(15,5,30,0.97)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: 12,
                width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
              }}>
                <div style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 8, fontWeight: 700 }}>Volume Control</div>
                {room.seats.filter(s => s.userId && s.userId !== user.uid).map(s => {
                  const uid = Math.abs(hashCode(s.userId!)) % 1000000;
                  return (
                    <div key={s.userId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 14 }}>{s.avatar}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", width: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.username}</span>
                      <input type="range" min="0" max="100" value={volumeSliders[uid] ?? 100}
                        onChange={e => handleVolumeChange(uid, parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: "#6C5CE7", height: 4 }}
                      />
                    </div>
                  );
                })}
                {room.seats.filter(s => s.userId && s.userId !== user.uid).length === 0 && (
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", textAlign: "center" }}>No other users</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showHostControls && selectedSeat !== null && room.seats[selectedSeat]?.userId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
        }} onClick={() => { setShowHostControls(false); setSelectedSeat(null); }}>
          <div className="card" style={{ width: 260, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{"\u{1F451}"} {isHost ? "Host" : "Co-Host"} Controls</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 16 }}>{room.seats[selectedSeat].username}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => handleHostAction("mute", selectedSeat)}>{"\u{1F507}"} Mute User</button>
              <button className="btn btn-danger btn-full" onClick={() => handleHostAction("kick", selectedSeat)}>{"\u{1F6AB}"} Remove from Seat</button>
              <button className="btn btn-ghost btn-full" onClick={() => handleHostAction("lock", selectedSeat)}>{"\u{1F512}"} Lock Seat</button>
              {isHost && (
                <button className="btn btn-ghost btn-full" onClick={() => handleHostAction("cohost", selectedSeat)}>
                  {room.seats[selectedSeat].isCoHost ? "\u274C Remove Co-Host" : "\u{1F451} Make Co-Host"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showLeaderboard && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.88)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 600,
        }} onClick={() => setShowLeaderboard(false)}>
          <div className="card" style={{
            width: "100%", maxWidth: 400, borderRadius: "24px 24px 0 0",
            padding: 24, animation: "slide-up 0.3s ease", maxHeight: "65vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{"\u{1F3C6}"} Gift Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 12, flexShrink: 0 }}>
              {(["daily", "weekly", "monthly"] as LeaderboardPeriod[]).map(p => (
                <button key={p} onClick={() => loadLeaderboard(p)} style={{
                  flex: 1, padding: "8px 0", borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: lbPeriod === p ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                  color: lbPeriod === p ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 12, fontWeight: 700, textTransform: "capitalize",
                }}>{p}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {lbEntries.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 32 }}>No gifts yet this period</p>
              ) : (
                lbEntries.map((entry, i) => (
                  <div key={entry.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 16, fontWeight: 900, width: 24, textAlign: "center", color: i < 3 ? "#FFD700" : "rgba(162,155,254,0.4)" }}>
                      {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `${i + 1}`}
                    </span>
                    <span style={{ fontSize: 20 }}>{entry.avatar}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{entry.name}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD700" }}>{"\u{1F48E}"}{entry.totalCoins}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
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
  seat: { userId: string | null; username: string | null; avatar: string | null; isMuted: boolean; isLocked: boolean; isSpeaking: boolean; handRaised?: boolean; isCoHost?: boolean };
  isHost: boolean;
  isMe: boolean;
  hasControl: boolean;
  isSpeaking: boolean;
  onTap: () => void;
}

function SeatCell({ seat, isHost, isMe, hasControl, isSpeaking, onTap }: SeatCellProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
      cursor: hasControl && seat.userId && !isMe ? "pointer" : "default",
      transition: "transform 0.15s ease",
    }} onClick={onTap}>
      <div style={{ position: "relative" }}>
        {isSpeaking && (
          <>
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              border: "2.5px solid rgba(0,230,118,0.6)",
              animation: "speaking-ring 1s ease-in-out infinite", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: -14, borderRadius: "50%",
              border: "1.5px solid rgba(0,230,118,0.25)",
              animation: "speaking-ring 1.3s ease-in-out infinite 0.2s", pointerEvents: "none",
            }} />
          </>
        )}
        <div style={{
          width: 56, height: 56, borderRadius: 28, fontSize: 26,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: seat.userId
            ? (isMe ? "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(108,92,231,0.15))" : "linear-gradient(135deg, rgba(108,92,231,0.18), rgba(108,92,231,0.08))")
            : "rgba(255,255,255,0.02)",
          border: seat.isLocked ? "2.5px solid rgba(255,215,0,0.3)"
            : isSpeaking ? "2.5px solid rgba(0,230,118,0.7)"
            : seat.userId ? "2.5px solid rgba(108,92,231,0.4)"
            : "2.5px dashed rgba(255,255,255,0.08)",
          boxShadow: isHost && seat.userId ? "0 0 20px rgba(255,215,0,0.3), 0 4px 16px rgba(108,92,231,0.2)"
            : isSpeaking ? "0 0 28px rgba(0,230,118,0.45), 0 0 56px rgba(0,230,118,0.15)"
            : seat.userId ? "0 4px 16px rgba(108,92,231,0.15)" : "none",
          transition: "all 0.3s ease",
        }}>
          {seat.isLocked ? "\u{1F512}" : seat.userId ? seat.avatar : (
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.12)" }}>+</span>
          )}
        </div>
        {isHost && seat.userId && (
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 14, filter: "drop-shadow(0 1px 4px rgba(255,215,0,0.5))" }}>{"\u{1F451}"}</div>
        )}
        {seat.isCoHost && !isHost && seat.userId && (
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 12 }}>{"\u{1F396}\uFE0F"}</div>
        )}
        {seat.userId && seat.isMuted && (
          <div style={{
            position: "absolute", bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9,
            background: "rgba(255,100,130,0.95)", border: "2px solid #0F0F1A",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
          }}>{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div style={{
            position: "absolute", top: -7, right: -5, fontSize: 16,
            animation: "handWave 0.8s ease-in-out infinite",
            filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
          }}>{"\u270B"}</div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, textAlign: "center",
        color: seat.userId ? (isMe ? "#A29BFE" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.15)",
        maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {seat.isLocked ? "Locked" : seat.username || "Empty"}
      </span>
    </div>
  );
}
