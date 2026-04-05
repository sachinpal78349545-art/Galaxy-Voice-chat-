import { ref, push, set, onValue, off, update, get } from "firebase/database";
import { db } from "./firebase";

export interface Notification {
  id: string;
  type: "message" | "follower" | "follow_back" | "gift" | "room_invite" | "friend_request" | "achievement" | "system";
  title: string;
  body: string;
  icon: string;
  fromUid?: string;
  fromName?: string;
  data?: Record<string, string>;
  read: boolean;
  timestamp: number;
}

export async function sendNotification(
  toUid: string,
  notif: Omit<Notification, "id" | "read" | "timestamp">
): Promise<void> {
  const nRef = push(ref(db, `notifications/${toUid}`));
  await set(nRef, {
    ...notif,
    read: false,
    timestamp: Date.now(),
  });
}

export function subscribeNotifications(uid: string, cb: (notifs: Notification[]) => void): () => void {
  const r = ref(db, `notifications/${uid}`);
  onValue(r, snap => {
    if (!snap.exists()) { cb([]); return; }
    const val = snap.val();
    const notifs: Notification[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    cb(notifs.slice(0, 100));
  });
  return () => off(r);
}

export async function markNotificationRead(uid: string, notifId: string): Promise<void> {
  await update(ref(db, `notifications/${uid}/${notifId}`), { read: true });
}

export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snap = await get(ref(db, `notifications/${uid}`));
  if (!snap.exists()) return;
  const updates: Record<string, boolean> = {};
  Object.keys(snap.val()).forEach(k => {
    updates[`notifications/${uid}/${k}/read`] = true;
  });
  await update(ref(db), updates);
}

export async function clearNotifications(uid: string): Promise<void> {
  await set(ref(db, `notifications/${uid}`), null);
}
