import React, { useState, useEffect, useRef } from "react";
import { UserProfile, incrementStat, getUser, followUser, unfollowUser, subscribeUser, blockUser, isBlocked, canChatSync, isSuperAdmin, SUPER_ADMIN_USER_ID } from "../lib/userService";
import { Conversation, ChatMessage, subscribeConversations, subscribeMessages, sendMessage, sendImageMessage, sendVoiceMessage, addReaction, setTyping, subscribeTyping, markRead, clearChat } from "../lib/chatService";
import { sendNotification } from "../lib/notificationService";
import { useToast } from "../lib/toastContext";

interface Props { user: UserProfile; initialChatUid?: string | null; }

const EMOJI_GRID = [
  "\u{1F600}","\u{1F602}","\u{1F60D}","\u{1F618}","\u{1F970}","\u{1F60E}","\u{1F913}","\u{1F60F}",
  "\u{1F622}","\u{1F62D}","\u{1F621}","\u{1F631}","\u{1F92F}","\u{1F973}","\u{1F929}","\u{1F644}",
  "\u2764\uFE0F","\u{1F525}","\u{1F44D}","\u{1F44F}","\u{1F64F}","\u{1F4AA}","\u{1F91D}","\u270C\uFE0F",
  "\u{1F31F}","\u2728","\u{1F389}","\u{1F381}","\u{1F680}","\u{1F30C}","\u{1F48E}","\u{1F4AF}",
];

const REACTION_EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u{1F602}", "\u{1F44D}", "\u{1F62E}", "\u{1F622}"];

const QUICK_PHRASES = ["Welcome!", "Hi there!", "Follow me", "GG!", "Nice to meet you", "Thanks!", "See you later", "Let's talk!"];

export default function ChatsPage({ user, initialChatUid }: Props) {
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
  const msgEnd = useRef<HTMLDivElement>(null);
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
        setRecordDuration(Math.floor((Date.now() - recordStartTime.current) / 1000));
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

  const otherTyping = active ? Object.entries(typing).some(([k, v]) => k !== user.uid && v) : false;

  const [otherOnline, setOtherOnline] = useState<boolean | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);
  const [chatLocked, setChatLocked] = useState(false);

  useEffect(() => {
    if (!active) return;
    const otherId = active.participants[0] === user.uid ? active.participants[1] : active.participants[0];
    setIsFollowing((user.followingList || []).includes(otherId));
    const unsubPresence = subscribeUser(otherId, u => {
      if (u) {
        setOtherOnline(u.online ?? false);
        setOtherProfile(u);
        setChatLocked(!canChatSync(user, u));
      } else {
        setOtherOnline(false);
        setChatLocked(true);
      }
    });
    return unsubPresence;
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
    if (status === "seen") return "#6C5CE7";
    return "rgba(162,155,254,0.35)";
  };

  if (active) {
    const otherIdx = active.participants[0] === user.uid ? 1 : 0;
    const otherId = active.participants[otherIdx];
    const otherIsSuperAdmin = otherProfile ? isSuperAdmin(otherProfile) : false;
    const selfIsSuperAdmin = isSuperAdmin(user);
    const statusText = otherTyping ? "typing..." : otherOnline ? "\u25CF Online" : "\u25CB Offline";
    const statusColor = otherTyping ? "#A29BFE" : otherOnline ? "#00e676" : "rgba(162,155,254,0.4)";
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "52px 12px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
        }}>
          <button onClick={() => { setActive(null); setShowEmojiPicker(false); setShowQuickPhrases(false); }} style={{
            width: 36, height: 36, borderRadius: 12, background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer", fontSize: 16, color: "#fff",
          }}>{"\u2039"}</button>
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
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <p style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{active.participantNames[otherIdx]}</p>
              {otherIsSuperAdmin && (
                <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 6, background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(191,0,255,0.15))", color: "#FFD700", border: "1px solid rgba(255,215,0,0.4)", fontWeight: 900, whiteSpace: "nowrap" }}>{"\u{1F451}"} S.Admin</span>
              )}
              {otherProfile?.globalRole === "official" && !otherIsSuperAdmin && (
                <span style={{ fontSize: 8, padding: "1px 6px", borderRadius: 6, background: "rgba(255,215,0,0.12)", color: "#FFD700", border: "1px solid rgba(255,215,0,0.25)", fontWeight: 700, whiteSpace: "nowrap" }}>{"\u{1F6E1}\uFE0F"} Official</span>
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

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px 6px" }}>
          {msgs.map(msg => {
            const isSelf = msg.senderId === user.uid;
            const senderIsSuperAdmin = isSelf ? selfIsSuperAdmin : otherIsSuperAdmin;
            const reactions = msg.reactions ? Object.values(msg.reactions) : [];
            return (
              <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isSelf ? "flex-end" : "flex-start", marginBottom: 10, animation: "slide-up 0.2s ease" }}>
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
                    <img src={`${import.meta.env.BASE_URL}assets/tags/super_admin_v2.png`} alt="Super Admin" style={{ height: 12 }} />
                  </div>
                )}
                {senderIsSuperAdmin && isSelf && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2, padding: "0 4px" }}>
                    <span style={{ fontSize: 8, color: "#FFD700", fontWeight: 800 }}>{"\u{1F451}"} Super Admin</span>
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "74%", padding: msg.type === "image" ? 4 : "10px 14px", lineHeight: 1.45,
                    borderRadius: isSelf ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: isSelf && selfIsSuperAdmin
                      ? "linear-gradient(135deg,#2d1b69,#1a0a3e)"
                      : isSelf ? "linear-gradient(135deg,#6C5CE7,#A29BFE)" : "rgba(255,255,255,0.07)",
                    border: senderIsSuperAdmin
                      ? "1px solid rgba(255,215,0,0.3)"
                      : isSelf ? "none" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: senderIsSuperAdmin
                      ? "0 4px 14px rgba(255,215,0,0.15), 0 0 8px rgba(191,0,255,0.1)"
                      : isSelf ? "0 4px 14px rgba(108,92,231,0.3)" : "none",
                    fontSize: 14, color: "#fff", overflow: "hidden", position: "relative", cursor: "pointer",
                  }}
                  onDoubleClick={() => setReactionMsgId(reactionMsgId === msg.id ? null : msg.id)}
                >
                  {msg.type === "image" && msg.imageUrl ? (
                    <img src={msg.imageUrl} alt="shared" style={{ width: "100%", borderRadius: 14, display: "block" }} />
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
                      <span style={{ fontSize: 9, color: getStatusColor(msg.status), fontWeight: msg.status === "seen" ? 700 : 400 }}>
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
            padding: "16px 20px", textAlign: "center",
            background: "rgba(108,92,231,0.08)", borderTop: "1px solid rgba(108,92,231,0.15)",
          }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>{"\u{1F512}"}</p>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Chat Locked</p>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.5, marginBottom: 10 }}>
              Both users must follow each other to unlock chat
            </p>
            {!isFollowing && (
              <button onClick={handleFollow} disabled={followLoading} className="btn btn-primary btn-sm" style={{ fontSize: 12 }}>
                {followLoading ? "..." : "\u{1F31F} Follow to unlock"}
              </button>
            )}
            {isFollowing && (
              <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>
                Waiting for them to follow you back...
              </p>
            )}
          </div>
        )}

        {!chatLocked && showEmojiPicker && (
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

        {!chatLocked && showQuickPhrases && (
          <div style={{
            padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(8,4,24,0.95)", display: "flex", flexWrap: "wrap", gap: 6,
            animation: "slide-up 0.2s ease",
          }}>
            {QUICK_PHRASES.map(phrase => (
              <button key={phrase} onClick={async () => {
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

        {!chatLocked && <div style={{
          display: "flex", gap: 6, padding: "10px 12px 26px", alignItems: "center",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(8,4,24,0.85)", backdropFilter: "blur(14px)", flexShrink: 0,
        }}>
          <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "0 2px" }}>{"\u{1F60A}"}</button>
          <button onClick={() => { setShowQuickPhrases(!showQuickPhrases); setShowEmojiPicker(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, padding: "0 2px", color: showQuickPhrases ? "#6C5CE7" : "#A29BFE", fontWeight: 800 }}>{"\u26A1"}</button>
          <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, padding: "0 2px" }}>{"\u{1F4F7}"}</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImageSend} />

          {isRecording ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", background: "rgba(255,100,130,0.1)", borderRadius: 22, border: "1px solid rgba(255,100,130,0.3)" }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: "#ff6482", animation: "pulse-glow 1s infinite" }} />
              <span style={{ fontSize: 13, color: "#ff6482", fontWeight: 700, flex: 1 }}>{formatDuration(recordDuration)}</span>
              <button onClick={stopRecording} style={{ background: "rgba(255,100,130,0.2)", border: "none", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#ff6482" }}>
                {"\u23F9"} Send
              </button>
            </div>
          ) : (
            <>
              <input
                className="input-field"
                style={{ flex: 1, borderRadius: 22, padding: "10px 14px", fontSize: 13 }}
                placeholder="Message..."
                value={input}
                onChange={e => handleTyping(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
              />
              {input.trim() ? (
                <button className="btn btn-primary btn-sm" style={{ width: 40, height: 40, padding: 0, borderRadius: 14, flexShrink: 0 }} onClick={handleSend}>{"\u27A4"}</button>
              ) : (
                <button onClick={startRecording} style={{
                  width: 40, height: 40, borderRadius: 14, border: "none", cursor: "pointer",
                  background: "rgba(108,92,231,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#A29BFE", flexShrink: 0,
                }}>{"\u{1F3A4}"}</button>
              )}
            </>
          )}
        </div>}
      </div>
    );
  }

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 12px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Messages {"\u{1F4AC}"}</h1>
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
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  }}>
                    {conv.participantAvatars[idx]?.startsWith?.("http")
                      ? <img src={conv.participantAvatars[idx]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }} />
                      : conv.participantAvatars[idx]}
                  </div>
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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0", minWidth: 150 }}>
      <button onClick={toggle} style={{
        width: 32, height: 32, borderRadius: 16, border: "none", cursor: "pointer",
        background: isSelf ? "rgba(255,255,255,0.2)" : "rgba(108,92,231,0.3)",
        color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center",
      }}>{playing ? "\u23F8" : "\u25B6"}</button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }}>
          <div style={{ height: "100%", borderRadius: 2, width: `${progress}%`, background: isSelf ? "rgba(255,255,255,0.5)" : "#6C5CE7", transition: "width 0.1s" }} />
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
