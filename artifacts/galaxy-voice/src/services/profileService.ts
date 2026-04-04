import { db, storage } from '../lib/firebase';
import {
  doc, getDoc, onSnapshot, setDoc, deleteDoc,
  collection, getDocs
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { AppUser } from '../lib/fbAuth';

export type VIPTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Galactic';

export interface Achievement {
  id: string;
  icon: string;
  label: string;
  earned: boolean;
}

export interface AgencyStats {
  agencyName: string;
  agencyBadge: string;
  liveHours: number;
  targetHours: number;
  salary: number;
  targetSalary: number;
  rank: string;
}

// ─── VIP System ─────────────────────────────────────────────────────

export function getVIPTier(level: number, coins: number): VIPTier {
  if (level >= 9 || coins >= 50000) return 'Galactic';
  if (level >= 7 || coins >= 20000) return 'Platinum';
  if (level >= 5 || coins >= 5000)  return 'Gold';
  if (level >= 3 || coins >= 1000)  return 'Silver';
  return 'Bronze';
}

export const VIP_COLORS: Record<VIPTier, string> = {
  Bronze:   '#cd7f32',
  Silver:   '#c0c0c0',
  Gold:     '#ffd700',
  Platinum: '#e2e8f0',
  Galactic: '#6C5CE7',
};

export const VIP_GLOW: Record<VIPTier, string> = {
  Bronze:   '0 0 16px rgba(205,127,50,0.7)',
  Silver:   '0 0 16px rgba(192,192,192,0.7)',
  Gold:     '0 0 20px rgba(255,215,0,0.8)',
  Platinum: '0 0 20px rgba(226,232,240,0.8)',
  Galactic: '0 0 28px rgba(108,92,231,0.9)',
};

// ─── Achievements ────────────────────────────────────────────────────

export function getAchievements(user: AppUser): Achievement[] {
  const safeUser = {
    ...user,
    followers:           Array.isArray(user?.followers) ? user.followers : [],
    following:           Array.isArray(user?.following) ? user.following : [],
    totalGiftsReceived:  user?.totalGiftsReceived  ?? 0,
    totalGiftsSent:      user?.totalGiftsSent      ?? 0,
    level:               user?.level               ?? 1,
    coins:               user?.coins               ?? 0,
    xp:                  user?.xp                  ?? 0,
  };
  return [
    { id: 'first_steps',     icon: '🚀', label: 'First Steps',       earned: true },
    { id: 'voice_star',      icon: '🎤', label: 'Voice Star',         earned: (safeUser.totalGiftsReceived ?? 0) > 0 },
    { id: 'social_butterfly',icon: '🦋', label: 'Social Butterfly',   earned: safeUser.followers.length >= 5 },
    { id: 'gift_giver',      icon: '🎁', label: 'Gift Giver',         earned: (safeUser.totalGiftsSent ?? 0) >= 3 },
    { id: 'level_up',        icon: '⚡', label: 'Level Up',           earned: (safeUser.level ?? 1) >= 3 },
    { id: 'popular',         icon: '👑', label: 'Popular',            earned: safeUser.followers.length >= 20 },
    { id: 'rich',            icon: '💰', label: 'Millionaire',        earned: (safeUser.coins ?? 0) >= 10000 },
    { id: 'galaxy_citizen',  icon: '🌌', label: 'Galaxy Citizen',     earned: (safeUser.level ?? 1) >= 5 },
  ];
}

// ─── Agency Stats (mock data seeded from user data) ─────────────────

export function getAgencyStats(user: AppUser): AgencyStats {
  const liveHours = Math.floor(user.xp / 100);
  return {
    agencyName: 'Galaxy Agency #17',
    agencyBadge: '🏢',
    liveHours,
    targetHours: 50,
    salary: Math.floor(user.coins * 0.1),
    targetSalary: 5000,
    rank: user.level >= 7 ? 'Senior Host' : user.level >= 4 ? 'Host' : 'Trainee',
  };
}

// ─── Firestore CRUD ──────────────────────────────────────────────────

export function listenProfile(uid: string, cb: (user: AppUser | null) => void): () => void {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) cb(snap.data() as AppUser);
    else cb(null);
  }, (err) => {
    console.error('[profileService] listenProfile error:', err);
    cb(null);
  });
}

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? (snap.data() as AppUser) : null;
  } catch (err) {
    console.error('[profileService] getUserProfile error:', err);
    return null;
  }
}

export async function updateUserProfile(uid: string, updates: Partial<AppUser>): Promise<void> {
  await setDoc(doc(db, 'users', uid), updates, { merge: true });
}

export async function uploadAvatar(uid: string, file: File): Promise<string> {
  const ref = storageRef(storage, `avatars/${uid}/${Date.now()}_${file.name}`);
  const snap = await uploadBytes(ref, file);
  return getDownloadURL(snap.ref);
}

export async function deleteAccount(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid));
  const notifSnap = await getDocs(collection(db, 'notifications', uid, 'items'));
  for (const d of notifSnap.docs) await deleteDoc(d.ref);
}

// ─── Presence (online/offline) ───────────────────────────────────────

export async function setUserOnline(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { online: true, lastSeen: Date.now() }, { merge: true });
}

export async function setUserOffline(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { online: false, lastSeen: Date.now() }, { merge: true });
}

export async function toggleProfileVisibility(uid: string, isPublic: boolean): Promise<void> {
  await setDoc(doc(db, 'users', uid), { isPublic }, { merge: true });
}
