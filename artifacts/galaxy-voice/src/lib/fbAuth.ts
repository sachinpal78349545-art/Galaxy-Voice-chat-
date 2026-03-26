import {
  signInWithRedirect, getRedirectResult,
  signInAnonymously,
  signInWithPhoneNumber, RecaptchaVerifier,
  ConfirmationResult,
  onAuthStateChanged, signOut as fbSignOut,
  User as FBUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { generateUID } from './storage';

// ─── Types ──────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  customUID: string;
  displayName: string;
  photoURL: string;
  email: string;
  phone: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────

const ANON_NAME_POOL = [
  'StarGazer', 'MoonWalker', 'CosmoKid', 'NebulaDream', 'AstroGirl',
  'SpacePilot', 'GalaxyBoy', 'StarChild', 'VoidDrifter', 'DarkMatter',
];
const ANON_AVATARS = ['🌟', '🌙', '🚀', '💫', '🦋', '🔮', '🌺', '⭐', '🎭', '🌈'];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Create / fetch Firestore user doc ───────────────────────────────

export async function ensureUserDoc(fbUser: FBUser): Promise<AppUser> {
  const ref = doc(db, 'users', fbUser.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    // Merge any new fields without overwriting existing data
    const existing = snap.data() as AppUser;
    // Backfill phone if available and missing
    if (fbUser.phoneNumber && !existing.phone) {
      await setDoc(ref, { phone: fbUser.phoneNumber }, { merge: true });
      return { ...existing, phone: fbUser.phoneNumber };
    }
    return existing;
  }

  const isAnon = fbUser.isAnonymous;
  const displayName =
    fbUser.displayName ||
    (fbUser.phoneNumber ? `User${fbUser.phoneNumber.slice(-4)}` : randomFrom(ANON_NAME_POOL));
  const photoURL = fbUser.photoURL || randomFrom(ANON_AVATARS);
  const customUID = generateUID();

  const newUser: AppUser = {
    uid: fbUser.uid,
    customUID,
    displayName,
    photoURL,
    email: fbUser.email || '',
    phone: fbUser.phoneNumber || '',
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

// ─── Google (redirect flow — mobile-friendly) ─────────────────────────

/**
 * Kick off Google sign-in via redirect. The page will reload; call
 * checkGoogleRedirectResult() on the next load to capture the result.
 */
export async function loginWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
}

/**
 * Must be called once on app start to capture the redirect result.
 * Returns the AppUser on success, null if no pending redirect.
 */
export async function checkGoogleRedirectResult(): Promise<AppUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return ensureUserDoc(result.user);
  } catch (err) {
    console.error('[Auth] getRedirectResult error:', err);
    return null;
  }
}

// ─── Anonymous ───────────────────────────────────────────────────────

export async function loginAnonymously(): Promise<AppUser> {
  const result = await signInAnonymously(auth);
  return ensureUserDoc(result.user);
}

// ─── Phone OTP ───────────────────────────────────────────────────────

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

/**
 * Set up an invisible reCAPTCHA on `elementId` (a div in the DOM).
 * Safe to call multiple times — clears the old instance first.
 */
export function setupRecaptcha(elementId: string): RecaptchaVerifier {
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch { /* ignore */ }
    window.recaptchaVerifier = undefined;
  }
  const verifier = new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved */ },
    'expired-callback': () => { window.recaptchaVerifier = undefined; },
  });
  window.recaptchaVerifier = verifier;
  return verifier;
}

/**
 * Send OTP to phoneNumber (E.164 format, e.g. +1234567890).
 * Returns a ConfirmationResult stored on window for the verify step.
 */
export async function sendOTP(phoneNumber: string): Promise<ConfirmationResult> {
  const verifier = window.recaptchaVerifier || setupRecaptcha('recaptcha-container');
  const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  window.confirmationResult = confirmationResult;
  return confirmationResult;
}

/**
 * Verify the OTP code and return the AppUser.
 */
export async function verifyOTP(code: string): Promise<AppUser> {
  if (!window.confirmationResult) throw new Error('No OTP session. Please resend the code.');
  const result = await window.confirmationResult.confirm(code);
  return ensureUserDoc(result.user);
}

// ─── Sign out ────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

// ─── Firestore helpers ───────────────────────────────────────────────

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

// ─── Auth state listener ─────────────────────────────────────────────

export function onAuthChange(callback: (user: AppUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) { callback(null); return; }
    try {
      const appUser = await ensureUserDoc(fbUser);
      callback(appUser);
    } catch (err) {
      console.error('[Auth] ensureUserDoc failed:', err);
      callback(null);
    }
  });
}
