// src/pages/StorePage.tsx – Premium Chalotalk-style Store (full page)
import React, { useState } from "react";
import { useToast } from "../lib/toastContext";
import { UserProfile } from "../lib/userService";
import { STORE_ITEMS, StoreItem, getStoreItem, purchaseItem, equipItem, getRarityColor, isAnimatedFrame, getPngFramePath } from "../lib/storeService";

interface Props {
  user: UserProfile;
  onBack: () => void;
  onUpdate: (updatedUser: UserProfile) => void;
}

type Category = "frame" | "entry" | "theme";

const StorePage: React.FC<Props> = ({ user, onBack, onUpdate }) => {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>("frame");
  const [loading, setLoading] = useState<string | null>(null);

  const items = STORE_ITEMS.filter((item) => item.category === activeCategory);
  const userCoins = user.coins || 0;
  const userInventory = user.inventory || {};

  const handlePurchase = async (item: StoreItem) => {
    if (userCoins < item.price) {
      showToast("Not enough diamonds!", "warning");
      return;
    }
    if (userInventory[item.id]) {
      showToast("Already owned!", "info");
      return;
    }
    setLoading(item.id);
    try {
      const success = await purchaseItem(user.uid, item.id, userCoins);
      if (success) {
        const updatedUser = {
          ...user,
          coins: userCoins - item.price,
          inventory: {
            ...userInventory,
            [item.id]: { itemId: item.id, purchasedAt: Date.now(), equipped: false },
          },
        };
        onUpdate(updatedUser);
        showToast(`${item.name} purchased!`, "success");
      } else {
        showToast("Purchase failed", "error");
      }
    } catch {
      showToast("Purchase failed", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleEquip = async (itemId: string) => {
    setLoading(itemId);
    try {
      const item = getStoreItem(itemId);
      if (!item) return;
      await equipItem(user.uid, itemId);
      const updatedInventory = { ...userInventory };
      for (const [id, inv] of Object.entries(updatedInventory)) {
        const invItem = getStoreItem(inv.itemId);
        if (invItem && invItem.category === item.category && inv.equipped) {
          updatedInventory[id] = { ...inv, equipped: false };
        }
      }
      updatedInventory[itemId] = { ...updatedInventory[itemId], equipped: true };
      const updates: Partial<UserProfile> = { inventory: updatedInventory };
      if (item.category === "frame") updates.equippedFrame = itemId;
      if (item.category === "entry") updates.equippedEntry = itemId;
      if (item.category === "theme") updates.equippedTheme = itemId;
      onUpdate({ ...user, ...updates });
      showToast(`${item.name} equipped!`, "success");
    } catch {
      showToast("Equip failed", "error");
    } finally {
      setLoading(null);
    }
  };

  const getRarityLabel = (rarity: string) => {
    switch (rarity) {
      case "common": return "COMMON";
      case "rare": return "RARE";
      case "epic": return "EPIC";
      case "legendary": return "LEGENDARY";
      default: return rarity.toUpperCase();
    }
  };

  return (
    <div style={{
      background: "#0F0F1A",
      height: "100vh",
      width: "100%",
      maxWidth: 430,
      margin: "0 auto",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
      color: "#fff"
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "52px 16px 12px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "#0F0F1A"
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: 22, color: "#fff", cursor: "pointer"
        }}>‹</button>
        <h2 style={{ fontSize: 18, fontWeight: 900 }}>Store</h2>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,215,0,0.1)",
          padding: "6px 12px",
          borderRadius: 20,
          border: "1px solid rgba(255,215,0,0.2)"
        }}>
          <span style={{ fontSize: 14 }}>💎</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>{userCoins.toLocaleString()}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "0 16px"
      }}>
        {(["frame", "entry", "theme"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            style={{
              flex: 1,
              padding: "14px 0",
              border: "none",
              cursor: "pointer",
              background: "transparent",
              borderBottom: activeCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
              color: activeCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.45)",
              fontSize: 13,
              fontWeight: 700
            }}
          >
            {cat === "frame" ? "🖼️ Frames" : cat === "entry" ? "⚡ Entry FX" : "🎨 Themes"}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {items.map((item) => {
            const owned = !!userInventory[item.id];
            const equipped = userInventory[item.id]?.equipped;
            const rarityColor = getRarityColor(item.rarity);

            return (
              <div key={item.id} style={{
                borderRadius: 16,
                overflow: "hidden",
                border: `1px solid ${rarityColor}30`,
                background: "rgba(255,255,255,0.03)",
                display: "flex",
                flexDirection: "column"
              }}>
                {/* Preview */}
                <div style={{
                  height: 100,
                  background: isAnimatedFrame(item.id) ? "rgba(15,10,30,0.9)" : item.preview,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  position: "relative"
                }}>
                  {item.category === "frame" && isAnimatedFrame(item.id) && <span style={{ fontSize: 32 }}>🖼️</span>}
                  {item.category === "frame" && !isAnimatedFrame(item.id) && (() => {
                    const pngPath = getPngFramePath(item.id);
                    return pngPath ? (
                      <div style={{ position: "relative", width: 60, height: 60 }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(108,92,231,0.3)", position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
                        <img src={pngPath} alt="" style={{ position: "absolute", inset: -4, width: "calc(100% + 8px)", height: "calc(100% + 8px)", objectFit: "contain" }} />
                      </div>
                    ) : item.icon;
                  })()}
                  {item.category !== "frame" && item.icon}
                  <span style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 8,
                    background: `${rarityColor}20`,
                    color: rarityColor,
                    border: `1px solid ${rarityColor}40`,
                    textTransform: "uppercase"
                  }}>
                    {getRarityLabel(item.rarity)}
                  </span>
                </div>
                <div style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, color: "#fff" }}>{item.name}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {owned ? (
                      equipped ? (
                        <span style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>✅ Equipped</span>
                      ) : (
                        <button onClick={() => handleEquip(item.id)} disabled={loading === item.id} style={{
                          padding: "6px 14px",
                          borderRadius: 10,
                          border: "none",
                          cursor: "pointer",
                          background: "linear-gradient(135deg, #6C5CE7, #8B7CF6)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          opacity: loading === item.id ? 0.6 : 1
                        }}>{loading === item.id ? "..." : "Equip"}</button>
                      )
                    ) : (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#FFD700" }}>💎 {item.price}</span>
                        <button onClick={() => handlePurchase(item)} disabled={loading === item.id || userCoins < item.price} style={{
                          padding: "6px 14px",
                          borderRadius: 10,
                          border: "none",
                          cursor: userCoins < item.price ? "not-allowed" : "pointer",
                          background: userCoins < item.price ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #6C5CE7, #8B7CF6)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          opacity: userCoins < item.price ? 0.5 : 1
                        }}>{loading === item.id ? "..." : "Buy"}</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StorePage;