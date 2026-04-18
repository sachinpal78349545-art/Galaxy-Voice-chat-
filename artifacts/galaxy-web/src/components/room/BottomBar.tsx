import React, { useState, useRef, useEffect } from "react";
import { Room, UserProfile } from "./types";
import {
  Mic, MicOff, Volume2, VolumeX, Smile, MessageCircle,
  Gift, MoreHorizontal, Sparkles, Send,
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
  onOpenGame?: () => void;
  onOpenMenu?: () => void;
}

export default function BottomBar({
  user,
  isMuted, isSpeakerOff: _isSpeakerOff, isOnSeat,
  inputText, setInputText, onSendChat,
  onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle, onSpeakerToggle: _onSpeakerToggle,
  onRaiseHand, showToast, onOpenMenu,
  onOpenGame: _onOpenGame, onShare: _onShare,
}: BottomBarProps) {
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [showGift,      setShowGift]      = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [inputOpen,     setInputOpen]     = useState(false);
  const [giftCombo,     setGiftCombo]     = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const closeAllPopups = () => {
    setShowEmoji(false);
    setShowGift(false);
    setShowReactions(false);
  };

  useEffect(() => {
    if (inputOpen) setTimeout(() => inputRef.current?.focus(), 80);
  }, [inputOpen]);

  // Mic button state
  const micActive   = isOnSeat && !isMuted;
  const micVariant  = micActive ? "on" : "off";

  /* ── tiny round icon button helper ── */
  const RoundBtn = ({
    icon, onClick, active = false, size = 38, color = "purple", label,
  }: {
    icon: React.ReactNode;
    onClick?: () => void;
    active?: boolean;
    size?: number;
    color?: "purple" | "pink" | "amber" | "muted" | "cyan";
    label?: string;
  }) => {
    const bg: Record<string, string> = {
      purple: "radial-gradient(circle at 30% 25%, #c4b5fd, #7c3aed 60%, #4c1d95)",
      pink:   "radial-gradient(circle at 30% 25%, #ffc1d9, #ec4899 55%, #9d174d)",
      amber:  "radial-gradient(circle at 30% 25%, #fde68a, #f59e0b 55%, #92400e)",
      cyan:   "radial-gradient(circle at 30% 25%, #a5f3fc, #06b6d4 55%, #155e75)",
      muted:  "rgba(20,10,40,0.65)",
    };
    const glow: Record<string, string> = {
      purple: "rgba(124,58,237,0.55)",
      pink:   "rgba(236,72,153,0.5)",
      amber:  "rgba(245,158,11,0.5)",
      cyan:   "rgba(6,182,212,0.5)",
      muted:  "rgba(124,58,237,0.2)",
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
        <button onClick={onClick} style={{
          width: size, height: size, borderRadius: size / 2,
          background: bg[color],
          border: `1.5px solid ${active ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.18)"}`,
          boxShadow: `0 0 ${active ? 18 : 10}px ${glow[color]}, inset 0 1px 2px rgba(255,255,255,0.3)`,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", padding: 0,
          transition: "transform 0.1s, box-shadow 0.1s",
        }}>
          {icon}
        </button>
        {label && (
          <span style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", fontWeight: 600, letterSpacing: 0.3 }}>
            {label}
          </span>
        )}
      </div>
    );
  };

  /* ── right side graphic widget cards ── */
  const widgetBase: React.CSSProperties = {
    width: 52, borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", overflow: "hidden", position: "relative",
    boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
    padding: "8px 0 6px",
    fontFamily: "inherit",
  };

  return (
    <>
      {/* ══════════ RIGHT SIDE BANNER WIDGETS ══════════ */}
      <div style={{
        position: "fixed", right: 10, bottom: 134, zIndex: 80,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        width: 52,
      }}>
        {/* EVENT */}
        <button
          onClick={() => showToast("Events coming soon!", "info")}
          style={{ ...widgetBase, background: "linear-gradient(160deg,#ff6b9d 0%,#9b27af 60%,#4b1fa8 100%)" }}
        >
          <div style={{ position:"absolute",inset:0, background:"radial-gradient(circle at 70% 20%,rgba(255,255,255,0.2),transparent 55%)" }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>🎪</span>
          <span style={{ marginTop: 4, fontSize: 8, fontWeight: 800, color: "#fff", letterSpacing: 0.3, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>EVENT</span>
        </button>

        {/* SEAT */}
        <button
          onClick={onRaiseHand}
          style={{ ...widgetBase, background: "linear-gradient(160deg,#6C5CE7 0%,#4b3bbf 100%)" }}
        >
          <div style={{ position:"absolute",inset:0, background:"radial-gradient(circle at 70% 20%,rgba(255,255,255,0.18),transparent 55%)" }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>🛋️</span>
          <span style={{ marginTop: 4, fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: 0.3 }}>
            {isOnSeat ? "ON SEAT" : "GET SEAT"}
          </span>
        </button>

        {/* RECHARGE */}
        <button
          onClick={() => { closeAllPopups(); setShowGift(s => !s); }}
          style={{ ...widgetBase, background: "linear-gradient(160deg,#ffd54f 0%,#ff9800 55%,#e65100 100%)" }}
        >
          <div style={{ position:"absolute",inset:0, background:"radial-gradient(circle at 70% 20%,rgba(255,255,255,0.25),transparent 55%)" }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>💰</span>
          <span style={{ marginTop: 4, fontSize: 7, fontWeight: 800, color: "#fff", letterSpacing: 0.2, textAlign: "center", lineHeight: 1.2, padding: "0 2px" }}>RECHARGE</span>
        </button>

        {/* REACT */}
        <button
          onClick={() => { closeAllPopups(); setShowReactions(s => !s); }}
          style={{ ...widgetBase, background: "linear-gradient(160deg,#00b4d8 0%,#0077b6 100%)" }}
        >
          <div style={{ position:"absolute",inset:0, background:"radial-gradient(circle at 70% 20%,rgba(255,255,255,0.2),transparent 55%)" }} />
          <Sparkles size={22} color="#fff" strokeWidth={2} />
          <span style={{ marginTop: 4, fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.9)", letterSpacing: 0.3 }}>REACT</span>
        </button>
      </div>

      {/* ══════════ MAIN BOTTOM BAR ══════════ */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        zIndex: 100,
        background: "linear-gradient(180deg,transparent 0%,rgba(10,6,25,0.92) 45%,rgba(8,4,18,0.98) 100%)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        padding: "10px 12px 18px",
      }}>

        {/* ── CHAT INPUT (expanded when open) ── */}
        {inputOpen && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            marginBottom: 10,
            background: "rgba(255,255,255,0.07)",
            borderRadius: 24,
            border: "1px solid rgba(124,58,237,0.4)",
            padding: "5px 5px 5px 14px",
            backdropFilter: "blur(12px)",
          }}>
            <input
              ref={inputRef}
              placeholder="Say something…"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") { onSendChat(); setInputOpen(false); }
                if (e.key === "Escape") setInputOpen(false);
              }}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 13, fontFamily: "inherit",
              }}
            />
            <button
              onClick={() => { onSendChat(); setInputOpen(false); }}
              style={{
                width: 36, height: 36, borderRadius: 18, border: "none",
                background: "linear-gradient(135deg,#7c3aed,#a78bfa)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
                boxShadow: "0 0 14px rgba(124,58,237,0.6)",
              }}
            >
              <Send size={15} strokeWidth={2.5} />
            </button>
          </div>
        )}

        {/* ── TWO-GROUP BOTTOM ROW ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>

          {/* ── LEFT GROUP: Chat pill + Emoji ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>

            {/* Chat pill — takes all remaining space */}
            <button
              onClick={() => { closeAllPopups(); setInputOpen(s => !s); }}
              style={{
                flex: 1, minWidth: 0,
                height: 38, borderRadius: 19,
                background: inputOpen
                  ? "rgba(124,58,237,0.18)"
                  : "rgba(255,255,255,0.07)",
                border: inputOpen
                  ? "1.5px solid rgba(124,58,237,0.5)"
                  : "1.5px solid rgba(255,255,255,0.13)",
                display: "flex", alignItems: "center",
                padding: "0 14px", gap: 8, cursor: "pointer",
                backdropFilter: "blur(8px)",
                boxShadow: inputOpen ? "0 0 14px rgba(124,58,237,0.25)" : "none",
                transition: "border 0.15s, box-shadow 0.15s",
              }}
            >
              <MessageCircle
                size={15}
                strokeWidth={2.3}
                color={inputOpen ? "#c4b5fd" : "rgba(255,255,255,0.45)"}
              />
              <span style={{
                fontSize: 12, color: inputOpen ? "#c4b5fd" : "rgba(255,255,255,0.38)",
                fontFamily: "inherit", fontWeight: 500, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {inputText || "Say something…"}
              </span>
            </button>

            {/* Emoji button */}
            <RoundBtn
              icon={<Smile size={17} strokeWidth={2.3} />}
              onClick={() => { const n = !showEmoji; closeAllPopups(); if (n) setShowEmoji(true); }}
              active={showEmoji}
              size={38}
              color={showEmoji ? "purple" : "muted"}
              label="Emoji"
            />
          </div>

          {/* ── RIGHT GROUP: Gift · Mic · More ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>

            {/* Gift */}
            <RoundBtn
              icon={<Gift size={17} strokeWidth={2.3} />}
              onClick={() => { const n = !showGift; closeAllPopups(); if (n) setShowGift(true); }}
              active={showGift}
              size={38}
              color="pink"
              label="Gift"
            />

            {/* Mic — bigger & prominent */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
              <button
                onClick={onMicToggle}
                style={{
                  width: 48, height: 48, borderRadius: 24,
                  background: micActive
                    ? "radial-gradient(circle at 30% 25%, #86efac, #22c55e 55%, #14532d)"
                    : "radial-gradient(circle at 30% 25%, #fca5a5, #ef4444 55%, #7f1d1d)",
                  border: "2px solid rgba(255,255,255,0.25)",
                  boxShadow: micActive
                    ? "0 0 22px rgba(34,197,94,0.65), inset 0 1px 3px rgba(255,255,255,0.35)"
                    : "0 0 18px rgba(239,68,68,0.5), inset 0 1px 3px rgba(255,255,255,0.3)",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", padding: 0,
                  transition: "box-shadow 0.15s",
                }}
              >
                {micActive
                  ? <Mic     size={20} strokeWidth={2.5} />
                  : <MicOff  size={20} strokeWidth={2.5} />}
              </button>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.55)", fontWeight: 600 }}>
                {micActive ? "Mic ON" : "Muted"}
              </span>
            </div>

            {/* More */}
            <RoundBtn
              icon={<MoreHorizontal size={17} strokeWidth={2.3} />}
              onClick={onOpenMenu}
              size={38}
              color="muted"
              label="More"
            />
          </div>
        </div>
      </div>

      {/* ══════════ POPUPS ══════════ */}

      {/* Emoji picker */}
      {showEmoji && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          width: 240, zIndex: 200,
          background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(124,58,237,0.3)", borderRadius: 18,
          padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => { onSendEmoji(e); closeAllPopups(); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 26, padding: 3, lineHeight: 1 }}>
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gift picker */}
      {showGift && (
        <div style={{
          position: "fixed", bottom: 80, left: 8, right: 8, zIndex: 200,
          background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(236,72,153,0.3)", borderRadius: 18,
          padding: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>💎 {user.coins} coins</span>
            <div style={{ display: "flex", gap: 4 }}>
              {GIFT_COMBOS.map(c => (
                <button key={c} onClick={() => setGiftCombo(c)} style={{
                  padding: "3px 9px", borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: "inherit",
                  border: giftCombo === c ? "1px solid rgba(167,139,250,0.6)" : "1px solid rgba(255,255,255,0.1)",
                  background: giftCombo === c ? "rgba(124,58,237,0.25)" : "rgba(255,255,255,0.04)",
                  color: giftCombo === c ? "#c4b5fd" : "rgba(255,255,255,0.35)", cursor: "pointer",
                }}>x{c}</button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {GIFTS.map(g => {
              const total = g.cost * giftCombo;
              const canAfford = user.coins >= total;
              return (
                <button key={g.emoji}
                  onClick={() => { if (canAfford) { onHandleGift(g, giftCombo); closeAllPopups(); } }}
                  style={{
                    background: canAfford ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.09)", borderRadius: 14,
                    cursor: canAfford ? "pointer" : "not-allowed",
                    padding: "7px 9px",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                    opacity: canAfford ? 1 : 0.35, minWidth: 52,
                  }}>
                  <span style={{ fontSize: 22 }}>{g.emoji}</span>
                  <span style={{ fontSize: 8, color: "#FFD700", fontWeight: 800 }}>{total}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reactions */}
      {showReactions && (
        <div style={{
          position: "fixed", bottom: 80, right: 12, zIndex: 200,
          background: "rgba(15,8,35,0.96)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(6,182,212,0.3)", borderRadius: 18,
          padding: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        }}>
          <div style={{ display: "flex", gap: 8 }}>
            {REACTIONS.map(r => (
              <button key={r.emoji}
                onClick={() => { onHandleReaction(r.emoji); closeAllPopups(); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 4, lineHeight: 1 }}>
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
