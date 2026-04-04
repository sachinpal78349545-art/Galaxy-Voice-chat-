import React, { useState, useEffect, useRef } from "react";
import { Room, RoomMessage, subscribeRoom, subscribeRoomMessages, sendRoomMessage, raiseHand, kickFromSeat, muteUserSeat, toggleLockSeat, toggleMuteSeat, leaveSeat, joinSeat } from "../lib/roomService";
import { UserProfile, gainXP, sendGift, incrementStat } from "../lib/userService";
import { useToast } from "../lib/toastContext";

interface Props { roomId: string; user: UserProfile; onLeave: () => void; }

const EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u2728", "\u{1F602}", "\u{1F3B5}", "\u{1F44F}", "\u{1F31F}", "\u{1F4AF}", "\u{1F680}", "\u{1F60D}", "\u{1F389}", "\u{1F48E}"];
const GIFTS = [
  { emoji: "\u{1F381}", cost: 10 },
  { emoji: "\u{1F48E}", cost: 50 },
  { emoji: "\u{1F451}", cost: 100 },
  { emoji: "\u{1F339}", cost: 20 },
  { emoji: "\u{1F38A}", cost: 30 },
  { emoji: "\u{1F340}", cost: 15 },
  { emoji: "\u{1F98B}", cost: 25 },
  { emoji: "\u2B50", cost: 40 },
  { emoji: "\u{1F3B6}", cost: 35 },
  { emoji: "\u{1F4B0}", cost: 200 },
  { emoji: "\u{1F3C6}", cost: 500 },
  { emoji: "\u{1F52E}", cost: 75 },
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
  const [floats, setFloats] = useState<{ id: number; item: string; x: number }[]>([]);
  const [elapsed, setElapsed] = useState("0:00");
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const joinedRef = useRef(false);

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
    if (!room) return;
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

  const spawnFloat = (item: string) => {
    const id = floatId.current++;
    const x = 10 + Math.random() * 60;
    setFloats(prev => [...prev, { id, item, x }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 2800);
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

  const sendEmoji = async (e: string) => {
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
    const success = await sendGift(user.uid, user, recipientId, gift.emoji, gift.cost);
    if (!success) {
      showToast(`Not enough coins! Need ${gift.cost} coins`, "warning", "\u{1F48E}");
      return;
    }
    spawnFloat(gift.emoji);
    setShowGift(false);
    showToast(`Sent ${gift.emoji} to ${hostSeat?.username || room.host} (-${gift.cost} coins)`, "success");
    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent ${gift.emoji} gift to ${hostSeat?.username || room.host}`, type: "gift" }).catch(err => console.error("Gift message error:", err));
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

  const isHost = room?.hostId === user.uid;

  const handleHostAction = async (action: string, seatIdx: number) => {
    if (!room || !isHost) return;
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
      }
    } catch (err) {
      console.error("Host action error:", err);
      showToast("Action failed", "error");
    }
    setShowHostControls(false);
    setSelectedSeat(null);
  };

  const handleLeave = async () => {
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) await leaveSeat(roomId, mySeat).catch(err => console.error("Leave seat error:", err));
    }
    onLeave();
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
          position: "absolute", bottom: "42%", right: `${f.x}%`, fontSize: 38, zIndex: 500,
          pointerEvents: "none", animation: "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

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
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "6px 10px" }} onClick={() => { navigator.clipboard?.writeText(room.id); showToast("Room ID copied!", "info"); }}>{"\u{1F517}"}</button>
          <button className="btn btn-danger btn-sm" onClick={handleLeave}>Leave</button>
        </div>
      </div>

      <div style={{ padding: "10px 8px 6px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
          {room.seats.map((seat, i) => (
            <SeatCell
              key={i}
              seat={seat}
              isHost={i === 0}
              isMe={seat.userId === user.uid}
              isRoomHost={isHost}
              onHostAction={(action) => { setSelectedSeat(i); handleHostAction(action, i); }}
              onTap={() => {
                if (isHost && seat.userId && seat.userId !== user.uid) {
                  setSelectedSeat(i);
                  setShowHostControls(true);
                }
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 6, paddingBottom: 4 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6, animation: "slide-up 0.2s ease" }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{msg.avatar}</span>
              <div>
                <span style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", marginRight: 5, fontWeight: 600 }}>{msg.username}</span>
                <span style={{
                  fontSize: 13,
                  color: msg.type === "gift" ? "#FFD700" : msg.type === "system" ? "#00e676" : msg.userId === user.uid ? "#A29BFE" : "rgba(255,255,255,0.7)",
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
              onClick={() => { setShowEmoji(!showEmoji); setShowGift(false); }}>{"\u{1F60A}"}</button>
            {showEmoji && (
              <div style={{
                position: "absolute", bottom: 54, left: 0, background: "rgba(15,5,30,0.97)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: 10,
                display: "flex", flexWrap: "wrap", gap: 6, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
              }}>
                {EMOJIS.map(e => (
                  <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                    onClick={() => sendEmoji(e)}>{e}</button>
                ))}
              </div>
            )}
          </div>

          <button className="btn btn-ghost btn-sm"
            style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}
            onClick={handleRaiseHand}>{"\u270B"}</button>

          <button onClick={() => setIsMuted(!isMuted)} style={{
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
              onClick={() => { setShowGift(!showGift); setShowEmoji(false); }}>{"\u{1F381}"}</button>
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

          <button className="btn btn-ghost btn-sm"
            style={{ width: 46, height: 46, borderRadius: 14, padding: 0, fontSize: 22 }}>{"\u{1F50A}"}</button>
        </div>
      </div>

      {showHostControls && selectedSeat !== null && room.seats[selectedSeat]?.userId && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.7)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
        }} onClick={() => { setShowHostControls(false); setSelectedSeat(null); }}>
          <div className="card" style={{ width: 260, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{"\u{1F451}"} Host Controls</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 16 }}>{room.seats[selectedSeat].username}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => handleHostAction("mute", selectedSeat)}>{"\u{1F507}"} Mute User</button>
              <button className="btn btn-danger btn-full" onClick={() => handleHostAction("kick", selectedSeat)}>{"\u{1F6AB}"} Remove from Seat</button>
              <button className="btn btn-ghost btn-full" onClick={() => handleHostAction("lock", selectedSeat)}>{"\u{1F512}"} Lock Seat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SeatCellProps {
  seat: { userId: string | null; username: string | null; avatar: string | null; isMuted: boolean; isLocked: boolean; isSpeaking: boolean; handRaised?: boolean };
  isHost: boolean;
  isMe: boolean;
  isRoomHost: boolean;
  onHostAction: (action: string) => void;
  onTap: () => void;
}

function SeatCell({ seat, isHost, isMe, isRoomHost, onTap }: SeatCellProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: isRoomHost && seat.userId && !isMe ? "pointer" : "default" }} onClick={onTap}>
      <div style={{ position: "relative" }}>
        {seat.isSpeaking && (
          <>
            <div style={{
              position: "absolute", inset: -7, borderRadius: "50%",
              border: "2px solid rgba(0,230,118,0.55)",
              animation: "speaking-ring 1s ease-in-out infinite", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: -12, borderRadius: "50%",
              border: "1.5px solid rgba(0,230,118,0.25)",
              animation: "speaking-ring 1.3s ease-in-out infinite 0.2s", pointerEvents: "none",
            }} />
          </>
        )}
        <div style={{
          width: 50, height: 50, borderRadius: 25, fontSize: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: seat.userId ? (isMe ? "rgba(108,92,231,0.25)" : "rgba(108,92,231,0.14)") : "rgba(255,255,255,0.03)",
          border: seat.isLocked ? "2px solid rgba(255,215,0,0.3)"
            : seat.isSpeaking ? "2px solid rgba(0,230,118,0.7)"
            : seat.userId ? "2px solid rgba(108,92,231,0.4)"
            : "2px dashed rgba(255,255,255,0.1)",
          boxShadow: isHost && seat.userId ? "0 0 16px rgba(255,215,0,0.28)"
            : seat.isSpeaking ? "0 0 24px rgba(0,230,118,0.4), 0 0 48px rgba(0,230,118,0.15)" : "none",
          transition: "all 0.3s",
        }}>
          {seat.isLocked ? "\u{1F512}" : seat.userId ? seat.avatar : (
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.15)" }}>+</span>
          )}
        </div>
        {isHost && seat.userId && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 12 }}>{"\u{1F451}"}</div>
        )}
        {seat.userId && seat.isMuted && (
          <div style={{
            position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: 8,
            background: "rgba(255,100,130,0.95)", border: "1.5px solid #0F0F1A",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8,
          }}>{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div style={{
            position: "absolute", top: -6, right: -4, fontSize: 14,
            animation: "handWave 0.8s ease-in-out infinite",
          }}>{"\u270B"}</div>
        )}
      </div>
      <span style={{
        fontSize: 9, fontWeight: 600, textAlign: "center",
        color: seat.userId ? (isMe ? "#A29BFE" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.18)",
        maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {seat.isLocked ? "Locked" : seat.username || "Empty"}
      </span>
    </div>
  );
}
