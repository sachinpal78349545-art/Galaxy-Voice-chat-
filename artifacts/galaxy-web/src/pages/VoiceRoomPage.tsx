import React, { useState, useEffect, useRef } from "react";
import { uploadWithAppCheck } from "../lib/firebase";
import {
  Room, RoomSeat, RoomUser, RoomMessage, ROOM_THEMES, ROOM_AVATARS,
  subscribeRoom, subscribeRoomMessages, sendRoomMessage,
  raiseHand, kickFromSeat, muteUserSeat, toggleLockSeat, toggleMuteSeat,
  leaveSeat, joinSeat, setCoHost, isOwnerOrAdmin, getUserRole,
  joinRoom, leaveRoom, setAdmin, removeAdmin, banUser, unbanUser,
  kickUserFromRoom, updateRoomSettings, endRoom, deleteRoom,
  followRoom, unfollowRoom,
} from "../lib/roomService";
import { UserProfile, gainXP, sendGift, incrementStat, followUser, reportUser } from "../lib/userService";
import { recordGift, getGiftLeaderboard, LeaderboardEntry, LeaderboardPeriod } from "../lib/giftService";
import { sendNotification } from "../lib/notificationService";
import { voiceService } from "../lib/voiceService";
import { useToast } from "../lib/toastContext";

interface Props { roomId: string; user: UserProfile; onLeave: () => void; enteredPassword?: string; }

function cleanName(name: string | undefined): string {
  if (!name) return "User";
  if (name.length > 20 && /^[a-zA-Z0-9]{15,}$/.test(name)) return name.slice(0, 6) + "..";
  return name.length > 14 ? name.slice(0, 12) + ".." : name;
}

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
const GIFT_COMBOS = [1, 10, 50, 100];
const REACTIONS = [
  { emoji: "\u{1F44F}", label: "Clap" },
  { emoji: "\u{1F525}", label: "Fire" },
  { emoji: "\u2764\uFE0F", label: "Love" },
  { emoji: "\u{1F602}", label: "LOL" },
  { emoji: "\u{1F4AF}", label: "100" },
  { emoji: "\u{1F389}", label: "Party" },
];

export default function VoiceRoomPage({ roomId, user, onLeave, enteredPassword }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
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
  const [showCloseMenu, setShowCloseMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUsersPanel, setShowUsersPanel] = useState(false);
  const [showHostControls, setShowHostControls] = useState(false);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [welcomeAnim, setWelcomeAnim] = useState<string | null>(null);
  const [showSeatSheet, setShowSeatSheet] = useState<number | null>(null);
  const [showProfileCard, setShowProfileCard] = useState<{ uid: string; name: string; avatar: string; seatIdx: number } | null>(null);
  const [settingsTab, setSettingsTab] = useState<"general" | "mic" | "banned">("general");
  const [editName, setEditName] = useState("");
  const [controlPanel, setControlPanel] = useState(false);
  const [cpTab, setCpTab] = useState<"info" | "mic" | "banned" | "members" | "events">("info");
  const [cpEditName, setCpEditName] = useState("");
  const [cpAnnouncement, setCpAnnouncement] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [showReportModal, setShowReportModal] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [giftCombo, setGiftCombo] = useState(1);
  const [showReactions, setShowReactions] = useState(false);
  const [inviteSeatIdx, setInviteSeatIdx] = useState<number | null>(null);
  const [cpDpUploading, setCpDpUploading] = useState(false);
  const cpDpRef = useRef<HTMLInputElement>(null);
  const floatId = useRef(0);
  const msgEnd = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();
  const joinedRef = useRef(false);
  const voiceInitRef = useRef(false);

  useEffect(() => {
    const unsub1 = subscribeRoom(roomId, r => {
      if (!r && joinedRef.current) {
        showToast("Room has ended", "info");
        onLeave();
        return;
      }
      setRoom(r);
      if (r && !joinedRef.current) {
        joinedRef.current = true;
        joinRoom(roomId, user.uid, user.name, user.avatar, enteredPassword).then(res => {
          if (!res.joined) {
            showToast(res.reason || "Cannot join room", "error");
            onLeave();
            return;
          }
          incrementStat(user.uid, "roomsJoined").catch(console.error);
          sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F389}", text: `Welcome ${cleanName(user.name)} to the room \u{1F389}`, type: "welcome" }).catch(console.error);
          setWelcomeAnim(cleanName(user.name));
          setTimeout(() => setWelcomeAnim(null), 3500);
        }).catch(err => {
          console.error("Join error:", err);
          showToast("Failed to join room", "error");
          onLeave();
        });
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

  const isOwner = room?.hostId === user.uid;
  const hasControl = room ? isOwnerOrAdmin(room, user.uid) : false;
  const myRole = room ? getUserRole(room, user.uid) : "user";
  const liveCount = room ? Object.keys(room.roomUsers || {}).length || room.listeners : 0;

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
      gainXP(user.uid, 3, user.xp, user.level).catch(console.error);
      incrementStat(user.uid, "messagesSent").catch(console.error);
    } catch (err) {
      console.error("Chat send error:", err);
      showToast("Failed to send message", "error");
    }
  };

  const sendEmojiMsg = async (e: string) => {
    spawnFloat(e);
    setShowEmoji(false);
    await sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: e, type: "emoji" }).catch(console.error);
  };

  const handleGift = async (gift: typeof GIFTS[0], combo: number = 1) => {
    if (!room) return;
    const totalCost = gift.cost * combo;
    const hostSeat = room.seats.find(s => s.userId && s.userId !== user.uid);
    const recipientId = hostSeat?.userId || room.hostId;
    const recipientName = hostSeat?.username || room.host;
    const success = await sendGift(user.uid, user, recipientId, gift.emoji, totalCost);
    if (!success) { showToast(`Not enough coins! Need ${totalCost}`, "warning", "\u{1F48E}"); return; }
    setGiftAnim({ emoji: gift.emoji, sender: user.name, receiver: recipientName });
    setTimeout(() => setGiftAnim(null), 3000);
    const floatCount = Math.min(combo * 3, 15);
    for (let i = 0; i < floatCount; i++) setTimeout(() => spawnFloat(gift.emoji, true), i * 200);
    setShowGift(false);
    const comboText = combo > 1 ? ` x${combo}` : "";
    showToast(`Sent ${gift.emoji} ${gift.name}${comboText} to ${recipientName}`, "success");
    recordGift({ senderId: user.uid, senderName: user.name, senderAvatar: user.avatar, receiverId: recipientId, receiverName: recipientName, receiverAvatar: hostSeat?.avatar || "\u{1F3A4}", giftEmoji: gift.emoji, coins: totalCost, timestamp: Date.now() }).catch(console.error);
    sendNotification(recipientId, { type: "gift", title: "Gift Received!", body: `${user.name} sent you ${gift.emoji} ${gift.name}${comboText}!`, icon: gift.emoji, fromUid: user.uid, fromName: user.name }).catch(console.error);
    sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: `sent ${gift.emoji} ${gift.name}${comboText} to ${recipientName}`, type: "gift" }).catch(console.error);
  };

  const handleReaction = (emoji: string) => {
    spawnFloat(emoji);
    setShowReactions(false);
    sendRoomMessage(roomId, { userId: user.uid, username: user.name, avatar: user.avatar, text: emoji, type: "emoji" }).catch(console.error);
  };

  const handleSpeakerToggle = () => {
    const newOff = !isSpeakerOff;
    setIsSpeakerOff(newOff);
    voiceService.setSpeakerOff(newOff);
    showToast(newOff ? "Speaker OFF" : "Speaker ON", "info");
  };

  const handleInviteToSeat = async (uid: string, seatIdx: number) => {
    if (!room) return;
    const ru = room.roomUsers?.[uid];
    const uname = ru?.name || "User";
    try {
      const ok = await joinSeat(roomId, seatIdx, uid, uname, ru?.avatar || "\u{1F464}");
      if (!ok) { showToast("Seat not available", "warning"); setInviteSeatIdx(null); return; }
      showToast(`${uname} invited to seat ${seatIdx + 1}`, "success");
      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F3A4}", text: `${cleanName(uname)} was invited to seat ${seatIdx + 1}`, type: "system" }).catch(console.error);
    } catch {
      showToast("Failed to invite", "error");
    }
    setInviteSeatIdx(null);
  };

  const handleRaiseHand = async () => {
    if (!room) return;
    const mySeat = room.seats.findIndex(s => s.userId === user.uid);
    if (mySeat >= 0) {
      const raised = !room.seats[mySeat].handRaised;
      await raiseHand(roomId, mySeat, raised);
      showToast(raised ? "Hand raised! \u270B" : "Hand lowered", "info");
    } else {
      if (room.micPermission === "admin_only" && !hasControl) {
        showToast("Only owner/admins can take seats", "warning");
        return;
      }
      const maxMics = room.maxMics || 12;
      const emptySeat = room.seats.findIndex((s, i) => i < maxMics && !s.userId && !s.isLocked);
      if (emptySeat >= 0) {
        if (room.micPermission === "request" && !hasControl) {
          showToast("Mic request sent to owner/admin", "info");
          sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${cleanName(user.name)} is requesting to speak`, type: "system" }).catch(console.error);
          return;
        }
        const ok = await joinSeat(roomId, emptySeat, user.uid, user.name, user.avatar);
        if (ok) showToast("Joined a seat!", "success");
        else showToast("No seats available", "warning");
      } else {
        showToast("No seats available", "warning");
      }
    }
  };

  const handleSeatAction = async (action: string, seatIdx: number) => {
    if (!room || !hasControl) return;
    try {
      if (action === "kick") {
        const seatUser = room.seats[seatIdx]?.username;
        await kickFromSeat(roomId, seatIdx);
        showToast(`${seatUser} removed from seat`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${seatUser} was removed from seat`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        await muteUserSeat(roomId, seatIdx);
        showToast("User muted", "info");
      } else if (action === "unmute") {
        await toggleMuteSeat(roomId, seatIdx, false);
        showToast("User unmuted", "info");
      } else if (action === "lock") {
        await toggleLockSeat(roomId, seatIdx, !room.seats[seatIdx].isLocked);
        showToast(room.seats[seatIdx].isLocked ? "Seat unlocked" : "Seat locked", "info");
      } else if (action === "cohost") {
        const isCo = room.seats[seatIdx].isCoHost;
        await setCoHost(roomId, seatIdx, !isCo);
        showToast(isCo ? "Co-host removed" : "Co-host assigned!", "success");
      } else if (action === "admin") {
        const uid = room.seats[seatIdx].userId;
        if (uid) {
          const isAdm = (room.adminIds || []).includes(uid);
          if (isAdm) { await removeAdmin(roomId, uid); showToast("Admin removed", "info"); }
          else { await setAdmin(roomId, uid); showToast("Admin assigned!", "success"); }
        }
      }
    } catch (err) {
      console.error("Seat action error:", err);
      showToast("Action failed", "error");
    }
    setShowHostControls(false);
    setSelectedSeat(null);
  };

  const handleUserAction = async (action: string, uid: string) => {
    if (!room) return;
    try {
      const ru = room.roomUsers?.[uid];
      const uname = ru?.name || "User";
      if (action === "make_admin") {
        await setAdmin(roomId, uid);
        showToast(`${uname} is now an Admin`, "success");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6E1}\uFE0F", text: `${cleanName(uname)} was promoted to Admin`, type: "system" }).catch(console.error);
      } else if (action === "remove_admin") {
        await removeAdmin(roomId, uid);
        showToast(`${uname} admin removed`, "info");
      } else if (action === "kick") {
        await kickUserFromRoom(roomId, uid);
        showToast(`${uname} kicked from room`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F6AB}", text: `${cleanName(uname)} was kicked from the room`, type: "system" }).catch(console.error);
      } else if (action === "ban") {
        await banUser(roomId, uid);
        showToast(`${uname} banned`, "info");
        sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u26D4", text: `${cleanName(uname)} was banned from the room`, type: "system" }).catch(console.error);
      } else if (action === "mute") {
        const seatIdx = room.seats.findIndex(s => s.userId === uid);
        if (seatIdx >= 0) { await muteUserSeat(roomId, seatIdx); showToast(`${uname} muted`, "info"); }
      }
    } catch (err) {
      console.error("User action error:", err);
      showToast("Action failed", "error");
    }
    setSelectedUserUid(null);
  };

  const handleMicToggle = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await voiceService.setMuted(newMuted);
    if (room) {
      const mySeat = room.seats.findIndex(s => s.userId === user.uid);
      if (mySeat >= 0) toggleMuteSeat(roomId, mySeat, newMuted).catch(console.error);
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
      if (mySeat >= 0) await leaveSeat(roomId, mySeat).catch(console.error);
      await leaveRoom(roomId, user.uid).catch(console.error);
      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u{1F44B}", text: `${cleanName(user.name)} left the room`, type: "leave" }).catch(console.error);
    }
    onLeave();
  };

  const handleEndRoom = async () => {
    await voiceService.leave();
    if (room) await endRoom(roomId).catch(console.error);
    onLeave();
  };

  const handleSaveSettings = async () => {
    if (!room) return;
    try {
      const updates: any = {};
      if (editName.trim() && editName.trim() !== room.name) updates.name = editName.trim();
      if (Object.keys(updates).length > 0) {
        await updateRoomSettings(roomId, updates);
        showToast("Settings saved!", "success");
      }
    } catch { showToast("Save failed", "error"); }
  };

  const loadLeaderboard = async (period: LeaderboardPeriod) => {
    setLbPeriod(period);
    const entries = await getGiftLeaderboard(period, "senders");
    setLbEntries(entries);
  };

  const roomTheme = ROOM_THEMES.find(t => t.id === (room?.theme || "galaxy")) || ROOM_THEMES[0];
  const roomUsers = room?.roomUsers ? Object.values(room.roomUsers) : [];
  roomUsers.sort((a, b) => {
    const ro = { owner: 0, admin: 1, user: 2 };
    return (ro[a.role] || 2) - (ro[b.role] || 2);
  });

  if (!room) {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto",
        background: "#050310",
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(${import.meta.env.BASE_URL}bg-mystical.png)`,
          backgroundSize: "cover", backgroundPosition: "center",
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.6))" }} />
        <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 48, animation: "mysticFloat 2s ease-in-out infinite", filter: "drop-shadow(0 0 16px rgba(45,212,191,0.6))" }}>{"\u{1F52E}"}</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(45,212,191,0.15)", borderTopColor: "#2DD4BF", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", letterSpacing: 1 }}>Entering the sanctuary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="no-screenshot" style={{
      position: "fixed", inset: 0, zIndex: 300, maxWidth: 400, margin: "0 auto",
      display: "flex", flexDirection: "column", overflow: "hidden",
      background: "#050310", fontFamily: "'Poppins', 'Inter', sans-serif",
    }}>
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: `url(${import.meta.env.BASE_URL}bg-mystical.png)`,
        backgroundSize: "cover", backgroundPosition: "center",
        filter: "saturate(1.6) brightness(1.2) contrast(1.05)",
      }} />

      <div className="galaxy-stars" />
      <div className="galaxy-twinkle" />

      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        background: "radial-gradient(ellipse at 25% 15%, rgba(160,50,255,0.35) 0%, transparent 50%), radial-gradient(ellipse at 80% 75%, rgba(80,230,220,0.2) 0%, transparent 45%), radial-gradient(ellipse at 50% 50%, rgba(138,43,226,0.15) 0%, transparent 60%)",
        animation: "nebulaGlow 7s ease-in-out infinite",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
        background: "radial-gradient(circle at 70% 30%, rgba(45,212,191,0.12) 0%, transparent 40%), radial-gradient(circle at 20% 80%, rgba(160,50,255,0.1) 0%, transparent 35%)",
        animation: "nebulaDrift 12s ease-in-out infinite",
      }} />

      <div style={{
        position: "absolute", inset: 0, zIndex: 4, pointerEvents: "none",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.05), rgba(0,0,0,0.5))",
      }} />

      {floats.map(f => (
        <div key={f.id} style={{
          position: "absolute", bottom: "42%", right: `${f.x}%`, fontSize: f.big ? 52 : 38, zIndex: 500,
          pointerEvents: "none", animation: f.big ? "giftFly 3.2s ease-out forwards" : "emojiFloat 2.8s ease-out forwards",
        }}>{f.item}</div>
      ))}

      {giftAnim && (
        <div style={{
          position: "absolute", top: "22%", left: "50%", transform: "translateX(-50%)",
          zIndex: 600, textAlign: "center", pointerEvents: "none", animation: "giftReveal 3s ease forwards",
        }}>
          <div style={{ fontSize: 80, animation: "giftBounce 0.6s ease infinite" }}>{giftAnim.emoji}</div>
          <div style={{ fontSize: 14, color: "#FFD700", fontWeight: 800, textShadow: "0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(138,43,226,0.5)", marginTop: 8 }}>
            {giftAnim.sender} {"\u27A4"} {giftAnim.receiver}
          </div>
        </div>
      )}

      {welcomeAnim && (
        <div style={{
          position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)",
          zIndex: 700, textAlign: "center", pointerEvents: "none",
          animation: "welcomeEntry 3.5s ease forwards",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: "float 1s ease-in-out infinite", filter: "drop-shadow(0 0 12px rgba(138,43,226,0.8))" }}>{"\u{1F52E}"}</div>
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.15)", borderRadius: 28, padding: "14px 28px",
            boxShadow: "0 8px 32px rgba(138,43,226,0.35), 0 0 60px rgba(138,43,226,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: 0.5 }}>Welcome {welcomeAnim}!</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 3, letterSpacing: 0.3 }}>The sanctuary awaits {"\u2728"}</p>
          </div>
        </div>
      )}

      <div style={{
        position: "relative", zIndex: 10,
        padding: "42px 12px 6px", flexShrink: 0,
        background: "transparent",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div onClick={() => { setControlPanel(true); setCpEditName(room.name); setCpAnnouncement(room.announcement || ""); setCpTab("info"); }}
            style={{
              width: 36, height: 36, borderRadius: 18, fontSize: 20,
              background: "transparent", border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, overflow: "hidden",
            }}>
            {(room.roomAvatar || room.coverEmoji || "\u{1F3A4}").startsWith?.("http")
              ? <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 18 }} />
              : (room.roomAvatar || room.coverEmoji || "\u{1F3A4}")}
          </div>
          <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => { setControlPanel(true); setCpEditName(room.name); setCpAnnouncement(room.announcement || ""); setCpTab("info"); }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#fff", margin: 0, lineHeight: 1.3 }}>{room.name}</h2>
          </div>
          <div style={{ display: "flex", gap: 2, flexShrink: 0, alignItems: "center" }}>
            <button style={{ width: 26, height: 26, padding: 0, borderRadius: 13, fontSize: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}
              onClick={() => {
                const shareText = `Join ${room.name} on Galaxy Voice Chat!`;
                if (navigator.share) navigator.share({ title: room.name, text: shareText }).catch(() => {});
                else { navigator.clipboard?.writeText(shareText + ` Room ID: ${room.id}`); showToast("Room link copied!", "success"); }
              }}>{"\u{1F517}"}</button>
            <button style={{ width: 26, height: 26, padding: 0, borderRadius: 13, fontSize: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}
              onClick={() => setShowUsersPanel(true)}>{"\u{1F465}"}</button>
            <button style={{ width: 26, height: 26, padding: 0, borderRadius: 13, fontSize: 12, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.45)" }}
              onClick={() => { setControlPanel(true); setCpEditName(room.name); setCpAnnouncement(room.announcement || ""); setCpTab("info"); }}>{"\u2630"}</button>
            <button onClick={() => setShowCloseMenu(true)} style={{
              width: 26, height: 26, borderRadius: 13, border: "none",
              background: "transparent", cursor: "pointer", fontSize: 12, color: "rgba(255,100,130,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2715"}</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 44 }}>
          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 6, background: "transparent", border: "1px solid rgba(45,212,191,0.3)", color: "#2DD4BF", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#2DD4BF", animation: "crystalPulse 2s ease-in-out infinite" }} /> LIVE
          </span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>{liveCount} online</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.4)" }}>{"\u23F1"} {elapsed}</span>
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>ID: {room.id.slice(5, 13)}</span>
          <button onClick={() => { loadLeaderboard("daily"); setShowLeaderboard(true); }} style={{
            display: "inline-flex", alignItems: "center", gap: 2, padding: "1px 5px", borderRadius: 6,
            background: "transparent", border: "1px solid rgba(255,215,0,0.2)",
            cursor: "pointer", fontSize: 8, color: "#FFD700", fontWeight: 600, fontFamily: "inherit",
          }}>{"\u{1F3C6}"} {(liveCount * 0.95 + 0.28).toFixed(2)}K</button>
        </div>
      </div>

      {myRole !== "user" && (
        <div style={{
          display: "flex", gap: 4, padding: "4px 12px", position: "relative", zIndex: 10,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700,
            background: myRole === "owner" ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.06)",
            border: myRole === "owner" ? "1px solid rgba(255,215,0,0.2)" : "1px solid rgba(255,255,255,0.1)",
            color: myRole === "owner" ? "#FFD700" : "rgba(255,255,255,0.6)",
          }}>
            {myRole === "owner" ? "\u{1F451} Owner" : "\u{1F6E1}\uFE0F Admin"}
          </span>
          {room.micPermission && room.micPermission !== "all" && (
            <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: "rgba(45,212,191,0.08)", border: "1px solid rgba(45,212,191,0.2)", color: "#2DD4BF" }}>
              {"\u{1F3A4}"} Mic: {room.micPermission === "request" ? "Request" : "Admin Only"}
            </span>
          )}
          {room.isPrivate && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, fontWeight: 700, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>{"\u{1F512}"} Private</span>}
        </div>
      )}

      <div style={{ padding: "6px 10px 4px", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 4,
          background: "transparent", borderRadius: 0, padding: "4px 0",
          border: "none", justifyItems: "center",
        }}>
          {Array.from({ length: 12 }, (_, i) => {
            const seat = room.seats[i] || { index: i, userId: null, username: null, avatar: null, isMuted: false, isLocked: true, isSpeaking: false };
            return (
              <SeatCell
                key={i}
                seat={seat}
                seatIndex={i}
                role={seat.userId ? getUserRole(room, seat.userId) : "user"}
                isMe={seat.userId === user.uid}
                hasControl={hasControl}
                isSpeaking={seat.userId ? (voiceService.joined ? speakingUids.has(Math.abs(hashCode(seat.userId)) % 1000000) : seat.isSpeaking) : false}
                onTap={() => {
                  if (seat.userId === user.uid) return;
                  if (seat.userId) {
                    setShowProfileCard({ uid: seat.userId, name: seat.username || "User", avatar: seat.avatar || "\u{1F464}", seatIdx: i });
                  } else if (!seat.isLocked) {
                    setShowSeatSheet(i);
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "0 10px", position: "relative", zIndex: 10 }}>
        <div style={{
          flex: 1, overflowY: "auto",
          background: "transparent", borderRadius: 0, padding: "6px 4px",
        }}>
          {messages.map(msg => (
            <ChatBubble key={msg.id} msg={msg} isMe={msg.userId === user.uid} />
          ))}
          <div ref={msgEnd} />
        </div>
      </div>

      <div style={{ position: "absolute", right: 10, bottom: 175, zIndex: 20, animation: "sofaFloat 3s ease-in-out infinite" }}>
        <button onClick={handleRaiseHand} style={{
          width: 44, height: 44, borderRadius: 22, border: "1.5px solid rgba(138,43,226,0.3)", cursor: "pointer",
          background: "transparent",
          boxShadow: "0 0 12px rgba(138,43,226,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
        }}>{"\u{1F6CB}\uFE0F"}</button>
      </div>

      <div style={{
        padding: "8px 12px 22px", borderTop: "none",
        background: "transparent", flexShrink: 0,
        position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input className="input-field"
            style={{ flex: 1, borderRadius: 24, padding: "10px 16px", fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontFamily: "'Poppins', 'Inter', sans-serif" }}
            placeholder="Cast your words..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendChat()}
          />
          <button style={{
            width: 40, height: 40, borderRadius: 20, flexShrink: 0, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #8A2BE2, #2DD4BF)", color: "#fff", fontSize: 14, fontWeight: 700,
            boxShadow: "0 0 12px rgba(45,212,191,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={sendChat}>{"\u27A4"}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={handleSpeakerToggle} style={{
              width: 42, height: 42, borderRadius: "50%", cursor: "pointer",
              background: "transparent",
              border: isSpeakerOff ? "1.5px solid rgba(255,100,130,0.4)" : "1.5px solid rgba(45,212,191,0.3)",
              color: isSpeakerOff ? "#ff6482" : "#fff", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isSpeakerOff ? "0 0 8px rgba(255,100,130,0.3)" : "0 0 8px rgba(45,212,191,0.2)",
            }}>{isSpeakerOff ? "\u{1F508}" : "\u{1F50A}"}</button>

            <button onClick={handleMicToggle} style={{
              width: 50, height: 50, borderRadius: 25, cursor: "pointer",
              background: isMuted ? "transparent" : "transparent",
              border: isMuted ? "2px solid rgba(255,100,130,0.4)" : "2px solid rgba(45,212,191,0.5)",
              color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: isMuted ? "0 0 10px rgba(255,100,130,0.3)" : "0 0 14px rgba(45,212,191,0.4), 0 0 28px rgba(138,43,226,0.2)",
              animation: !isMuted ? "mysticGlow 2s infinite" : "none",
              transition: "all 0.25s",
            }}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</button>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "transparent", border: "1.5px solid rgba(138,43,226,0.3)",
              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
              boxShadow: "0 0 8px rgba(138,43,226,0.2)",
            }} onClick={() => {
              const shareText = `Join ${room.name} on Galaxy Voice Chat!`;
              if (navigator.share) navigator.share({ title: room.name, text: shareText }).catch(() => {});
              else { navigator.clipboard?.writeText(shareText + ` Room ID: ${room.id}`); showToast("Room link copied!", "success"); }
            }}>{"\u{1F517}"}</button>

            <PopupBtn icon={"\u{1F4AC}"} active={showEmoji} onToggle={() => { setShowEmoji(!showEmoji); setShowGift(false); setShowVolume(false); setShowReactions(false); }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: 200 }}>
                {EMOJIS.map(e => (
                  <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                    onClick={() => sendEmojiMsg(e)}>{e}</button>
                ))}
              </div>
            </PopupBtn>
          </div>

          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <button onClick={() => { setShowGift(!showGift); setShowEmoji(false); setShowVolume(false); setShowReactions(false); }} style={{
              width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
              background: "transparent", border: "1.5px solid rgba(236,72,153,0.3)",
              boxShadow: "0 0 8px rgba(236,72,153,0.2)",
              color: "#fff", fontSize: 11, fontWeight: 500, fontFamily: "'Poppins', 'Inter', sans-serif",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
            }}><span style={{ fontSize: 16 }}>{"\u{1F381}"}</span><span style={{ fontSize: 7, marginTop: -2 }}>Gift</span></button>

            <button onClick={() => { setShowReactions(!showReactions); setShowEmoji(false); setShowGift(false); setShowVolume(false); }} style={{
              width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
              background: "transparent", border: "1.5px solid rgba(139,92,246,0.3)",
              boxShadow: "0 0 8px rgba(139,92,246,0.2)",
              color: "#fff", fontSize: 11, fontWeight: 500, fontFamily: "'Poppins', 'Inter', sans-serif",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0,
            }}><span style={{ fontSize: 16 }}>{"\u{1F48E}"}</span><span style={{ fontSize: 7, marginTop: -2 }}>Gems</span></button>
          </div>
        </div>

        {showGift && (
          <div style={{
            position: "absolute", bottom: "100%", left: 12, right: 12, marginBottom: 6,
            background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: 14,
            boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 30px rgba(138,43,226,0.1)",
            animation: "popIn 0.15s ease", zIndex: 20,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{"\u{1F48E}"} {user.coins} coins</span>
              <div style={{ display: "flex", gap: 3 }}>
                {GIFT_COMBOS.map(c => (
                  <button key={c} onClick={() => setGiftCombo(c)} style={{
                    padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: "inherit",
                    border: giftCombo === c ? "1px solid rgba(45,212,191,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    background: giftCombo === c ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.04)",
                    color: giftCombo === c ? "#2DD4BF" : "rgba(255,255,255,0.35)", cursor: "pointer",
                  }}>x{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {GIFTS.map(g => {
                const totalCost = g.cost * giftCombo;
                return (
                  <button key={g.emoji} onClick={() => handleGift(g, giftCombo)} style={{
                    background: user.coins >= totalCost ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
                    cursor: user.coins >= totalCost ? "pointer" : "not-allowed",
                    padding: "6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    opacity: user.coins >= totalCost ? 1 : 0.35,
                  }}>
                    <span style={{ fontSize: 20 }}>{g.emoji}</span>
                    <span style={{ fontSize: 8, color: "#FFD700", fontWeight: 700 }}>{totalCost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showReactions && (
          <div style={{
            position: "absolute", bottom: "100%", right: 12, marginBottom: 6,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "10px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "popIn 0.15s ease", zIndex: 20,
            display: "flex", gap: 8,
          }}>
            {REACTIONS.map(r => (
              <button key={r.emoji} onClick={() => handleReaction(r.emoji)} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 4,
                transition: "transform 0.15s", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.3)")}
                onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>{r.emoji}</button>
            ))}
          </div>
        )}
      </div>

      {showCloseMenu && (
        <Overlay onClose={() => setShowCloseMenu(false)}>
          <div className="card" style={{ width: 280, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center" }}>{"\u{1F6AA}"} Leave Room?</h3>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", marginBottom: 20, textAlign: "center" }}>
              {isOwner ? "As the owner, you can leave or end the room for everyone." : "Are you sure you want to leave?"}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-ghost btn-full" onClick={() => { setShowCloseMenu(false); handleLeave(); }}>
                {"\u{1F44B}"} Leave Room
              </button>
              {isOwner && (
                <button className="btn btn-danger btn-full" onClick={() => { setShowCloseMenu(false); handleEndRoom(); }}>
                  {"\u{1F6D1}"} End Room for Everyone
                </button>
              )}
              <button className="btn btn-ghost btn-full" onClick={() => setShowCloseMenu(false)} style={{ color: "rgba(162,155,254,0.4)" }}>
                Cancel
              </button>
            </div>
          </div>
        </Overlay>
      )}

      {showHostControls && selectedSeat !== null && room.seats[selectedSeat]?.userId && (
        <Overlay onClose={() => { setShowHostControls(false); setSelectedSeat(null); }}>
          <div className="card" style={{ width: 280, padding: 20, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 22, fontSize: 22,
                background: "rgba(108,92,231,0.15)", border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>{room.seats[selectedSeat].avatar}</div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800 }}>{room.seats[selectedSeat].username}</p>
                <RoleBadge role={getUserRole(room, room.seats[selectedSeat].userId!)} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction(room.seats[selectedSeat].isMuted ? "unmute" : "mute", selectedSeat)}>
                {room.seats[selectedSeat].isMuted ? "\u{1F50A} Unmute" : "\u{1F507} Mute"}
              </button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("kick", selectedSeat)}>{"\u{1F6AB}"} Remove from Seat</button>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => handleSeatAction("lock", selectedSeat)}>
                {room.seats[selectedSeat].isLocked ? "\u{1F513} Unlock Seat" : "\u{1F512} Lock Seat"}
              </button>
              {isOwner && (
                <>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("admin", selectedSeat)}>
                    {(room.adminIds || []).includes(room.seats[selectedSeat].userId!) ? "\u274C Remove Admin" : "\u{1F6E1}\uFE0F Make Admin"}
                  </button>
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                    onClick={() => handleSeatAction("cohost", selectedSeat)}>
                    {room.seats[selectedSeat].isCoHost ? "\u274C Remove Co-Host" : "\u{1F451} Make Co-Host"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showUsersPanel && (
        <Overlay onClose={() => { setShowUsersPanel(false); setSelectedUserUid(null); }}>
          <div className="card" style={{
            position: "absolute", right: 0, top: 0, bottom: 0, width: 300,
            borderRadius: "20px 0 0 20px", padding: 0, animation: "slideFromRight 0.3s ease",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 900 }}>{"\u{1F465}"} Users ({roomUsers.length})</h3>
              <button onClick={() => setShowUsersPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              {roomUsers.map(ru => (
                <div key={ru.uid} onClick={() => hasControl && ru.uid !== user.uid && ru.role !== "owner" ? setSelectedUserUid(selectedUserUid === ru.uid ? null : ru.uid) : null}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 6px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: hasControl && ru.uid !== user.uid && ru.role !== "owner" ? "pointer" : "default",
                    background: selectedUserUid === ru.uid ? "rgba(108,92,231,0.08)" : "transparent",
                    borderRadius: 12, transition: "background 0.2s",
                  }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 18, fontSize: 18,
                    background: "rgba(108,92,231,0.12)", border: `1.5px solid ${ru.role === "owner" ? "rgba(255,215,0,0.5)" : ru.role === "admin" ? "rgba(108,92,231,0.5)" : "rgba(108,92,231,0.2)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{ru.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ru.name}</span>
                      {ru.uid === user.uid && <span style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>(you)</span>}
                    </div>
                    <RoleBadge role={ru.role} />
                  </div>
                  {ru.seatIndex !== null && ru.seatIndex !== undefined && (
                    <span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>Seat {ru.seatIndex + 1}</span>
                  )}
                </div>
              ))}
              {selectedUserUid && (
                <div style={{ padding: "8px 4px", animation: "slide-up 0.2s ease" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {isOwner && !(room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("make_admin", selectedUserUid)}>{"\u{1F6E1}\uFE0F"} Admin</button>
                    )}
                    {isOwner && (room.adminIds || []).includes(selectedUserUid) && (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("remove_admin", selectedUserUid)}>{"\u274C"} Remove Admin</button>
                    )}
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("mute", selectedUserUid)}>{"\u{1F507}"} Mute</button>
                    <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                      onClick={() => handleUserAction("kick", selectedUserUid)}>{"\u{1F6AB}"} Kick</button>
                    {isOwner && (
                      <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }}
                        onClick={() => handleUserAction("ban", selectedUserUid)}>{"\u26D4"} Ban</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Overlay>
      )}

      {controlPanel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 700, maxWidth: 400, margin: "0 auto",
          background: "linear-gradient(160deg, #1A0F2E, #0F0F1A)",
          display: "flex", flexDirection: "column",
          animation: "slide-up 0.3s ease",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "52px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <button onClick={() => setControlPanel(false)} style={{
              background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#A29BFE",
              width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            }}>{"\u2190"}</button>
            <h2 style={{ fontSize: 17, fontWeight: 900, flex: 1 }}>Room Control Panel</h2>
            {hasControl && <RoleBadge role={myRole} />}
          </div>

          <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {([
              { key: "info", icon: "\u2139\uFE0F", label: "Profile" },
              { key: "members", icon: "\u{1F465}", label: "Followers" },
              { key: "mic", icon: "\u{1F3A4}", label: "Mic" },
              { key: "banned", icon: "\u26D4", label: "Banned" },
              { key: "events", icon: "\u{1F389}", label: "Events" },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setCpTab(t.key)} style={{
                flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit",
                background: cpTab === t.key ? "rgba(108,92,231,0.12)" : "transparent",
                color: cpTab === t.key ? "#A29BFE" : "rgba(162,155,254,0.4)",
                fontSize: 10, fontWeight: 700,
                borderBottom: cpTab === t.key ? "2px solid #6C5CE7" : "2px solid transparent",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {cpTab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <input type="file" accept="image/*" ref={cpDpRef} style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setCpDpUploading(true);
                      try {
                        const ext = file.name.split(".").pop() || "jpg";
                        const path = `room-avatars/${roomId}_${Date.now()}.${ext}`;
                        const { url } = await uploadWithAppCheck(file, path);
                        await updateRoomSettings(roomId, { roomAvatar: url });
                        showToast("Room DP updated!", "success");
                      } catch (err) { console.error("[Room DP] Upload failed:", err); showToast("Upload failed", "error"); }
                      setCpDpUploading(false);
                    }} />
                  <div onClick={() => hasControl && cpDpRef.current?.click()} style={{
                    width: 80, height: 80, borderRadius: 24, fontSize: 40, margin: "0 auto 10px",
                    background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                    border: "3px solid rgba(108,92,231,0.4)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 24px rgba(108,92,231,0.25)",
                    cursor: hasControl ? "pointer" : "default", overflow: "hidden", position: "relative",
                  }}>
                    {cpDpUploading ? (
                      <div style={{ width: 28, height: 28, borderRadius: 14, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
                    ) : (room.roomAvatar || "\u{1F3A4}").startsWith?.("http") ? (
                      <img src={room.roomAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 24 }} />
                    ) : (room.roomAvatar || "\u{1F3A4}")}
                    {hasControl && !cpDpUploading && (
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, padding: "3px 0",
                        background: "rgba(0,0,0,0.5)", fontSize: 8, color: "#fff", fontWeight: 700,
                      }}>{"\u{1F4F7}"} Change</div>
                    )}
                  </div>
                  {hasControl && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center", marginTop: 10 }}>
                      {ROOM_AVATARS.map(a => (
                        <button key={a} onClick={() => updateRoomSettings(roomId, { roomAvatar: a }).then(() => showToast("Avatar updated!", "success")).catch(console.error)}
                          style={{
                            width: 38, height: 38, borderRadius: 12, border: room.roomAvatar === a ? "2px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                            background: room.roomAvatar === a ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                            cursor: "pointer", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{a}</button>
                      ))}
                    </div>
                  )}
                </div>
                
                <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                  <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Level Progress</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 900, color: "#FFD700" }}>Lv.{room.roomLevel || 1}</span>
                    <div style={{ flex: 1, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div style={{
                        width: `${Math.min(((room.roomLevel || 1) % 10) * 10 + 30, 100)}%`, height: "100%",
                        background: "linear-gradient(90deg, #6C5CE7, #FFD700)", borderRadius: 5,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>Lv.{(room.roomLevel || 1) + 1}</span>
                  </div>
                </div>

                <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                  <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>Room Name</label>
                  {hasControl ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input className="input-field" value={cpEditName} onChange={e => setCpEditName(e.target.value)}
                        style={{ flex: 1, borderRadius: 14, padding: "10px 14px", fontSize: 13 }} />
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "8px 14px" }}
                        onClick={async () => {
                          if (cpEditName.trim() && cpEditName.trim() !== room.name) {
                            await updateRoomSettings(roomId, { name: cpEditName.trim() } as any);
                            showToast("Name updated!", "success");
                          }
                        }}>Save</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{room.name}</p>
                  )}
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)", textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>ROOM ID</p>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#A29BFE", fontFamily: "monospace", marginTop: 4 }}>{room.id.slice(5, 21)}</p>
                  </div>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)", textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>LEVEL</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#FFD700", marginTop: 2 }}>Lv.{room.roomLevel || 1}</p>
                  </div>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)", textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>ONLINE</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#00e676", marginTop: 2 }}>{liveCount}</p>
                  </div>
                </div>

                <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                  <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Theme</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {ROOM_THEMES.map(t => (
                      <button key={t.id} onClick={() => hasControl && updateRoomSettings(roomId, { theme: t.id }).then(() => showToast("Theme updated!", "success")).catch(console.error)}
                        style={{
                          padding: "7px 14px", borderRadius: 12, border: (room.theme || "galaxy") === t.id ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                          background: (room.theme || "galaxy") === t.id ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                          cursor: hasControl ? "pointer" : "default", fontSize: 12, fontWeight: 600,
                          color: (room.theme || "galaxy") === t.id ? "#A29BFE" : "rgba(162,155,254,0.4)", fontFamily: "inherit",
                        }}>{t.name}</button>
                    ))}
                  </div>
                </div>

                <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                  <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 6, display: "block" }}>{"\u{1F4E2}"} Announcement</label>
                  {hasControl ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <input className="input-field" value={cpAnnouncement} onChange={e => setCpAnnouncement(e.target.value)}
                        placeholder="Set room announcement..."
                        style={{ flex: 1, borderRadius: 14, padding: "10px 14px", fontSize: 12 }} />
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "8px 14px" }}
                        onClick={() => {
                          updateRoomSettings(roomId, { announcement: cpAnnouncement.trim() } as any)
                            .then(() => showToast("Announcement updated!", "success")).catch(console.error);
                        }}>Save</button>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: "rgba(162,155,254,0.6)" }}>{room.announcement || "No announcement"}</p>
                  )}
                </div>

                <div style={{ background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: 14, border: "1px solid rgba(108,92,231,0.1)" }}>
                  <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Room Enter Permission</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["everyone", "invite_only"] as const).map(ep => (
                      <button key={ep} onClick={() => hasControl && updateRoomSettings(roomId, { enterPermission: ep } as any).then(() => showToast("Updated!", "success")).catch(console.error)}
                        style={{
                          flex: 1, padding: "10px 8px", borderRadius: 12, fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                          border: (room.enterPermission || "everyone") === ep ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                          background: (room.enterPermission || "everyone") === ep ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                          color: (room.enterPermission || "everyone") === ep ? "#A29BFE" : "rgba(162,155,254,0.4)",
                          cursor: hasControl ? "pointer" : "default",
                        }}>
                        {ep === "everyone" ? "\u{1F30D} Everyone" : "\u{1F512} Invite Only"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700, marginBottom: 4 }}>{"\u{1F3A4}"} Mic Seats</p>
                    {hasControl ? (
                      <select value={room.maxMics || room.seats.length}
                        onChange={e => updateRoomSettings(roomId, { maxMics: parseInt(e.target.value) } as any).then(() => showToast("Updated!", "success")).catch(console.error)}
                        style={{
                          width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 14, fontWeight: 800,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(108,92,231,0.2)",
                          color: "#A29BFE", fontFamily: "inherit",
                        }}>
                        {[4, 6, 8, 10, 12].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    ) : (
                      <p style={{ fontSize: 18, fontWeight: 900, color: "#A29BFE" }}>{room.maxMics || room.seats.length}</p>
                    )}
                  </div>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700, marginBottom: 4 }}>Mode</p>
                    {hasControl ? (
                      <select value={room.mode || "voice"}
                        onChange={e => updateRoomSettings(roomId, { mode: e.target.value as "voice" | "chat" } as any).then(() => showToast("Updated!", "success")).catch(console.error)}
                        style={{
                          width: "100%", padding: "6px 8px", borderRadius: 8, fontSize: 14, fontWeight: 800,
                          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(108,92,231,0.2)",
                          color: "#A29BFE", fontFamily: "inherit",
                        }}>
                        <option value="voice">{"\u{1F3A4}"} Voice</option>
                        <option value="chat">{"\u{1F4AC}"} Chat</option>
                      </select>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 800, color: "#A29BFE" }}>{room.mode === "chat" ? "\u{1F4AC} Chat" : "\u{1F3A4} Voice"}</p>
                    )}
                  </div>
                  <div style={{ flex: 1, background: "rgba(108,92,231,0.06)", borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)", textAlign: "center" }}>
                    <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>Admins</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#6C5CE7", marginTop: 2 }}>{(room.adminIds || []).length}</p>
                  </div>
                </div>

                {hasControl && (
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: "rgba(108,92,231,0.06)", borderRadius: 16, padding: "12px 14px", border: "1px solid rgba(108,92,231,0.1)",
                  }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{"\u{1F512}"} Private Room</span>
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>Only invited users can join</p>
                    </div>
                    <button onClick={() => updateRoomSettings(roomId, { isPrivate: !room.isPrivate }).then(() => showToast(room.isPrivate ? "Room is now Public" : "Room is now Private", "info")).catch(console.error)}
                      style={{
                        width: 48, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                        background: room.isPrivate ? "#6C5CE7" : "rgba(255,255,255,0.15)", position: "relative",
                        transition: "background 0.2s",
                      }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 10, background: "#fff", position: "absolute", top: 3,
                        left: room.isPrivate ? 25 : 3, transition: "left 0.2s",
                      }} />
                    </button>
                  </div>
                )}

                {!isOwner && (
                  <button className="btn btn-ghost btn-full" style={{ fontSize: 13, padding: "12px 0" }}
                    onClick={async () => {
                      try {
                        const isFollowing = room.roomFollowers?.[user.uid];
                        if (isFollowing) {
                          await unfollowRoom(roomId, user.uid);
                          showToast("Unfollowed room", "info");
                        } else {
                          await followRoom(roomId, user.uid, user.name, user.avatar);
                          showToast("Following room!", "success");
                        }
                      } catch {
                        showToast("Action failed", "error");
                      }
                    }}>
                    {room.roomFollowers?.[user.uid] ? "\u2705 Following Room" : "\u2795 Follow Room"}
                  </button>
                )}
              </div>
            )}

            {cpTab === "mic" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, color: "rgba(162,155,254,0.6)", fontWeight: 700, marginBottom: 4 }}>Who can take a mic seat?</p>
                {(["all", "request", "admin_only"] as const).map(perm => (
                  <button key={perm} onClick={() => hasControl && updateRoomSettings(roomId, { micPermission: perm }).then(() => showToast("Mic permission updated!", "success")).catch(console.error)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                      borderRadius: 16, border: (room.micPermission || "all") === perm ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                      background: (room.micPermission || "all") === perm ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                      cursor: hasControl ? "pointer" : "default", fontFamily: "inherit", color: "#fff", textAlign: "left", width: "100%",
                    }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                      background: (room.micPermission || "all") === perm ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.04)",
                      fontSize: 20, flexShrink: 0,
                    }}>{perm === "all" ? "\u{1F3A4}" : perm === "request" ? "\u270B" : "\u{1F6E1}\uFE0F"}</div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{perm === "all" ? "Everyone" : perm === "request" ? "Request Only" : "Admin Only"}</p>
                      <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginTop: 2 }}>
                        {perm === "all" ? "Anyone can take a seat freely" : perm === "request" ? "Users must request, owner/admin approves" : "Only owner and admins can speak"}
                      </p>
                    </div>
                    {(room.micPermission || "all") === perm && (
                      <span style={{ marginLeft: "auto", fontSize: 16, color: "#6C5CE7" }}>{"\u2713"}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {cpTab === "banned" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <p style={{ fontSize: 13, color: "rgba(162,155,254,0.6)", fontWeight: 700 }}>Banned Users</p>
                  <span className="badge badge-accent" style={{ fontSize: 10 }}>{(room.bannedUsers || []).length}</span>
                </div>
                {(room.bannedUsers || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>{"\u2705"}</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "rgba(162,155,254,0.5)" }}>No banned users</p>
                    <p style={{ fontSize: 11, color: "rgba(162,155,254,0.3)", marginTop: 4 }}>All users are welcome in this room</p>
                  </div>
                ) : (
                  (room.bannedUsers || []).map(uid => (
                    <div key={uid} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "12px 14px", borderRadius: 14, background: "rgba(255,100,130,0.04)",
                      border: "1px solid rgba(255,100,130,0.1)",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 18, fontSize: 16,
                        background: "rgba(255,100,130,0.1)", border: "1.5px solid rgba(255,100,130,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>{"\u26D4"}</div>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, color: "rgba(162,155,254,0.6)", fontFamily: "monospace" }}>{uid.slice(0, 20)}...</span>
                      </div>
                      {isOwner && (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "#00e676" }}
                          onClick={() => unbanUser(roomId, uid).then(() => showToast("User unbanned", "success")).catch(console.error)}>
                          {"\u{1F513}"} Unban
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {cpTab === "events" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", gap: 16 }}>
                <div style={{ fontSize: 56, animation: "float 3s ease-in-out infinite" }}>{"\u{1F389}"}</div>
                <h3 style={{ fontSize: 18, fontWeight: 900 }}>Events Coming Soon</h3>
                <p style={{ fontSize: 13, color: "rgba(162,155,254,0.4)", textAlign: "center", lineHeight: 1.6 }}>
                  Host exciting events in your room like karaoke nights, talent shows, Q&A sessions and more!
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 8 }}>
                  {["\u{1F3A4} Karaoke Night", "\u{1F3AD} Talent Show", "\u{1F4AC} Q&A", "\u{1F3B6} Music Battle", "\u{1F3C6} Tournament"].map(e => (
                    <span key={e} style={{
                      padding: "8px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: "rgba(108,92,231,0.08)", border: "1px solid rgba(108,92,231,0.15)",
                      color: "rgba(162,155,254,0.5)",
                    }}>{e}</span>
                  ))}
                </div>
              </div>
            )}

            {cpTab === "members" && (() => {
              const followers = room.roomFollowers ? Object.values(room.roomFollowers) : [];
              const searchQ = memberSearch.toLowerCase();
              const filteredUsers = searchQ ? roomUsers.filter(u => u.name.toLowerCase().includes(searchQ) || u.uid.includes(searchQ)) : roomUsers;
              const filteredFollowers = searchQ ? followers.filter(f => f.name.toLowerCase().includes(searchQ) || f.uid.includes(searchQ)) : followers;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <input className="input-field" placeholder="Search by name or ID..."
                    value={memberSearch} onChange={e => setMemberSearch(e.target.value)}
                    style={{ borderRadius: 14, padding: "10px 14px", fontSize: 12, marginBottom: 4 }} />
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#A29BFE" }}>{"\u{1F465}"} Online ({filteredUsers.length})</p>
                    </div>
                    {filteredUsers.map(ru => (
                      <div key={ru.uid} style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 8px",
                        borderBottom: "1px solid rgba(255,255,255,0.04)", borderRadius: 12,
                      }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: 19, fontSize: 19,
                          background: "rgba(108,92,231,0.12)", display: "flex", alignItems: "center", justifyContent: "center",
                          border: `2px solid ${ru.role === "owner" ? "rgba(255,215,0,0.5)" : ru.role === "admin" ? "rgba(108,92,231,0.5)" : "rgba(108,92,231,0.2)"}`,
                        }}>{ru.avatar}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ru.name}</span>
                            {ru.uid === user.uid && <span style={{ fontSize: 9, color: "rgba(162,155,254,0.4)" }}>(you)</span>}
                          </div>
                          <RoleBadge role={ru.role} />
                        </div>
                        {hasControl && ru.uid !== user.uid && ru.role !== "owner" && (
                          <div style={{ display: "flex", gap: 4 }}>
                            {ru.seatIndex === null && (
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: "4px 8px", color: "#00b894" }}
                                onClick={() => {
                                  const mxM = room.maxMics || 12;
                                  const emptySeat = room.seats.findIndex((s, si) => si < mxM && !s.userId && !s.isLocked);
                                  if (emptySeat >= 0) handleInviteToSeat(ru.uid, emptySeat);
                                  else showToast("No empty seats available", "warning");
                                }}>{"\u{1F4BA}"} Seat</button>
                            )}
                            {isOwner && (
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 9, padding: "4px 8px" }}
                                onClick={() => {
                                  const isAdm = (room.adminIds || []).includes(ru.uid);
                                  if (isAdm) removeAdmin(roomId, ru.uid).then(() => showToast("Admin removed", "info")).catch(() => showToast("Failed", "error"));
                                  else setAdmin(roomId, ru.uid).then(() => showToast("Admin set!", "success")).catch(() => showToast("Failed", "error"));
                                }}>
                                {(room.adminIds || []).includes(ru.uid) ? "\u274C Admin" : "\u{1F6E1}\uFE0F Admin"}
                              </button>
                            )}
                            <button className="btn btn-danger btn-sm" style={{ fontSize: 9, padding: "4px 8px" }}
                              onClick={() => handleUserAction("kick", ru.uid)}>{"\u{1F6AB}"}</button>
                            {isOwner && (
                              <button className="btn btn-danger btn-sm" style={{ fontSize: 9, padding: "4px 8px" }}
                                onClick={() => handleUserAction("ban", ru.uid)}>{"\u26D4"}</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700" }}>{"\u2B50"} Followers ({filteredFollowers.length})</p>
                    </div>
                    {filteredFollowers.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px 0" }}>
                        <p style={{ fontSize: 12, color: "rgba(162,155,254,0.3)" }}>No room followers yet</p>
                      </div>
                    ) : (
                      filteredFollowers.sort((a, b) => b.followedAt - a.followedAt).map(f => (
                        <div key={f.uid} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "8px 8px",
                          borderBottom: "1px solid rgba(255,255,255,0.04)",
                        }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 16, fontSize: 16,
                            background: "rgba(255,215,0,0.08)", border: "1.5px solid rgba(255,215,0,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>{f.avatar}</div>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{f.name}</span>
                          <span style={{ fontSize: 9, color: "rgba(162,155,254,0.3)" }}>
                            {new Date(f.followedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {showLeaderboard && (
        <Overlay onClose={() => setShowLeaderboard(false)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: 20, animation: "slide-up 0.3s ease",
            maxHeight: "60vh", display: "flex", flexDirection: "column",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900 }}>{"\u{1F3C6}"} Gift Leaderboard</h2>
              <button onClick={() => setShowLeaderboard(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "rgba(162,155,254,0.5)" }}>{"\u2715"}</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {(["daily", "weekly", "monthly"] as LeaderboardPeriod[]).map(p => (
                <button key={p} onClick={() => loadLeaderboard(p)} style={{
                  flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  background: lbPeriod === p ? "rgba(108,92,231,0.3)" : "rgba(255,255,255,0.04)",
                  color: lbPeriod === p ? "#A29BFE" : "rgba(162,155,254,0.4)",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                }}>{p}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {lbEntries.length === 0 ? (
                <p style={{ textAlign: "center", color: "rgba(162,155,254,0.3)", padding: 24 }}>No gifts yet</p>
              ) : (
                lbEntries.map((entry, i) => (
                  <div key={entry.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ fontSize: 15, fontWeight: 900, width: 22, textAlign: "center", color: i < 3 ? "#FFD700" : "rgba(162,155,254,0.4)" }}>
                      {i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : `${i + 1}`}
                    </span>
                    <span style={{ fontSize: 18 }}>{entry.avatar}</span>
                    <p style={{ flex: 1, fontSize: 12, fontWeight: 700 }}>{entry.name}</p>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#FFD700" }}>{"\u{1F48E}"}{entry.totalCoins}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Overlay>
      )}

      {showSeatSheet !== null && (
        <Overlay onClose={() => setShowSeatSheet(null)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: "20px 20px 32px",
            animation: "sheetUp 0.3s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <h3 style={{ fontSize: 15, fontWeight: 900, textAlign: "center", marginBottom: 4 }}>Seat {showSeatSheet + 1}</h3>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", textAlign: "center", marginBottom: 18 }}>Choose an action</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary btn-full" style={{ fontSize: 14, padding: "14px 0" }}
                onClick={() => {
                  const idx = showSeatSheet;
                  setShowSeatSheet(null);
                  if (room && idx !== null) {
                    if (room.micPermission === "admin_only" && !hasControl) {
                      showToast("Only owner/admins can take seats", "warning");
                      return;
                    }
                    if (room.micPermission === "request" && !hasControl) {
                      showToast("Mic request sent to owner/admin", "info");
                      sendRoomMessage(roomId, { userId: "system", username: "System", avatar: "\u270B", text: `${cleanName(user.name)} is requesting to speak`, type: "system" }).catch(console.error);
                      return;
                    }
                    joinSeat(roomId, idx, user.uid, user.name, user.avatar).then((ok) => {
                      if (ok) showToast("Joined seat!", "success");
                      else showToast("Seat not available", "warning");
                    }).catch(console.error);
                  }
                }}>
                {"\u{1F3A4}"} Take Mic
              </button>
              {hasControl && (
                <button className="btn btn-ghost btn-full" style={{ fontSize: 14, padding: "14px 0" }}
                  onClick={() => {
                    const idx = showSeatSheet;
                    setShowSeatSheet(null);
                    if (idx !== null) {
                      toggleLockSeat(roomId, idx, true).then(() => showToast("Seat locked", "info")).catch(console.error);
                    }
                  }}>
                  {"\u{1F512}"} Lock Mic
                </button>
              )}
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13, color: "rgba(162,155,254,0.4)" }}
                onClick={() => setShowSeatSheet(null)}>Cancel</button>
            </div>
          </div>
        </Overlay>
      )}

      {showProfileCard && (
        <Overlay onClose={() => setShowProfileCard(null)}>
          <div className="card" style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0", padding: "20px 20px 32px",
            animation: "sheetUp 0.3s ease", maxHeight: "80vh", overflowY: "auto",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 16px" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 40, fontSize: 40,
                  background: "linear-gradient(135deg, rgba(108,92,231,0.25), rgba(108,92,231,0.1))",
                  border: "3px solid rgba(108,92,231,0.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 4px 20px rgba(108,92,231,0.3), 0 0 0 4px rgba(108,92,231,0.15)",
                  overflow: "hidden",
                }}>
                  {showProfileCard.avatar?.startsWith("http")
                    ? <img src={showProfileCard.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 40, objectFit: "cover" }} />
                    : showProfileCard.avatar}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h3 style={{ fontSize: 18, fontWeight: 900 }}>{showProfileCard.name}</h3>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                {(() => {
                  const ru = room?.roomUsers?.[showProfileCard.uid];
                  const role = ru?.role || getUserRole(room!, showProfileCard.uid);
                  return (
                    <>
                      <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", fontFamily: "monospace" }}>ID: {showProfileCard.uid.slice(0, 8)}</span>
                      <RoleBadge role={role} />
                    </>
                  );
                })()}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                <span className="badge badge-accent" style={{ fontSize: 10, padding: "2px 8px" }}>{"\u{1F3C6}"} Lv.{room?.roomLevel || 1}</span>
                <span className="badge badge-vip" style={{ fontSize: 10, padding: "2px 8px" }}>{"\u{1F451}"} VIP</span>
                <span style={{
                  fontSize: 10, padding: "2px 8px", borderRadius: 8,
                  background: "rgba(255,100,130,0.1)", border: "1px solid rgba(255,100,130,0.2)", color: "#ff6482",
                }}>{"\u2764\uFE0F"} Intimacy</span>
              </div>
            </div>

            <div style={{
              display: "flex", justifyContent: "space-around", marginBottom: 14, padding: "12px 10px",
              background: "rgba(108,92,231,0.06)", borderRadius: 16, border: "1px solid rgba(108,92,231,0.1)",
            }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>GIFTS</p>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {["\u{1F381}", "\u{1F48E}", "\u{1F451}", "\u{1F339}"].map(g => (
                    <span key={g} style={{ fontSize: 16 }}>{g}</span>
                  ))}
                </div>
              </div>
              <div style={{ width: 1, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 9, color: "rgba(162,155,254,0.4)", fontWeight: 700 }}>BADGES</p>
                <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                  {["\u{1F31F}", "\u{1F525}", "\u{1F3C6}", "\u{1F48E}"].map(b => (
                    <span key={b} style={{ fontSize: 16 }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={async () => {
                  try {
                    const isFollowing = (user.followingList || []).includes(showProfileCard!.uid);
                    if (isFollowing) { showToast("Already following!", "info"); }
                    else {
                      const res = await followUser(user.uid, showProfileCard!.uid);
                      showToast(res.isMutual ? "You're now friends!" : "Followed!", "success");
                    }
                  } catch { showToast("Follow failed", "error"); }
                  setShowProfileCard(null);
                }}>
                {(user.followingList || []).includes(showProfileCard.uid) ? "\u2705 Following" : "\u2795 Follow"}
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={() => {
                  showToast("Opening chat...", "info");
                  setShowProfileCard(null);
                }}>
                {"\u{1F4AC}"} Chat
              </button>
              <button className="btn btn-ghost" style={{ flex: 1, fontSize: 13, padding: "12px 0", borderRadius: 14 }}
                onClick={() => {
                  setShowProfileCard(null);
                  setShowGift(true);
                }}>
                {"\u{1F381}"} Gift
              </button>
            </div>

            <div style={{ display: "flex", gap: 6, marginBottom: hasControl ? 10 : 0, flexWrap: "wrap" }}>
              {hasControl && (
                <>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={() => {
                      const pc = showProfileCard;
                      setShowProfileCard(null);
                      const mxM2 = room?.maxMics || 12;
                      const emptySeat = room?.seats.findIndex((s, si) => si < mxM2 && !s.userId && !s.isLocked);
                      if (emptySeat !== undefined && emptySeat >= 0) handleInviteToSeat(pc!.uid, emptySeat);
                      else showToast("No empty seats", "warning");
                    }}>
                    {"\u{1F3A4}"} Invite Mic
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={() => {
                      const pc = showProfileCard;
                      setShowProfileCard(null);
                      setSelectedSeat(pc!.seatIdx);
                      setShowHostControls(true);
                    }}>
                    {"\u2699\uFE0F"} Manage
                  </button>
                </>
              )}
              <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12, color: "rgba(255,100,130,0.7)" }}
                onClick={() => {
                  setShowReportModal(showProfileCard!.uid);
                  setShowProfileCard(null);
                }}>
                {"\u26A0\uFE0F"} Report
              </button>
            </div>

            {hasControl && (
              <div style={{ display: "flex", gap: 6 }}>
                {isOwner && (
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                    onClick={async () => {
                      const uid = showProfileCard!.uid;
                      const isAdm = (room?.adminIds || []).includes(uid);
                      if (isAdm) { await removeAdmin(roomId, uid); showToast("Admin removed", "info"); }
                      else { await setAdmin(roomId, uid); showToast("Admin set!", "success"); }
                      setShowProfileCard(null);
                    }}>
                    {(room?.adminIds || []).includes(showProfileCard.uid) ? "\u274C Remove Admin" : "\u{1F6E1}\uFE0F Make Admin"}
                  </button>
                )}
                <button className="btn btn-ghost btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                  onClick={() => { handleSeatAction("mute", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F507}"} Mute
                </button>
                <button className="btn btn-danger btn-sm" style={{ flex: 1, fontSize: 11, borderRadius: 12 }}
                  onClick={() => { handleSeatAction("kick", showProfileCard!.seatIdx); setShowProfileCard(null); }}>
                  {"\u{1F6AB}"} Kick
                </button>
              </div>
            )}
          </div>
        </Overlay>
      )}

      {showReportModal && (
        <Overlay onClose={() => { setShowReportModal(null); setReportReason(""); }}>
          <div className="card" style={{ width: 300, padding: 24, animation: "popIn 0.2s ease" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center" }}>{"\u26A0\uFE0F"} Report User</h3>
            <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", textAlign: "center", marginBottom: 16 }}>Select a reason for reporting</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
              {["Harassment", "Spam", "Inappropriate Content", "Fake Profile", "Other"].map(r => (
                <button key={r} onClick={() => setReportReason(r)} style={{
                  padding: "10px 14px", borderRadius: 12, border: reportReason === r ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.08)",
                  background: reportReason === r ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                  color: reportReason === r ? "#A29BFE" : "rgba(162,155,254,0.5)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                }}>{r}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost btn-full" style={{ fontSize: 13 }}
                onClick={() => { setShowReportModal(null); setReportReason(""); }}>Cancel</button>
              <button className="btn btn-danger btn-full" style={{ fontSize: 13 }}
                disabled={!reportReason}
                onClick={async () => {
                  if (showReportModal && reportReason) {
                    try {
                      await reportUser(user.uid, showReportModal, reportReason, "");
                      showToast("Report submitted. Thank you!", "success");
                    } catch {
                      showToast("Failed to submit report", "error");
                    }
                    setShowReportModal(null);
                    setReportReason("");
                  }
                }}>Submit Report</button>
            </div>
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(5,1,18,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600,
    }} onClick={onClose}>
      {children}
    </div>
  );
}

function PopupBtn({ icon, active, onToggle, children }: { icon: string; active: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <button style={{
        width: 40, height: 40, borderRadius: "50%", padding: 0, fontSize: 18,
        background: "transparent",
        border: active ? "1.5px solid rgba(138,43,226,0.4)" : "1.5px solid rgba(255,255,255,0.15)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "rgba(255,255,255,0.6)", transition: "all 0.2s",
        boxShadow: active ? "0 0 8px rgba(138,43,226,0.2)" : "none",
      }} onClick={onToggle}>{icon}</button>
      {active && (
        <div style={{
          position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: 10,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)", zIndex: 20,
          animation: "popIn 0.15s ease",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: "owner" | "admin" | "user" }) {
  if (role === "owner") return <span className="badge badge-gold" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F451}"} Owner</span>;
  if (role === "admin") return <span className="badge badge-accent" style={{ fontSize: 8, padding: "1px 6px" }}>{"\u{1F6E1}\uFE0F"} Admin</span>;
  return null;
}

function ChatBubble({ msg, isMe }: { msg: RoomMessage; isMe: boolean }) {
  const isSystem = msg.type === "system" || msg.type === "join" || msg.type === "leave" || msg.type === "welcome";
  const isGift = msg.type === "gift";
  const isWelcome = msg.type === "welcome";
  const displayName = cleanName(msg.username);

  return (
    <div style={{
      marginBottom: 3,
      animation: isWelcome ? "welcomeMsg 0.5s ease" : "slide-up 0.15s ease",
    }}>
      {isSystem ? (
        <div style={{
          display: "inline-block",
          padding: "3px 10px", borderRadius: 20,
          background: isWelcome ? "rgba(138,43,226,0.2)" : "rgba(0,0,0,0.25)",
          fontSize: 10, lineHeight: 1.4, fontFamily: "'Poppins', 'Inter', sans-serif",
          color: isWelcome ? "#fff" : msg.type === "leave" ? "rgba(255,100,130,0.7)" : "rgba(45,212,191,0.8)",
          fontWeight: isWelcome ? 600 : 400, fontStyle: "italic",
        }}>{msg.text}</div>
      ) : (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "4px 10px", borderRadius: 20,
          background: "rgba(0,0,0,0.3)",
          maxWidth: "85%",
        }}>
          {msg.avatar?.startsWith?.("http") ? (
            <img src={msg.avatar} alt="" style={{ width: 18, height: 18, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <span style={{ fontSize: 12, flexShrink: 0 }}>{msg.avatar || "\u{1F464}"}</span>
          )}
          <span style={{
            fontSize: 10, color: isMe ? "#2DD4BF" : "rgba(255,255,255,0.7)",
            fontWeight: 600, flexShrink: 0, fontFamily: "'Poppins', 'Inter', sans-serif",
          }}>{displayName}</span>
          <span style={{
            fontSize: msg.type === "emoji" ? 20 : 12, lineHeight: 1.3,
            color: isGift ? "#FFD700" : "#fff",
            fontWeight: isGift ? 600 : 400, fontFamily: "'Poppins', 'Inter', sans-serif",
          }}>{msg.text}</span>
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
  seat: RoomSeat;
  seatIndex: number;
  role: "owner" | "admin" | "user";
  isMe: boolean;
  hasControl: boolean;
  isSpeaking: boolean;
  onTap: () => void;
}

function SeatCell({ seat, seatIndex, role, isMe, hasControl, isSpeaking, onTap }: SeatCellProps) {
  const isActive = !!seat.userId;
  const isLocked = seat.isLocked;
  const seatNum = seatIndex + 1;

  const bubbleBase: React.CSSProperties = {
    width: 52, height: 52, borderRadius: 26, fontSize: 22,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.2)",
    boxShadow: "inset 0 4px 8px rgba(255,255,255,0.1)",
    transition: "all 0.3s ease",
    overflow: "hidden",
    opacity: isLocked ? 0.5 : 1,
  };

  const speakingExtra: React.CSSProperties = isSpeaking ? {
    border: "2px solid #2DD4BF",
    boxShadow: "0 0 10px #2dd4bf, inset 0 0 5px #2dd4bf",
  } : {};

  const activeExtra: React.CSSProperties = isActive && !isSpeaking ? {
    border: "1.5px solid rgba(138,43,226,0.5)",
    boxShadow: "0 0 10px rgba(138,43,226,0.3), inset 0 4px 8px rgba(255,255,255,0.1)",
  } : {};

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      cursor: (!isMe && seat.userId) || (!seat.userId && !isLocked) ? "pointer" : "default",
      transition: "transform 0.15s ease",
    }} onClick={onTap}>
      <div style={{ position: "relative" }}>
        {isSpeaking && (
          <>
            <div style={{
              position: "absolute", inset: -6, borderRadius: "50%",
              border: "2px solid rgba(45,212,191,0.7)",
              animation: "speaking-ring 1s ease-in-out infinite", pointerEvents: "none",
            }} />
            <div style={{
              position: "absolute", inset: -12, borderRadius: "50%",
              border: "1.5px solid rgba(45,212,191,0.3)",
              animation: "speaking-ring 1.3s ease-in-out infinite 0.2s", pointerEvents: "none",
            }} />
          </>
        )}
        <div style={{ ...bubbleBase, ...speakingExtra, ...activeExtra }}>
          {isLocked ? (
            <span style={{ fontSize: 16, color: "rgba(255,255,255,0.35)" }}>{"\u{1F512}"}</span>
          ) : isActive ? (
            seat.avatar?.startsWith("http")
              ? <img src={seat.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 26, objectFit: "cover" }} />
              : <span>{seat.avatar}</span>
          ) : (
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.25)", fontWeight: 300 }}>+</span>
          )}
        </div>
        {role === "owner" && isActive && (
          <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", fontSize: 13, filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))" }}>{"\u{1F451}"}</div>
        )}
        {role === "admin" && isActive && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 10, filter: "drop-shadow(0 0 4px rgba(45,212,191,0.6))" }}>{"\u{1F6E1}\uFE0F"}</div>
        )}
        {seat.isCoHost && role !== "owner" && role !== "admin" && isActive && (
          <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", fontSize: 10 }}>{"\u{1F396}\uFE0F"}</div>
        )}
        {isActive && seat.isMuted && (
          <div style={{
            position: "absolute", bottom: -1, right: -1, width: 16, height: 16, borderRadius: 8,
            background: "rgba(255,100,130,0.9)", border: "2px solid rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8,
          }}>{"\u{1F507}"}</div>
        )}
        {seat.handRaised && (
          <div style={{
            position: "absolute", top: -6, right: -4, fontSize: 13,
            animation: "handWave 0.8s ease-in-out infinite",
            filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
          }}>{"\u270B"}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, marginTop: 1 }}>
        {isActive && seat.username && (
          <span style={{
            fontSize: 7, fontWeight: 500, textAlign: "center",
            fontFamily: "'Poppins', 'Inter', sans-serif",
            color: "rgba(255,255,255,0.85)",
            maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.2,
          }}>{cleanName(seat.username)}</span>
        )}
        <span style={{
          fontSize: 6, fontWeight: 400, textAlign: "center",
          fontFamily: "'Poppins', 'Inter', sans-serif",
          color: "rgba(255,255,255,0.25)",
          lineHeight: 1.2,
        }}>{seatNum}</span>
      </div>
    </div>
  );
}
