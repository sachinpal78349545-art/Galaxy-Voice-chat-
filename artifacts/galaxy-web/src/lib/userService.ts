import { ref, set, get, update, onValue, off } from "firebase/database";
import { db } from "./firebase";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  gender: string;
  birthday: string;
  coins: number;
  followers: number;
  following: number;
  level: number;
  xp: number;
  vip: boolean;
  createdAt: number;
}

export const DEFAULT_PROFILE: Partial<UserProfile> = {
  bio: "Hi there! I'm using ChaloTalk 🌟",
  gender: "Male",
  birthday: "",
  coins: 500,
  followers: 0,
  following: 0,
  level: 1,
  xp: 0,
  vip: false,
};

export const AVATAR_LIST = [
  "🌟","🌙","🚀","⭐","💫","🎵","🎤","🦉","🌌","⚡",
  "🔥","👑","💎","🎭","🏆","🦁","🐉","🦊","🌈","🎯",
];

export async function initUser(uid: string, name: string, email: string, avatar: string): Promise<UserProfile> {
  const existing = await getUser(uid);
  if (existing) return existing;
  const profile: UserProfile = {
    uid, name, email,
    avatar: avatar || AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)],
    ...DEFAULT_PROFILE,
    createdAt: Date.now(),
  } as UserProfile;
  await set(ref(db, `users/${uid}`), profile);
  return profile;
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
  await update(ref(db, `users/${uid}`), data);
}

export function subscribeUser(uid: string, cb: (u: UserProfile | null) => void) {
  const r = ref(db, `users/${uid}`);
  onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function addCoins(uid: string, amount: number, currentCoins: number): Promise<void> {
  await update(ref(db, `users/${uid}`), { coins: currentCoins + amount });
}

export async function gainXP(uid: string, amount: number, currentXP: number, currentLevel: number): Promise<void> {
  let xp = currentXP + amount;
  let level = currentLevel;
  const xpPerLevel = 1000;
  while (xp >= xpPerLevel && level < 100) { xp -= xpPerLevel; level += 1; }
  await update(ref(db, `users/${uid}`), { xp, level, vip: level >= 10 });
}
