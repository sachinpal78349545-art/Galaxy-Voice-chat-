import React, { useState, useEffect, useRef } from "react";
import { storage, User, Room, RoomMessage } from "../lib/storage";
import { voiceService } from "../lib/voiceService";

interface Props { room: Room; user: User; onLeave: () => void; }

const EMOJIS = ["❤️","🔥","✨","😂","🎵","👏","🌟","💯","🚀","😍"];

export default function VoiceRoomPage({ room: initialRoom, user, onLeave }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isMuted, setIsMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [emojiFloat, setEmojiFloat] = useState<{ id: number; emoji: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  let floatId = useRef(0);

  useEffect(() => {
    voiceService.init().then(() => voiceService.join(room.id, Math.floor(Math.random() * 999999)));

    // Simulate speaking animations every 2s
    const interval = setInterval(() => {
      const fresh = storage.getRoom(room.id);
      if (fresh) {
        const updated = { ...fresh };
        updated.seats = fresh.seats.map(s => {
          if (s.userId && !s.isMuted) return { ...s, isSpeaking: Math.random() > 0.55 };
          return { ...s, isSpeaking: false };
        });
        setRoom(updated);
      }
    }, 2000);

    return () => {
      clearInterval(interval);
      voiceService.leave();
    };
  }, [room.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [room.messages]);

  const toggleMic = async () => {
    const next = !isMuted;
    setIsMuted(next);
    await voiceService.setMuted(next);
    storage.addXP(user.id, 2);
  };

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;
    const updated = storage.addRoomMessage(room.id, {
      userId: user.id, username: user.username, avatar: user.avatar, text,
    });
    setRoom(updated);
    setInputText("");
    storage.addXP(user.id, 5);
  };

  const sendEmoji = (emoji: string) => {
    sendEmojiFloat(emoji);
    const updated = storage.addRoomMessage(room.id, {
      userId: user.id, username: user.username, avatar: user.avatar, text: emoji,
    });
    setRoom(updated);
  };

  const sendEmojiFloat = (emoji: string) => {
    const id = floatId.current++;
    setEmojiFloat(prev => [...prev, { id, emoji }]);
    setTimeout(() => setEmojiFloat(prev => prev.filter(e => e.id !== id)), 2500);
  };

  const GIFTS = ["🎁","💎","👑","🌹","🎊","🍀","🦋","⭐","🎶","💰"];

  const sendGift = (gift: string) => {
    sendEmojiFloat(gift);
    setShowGift(false);
    const updated = storage.addRoomMessage(room.id, {
      userId: user.id, username: user.username, avatar: user.avatar, text: `gifted ${gift} 🎁`,
    });
    setRoom(updated);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "linear-gradient(160deg, #1A0F2E 0%, #0F0F1A 100%)",
      display: "flex", flexDirection: "column", maxWidth: 400, margin: "0 auto",
    }}>
      {/* Floating emojis */}
      {emojiFloat.map(e => (
        <div key={e.id} style={{
          position: "absolute", bottom: "40%", right: 20,
          fontSize: 36, zIndex: 400, pointerEvents: "none",
          animation: "emojiFloat 2.5s ease-out forwards",
        }}>
          {e.emoji}
        </div>
      ))}
      <style>{`
        @keyframes emojiFloat {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(-160px) scale(1.6); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "52px 16px 10px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800 }}>{room.name}</h2>
          <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>
            hosted by {room.host} · {room.listeners + room.seats.filter(s=>s.userId).length} online
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost btn-sm">🔗 Share</button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => { voiceService.leave(); onLeave(); }}
          >Leave</button>
        </div>
      </div>

      {/* Seat Grid */}
      <div style={{ padding: "16px 12px 6px", flex: "0 0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {room.seats.map((seat, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{ position: "relative" }}>
                {/* Speaking ring */}
                {seat.isSpeaking && (
                  <div style={{
                    position: "absolute", inset: -6, borderRadius: "50%",
                    border: "2px solid rgba(0,230,118,0.5)",
                    animation: "speaking-ring 0.9s ease-in-out infinite",
                    pointerEvents: "none",
                  }} />
                )}
                <div style={{
                  width: 62, height: 62, borderRadius: "50%",
                  background: seat.userId ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                  border: seat.isLocked
                    ? "2px solid rgba(255,215,0,0.3)"
                    : seat.isSpeaking
                      ? "2px solid rgba(0,230,118,0.6)"
                      : seat.userId
                        ? "2px solid rgba(108,92,231,0.4)"
                        : "2px dashed rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, cursor: seat.userId ? "default" : "pointer",
                  boxShadow: seat.isSpeaking
                    ? "0 0 18px rgba(0,230,118,0.35)"
                    : i === 0
                      ? "0 0 14px rgba(255,215,0,0.3)"
                      : "none",
                  transition: "all 0.3s",
                }}>
                  {seat.isLocked ? "🔒" : seat.userId ? seat.avatar : (
                    <span style={{ fontSize: 18, color: "rgba(255,255,255,0.18)" }}>+</span>
                  )}
                </div>
                {/* Host crown */}
                {i === 0 && (
                  <div style={{
                    position: "absolute", top: -8, left: "50%", transform: "translateX(-50%)",
                    fontSize: 14,
                  }}>👑</div>
                )}
                {/* Muted badge */}
                {seat.userId && seat.isMuted && (
                  <div style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 18, height: 18, borderRadius: 9,
                    background: "rgba(255,100,130,0.9)", border: "1.5px solid #0F0F1A",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 9,
                  }}>🔇</div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, textAlign: "center",
                color: seat.userId ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.18)",
                maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {seat.isLocked ? "Locked" : seat.username || "Empty"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chat section */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: "0 14px" }}>
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8, paddingTop: 4 }}>
          {(room.messages || []).map(msg => (
            <RoomMsg key={msg.id} msg={msg} isSelf={msg.userId === user.id} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Controls */}
      <div style={{
        padding: "10px 14px 28px",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(10,5,30,0.7)", backdropFilter: "blur(12px)",
      }}>
        {/* Chat input */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            className="input-field"
            style={{ flex: 1, padding: "10px 14px", fontSize: 13, borderRadius: 22 }}
            placeholder="Chat in room..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
          />
          <button className="btn btn-primary btn-sm"
            style={{ borderRadius: 22, padding: "10px 16px", flexShrink: 0 }}
            onClick={sendMessage}>➤</button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around" }}>
          {/* Emoji */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 48, height: 48, borderRadius: 16, padding: 0, fontSize: 22 }}
              onClick={() => { setShowEmoji(!showEmoji); setShowGift(false); }}>
              😊
            </button>
            {showEmoji && (
              <div style={{
                position: "absolute", bottom: 58, left: 0,
                background: "rgba(26,15,46,0.96)", border: "1px solid rgba(108,92,231,0.2)",
                borderRadius: 16, padding: 10, display: "flex", flexWrap: "wrap", gap: 6, width: 180,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 10,
              }}>
                {EMOJIS.map(e => (
                  <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 2 }}
                    onClick={() => { sendEmoji(e); setShowEmoji(false); }}>{e}</button>
                ))}
              </div>
            )}
          </div>

          {/* MIC — main button */}
          <button
            onClick={toggleMic}
            style={{
              width: 68, height: 68, borderRadius: 34, border: "none", cursor: "pointer",
              background: isMuted ? "rgba(255,100,130,0.2)" : "linear-gradient(135deg, #6C5CE7, #A29BFE)",
              color: "#fff", fontSize: 26,
              boxShadow: isMuted ? "0 0 16px rgba(255,100,130,0.35)" : "0 0 24px rgba(108,92,231,0.5), 0 0 48px rgba(108,92,231,0.2)",
              animation: !isMuted ? "pulse-glow 2s infinite" : "none",
              transition: "all 0.2s",
            }}>
            {isMuted ? "🔇" : "🎤"}
          </button>

          {/* Gift */}
          <div style={{ position: "relative" }}>
            <button className="btn btn-ghost btn-sm"
              style={{ width: 48, height: 48, borderRadius: 16, padding: 0, fontSize: 22 }}
              onClick={() => { setShowGift(!showGift); setShowEmoji(false); }}>
              🎁
            </button>
            {showGift && (
              <div style={{
                position: "absolute", bottom: 58, right: 0,
                background: "rgba(26,15,46,0.96)", border: "1px solid rgba(108,92,231,0.2)",
                borderRadius: 16, padding: 10, display: "flex", flexWrap: "wrap", gap: 6, width: 180,
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 10,
              }}>
                {GIFTS.map(g => (
                  <button key={g} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: 2 }}
                    onClick={() => sendGift(g)}>{g}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RoomMsg({ msg, isSelf }: { msg: RoomMessage; isSelf: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{msg.avatar}</span>
      <div>
        <span style={{ fontSize: 10, color: "rgba(162,155,254,0.5)", marginRight: 4 }}>{msg.username}</span>
        <span style={{ fontSize: 13, color: isSelf ? "#A29BFE" : "rgba(255,255,255,0.75)" }}>{msg.text}</span>
      </div>
    </div>
  );
}
