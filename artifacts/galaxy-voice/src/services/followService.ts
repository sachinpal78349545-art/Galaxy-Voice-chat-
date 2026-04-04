import { db } from '../lib/firebase';
import {
  doc, getDoc, setDoc, deleteDoc, updateDoc,
  arrayUnion, arrayRemove, collection, getDocs
} from 'firebase/firestore';
import { sendNotification } from '../lib/notificationSystem';

// ─── Follow / Unfollow ───────────────────────────────────────────────

export async function followUser(myId: string, myName: string, targetId: string): Promise<void> {
  await updateDoc(doc(db, 'users', myId), { following: arrayUnion(targetId) });
  await updateDoc(doc(db, 'users', targetId), { followers: arrayUnion(myId) });
  await setDoc(doc(db, 'follows', myId, 'following', targetId), { uid: targetId, ts: Date.now() });
  await sendNotification(targetId, {
    type: 'follow',
    from: myId,
    text: `${myName} started following you`,
  });
}

export async function unfollowUser(myId: string, targetId: string): Promise<void> {
  await updateDoc(doc(db, 'users', myId), { following: arrayRemove(targetId) });
  await updateDoc(doc(db, 'users', targetId), { followers: arrayRemove(myId) });
  try {
    await deleteDoc(doc(db, 'follows', myId, 'following', targetId));
  } catch { }
}

export async function isFollowing(myId: string, targetId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'users', myId));
    const data = snap.data();
    return Array.isArray(data?.following) && data.following.includes(targetId);
  } catch {
    return false;
  }
}

// ─── Block / Unblock ─────────────────────────────────────────────────

export async function blockUser(myId: string, targetId: string): Promise<void> {
  await setDoc(doc(db, 'blocks', myId, 'blocked', targetId), {
    uid: targetId,
    timestamp: Date.now(),
  });
  await unfollowUser(myId, targetId).catch(() => {});
}

export async function unblockUser(myId: string, targetId: string): Promise<void> {
  await deleteDoc(doc(db, 'blocks', myId, 'blocked', targetId));
}

export async function isBlocked(myId: string, targetId: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'blocks', myId, 'blocked', targetId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getBlockedUsers(myId: string): Promise<string[]> {
  try {
    const snap = await getDocs(collection(db, 'blocks', myId, 'blocked'));
    return snap.docs.map(d => d.id);
  } catch {
    return [];
  }
}

// ─── Report ──────────────────────────────────────────────────────────

export async function reportUser(
  reporterId: string,
  targetId: string,
  reason: string,
): Promise<void> {
  await setDoc(doc(db, 'reports', `${reporterId}_${targetId}_${Date.now()}`), {
    reporterId,
    targetId,
    reason,
    timestamp: Date.now(),
  });
}
