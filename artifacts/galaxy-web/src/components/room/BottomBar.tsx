import React, { useState } from "react";
import { Room, UserProfile } from "./types";
import { LeaderboardPeriod } from "../../lib/giftService";

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
  onSendChat: () => void;
  onSendEmoji: (emoji: string) => void;
  onHandleGift: (gift: { emoji: string; name: string; cost: number }, combo: number) => void;
  onHandleReaction: (emoji: string) => void;
  onMicToggle: () => void;
  onSpeakerToggle: () => void;
  onRaiseHand: () => void;
  onShare: () => void;
  showToast: (msg: string, type?: string, icon?: string) => void;
}

export default function BottomBar({
  room, user, inputText, setInputText,
  isMuted, isSpeakerOff,
  onSendChat, onSendEmoji, onHandleGift, onHandleReaction,
  onMicToggle, onSpeakerToggle, onRaiseHand, onShare, showToast,
}: BottomBarProps) {
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGift, setShowGift] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [giftCombo, setGiftCombo] = useState(1);

  const closeAllPopups = () => { setShowEmoji(false); setShowGift(false); setShowReactions(false); };

  return (
    <>
      <div className="room-hand-fab">
        <button onClick={onRaiseHand} className="room-btn-circle" style={{
          width: 44, height: 44, border: "1.5px solid rgba(138,43,226,0.3)",
          boxShadow: "0 0 12px rgba(138,43,226,0.3)", fontSize: 22,
        }}>{"\u{1F6CB}\uFE0F"}</button>
      </div>

      <div className="room-bottom">
        <div className="room-bottom-input">
          <input className="input-field"
            style={{ flex: 1, borderRadius: 24, padding: "10px 16px", fontSize: 12, background: "transparent", border: "1px solid rgba(255,255,255,0.12)", color: "#fff", fontFamily: "'Poppins', 'Inter', sans-serif" }}
            placeholder="Cast your words..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSendChat()}
          />
          <button style={{
            width: 40, height: 40, borderRadius: 20, flexShrink: 0, border: "none", cursor: "pointer",
            background: "linear-gradient(135deg, #8A2BE2, #2DD4BF)", color: "#fff", fontSize: 14, fontWeight: 700,
            boxShadow: "0 0 12px rgba(45,212,191,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }} onClick={onSendChat}>{"\u27A4"}</button>
        </div>

        <div className="room-bottom-controls">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={onSpeakerToggle} className="room-btn-circle" style={{
              width: 42, height: 42,
              border: isSpeakerOff ? "1.5px solid rgba(255,100,130,0.4)" : "1.5px solid rgba(45,212,191,0.3)",
              color: isSpeakerOff ? "#ff6482" : "#fff", fontSize: 18,
              boxShadow: isSpeakerOff ? "0 0 8px rgba(255,100,130,0.3)" : "0 0 8px rgba(45,212,191,0.2)",
            }}>{isSpeakerOff ? "\u{1F508}" : "\u{1F50A}"}</button>

            <button onClick={onMicToggle} className={`room-btn-circle ${isMuted ? "mic-btn-muted" : "mic-btn-active"}`} style={{
              width: 50, height: 50, fontSize: 20, transition: "all 0.25s",
            }}>{isMuted ? "\u{1F507}" : "\u{1F3A4}"}</button>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button className="room-btn-circle" style={{
              width: 40, height: 40, border: "1.5px solid rgba(138,43,226,0.3)",
              fontSize: 18, boxShadow: "0 0 8px rgba(138,43,226,0.2)",
            }} onClick={onShare}>{"\u{1F517}"}</button>

            <PopupBtn icon={"\u{1F4AC}"} active={showEmoji} onToggle={() => { const next = !showEmoji; closeAllPopups(); if (next) setShowEmoji(true); }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, width: 200 }}>
                {EMOJIS.map(e => (
                  <button key={e} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 24, padding: 3 }}
                    onClick={() => { onSendEmoji(e); closeAllPopups(); }}>{e}</button>
                ))}
              </div>
            </PopupBtn>
          </div>

          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <button onClick={() => { const next = !showGift; closeAllPopups(); if (next) setShowGift(true); }} className="room-btn-circle" style={{
              width: 40, height: 40, border: "1.5px solid rgba(236,72,153,0.3)",
              boxShadow: "0 0 8px rgba(236,72,153,0.2)",
              fontSize: 11, fontWeight: 500, fontFamily: "'Poppins', 'Inter', sans-serif",
              flexDirection: "column", gap: 0,
            }}><span style={{ fontSize: 16 }}>{"\u{1F381}"}</span><span style={{ fontSize: 7, marginTop: -2 }}>Gift</span></button>

            <button onClick={() => { const next = !showReactions; closeAllPopups(); if (next) setShowReactions(true); }} className="room-btn-circle" style={{
              width: 40, height: 40, border: "1.5px solid rgba(139,92,246,0.3)",
              boxShadow: "0 0 8px rgba(139,92,246,0.2)",
              fontSize: 11, fontWeight: 500, fontFamily: "'Poppins', 'Inter', sans-serif",
              flexDirection: "column", gap: 0,
            }}><span style={{ fontSize: 16 }}>{"\u{1F48E}"}</span><span style={{ fontSize: 7, marginTop: -2 }}>Gems</span></button>
          </div>
        </div>

        {showGift && (
          <div className="room-popup">
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
          <div style={{
            position: "absolute", bottom: "100%", right: 12, marginBottom: 6,
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20, padding: "10px 14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            animation: "popIn 0.15s ease", zIndex: 20,
            display: "flex", gap: 8,
          }}>
            {REACTIONS.map(r => (
              <button key={r.emoji} onClick={() => { onHandleReaction(r.emoji); closeAllPopups(); }} style={{
                background: "none", border: "none", cursor: "pointer", fontSize: 30, padding: 4,
                transition: "transform 0.15s", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }} onMouseOver={e => (e.currentTarget.style.transform = "scale(1.3)")}
                onMouseOut={e => (e.currentTarget.style.transform = "scale(1)")}>{r.emoji}</button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function PopupBtn({ icon, active, onToggle, children }: { icon: string; active: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "relative" }}>
      <button className="room-btn-circle" style={{
        width: 40, height: 40, fontSize: 18,
        border: active ? "1.5px solid rgba(138,43,226,0.4)" : "1.5px solid rgba(255,255,255,0.15)",
        color: "rgba(255,255,255,0.6)",
        boxShadow: active ? "0 0 8px rgba(138,43,226,0.2)" : "none",
      }} onClick={onToggle}>{icon}</button>
      {active && (
        <div style={{
          position: "absolute", bottom: 52, left: "50%", transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18, padding: 10,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)", zIndex: 20,
          animation: "popIn 0.15s ease",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}
