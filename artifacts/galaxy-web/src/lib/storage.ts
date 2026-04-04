export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  nickname: string;
  gender: string;
  birthday: string;
  location: string;
  bio: string;
  avatar: string;
  level: number;
  xp: number;
  xpTarget: number;
  coins: number;
  followers: string[];
  following: string[];
  interests: string[];
  relationship: string;
  darkMode: boolean;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  topic: string;
  host: string;
  hostId: string;
  seats: RoomSeat[];
  messages: RoomMessage[];
  createdAt: number;
  isLive: boolean;
  listeners: number;
  category: string;
}

export interface RoomSeat {
  index: number;
  userId: string | null;
  username: string | null;
  avatar: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
}

export interface RoomMessage {
  id: string;
  userId: string;
  username: string;
  avatar: string;
  text: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  participants: [string, string];
  participantNames: [string, string];
  participantAvatars: [string, string];
  lastMessage: string;
  lastTime: number;
  unread: number;
}

export interface Message {
  id: string;
  convId: string;
  senderId: string;
  text: string;
  timestamp: number;
}

const KEYS = {
  USERS: "gvc_users",
  CURRENT: "gvc_current",
  ROOMS: "gvc_rooms",
  CONVS: "gvc_convs",
  MSGS: "gvc_msgs",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const ts = () => Date.now();

const SEED_ROOMS: Room[] = [
  {
    id: "room_seed1", name: "Chill Vibes Only", topic: "Chill",
    host: "SkyDancer", hostId: "seed_u1", category: "Chill",
    seats: [
      { index: 0, userId: "seed_u1", username: "SkyDancer",  avatar: "🌟", isMuted: false, isLocked: false, isSpeaking: true  },
      { index: 1, userId: "seed_u2", username: "CosmicDJ",   avatar: "🎵", isMuted: false, isLocked: false, isSpeaking: false },
      { index: 2, userId: "seed_u3", username: "LunaRose",   avatar: "🌙", isMuted: true,  isLocked: false, isSpeaking: false },
      { index: 3, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 4, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: true,  isSpeaking: false },
      { index: 5, userId: "seed_u4", username: "NightOwl",   avatar: "🦉", isMuted: false, isLocked: false, isSpeaking: true  },
      { index: 6, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 7, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: true,  isSpeaking: false },
      { index: 8, userId: "seed_u5", username: "VoidWalker", avatar: "🌌", isMuted: true,  isLocked: false, isSpeaking: false },
    ],
    messages: [
      { id: "m1", userId: "seed_u1", username: "SkyDancer",  avatar: "🌟", text: "Welcome to the chill zone! 🌟", timestamp: ts() - 60000 },
      { id: "m2", userId: "seed_u2", username: "CosmicDJ",   avatar: "🎵", text: "Playing some lo-fi rn, enjoy 🎵", timestamp: ts() - 30000 },
    ],
    createdAt: ts() - 3600000, isLive: true, listeners: 12,
  },
  {
    id: "room_seed2", name: "Late Night Thoughts", topic: "Talk",
    host: "MoonWalker", hostId: "seed_u6", category: "Talk",
    seats: [
      { index: 0, userId: "seed_u6", username: "MoonWalker", avatar: "🚀", isMuted: false, isLocked: false, isSpeaking: true  },
      { index: 1, userId: "seed_u7", username: "StarChild",  avatar: "⭐", isMuted: true,  isLocked: false, isSpeaking: false },
      { index: 2, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 3, userId: "seed_u8", username: "NebulaDev",  avatar: "💻", isMuted: false, isLocked: false, isSpeaking: false },
      { index: 4, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 5, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: true,  isSpeaking: false },
      { index: 6, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 7, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 8, userId: null,      username: null,          avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
    ],
    messages: [
      { id: "m3", userId: "seed_u6", username: "MoonWalker", avatar: "🚀", text: "What's everyone thinking about tonight? 🌙", timestamp: ts() - 20000 },
    ],
    createdAt: ts() - 1800000, isLive: true, listeners: 5,
  },
  {
    id: "room_seed3", name: "Galaxy Debates", topic: "Debate",
    host: "ArgonKnight", hostId: "seed_u9", category: "Talk",
    seats: [
      { index: 0, userId: "seed_u9",  username: "ArgonKnight", avatar: "⚡", isMuted: false, isLocked: false, isSpeaking: true  },
      { index: 1, userId: "seed_u10", username: "SpaceFool",   avatar: "🤡", isMuted: false, isLocked: false, isSpeaking: false },
      { index: 2, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 3, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 4, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 5, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: true,  isSpeaking: false },
      { index: 6, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 7, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
      { index: 8, userId: null,       username: null,           avatar: null,  isMuted: false, isLocked: false, isSpeaking: false },
    ],
    messages: [],
    createdAt: ts() - 900000, isLive: true, listeners: 8,
  },
  {
    id: "room_seed4", name: "Music & Beats", topic: "Music",
    host: "CosmicDJ", hostId: "seed_u2", category: "Music",
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i, userId: i < 4 ? `seed_mu${i}` : null,
      username: ["CosmicDJ","BeatMaker","DropKing","RhymeFlow"][i] || null,
      avatar: ["🎵","🥁","🎸","🎤"][i] || null,
      isMuted: i === 2, isLocked: i === 7, isSpeaking: i === 0,
    })),
    messages: [],
    createdAt: ts() - 7200000, isLive: true, listeners: 31,
  },
];

function getRooms(): Room[] {
  try {
    const r = localStorage.getItem(KEYS.ROOMS);
    if (r) return JSON.parse(r);
  } catch {}
  localStorage.setItem(KEYS.ROOMS, JSON.stringify(SEED_ROOMS));
  return SEED_ROOMS;
}
function saveRooms(r: Room[]) { localStorage.setItem(KEYS.ROOMS, JSON.stringify(r)); }

function getUsers(): User[] {
  try { return JSON.parse(localStorage.getItem(KEYS.USERS) || "[]"); } catch { return []; }
}
function saveUsers(u: User[]) { localStorage.setItem(KEYS.USERS, JSON.stringify(u)); }

function getConvs(): Conversation[] {
  try { return JSON.parse(localStorage.getItem(KEYS.CONVS) || "[]"); } catch { return []; }
}
function saveConvs(c: Conversation[]) { localStorage.setItem(KEYS.CONVS, JSON.stringify(c)); }

function getMsgs(): Message[] {
  try { return JSON.parse(localStorage.getItem(KEYS.MSGS) || "[]"); } catch { return []; }
}
function saveMsgs(m: Message[]) { localStorage.setItem(KEYS.MSGS, JSON.stringify(m)); }

const AVATARS = ["🌟","🎵","🌙","🦉","🌌","💫","🔥","🎤","🚀","⭐","💻","⚡","🌈","🎭","🏆","👑"];

export const storage = {
  // ── AUTH ────
  getCurrentUser(): User | null {
    const id = localStorage.getItem(KEYS.CURRENT);
    if (!id) return null;
    return getUsers().find(u => u.id === id) || null;
  },
  login(email: string, password: string): User | null {
    const u = getUsers().find(u => u.email === email && u.password === password);
    if (u) localStorage.setItem(KEYS.CURRENT, u.id);
    return u || null;
  },
  signup(username: string, email: string, password: string): User {
    const users = getUsers();
    const newUser: User = {
      id: uid(), username, email, password,
      nickname: username, gender: "Male", birthday: "2000-01-01",
      location: "Earth", bio: "I AM YOUR LOCAL SPACE TRAVELER.",
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      level: 1, xp: 0, xpTarget: 1000, coins: 100,
      followers: [], following: [], interests: [],
      relationship: "Single", darkMode: true, createdAt: ts(),
    };
    saveUsers([...users, newUser]);
    localStorage.setItem(KEYS.CURRENT, newUser.id);
    return newUser;
  },
  logout() { localStorage.removeItem(KEYS.CURRENT); },

  // ── PROFILE ────
  updateUser(id: string, updates: Partial<User>): User {
    const users = getUsers();
    const idx = users.findIndex(u => u.id === id);
    const updated = { ...users[idx], ...updates };
    users[idx] = updated;
    saveUsers(users);
    return updated;
  },
  addXP(userId: string, amount: number): User {
    const u = getUsers().find(u => u.id === userId)!;
    let xp = u.xp + amount;
    let level = u.level;
    if (xp >= u.xpTarget) { xp -= u.xpTarget; level += 1; }
    return storage.updateUser(userId, { xp, level, xpTarget: level * 1000 });
  },

  // ── ROOMS ────
  getRooms(): Room[] { return getRooms(); },
  getRoom(id: string): Room | null { return getRooms().find(r => r.id === id) || null; },
  createRoom(userId: string, username: string, avatar: string, name: string, topic: string): Room {
    const seats: RoomSeat[] = Array.from({ length: 9 }, (_, i) => ({
      index: i, userId: i === 0 ? userId : null,
      username: i === 0 ? username : null, avatar: i === 0 ? avatar : null,
      isMuted: false, isLocked: false, isSpeaking: false,
    }));
    const room: Room = {
      id: `room_${uid()}`, name, topic, host: username, hostId: userId,
      seats, messages: [], createdAt: ts(), isLive: true, listeners: 0, category: topic,
    };
    const rooms = getRooms();
    saveRooms([room, ...rooms]);
    return room;
  },
  addRoomMessage(roomId: string, msg: Omit<RoomMessage, "id" | "timestamp">): Room {
    const rooms = getRooms();
    const room = rooms.find(r => r.id === roomId)!;
    room.messages = [...(room.messages || []).slice(-49), { ...msg, id: uid(), timestamp: ts() }];
    saveRooms(rooms);
    return room;
  },
  updateRoomSeat(roomId: string, seatIdx: number, updates: Partial<RoomSeat>): Room {
    const rooms = getRooms();
    const room = rooms.find(r => r.id === roomId)!;
    room.seats[seatIdx] = { ...room.seats[seatIdx], ...updates };
    saveRooms(rooms);
    return room;
  },

  // ── CHATS ────
  getConversations(userId: string): Conversation[] {
    return getConvs().filter(c => c.participants.includes(userId))
      .sort((a, b) => b.lastTime - a.lastTime);
  },
  getMessages(convId: string): Message[] {
    return getMsgs().filter(m => m.convId === convId).sort((a, b) => a.timestamp - b.timestamp);
  },
  sendMessage(convId: string, senderId: string, text: string): Message {
    const msg: Message = { id: uid(), convId, senderId, text, timestamp: ts() };
    saveMsgs([...getMsgs(), msg]);
    const convs = getConvs();
    const conv = convs.find(c => c.id === convId);
    if (conv) {
      conv.lastMessage = text; conv.lastTime = ts();
      const otherIdx = conv.participants[0] === senderId ? 1 : 0;
      conv.unread = otherIdx;
      saveConvs(convs);
    }
    return msg;
  },
  getOrCreateConv(userId: string, userName: string, userAvatar: string, otherId: string, otherName: string, otherAvatar: string): Conversation {
    const convs = getConvs();
    const exists = convs.find(c => c.participants.includes(userId) && c.participants.includes(otherId));
    if (exists) return exists;
    const conv: Conversation = {
      id: uid(), participants: [userId, otherId],
      participantNames: [userName, otherName],
      participantAvatars: [userAvatar, otherAvatar],
      lastMessage: "Say hello! 👋", lastTime: ts() - 60000, unread: 0,
    };
    saveConvs([...convs, conv]);
    return conv;
  },
};
