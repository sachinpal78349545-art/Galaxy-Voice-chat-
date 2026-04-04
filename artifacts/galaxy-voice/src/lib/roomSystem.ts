import { db } from "./firebase";
import { doc, setDoc, deleteDoc, collection, onSnapshot } from "firebase/firestore";

// join
export async function joinRoom(roomId: string, userId: string) {
  await setDoc(doc(db, "rooms", roomId, "users", userId), {
    userId,
    joinedAt: Date.now()
  });
}

// leave
export async function leaveRoom(roomId: string, userId: string) {
  await deleteDoc(doc(db, "rooms", roomId, "users", userId));
}

// listen users
export function listenUsers(roomId: string, cb: any) {
  return onSnapshot(collection(db, "rooms", roomId, "users"), snap => {
    const arr:any[] = [];
    snap.forEach(d=>arr.push(d.data()));
    cb(arr);
  });
}