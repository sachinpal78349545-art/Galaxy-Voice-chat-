import React, { useState, useEffect, useRef } from "react";
import { UserProfile, incrementStat, getUser, followUser, unfollowUser } from "../lib/userService";
import { Conversation, ChatMessage, subscribeConversations, subscribeMessages, sendMessage, sendImageMessage, setTyping, subscribeTyping, markRead } from "../lib/chatService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; }

const EMOJI_GRID = [
  "\u{1F600}","\u{1F602}","\u{1F60D}","\u{1F618}","\u{1F970}","\u{1F60E}","\u{1F913}","\u{1F60F}",
  "\u{1F622}","\u{1F62D}","\u{1F621}","\u{1F631}","\u{1F92F}","\u{1F973}","\u{1F929}","\u{1F644}",
  "\u2764\uFE0F","\u{1F525}","\u{1F44D}","\u{1F44F}","\u{1F64F}","\u{1F4AA}","\u{1F91D}","\u270C\uFE0F",
  "\u{1F31F}","\u2728","\u{1F389}","\u{1F381}","\u{1F680}","\u{1F30C}","\u{1F48E}","\u{1F4AF}",
];

export default function ChatsPage({ user }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTypingState] = useState<Record<string, boolean>>({});
  const msgEnd = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = subscribeConversations(user.uid, (c: Conversation[]) => {
      setConvs(c);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (!active) return;
    const unsub1 = subscribeMessages(active.id, setMsgs);
    const unsub2 = subscribeTyping(active.id, setTypingState);
    markRead(active.id, user.uid).catch(() => {});
    return () => {
      unsub1(); unsub2();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [active?.id]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !active) return;
    try {
      await sendMessage(active.id, user.uid, text);
      setInput("");
      setShowEmojiPicker(false);
      setTyping(active.id, user.uid, false);
      incrementStat(user.uid, "messagesSent").catch(() => {});
    } catch { showToast("Failed to send message", "error"); }
  };

  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    try {
      showToast("Uploading image...", "info", "\u{1F4F7}");
      await sendImageMessage(active.id, user.uid, file);
      showToast("Image sent!", "success");
    } catch { showToast("Failed to send image", "error"); }
  };

  const handleTyping = (val: string) => {
    setInput(val);
    if (!active) return;
    setTyping(active.id, user.uid, true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(active.id, user.uid, false);
    }, 2000);
  };

  const otherTyping = active ? Object.entries(typing).some(([k, v]) => k !== user.uid && v) : false;

  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setIsFollowing((user.followingList || []).includes(otherId));
    getUser(otherId).then(u => {
      if (u) setOtherOnline(u.online ?? false);
    }).catch(() => {});
  }, [active?.id, user.followingList]);

  const handleFollow = async () => {
    if (!active || followLoading) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(user.uid, otherId);
        setIsFollowing(false);
        showToast("Unfollowed", "info");
      } else {
        await followUser(user.uid, otherId);
        setIsFollowing(true);
        showToast("Following!", "success", "\u2764\uFE0F");
      }
    } catch {
      showToast("Action failed", "error");
    } finally {
      setFollowLoading(false);
    }
  };

  if (active) {
    const otherIdx = active.participants[0] === user.uid ? 1 : 0;
    const statusText = otherTyping ? "typing..." : otherOnline ? "\u25CF Online" : "\u25CB Offline";
    const statusColor = otherTyping ? "#A29BFE" : otherOnline ? "#00e676" : "rgba(162,155,254,0.4)";
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <button onClick={() => { setActive(null); setShowEmojiPicker(false); }} style={{
            width: 38, height: 38, borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 18, color: "#fff",
          }}>{"\u2039"}</button>
          <div style={{
            width: 40, height: 40, borderRadius: 20, fontSize: 20,
            background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>{active.participantAvatars[otherIdx]}</div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 800, fontSize: 15 }}>{active.participantNames[otherIdx]}</p>
            <p style={{ fontSize: 11, color: statusColor }}>
              {statusText}
            </p>
          </div>
          <button
            className={`btn btn-sm ${isFollowing ? "btn-ghost" : "btn-primary"}`}
            style={{ fontSize: 11, padding: "5px 12px", borderRadius: 14 }}
            onClick={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 18, width: 38, height: 38, padding: 0, borderRadius: 12 }}>{"\u{1F4DE}"}</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 6px" }}>
          {msgs.map(msg => {
            const isSelf = msg.senderId === user.uid;
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: isSelf ? "flex-end" : "flex-start", marginBottom: 10, animation: "slide-up 0.2s ease" }}>
                <div style={{
                  maxWidth: "74%", padding: msg.type === "image" ? 4 : "10px 14px", lineHeight: 1.45,
                  borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isSelf ? "linear-gradient(135deg,#6C5CE7,#A29BFE)" : "rgba(255,255,255,0.07)",
                  border: isSelf ? "none" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow: isSelf ? "0 4px 14px rgba(108,92,231,0.3)" : "none",
                  fontSize: 14, color: "#fff", overflow: "hidden",
                }}>
                  {msg.type === "image" && msg.imageUrl ? (
                    <img src={msg.imageUrl} alt="shared" style={{ width: "100%", borderRadius: 14, display: "block" }} />
                  ) : (
                    msg.text
                  )}
                  <div style={{ fontSize: 9, color: isSelf ? "rgba(255,255,255,0.45)" : "rgba(162,155,254,0.35)", marginTop: msg.type === "image" ? 6 : 3, textAlign: "right", padding: msg.type === "image" ? "0 8px 4px" : 0 }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
          {otherTyping && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 10, paddingLeft: 4 }}>
              <div style={{
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "18px 18px 18px 4px", padding: "10px 16px", display: "flex", gap: 4,
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: 3, background: "rgba(162,155,254,0.5)",
                    animation: `typingDot 1s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={msgEnd} />
        </div>

        {showEmojiPicker && (
          <div style={{
            padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 4,
            animation: "slide-up 0.2s ease",
          }}>
            {EMOJI_GRID.map(e => (
              <button key={e} onClick={async () => { await sendMessage(active.id, user.uid, e, "emoji"); setShowEmojiPicker(false); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 4, borderRadius: 8 }}>{e}</button>
            ))}
          </div>
        )}

        <div style={{
          display: "flex", gap: 8, padding: "10px 14px 26px", alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,4,24,0.85)", backdropFilter: "blur(14px)", flexShrink: 0,
        }}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, padding: "0 2px" }}>{"\u{1F60A}"}</button>
          <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "0 2px" }}>{"\u{1F4F7}"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSend} />
          <input
            className="input-field"
            style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
            placeholder="Message..."
            value={input}
            onChange={e => handleTyping(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
          />
          <button className="btn btn-primary btn-sm" style={{ width: 42, height: 42, padding: 0, borderRadius: 14, flexShrink: 0 }} onClick={handleSend}>{"\u27A4"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Messages {"\u{1F4AC}"}</h1>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>{"\u{1F50D}"}</button>
          <button className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12 }}>{"\u270F\uFE0F"}</button>
        </div>
      </div>

      <div style={{ padding: "0 14px" }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              <div className="skeleton skeleton-circle" style={{ width: 48, height: 48, flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton skeleton-text" style={{ width: "50%" }} />
                <div className="skeleton skeleton-text" style={{ width: "70%" }} />
              </div>
            </div>
          ))
        ) : (
          convs.map(conv => {
            const idx = conv.participants[0] === user.uid ? 1 : 0;
            const elapsed = Date.now() - (conv.lastTime || 0);
            const timeStr = elapsed < 3600000 ? `${Math.floor(elapsed / 60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed / 3600000)}h` : `${Math.floor(elapsed / 86400000)}d`;
            const unreadCount = (conv.unread || {})[user.uid] || 0;
            return (
              <div key={conv.id} onClick={() => { setActive(conv); markRead(conv.id, user.uid); }} style={{
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
                {unreadCount > 0 && (
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: 10, background: "#6C5CE7",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, padding: "0 5px",
                  }}>{unreadCount}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
