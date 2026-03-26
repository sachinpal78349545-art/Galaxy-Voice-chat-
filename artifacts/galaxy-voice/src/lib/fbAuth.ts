import {
  signInWithPopup, signInAnonymously,
  onAuthStateChanged, signOut as fbSignOut,
  User as FBUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { generateUID } from './storage';

export interface AppUser {
  uid: string;
  customUID: string;
  displayName: string;
  photoURL: string;
  email: string;
  coins: number;
  level: number;
  xp: number;
  bio: string;
  followers: string[];
  following: string[];
  totalGiftsReceived: number;
  totalGiftsSent: number;
  lastDailyReward: number;
  isAnonymous: boolean;
}

const ANON_NAME_POOL = [
  'StarGazer', 'MoonWalker', 'CosmoKid', 'NebulaDream', 'AstroGirl',
  'SpacePilot', 'GalaxyBoy', 'StarChild', 'VoidDrifter', 'DarkMatter',
];
const ANON_AVATARS = ['🌟', '🌙', '🚀', '💫', '🦋', '🔮', '🌺', '⭐', '🎭', '🌈'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function ensureUserDoc(fbUser: FBUser): Promise<AppUser> {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    return snap.data() as AppUser;
  }

  const isAnon = fbUser.isAnonymous;
  const displayName = fbUser.displayName || randomFrom(ANON_NAME_POOL);
  const photoURL = fbUser.photoURL || randomFrom(ANON_AVATARS);
  const customUID = generateUID();

  const newUser: AppUser = {
    uid: fbUser.uid,
    customUID,
    displayName,
    photoURL,
    email: fbUser.email || '',
    coins: 500,
    level: 1,
    xp: 0,
    bio: '',
    followers: [],
    following: [],
    totalGiftsReceived: 0,
    totalGiftsSent: 0,
    lastDailyReward: 0,
    isAnonymous: isAnon,
  };

  await setDoc(ref, { ...newUser, createdAt: serverTimestamp() });
  return newUser;
}

export async function loginWithGoogle(): Promise<AppUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return ensureUserDoc(result.user);
}

export async function loginAnonymously(): Promise<AppUser> {
  const result = await signInAnonymously(auth);
  return ensureUserDoc(result.user);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

export async function updateUserCoins(uid: string, delta: number) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as AppUser;
  await setDoc(ref, { coins: Math.max(0, data.coins + delta) }, { merge: true });
}

export async function refreshUserFromDB(uid: string): Promise<AppUser | null> {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as AppUser;
}

export async function updateUserProfile(uid: string, updates: Partial<AppUser>) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, updates, { merge: true });
}

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) { callback(null); return; }
    try {
      const appUser = await ensureUserDoc(fbUser);
      callback(appUser);
    } catch {
      callback(null);
    }
  });
}
