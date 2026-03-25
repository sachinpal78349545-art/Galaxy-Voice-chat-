export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  avatar: string;
  level: number;
  coins: number;
  bio: string;
  gender: string;
  birthday: string;
  location: string;
  relationship: string;
  interests: string[];
  followers: number;
  following: number;
  nickname: string;
  darkMode: boolean;
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

const KEYS = {
  USERS: 'gv_users',
  CURRENT_USER: 'gv_current_user',
  ROOMS: 'gv_rooms',
  MESSAGES: 'gv_messages',
  CONVERSATIONS: 'gv_conversations',
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

const AVATARS = ['🌟', '🦋', '🔮', '🌙', '⭐', '🌺', '🦄', '🎭', '🌸', '💫', '🎪', '🌈'];
const AVATAR_COLORS = [
  'linear-gradient(135deg, #6C5CE7, #A29BFE)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
  'linear-gradient(135deg, #00b894, #00cec9)',
  'linear-gradient(135deg, #e17055, #d63031)',
  'linear-gradient(135deg, #0984e3, #74b9ff)',
  'linear-gradient(135deg, #fdcb6e, #e17055)',
];

export function getAvatarColor(userId: string): string {
  const index = userId.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getAvatarEmoji(userId: string): string {
  const index = userId.charCodeAt(0) % AVATARS.length;
  return AVATARS[index];
}

// Users
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

// Current user
export function getCurrentUser(): User | null {
  const id = localStorage.getItem(KEYS.CURRENT_USER);
  if (!id) return null;
  return findUserById(id);
}

export function setCurrentUser(userId: string | null) {
  if (userId) localStorage.setItem(KEYS.CURRENT_USER, userId);
  else localStorage.removeItem(KEYS.CURRENT_USER);
}

export function updateCurrentUser(updates: Partial<User>) {
  const user = getCurrentUser();
  if (!user) return;
  const updated = { ...user, ...updates };
  saveUser(updated);
}

// Rooms
const FAKE_ROOMS: Room[] = [
  {
    id: 'room1', name: 'Chill Vibes Only', hostId: 'fake1', hostName: 'StarGazer',
    hostAvatar: '🌟', topic: 'Music & Life', userCount: 8, maxUsers: 10,
    isLive: true, category: 'hot',
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: i < 8 ? `fake${i + 1}` : null,
      username: i < 8 ? ['StarGazer', 'MoonDancer', 'CosmoKid', 'NebulaDream', 'AstroGirl', 'SpaceWalker', 'GalaxyBoy', 'StarChild'][i] : null,
      avatar: i < 8 ? ['🌟', '🌙', '🚀', '💫', '🌺', '🎭', '🔮', '⭐'][i] : null,
      isMuted: i > 2,
      isLocked: false,
      isSpeaking: i === 0 || i === 2,
    })),
  },
  {
    id: 'room2', name: 'Late Night Thoughts', hostId: 'fake5', hostName: 'NightOwl',
    hostAvatar: '🦉', topic: 'Deep Talks', userCount: 5, maxUsers: 8,
    isLive: true, category: 'hot',
    seats: Array.from({ length: 8 }, (_, i) => ({
      index: i,
      userId: i < 5 ? `fake_night${i}` : null,
      username: i < 5 ? ['NightOwl', 'DreamWalker', 'MidnightStar', 'SoulSearcher', 'InnerVoice'][i] : null,
      avatar: i < 5 ? ['🦉', '🌙', '⭐', '🔮', '🌺'][i] : null,
      isMuted: i > 1,
      isLocked: i === 7,
      isSpeaking: i === 0,
    })),
  },
  {
    id: 'room3', name: 'Music Producers Hub', hostId: 'fake6', hostName: 'BeatMaker',
    hostAvatar: '🎵', topic: 'Beats & Bars', userCount: 12, maxUsers: 15,
    isLive: true, category: 'new',
    seats: Array.from({ length: 9 }, (_, i) => ({
      index: i,
      userId: `fake_music${i}`,
      username: ['BeatMaker', 'RhythmKing', 'SoundWave', 'BassDrop', 'MelodyMan', 'TonePoet', 'FreqMaster', 'VocalChamp', 'MixWizard'][i],
      avatar: ['🎵', '🎸', '🎹', '🥁', '🎺', '🎻', '🎤', '🎼', '🎧'][i],
      isMuted: i > 3,
      isLocked: false,
      isSpeaking: i === 0 || i === 3,
    })),
  },
  {
    id: 'room4', name: 'Galaxy Study Room', hostId: 'fake9', hostName: 'CodeNinja',
    hostAvatar: '💻', topic: 'Focus & Study', userCount: 3, maxUsers: 6,
    isLive: true, category: 'new',
    seats: Array.from({ length: 6 }, (_, i) => ({
      index: i,
      userId: i < 3 ? `fake_study${i}` : null,
      username: i < 3 ? ['CodeNinja', 'BookWorm', 'StudyBuddy'][i] : null,
      avatar: i < 3 ? ['💻', '📚', '✏️'][i] : null,
      isMuted: true,
      isLocked: false,
      isSpeaking: false,
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

// Messages
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

// Conversations
export function getConversations(userId: string): Conversation[] {
  const all = get<Conversation[]>(KEYS.CONVERSATIONS, []);
  const userConvs = all.filter(c => c.id.includes(userId));

  if (userConvs.length === 0) {
    return [
      {
        id: `${userId}_fake_chat1`,
        participantId: 'fake_chat1',
        participantName: 'StarGazer',
        participantAvatar: '🌟',
        lastMessage: 'Hey! Love your voice!',
        lastTimestamp: Date.now() - 3600000,
        unread: 2,
      },
      {
        id: `${userId}_fake_chat2`,
        participantId: 'fake_chat2',
        participantName: 'MoonDancer',
        participantAvatar: '🌙',
        lastMessage: 'Join my room later tonight',
        lastTimestamp: Date.now() - 7200000,
        unread: 0,
      },
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

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
