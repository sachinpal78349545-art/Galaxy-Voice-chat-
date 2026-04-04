import React, { useState, useEffect, useRef } from "react";
import { storage, User, Conversation, Message } from "../lib/storage";

interface Props { user: User; }

const FAKE_USERS = [
  { id: "fake_1", name: "StarGazer",  avatar: "🌟", lastMsg: "Hey! Want to voice chat? 🎤" },
  { id: "fake_2", name: "MoonDancer", avatar: "🌙", lastMsg: "That room was amazing last night 💫" },
  { id: "fake_3", name: "CosmoKid",   avatar: "🚀", lastMsg: "Check out this new galaxy room!" },
  { id: "fake_4", name: "NightOwl",   avatar: "🦉", lastMsg: "We should collab sometime 🎵" },
  { id: "fake_5", name: "VoidWalker", avatar: "🌌", lastMsg: "Thanks for the gift! ❤️" },
];

export default function ChatsPage({ user }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Seed fake conversations if empty
    let c = storage.getConversations(user.id);
    if (c.length === 0) {
      FAKE_USERS.forEach(fu => {
        storage.getOrCreateConv(user.id, user.username, user.avatar, fu.id, fu.name, fu.avatar);
        storage.sendMessage(
          storage.getOrCreateConv(user.id, user.username, user.avatar, fu.id, fu.name, fu.avatar).id,
          fu.id, fu.lastMsg
        );
      });
    }
    setConvs(storage.getConversations(user.id));
  }, []);

  const openConv = (conv: Conversation) => {
    setActiveConv(conv);
    setMessages(storage.getMessages(conv.id));
  };

  const sendMsg = () => {
    const text = input.trim();
    if (!text || !activeConv) return;
    storage.sendMessage(activeConv.id, user.id, text);
    setMessages(storage.getMessages(activeConv.id));
    setConvs(storage.getConversations(user.id));
    setInput("");
    // Auto-reply after 1.5s
    setTimeout(() => {
      const otherId = activeConv.participants[0] === user.id ? activeConv.participants[1] : activeConv.participants[0];
      const replies = ["Nice! 😊","That's cool 🔥","Totally agree! ✨","Haha yes! 😂","For real! 💯","🌟","❤️","Let's go! 🚀"];
      storage.sendMessage(activeConv.id, otherId, replies[Math.floor(Math.random() * replies.length)]);
      setMessages(storage.getMessages(activeConv.id));
      setConvs(storage.getConversations(user.id));
    }, 1500);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (activeConv) {
    const otherId = activeConv.participants[0] === user.id ? activeConv.participants[1] : activeConv.participants[0];
    const otherIdx = activeConv.participants[0] === user.id ? 1 : 0;
    const otherName = activeConv.participantNames[otherIdx];
    const otherAvatar = activeConv.participantAvatars[otherIdx];

    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        {/* Chat header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "52px 16px 12px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}>
          <button onClick={() => setActiveConv(null)} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, width: 36, height: 36, cursor: "pointer", fontSize: 16, color: "#fff",
          }}>‹</button>
          <div className="avatar avatar-sm">{otherAvatar}</div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{otherName}</p>
            <p style={{ fontSize: 11, color: "#00e676" }}>● Online</p>
          </div>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 18 }}>📞</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px 8px" }}>
          {messages.map(msg => {
            const isSelf = msg.senderId === user.id;
            return (
              <div key={msg.id} style={{
                display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start",
                marginBottom: 10,
              }}>
                <div style={{
                  maxWidth: "72%", padding: "10px 14px", borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isSelf ? "linear-gradient(135deg, #6C5CE7, #A29BFE)" : "rgba(255,255,255,0.07)",
                  border: isSelf ? "none" : "1px solid rgba(255,255,255,0.08)",
                  fontSize: 14, color: "#fff", lineHeight: 1.4,
                  boxShadow: isSelf ? "0 4px 12px rgba(108,92,231,0.25)" : "none",
                }}>
                  {msg.text}
                  <div style={{ fontSize: 9, color: isSelf ? "rgba(255,255,255,0.5)" : "rgba(162,155,254,0.4)", marginTop: 3, textAlign: "right" }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 14px 28px", display: "flex", gap: 8, alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(10,5,30,0.7)", backdropFilter: "blur(12px)",
        }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 40, height: 40, padding: 0, fontSize: 20, borderRadius: 12 }}>😊</button>
          <input
            className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMsg()}
          />
          <button className="btn btn-primary btn-sm"
            style={{ width: 40, height: 40, padding: 0, borderRadius: 14, flexShrink: 0 }}
            onClick={sendMsg}>➤</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 16px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Messages 💬</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>🔍</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>✏️</button>
        </div>
      </div>

      <div style={{ padding: "0 14px", display: "flex", flexDirection: "column", gap: 2 }}>
        {convs.map(conv => {
          const otherIdx = conv.participants[0] === user.id ? 1 : 0;
          const otherName = conv.participantNames[otherIdx];
          const otherAvatar = conv.participantAvatars[otherIdx];
          const elapsed = Date.now() - conv.lastTime;
          const timeStr = elapsed < 3600000 ? `${Math.floor(elapsed/60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed/3600000)}h` : `${Math.floor(elapsed/86400000)}d`;

          return (
            <div key={conv.id} onClick={() => openConv(conv)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 4px",
              borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
              borderRadius: 14, transition: "background 0.15s",
            }}>
              <div style={{ position: "relative" }}>
                <div className="avatar avatar-md">{otherAvatar}</div>
                <div style={{
                  position: "absolute", bottom: 2, right: 2,
                  width: 10, height: 10, borderRadius: 5,
                  background: "#00e676", border: "1.5px solid #0F0F1A",
                }} />
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{otherName}</span>
                  <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{timeStr}</span>
                </div>
                <p style={{ fontSize: 13, color: "rgba(162,155,254,0.5)", overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
                  {conv.lastMessage}
                </p>
              </div>
              {conv.unread > 0 && (
                <div style={{
                  minWidth: 20, height: 20, borderRadius: 10,
                  background: "#6C5CE7", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 10, fontWeight: 700, padding: "0 5px",
                }}>
                  {conv.unread}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
