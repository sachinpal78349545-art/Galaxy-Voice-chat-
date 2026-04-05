import { ref, push, set, get, onValue, off } from "firebase/database";
import { db } from "./firebase";

export interface GiftRecord {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  giftEmoji: string;
  coins: number;
  timestamp: number;
}

export async function recordGift(gift: Omit<GiftRecord, "id">): Promise<void> {
  const gRef = push(ref(db, "gifts"));
  await set(gRef, { ...gift, id: gRef.key });
}

export async function getGiftHistory(uid: string, limit = 50): Promise<GiftRecord[]> {
  const snap = await get(ref(db, "gifts"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const gifts: GiftRecord[] = Object.keys(val)
    .map(k => ({ ...val[k], id: k }))
    .filter((g: GiftRecord) => g.senderId === uid || g.receiverId === uid)
    .sort((a: GiftRecord, b: GiftRecord) => b.timestamp - a.timestamp)
    .slice(0, limit);
  return gifts;
}

export type LeaderboardPeriod = "daily" | "weekly" | "monthly";

function getPeriodStart(period: LeaderboardPeriod): number {
  const now = new Date();
  if (period === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  } else if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.getFullYear(), now.getMonth(), diff).getTime();
  } else {
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  }
}

export interface LeaderboardEntry {
  uid: string;
  name: string;
  avatar: string;
  totalCoins: number;
}

export async function getGiftLeaderboard(period: LeaderboardPeriod, type: "senders" | "receivers" = "senders"): Promise<LeaderboardEntry[]> {
  const snap = await get(ref(db, "gifts"));
  if (!snap.exists()) return [];
  const val = snap.val();
  const periodStart = getPeriodStart(period);
  const gifts: GiftRecord[] = Object.values(val);

  const map = new Map<string, { name: string; avatar: string; total: number }>();

  for (const g of gifts) {
    if (g.timestamp < periodStart) continue;
    const key = type === "senders" ? g.senderId : g.receiverId;
    const name = type === "senders" ? g.senderName : g.receiverName;
    const avatar = type === "senders" ? g.senderAvatar : g.receiverAvatar;
    const existing = map.get(key);
    if (existing) {
      existing.total += g.coins;
    } else {
      map.set(key, { name, avatar, total: g.coins });
    }
  }

  return Array.from(map.entries())
    .map(([uid, data]) => ({ uid, name: data.name, avatar: data.avatar, totalCoins: data.total }))
    .sort((a, b) => b.totalCoins - a.totalCoins)
    .slice(0, 20);
}
