import { ref, set, get, update, onValue, off, onDisconnect } from "firebase/database";
import { db } from "./firebase";

export interface Transaction {
  id: string;
  type: "recharge" | "gift_sent" | "gift_received" | "daily_reward" | "xp_reward";
  amount: number;
  description: string;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  gender: string;
  birthday: string;
  coins: number;
  followers: number;
  following: number;
  friends: number;
  level: number;
  xp: number;
  vip: boolean;
  online: boolean;
  lastSeen: number;
  createdAt: number;
  dailyReward?: {
    lastClaimed: number;
    streak: number;
  };
  followingList?: string[];
  followersList?: string[];
  transactions?: Record<string, Transaction>;
  achievements?: Record<string, Achievement>;
  roomsJoined?: number;
  messagesSent?: number;
}

export const DEFAULT_PROFILE: Partial<UserProfile> = {
  bio: "Hi there! I'm using ChaloTalk \u{1F31F}",
  gender: "Male",
  birthday: "",
  coins: 500,
  followers: 0,
  following: 0,
  friends: 0,
  level: 1,
  xp: 0,
  vip: false,
  online: true,
  lastSeen: Date.now(),
  roomsJoined: 0,
  messagesSent: 0,
};

export const AVATAR_LIST = [
  "\u{1F31F}","\u{1F319}","\u{1F680}","\u2B50","\u{1F4AB}","\u{1F3B5}","\u{1F3A4}","\u{1F989}","\u{1F30C}","\u26A1",
  "\u{1F525}","\u{1F451}","\u{1F48E}","\u{1F3AD}","\u{1F3C6}","\u{1F981}","\u{1F409}","\u{1F98A}","\u{1F308}","\u{1F3AF}",
];

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: "first_room", title: "First Steps", icon: "\u{1F680}", description: "Join your first voice room", unlocked: false },
  { id: "level_5", title: "Rising Star", icon: "\u2B50", description: "Reach Level 5", unlocked: false },
  { id: "level_10", title: "VIP Status", icon: "\u{1F451}", description: "Reach Level 10 and unlock VIP", unlocked: false },
  { id: "level_25", title: "Galaxy Legend", icon: "\u{1F30C}", description: "Reach Level 25", unlocked: false },
  { id: "coins_1000", title: "Rich!", icon: "\u{1F4B0}", description: "Accumulate 1,000 coins", unlocked: false },
  { id: "coins_10000", title: "Millionaire", icon: "\u{1F48E}", description: "Accumulate 10,000 coins", unlocked: false },
  { id: "messages_50", title: "Chatterbox", icon: "\u{1F4AC}", description: "Send 50 messages", unlocked: false },
  { id: "messages_500", title: "Social Butterfly", icon: "\u{1F98B}", description: "Send 500 messages", unlocked: false },
  { id: "rooms_10", title: "Room Hopper", icon: "\u{1F3A4}", description: "Join 10 rooms", unlocked: false },
  { id: "streak_7", title: "Dedicated", icon: "\u{1F525}", description: "7-day login streak", unlocked: false },
  { id: "gift_sender", title: "Generous", icon: "\u{1F381}", description: "Send your first gift", unlocked: false },
  { id: "follower_10", title: "Popular", icon: "\u{1F31F}", description: "Get 10 followers", unlocked: false },
];

export async function initUser(uid: string, name: string, email: string, avatar: string): Promise<UserProfile> {
  const existing = await getUser(uid);
  if (existing) {
    await update(ref(db, `users/${uid}`), { online: true, lastSeen: Date.now() });
    return { ...existing, online: true };
  }
  const achievements: Record<string, Achievement> = {};
  ALL_ACHIEVEMENTS.forEach(a => { achievements[a.id] = { ...a }; });
  const profile: UserProfile = {
    uid, name, email,
    avatar: avatar || AVATAR_LIST[Math.floor(Math.random() * AVATAR_LIST.length)],
    ...DEFAULT_PROFILE,
    createdAt: Date.now(),
    achievements,
  } as UserProfile;
  await set(ref(db, `users/${uid}`), profile);
  return profile;
}

export async function getUser(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(db, `users/${uid}`));
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function updateUser(uid: string, data: Partial<UserProfile>): Promise<void> {
  await update(ref(db, `users/${uid}`), data);
}

export function subscribeUser(uid: string, cb: (u: UserProfile | null) => void): () => void {
  const r = ref(db, `users/${uid}`);
  onValue(r, snap => cb(snap.exists() ? snap.val() : null));
  return () => off(r);
}

export async function addCoins(uid: string, amount: number, currentCoins: number): Promise<void> {
  await update(ref(db, `users/${uid}`), { coins: currentCoins + amount });
}

export async function gainXP(uid: string, amount: number, currentXP: number, currentLevel: number): Promise<void> {
  let xp = currentXP + amount;
  let level = currentLevel;
  const xpPerLevel = 1000;
  while (xp >= xpPerLevel && level < 100) { xp -= xpPerLevel; level += 1; }
  await update(ref(db, `users/${uid}`), { xp, level, vip: level >= 10 });
}

export function setupOnlinePresence(uid: string): () => void {
  const userStatusRef = ref(db, `users/${uid}`);
  const presenceData = { online: false, lastSeen: Date.now() };
  onDisconnect(userStatusRef).update(presenceData);
  update(userStatusRef, { online: true, lastSeen: Date.now() });
  return () => {
    update(userStatusRef, presenceData);
  };
}

export async function followUser(myUid: string, targetUid: string): Promise<void> {
  const mySnap = await get(ref(db, `users/${myUid}`));
  const targetSnap = await get(ref(db, `users/${targetUid}`));
  if (!mySnap.exists() || !targetSnap.exists()) return;

  const myData = mySnap.val();
  const targetData = targetSnap.val();

  const myFollowing = myData.followingList || [];
  if (myFollowing.includes(targetUid)) return;
  myFollowing.push(targetUid);

  const targetFollowers = targetData.followersList || [];
  targetFollowers.push(myUid);

  await update(ref(db, `users/${myUid}`), {
    followingList: myFollowing,
    following: myFollowing.length,
  });
  await update(ref(db, `users/${targetUid}`), {
    followersList: targetFollowers,
    followers: targetFollowers.length,
  });
}

export async function unfollowUser(myUid: string, targetUid: string): Promise<void> {
  const mySnap = await get(ref(db, `users/${myUid}`));
  const targetSnap = await get(ref(db, `users/${targetUid}`));
  if (!mySnap.exists() || !targetSnap.exists()) return;

  const myData = mySnap.val();
  const targetData = targetSnap.val();

  const myFollowing = (myData.followingList || []).filter((id: string) => id !== targetUid);
  const targetFollowers = (targetData.followersList || []).filter((id: string) => id !== myUid);

  await update(ref(db, `users/${myUid}`), {
    followingList: myFollowing,
    following: myFollowing.length,
  });
  await update(ref(db, `users/${targetUid}`), {
    followersList: targetFollowers,
    followers: targetFollowers.length,
  });
}

export async function claimDailyReward(uid: string, profile: UserProfile): Promise<{ coins: number; streak: number } | null> {
  const now = Date.now();
  const daily = profile.dailyReward || { lastClaimed: 0, streak: 0 };
  const lastDate = new Date(daily.lastClaimed).toDateString();
  const todayDate = new Date(now).toDateString();

  if (lastDate === todayDate) return null;

  const yesterday = new Date(now - 86400000).toDateString();
  const streak = lastDate === yesterday ? daily.streak + 1 : 1;
  const baseCoins = 50;
  const bonusCoins = Math.min(streak * 10, 100);
  const totalCoins = baseCoins + bonusCoins;

  await update(ref(db, `users/${uid}`), {
    coins: (profile.coins || 0) + totalCoins,
    dailyReward: { lastClaimed: now, streak },
  });

  await addTransaction(uid, {
    type: "daily_reward",
    amount: totalCoins,
    description: `Day ${streak} reward (+${bonusCoins} streak bonus)`,
  });

  await checkAchievements(uid, { ...profile, coins: profile.coins + totalCoins, dailyReward: { lastClaimed: now, streak } });

  return { coins: totalCoins, streak };
}

export async function addTransaction(uid: string, tx: Omit<Transaction, "id" | "timestamp">): Promise<void> {
  const id = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const transaction: Transaction = { ...tx, id, timestamp: Date.now() };
  await set(ref(db, `users/${uid}/transactions/${id}`), transaction);
}

export async function sendGift(senderUid: string, senderProfile: UserProfile, recipientSeatUser: string, giftEmoji: string, cost: number): Promise<boolean> {
  if (senderProfile.coins < cost) return false;

  await update(ref(db, `users/${senderUid}`), { coins: senderProfile.coins - cost });
  await addTransaction(senderUid, { type: "gift_sent", amount: -cost, description: `Sent ${giftEmoji} gift` });

  const recipientSnap = await get(ref(db, `users/${recipientSeatUser}`));
  if (recipientSnap.exists()) {
    const recipient = recipientSnap.val();
    await update(ref(db, `users/${recipientSeatUser}`), { coins: (recipient.coins || 0) + Math.floor(cost * 0.8) });
    await addTransaction(recipientSeatUser, { type: "gift_received", amount: Math.floor(cost * 0.8), description: `Received ${giftEmoji} gift` });
  }

  await checkAchievements(senderUid, { ...senderProfile, coins: senderProfile.coins - cost });
  return true;
}

export async function incrementStat(uid: string, stat: "roomsJoined" | "messagesSent"): Promise<void> {
  const snap = await get(ref(db, `users/${uid}/${stat}`));
  const current = snap.val() || 0;
  await update(ref(db, `users/${uid}`), { [stat]: current + 1 });
}

export async function checkAchievements(uid: string, profile: UserProfile): Promise<string[]> {
  const unlocked: string[] = [];
  const now = Date.now();
  const checks: Record<string, boolean> = {
    first_room: (profile.roomsJoined || 0) >= 1,
    level_5: profile.level >= 5,
    level_10: profile.level >= 10,
    level_25: profile.level >= 25,
    coins_1000: profile.coins >= 1000,
    coins_10000: profile.coins >= 10000,
    messages_50: (profile.messagesSent || 0) >= 50,
    messages_500: (profile.messagesSent || 0) >= 500,
    rooms_10: (profile.roomsJoined || 0) >= 10,
    streak_7: (profile.dailyReward?.streak || 0) >= 7,
    follower_10: (profile.followers || 0) >= 10,
  };

  const achievements = profile.achievements || {};
  for (const [id, condition] of Object.entries(checks)) {
    if (condition && achievements[id] && !achievements[id].unlocked) {
      await update(ref(db, `users/${uid}/achievements/${id}`), { unlocked: true, unlockedAt: now });
      unlocked.push(id);
    }
  }
  return unlocked;
}

export function getAchievementsList(profile: UserProfile): Achievement[] {
  if (!profile.achievements) return ALL_ACHIEVEMENTS;
  return ALL_ACHIEVEMENTS.map(a => profile.achievements?.[a.id] || a);
}
