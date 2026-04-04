import { ref, set, get, update, push, onValue, off, remove, serverTimestamp } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage as fbStorage } from "./firebase";

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type?: "text" | "image" | "emoji";
  imageUrl?: string;
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
}

const FAKE_CONTACTS = [
  { id: "fake_1", name: "StarGazer", avatar: "🌟", lastMsg: "Hey! Let's voice chat 🎤" },
  { id: "fake_2", name: "CosmicDJ", avatar: "🎵", lastMsg: "That room was fire 🔥" },
  { id: "fake_3", name: "LunaRose", avatar: "🌙", lastMsg: "Want to collab? 💫" },
  { id: "fake_4", name: "NightOwl", avatar: "🦉", lastMsg: "GM! Good energy today 🌟" },
  { id: "fake_5", name: "VoidWalker", avatar: "🌌", lastMsg: "Thanks for the gift! ❤️" },
  { id: "fake_6", name: "NebulaDev", avatar: "💻", lastMsg: "Let me know when you're online" },
];

const AUTO_REPLIES = [
  "That's so cool! 🔥", "Haha agreed! 😂", "Send me the link!", "For real? 🤯",
  "Totally vibe with that ✨", "Let's do it! 🚀", "❤️", "💯", "Sounds good!",
  "I'm in! 🎉", "What time? ⏰", "Miss you in the room!", "Omg yes! 🙌",
  "Can't wait! 🌟", "That's amazing 💎",
];

export async function seedConversations(userId: string, userName: string, userAvatar: string): Promise<void> {
  const snap = await get(ref(db, `userConvs/${userId}`));
  if (snap.exists() && Object.keys(snap.val()).length > 0) return;

  for (const fc of FAKE_CONTACTS) {
    const convId = [userId, fc.id].sort().join("_");
    const conv: Omit<Conversation, "id"> = {
      participants: [userId, fc.id],
      participantNames: [userName, fc.name],
      participantAvatars: [userAvatar, fc.avatar],
      lastMessage: fc.lastMsg,
      lastTime: Date.now() - Math.floor(Math.random() * 3600000),
      unread: { [userId]: 1, [fc.id]: 0 },
    };
    await set(ref(db, `conversations/${convId}`), conv);
    await set(ref(db, `userConvs/${userId}/${convId}`), true);
    await set(ref(db, `userConvs/${fc.id}/${convId}`), true);

    const msgRef = push(ref(db, `messages/${convId}`));
    await set(msgRef, {
      senderId: fc.id,
      text: fc.lastMsg,
      timestamp: conv.lastTime,
      type: "text",
    });
  }
}

export function subscribeConversations(userId: string, cb: (convs: Conversation[]) => void): () => void {
  const r = ref(db, `userConvs/${userId}`);
  let convUnsubs: (() => void)[] = [];

  const handler = onValue(r, async snap => {
    convUnsubs.forEach(u => u());
    convUnsubs = [];

    if (!snap.exists()) { cb([]); return; }
    const convIds = Object.keys(snap.val());
    const convs: Conversation[] = [];

    for (const cid of convIds) {
      const cSnap = await get(ref(db, `conversations/${cid}`));
      if (cSnap.exists()) {
        convs.push({ ...cSnap.val(), id: cid });
      }
    }
    convs.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
    cb(convs);

    for (const cid of convIds) {
      const cRef = ref(db, `conversations/${cid}`);
      onValue(cRef, cSnap => {
        if (!cSnap.exists()) return;
        const updated = { ...cSnap.val(), id: cid };
        cb(prev => {
          const arr = Array.isArray(prev) ? prev : convs;
          const idx = arr.findIndex(c => c.id === cid);
          if (idx >= 0) {
            const n = [...arr];
            n[idx] = updated;
            n.sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
            return n;
          }
          return [...arr, updated].sort((a, b) => (b.lastTime || 0) - (a.lastTime || 0));
        });
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

export async function sendMessage(convId: string, senderId: string, text: string, type: "text" | "emoji" = "text"): Promise<void> {
  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, { senderId, text, timestamp: Date.now(), type });
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

    if (otherId && otherId.startsWith("fake_")) {
      setTimeout(async () => {
        const reply = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
        const replyRef = push(ref(db, `messages/${convId}`));
        await set(replyRef, { senderId: otherId, text: reply, timestamp: Date.now(), type: "text" });
        await update(ref(db, `conversations/${convId}`), {
          lastMessage: reply, lastTime: Date.now(),
          [`unread/${senderId}`]: ((conv.unread || {})[senderId] || 0) + 1,
        });
      }, 1200 + Math.random() * 2000);
    }
  }
}

export async function sendImageMessage(convId: string, senderId: string, file: File): Promise<void> {
  const path = `chatImages/${convId}/${Date.now()}_${file.name}`;
  const sRef = storageRef(fbStorage, path);
  await uploadBytes(sRef, file);
  const url = await getDownloadURL(sRef);

  const msgRef = push(ref(db, `messages/${convId}`));
  await set(msgRef, { senderId, text: "📷 Photo", timestamp: Date.now(), type: "image", imageUrl: url });
  await update(ref(db, `conversations/${convId}`), { lastMessage: "📷 Photo", lastTime: Date.now() });
}

export async function setTyping(convId: string, userId: string, typing: boolean): Promise<void> {
  try {
    await update(ref(db, `conversations/${convId}/typing`), { [userId]: typing });
  } catch {}
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
  } catch {}
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
    lastMessage: "Say hello! 👋",
    lastTime: Date.now(),
    unread: { [userId]: 0, [otherId]: 0 },
  };
  await set(ref(db, `conversations/${convId}`), conv);
  await set(ref(db, `userConvs/${userId}/${convId}`), true);
  await set(ref(db, `userConvs/${otherId}/${convId}`), true);
  return convId;
}
