// ─────────── TYPES ───────────

export interface User {
  id: string;       // internal id
  uid: string;      // display UID e.g. "UID483920"
  username: string;
  email: string;
  password: string;
  avatar: string;
  level: number;
  xp: number;
  coins: number;
  bio: string;
  gender: string;
  birthday: string;
  location: string;
  relationship: string;
  interests: string[];
  followers: string[];   // list of user IDs
  following: string[];
  friends: string[];
  nickname: string;
  darkMode: boolean;
  lastDailyReward: number; // timestamp
  totalGiftsReceived: number;
  totalGiftsSent: number;
}

export interface Room {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  hostAvatar: string;
  topic: string;
  userCount: number;
  maxUsers: number;
  isLive: boolean;
  category: string;
  seats: Seat[];
  listeners: string[]; // userIds listening but not on seat
  raisedHands: string[]; // userIds who raised hand
}

export interface Seat {
  index: number;
  userId: string | null;
  username: string | null;
  avatar: string | null;
  isMuted: boolean;
  isLocked: boolean;
  isSpeaking: boolean;
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  fromName: string;
  fromAvatar: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastTimestamp: number;
  unread: number;
}

export interface Notification {
  id: string;
  type: 'follow' | 'message' | 'room_invite' | 'gift' | 'raise_hand';
  fromName: string;
  fromAvatar: string;
  text: string;
  timestamp: number;
  read: boolean;
}

export interface Gift {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  xp: number;
}

// ─────────── CONSTANTS ───────────

export const GIFTS: Gift[] = [
  { id: 'rose',    emoji: '🌹', name: 'Rose',      cost: 10,   xp: 5   },
  { id: 'heart',   emoji: '💜', name: 'Heart',     cost: 50,   xp: 25  },
  { id: 'star',    emoji: '⭐', name: 'Star',      cost: 100,  xp: 50  },
  { id: 'crown',   emoji: '👑', name: 'Crown',     cost: 300,  xp: 150 },
  { id: 'rocket',  emoji: '🚀', name: 'Rocket',    cost: 500,  xp: 250 },
  { id: 'diamond', emoji: '💎', name: 'Diamond',   cost: 1000, xp: 500 },
  { id: 'galaxy',  emoji: '🌌', name: 'Galaxy',    cost: 2000, xp: 1000},
  { id: 'unicorn', emoji: '🦄', name: 'Unicorn',   cost: 5000, xp: 2500},
];

export const AVATARS = ['🌟', '🦋', '🔮', '🌙', '⭐', '🌺', '🦄', '🎭', '🌸', '💫', '🎪', '🌈', '🦊', '🐉', '🦁', '🐺'];

const LEVEL_XP = [0, 100, 300, 700, 1300, 2000, 3000, 4200, 5600, 7500, 10000];

export function getLevelFromXp(xp: number): number {
  for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_XP[i]) return i + 1;
  }
  return 1;
}

export function getXpToNextLevel(xp: number): { current: number; needed: number; pct: number } {
  const lvl = getLevelFromXp(xp);
  if (lvl >= 10) return { current: xp, needed: LEVEL_XP[9], pct: 100 };
  const base = LEVEL_XP[lvl - 1];
  const next = LEVEL_XP[lvl];
  const current = xp - base;
  const needed = next - base;
  return { current, needed, pct: Math.min(100, (current / needed) * 100) };
}

// ─────────── STORAGE HELPERS ───────────

const KEYS = {
  USERS: 'gv_users',
  CURRENT_USER: 'gv_current_user',
  ROOMS: 'gv_rooms',
  MESSAGES: 'gv_messages',
  CONVERSATIONS: 'gv_conversations',
  NOTIFICATIONS: 'gv_notifications',
};

function get<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function generateUID(): string {
  const digits = Math.floor(100000 + Math.random() * 900000);
  return `UID${digits}`;
}

export function getAvatarEmoji(userId: string): string {
  const index = userId.charCodeAt(0) % AVATARS.length;
  return AVATARS[index];
}

// ─────────── USERS ───────────

export function getUsers(): User[] {
  return get<User[]>(KEYS.USERS, []);
}

export function saveUser(user: User) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  set(KEYS.USERS, users);
}

export function findUserByEmail(email: string): User | null {
  return getUsers().find(u => u.email === email) || null;
}

export function findUserById(id: string): User | null {
  return getUsers().find(u => u.id === id) || null;
}

export function getCurrentUser(): User | null {
  const id = localStorage.getItem(KEYS.CURRENT_USER);
  if (!id) return null;
  return findUserById(id);
}

export function setCurrentUser(userId: string | null) {
  if (userId) localStorage.setItem(KEYS.CURRENT_USER, userId);
  else localStorage.removeItem(KEYS.CURRENT_USER);
}

export function followUser(myId: string, targetId: string) {
  const me = findUserById(myId);
  const target = findUserById(targetId);
  if (!me || !target) return;

  if (!me.following.includes(targetId)) {
    me.following.push(targetId);
    saveUser(me);
  }
  if (!target.followers.includes(myId)) {
    target.followers.push(myId);
    saveUser(target);

    // Add notification
    addNotification({
      id: generateId(),
      type: 'follow',
      fromName: me.username,
      fromAvatar: me.avatar,
      text: `${me.username} started following you`,
      timestamp: Date.now(),
      read: false,
    });
  }
}

export function unfollowUser(myId: string, targetId: string) {
  const me = findUserById(myId);
  const target = findUserById(targetId);
  if (!me || !target) return;

  me.following = me.following.filter(id => id !== targetId);
  saveUser(me);
  target.followers = target.followers.filter(id => id !== myId);
  saveUser(target);
}

// ─────────── ROOMS ───────────

const FAKE_ROOMS: Room[] = [
  {
    id: 'room1', name: 'Chill Vibes Only ✨', hostId: 'fake1', hostName: 'StarGazer',
    hostAvatar: '🌟', topic: 'Music & Life', userCount: 8, maxUsers: 9,
    isLive: true, category: 'hot', listeners: ['fake10', 'fake11'],
    raisedHands: ['fake10'],
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 8 ? `fake${i + 1}` : null,
      username: i < 8 ? ['StarGazer', 'MoonDancer', 'CosmoKid', 'NebulaDream', 'AstroGirl', 'SpaceWalker', 'GalaxyBoy', 'StarChild'][i] : null,
      avatar: i < 8 ? ['🌟', '🌙', '🚀', '💫', '🌺', '🎭', '🔮', '⭐'][i] : null,
      isMuted: i > 2, isLocked: false, isSpeaking: i === 0 || i === 2,
    })),
  },
  {
    id: 'room2', name: 'Late Night Thoughts 🌙', hostId: 'fake5', hostName: 'NightOwl',
    hostAvatar: '🦉', topic: 'Deep Talks', userCount: 5, maxUsers: 9,
    isLive: true, category: 'hot', listeners: [], raisedHands: [],
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 5 ? `fake_night${i}` : null,
      username: i < 5 ? ['NightOwl', 'DreamWalker', 'MidnightStar', 'SoulSearcher', 'InnerVoice'][i] : null,
      avatar: i < 5 ? ['🦉', '🌙', '⭐', '🔮', '🌺'][i] : null,
      isMuted: i > 1, isLocked: i === 8, isSpeaking: i === 0,
    })),
  },
  {
    id: 'room3', name: '🎵 Music Producers Hub', hostId: 'fake6', hostName: 'BeatMaker',
    hostAvatar: '🎵', topic: 'Beats & Bars', userCount: 9, maxUsers: 9,
    isLive: true, category: 'new', listeners: ['fake20', 'fake21', 'fake22'],
    raisedHands: ['fake20', 'fake21'],
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: `fake_music${i}`,
      username: ['BeatMaker', 'RhythmKing', 'SoundWave', 'BassDrop', 'MelodyMan', 'TonePoet', 'FreqMaster', 'VocalChamp', 'MixWizard'][i],
      avatar: ['🎵', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤', '🎼', '🎧'][i],
      isMuted: i > 3, isLocked: false, isSpeaking: i === 0 || i === 3,
    })),
  },
  {
    id: 'room4', name: '💻 Galaxy Study Room', hostId: 'fake9', hostName: 'CodeNinja',
    hostAvatar: '💻', topic: 'Focus & Study', userCount: 3, maxUsers: 9,
    isLive: true, category: 'new', listeners: [], raisedHands: [],
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 3 ? `fake_study${i}` : null,
      username: i < 3 ? ['CodeNinja', 'BookWorm', 'StudyBuddy'][i] : null,
      avatar: i < 3 ? ['💻', '📚', '✏️'][i] : null,
      isMuted: true, isLocked: false, isSpeaking: false,
    })),
  },
];

export function getRooms(): Room[] {
  const stored = get<Room[]>(KEYS.ROOMS, []);
  return [...FAKE_ROOMS, ...stored];
}

export function saveRoom(room: Room) {
  const stored = get<Room[]>(KEYS.ROOMS, []);
  const idx = stored.findIndex(r => r.id === room.id);
  if (idx >= 0) stored[idx] = room;
  else stored.push(room);
  set(KEYS.ROOMS, stored);
}

export function getRoomById(id: string): Room | null {
  return getRooms().find(r => r.id === id) || null;
}

// ─────────── MESSAGES ───────────

export function getMessages(userId1: string, userId2: string): ChatMessage[] {
  const all = get<ChatMessage[]>(KEYS.MESSAGES, []);
  return all.filter(m =>
    (m.fromId === userId1 && m.toId === userId2) ||
    (m.fromId === userId2 && m.toId === userId1)
  ).sort((a, b) => a.timestamp - b.timestamp);
}

export function saveMessage(msg: ChatMessage) {
  const all = get<ChatMessage[]>(KEYS.MESSAGES, []);
  all.push(msg);
  set(KEYS.MESSAGES, all);
}

export function getConversations(userId: string): Conversation[] {
  const all = get<Conversation[]>(KEYS.CONVERSATIONS, []);
  const userConvs = all.filter(c => c.id.startsWith(userId) || c.id.endsWith(userId));

  if (userConvs.length === 0) {
    return [
      { id: `${userId}_fake_chat1`, participantId: 'fake_chat1', participantName: 'StarGazer', participantAvatar: '🌟', lastMessage: 'Hey! Love your voice! 🌟', lastTimestamp: Date.now() - 3600000, unread: 2 },
      { id: `${userId}_fake_chat2`, participantId: 'fake_chat2', participantName: 'MoonDancer', participantAvatar: '🌙', lastMessage: 'Join my room tonight 🎤', lastTimestamp: Date.now() - 7200000, unread: 1 },
      { id: `${userId}_fake_chat3`, participantId: 'fake_chat3', participantName: 'CosmoKid', participantAvatar: '🚀', lastMessage: 'thanks for the gift! 💜', lastTimestamp: Date.now() - 86400000, unread: 0 },
    ];
  }
  return userConvs.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export function upsertConversation(conv: Conversation) {
  const all = get<Conversation[]>(KEYS.CONVERSATIONS, []);
  const idx = all.findIndex(c => c.id === conv.id);
  if (idx >= 0) all[idx] = conv;
  else all.push(conv);
  set(KEYS.CONVERSATIONS, all);
}

// ─────────── NOTIFICATIONS ───────────

export function getNotifications(): Notification[] {
  return get<Notification[]>(KEYS.NOTIFICATIONS, [
    { id: '1', type: 'follow', fromName: 'StarGazer', fromAvatar: '🌟', text: 'StarGazer started following you', timestamp: Date.now() - 1800000, read: false },
    { id: '2', type: 'gift', fromName: 'MoonDancer', fromAvatar: '🌙', text: 'MoonDancer sent you a 💎 Diamond!', timestamp: Date.now() - 3600000, read: false },
    { id: '3', type: 'room_invite', fromName: 'BeatMaker', fromAvatar: '🎵', text: 'BeatMaker invited you to Music Producers Hub', timestamp: Date.now() - 7200000, read: true },
  ]);
}

export function addNotification(notif: Notification) {
  const all = getNotifications();
  all.unshift(notif);
  set(KEYS.NOTIFICATIONS, all.slice(0, 50));
}

export function markNotificationsRead() {
  const all = getNotifications().map(n => ({ ...n, read: true }));
  set(KEYS.NOTIFICATIONS, all);
}

// ─────────── LEADERBOARD ───────────

export function getLeaderboard(): { id: string; uid: string; username: string; avatar: string; coins: number; level: number; totalGiftsReceived: number }[] {
  const users = getUsers();
  const fake = [
    { id: 'lb1', uid: 'UID100001', username: 'StarGazer',   avatar: '🌟', coins: 99999, level: 10, totalGiftsReceived: 450 },
    { id: 'lb2', uid: 'UID100002', username: 'MoonDancer',  avatar: '🌙', coins: 78500, level: 9,  totalGiftsReceived: 310 },
    { id: 'lb3', uid: 'UID100003', username: 'CosmoKid',    avatar: '🚀', coins: 62000, level: 9,  totalGiftsReceived: 280 },
    { id: 'lb4', uid: 'UID100004', username: 'NebulaDream', avatar: '💫', coins: 45000, level: 8,  totalGiftsReceived: 200 },
    { id: 'lb5', uid: 'UID100005', username: 'AstroGirl',   avatar: '🌺', coins: 33000, level: 7,  totalGiftsReceived: 180 },
    { id: 'lb6', uid: 'UID100006', username: 'GalaxyBoy',   avatar: '🔮', coins: 28000, level: 7,  totalGiftsReceived: 150 },
    { id: 'lb7', uid: 'UID100007', username: 'BeatMaker',   avatar: '🎵', coins: 22000, level: 6,  totalGiftsReceived: 120 },
    { id: 'lb8', uid: 'UID100008', username: 'NightOwl',    avatar: '🦉', coins: 18000, level: 6,  totalGiftsReceived: 95  },
  ];
  const realUsers = users.map(u => ({ id: u.id, uid: u.uid, username: u.username, avatar: u.avatar, coins: u.coins, level: u.level, totalGiftsReceived: u.totalGiftsReceived }));
  return [...realUsers, ...fake].sort((a, b) => b.coins - a.coins).slice(0, 20);
}

// ─────────── DAILY REWARD ───────────

export function claimDailyReward(userId: string): { success: boolean; coins: number; xp: number } {
  const user = findUserById(userId);
  if (!user) return { success: false, coins: 0, xp: 0 };

  const now = Date.now();
  const lastClaim = user.lastDailyReward || 0;
  const dayMs = 24 * 60 * 60 * 1000;
  if (now - lastClaim < dayMs) return { success: false, coins: 0, xp: 0 };

  const coins = 100 + Math.floor(Math.random() * 100);
  const xp = 50;
  const updated: User = {
    ...user,
    coins: user.coins + coins,
    xp: user.xp + xp,
    level: getLevelFromXp(user.xp + xp),
    lastDailyReward: now,
  };
  saveUser(updated);
  return { success: true, coins, xp };
}

export function canClaimDailyReward(userId: string): boolean {
  const user = findUserById(userId);
  if (!user) return false;
  const dayMs = 24 * 60 * 60 * 1000;
  return Date.now() - (user.lastDailyReward || 0) >= dayMs;
}

// ─────────── GIFTS ───────────

export function sendGift(senderId: string, receiverId: string, gift: Gift): { success: boolean; reason?: string } {
  const sender = findUserById(senderId);
  const receiver = findUserById(receiverId);
  if (!sender) return { success: false, reason: 'Sender not found' };
  if (sender.coins < gift.cost) return { success: false, reason: 'Not enough coins' };

  if (receiver) {
    const updatedReceiver: User = {
      ...receiver,
      coins: receiver.coins + Math.floor(gift.cost * 0.7),
      xp: receiver.xp + gift.xp,
      level: getLevelFromXp(receiver.xp + gift.xp),
      totalGiftsReceived: receiver.totalGiftsReceived + 1,
    };
    saveUser(updatedReceiver);
  }

  const updatedSender: User = {
    ...sender,
    coins: sender.coins - gift.cost,
    totalGiftsSent: sender.totalGiftsSent + 1,
  };
  saveUser(updatedSender);

  addNotification({
    id: generateId(),
    type: 'gift',
    fromName: sender.username,
    fromAvatar: sender.avatar,
    text: `${sender.username} sent ${receiver?.username || 'someone'} a ${gift.emoji} ${gift.name}!`,
    timestamp: Date.now(),
    read: false,
  });

  return { success: true };
}
