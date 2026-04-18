import React from "react";
import { RoomMessage, cleanName } from "./types";

interface ChatSectionProps {
  messages: RoomMessage[];
  userId: string;
  msgEndRef: React.RefObject<HTMLDivElement>;
}

export default function ChatSection({ messages, userId, msgEndRef }: ChatSectionProps) {
  return (
    <div className="room-chat">
      {messages.map(msg => (
        <ChatBubble key={msg.id} msg={msg} isMe={msg.userId === userId} />
      ))}
      <div ref={msgEndRef} />
    </div>
  );
}

function ChatBubble({ msg, isMe }: { msg: RoomMessage; isMe: boolean }) {
  const isSystem = msg.type === "system" || msg.type === "join" || msg.type === "leave" || msg.type === "welcome";
  const isGift = msg.type === "gift";
  const isWelcome = msg.type === "welcome";
  const displayName = cleanName(msg.username);

  return (
    <div className="chat-msg" style={isWelcome ? { animation: "welcomeMsg 0.5s ease" } : undefined}>
      {isSystem ? (
        <div className={`chat-pill-system ${isWelcome ? "chat-pill-welcome" : ""}`} style={{
          fontSize: 10, lineHeight: 1.4, fontFamily: "'Poppins', 'Inter', sans-serif",
          color: isWelcome ? "#c4b5fd" : msg.type === "leave" ? "rgba(255,100,130,0.8)" : "rgba(255,255,255,0.8)",
          fontWeight: isWelcome ? 600 : 400, fontStyle: "italic",
          textShadow: isWelcome ? "0 1px 6px rgba(139,92,246,0.5)" : "0 1px 3px rgba(0,0,0,0.5)",
        }}>{msg.text}</div>
      ) : (
        <div className="chat-pill">
          {msg.avatar?.startsWith?.("http") ? (
            <img src={msg.avatar} alt="" style={{ width: 18, height: 18, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <span style={{ fontSize: 12, flexShrink: 0 }}>{msg.avatar && msg.avatar.length <= 4 ? msg.avatar : "\u{1F464}"}</span>
          )}
          <span className="chat-pill-name" style={{
            fontSize: 10, color: isMe ? "#2DD4BF" : "rgba(255,255,255,0.7)",
            fontWeight: 600, flexShrink: 0, fontFamily: "'Poppins', 'Inter', sans-serif",
          }}>{displayName}</span>
          <span className="chat-pill-text" style={{
            fontSize: msg.type === "emoji" ? 20 : 12, lineHeight: 1.3,
            color: isGift ? "#FFD700" : "#fff",
            fontWeight: isGift ? 600 : 400, fontFamily: "'Poppins', 'Inter', sans-serif",
          }}>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
