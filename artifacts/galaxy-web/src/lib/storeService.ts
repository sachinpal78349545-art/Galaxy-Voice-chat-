import { ref, get, update, runTransaction } from "firebase/database";
import { db } from "./firebase";
import { addTransaction } from "./userService";

export interface StoreItem {
  id: string;
  name: string;
  icon: string;
  category: "frame" | "entry" | "theme";
  price: number;
  preview: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

export interface OwnedItem {
  itemId: string;
  purchasedAt: number;
  equipped: boolean;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#8B8B8B",
  rare: "#4FC3F7",
  epic: "#AB47BC",
  legendary: "#FFD700",
};

export function getRarityColor(rarity: string): string {
  return RARITY_COLORS[rarity] || RARITY_COLORS.common;
}

export const STORE_ITEMS: StoreItem[] = [
  { id: "frame_divine_wing", name: "Divine Wing", icon: "\u{1F451}", category: "frame", price: 500000, preview: "radial-gradient(circle, #FFD700, #4169E1, #1A0F2E)", rarity: "legendary" },
  { id: "frame_crystal_pink", name: "Crystal Pink", icon: "\u{1F338}", category: "frame", price: 250000, preview: "radial-gradient(circle, #FF69B4, #C0C0C0, #1A0F2E)", rarity: "epic" },

  { id: "entry_lightning", name: "Lightning Strike", icon: "\u26A1", category: "entry", price: 300, preview: "linear-gradient(135deg, #FFD700, #FF6B35)", rarity: "common" },
  { id: "entry_stars", name: "Starfall", icon: "\u2B50", category: "entry", price: 600, preview: "linear-gradient(135deg, #6C5CE7, #A29BFE)", rarity: "rare" },
  { id: "entry_phoenix", name: "Phoenix Rise", icon: "\u{1F985}", category: "entry", price: 1000, preview: "linear-gradient(135deg, #FF6B35, #FF1744)", rarity: "epic" },
  { id: "entry_galaxy", name: "Galaxy Portal", icon: "\u{1F300}", category: "entry", price: 1800, preview: "linear-gradient(135deg, #0D47A1, #6C5CE7, #E040FB)", rarity: "legendary" },

  { id: "theme_midnight", name: "Midnight Blue", icon: "\u{1F319}", category: "theme", price: 400, preview: "linear-gradient(180deg, #0D1B2A, #1B2838)", rarity: "common" },
  { id: "theme_sakura", name: "Sakura Garden", icon: "\u{1F338}", category: "theme", price: 700, preview: "linear-gradient(180deg, #2D1B38, #1A0F2E)", rarity: "rare" },
  { id: "theme_ocean", name: "Deep Ocean", icon: "\u{1F30A}", category: "theme", price: 700, preview: "linear-gradient(180deg, #0A1628, #0D2137)", rarity: "rare" },
  { id: "theme_volcano", name: "Volcano", icon: "\u{1F30B}", category: "theme", price: 1200, preview: "linear-gradient(180deg, #2D0A0A, #1A0505)", rarity: "epic" },
  { id: "theme_aurora", name: "Aurora Borealis", icon: "\u{1F30C}", category: "theme", price: 2500, preview: "linear-gradient(180deg, #0A2E1A, #1A0F2E, #0D1B4A)", rarity: "legendary" },
];

export function getStoreItem(itemId: string): StoreItem | undefined {
  return STORE_ITEMS.find(i => i.id === itemId);
}

const PNG_FRAME_MAP: Record<string, string> = {
  frame_divine_wing: "assets/86874.png",
  frame_crystal_pink: "assets/86875.png",
};

export function getPngFramePath(frameId: string): string | null {
  return PNG_FRAME_MAP[frameId] || null;
}

export function isPngFrame(frameId: string): boolean {
  return frameId in PNG_FRAME_MAP;
}

export async function purchaseItem(uid: string, itemId: string, currentCoins: number): Promise<boolean> {
  const item = getStoreItem(itemId);
  if (!item) return false;
  if (currentCoins < item.price) return false;

  const owned = await getInventory(uid);
  if (owned.some(o => o.itemId === itemId)) return false;

  const coinsRef = ref(db, `users/${uid}/coins`);
  const result = await runTransaction(coinsRef, (c: number | null) => {
    const coins = c ?? 0;
    if (coins < item.price) return undefined;
    return coins - item.price;
  });

  if (!result.committed) return false;

  await update(ref(db, `users/${uid}/inventory/${itemId}`), {
    itemId,
    purchasedAt: Date.now(),
    equipped: false,
  });

  await addTransaction(uid, {
    type: "gift_sent",
    amount: -item.price,
    description: `Bought ${item.name}`,
  });

  return true;
}

export async function getInventory(uid: string): Promise<OwnedItem[]> {
  const snap = await get(ref(db, `users/${uid}/inventory`));
  if (!snap.exists()) return [];
  const val = snap.val();
  return Object.values(val);
}

export async function equipItem(uid: string, itemId: string): Promise<void> {
  const item = getStoreItem(itemId);
  if (!item) return;

  const snap = await get(ref(db, `users/${uid}/inventory`));
  if (!snap.exists()) return;
  const inventory = snap.val() as Record<string, OwnedItem>;

  const updates: Record<string, unknown> = {};

  for (const [key, owned] of Object.entries(inventory)) {
    const si = getStoreItem(owned.itemId);
    if (si && si.category === item.category && owned.equipped) {
      updates[`inventory/${key}/equipped`] = false;
    }
  }

  updates[`inventory/${itemId}/equipped`] = true;

  if (item.category === "frame") {
    updates["equippedFrame"] = itemId;
  } else if (item.category === "entry") {
    updates["equippedEntry"] = itemId;
  } else if (item.category === "theme") {
    updates["equippedTheme"] = itemId;
  }

  await update(ref(db, `users/${uid}`), updates);
}

export async function unequipItem(uid: string, itemId: string): Promise<void> {
  const item = getStoreItem(itemId);
  if (!item) return;

  const updates: Record<string, unknown> = {
    [`inventory/${itemId}/equipped`]: false,
  };

  if (item.category === "frame") {
    updates["equippedFrame"] = null;
  } else if (item.category === "entry") {
    updates["equippedEntry"] = null;
  } else if (item.category === "theme") {
    updates["equippedTheme"] = null;
  }

  await update(ref(db, `users/${uid}`), updates);
}
