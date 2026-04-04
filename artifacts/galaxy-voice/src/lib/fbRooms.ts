// ─── TYPES ──────────────────────────────────────────────────────────
import { AppUser } from './context';

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
  timestamp: number;
}

// ─── LOCAL STORAGE / MEMORY ─────────────────────────────────────────
let localRooms: FBRoom[] = [
  {
    id: 'demo1',
    name: 'Chill Vibes Only ✨',
    topic: 'Music & Life',
    hostId: 'admin1',
    hostName: 'StarGazer',
    hostAvatar: '🌟',
    category: 'hot',
    isLive: true,
    createdAt: Date.now(),
    listenerCount: 12,
    raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i === 0 ? 'admin1' : null,
      displayName: i === 0 ? 'StarGazer' : null,
      photoURL: i === 0 ? '🌟' : null,
      isMuted: false,
      isLocked: false,
      isSpeaking: false,
    })),
  }
];

// ─── ROOM FUNCTIONS ─────────────────────────────────────────────────

export function listenRooms(callback: (rooms: FBRoom[]) => void) {
  callback([...localRooms]);
  return () => {}; 
}

export function listenRoom(roomId: string, callback: (room: FBRoom | null) => void) {
  const room = localRooms.find(r => r.id === roomId);
  callback(room || null);
  return () => {};
}

export async function createRoom(user: AppUser, name: string, topic: string): Promise<string> {
  const roomId = 'room_' + Date.now();
  const newRoom: FBRoom = {
    id: roomId,
    name: name.trim(),
    topic: topic,
    hostId: user.uid,
    hostName: user.displayName,
    hostAvatar: user.photoURL,
    category: 'new',
    isLive: true,
    createdAt: Date.now(),
    listenerCount: 1,
    raisedHands: {},
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i === 0 ? user.uid : null,
      displayName: i === 0 ? user.displayName : null,
      photoURL: i === 0 ? user.photoURL : null,
      isMuted: false,
      isLocked: false,
      isSpeaking: false,
    })),
  };

  localRooms = [newRoom, ...localRooms];
  return roomId;
}

export const seedDemoRooms = async () => { console.log("Demo rooms already loaded in memory."); };

// ─── SEAT & MIC MANAGEMENT ──────────────────────────────────────────

export async function takeSeat(roomId: string, seatIndex: number, user: AppUser) { console.log(`User ${user.displayName} took seat ${seatIndex}`); }
export async function leaveSeat(roomId: string, seatIndex: number) { console.log(`Seat ${seatIndex} cleared`); }
export async function muteSeat(roomId: string, seatIndex: number, muted: boolean) { console.log(`Seat ${seatIndex} muted: ${muted}`); }
export async function setSpeaking(roomId: string, seatIndex: number, speaking: boolean) { }
export async function kickSeat(roomId: string, seatIndex: number) { }
export async function lockSeat(roomId: string, seatIndex: number, locked: boolean) { }
export async function incrementListeners(roomId: string, delta: number) { }

// ─── RAISE HAND FUNCTIONS ───────────────────────────────────────────

export async function raiseHand(roomId: string, user: AppUser) { console.log("Hand raised"); }
export async function lowerHand(roomId: string, uid: string) { console.log("Hand lowered"); }

// ─── MESSAGING & CHAT ───────────────────────────────────────────────

export async function sendRoomMessage(roomId: string, msg: any) { console.log("Room Message:", msg.text); }
export function listenRoomMessages(roomId: string, callback: (msgs: FBMessage[]) => void) {
  callback([]); 
  return () => {};
}

export async function sendDM(uid1: string, uid2: string, msg: any) { console.log("DM Sent"); }
export function listenDMs(uid1: string, uid2: string, callback: (msgs: any[]) => void) {
  callback([]);
  return () => {};
}

// ─── SEARCH & NOTIFICATIONS (The ones causing errors) ──────────────

export async function searchByShortId(shortId: string) {
  console.log("Searching for ID locally:", shortId);
  return null;
}

export function listenNotifications(userId: string, callback: (notifs: any[]) => void) {
  callback([]); 
  return () => {};
}

export async function toggleFollow(myId: string, targetId: string) {
  console.log(`Followed user: ${targetId}`);
  return true;
}
