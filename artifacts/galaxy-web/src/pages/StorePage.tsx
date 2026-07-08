/**
 * StorePage – Premium ChaloTalk-style store
 * Sections: Frames · Entry FX · Themes
 * Features: Live animated preview, Buy modal, Equip toggle
 */
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../lib/toastContext";
import { UserProfile } from "../lib/userService";
import {
  STORE_ITEMS, StoreItem, getStoreItem,
  purchaseItem, equipItem, unequipItem,
  getRarityColor, isAnimatedFrame, getFrameColors, getPngFramePath,
} from "../lib/storeService";
import AvatarFrame from "../components/frames/AvatarFrame";

interface Props {
  user: UserProfile;
  onBack: () => void;
  onUpdate: (u: UserProfile) => void;
}

type Category = "frame" | "entry" | "theme";

const RARITY_LABEL: Record<string, string> = {
  common: "COMMON", rare: "RARE", epic: "EPIC", legendary: "LEGENDARY",
};

const ENTRY_META: Record<string, { icon: string; gradient: string; desc: string }> = {
  entry_lightning: { icon: "⚡", gradient: "linear-gradient(135deg,#FFD700,#FF6B35)", desc: "Electrifying entrance!" },
  entry_stars:     { icon: "🌟", gradient: "linear-gradient(135deg,#6C5CE7,#A29BFE)", desc: "Rain of stars follows you" },
  entry_phoenix:   { icon: "🦅", gradient: "linear-gradient(135deg,#FF6B35,#FF1744)", desc: "Rise from the ashes" },
  entry_galaxy:    { icon: "🌀", gradient: "linear-gradient(135deg,#0D47A1,#6C5CE7,#E040FB)", desc: "Galaxy portal opens" },
};

export default function StorePage({ user, onBack, onUpdate }: Props) {
  const { showToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>("frame");
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoreItem | null>(null);

  const items = STORE_ITEMS.filter(i => i.category === activeCategory);
  const coins = user.coins || 0;
  const inv   = user.inventory || {};

  /* ── purchase ── */
  const handleBuy = async (item: StoreItem) => {
    if (coins < item.price) { showToast("Not enough 💎 Diamonds!", "warning"); return; }
    if (inv[item.id]) { showToast("Already owned!", "info"); return; }
    setLoading(item.id);
    try {
      const ok = await purchaseItem(user.uid, item.id, coins);
      if (ok) {
        onUpdate({
          ...user,
          coins: coins - item.price,
          inventory: { ...inv, [item.id]: { itemId: item.id, purchasedAt: Date.now(), equipped: false } },
        });
        showToast(`${item.name} purchased! ✨`, "success");
        setPreview(null);
      } else {
        showToast("Purchase failed", "error");
      }
    } catch { showToast("Purchase failed", "error"); }
    finally { setLoading(null); }
  };

  /* ── equip / unequip ── */
  const handleEquip = async (itemId: string) => {
    const item = getStoreItem(itemId);
    if (!item) return;
    setLoading(itemId);
    const isEquipped = inv[itemId]?.equipped;
    try {
      if (isEquipped) {
        await unequipItem(user.uid, itemId);
        const updatedInv = { ...inv, [itemId]: { ...inv[itemId], equipped: false } };
        const upd: Partial<UserProfile> = { inventory: updatedInv };
        if (item.category === "frame") upd.equippedFrame = undefined;
        if (item.category === "entry") upd.equippedEntry = undefined;
        if (item.category === "theme") upd.equippedTheme = undefined;
        onUpdate({ ...user, ...upd });
        showToast(`${item.name} unequipped`, "info");
      } else {
        await equipItem(user.uid, itemId);
        const updatedInv = { ...inv };
        for (const [id, o] of Object.entries(updatedInv)) {
          const si = getStoreItem(o.itemId);
          if (si?.category === item.category) updatedInv[id] = { ...o, equipped: false };
        }
        updatedInv[itemId] = { ...updatedInv[itemId], equipped: true };
        const upd: Partial<UserProfile> = { inventory: updatedInv };
        if (item.category === "frame") upd.equippedFrame = itemId;
        if (item.category === "entry") upd.equippedEntry = itemId;
        if (item.category === "theme") upd.equippedTheme = itemId;
        onUpdate({ ...user, ...upd });
        showToast(`${item.name} equipped! ✨`, "success");
      }
    } catch { showToast("Failed", "error"); }
    finally { setLoading(null); }
  };

  return (
    <div style={{
      background: "linear-gradient(160deg, #1A0F2E 0%, #0A0614 100%)",
      height: "100vh", width: "100%", maxWidth: 430, margin: "0 auto",
      display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'Inter', 'Poppins', sans-serif", color: "#fff",
    }}>
      {/* ── HEADER ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "52px 16px 14px",
        background: "linear-gradient(180deg, rgba(26,15,46,0.95) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(108,92,231,0.15)",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 22, color: "#fff", cursor: "pointer" }}>‹</button>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>✨ Galaxy Store</h2>
          <span style={{ fontSize: 10, color: "rgba(162,155,254,0.6)", fontWeight: 500 }}>Premium frames & effects</span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          background: "rgba(255,215,0,0.08)",
          border: "1px solid rgba(255,215,0,0.2)",
          padding: "6px 12px", borderRadius: 20,
        }}>
          <span>💎</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: "#FFD700" }}>{coins.toLocaleString()}</span>
        </div>
      </div>

      {/* ── CATEGORY TABS ── */}
      <div style={{ display: "flex", padding: "0 16px", borderBottom: "1px solid rgba(108,92,231,0.12)" }}>
        {(["frame", "entry", "theme"] as const).map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            flex: 1, padding: "12px 0", border: "none", background: "transparent", cursor: "pointer",
            fontSize: 12, fontWeight: 700,
            color: activeCategory === cat ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: activeCategory === cat ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "color 0.2s",
          }}>
            {cat === "frame" ? "🖼️ Frames" : cat === "entry" ? "⚡ Entry FX" : "🎨 Themes"}
          </button>
        ))}
      </div>

      {/* ── ITEMS GRID ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 12px 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {items.map(item => (
            <StoreCard
              key={item.id}
              item={item}
              owned={!!inv[item.id]}
              equipped={!!inv[item.id]?.equipped}
              userCoins={coins}
              loading={loading === item.id}
              onPreview={() => setPreview(item)}
              onBuy={() => handleBuy(item)}
              onEquip={() => handleEquip(item.id)}
            />
          ))}
        </div>
      </div>

      {/* ── PREVIEW MODAL ── */}
      <AnimatePresence>
        {preview && (
          <PreviewModal
            item={preview}
            owned={!!inv[preview.id]}
            equipped={!!inv[preview.id]?.equipped}
            userCoins={coins}
            loading={loading === preview.id}
            userAvatar={user.avatar}
            onClose={() => setPreview(null)}
            onBuy={() => handleBuy(preview)}
            onEquip={() => handleEquip(preview.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────── STORE CARD ─────────────────────── */
function StoreCard({ item, owned, equipped, userCoins, loading, onPreview, onBuy, onEquip }: {
  item: StoreItem; owned: boolean; equipped: boolean;
  userCoins: number; loading: boolean;
  onPreview: () => void; onBuy: () => void; onEquip: () => void;
}) {
  const rarityColor = getRarityColor(item.rarity);
  const canAfford   = userCoins >= item.price;

  return (
    <div style={{
      borderRadius: 18, overflow: "hidden",
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${rarityColor}28`,
      boxShadow: equipped ? `0 0 16px ${rarityColor}40, inset 0 0 20px ${rarityColor}08` : "none",
      display: "flex", flexDirection: "column",
      transition: "all 0.2s",
    }}>
      {/* Preview thumbnail */}
      <button onClick={onPreview} style={{
        height: 110, border: "none", cursor: "pointer", padding: 0,
        background: item.category === "frame" && isAnimatedFrame(item.id) ? "rgba(15,10,30,0.9)" : item.preview,
        display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden",
      }}>
        <FramePreviewThumb item={item} />
        {/* Rarity badge */}
        <span style={{
          position: "absolute", top: 6, right: 6,
          fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8,
          background: `${rarityColor}20`, color: rarityColor, border: `1px solid ${rarityColor}40`,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>{RARITY_LABEL[item.rarity]}</span>
        {/* Equipped badge */}
        {equipped && (
          <span style={{
            position: "absolute", top: 6, left: 6,
            fontSize: 8, fontWeight: 800, padding: "2px 7px", borderRadius: 8,
            background: "rgba(0,230,118,0.2)", color: "#00e676", border: "1px solid rgba(0,230,118,0.4)",
          }}>EQUIPPED</span>
        )}
        {/* Tap to preview hint */}
        <div style={{
          position: "absolute", bottom: 0, inset: "auto 0 0 0",
          background: "linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
          fontSize: 9, color: "rgba(255,255,255,0.5)", padding: "4px 0 3px",
          textAlign: "center", fontWeight: 600,
        }}>TAP TO PREVIEW</div>
      </button>

      {/* Info + actions */}
      <div style={{ padding: "10px 10px 10px" }}>
        <p style={{ fontSize: 12, fontWeight: 800, marginBottom: 6, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.name}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          {owned ? (
            <button onClick={onEquip} disabled={loading} style={{
              flex: 1, padding: "7px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 800,
              background: equipped ? "rgba(255,255,255,0.07)" : "linear-gradient(135deg,#6C5CE7,#8B7CF6)",
              color: equipped ? "rgba(255,255,255,0.5)" : "#fff",
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? "…" : equipped ? "Unequip" : "Equip"}
            </button>
          ) : (
            <>
              <span style={{ fontSize: 11, fontWeight: 800, color: canAfford ? "#FFD700" : "rgba(255,255,255,0.3)" }}>💎 {item.price}</span>
              <button onClick={onBuy} disabled={loading || !canAfford} style={{
                padding: "7px 12px", borderRadius: 10, border: "none", cursor: canAfford ? "pointer" : "not-allowed",
                background: canAfford ? "linear-gradient(135deg,#6C5CE7,#8B7CF6)" : "rgba(255,255,255,0.06)",
                color: "#fff", fontSize: 11, fontWeight: 800, opacity: canAfford ? 1 : 0.45,
              }}>
                {loading ? "…" : "Buy"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Thumbnail inside store card ── */
function FramePreviewThumb({ item }: { item: StoreItem }) {
  if (item.category === "entry") {
    const meta = ENTRY_META[item.id];
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 38, filter: "drop-shadow(0 0 10px rgba(255,255,255,0.5))" }}>{meta?.icon || item.icon}</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 4, fontWeight: 600 }}>{meta?.desc || "Entry effect"}</div>
      </div>
    );
  }
  if (item.category === "theme") {
    return <div style={{ fontSize: 36 }}>{item.icon}</div>;
  }
  /* Frame preview */
  if (isAnimatedFrame(item.id)) {
    const colors = getFrameColors(item.id);
    if (colors) {
      return (
        <div style={{ position: "relative" }}>
          <div className={`af-wrapper af-${item.id.replace("frame_", "")}`} style={{ width: 64, height: 64 }}>
            <div className="af-ring" style={{ background: `conic-gradient(${colors.primary}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})` }} />
            <div className="af-glow" style={{ boxShadow: `0 0 10px ${colors.primary}99` }} />
            <div className="af-img af-img-placeholder" style={{ fontSize: 22 }}>👤</div>
          </div>
        </div>
      );
    }
  }
  /* SVG / PNG frame */
  const pngPath = getPngFramePath(item.id);
  if (pngPath) {
    return (
      <div style={{ position: "relative", width: 60, height: 60 }}>
        <div style={{ position: "absolute", inset: 8, borderRadius: "50%", background: "rgba(108,92,231,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>👤</div>
        <img src={pngPath} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      </div>
    );
  }
  return <span style={{ fontSize: 36 }}>{item.icon}</span>;
}

/* ─────────────────────── PREVIEW MODAL ─────────────────────── */
function PreviewModal({ item, owned, equipped, userCoins, loading, userAvatar, onClose, onBuy, onEquip }: {
  item: StoreItem; owned: boolean; equipped: boolean; userCoins: number; loading: boolean;
  userAvatar: string;
  onClose: () => void; onBuy: () => void; onEquip: () => void;
}) {
  const rarityColor = getRarityColor(item.rarity);
  const canAfford   = userCoins >= item.price;
  const entryMeta   = ENTRY_META[item.id];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 2000, backdropFilter: "blur(4px)" }}
      />

      {/* Bottom sheet */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 2001,
          maxWidth: 430, margin: "0 auto",
          background: "linear-gradient(180deg, #1A0F2E 0%, #0D0820 100%)",
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderTop: `1px solid ${rarityColor}40`,
          padding: "20px 20px 40px",
          boxShadow: `0 -8px 40px ${rarityColor}30`,
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 20px" }} />

        {/* Big animated preview */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: 180, marginBottom: 20,
          background: item.category === "frame" ? "rgba(10,6,22,0.8)" : (entryMeta?.gradient || item.preview),
          borderRadius: 20, border: `1px solid ${rarityColor}30`,
          overflow: "hidden", position: "relative",
        }}>
          {/* Ambient sparkles */}
          {[...Array(6)].map((_, i) => (
            <div key={i} style={{
              position: "absolute", fontSize: 14,
              left: `${10 + i * 15}%`, top: `${10 + (i % 3) * 28}%`,
              opacity: 0.4, animation: `fsSparkle ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite alternate`,
              pointerEvents: "none",
            }}>✨</div>
          ))}

          {item.category === "frame" ? (
            /* Frame preview with user avatar */
            <AvatarFrame
              avatar={userAvatar}
              frameId={item.id}
              size={90}
              glow
            />
          ) : item.category === "entry" ? (
            /* Entry effect preview */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 56, filter: `drop-shadow(0 0 20px ${rarityColor})`, animation: "giftBounce 1s ease-in-out infinite alternate" }}>
                {entryMeta?.icon || item.icon}
              </div>
              <div style={{ marginTop: 10, fontSize: 13, color: "#fff", fontWeight: 700, textShadow: `0 0 12px ${rarityColor}` }}>
                {entryMeta?.desc || item.name}
              </div>
            </div>
          ) : (
            /* Theme preview */
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48 }}>{item.icon}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Room Theme</div>
            </div>
          )}
        </div>

        {/* Item info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", flex: 1 }}>{item.name}</h3>
            <span style={{
              fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 10,
              background: `${rarityColor}18`, color: rarityColor, border: `1px solid ${rarityColor}40`,
              textTransform: "uppercase",
            }}>{RARITY_LABEL[item.rarity]}</span>
          </div>
          <p style={{ fontSize: 13, color: "rgba(162,155,254,0.6)", lineHeight: 1.5 }}>
            {item.category === "frame"
              ? `Premium ${item.name} frame for your avatar. Stand out in every room.`
              : item.category === "entry"
              ? `${entryMeta?.desc || "Special entry effect"} when you join a voice room.`
              : `Beautiful ${item.name} room theme for your personal space.`}
          </p>
        </div>

        {/* Action button */}
        {owned ? (
          <button onClick={onEquip} disabled={loading} style={{
            width: "100%", padding: "16px 0", borderRadius: 20, border: "none", cursor: "pointer",
            background: equipped
              ? "rgba(255,255,255,0.08)"
              : `linear-gradient(135deg, ${rarityColor}, #6C5CE7)`,
            color: equipped ? "rgba(255,255,255,0.5)" : "#fff",
            fontSize: 16, fontWeight: 800, letterSpacing: 0.5,
            boxShadow: equipped ? "none" : `0 4px 20px ${rarityColor}50`,
          }}>
            {loading ? "Please wait…" : equipped ? "✓ Unequip" : "⚡ Equip Now"}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "16px 0", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 700, cursor: "pointer",
            }}>Cancel</button>
            <button onClick={onBuy} disabled={loading || !canAfford} style={{
              flex: 2, padding: "16px 0", borderRadius: 20, border: "none", cursor: canAfford ? "pointer" : "not-allowed",
              background: canAfford ? `linear-gradient(135deg, ${rarityColor}, #6C5CE7)` : "rgba(255,255,255,0.06)",
              color: "#fff", fontSize: 15, fontWeight: 800,
              opacity: canAfford ? 1 : 0.5,
              boxShadow: canAfford ? `0 4px 20px ${rarityColor}50` : "none",
            }}>
              {loading ? "Buying…" : `💎 ${item.price.toLocaleString()} – Buy Now`}
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
