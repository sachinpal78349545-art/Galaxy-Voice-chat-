import { db } from "./firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  doc
} from "firebase/firestore";

// =======================
// 📤 SEND TEXT MESSAGE
// =======================
export async function sendMessage(chatId: string, msg: any) {
  try {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      type: "text",
      text: msg.text || "",
      userId: msg.userId,
      userName: msg.userName || "User",
      replyTo: msg.replyTo || null,
      createdAt: Date.now(),
      seen: false
    });
  } catch (err) {
    console.error("Send Message Error:", err);
  }
}

// =======================
// 🎤 SEND VOICE MESSAGE
// =======================
export async function sendVoiceMessage(
  chatId: string,
  audioUrl: string,
  user: any
) {
  try {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      type: "voice",
      audioUrl,
      userId: user.uid,
      userName: user.name || "User",
      replyTo: null,
      createdAt: Date.now(),
      seen: false
    });
  } catch (err) {
    console.error("Voice Message Error:", err);
  }
}

// =======================
// 👀 LISTEN MESSAGES (REALTIME)
// =======================
export function listenMessages(chatId: string, cb: any) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map((d) => ({
      id: d.id,
      ...d.data()
    }));

    cb(msgs);

    // =======================
    // ✅ SAFE AUTO SEEN (NO LOOP)
    // =======================
    snap.docs.forEach((d) => {
      const data: any = d.data();
      if (!data.seen) {
        updateDoc(d.ref, { seen: true });
      }
    });
  });
}

// =======================
// 🔁 DELETE MESSAGE (OPTIONAL)
// =======================
export async function deleteMessage(chatId: string, messageId: string) {
  try {
    await updateDoc(
      doc(db, "chats", chatId, "messages", messageId),
      {
        deleted: true,
        text: "Message deleted"
      }
    );
  } catch (err) {
    console.error("Delete Error:", err);
  }
}

// =======================
// 👍 LIKE MESSAGE (OPTIONAL)
// =======================
export async function likeMessage(chatId: string, messageId: string) {
  try {
    await updateDoc(
      doc(db, "chats", chatId, "messages", messageId),
      {
        liked: true
      }
    );
  } catch (err) {
    console