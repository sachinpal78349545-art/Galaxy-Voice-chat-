import React, { useState, useRef, useEffect } from "react";
import { Room, UserProfile } from "./types";
import {
  Mic, MicOff, Smile, MessageCircle,
  Gift, MoreHorizontal, Send
} from "lucide-react";

const EMOJIS = ["❤️","🔥","✨","😂","🎵","👏","🌟","💯","🚀","😍","🎉","💎"];
const GIFTS = [
  { emoji: "🎁", name: "Gift Box",    cost: 10  },
  { emoji: "💎", name: "Diamond",     cost: 50  },
  { emoji: "👑", name: "Crown",       cost: 100 },
  { emoji: "🌹", name: "Rose",        cost: 20  },
  { emoji: "🎊", name: "Confetti",    cost: 30  },
  { emoji: "🍀", name: "Clover",      cost: 15  },
  { emoji: "🦋", name: "Butterfly",   cost: 25  },
  { emoji: "⭐", name: "Star",        cost: 40  },
  { emoji: "🎶", name: "Music",       cost: 35  },
  { emoji: "💰", name: "Money Bag",   cost: 200 },
  { emoji: "🏆", name: "Trophy",      cost: 500 },
  { emoji: "🔮", name: "Crystal Ball",cost: 75  },
];
const GIFT_COMBOS = [1, 10, 50, 100];
const REACTIONS = [
  { emoji: "👏", label: "Clap"  },
  { emoji: "🔥", label: "Fire"  },
  { emoji: "❤️", label: "Love"  },
  { emoji: "😂", label: "LOL"   },
  { emoji: "💯", label: "100"   },
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
  onHandleGift: (gift: { emoji: string; name: string; cost: number }, combo: number) => void;
  onHandleReaction: (emoji: string) => void;
  onMicToggle: () => void;
  onSpeakerToggle: () => void;
  onRaiseHand: () => void;
  onShare: () => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
  onOpenMenu?: () => void;
  onFloatEmoji?: (emoji: string) => void; 
  className?: string;            
}

export default function BottomBar({
  user,
  isMuted, isOnSeat,
  inputText, setInputText, onSendChat,
  onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle, onOpenMenu,
  className = "",
}: BottomBarProps) {
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [showGift,      setShowGift]      = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [inputOpen,     setInputOpen]     = useState(false);
  const [giftCombo,     setGiftCombo]     = useState(1);
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
        
        {/* --- GHOST INPUTS (Autofill block karne ke liye) --- */}
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
              
              /* BROWSER ICONS BLOCK SETTINGS */
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

        {/* BOTTOM ROW (Clean & Simple) */}
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

      {/* POPUPS (Emoji, Gift, Reactions) */}
      {keyboardHeight === 0 && (
        <>
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

          {showGift && (
            <div style={{
              position: "fixed", bottom: 90, left: 10, right: 10, zIndex: 1100,
              background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
              border: "1px solid rgba(236,72,153,0.3)", borderRadius: 18, padding: 14,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>💎 {user.coins} coins</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {GIFT_COMBOS.map(c => (
                    <button key={c} onClick={() => setGiftCombo(c)} style={{
                      padding: "3px 9px", borderRadius: 8, fontSize: 10,
                      background: giftCombo === c ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)",
                      color: giftCombo === c ? "#c4b5fd" : "rgba(255,255,255,0.4)",
                    }}>x{c}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {GIFTS.map(g => (
                  <button key={g.emoji} onClick={() => { if (user.coins >= g.cost * giftCombo) { onHandleGift(g, giftCombo); closeAllPopups(); } }}
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "8px", minWidth: 55 }}>
                    <span style={{ fontSize: 22 }}>{g.emoji}</span>
                    <span style={{ fontSize: 9, color: "#FFD700", fontWeight: 800, display: "block" }}>{g.cost * giftCombo}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
