import React, { useState, useRef, useEffect } from "react";
import { Room, UserProfile } from "./types";
import {
  Mic, MicOff, Smile, MessageCircle,
  Gift, MoreHorizontal, Send, ChevronDown
} from "lucide-react";

const EMOJIS = ["❤️","🔥","✨","😂","🎵","👏","🌟","💯","🚀","😍","🎉","💎"];

// 🛡️ SECURITY LOCK: Secure Cloudinary URLs Integrated (No local asset extraction possible)
const CLOUD_GIFTS = [
  { id: "gift_ring",    name: "Galaxy Ring",    cost: 500,  url: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782162038/Screenshot_20260622_211955_ChatGPT_b6268c.jpg" },
  { id: "gift_teddy",   name: "Cosmic Teddy",   cost: 100,  url: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782162037/Screenshot_20260622_210142_ChatGPT_b87vkg.jpg" },
  { id: "gift_crown",   name: "Neon Crown",     cost: 1000, url: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782162038/Screenshot_20260622_210121_ChatGPT_altiry.jpg" },
  { id: "gift_perfume", name: "Galaxy Perfume",  cost: 300,  url: "https://res.cloudinary.com/dz1bhfpkc/image/upload/v1782162037/Screenshot_20260622_210111_ChatGPT_vreudo.jpg" },
];

const TABS = ["Backpack", "Gift", "Intimacy", "VIP", "PK"];
const BANNER_BUBBLES = [59, 79, 99, 199, 299];
const GIFT_COMBOS = [1, 10, 50, 100];

const REACTIONS = [
  { emoji: "👏", label: "Clap" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "LOL" },
  { emoji: "💯", label: "100" },
  { emoji: "🎉", label: "Party" },
];

interface BottomBarProps {
  room: Room;
  user: UserProfile;
  inputText: string;
  setInputText: (v: string) => void;
  isMuted: boolean;
  isSpeakerOff: boolean;
  isOnSeat: boolean;
  onSendChat: () => void;
  onSendEmoji: (emoji: string) => void;
  onHandleGift: (gift: { emoji: string; name: string; cost: number; url?: string }, combo: number) => void;
  onHandleReaction: (emoji: string) => void;
  onMicToggle: () => void;
  onSpeakerToggle: () => void;
  onRaiseHand: () => void;
  onShare: () => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
  onOpenMenu?: () => void;
  onOpenInbox?: () => void;
  inboxBadge?: number;
  onFloatEmoji?: (emoji: string) => void; 
  className?: string;            
}

export default function BottomBar({
  user,
  isMuted, isOnSeat,
  inputText, setInputText, onSendChat,
  onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle,
  className = "",
  showToast
}: BottomBarProps) {
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [showGift,      setShowGift]      = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [inputOpen,     setInputOpen]     = useState(false);
  
  const [activeTab,     setActiveTab]     = useState("Gift");
  const [selectedGift,  setSelectedGift]  = useState<string | null>(null);
  const [giftCombo,     setGiftCombo]     = useState(1);
  const [comboOpen,     setComboOpen]     = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0); 
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(heightDiff > 100 ? heightDiff : 0);
      }
    };
    window.visualViewport?.addEventListener("resize", handleViewportChange);
    return () => window.visualViewport?.removeEventListener("resize", handleViewportChange);
  }, []);

  const closeAllPopups = () => {
    setShowEmoji(false);
    setShowGift(false);
    setShowReactions(false);
  };

  useEffect(() => {
    if (inputOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [inputOpen]);

  const micActive = isOnSeat && !isMuted;

  const handleSendGiftAction = () => {
    if (!selectedGift) {
      showToast("Please select a gift first!", "error");
      return;
    }
    const targetGift = CLOUD_GIFTS.find(g => g.id === selectedGift);
    if (!targetGift) return;

    const totalCost = targetGift.cost * giftCombo;
    if (user.coins >= totalCost) {
      // Mapping structure back to match existing backend signatures comfortably
      onHandleGift({ emoji: "🎁", name: targetGift.name, cost: targetGift.cost, url: targetGift.url }, giftCombo);
      closeAllPopups();
    } else {
      showToast("Insufficient coins! Please recharge.", "error");
    }
  };

  const RoundBtn = ({
    icon, onClick, active = false, size = 38, color = "purple"
  }: {
    icon: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    size?: number;
    color?: "purple" | "pink" | "amber" | "muted" | "cyan";
  }) => {
    const bg: Record<string, string> = {
      purple: "radial-gradient(circle at 30% 25%, #c4b5fd, #7c3aed 60%, #4c1d95)",
      pink:   "radial-gradient(circle at 30% 25%, #ffc1d9, #ec4899 55%, #9d174d)",
      muted:  "rgba(255,255,255,0.08)",
    };
    return (
      <button onClick={onClick} style={{
        width: size, height: size, borderRadius: size / 2,
        background: bg[color] || bg.muted,
        border: `1.5px solid ${active ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
        color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer", padding: 0,
        transition: "transform 0.1s",
      }}>
        {icon}
      </button>
    );
  };

  return (
    <>
      {/* BACKGROUND DISMISSER OVERLAY WHEN PANEL POPUPS ARE OPEN */}
      {(showGift || showEmoji || showReactions) && (
        <div 
          onClick={closeAllPopups} 
          style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.2)" }}
        />
      )}

      <div className={className} style={{
        position: "fixed", 
        bottom: `${keyboardHeight}px`,
        left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        zIndex: 1000,
        background: keyboardHeight > 0 ? "rgba(20, 12, 38, 0.98)" : "linear-gradient(180deg,transparent 0%,rgba(10,6,25,0.92) 45%,rgba(8,4,18,0.98) 100%)",
        backdropFilter: "blur(14px)",
        padding: keyboardHeight > 0 ? "10px 12px" : "10px 12px 20px",
        transition: "bottom 0.1s ease-out",
        overscrollBehavior: "none",
        touchAction: "none"
      }}>
        
        {/* --- GHOST INPUTS --- */}
        <div style={{ opacity: 0, position: 'absolute', height: 0, width: 0, overflow: 'hidden' }}>
          <input type="text" name="prevent_autofill_user" tabIndex={-1} />
          <input type="password" name="prevent_autofill_pass" tabIndex={-1} />
        </div>

        {/* CHAT INPUT AREA */}
        {(inputOpen || keyboardHeight > 0) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 10,
            background: "rgba(255,255,255,0.12)",
            borderRadius: 24,
            border: "1px solid rgba(124,58,237,0.3)",
            padding: "5px 5px 5px 14px",
          }}>
            <input
              ref={inputRef}
              placeholder="Say something…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              type="search" 
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              name={`chat-${Math.random()}`}
              onKeyDown={e => {
                if (e.key === "Enter") { onSendChat(); setInputOpen(false); }
              }}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 14,
                WebkitAppearance: 'none',
              }}
            />
            <button
              onClick={() => { onSendChat(); setInputOpen(false); }}
              style={{
                width: 36, height: 36, borderRadius: 18, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Send size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* BOTTOM ROW MENU BAR */}
        {keyboardHeight === 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
              <button
                onClick={() => { closeAllPopups(); setInputOpen(s => !s); }}
                style={{
                  flex: 1, height: 42, borderRadius: 21,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex", alignItems: "center",
                  padding: "0 14px", gap: 8,
                }}
              >
                <MessageCircle size={16} color="rgba(255,255,255,0.4)" />
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Say something…</span>
              </button>

              <RoundBtn
                icon={<Smile size={20} />}
                onClick={() => { const n = !showEmoji; closeAllPopups(); if (n) setShowEmoji(true); }}
                active={showEmoji}
                color={showEmoji ? "purple" : "muted"}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RoundBtn
                icon={<Gift size={20} />}
                onClick={() => { const n = !showGift; closeAllPopups(); if (n) setShowGift(true); }}
                active={showGift}
                color="pink"
              />

              <button
                onClick={onMicToggle}
                style={{
                  width: 52, height: 52, borderRadius: 26,
                  background: micActive
                    ? "radial-gradient(circle at 30% 25%, #86efac, #22c55e 55%, #14532d)"
                    : "radial-gradient(circle at 30% 25%, #fca5a5, #ef4444 55%, #7f1d1d)",
                  border: "2px solid rgba(255,255,255,0.2)",
                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: micActive ? "0 0 15px rgba(34,197,94,0.3)" : "none"
                }}
              >
                {micActive ? <Mic size={22} strokeWidth={2.5} /> : <MicOff size={22} strokeWidth={2.5} />}
              </button>

              <RoundBtn
                icon={<MoreHorizontal size={20} />}
                onClick={() => { const n = !showReactions; closeAllPopups(); if (n) setShowReactions(true); }}
                active={showReactions}
                color="muted"
              />
            </div>
          </div>
        )}
      </div>

      {/* POPUPS VIEWPORTS */}
      {keyboardHeight === 0 && (
        <>
          {/* EMOJI BOX WINDOW */}
          {showEmoji && (
            <div style={{
              position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
              width: 240, zIndex: 1100,
              background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(124,58,237,0.3)", borderRadius: 18, padding: 12,
            }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { onSendEmoji(e); closeAllPopups(); }}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26 }}>{e}</button>
                ))}
              </div>
            </div>
          )}

          {/* 👑 PREMIUM CHALOTALK STYLE SLIDE-UP GIFT OVERLAY PANEL (Matching 99235.jpg) */}
          {showGift && (
            <div style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100,
              maxWidth: 480, margin: "0 auto",
              background: "rgba(18, 10, 36, 0.98)", backdropFilter: "blur(20px)",
              borderTopLeftRadius: 24, borderTopRightRadius: 24,
              borderTop: "1px solid rgba(236,72,153,0.25)",
              padding: "16px 14px 24px",
              boxShadow: "0 -10px 30px rgba(0,0,0,0.5)"
            }}>
              
              {/* TOP BALANCES & NAVIGATION TABS MATRIX */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                  <span>💎 {user.coins}</span>
                  <ChevronDown size={14} />
                </div>
                
                {/* HORIZONTAL APP SCROLL TABS */}
                <div style={{ display: "flex", gap: 14, overflowX: "auto", whiteSpace: "nowrap", paddingBottom: 4 }}>
                  {TABS.map(t => (
                    <button 
                      key={t} 
                      onClick={() => setActiveTab(t)}
                      style={{
                        background: "none", border: "none", fontSize: 13, fontWeight: 600,
                        color: activeTab === t ? "#fff" : "rgba(255,255,255,0.4)",
                        position: "relative", padding: "2px 4px", transition: "color 0.2s"
                      }}
                    >
                      {t}
                      {activeTab === t && (
                        <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #ec4899, #8b5cf6)", borderRadius: 1 }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* THIN HORIZONTAL PREMIUM PROMO CAROUSEL ROW */}
              <div style={{
                background: "linear-gradient(90deg, rgba(236,72,153,0.15), rgba(124,58,237,0.15))",
                borderRadius: 12, padding: "6px 10px", display: "flex", alignItems: "center",
                justifyContent: "space-between", marginBottom: 14, border: "1px solid rgba(255,255,255,0.05)"
              }}>
                <span style={{ fontSize: 11, color: "#f472b6", fontWeight: 700 }}>🎁 Random gifts</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {BANNER_BUBBLES.map(num => (
                    <div key={num} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 10, padding: "2px 6px", color: "#c4b5fd" }}>{num}</div>
                  ))}
                </div>
              </div>

              {/* MAIN DYNAMIC 4x2 SEAT MATRIX GIFT GRID STREAM LAYER */}
              {activeTab === "Gift" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 16 }}>
                  {CLOUD_GIFTS.map(g => {
                    const isSelected = selectedGift === g.id;
                    return (
                      <div 
                        key={g.id}
                        onClick={() => setSelectedGift(g.id)}
                        style={{
                          background: isSelected ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                          border: isSelected ? "1.5px solid #a78bfa" : "1px solid rgba(255,255,255,0.06)",
                          borderRadius: 16, padding: "8px 4px", display: "flex", flexDirection: "column",
                          alignItems: "center", justifyContent: "center", cursor: "pointer",
                          boxShadow: isSelected ? "0 0 12px rgba(124,58,237,0.25)" : "none",
                          transition: "all 0.1s ease"
                        }}
                      >
                        {/* 🛡️ Secure hosted web container inside view frame */}
                        <div style={{ width: 50, height: 50, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 10 }}>
                          <img src={g.url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center", marginBottom: 2 }}>{g.name}</span>
                        <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {g.cost}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>
                  Empty Content Stream
                </div>
              )}

              {/* BOTTOM PANEL CONTROLS SYSTEM FOOTER ROW */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
                
                {/* TARGET USER SWITCH DROPDOWN CONTAINER */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 20, cursor: "pointer" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ec4899", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>H</div>
                  <span style={{ fontSize: 11, color: "#fff" }}>Host</span>
                  <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
                </div>

                {/* QUANTITY AND GRADIENT ACTION TRIGGER BUTTON BLOCK */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
                  <button 
                    onClick={() => setComboOpen(!comboOpen)}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      color: "#fff", borderRadius: 20, padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4
                    }}
                  >
                    <span>x{giftCombo}</span>
                    <ChevronDown size={12} />
                  </button>

                  {/* COMBO BOX FLOATER */}
                  {comboOpen && (
                    <div style={{ position: "absolute", bottom: 38, left: 0, background: "#1e1b4b", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1200 }}>
                      {GIFT_COMBOS.map(combo => (
                        <button key={combo} onClick={() => { setGiftCombo(combo); setComboOpen(false); }} style={{ padding: "6px 16px", background: "none", border: "none", color: "#fff", fontSize: 11, textAlign: "left", cursor: "pointer" }}>x{combo}</button>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleSendGiftAction}
                    style={{
                      background: "linear-gradient(90deg, #db2777, #7c3aed)",
                      color: "#fff", fontWeight: 700, fontSize: 13, border: "none",
                      padding: "6px 20px", borderRadius: 20, cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(124,58,237,0.3)"
                    }}
                  >
                    Send
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* REACTIONS DOCK BAR WINDOW */}
          {showReactions && (
            <div style={{
              position: "fixed", bottom: 90, right: 10, zIndex: 1100,
              background: "rgba(15,8,35,0.92)", borderRadius: 30, padding: "10px 6px",
              display: "flex", flexDirection: "column", gap: 8, border: "1px solid rgba(255,255,255,0.1)"
            }}>
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => { onHandleReaction(r.emoji); closeAllPopups(); }}
                  style={{ background: "none", border: "none", fontSize: 22, padding: 5 }}>{r.emoji}</button>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
