import React, { useState, useEffect, useRef, useCallback } from "react";
import { UserProfile, incrementStat, getUser, followUser, unfollowUser, subscribeUser, blockUser, isBlocked, canChatSync, isSuperAdmin, SUPER_ADMIN_USER_ID, sendGift } from "../lib/userService";
import { Conversation, ChatMessage, subscribeConversations, subscribeMessages, sendMessage, sendImageMessage, sendVoiceMessage, addReaction, setTyping, subscribeTyping, markRead, clearChat, updateLastSeen } from "../lib/chatService";
import { sendNotification, subscribeNotifications, Notification as AppNotification, markNotificationRead, markAllNotificationsRead } from "../lib/notificationService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; initialChatUid?: string | null; onChatActive?: (active: boolean) => void; }

const EMOJI_GRID = [
  "\u{1F600}","\u{1F602}","\u{1F60D}","\u{1F618}","\u{1F970}","\u{1F60E}","\u{1F913}","\u{1F60F}",
  "\u{1F622}","\u{1F62D}","\u{1F621}","\u{1F631}","\u{1F92F}","\u{1F973}","\u{1F929}","\u{1F644}",
  "\u2764\uFE0F","\u{1F525}","\u{1F44D}","\u{1F44F}","\u{1F64F}","\u{1F4AA}","\u{1F91D}","\u270C\uFE0F",
  "\u{1F31F}","\u2728","\u{1F389}","\u{1F381}","\u{1F680}","\u{1F30C}","\u{1F48E}","\u{1F4AF}",
];

const REACTION_EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u{1F602}", "\u{1F44D}", "\u{1F62E}", "\u{1F622}"];

const QUICK_PHRASES = ["Hi!", "How are you?", "Follow me", "GG!", "Nice to meet you", "Thanks!", "See you later", "Let's talk!"];

const UNLOCK_GIFTS = [
  { emoji: "\u{1F339}", name: "Rose", cost: 20 },
  { emoji: "\u{1F381}", name: "Gift Box", cost: 10 },
  { emoji: "\u2B50", name: "Star", cost: 40 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 50 },
  { emoji: "\u{1F451}", name: "Crown", cost: 100 },
];

const CHAT_GIFTS = [
  { emoji: "\u{1F339}", name: "Rose", cost: 10 },
  { emoji: "\u2764\uFE0F", name: "Heart", cost: 5 },
  { emoji: "\u2B50", name: "Star", cost: 15 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 30 },
];

const NOTIF_CATEGORIES = [
  { key: "follower", label: "New Followers", icon: "\u{1F465}", types: ["follower", "follow_back", "friend_request"] },
  { key: "system", label: "Announcements", icon: "\u{1F4E2}", types: ["system", "achievement"] },
  { key: "gift", label: "Gifts & Rewards", icon: "\u{1F381}", types: ["gift"] },
];

export default function ChatsPage({ user, initialChatUid, onChatActive }: Props) {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Conversation | null>(null);
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTypingState] = useState<Record<string, boolean>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [reactionMsgId, setReactionMsgId] = useState<string | null>(null);
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const [giftSending, setGiftSending] = useState(false);
  const [showChatGifts, setShowChatGifts] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showNotifHub, setShowNotifHub] = useState(false);
  const [notifTab, setNotifTab] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [swipingMsgId, setSwipingMsgId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const touchStart = useRef<{ x: number; y: number; id: string } | null>(null);
  const msgEnd = useRef<HTMLDivElement>(null);
  const unlockedConvs = useRef<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordStartTime = useRef(0);
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = subscribeConversations(user.uid, (c: Conversation[]) => {
      setConvs(c);
      setLoading(false);
    });
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    const unsub = subscribeNotifications(user.uid, setNotifications);
    return unsub;
  }, [user.uid]);

  useEffect(() => {
    if (initialChatUid && convs.length > 0 && !active) {
      const match = convs.find(c => c.participants.includes(initialChatUid));
      if (match) setActive(match);
    }
  }, [initialChatUid, convs, active]);

  useEffect(() => {
    if (!active) return;
    const unsub1 = subscribeMessages(active.id, setMsgs);
    const unsub2 = subscribeTyping(active.id, setTypingState);
    markRead(active.id, user.uid).catch(err => console.warn("markRead error:", err));
    updateLastSeen(active.id, user.uid).catch(() => {});
    return () => {
      unsub1(); unsub2();
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
    };
  }, [active?.id]);

  useEffect(() => {
    onChatActive?.(!!active);
  }, [active, onChatActive]);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      updateLastSeen(active.id, user.uid).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [active?.id]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !active) return;
    try {
      const reply = replyingTo ? { id: replyingTo.id, text: replyingTo.text.slice(0, 60), senderName: replyingTo.senderName || "User" } : undefined;
      await sendMessage(active.id, user.uid, text, "text", reply);
      setInput("");
      setShowEmojiPicker(false);
      setReplyingTo(null);
      setTyping(active.id, user.uid, false);
      incrementStat(user.uid, "messagesSent").catch(err => console.error("Stat error:", err));
      const otherId = active.participants.find(p => p !== user.uid);
      if (otherId) {
        sendNotification(otherId, {
          type: "message", title: "New Message", body: `${user.name}: ${text.slice(0, 50)}`,
          icon: "\u{1F4AC}", fromUid: user.uid, fromName: user.name,
        }).catch(err => console.error("Notif error:", err));
      }
    } catch (err) {
      console.error("Send message error:", err);
      showToast("Failed to send message", "error");
    }
  };

  const handleImageSend = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !active) return;
    try {
      showToast("Uploading image...", "info", "\u{1F4F7}");
      await sendImageMessage(active.id, user.uid, file);
      showToast("Image sent!", "success");
    } catch (err) {
      console.error("Image send error:", err);
      showToast("Failed to send image", "error");
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      audioChunks.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunks.current, { type: "audio/webm" });
        const duration = (Date.now() - recordStartTime.current) / 1000;
        if (duration > 0.5 && active) {
          showToast("Sending voice message...", "info", "\u{1F3A4}");
          await sendVoiceMessage(active.id, user.uid, blob, duration);
          showToast("Voice message sent!", "success");
        }
      };
      mr.start();
      mediaRecorder.current = mr;
      recordStartTime.current = Date.now();
      setIsRecording(true);
      setRecordDuration(0);
      recordTimer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordStartTime.current) / 1000);
        setRecordDuration(elapsed);
        if (elapsed >= 30) stopRecording();
      }, 1000);
    } catch (err) {
      console.error("Mic error:", err);
      showToast("Microphone access denied", "error");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
    setIsRecording(false);
    if (recordTimer.current) {
      clearInterval(recordTimer.current);
      recordTimer.current = null;
    }
  };

  const handleReaction = async (msgId: string, emoji: string) => {
    if (!active) return;
    await addReaction(active.id, msgId, user.uid, emoji);
    setReactionMsgId(null);
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

  const handleChatGift = async (gift: typeof CHAT_GIFTS[0]) => {
    if (!active || giftSending) return;
    const otherId = active.participants.find(p => p !== user.uid);
    if (!otherId) return;
    setGiftSending(true);
    try {
      const ok = await sendGift(user.uid, user as UserProfile, otherId, gift.emoji, gift.cost);
      if (!ok) { showToast("Not enough coins!", "error"); setGiftSending(false); return; }
      unlockedConvs.current.add(active.id);
      setChatLocked(false);
      setShowChatGifts(false);
      showToast(`${gift.emoji} ${gift.name} sent!`, "success");
      await sendMessage(active.id, user.uid, `sent ${gift.emoji} ${gift.name}`, "system");
      sendNotification(otherId, {
        type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}`,
        icon: gift.emoji, fromUid: user.uid, fromName: user.name,
      }).catch(() => {});
    } catch { showToast("Gift failed", "error"); }
    finally { setGiftSending(false); }
  };

  const handleSwipeStart = useCallback((e: React.TouchEvent, msgId: string) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY, id: msgId };
  }, []);

  const handleSwipeMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const dx = e.touches[0].clientX - touchStart.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStart.current.y);
    if (dy > 30) { touchStart.current = null; setSwipingMsgId(null); setSwipeX(0); return; }
    if (dx > 10) {
      setSwipingMsgId(touchStart.current.id);
      setSwipeX(Math.min(dx, 80));
    }
  }, []);

  const handleSwipeEnd = useCallback(() => {
    if (swipeX > 50 && swipingMsgId) {
      const msg = msgs.find(m => m.id === swipingMsgId);
      if (msg) setReplyingTo(msg);
    }
    setSwipingMsgId(null);
    setSwipeX(0);
    touchStart.current = null;
  }, [swipeX, swipingMsgId, msgs]);

  const otherTyping = active ? Object.entries(typing).some(([k, v]) => k !== user.uid && v) : false;

  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [chatLocked, setChatLocked] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setIsFollowing((user.followingList || []).includes(otherId));
    const unsubPresence = subscribeUser(otherId, u => {
      if (u) {
        setOtherOnline(u.online ?? false);
        setOtherProfile(u);
        const isMutual = canChatSync(user, u);
        const eitherIsSuperAdmin = isSuperAdmin(user) || isSuperAdmin(u);
        const giftUnlocked = unlockedConvs.current.has(active!.id);
        setChatLocked(!isMutual && !eitherIsSuperAdmin && !giftUnlocked);
      } else {
        setOtherOnline(false);
        const giftUnlocked = unlockedConvs.current.has(active!.id);
        setChatLocked(!isSuperAdmin(user) && !giftUnlocked);
      }
    });
    return unsubPresence;
  }, [active?.id, user.followingList]);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    if (active.lastSeen && active.lastSeen[otherId]) {
      setOtherLastSeen(active.lastSeen[otherId]);
    }
  }, [active]);

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
        sendNotification(otherId, {
          type: "follower", title: "New Follower!", body: `${user.name} started following you`,
          icon: "\u{1F31F}", fromUid: user.uid, fromName: user.name,
        }).catch(err => console.error("Notif error:", err));
      }
    } catch (err) {
      console.error("Follow/unfollow error:", err);
      showToast("Action failed", "error");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleBlock = async () => {
    if (!active) return;
    const otherId = active.participants.find(p => p !== user.uid);
    if (!otherId) return;
    await blockUser(user.uid, otherId);
    setActive(null);
    showToast("User blocked", "info");
  };

  const getStatusIcon = (status?: string) => {
    if (status === "seen") return "\u2714\u2714";
    if (status === "delivered") return "\u2714\u2714";
    if (status === "sent") return "\u2714";
    return "";
  };

  const getStatusColor = (status?: string) => {
    if (status === "seen") return "#00bfff";
    if (status === "delivered") return "rgba(162,155,254,0.5)";
    return "rgba(162,155,254,0.35)";
  };

  const formatLastSeen = (ts: number | null) => {
    if (!ts) return "";
    const diff = Date.now() - ts;
    if (diff < 60000) return "just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const unreadNotifCount = notifications.filter(n => !n.read && n.type !== "message").length;

  if (showNotifHub) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "52px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <button onClick={() => setShowNotifHub(false)} style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 16, color: "#fff",
          }}>{"\u2039"}</button>
          <h2 style={{ fontSize: 16, fontWeight: 900, flex: 1 }}>Notifications</h2>
          <button onClick={() => { markAllNotificationsRead(user.uid); showToast("All marked read", "info"); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#6C5CE7", fontWeight: 700, padding: "4px 8px" }}>
            Mark All Read
          </button>
        </div>

        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 14px", flexShrink: 0 }}>
          {NOTIF_CATEGORIES.map((cat, i) => {
            const unread = notifications.filter(n => !n.read && cat.types.includes(n.type)).length;
            return (
              <button key={cat.key} onClick={() => setNotifTab(i)} style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                borderBottom: notifTab === i ? "2px solid #6C5CE7" : "2px solid transparent",
                color: notifTab === i ? "#A29BFE" : "rgba(162,155,254,0.4)",
                fontWeight: 700, fontSize: 11, fontFamily: "inherit", transition: "all 0.2s",
              }}>
                <span style={{ fontSize: 14 }}>{cat.icon}</span>
                {cat.label}
                {unread > 0 && (
                  <div style={{
                    minWidth: 16, height: 16, borderRadius: 8, background: "#ff6482",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, fontWeight: 700, padding: "0 4px", color: "#fff",
                  }}>{unread}</div>
                )}
              </button>
            );
          })}
        </div>

        <div className="page-scroll" style={{ flex: 1, padding: "8px 14px" }}>
          {(() => {
            const cat = NOTIF_CATEGORIES[notifTab];
            const catNotifs = notifications.filter(n => cat.types.includes(n.type));
            if (catNotifs.length === 0) return (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>{cat.icon}</p>
                <p style={{ fontSize: 13, color: "rgba(162,155,254,0.4)" }}>No {cat.label.toLowerCase()} yet</p>
              </div>
            );
            return catNotifs.slice(0, 30).map(n => (
              <div key={n.id} onClick={() => markNotificationRead(user.uid, n.id)} style={{
                display: "flex", gap: 10, padding: "10px 8px",
                borderRadius: 12, marginBottom: 4, cursor: "pointer",
                background: n.read ? "transparent" : "rgba(108,92,231,0.08)",
                border: n.read ? "1px solid transparent" : "1px solid rgba(108,92,231,0.15)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 18, fontSize: 16,
                  background: "rgba(108,92,231,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>{n.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{n.title}</span>
                    {!n.read && <div style={{ width: 7, height: 7, borderRadius: 4, background: "#ff6482", flexShrink: 0 }} />}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 2 }}>{n.body}</p>
                  <span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>
                    {formatLastSeen(n.timestamp)}
                  </span>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
    );
  }

  if (active) {
    const otherIdx = active.participants[0] === user.uid ? 1 : 0;
    const otherId = active.participants[otherIdx];
    const otherIsSuperAdmin = otherProfile ? isSuperAdmin(otherProfile) : false;
    const selfIsSuperAdmin = isSuperAdmin(user);
    const statusText = otherTyping ? "typing..." : otherOnline ? "\u25CF Online" : otherLastSeen ? `Last seen ${formatLastSeen(otherLastSeen)}` : "\u25CB Offline";
    const statusColor = otherTyping ? "#A29BFE" : otherOnline ? "#00e676" : "rgba(162,155,254,0.4)";
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", flexDirection: "column", background: "#0F0F1A", maxWidth: 430, margin: "0 auto" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
          background: "rgba(8,4,24,0.95)", backdropFilter: "blur(12px)",
          paddingTop: "env(safe-area-inset-top, 12px)",
        }}>
          <button onClick={() => { setActive(null); setShowEmojiPicker(false); setShowQuickPhrases(false); setShowChatGifts(false); setReplyingTo(null); }} style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 18, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u2190"}</button>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 19, fontSize: 18,
              background: otherIsSuperAdmin ? "rgba(255,215,0,0.12)" : "rgba(108,92,231,0.15)",
              border: otherIsSuperAdmin ? "2px solid rgba(255,215,0,0.4)" : "2px solid rgba(108,92,231,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
              boxShadow: otherIsSuperAdmin ? "0 0 10px rgba(255,215,0,0.3)" : "none",
            }}>
              {active.participantAvatars[otherIdx]?.startsWith?.("http")
                ? <img src={active.participantAvatars[otherIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 19 }} />
                : active.participantAvatars[otherIdx]}
            </div>
            {otherIsSuperAdmin && (
              <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.svg`} alt="" style={{ position: "absolute", top: -4, left: -4, width: 46, height: 46, pointerEvents: "none" }} />
            )}
            {otherProfile?.globalRole === "official" && !otherIsSuperAdmin && (
              <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.svg`} alt="" style={{ position: "absolute", top: -4, left: -4, width: 46, height: 46, pointerEvents: "none", filter: "hue-rotate(40deg)" }} />
            )}
            <div style={{
              position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5,
              background: otherOnline ? "#00e676" : "rgba(162,155,254,0.3)",
              border: "2px solid #0F0F1A",
            }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.participantNames[otherIdx]}</p>
              {otherIsSuperAdmin && (
                <span style={{ fontSize: 12, color: "#1DA1F2", flexShrink: 0 }}>{"\u2714"}</span>
              )}
              {otherIsSuperAdmin && (
                <span className="super-admin-chat-tag">{"\u{1F451}"} S.ADMIN</span>
              )}
              {otherProfile?.globalRole === "official" && !otherIsSuperAdmin && (
                <span className="official-chat-tag">{"\u{1F6E1}\uFE0F"} OFFICIAL</span>
              )}
            </div>
            <p style={{ fontSize: 10, color: statusColor }}>{statusText}</p>
          </div>
          <button
            className={`btn btn-sm ${isFollowing ? "btn-ghost" : "btn-primary"}`}
            style={{ fontSize: 10, padding: "4px 10px", borderRadius: 12 }}
            onClick={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, width: 34, height: 34, padding: 0, borderRadius: 10 }} onClick={async () => {
            if (!active) return;
            await clearChat(active.id);
            showToast("Chat cleared", "info");
          }}>{"\u{1F5D1}\uFE0F"}</button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 16, width: 34, height: 34, padding: 0, borderRadius: 10 }} onClick={handleBlock}>{"\u{1F6AB}"}</button>
        </div>

        <div className="chat-bg-texture" style={{ flex: 1, overflowY: "auto", padding: "12px 14px 80px", position: "relative" }}>
          {msgs.map(msg => {
            const isSelf = msg.senderId === user.uid;
            const senderIsSuperAdmin = isSelf ? selfIsSuperAdmin : otherIsSuperAdmin;
            const reactions = msg.reactions ? Object.values(msg.reactions) : [];
            const isSystem = msg.type === "system";
            const isBeingSwiped = swipingMsgId === msg.id;

            if (isSystem) {
              return (
                <div key={msg.id} style={{ textAlign: "center", margin: "12px 0" }}>
                  <span style={{
                    fontSize: 11, color: "rgba(162,155,254,0.4)", background: "rgba(108,92,231,0.08)",
                    padding: "4px 14px", borderRadius: 12, display: "inline-block",
                    border: "1px solid rgba(108,92,231,0.1)",
                  }}>{msg.text}</span>
                </div>
              );
            }

            return (
              <div key={msg.id}
                onTouchStart={e => handleSwipeStart(e, msg.id)}
                onTouchMove={handleSwipeMove}
                onTouchEnd={handleSwipeEnd}
                style={{
                  display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", marginBottom: 10,
                  animation: "slide-up 0.2s ease",
                  transform: isBeingSwiped ? `translateX(${isSelf ? -swipeX : swipeX}px)` : undefined,
                  transition: isBeingSwiped ? "none" : "transform 0.2s ease",
                  position: "relative",
                }}>
                {isBeingSwiped && swipeX > 20 && (
                  <div style={{
                    position: "absolute", [isSelf ? "right" : "left"]: isSelf ? "auto" : -30,
                    [isSelf ? "left" : "right"]: isSelf ? -30 : "auto",
                    top: "50%", transform: "translateY(-50%)",
                    fontSize: 16, color: "#6C5CE7", opacity: Math.min(swipeX / 60, 1),
                  }}>{"\u21A9\uFE0F"}</div>
                )}

                {senderIsSuperAdmin && !isSelf && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, padding: "0 4px" }}>
                    <div style={{ position: "relative", width: 18, height: 18, flexShrink: 0 }}>
                      <div style={{ width: 18, height: 18, borderRadius: 9, overflow: "hidden", background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>
                        {active.participantAvatars[otherIdx]?.startsWith?.("http")
                          ? <img src={active.participantAvatars[otherIdx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 9 }} />
                          : active.participantAvatars[otherIdx]}
                      </div>
                      <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.svg`} alt="" style={{ position: "absolute", top: -2, left: -2, width: 22, height: 22, pointerEvents: "none" }} />
                    </div>
                    <span className="super-admin-chat-tag">SUPER ADMIN</span>
                    <span style={{ fontSize: 11, color: "#1DA1F2" }}>{"\u2714"}</span>
                  </div>
                )}
                {senderIsSuperAdmin && isSelf && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2, padding: "0 4px" }}>
                    <span className="super-admin-chat-tag">SUPER ADMIN</span>
                    <span style={{ fontSize: 11, color: "#1DA1F2" }}>{"\u2714"}</span>
                  </div>
                )}

                {msg.replyTo && (
                  <div style={{
                    fontSize: 11, color: "rgba(162,155,254,0.5)", padding: "4px 10px",
                    marginBottom: 2, borderLeft: "2px solid #6C5CE7",
                    background: "rgba(108,92,231,0.08)", borderRadius: "0 8px 8px 0",
                    maxWidth: "74%",
                  }}>
                    <span style={{ fontWeight: 700, fontSize: 10, color: "#6C5CE7" }}>{msg.replyTo.senderName}</span>
                    <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.replyTo.text}</p>
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "74%", padding: msg.type === "image" ? 4 : "10px 14px", lineHeight: 1.45,
                    borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isSelf && selfIsSuperAdmin
                      ? "linear-gradient(135deg,#2d1b69,#1a0a3e)"
                      : isSelf ? "linear-gradient(135deg,#6C5CE7,#A29BFE)" : "rgba(255,255,255,0.07)",
                    border: senderIsSuperAdmin && !isSelf
                      ? "1.5px solid rgba(255,215,0,0.5)"
                      : senderIsSuperAdmin && isSelf
                      ? "1.5px solid rgba(255,215,0,0.4)"
                      : isSelf ? "none" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: senderIsSuperAdmin
                      ? "0 0 12px rgba(255,215,0,0.2), 0 0 24px rgba(108,92,231,0.15), 0 4px 14px rgba(108,92,231,0.2)"
                      : isSelf ? "0 4px 14px rgba(108,92,231,0.3)" : "none",
                    fontSize: 14, color: "#fff", overflow: "hidden", position: "relative", cursor: "pointer",
                  }}
                  onDoubleClick={() => setReactionMsgId(reactionMsgId === msg.id ? null : msg.id)}
                >
                  {msg.type === "image" && msg.imageUrl ? (
                    <img src={msg.imageUrl} alt="shared" style={{
                      width: "100%", maxWidth: 260, minWidth: 120, borderRadius: 12,
                      display: "block", objectFit: "cover", maxHeight: 320,
                      backgroundColor: "rgba(108,92,231,0.1)",
                    }} onLoad={e => { (e.target as HTMLImageElement).style.backgroundColor = "transparent"; }} />
                  ) : msg.type === "voice" && msg.voiceUrl ? (
                    <VoicePlayer url={msg.voiceUrl} duration={msg.voiceDuration || 0} isSelf={isSelf} />
                  ) : (
                    msg.text
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end", marginTop: msg.type === "image" ? 6 : 3, padding: msg.type === "image" ? "0 8px 4px" : 0 }}>
                    <span style={{ fontSize: 9, color: isSelf ? "rgba(255,255,255,0.45)" : "rgba(162,155,254,0.35)" }}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isSelf && (
                      <span style={{ fontSize: 9, color: getStatusColor(msg.status), fontWeight: msg.status === "seen" ? 700 : 400, letterSpacing: msg.status === "seen" || msg.status === "delivered" ? -2 : 0 }}>
                        {getStatusIcon(msg.status)}
                      </span>
                    )}
                  </div>
                </div>

                {reactions.length > 0 && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2, padding: "0 4px" }}>
                    {reactions.map((r, i) => (
                      <span key={i} style={{ fontSize: 14, background: "rgba(108,92,231,0.15)", borderRadius: 10, padding: "1px 4px" }}>{r}</span>
                    ))}
                  </div>
                )}

                {reactionMsgId === msg.id && (
                  <div style={{
                    display: "flex", gap: 4, marginTop: 4, padding: "4px 8px",
                    background: "rgba(15,5,30,0.95)", borderRadius: 16,
                    border: "1px solid rgba(108,92,231,0.2)",
                    animation: "popIn 0.15s ease",
                  }}>
                    {REACTION_EMOJIS.map(e => (
                      <button key={e} onClick={() => handleReaction(msg.id, e)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: 2 }}>{e}</button>
                    ))}
                    <button onClick={() => { setReplyingTo(msg); setReactionMsgId(null); }}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: 2, color: "#A29BFE" }}>{"\u21A9\uFE0F"}</button>
                  </div>
                )}
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

        {chatLocked && (
          <div style={{
            padding: "12px 14px", textAlign: "center",
            background: "rgba(108,92,231,0.06)", borderTop: "1px solid rgba(108,92,231,0.12)",
          }}>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.5 }}>
              {"\u{1F512}"} Send a gift or follow to unlock chat
            </p>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
              {UNLOCK_GIFTS.slice(0, 3).map(g => {
                const canAfford = user.coins >= g.cost;
                return (
                  <button key={g.name} disabled={!canAfford || giftSending} onClick={async () => {
                    if (!active) return;
                    const otherId = active.participants.find(p => p !== user.uid);
                    if (!otherId) return;
                    setGiftSending(true);
                    try {
                      const ok = await sendGift(user.uid, user as UserProfile, otherId, g.emoji, g.cost);
                      if (!ok) { showToast("Not enough coins!", "error"); setGiftSending(false); return; }
                      unlockedConvs.current.add(active.id);
                      setChatLocked(false);
                      showToast(`${g.emoji} ${g.name} sent! Chat unlocked!`, "success");
                      await sendMessage(active.id, user.uid, `sent ${g.emoji} ${g.name} to unlock chat`, "system");
                      sendNotification(otherId, {
                        type: "gift", title: "Gift Received!", body: `${user.name} sent you ${g.emoji} ${g.name}`,
                        icon: g.emoji, fromUid: user.uid, fromName: user.name,
                      }).catch(() => {});
                    } catch { showToast("Gift failed", "error"); }
                    finally { setGiftSending(false); }
                  }} style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "6px 12px", borderRadius: 20,
                    background: canAfford ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.04)",
                    border: canAfford ? "1px solid rgba(108,92,231,0.3)" : "1px solid rgba(255,255,255,0.06)",
                    cursor: canAfford ? "pointer" : "not-allowed",
                    opacity: canAfford ? 1 : 0.4, fontFamily: "inherit", fontSize: 11,
                  }}>
                    <span>{g.emoji}</span>
                    <span style={{ fontWeight: 700, color: "#A29BFE" }}>{g.cost}</span>
                  </button>
                );
              })}
              {!isFollowing && (
                <button onClick={handleFollow} disabled={followLoading} style={{
                  padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.3)",
                  color: "#6C5CE7", cursor: "pointer", fontFamily: "inherit",
                }}>
                  {followLoading ? "..." : "Follow"}
                </button>
              )}
            </div>
          </div>
        )}

        {showEmojiPicker && (
          <div style={{
            padding: "8px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 4,
            animation: "slide-up 0.2s ease",
          }}>
            {EMOJI_GRID.map(e => (
              <button key={e} onClick={async () => {
                if (chatLocked) { showToast("Unlock chat first to send messages", "warning", "\u{1F512}"); return; }
                await sendMessage(active.id, user.uid, e, "emoji"); setShowEmojiPicker(false);
              }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 4, borderRadius: 8 }}>{e}</button>
            ))}
          </div>
        )}

        {showChatGifts && (
          <div style={{
            padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,4,24,0.95)", animation: "slide-up 0.2s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#A29BFE" }}>{chatLocked ? "Send Gift to Unlock" : "Send Gift"}</span>
              <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>{"\u{1F48E}"} {user.coins.toLocaleString()}</span>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {CHAT_GIFTS.map(g => (
                <button key={g.name} disabled={user.coins < g.cost || giftSending} onClick={() => handleChatGift(g)} style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  padding: "8px 14px", borderRadius: 14,
                  background: user.coins >= g.cost ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.04)",
                  border: user.coins >= g.cost ? "1px solid rgba(108,92,231,0.3)" : "1px solid rgba(255,255,255,0.06)",
                  cursor: user.coins >= g.cost ? "pointer" : "not-allowed",
                  opacity: user.coins >= g.cost ? 1 : 0.4, fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: 22 }}>{g.emoji}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#A29BFE" }}>{g.name}</span>
                  <span style={{ fontSize: 8, color: "rgba(162,155,254,0.4)" }}>{g.cost} coins</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {showQuickPhrases && (
          <div style={{
            padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 6,
            animation: "slide-up 0.2s ease",
          }}>
            {QUICK_PHRASES.map(phrase => (
              <button key={phrase} onClick={async () => {
                if (chatLocked) { showToast("Unlock chat first to send messages", "warning", "\u{1F512}"); return; }
                try {
                  await sendMessage(active.id, user.uid, phrase);
                  setShowQuickPhrases(false);
                  incrementStat(user.uid, "messagesSent").catch(() => {});
                  const oid = active.participants.find(p => p !== user.uid);
                  if (oid) sendNotification(oid, { type: "message", title: "New Message", body: `${user.name}: ${phrase}`, icon: "\u{1F4AC}", fromUid: user.uid, fromName: user.name }).catch(() => {});
                } catch { showToast("Failed to send", "error"); }
              }} style={{
                background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                borderRadius: 16, padding: "6px 12px", cursor: "pointer", fontSize: 12,
                color: "#A29BFE", fontWeight: 600, whiteSpace: "nowrap",
              }}>{phrase}</button>
            ))}
          </div>
        )}

        {replyingTo && (
          <div style={{
            padding: "8px 14px", borderTop: "1px solid rgba(108,92,231,0.15)",
            background: "rgba(108,92,231,0.06)", display: "flex", alignItems: "center", gap: 8,
            animation: "slide-up 0.15s ease",
          }}>
            <div style={{ flex: 1, borderLeft: "3px solid #6C5CE7", paddingLeft: 10, overflow: "hidden" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#6C5CE7" }}>{replyingTo.senderName || "User"}</span>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {replyingTo.type === "voice" ? "\u{1F3A4} Voice message" : replyingTo.type === "image" ? "\u{1F4F7} Photo" : replyingTo.text}
              </p>
            </div>
            <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "rgba(162,155,254,0.5)", padding: 4 }}>{"\u2715"}</button>
          </div>
        )}

        <div style={{
          display: "flex", gap: 6, padding: "10px 12px", alignItems: "center",
          paddingBottom: "max(env(safe-area-inset-bottom, 10px), 10px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,4,24,0.95)", backdropFilter: "blur(14px)", flexShrink: 0,
          zIndex: 1200,
        }}>
          <button onClick={() => fileRef.current?.click()} style={{
            width: 36, height: 36, borderRadius: 18, cursor: "pointer",
            background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#A29BFE", flexShrink: 0,
          }}>+</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSend} />

          <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowQuickPhrases(false); setShowChatGifts(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "0 2px" }}>{"\u{1F60A}"}</button>
          <button onClick={() => { setShowQuickPhrases(!showQuickPhrases); setShowEmojiPicker(false); setShowChatGifts(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "0 2px", color: showQuickPhrases ? "#6C5CE7" : "#A29BFE", fontWeight: 800 }}>{"\u26A1"}</button>
          <button onClick={() => { setShowChatGifts(!showChatGifts); setShowEmojiPicker(false); setShowQuickPhrases(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 2px", color: showChatGifts ? "#ff6482" : "#A29BFE" }}>{"\u{1F381}"}</button>

          {isRecording ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,100,130,0.1)", borderRadius: 22, border: "1px solid rgba(255,100,130,0.3)" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#ff6482", animation: "pulse-glow 1s infinite" }} />
              <span style={{ fontSize: 13, color: "#ff6482", fontWeight: 700, flex: 1 }}>{formatDuration(recordDuration)} / 0:30</span>
              <button onClick={stopRecording} style={{ background: "rgba(255,100,130,0.2)", border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ff6482" }}>
                {"\u23F9"} Send
              </button>
            </div>
          ) : (
            <>
              <input
                className="input-field"
                style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
                placeholder="Type a message..."
                value={input}
                onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    if (chatLocked) { showToast("Unlock chat first to send messages", "warning", "\u{1F512}"); return; }
                    handleSend();
                  }
                }}
              />
              {input.trim() ? (
                <button onClick={() => {
                  if (chatLocked) { showToast("Unlock chat first to send messages", "warning", "\u{1F512}"); return; }
                  handleSend();
                }} style={{
                  width: 40, height: 40, padding: 0, borderRadius: "50%", flexShrink: 0, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                  color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 10px rgba(108,92,231,0.4)",
                }}>{"\u27A4"}</button>
              ) : (
                <button onClick={() => {
                  if (chatLocked) { showToast("Unlock chat first to send messages", "warning", "\u{1F512}"); return; }
                  startRecording();
                }} style={{
                  width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "rgba(108,92,231,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#A29BFE", flexShrink: 0,
                }}>{"\u{1F3A4}"}</button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Messages {"\u{1F4AC}"}</h1>
      </div>

      <div style={{ padding: "0 14px" }}>
        <div onClick={() => setShowNotifHub(true)} className="notif-hub-card" style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
          marginBottom: 10, borderRadius: 16, cursor: "pointer",
          background: "linear-gradient(135deg, rgba(108,92,231,0.12), rgba(191,0,255,0.08))",
          border: "1px solid rgba(108,92,231,0.2)",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 22, fontSize: 20,
            background: "linear-gradient(135deg, #6C5CE7, #bf00ff)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>{"\u{1F514}"}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 14 }}>System Notifications</span>
              {unreadNotifCount > 0 && (
                <div style={{
                  minWidth: 20, height: 20, borderRadius: 10, background: "#ff6482",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 700, padding: "0 5px", color: "#fff",
                  boxShadow: "0 0 8px rgba(255,100,130,0.4)",
                }}>{unreadNotifCount}</div>
              )}
            </div>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.45)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Followers, Gifts, Announcements
            </p>
          </div>
          <span style={{ fontSize: 14, color: "rgba(162,155,254,0.3)" }}>{"\u203A"}</span>
        </div>

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
        ) : convs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>{"\u{1F4AD}"}</p>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No conversations yet</p>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)" }}>Start chatting with someone from Rooms or Explore!</p>
          </div>
        ) : (
          convs.map(conv => {
            const idx = conv.participants[0] === user.uid ? 1 : 0;
            const elapsed = Date.now() - (conv.lastTime || 0);
            const timeStr = elapsed < 3600000 ? `${Math.floor(elapsed / 60000)}m` : elapsed < 86400000 ? `${Math.floor(elapsed / 3600000)}h` : `${Math.floor(elapsed / 86400000)}d`;
            const unreadCount = (conv.unread || {})[user.uid] || 0;
            const otherUid = conv.participants[idx];
            const convOtherIsSuperAdmin = otherUid === SUPER_ADMIN_USER_ID;
            return (
              <div key={conv.id} onClick={() => { setActive(conv); markRead(conv.id, user.uid); }} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 2px", borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer",
              }}>
                <div style={{ position: "relative" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 24, fontSize: 22,
                    background: convOtherIsSuperAdmin ? "rgba(255,215,0,0.12)" : "rgba(108,92,231,0.14)",
                    border: convOtherIsSuperAdmin ? "2px solid rgba(255,215,0,0.3)" : "2px solid rgba(108,92,231,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    boxShadow: convOtherIsSuperAdmin ? "0 0 10px rgba(255,215,0,0.2), 0 0 18px rgba(108,92,231,0.15)" : "none",
                  }}>
                    {conv.participantAvatars[idx]?.startsWith?.("http")
                      ? <img src={conv.participantAvatars[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }} />
                      : conv.participantAvatars[idx]}
                  </div>
                  {convOtherIsSuperAdmin && (
                    <img src={`${import.meta.env.BASE_URL}assets/official/official_frame_new.svg`} alt="" style={{ position: "absolute", top: -3, left: -3, width: 54, height: 54, pointerEvents: "none" }} />
                  )}
                  <div style={{ position: "absolute", bottom: 2, right: 1, width: 10, height: 10, borderRadius: 5, background: "#00e676", border: "1.5px solid #0F0F1A" }} />
                </div>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: convOtherIsSuperAdmin ? "#FFD700" : "#fff" }}>{conv.participantNames[idx]}</span>
                      {convOtherIsSuperAdmin && <span style={{ fontSize: 11, color: "#1DA1F2" }}>{"\u2714"}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(162,155,254,0.35)" }}>{timeStr}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(162,155,254,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {conv.lastMessage}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <div style={{
                    minWidth: 20, height: 20, borderRadius: 10, background: "#ff6482",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, padding: "0 5px", color: "#fff",
                    boxShadow: "0 0 8px rgba(255,100,130,0.4)",
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

function VoicePlayer({ url, duration, isSelf }: { url: string; duration: number; isSelf: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bars = useRef(Array.from({ length: 20 }, () => 0.2 + Math.random() * 0.8));

  const toggle = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const activeIdx = Math.floor((progress / 100) * bars.current.length);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", minWidth: 160 }}>
      <button onClick={toggle} style={{
        width: 32, height: 32, borderRadius: 16, border: "none", cursor: "pointer",
        background: isSelf ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.3)",
        color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{playing ? "\u23F8" : "\u25B6"}</button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 24 }}>
          {bars.current.map((h, i) => (
            <div key={i} style={{
              flex: 1, borderRadius: 1,
              height: `${h * 100}%`,
              background: i <= activeIdx
                ? (isSelf ? "rgba(255,255,255,0.7)" : "#6C5CE7")
                : (isSelf ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.25)"),
              transition: "background 0.1s",
              animation: playing && i === activeIdx ? "voiceBarPulse 0.4s ease infinite" : "none",
            }} />
          ))}
        </div>
        <span style={{ fontSize: 10, color: isSelf ? "rgba(255,255,255,0.5)" : "rgba(162,155,254,0.4)" }}>
          {formatDuration(Math.round(duration))}
        </span>
      </div>
    </div>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
