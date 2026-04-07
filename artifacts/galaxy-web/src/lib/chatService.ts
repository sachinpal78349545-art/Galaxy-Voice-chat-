import { ref, set, get, update, push, onValue, off, remove } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage as fbStorage, getVerifiedToken } from "./firebase";

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName?: string;
  senderDP?: string;
  text: string;
  timestamp: number;
  type?: "text" | "image" | "emoji" | "voice";
  imageUrl?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  status?: "sent" | "delivered" | "seen";
  reactions?: Record<string, string>;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: string[];
  participantAvatars: string[];
  lastMessage: string;
  lastTime: number;
  unread: Record<string, number>;
  typing?: Record<string, boolean>;
  lastSeen?: Record<string, number>;
}

export function subscribeConversations(userId: string, cb: (convs: Conversation[]) => void): () => void {
  const r = ref(db, `userConvs/${userId}`);
  let convUnsubs: (() => void)[] = [];
  let currentConvs: Conversation[] = [];

  const handler = onValue(r, async snap => {
    convUnsubs.forEach(u => u());
    convUnsubs = [];

    if (!snap.exists()) { currentConvs = []; cb([]); return; }
    const convIds = Object.keys(snap.val());
    const convs: Conversation[] = [];

    for (const cid of convIds) {
      const cSnap = await get(ref(db, `conversations/${cid}`));
      if (cSnap.exists()) {
        convs.push({ ...cSnap.val(), id: cid });
      }
    }
    convs.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    currentConvs = convs;
    cb(convs);

    for (const cid of convIds) {
      const cRef = ref(db, `conversations/${cid}`);
      onValue(cRef, cSnap => {
        if (!cSnap.exists()) return;
        const updated = { ...cSnap.val(), id: cid };
        const idx = currentConvs.findIndex(c => c.id === cid);
        if (idx >= 0) {
          const n = [...currentConvs];
          n[idx] = updated;
          n.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
          currentConvs = n;
        } else {
          currentConvs = [...currentConvs, updated].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
        }
        cb(currentConvs);
      });
      convUnsubs.push(() => off(cRef));
    }
  });

  return () => {
    off(r);
    convUnsubs.forEach(u => u());
  };
}

export function subscribeMessages(convId: string, cb: (msgs: ChatMessage[]) => void): () => void {
  const r = ref(db, `messages/${convId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const msgs: ChatMessage[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    cb(msgs);
  });
  return () => off(r);
}

async function checkMutualFollow(senderUid: string, convId: string): Promise<boolean> {
  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (!convSnap.exists()) return false;
  const conv = convSnap.val();
  const participants: string[] = conv.participants || [];
  const otherUid = participants.find((p: string) => p !== senderUid);
  if (!otherUid) return false;

  const [senderSnap, otherSnap] = await Promise.all([
    get(ref(db, `users/${senderUid}/followingList`)),
    get(ref(db, `users/${otherUid}/followingList`)),
  ]);
  const senderFollowing: string[] = senderSnap.val() || [];
  const otherFollowing: string[] = otherSnap.val() || [];
  return senderFollowing.includes(otherUid) && otherFollowing.includes(senderUid);
}

export async function sendMessage(convId: string, senderId: string, text: string, type: "text" | "emoji" = "text"): Promise<void> {
  const allowed = await checkMutualFollow(senderId, convId);
  if (!allowed) throw new Error("Chat locked: mutual follow required");

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text,
    timestamp: Date.now(),
    type,
    status: "sent",
  });

  setTimeout(async () => {
    try {
      await update(ref(db, `messages/${convId}/${msgRef.key}`), { status: "delivered" });
    } catch (e) { console.warn("Status update error:", e); }
  }, 800);

  await update(ref(db, `conversations/${convId}`), {
    lastMessage: type === "emoji" ? text : text.slice(0, 60),
    lastTime: Date.now(),
  });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }
}

export async function sendImageMessage(convId: string, senderId: string, file: File): Promise<void> {
  const allowed = await checkMutualFollow(senderId, convId);
  if (!allowed) throw new Error("Chat locked: mutual follow required");

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const token = await getVerifiedToken();
  console.log(`[Chat Upload] Final Token Check before upload: ${token ? token.substring(0, 40) + "..." : "EMPTY"}`);
  const path = `chatImages/${convId}/${Date.now()}_${file.name}`;
  const sRef = storageRef(fbStorage, path);
  await uploadBytes(sRef, file, { customMetadata: { "X-Firebase-AppCheck": token } });
  const url = await getDownloadURL(sRef);

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text: "\u{1F4F7} Photo",
    timestamp: Date.now(),
    type: "image",
    imageUrl: url,
    status: "sent",
  });
  await update(ref(db, `conversations/${convId}`), { lastMessage: "\u{1F4F7} Photo", lastTime: Date.now() });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }

  setTimeout(async () => {
    try {
      await update(ref(db, `messages/${convId}/${msgRef.key}`), { status: "delivered" });
    } catch (e) { console.warn("Status update error:", e); }
  }, 800);
}

export async function sendVoiceMessage(convId: string, senderId: string, audioBlob: Blob, duration: number): Promise<void> {
  const allowed = await checkMutualFollow(senderId, convId);
  if (!allowed) throw new Error("Chat locked: mutual follow required");

  const senderSnap = await get(ref(db, `users/${senderId}`));
  const senderData = senderSnap.exists() ? senderSnap.val() : {};

  const voiceToken = await getVerifiedToken();
  console.log(`[Voice Upload] Final Token Check before upload: ${voiceToken ? voiceToken.substring(0, 40) + "..." : "EMPTY"}`);
  const path = `chatVoice/${convId}/${Date.now()}.webm`;
  const sRef = storageRef(fbStorage, path);
  await uploadBytes(sRef, audioBlob, { contentType: "audio/webm", customMetadata: { "X-Firebase-AppCheck": voiceToken } });
  const url = await getDownloadURL(sRef);

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, {
    senderId,
    senderName: senderData.name || "User",
    senderDP: senderData.avatar || "",
    text: "\u{1F3A4} Voice message",
    timestamp: Date.now(),
    type: "voice",
    voiceUrl: url,
    voiceDuration: Math.round(duration),
    status: "sent",
  });
  await update(ref(db, `conversations/${convId}`), { lastMessage: "\u{1F3A4} Voice message", lastTime: Date.now() });

  const convSnap = await get(ref(db, `conversations/${convId}`));
  if (convSnap.exists()) {
    const conv = convSnap.val();
    const otherId = conv.participants.find((p: string) => p !== senderId);
    if (otherId) {
      const unread = conv.unread || {};
      unread[otherId] = (unread[otherId] || 0) + 1;
      await update(ref(db, `conversations/${convId}`), { unread });
    }
  }

  setTimeout(async () => {
    try {
      await update(ref(db, `messages/${convId}/${msgRef.key}`), { status: "delivered" });
    } catch (e) { console.warn("Status update error:", e); }
  }, 800);
}

export async function addReaction(convId: string, msgId: string, userId: string, emoji: string): Promise<void> {
  await update(ref(db, `messages/${convId}/${msgId}/reactions`), { [userId]: emoji });
}

export async function removeReaction(convId: string, msgId: string, userId: string): Promise<void> {
  await set(ref(db, `messages/${convId}/${msgId}/reactions/${userId}`), null);
}

export async function markMessagesSeen(convId: string, userId: string): Promise<void> {
  const snap = await get(ref(db, `messages/${convId}`));
  if (!snap.exists()) return;
  const val = snap.val();
  const updates: Record<string, string> = {};
  Object.keys(val).forEach(k => {
    const msg = val[k];
    if (msg.senderId !== userId && msg.status !== "seen") {
      updates[`messages/${convId}/${k}/status`] = "seen";
    }
  });
  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

export async function setTyping(convId: string, userId: string, typing: boolean): Promise<void> {
  try {
    await update(ref(db, `conversations/${convId}/typing`), { [userId]: typing });
  } catch (err) {
    console.warn("Typing indicator error:", err);
  }
}

export function subscribeTyping(convId: string, cb: (typing: Record<string, boolean>) => void): () => void {
  const r = ref(db, `conversations/${convId}/typing`);
  onValue(r, snap => {
    cb(snap.exists() ? snap.val() : {});
  });
  return () => off(r);
}

export async function markRead(convId: string, userId: string): Promise<void> {
  try {
    await update(ref(db, `conversations/${convId}/unread`), { [userId]: 0 });
    await markMessagesSeen(convId, userId);
  } catch (err) {
    console.warn("Mark read error:", err);
  }
}

export async function clearChat(convId: string): Promise<void> {
  await remove(ref(db, `messages/${convId}`));
  await update(ref(db, `conversations/${convId}`), { lastMessage: "Chat cleared", lastTime: Date.now() });
}

export async function getOrCreateConversation(
  userId: string, userName: string, userAvatar: string,
  otherId: string, otherName: string, otherAvatar: string
): Promise<string> {
  const convId = [userId, otherId].sort().join("_");
  const snap = await get(ref(db, `conversations/${convId}`));
  if (snap.exists()) return convId;

  const conv: Omit<Conversation, "id"> = {
    participants: [userId, otherId],
    participantNames: [userName, otherName],
    participantAvatars: [userAvatar, otherAvatar],
    lastMessage: "Say hello! \u{1F44B}",
    lastTime: Date.now(),
    unread: { [userId]: 0, [otherId]: 0 },
  };
  await set(ref(db, `conversations/${convId}`), conv);
  await set(ref(db, `userConvs/${userId}/${convId}`), true);
  await set(ref(db, `userConvs/${otherId}/${convId}`), true);
  return convId;
}
