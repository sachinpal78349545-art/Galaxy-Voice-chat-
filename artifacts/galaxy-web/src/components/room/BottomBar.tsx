import React, { useState } from "react";
import { Room, UserProfile } from "./types";
import {
  Mic, MicOff, Volume2, VolumeX, Smile, MessageCircle,
  Gift, Gem, Gamepad2, Dices, Menu as MenuIcon, Send,
  Hand, PartyPopper, Sparkles,
} from "lucide-react";

// Premium neon button — gradient bg + soft theme glow + inner highlight
const NEON_PRIMARY = "#6C5CE7";
const NEON_LIGHT = "#a78bfa";

function NeonIconBtn({
  icon, onClick, title, size = 38, active = false, variant = "primary",
}: {
  icon: React.ReactNode;
  onClick?: () => void;
  title?: string;
  size?: number;
  active?: boolean;
  variant?: "primary" | "pink" | "amber" | "cyan" | "rose" | "muted";
}) {
  const palettes: Record<string, { bg: string; glow: string; ring: string }> = {
    primary: {
      bg: "radial-gradient(circle at 30% 25%, #b8a4ff 0%, #8B7BFF 35%, #6C5CE7 75%, #4b3bbf 100%)",
      glow: "rgba(108,92,231,0.55)",
      ring: "rgba(167,139,250,0.6)",
    },
    pink: {
      bg: "radial-gradient(circle at 30% 25%, #ffc1d9 0%, #ff7eb3 40%, #c2185b 100%)",
      glow: "rgba(255,107,157,0.55)",
      ring: "rgba(255,160,200,0.65)",
    },
    amber: {
      bg: "radial-gradient(circle at 30% 25%, #ffeaa1 0%, #ffc14d 40%, #ff8c00 100%)",
      glow: "rgba(255,170,40,0.55)",
      ring: "rgba(255,210,120,0.65)",
    },
    cyan: {
      bg: "radial-gradient(circle at 30% 25%, #b9f1ff 0%, #4dd0e1 40%, #0097a7 100%)",
      glow: "rgba(77,208,225,0.55)",
      ring: "rgba(178,235,242,0.65)",
    },
    rose: {
      bg: "radial-gradient(circle at 30% 25%, #ffd1c1 0%, #ff8a65 40%, #e64a19 100%)",
      glow: "rgba(255,122,80,0.55)",
      ring: "rgba(255,180,150,0.65)",
    },
    muted: {
      bg: "rgba(20,12,40,0.55)",
      glow: "rgba(108,92,231,0.25)",
      ring: "rgba(167,139,250,0.3)",
    },
  };
  const p = palettes[variant];
  return (
    <button onClick={onClick} title={title} style={{
      width: size, height: size, borderRadius: size / 2,
      border: `1px solid ${active ? "rgba(255,255,255,0.45)" : p.ring}`,
      padding: 0, cursor: "pointer", color: "#fff",
      background: p.bg,
      boxShadow: `0 0 ${active ? 16 : 10}px ${p.glow}, inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -2px 4px rgba(0,0,0,0.2)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "transform 0.12s ease, box-shadow 0.12s ease",
    }}>
      {icon}
    </button>
  );
}

const EMOJIS = ["\u2764\uFE0F", "\u{1F525}", "\u2728", "\u{1F602}", "\u{1F3B5}", "\u{1F44F}", "\u{1F31F}", "\u{1F4AF}", "\u{1F680}", "\u{1F60D}", "\u{1F389}", "\u{1F48E}"];
const GIFTS = [
  { emoji: "\u{1F381}", name: "Gift Box", cost: 10 },
  { emoji: "\u{1F48E}", name: "Diamond", cost: 50 },
  { emoji: "\u{1F451}", name: "Crown", cost: 100 },
  { emoji: "\u{1F339}", name: "Rose", cost: 20 },
  { emoji: "\u{1F38A}", name: "Confetti", cost: 30 },
  { emoji: "\u{1F340}", name: "Clover", cost: 15 },
  { emoji: "\u{1F98B}", name: "Butterfly", cost: 25 },
  { emoji: "\u2B50", name: "Star", cost: 40 },
  { emoji: "\u{1F3B6}", name: "Music", cost: 35 },
  { emoji: "\u{1F4B0}", name: "Money Bag", cost: 200 },
  { emoji: "\u{1F3C6}", name: "Trophy", cost: 500 },
  { emoji: "\u{1F52E}", name: "Crystal Ball", cost: 75 },
];
const GIFT_COMBOS = [1, 10, 50, 100];
const REACTIONS = [
  { emoji: "\u{1F44F}", label: "Clap" },
  { emoji: "\u{1F525}", label: "Fire" },
  { emoji: "\u2764\uFE0F", label: "Love" },
  { emoji: "\u{1F602}", label: "LOL" },
  { emoji: "\u{1F4AF}", label: "100" },
  { emoji: "\u{1F389}", label: "Party" },
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
  isMuted, isSpeakerOff, isOnSeat,
  inputText, setInputText, onSendChat,
  onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle, onSpeakerToggle, onRaiseHand, showToast, onOpenGame, onOpenMenu,
}: BottomBarProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [giftCombo, setGiftCombo] = useState(1);

  const closeAllPopups = () => { setShowEmoji(false); setShowGift(false); setShowReactions(false); };

  // ── right-widget card base ──
  const widgetCard: React.CSSProperties = {
    width: 52, borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", overflow: "hidden", position: "relative",
    boxShadow: "0 4px 14px rgba(0,0,0,0.45)",
    padding: "8px 0 6px",
    fontFamily: "inherit",
  };

  return (
    <>
      {/* ── RIGHT SIDE GRAPHIC WIDGETS ── */}
      <div style={{
        position: "fixed", right: 10, bottom: 130, zIndex: 80,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        width: 52,
      }}>

        {/* EVENT BANNER WIDGET */}
        <button
          onClick={() => showToast("Events coming soon!", "info")}
          style={{ ...widgetCard, background: "linear-gradient(160deg, #ff6b9d 0%, #9b27af 60%, #4b1fa8 100%)" }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.2), transparent 55%)",
          }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>🎪</span>
          <span style={{
            marginTop: 4, fontSize: 8, fontWeight: 800, color: "#fff",
            letterSpacing: 0.3, textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          }}>EVENT</span>
        </button>

        {/* SOFA / SEAT WIDGET */}
        <button
          onClick={onRaiseHand}
          style={{ ...widgetCard, background: "linear-gradient(160deg, #6C5CE7 0%, #4b3bbf 100%)" }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.18), transparent 55%)",
          }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>🛋️</span>
          <span style={{
            marginTop: 4, fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.85)",
            letterSpacing: 0.3,
          }}>{isOnSeat ? "ON SEAT" : "GET SEAT"}</span>
        </button>

        {/* RECHARGE BONUS WIDGET */}
        <button
          onClick={() => { closeAllPopups(); setShowGift(s => !s); }}
          style={{ ...widgetCard, background: "linear-gradient(160deg, #ffd54f 0%, #ff9800 55%, #e65100 100%)" }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.25), transparent 55%)",
          }} />
          <span style={{ fontSize: 22, lineHeight: 1 }}>💰</span>
          <span style={{
            marginTop: 4, fontSize: 7, fontWeight: 800, color: "#fff",
            letterSpacing: 0.2, textShadow: "0 1px 3px rgba(0,0,0,0.5)",
            textAlign: "center", lineHeight: 1.2, padding: "0 2px",
          }}>RECHARGE</span>
        </button>

        {/* REACTIONS WIDGET */}
        <button
          onClick={() => { closeAllPopups(); setShowReactions(s => !s); }}
          style={{ ...widgetCard, background: "linear-gradient(160deg, #00b4d8 0%, #0077b6 100%)" }}
        >
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.2), transparent 55%)",
          }} />
          <Sparkles size={22} color="#fff" strokeWidth={2} />
          <span style={{
            marginTop: 4, fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.9)",
            letterSpacing: 0.3,
          }}>REACT</span>
        </button>
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 400, margin: "0 auto",
        zIndex: 100, padding: "10px 10px 14px",
        background: "linear-gradient(180deg, transparent, rgba(15,15,26,0.85) 60%)",
      }}>
        {/* Optional chat input - only shown when chat icon tapped */}
        {showInput && (
          <div style={{
            display: "flex", gap: 8, marginBottom: 10,
            background: "rgba(0,0,0,0.55)", borderRadius: 24, padding: "4px 4px 4px 14px",
            border: "1px solid rgba(108,92,231,0.3)", backdropFilter: "blur(10px)",
          }}>
            <input autoFocus
              placeholder="Cast your words..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { onSendChat(); setShowInput(false); } }}
              style={{
                flex: 1, background: "none", border: "none", outline: "none",
                color: "#fff", fontSize: 13, fontFamily: "inherit",
              }}
            />
            <button onClick={() => { onSendChat(); setShowInput(false); }} style={{
              width: 36, height: 36, borderRadius: 18, border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #6C5CE7, #a78bfa)", color: "#fff", fontSize: 14,
            }}>{"\u27A4"}</button>
          </div>
        )}

        {/* ── BOTTOM FUNCTION BAR: icon + label grid ── */}
        <div style={{
          display: "flex", alignItems: "flex-end",
          justifyContent: "space-between", gap: 2,
        }}>
          {/* Helper: labeled icon button */}
          {([
            {
              icon: isSpeakerOff ? <VolumeX size={17} strokeWidth={2.3} /> : <Volume2 size={17} strokeWidth={2.3} />,
              label: "Sound", onClick: onSpeakerToggle,
              variant: isSpeakerOff ? "muted" : "primary",
            },
            {
              icon: (!isOnSeat || isMuted) ? <MicOff size={17} strokeWidth={2.3} /> : <Mic size={17} strokeWidth={2.3} />,
              label: isMuted ? "Muted" : "Mic", onClick: onMicToggle,
              variant: (!isOnSeat || isMuted) ? "muted" : "primary",
              dot: isOnSeat && !isMuted,
            },
            {
              icon: <Smile size={17} strokeWidth={2.3} />,
              label: "Emoji", onClick: () => { const n = !showEmoji; closeAllPopups(); if (n) setShowEmoji(true); },
              variant: showEmoji ? "primary" : "muted",
            },
            {
              icon: <MessageCircle size={17} strokeWidth={2.3} />,
              label: "Chat", onClick: () => { closeAllPopups(); setShowInput(s => !s); },
              variant: showInput ? "primary" : "muted",
            },
            {
              icon: <Gamepad2 size={17} strokeWidth={2.3} />,
              label: "Games", onClick: () => { closeAllPopups(); onOpenGame?.(); },
              variant: "rose",
            },
            {
              icon: <Dices size={17} strokeWidth={2.3} />,
              label: "Lucky", onClick: () => { closeAllPopups(); onOpenGame?.(); },
              variant: "amber",
            },
            {
              icon: <Gift size={17} strokeWidth={2.3} />,
              label: "Gift", onClick: () => { const n = !showGift; closeAllPopups(); if (n) setShowGift(true); },
              variant: "pink",
            },
            {
              icon: <Gem size={17} strokeWidth={2.3} />,
              label: "Gems", onClick: () => showToast("Gems coming soon!", "info"),
              variant: "cyan",
            },
            {
              icon: <MenuIcon size={17} strokeWidth={2.3} />,
              label: "More", onClick: onOpenMenu,
              variant: "muted",
            },
          ] as Array<{ icon: React.ReactNode; label: string; onClick?: () => void; variant: string; dot?: boolean }>)
            .map(({ icon, label, onClick, variant, dot }, i) => {
              const palettes: Record<string, { bg: string; glow: string }> = {
                primary: { bg: "radial-gradient(circle at 30% 25%, #b8a4ff, #6C5CE7 70%, #4b3bbf)", glow: "rgba(108,92,231,0.5)" },
                pink:    { bg: "radial-gradient(circle at 30% 25%, #ffc1d9, #ff7eb3 50%, #c2185b)", glow: "rgba(255,107,157,0.5)" },
                amber:   { bg: "radial-gradient(circle at 30% 25%, #ffeaa1, #ffc14d 50%, #ff8c00)", glow: "rgba(255,170,40,0.5)" },
                cyan:    { bg: "radial-gradient(circle at 30% 25%, #b9f1ff, #4dd0e1 50%, #0097a7)", glow: "rgba(77,208,225,0.5)" },
                rose:    { bg: "radial-gradient(circle at 30% 25%, #ffd1c1, #ff8a65 50%, #e64a19)", glow: "rgba(255,122,80,0.5)" },
                muted:   { bg: "rgba(20,12,40,0.6)", glow: "rgba(108,92,231,0.2)" },
              };
              const p = palettes[variant] || palettes.muted;
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ position: "relative" }}>
                    <button onClick={onClick} style={{
                      width: 34, height: 34, borderRadius: 17,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: p.bg,
                      boxShadow: `0 0 10px ${p.glow}, inset 0 1px 2px rgba(255,255,255,0.3)`,
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}>{icon}</button>
                    {dot && (
                      <span style={{
                        position: "absolute", top: 0, right: 0,
                        width: 8, height: 8, borderRadius: 4,
                        background: "#4ade80",
                        border: "1.5px solid rgba(0,0,0,0.6)",
                        boxShadow: "0 0 6px rgba(74,222,128,0.8)",
                      }} />
                    )}
                  </div>
                  <span style={{ fontSize: 8.5, color: "rgba(255,255,255,0.6)", fontWeight: 600, letterSpacing: 0.2 }}>
                    {label}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Popups */}
        {showEmoji && (
          <div className="room-popup" style={{ left: "50%", right: "auto", transform: "translateX(-50%)", width: 240, bottom: 70 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {EMOJIS.map(e => (
                <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                  onClick={() => { onSendEmoji(e); closeAllPopups(); }}>{e}</button>
              ))}
            </div>
          </div>
        )}

        {showGift && (
          <div className="room-popup" style={{ bottom: 70 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>{"\u{1F48E}"} {user.coins} coins</span>
              <div style={{ display: "flex", gap: 3 }}>
                {GIFT_COMBOS.map(c => (
                  <button key={c} onClick={() => setGiftCombo(c)} style={{
                    padding: "3px 8px", borderRadius: 8, fontSize: 10, fontWeight: 800, fontFamily: "inherit",
                    border: giftCombo === c ? "1px solid rgba(45,212,191,0.5)" : "1px solid rgba(255,255,255,0.1)",
                    background: giftCombo === c ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.04)",
                    color: giftCombo === c ? "#2DD4BF" : "rgba(255,255,255,0.35)", cursor: "pointer",
                  }}>x{c}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {GIFTS.map(g => {
                const totalCost = g.cost * giftCombo;
                return (
                  <button key={g.emoji} onClick={() => { onHandleGift(g, giftCombo); closeAllPopups(); }} style={{
                    background: user.coins >= totalCost ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
                    cursor: user.coins >= totalCost ? "pointer" : "not-allowed",
                    padding: "6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    opacity: user.coins >= totalCost ? 1 : 0.35,
                  }}>
                    <span style={{ fontSize: 20 }}>{g.emoji}</span>
                    <span style={{ fontSize: 8, color: "#FFD700", fontWeight: 700 }}>{totalCost}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showReactions && (
          <div className="room-popup" style={{ left: "auto", right: 12, bottom: 70 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {REACTIONS.map(r => (
                <button key={r.emoji} onClick={() => { onHandleReaction(r.emoji); closeAllPopups(); }} style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 4,
                }}>{r.emoji}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
