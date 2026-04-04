import React, { useState, useEffect, useRef } from "react";
import { UserProfile } from "../lib/userService";
import { storage, Conversation, Message } from "../lib/storage";

interface Props { user: UserProfile; }

const FAKE_CONTACTS = [
  { id: "fake_1", name: "StarGazer",  avatar: "🌟", lastMsg: "Hey! Let's voice chat 🎤" },
  { id: "fake_2", name: "CosmicDJ",   avatar: "🎵", lastMsg: "That room was 🔥" },
  { id: "fake_3", name: "LunaRose",   avatar: "🌙", lastMsg: "Want to collab? 💫" },
  { id: "fake_4", name: "NightOwl",   avatar: "🦉", lastMsg: "GM! Good energy today 🌟" },
  { id: "fake_5", name: "VoidWalker", avatar: "🌌", lastMsg: "Thanks for the gift! ❤️" },
  { id: "fake_6", name: "NebulaDev",  avatar: "💻", lastMsg: "Let me know when you're online" },
];

const AUTO_REPLIES = [
  "That's so cool! 🔥","Haha agreed! 😂","Send me the link!","For real? 🤯","Totally vibe with that ✨",
  "Let's do it! 🚀","❤️","💯","Sounds good!","I'm in! 🎉","What time? ⏰","Miss you in the room!",
];

export default function ChatsPage({ user }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const msgEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Seed conversations
    let c = storage.getConversations(user.uid);
    if (c.length === 0) {
      FAKE_CONTACTS.forEach(fc => {
        const conv = storage.getOrCreateConv(user.uid, user.name, user.avatar, fc.id, fc.name, fc.avatar);
        storage.sendMessage(conv.id, fc.id, fc.lastMsg);
      });
    }
    setConvs(storage.getConversations(user.uid));
  }, []);

  const openConv = (conv: Conversation) => {
    setActive(conv);
    setMsgs(storage.getMessages(conv.id));
  };

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const send = () => {
    const text = input.trim();
    if (!text || !active) return;
    storage.sendMessage(active.id, user.uid, text);
    setMsgs(storage.getMessages(active.id));
    setConvs(storage.getConversations(user.uid));
    setInput("");
    // Auto-reply
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setTimeout(() => {
      storage.sendMessage(active.id, otherId, AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)]);
      setMsgs(storage.getMessages(active.id));
      setConvs(storage.getConversations(user.uid));
    }, 1200 + Math.random() * 1200);
  };

  if (active) {
    const otherIdx = active.participants[0] === user.uid ? 1 : 0;
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <button onClick={() => setActive(null)} style={{
            width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 18, color: "#fff",
          }}>‹</button>
          <div style={{
            width: 40, height: 40, borderRadius: 20, fontSize: 20,
            background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{active.participantAvatars[otherIdx]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 15 }}>{active.participantNames[otherIdx]}</p>
            <p style={{ fontSize: 11, color: "#00e676" }}>● Online</p>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 18, width: 38, height: 38, padding: 0, borderRadius: 12 }}>📞</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 6px" }}>
          {msgs.map(msg => {
            const isSelf = msg.senderId === user.uid;
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", marginBottom: 10 }}>
                <div style={{
                  maxWidth: "74%", padding: "10px 14px", lineHeight: 1.45,
                  borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isSelf ? "linear-gradient(135deg,#6C5CE7,#A29BFE)" : "rgba(255,255,255,0.07)",
                  border: isSelf ? "none" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isSelf ? "0 4px 14px rgba(108,92,231,0.3)" : "none",
                  fontSize: 14, color: "#fff",
                }}>
                  {msg.text}
                  <div style={{ fontSize: 9, color: isSelf ? "rgba(255,255,255,0.45)" : "rgba(162,155,254,0.35)", marginTop: 3, textAlign: "right" }}>
                    {new Date(msg.timestamp).toLocaleTimeString([],{ hour:"2-digit", minute:"2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={msgEnd} />
        </div>
        <div style={{
          display: "flex", gap: 8, padding: "10px 14px 26px", alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,4,24,0.85)", backdropFilter: "blur(14px)", flexShrink: 0,
        }}>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "0 2px" }}>😊</button>
          <input
            className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
          />
          <button className="btn btn-primary btn-sm" style={{ width: 42, height: 42, padding: 0, borderRadius: 14, flexShrink: 0 }} onClick={send}>➤</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Messages 💬</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>🔍</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>✏️</button>
        </div>
      </div>

      <div style={{ padding: "0 14px" }}>
        {convs.map(conv => {
          const idx = conv.participants[0] === user.uid ? 1 : 0;
          const elapsed = Date.now() - conv.lastTime;
          const timeStr = elapsed < 3600000 ? `${Math.floor(elapsed/60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed/3600000)}h` : `${Math.floor(elapsed/86400000)}d`;
          return (
            <div key={conv.id} onClick={() => openConv(conv)} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
            }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 24, fontSize: 22,
                  background: "rgba(108,92,231,0.14)", border: "2px solid rgba(108,92,231,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{conv.participantAvatars[idx]}</div>
                <div style={{ position: "absolute", bottom: 2, right: 1, width: 10, height: 10, borderRadius: 5, background: "#00e676", border: "1.5px solid #0F0F1A" }} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{conv.participantNames[idx]}</span>
                  <span style={{ fontSize: 11, color: "rgba(162,155,254,0.35)" }}>{timeStr}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(162,155,254,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <div style={{
                  minWidth: 20, height: 20, borderRadius: 10, background: "#6C5CE7",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, padding: "0 5px",
                }}>{conv.unread}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
