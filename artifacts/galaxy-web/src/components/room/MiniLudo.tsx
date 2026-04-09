import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, get } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

interface LudoPlayer {
  uid: string;
  name: string;
  position: number;
  color: string;
}

interface LudoState {
  players: Record<string, LudoPlayer>;
  turnUid: string;
  started: boolean;
  winner: string | null;
  lastDice: number;
  lastRoller: string;
}

interface MiniLudoProps {
  roomId: string;
  userId: string;
  username: string;
  hasControl: boolean;
  onClose: () => void;
}

const FINISH = 20;
const COLORS = ["#00ffff", "#bf00ff", "#FFD700", "#FF6B6B"];
const COLOR_NAMES = ["Cyan", "Purple", "Gold", "Red"];

export default function MiniLudo({ roomId, userId, username, hasControl, onClose }: MiniLudoProps) {
  const [game, setGame] = useState<LudoState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState(1);

  const gameRef = ref(db, `roomGames/${roomId}/ludo`);

  useEffect(() => {
    const handler = onValue(gameRef, snap => {
      if (!snap.exists()) { setGame(null); return; }
      setGame(snap.val());
    });
    return () => off(gameRef, "value", handler);
  }, [roomId]);

  const startGame = async () => {
    const snap = await get(ref(db, `rooms/${roomId}/roomUsers`));
    if (!snap.exists()) return;
    const users = snap.val();
    const uids = Object.keys(users).slice(0, 4);
    const players: Record<string, LudoPlayer> = {};
    uids.forEach((uid, i) => {
      players[uid] = { uid, name: users[uid].name, position: 0, color: COLORS[i] };
    });
    const state: LudoState = {
      players, turnUid: uids[0], started: true, winner: null, lastDice: 0, lastRoller: "",
    };
    await update(gameRef, state);
    playGameStart();
  };

  const rollDice = async () => {
    if (!game || rolling || game.turnUid !== userId || game.winner) return;
    setRolling(true);
    playDiceSound();

    let count = 0;
    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 6) + 1);
      count++;
      if (count >= 8) clearInterval(interval);
    }, 80);

    await new Promise(r => setTimeout(r, 700));
    clearInterval(interval);

    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceDisplay(dice);
    setRolling(false);

    const me = game.players[userId];
    const newPos = Math.min(me.position + dice, FINISH);
    const playerUids = Object.keys(game.players);
    const myIdx = playerUids.indexOf(userId);
    const nextIdx = (myIdx + 1) % playerUids.length;

    const updates: Record<string, any> = {
      [`players/${userId}/position`]: newPos,
      lastDice: dice,
      lastRoller: userId,
    };

    if (newPos >= FINISH) {
      updates.winner = userId;
      playWinSound();
    } else {
      updates.turnUid = playerUids[nextIdx];
      playTurnSound();
    }

    await update(gameRef, updates);
  };

  const DICE_DOTS: Record<number, string> = {
    1: "\u2680", 2: "\u2681", 3: "\u2682", 4: "\u2683", 5: "\u2684", 6: "\u2685",
  };

  const isMyTurn = game?.turnUid === userId;
  const players = game ? Object.values(game.players) : [];

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3AF}"} Mini Ludo
        </h3>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Race to position {FINISH}! First to finish wins
        </p>

        {!game?.started ? (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              {hasControl ? "Start the game for up to 4 players" : "Waiting for host to start..."}
            </p>
            {hasControl && (
              <button onClick={startGame} style={{
                width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
                color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "'Poppins','Inter',sans-serif",
                boxShadow: "0 0 20px rgba(191,0,255,0.3)",
              }}>
                {"\u{1F3AF}"} Start Game!
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{
              background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 12, marginBottom: 12,
              border: "1px solid rgba(108,92,231,0.2)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>START</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", fontWeight: 700 }}>FINISH {"\u{1F3C1}"}</span>
              </div>
              <div style={{
                position: "relative", height: 8, borderRadius: 4,
                background: "rgba(255,255,255,0.08)", overflow: "visible",
              }}>
                {players.map((p, idx) => (
                  <div key={p.uid} style={{
                    position: "absolute", left: `${(p.position / FINISH) * 100}%`,
                    top: -4 + idx * 3, width: 14, height: 14, borderRadius: 7,
                    background: p.color, border: "2px solid rgba(255,255,255,0.5)",
                    boxShadow: `0 0 8px ${p.color}`,
                    transition: "left 0.5s ease",
                    zIndex: p.uid === userId ? 5 : 1,
                  }} title={cleanName(p.name)} />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, justifyContent: "center" }}>
              {players.map(p => (
                <div key={p.uid} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                  borderRadius: 8, fontSize: 10, fontWeight: 700,
                  background: game.turnUid === p.uid ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.04)",
                  border: game.turnUid === p.uid ? "1px solid rgba(0,255,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: p.color,
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 4, background: p.color,
                    boxShadow: `0 0 4px ${p.color}`,
                  }} />
                  <span style={{ maxWidth: 50, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cleanName(p.name)}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{p.position}/{FINISH}</span>
                </div>
              ))}
            </div>

            {game.winner ? (
              <div style={{
                padding: 16, borderRadius: 14,
                background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.4)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{"\u{1F3C6}"}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>
                  {cleanName(game.players[game.winner]?.name)} Wins!
                </div>
                {hasControl && (
                  <button onClick={startGame} style={{
                    marginTop: 10, padding: "8px 20px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
                    color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    fontFamily: "'Poppins','Inter',sans-serif",
                  }}>Play Again</button>
                )}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div className={`dice-face ${rolling ? "dice-rolling" : ""}`} style={{
                    margin: "0 auto", width: 56, height: 56,
                  }}>
                    {DICE_DOTS[diceDisplay] || diceDisplay}
                  </div>
                  {game.lastDice > 0 && (
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginTop: 6 }}>
                      {cleanName(game.players[game.lastRoller]?.name)} rolled {game.lastDice}
                    </p>
                  )}
                </div>

                <div style={{
                  fontSize: 12, fontWeight: 700, marginBottom: 8,
                  color: isMyTurn ? "#00ffff" : "rgba(255,255,255,0.5)",
                }}>
                  {isMyTurn ? "Your turn! Roll the dice" : `${cleanName(game.players[game.turnUid]?.name)}'s turn`}
                </div>

                <button
                  onClick={rollDice}
                  disabled={!isMyTurn || rolling}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 14, border: "none",
                    cursor: isMyTurn && !rolling ? "pointer" : "not-allowed",
                    background: isMyTurn ? "linear-gradient(135deg, #bf00ff, #00e6e6)" : "rgba(108,92,231,0.15)",
                    color: "#fff", fontSize: 13, fontWeight: 800,
                    fontFamily: "'Poppins','Inter',sans-serif",
                    opacity: isMyTurn ? 1 : 0.4,
                  }}
                >
                  {rolling ? "Rolling..." : isMyTurn ? "\u{1F3B2} Roll!" : "Wait for your turn"}
                </button>
              </>
            )}
          </>
        )}

        <button onClick={onClose} style={{
          marginTop: 12, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'Poppins','Inter',sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}
