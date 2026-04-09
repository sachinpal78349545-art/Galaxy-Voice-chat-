import React from "react";

interface GameHubProps {
  hasControl: boolean;
  onSelectGame: (game: string) => void;
  onClose: () => void;
}

const GAMES = [
  { id: "dice", emoji: "\u{1F3B2}", name: "Dice Roll", desc: "Roll dice, everyone sees live!", adminOnly: false },
  { id: "ludo", emoji: "\u{1F3AF}", name: "Mini Ludo", desc: "Race to finish! Turn-based dice race", adminOnly: true },
  { id: "carrom", emoji: "\u{1F3B1}", name: "Carrom Board", desc: "Pocket the coins! Turn-based scoring", adminOnly: true },
  { id: "tod", emoji: "\u{1F3A1}", name: "Truth or Dare", desc: "Spin the wheel! Pick truth or dare", adminOnly: true },
];

export default function GameHub({ hasControl, onSelectGame, onClose }: GameHubProps) {
  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" style={{ width: 320, maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3AE}"} Games
        </h3>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
          {hasControl ? "Start a game for everyone!" : "Join games started by the host"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GAMES.map(g => {
            const canStart = !g.adminOnly || hasControl;
            return (
              <button
                key={g.id}
                onClick={() => canStart && onSelectGame(g.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 14,
                  background: canStart ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                  border: canStart ? "1px solid rgba(108,92,231,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  cursor: canStart ? "pointer" : "not-allowed",
                  opacity: canStart ? 1 : 0.4,
                  textAlign: "left", fontFamily: "'Poppins','Inter',sans-serif",
                  transition: "all 0.2s ease",
                }}
              >
                <span style={{ fontSize: 28 }}>{g.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{g.name}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{g.desc}</div>
                </div>
                {g.adminOnly && !hasControl && (
                  <span style={{ fontSize: 8, color: "rgba(255,215,0,0.6)", fontWeight: 700 }}>{"\u{1F512}"} Admin</span>
                )}
                {canStart && (
                  <span style={{ fontSize: 10, color: "#00ffff", fontWeight: 700 }}>{g.adminOnly ? "Start" : "Play"} {"\u25B6"}</span>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          marginTop: 16, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'Poppins','Inter',sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}
