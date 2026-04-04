import React, { useState, useEffect, useRef } from "react";
import { storage, Room, RoomMessage } from "../lib/storage";
import { UserProfile, gainXP } from "../lib/userService";

interface Props { room: Room; user: UserProfile; onLeave: () => void; }

const EMOJIS = ["❤️","🔥","✨","😂","🎵","👏","🌟","💯","🚀","😍","🎉","💎"];
const GIFTS  = ["🎁","💎","👑","🌹","🎊","🍀","🦋","⭐","🎶","💰","🏆","🔮"];

export default function VoiceRoomPage({ room: initialRoom, user, onLeave }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [floats, setFloats] = useState<{ id: number; item: string }[]>([]);
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate dynamic speakers
    const t = setInterval(() => {
      const fresh = storage.getRoom(room.id);
      if (!fresh) return;
      const updated = {
        ...fresh,
        seats: fresh.seats.map(s =>
          s.userId && !s.isMuted ? { ...s, isSpeaking: Math.random() > 0.5 } : { ...s, isSpeaking: false }
        ),
      };
      setRoom(updated);
    }, 2200);
    return () => clearInterval(t);
  }, [room.id]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [room.messages]);

  const spawnFloat = (item: string) => {
    const id = floatId.current++;
    setFloats(prev => [...prev, { id, item }]);
    setTimeout(() => setFloats(prev => prev.filter(f => f.id !== id)), 2800);
  };

  const sendChat = () => {
    const text = inputText.trim();
    if (!text) return;
    const updated = storage.addRoomMessage(room.id, { userId: user.uid, username: user.name, avatar: user.avatar, text });
    setRoom(updated);
    setInputText("");
    gainXP(user.uid, 3, user.xp, user.level).catch(() => {});
  };

  const sendEmoji = (e: string) => {
    spawnFloat(e);
    setShowEmoji(false);
    const updated = storage.addRoomMessage(room.id, { userId: user.uid, username: user.name, avatar: user.avatar, text: e });
    setRoom(updated);
  };

  const sendGift = (g: string) => {
    spawnFloat(g);
    setShowGift(false);
    const updated = storage.addRoomMessage(room.id, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent a gift ${g} 🎁` });
    setRoom(updated);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto",
      background: "linear-gradient(160deg, #1A0F2E 0%, #0F0F1A 100%)",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @keyframes emojiFloat {
          from { opacity:1; transform:translateY(0) scale(1); }
          to   { opacity:0; transform:translateY(-200px) scale(2); }
        }
      `}</style>

      {/* Floating items */}
      {floats.map(f => (
        <div key={f.id} style={{
          position: "absolute", bottom: "42%", right: 24, fontSize: 38, zIndex: 500,
          pointerEvents: "none", animation: "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "50px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{room.name}</h2>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)" }}>
            {room.host} · {room.seats.filter(s=>s.userId).length + room.listeners} online
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm">🔗</button>
          <button className="btn btn-danger btn-sm" onClick={onLeave}>Leave</button>
        </div>
      </div>

      {/* Seat grid */}
      <div style={{ padding: "14px 10px 6px", flexShrink: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
          {room.seats.map((seat, i) => (
            <SeatCell key={i} seat={seat} isHost={i === 0} isMe={seat.userId === user.uid} />
          ))}
        </div>
      </div>

      {/* Chat */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingTop: 6, paddingBottom: 4 }}>
          {(room.messages || []).map(msg => (
            <div key={msg.id} style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{msg.avatar}</span>
              <div>
                <span style={{ fontSize: 10, color: "rgba(162,155,254,0.45)", marginRight: 5, fontWeight: 600 }}>{msg.username}</span>
                <span style={{ fontSize: 13, color: msg.userId === user.uid ? "#A29BFE" : "rgba(255,255,255,0.7)" }}>{msg.text}</span>
              </div>
            </div>
          ))}
          <div ref={msgEnd} />
        </div>
      </div>

      {/* Controls */}
      <div style={{
        padding: "10px 14px 26px", borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(8,4,24,0.8)", backdropFilter: "blur(14px)", flexShrink: 0,
      }}>
        {/* Input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Chat here..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <button className="btn btn-primary btn-sm" style={{ borderRadius: 22, padding: "10px 18px", flexShrink: 0 }}
            onClick={sendChat}>➤</button>
        </div>

        {/* Buttons row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          {/* Emoji */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 50, height: 50, borderRadius: 16, padding: 0, fontSize: 24 }}
              onClick={() => { setShowEmoji(!showEmoji); setShowGift(false); }}>😊</button>
            {showEmoji && (
              <div style={{
                position: "absolute", bottom: 58, left: 0, background: "rgba(15,5,30,0.97)",
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

          {/* Sound */}
          <button className="btn btn-ghost btn-sm"
            style={{ width: 50, height: 50, borderRadius: 16, padding: 0, fontSize: 24 }}>🔊</button>

          {/* MIC — center */}
          <button onClick={() => setIsMuted(!isMuted)} style={{
            width: 70, height: 70, borderRadius: 35, border: "none", cursor: "pointer",
            background: isMuted ? "rgba(255,100,130,0.18)" : "linear-gradient(135deg,#6C5CE7,#A29BFE)",
            color: "#fff", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: isMuted ? "0 0 18px rgba(255,100,130,0.4)" : "0 0 28px rgba(108,92,231,0.6), 0 0 56px rgba(108,92,231,0.25)",
            animation: !isMuted ? "pulse-glow 2s infinite" : "none",
            transition: "all 0.25s",
          }}>{isMuted ? "🔇" : "🎤"}</button>

          {/* Gift */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 50, height: 50, borderRadius: 16, padding: 0, fontSize: 24 }}
              onClick={() => { setShowGift(!showGift); setShowEmoji(false); }}>🎁</button>
            {showGift && (
              <div style={{
                position: "absolute", bottom: 58, right: 0, background: "rgba(15,5,30,0.97)",
                border: "1px solid rgba(108,92,231,0.2)", borderRadius: 18, padding: 10,
                display: "flex", flexWrap: "wrap", gap: 6, width: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", zIndex: 20,
              }}>
                {GIFTS.map(g => (
                  <button key={g} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                    onClick={() => sendGift(g)}>{g}</button>
                ))}
              </div>
            )}
          </div>

          {/* Mute speaker */}
          <button className="btn btn-ghost btn-sm"
            style={{ width: 50, height: 50, borderRadius: 16, padding: 0, fontSize: 24 }}>🔕</button>
        </div>
      </div>
    </div>
  );
}

interface SeatCellProps {
  seat: { userId: string | null; username: string | null; avatar: string | null; isMuted: boolean; isLocked: boolean; isSpeaking: boolean };
  isHost: boolean;
  isMe: boolean;
}

function SeatCell({ seat, isHost, isMe }: SeatCellProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative" }}>
        {seat.isSpeaking && (
          <div style={{
            position: "absolute", inset: -7, borderRadius: "50%",
            border: "2px solid rgba(0,230,118,0.55)",
            animation: "speaking-ring 1s ease-in-out infinite", pointerEvents: "none",
          }} />
        )}
        <div style={{
          width: 58, height: 58, borderRadius: 29, fontSize: 26,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: seat.userId ? (isMe ? "rgba(108,92,231,0.25)" : "rgba(108,92,231,0.14)") : "rgba(255,255,255,0.03)",
          border: seat.isLocked ? "2px solid rgba(255,215,0,0.3)"
            : seat.isSpeaking ? "2px solid rgba(0,230,118,0.7)"
            : seat.userId ? "2px solid rgba(108,92,231,0.4)"
            : "2px dashed rgba(255,255,255,0.1)",
          boxShadow: isHost && seat.userId ? "0 0 16px rgba(255,215,0,0.28)"
            : seat.isSpeaking ? "0 0 20px rgba(0,230,118,0.35)" : "none",
          transition: "all 0.3s",
        }}>
          {seat.isLocked ? "🔒" : seat.userId ? seat.avatar : (
            <span style={{ fontSize: 20, color: "rgba(255,255,255,0.15)" }}>+</span>
          )}
        </div>
        {isHost && seat.userId && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 14 }}>👑</div>
        )}
        {seat.userId && seat.isMuted && (
          <div style={{
            position: "absolute", bottom: -1, right: -1, width: 18, height: 18, borderRadius: 9,
            background: "rgba(255,100,130,0.95)", border: "1.5px solid #0F0F1A",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9,
          }}>🔇</div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, textAlign: "center",
        color: seat.userId ? (isMe ? "#A29BFE" : "rgba(255,255,255,0.75)") : "rgba(255,255,255,0.18)",
        maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {seat.isLocked ? "Locked" : seat.username || "Empty"}
      </span>
    </div>
  );
}
