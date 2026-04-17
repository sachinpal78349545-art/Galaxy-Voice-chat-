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

  const floatBtn = (gradient: string, shadow: string): React.CSSProperties => ({
    width: 46, height: 46, borderRadius: 23, border: "1px solid rgba(255,255,255,0.18)",
    padding: 0, cursor: "pointer", color: "#fff",
    background: gradient, boxShadow: `0 4px 14px ${shadow}`,
    display: "flex", alignItems: "center", justifyContent: "center",
  });

  const circleBtn = (active = false): React.CSSProperties => ({
    width: 34, height: 34, borderRadius: 17,
    background: active ? "rgba(108,92,231,0.4)" : "rgba(0,0,0,0.45)",
    border: `1px solid ${active ? "rgba(108,92,231,0.6)" : "rgba(255,255,255,0.12)"}`,
    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", fontSize: 18, padding: 0, fontFamily: "inherit",
    backdropFilter: "blur(8px)", flexShrink: 0,
  });

  return (
    <>
      {/* Right-side floating action buttons — uniform neon stack */}
      <div style={{
        position: "fixed", right: 14, bottom: 140, zIndex: 80,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}>
        <NeonIconBtn variant="pink" size={46} title="Mela / Events"
          onClick={() => showToast("Mela coming soon!", "info")}
          icon={<PartyPopper size={22} strokeWidth={2.2} />} />
        <NeonIconBtn variant="primary" size={46} title="Reactions"
          onClick={() => { closeAllPopups(); setShowReactions(true); }}
          icon={<Sparkles size={22} strokeWidth={2.2} />} />
        <NeonIconBtn variant="primary" size={46} title="Raise hand"
          onClick={onRaiseHand}
          icon={<Hand size={22} strokeWidth={2.2} />} />
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

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          {/* LEFT cluster: speaker, mic, emoji, chat */}
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <NeonIconBtn variant={isSpeakerOff ? "muted" : "primary"} size={36}
              title="Speaker" onClick={onSpeakerToggle}
              icon={isSpeakerOff ? <VolumeX size={18} strokeWidth={2.2} /> : <Volume2 size={18} strokeWidth={2.2} />} />
            <NeonIconBtn variant={!isOnSeat || isMuted ? "muted" : "primary"} size={36}
              title={!isOnSeat ? "Take a seat" : isMuted ? "Unmute" : "Mute"} onClick={onMicToggle}
              icon={!isOnSeat || isMuted ? <MicOff size={18} strokeWidth={2.2} /> : <Mic size={18} strokeWidth={2.2} />} />
            <NeonIconBtn variant={showEmoji ? "primary" : "muted"} size={36} active={showEmoji}
              title="Emoji" onClick={() => { const next = !showEmoji; closeAllPopups(); if (next) setShowEmoji(true); }}
              icon={<Smile size={18} strokeWidth={2.2} />} />
            <NeonIconBtn variant={showInput ? "primary" : "muted"} size={36} active={showInput}
              title="Chat" onClick={() => { closeAllPopups(); setShowInput(s => !s); }}
              icon={<MessageCircle size={18} strokeWidth={2.2} />} />
          </div>

          {/* CENTER cluster: game shortcuts — neon */}
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <NeonIconBtn variant="rose" size={38} title="Games"
              onClick={() => { closeAllPopups(); onOpenGame?.(); }}
              icon={<Gamepad2 size={20} strokeWidth={2.2} />} />
            <NeonIconBtn variant="amber" size={38} title="Lucky"
              onClick={() => { closeAllPopups(); onOpenGame?.(); }}
              icon={<Dices size={20} strokeWidth={2.2} />} />
          </div>

          {/* RIGHT cluster: gift + gems + menu — neon */}
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <NeonIconBtn variant="pink" size={42} title="Recharge Bonus"
                onClick={() => { const next = !showGift; closeAllPopups(); if (next) setShowGift(true); }}
                icon={<Gift size={22} strokeWidth={2.2} />} />
              <span style={{
                position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)",
                background: "linear-gradient(90deg, #ff7eb3, #c2185b)",
                color: "#fff", fontSize: 7, fontWeight: 800, letterSpacing: 0.3,
                padding: "1px 6px", borderRadius: 6,
                boxShadow: "0 1px 4px rgba(194,24,91,0.6)",
              }}>BONUS</span>
            </div>
            <NeonIconBtn variant="cyan" size={36} title="Gems"
              onClick={() => showToast("Gems wallet coming soon!", "info")}
              icon={<Gem size={18} strokeWidth={2.2} />} />
            <NeonIconBtn variant="muted" size={36} title="Menu"
              onClick={onOpenMenu}
              icon={<MenuIcon size={18} strokeWidth={2.2} />} />
          </div>
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
