import { sendNotification } from "./notificationSystem";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";

export async function followUser(myId: string, targetId: string) {
  await setDoc(doc(db, "follows", myId, "following", targetId), {
    uid: targetId
  });

  // 🔔 SEND NOTIFICATION
  await sendNotification(targetId, {
    type: "follow",
    from: myId,
    text: "started following you"
  });
}