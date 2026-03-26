import {
  ref, set, get, onValue, update, push, serverTimestamp as rtServerTimestamp, off, remove,
} from 'firebase/database';
import { collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { rtdb, db } from './firebase';
import { AppUser } from './fbAuth';

export interface FBSeat {
  index: number;
  userId: string | null;
  displayName: string | null;
  photoURL: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
}

export interface FBRoom {
  id: string;
  name: string;
  topic: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  category: string;
  isLive: boolean;
  createdAt: number;
  seats: FBSeat[];
  listenerCount: number;
  raisedHands: Record<string, { name: string; avatar: string }>;
}

export interface FBMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type?: 'system' | 'gift' | 'chat';
  timestamp: number | object;
}

// ─── Seed demo rooms ───────────────────────────────────────────────

const DEMO_ROOMS: Omit<FBRoom, 'id'>[] = [
  {
    name: 'Chill Vibes Only ✨',
    topic: 'Music & Life', hostId: 'demo1', hostName: 'StarGazer', hostAvatar: '🌟',
    category: 'hot', isLive: true, createdAt: Date.now() - 3600000,
    listenerCount: 12, raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 6 ? `demo_u${i}` : null,
      displayName: i < 6 ? ['StarGazer', 'MoonDancer', 'CosmoKid', 'NebulaDream', 'AstroGirl', 'SpaceWalker'][i] : null,
      photoURL: i < 6 ? ['🌟', '🌙', '🚀', '💫', '🌺', '🎭'][i] : null,
      isMuted: i > 2, isLocked: false, isSpeaking: i === 0 || i === 2,
    })),
  },
  {
    name: 'Late Night Thoughts 🌙',
    topic: 'Deep Talks', hostId: 'demo2', hostName: 'NightOwl', hostAvatar: '🦉',
    category: 'hot', isLive: true, createdAt: Date.now() - 7200000,
    listenerCount: 5, raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 4 ? `demo_n${i}` : null,
      displayName: i < 4 ? ['NightOwl', 'DreamWalker', 'MidnightStar', 'SoulSearcher'][i] : null,
      photoURL: i < 4 ? ['🦉', '🌙', '⭐', '🔮'][i] : null,
      isMuted: i > 1, isLocked: i === 8, isSpeaking: i === 0,
    })),
  },
  {
    name: '🎵 Music Producers Hub',
    topic: 'Beats & Bars', hostId: 'demo3', hostName: 'BeatMaker', hostAvatar: '🎵',
    category: 'new', isLive: true, createdAt: Date.now() - 1800000,
    listenerCount: 8, raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: `demo_m${i}`,
      displayName: ['BeatMaker', 'RhythmKing', 'SoundWave', 'BassDrop', 'MelodyMan', 'TonePoet', 'FreqMaster', 'VocalChamp', 'MixWizard'][i],
      photoURL: ['🎵', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤', '🎼', '🎧'][i],
      isMuted: i > 3, isLocked: false, isSpeaking: i === 0 || i === 3,
    })),
  },
  {
    name: '💻 Galaxy Study Room',
    topic: 'Focus & Study', hostId: 'demo4', hostName: 'CodeNinja', hostAvatar: '💻',
    category: 'new', isLive: true, createdAt: Date.now() - 900000,
    listenerCount: 2, raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 3 ? `demo_s${i}` : null,
      displayName: i < 3 ? ['CodeNinja', 'BookWorm', 'StudyBuddy'][i] : null,
      photoURL: i < 3 ? ['💻', '📚', '✏️'][i] : null,
      isMuted: true, isLocked: false, isSpeaking: false,
    })),
  },
];

export async function seedDemoRooms() {
  const roomsRef = ref(rtdb, 'rooms');
  const snap = await get(roomsRef);
  if (!snap.exists()) {
    for (const room of DEMO_ROOMS) {
      const newRef = push(roomsRef);
      await set(newRef, { ...room, id: newRef.key });
    }
  }
}

// ─── Room listeners ─────────────────────────────────────────────────

export function listenRooms(callback: (rooms: FBRoom[]) => void): () => void {
  const roomsRef = ref(rtdb, 'rooms');
  const handler = onValue(roomsRef, snap => {
    if (!snap.exists()) { callback([]); return; }
    const raw = snap.val() as Record<string, FBRoom>;
    const rooms = Object.values(raw).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(rooms);
  });
  return () => off(roomsRef, 'value', handler);
}

export function listenRoom(roomId: string, callback: (room: FBRoom | null) => void): () => void {
  const roomRef = ref(rtdb, `rooms/${roomId}`);
  const handler = onValue(roomRef, snap => {
    callback(snap.exists() ? (snap.val() as FBRoom) : null);
  });
  return () => off(roomRef, 'value', handler);
}

// ─── Room creation ───────────────────────────────────────────────────

export async function createRoom(user: AppUser, name: string, topic: string): Promise<string> {
  const roomsRef = ref(rtdb, 'rooms');
  const newRef = push(roomsRef);
  const roomId = newRef.key!;

  const seats: FBSeat[] = Array.from({ length: 9 }, (_, i) => ({
    index: i,
    userId: i === 0 ? user.uid : null,
    displayName: i === 0 ? user.displayName : null,
    photoURL: i === 0 ? user.photoURL : null,
    isMuted: false, isLocked: false, isSpeaking: false,
  }));

  const room: FBRoom = {
    id: roomId, name, topic,
    hostId: user.uid, hostName: user.displayName, hostAvatar: user.photoURL,
    category: 'new', isLive: true,
    createdAt: Date.now(),
    listenerCount: 1,
    raisedHands: {},
    seats,
  };

  await set(newRef, room);

  // Seed a welcome message
  await sendRoomMessage(roomId, {
    senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
    text: `${user.displayName} created the room! 🎉`,
    type: 'system', timestamp: Date.now(),
  });

  return roomId;
}

// ─── Seat management ─────────────────────────────────────────────────

export async function takeSeat(roomId: string, seatIndex: number, user: AppUser) {
  const seatRef = ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`);
  await set(seatRef, {
    index: seatIndex,
    userId: user.uid,
    displayName: user.displayName,
    photoURL: user.photoURL,
    isMuted: false, isLocked: false, isSpeaking: false,
  } as FBSeat);
}

export async function leaveSeat(roomId: string, seatIndex: number) {
  const seatRef = ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`);
  await set(seatRef, {
    index: seatIndex,
    userId: null, displayName: null, photoURL: null,
    isMuted: true, isLocked: false, isSpeaking: false,
  } as FBSeat);
}

export async function muteSeat(roomId: string, seatIndex: number, muted: boolean) {
  await update(ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`), { isMuted: muted, isSpeaking: !muted ? false : undefined });
}

export async function kickSeat(roomId: string, seatIndex: number) {
  await set(ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`), {
    index: seatIndex,
    userId: null, displayName: null, photoURL: null,
    isMuted: true, isLocked: false, isSpeaking: false,
  } as FBSeat);
}

export async function lockSeat(roomId: string, seatIndex: number, locked: boolean) {
  await update(ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`), {
    isLocked: locked,
    userId: null, displayName: null, photoURL: null,
  });
}

export async function setSpeaking(roomId: string, seatIndex: number, speaking: boolean) {
  await update(ref(rtdb, `rooms/${roomId}/seats/${seatIndex}`), { isSpeaking: speaking });
}

export async function incrementListeners(roomId: string, delta: number) {
  const r = ref(rtdb, `rooms/${roomId}/listenerCount`);
  const snap = await get(r);
  const cur = snap.exists() ? (snap.val() as number) : 0;
  await set(r, Math.max(0, cur + delta));
}

// ─── Raise hand ───────────────────────────────────────────────────────

export async function raiseHand(roomId: string, user: AppUser) {
  await set(ref(rtdb, `rooms/${roomId}/raisedHands/${user.uid}`), {
    name: user.displayName, avatar: user.photoURL,
  });
}

export async function lowerHand(roomId: string, uid: string) {
  await remove(ref(rtdb, `rooms/${roomId}/raisedHands/${uid}`));
}

// ─── Room messages ────────────────────────────────────────────────────

export async function sendRoomMessage(roomId: string, msg: Omit<FBMessage, 'id'>) {
  await push(ref(rtdb, `room_messages/${roomId}`), msg);
}

export function listenRoomMessages(
  roomId: string,
  callback: (msgs: FBMessage[]) => void
): () => void {
  const msgsRef = ref(rtdb, `room_messages/${roomId}`);
  const handler = onValue(msgsRef, snap => {
    if (!snap.exists()) { callback([]); return; }
    const raw = snap.val() as Record<string, FBMessage>;
    const msgs = Object.entries(raw).map(([id, m]) => ({ ...m, id }));
    msgs.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
    callback(msgs.slice(-60));
  });
  return () => off(msgsRef, 'value', handler);
}

// ─── Private messages (Firestore) ────────────────────────────────────

export interface DMMessage {
  id?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: object | number;
}

function dmPath(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join('_');
}

export async function sendDM(uid1: string, uid2: string, msg: Omit<DMMessage, 'id' | 'timestamp'>) {
  const convId = dmPath(uid1, uid2);
  await addDoc(collection(db, 'conversations', convId, 'messages'), {
    ...msg, timestamp: serverTimestamp(),
  });
}

export function listenDMs(
  uid1: string, uid2: string,
  callback: (msgs: DMMessage[]) => void
): () => void {
  const convId = dmPath(uid1, uid2);
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as DMMessage));
    callback(msgs);
  });
}
