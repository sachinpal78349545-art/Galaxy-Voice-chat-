import { ref, set, get, update, remove, push, onValue, off, runTransaction } from "firebase/database";
import { db } from "./firebase";

export interface RoomSeat {
  index: number;
  userId: string | null;
  username: string | null;
  avatar: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
  handRaised?: boolean;
}

export interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
  type?: "text" | "emoji" | "gift" | "system";
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  host: string;
  hostId: string;
  seats: RoomSeat[];
  createdAt: number;
  isLive: boolean;
  listeners: number;
  category: string;
  tags?: string[];
  coverEmoji?: string;
}

const ROOM_COVERS: Record<string, string> = {
  Chill: "🌙", Music: "🎵", Talk: "💬", Gaming: "🎮",
  Comedy: "😂", Study: "📚", Debate: "⚡", News: "📰", Sports: "⚽",
};

const SEED_ROOMS: Room[] = [
  {
    id: "room_seed1", name: "Chill Vibes Only", topic: "Chill",
    host: "SkyDancer", hostId: "seed_u1", category: "Chill", coverEmoji: "🌙",
    tags: ["chill", "relax", "lofi"],
    seats: [
      { index: 0, userId: "seed_u1", username: "SkyDancer", avatar: "🌟", isMuted: false, isLocked: false, isSpeaking: true },
      { index: 1, userId: "seed_u2", username: "CosmicDJ", avatar: "🎵", isMuted: false, isLocked: false, isSpeaking: false },
      { index: 2, userId: "seed_u3", username: "LunaRose", avatar: "🌙", isMuted: true, isLocked: false, isSpeaking: false },
      { index: 3, userId: null, username: null, avatar: null, isMuted: false, isLocked: false, isSpeaking: false },
      { index: 4, userId: null, username: null, avatar: null, isMuted: false, isLocked: true, isSpeaking: false },
      { index: 5, userId: "seed_u4", username: "NightOwl", avatar: "🦉", isMuted: false, isLocked: false, isSpeaking: true },
      ...Array.from({ length: 6 }, (_, i) => ({ index: i + 6, userId: null, username: null, avatar: null, isMuted: false, isLocked: false, isSpeaking: false })),
    ],
    createdAt: Date.now() - 3600000, isLive: true, listeners: 24,
  },
  {
    id: "room_seed2", name: "Late Night Thoughts", topic: "Talk",
    host: "MoonWalker", hostId: "seed_u6", category: "Talk", coverEmoji: "💬",
    tags: ["talk", "deep", "night"],
    seats: [
      { index: 0, userId: "seed_u6", username: "MoonWalker", avatar: "🚀", isMuted: false, isLocked: false, isSpeaking: true },
      { index: 1, userId: "seed_u7", username: "StarChild", avatar: "⭐", isMuted: true, isLocked: false, isSpeaking: false },
      { index: 2, userId: null, username: null, avatar: null, isMuted: false, isLocked: false, isSpeaking: false },
      { index: 3, userId: "seed_u8", username: "NebulaDev", avatar: "💻", isMuted: false, isLocked: false, isSpeaking: false },
      ...Array.from({ length: 8 }, (_, i) => ({ index: i + 4, userId: null, username: null, avatar: null, isMuted: false, isLocked: i === 7, isSpeaking: false })),
    ],
    createdAt: Date.now() - 1800000, isLive: true, listeners: 12,
  },
  {
    id: "room_seed3", name: "Galaxy Debates", topic: "Debate",
    host: "ArgonKnight", hostId: "seed_u9", category: "Talk", coverEmoji: "⚡",
    tags: ["debate", "hot", "trending"],
    seats: [
      { index: 0, userId: "seed_u9", username: "ArgonKnight", avatar: "⚡", isMuted: false, isLocked: false, isSpeaking: true },
      { index: 1, userId: "seed_u10", username: "SpaceFool", avatar: "🤡", isMuted: false, isLocked: false, isSpeaking: false },
      ...Array.from({ length: 10 }, (_, i) => ({ index: i + 2, userId: null, username: null, avatar: null, isMuted: false, isLocked: false, isSpeaking: false })),
    ],
    createdAt: Date.now() - 900000, isLive: true, listeners: 18,
  },
  {
    id: "room_seed4", name: "Music & Beats", topic: "Music",
    host: "CosmicDJ", hostId: "seed_u2", category: "Music", coverEmoji: "🎵",
    tags: ["music", "beats", "fun"],
    seats: Array.from({ length: 12 }, (_, i) => ({
      index: i, userId: i < 4 ? `seed_mu${i}` : null,
      username: ["CosmicDJ", "BeatMaker", "DropKing", "RhymeFlow"][i] || null,
      avatar: ["🎵", "🥁", "🎸", "🎤"][i] || null,
      isMuted: i === 2, isLocked: i === 11, isSpeaking: i === 0,
    })),
    createdAt: Date.now() - 7200000, isLive: true, listeners: 42,
  },
  {
    id: "room_seed5", name: "Gaming Lounge", topic: "Gaming",
    host: "PixelHero", hostId: "seed_u11", category: "Gaming", coverEmoji: "🎮",
    tags: ["gaming", "fun", "squad"],
    seats: Array.from({ length: 12 }, (_, i) => ({
      index: i, userId: i < 3 ? `seed_gm${i}` : null,
      username: ["PixelHero", "GameMaster", "ProSniper"][i] || null,
      avatar: ["🎮", "🕹️", "🏆"][i] || null,
      isMuted: false, isLocked: false, isSpeaking: i === 0,
    })),
    createdAt: Date.now() - 600000, isLive: true, listeners: 35,
  },
];

let seeded = false;

export async function seedRoomsIfEmpty(): Promise<void> {
  if (seeded) return;
  seeded = true;
  try {
    const snap = await get(ref(db, "rooms"));
    if (!snap.exists() || Object.keys(snap.val()).length === 0) {
      const updates: Record<string, Room> = {};
      SEED_ROOMS.forEach(r => { updates[r.id] = r; });
      await set(ref(db, "rooms"), updates);
    }
  } catch (e) {
    console.error("Seed rooms error:", e);
  }
}

export function subscribeRooms(cb: (rooms: Room[]) => void): () => void {
  const r = ref(db, "rooms");
  const handler = onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const rooms: Room[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    rooms.sort((a, b) => b.createdAt - a.createdAt);
    cb(rooms);
  }, err => {
    console.error("Subscribe rooms error:", err);
    cb([]);
  });
  return () => off(r);
}

export function subscribeRoom(roomId: string, cb: (room: Room | null) => void): () => void {
  const r = ref(db, `rooms/${roomId}`);
  onValue(r, snap => {
    cb(snap.exists() ? { ...snap.val(), id: roomId } : null);
  });
  return () => off(r);
}

export async function createRoom(userId: string, username: string, avatar: string, name: string, topic: string): Promise<Room> {
  const id = `room_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const seats: RoomSeat[] = Array.from({ length: 12 }, (_, i) => ({
    index: i,
    userId: i === 0 ? userId : null,
    username: i === 0 ? username : null,
    avatar: i === 0 ? avatar : null,
    isMuted: false,
    isLocked: false,
    isSpeaking: false,
  }));
  const room: Room = {
    id, name, topic, host: username, hostId: userId,
    seats, createdAt: Date.now(), isLive: true,
    listeners: 0, category: topic,
    coverEmoji: ROOM_COVERS[topic] || "🎤",
    tags: [topic.toLowerCase()],
  };
  await set(ref(db, `rooms/${id}`), room);
  return room;
}

export async function joinSeat(roomId: string, seatIndex: number, userId: string, username: string, avatar: string): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
    userId, username, avatar, isMuted: false, isLocked: false, isSpeaking: false, handRaised: false,
  });
  const listenersRef = ref(db, `rooms/${roomId}/listeners`);
  await runTransaction(listenersRef, (current: number | null) => {
    return (current ?? 0) + 1;
  });
}

export async function leaveSeat(roomId: string, seatIndex: number): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
    userId: null, username: null, avatar: null, isMuted: false, isSpeaking: false, handRaised: false,
  });
  const listenersRef = ref(db, `rooms/${roomId}/listeners`);
  await runTransaction(listenersRef, (current: number | null) => {
    return Math.max(0, (current ?? 0) - 1);
  });
}

export async function toggleMuteSeat(roomId: string, seatIndex: number, muted: boolean): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), { isMuted: muted, isSpeaking: false });
}

export async function toggleLockSeat(roomId: string, seatIndex: number, locked: boolean): Promise<void> {
  const seatSnap = await get(ref(db, `rooms/${roomId}/seats/${seatIndex}`));
  const hadUser = seatSnap.exists() && seatSnap.val().userId;
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), {
    isLocked: locked, userId: null, username: null, avatar: null,
  });
  if (hadUser) {
    const listenersRef = ref(db, `rooms/${roomId}/listeners`);
    await runTransaction(listenersRef, (current: number | null) => {
      return Math.max(0, (current ?? 0) - 1);
    });
  }
}

export async function raiseHand(roomId: string, seatIndex: number, raised: boolean): Promise<void> {
  await update(ref(db, `rooms/${roomId}/seats/${seatIndex}`), { handRaised: raised });
}

export async function kickFromSeat(roomId: string, seatIndex: number): Promise<void> {
  await leaveSeat(roomId, seatIndex);
}

export async function muteUserSeat(roomId: string, seatIndex: number): Promise<void> {
  await toggleMuteSeat(roomId, seatIndex, true);
}

export function subscribeRoomMessages(roomId: string, cb: (msgs: RoomMessage[]) => void): () => void {
  const r = ref(db, `roomMessages/${roomId}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const msgs: RoomMessage[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    msgs.sort((a, b) => a.timestamp - b.timestamp);
    cb(msgs.slice(-80));
  });
  return () => off(r);
}

export async function sendRoomMessage(roomId: string, msg: Omit<RoomMessage, "id" | "timestamp">): Promise<void> {
  const newRef = push(ref(db, `roomMessages/${roomId}`));
  await set(newRef, { ...msg, timestamp: Date.now() });
}

export async function deleteRoom(roomId: string): Promise<void> {
  await remove(ref(db, `rooms/${roomId}`));
  await remove(ref(db, `roomMessages/${roomId}`));
}
