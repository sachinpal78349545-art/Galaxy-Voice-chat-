import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

export function setOnline(uid: string) {
  setDoc(doc(db, "users", uid), {
    online: true,
    lastSeen: Date.now()
  }, { merge: true });
}

export function setOffline(uid: string) {
  setDoc(doc(db, "users", uid), {
    online: false,
    lastSeen: Date.now()
  }, { merge: true });
}

export function listenUser(uid: string, cb: any) {
  return onSnapshot(doc(db, "users", uid), snap => {
    cb(snap.data());
  });
}