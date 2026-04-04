import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  doc
} from "firebase/firestore";

// 🔔 SEND NOTIFICATION
export async function sendNotification(toUid: string, data: any) {
  await addDoc(collection(db, "notifications", toUid, "items"), {
    ...data,
    createdAt: Date.now(),
    read: false
  });
}

// 📥 LISTEN NOTIFICATION
export function listenNotifications(uid: string, cb: any) {
  const q = query(
    collection(db, "notifications", uid, "items"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap) => {
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    cb(list);
  });
}

// ✔ MARK AS READ
export async function markAsRead(uid: string, id: string) {
  await updateDoc(doc(db, "notifications", uid, "items", id), {
    read: true
  });
}