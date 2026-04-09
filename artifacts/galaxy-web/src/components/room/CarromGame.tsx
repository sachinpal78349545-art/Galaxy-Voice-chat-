import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, get } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

interface CarromPlayer {
  uid: string;
  name: string;
  score: number;
  color: string;
}

interface CarromState {
  players: Record<string, CarromPlayer>;
  turnUid: string;
  started: boolean;
  winner: string | null;
  round: number;
  maxRounds: number;
  lastShot: string;
  lastShotBy: string;
}

interface CarromGameProps {
  roomId: string;
  userId: string;
  username: string;
  hasControl: boolean;
  onClose: () => void;
}

const SHOT_RESULTS = [
  { text: "Pocket! +3", points: 3, emoji: "\u{1F3AF}" },
  { text: "Pocket! +2", points: 2, emoji: "\u2B50" },
  { text: "Pocket! +1", points: 1, emoji: "\u{1F44D}" },
  { text: "Miss!", points: 0, emoji: "\u{1F4A8}" },
  { text: "Miss!", points: 0, emoji: "\u{1F4A8}" },
  { text: "Foul! -1", points: -1, emoji: "\u274C" },
  { text: "Queen + Cover! +5", points: 5, emoji: "\u{1F451}" },
  { text: "Pocket! +2", points: 2, emoji: "\u2B50" },
  { text: "Pocket! +1", points: 1, emoji: "\u{1F44D}" },
  { text: "Miss!", points: 0, emoji: "\u{1F4A8}" },
];

const MAX_ROUNDS = 10;
const COLORS = ["#00ffff", "#bf00ff", "#FFD700", "#FF6B6B"];

export default function CarromGame({ roomId, userId, username, hasControl, onClose }: CarromGameProps) {
  const [game, setGame] = useState<CarromState | null>(null);
  const [striking, setStriking] = useState(false);
  const [shotAnim, setShotAnim] = useState<string | null>(null);

  const gameRef = ref(db, `roomGames/${roomId}/carrom`);

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
    const players: Record<string, CarromPlayer> = {};
    uids.forEach((uid, i) => {
      players[uid] = { uid, name: users[uid].name, score: 0, color: COLORS[i] };
    });
    const state: CarromState = {
      players, turnUid: uids[0], started: true, winner: null,
      round: 1, maxRounds: MAX_ROUNDS, lastShot: "", lastShotBy: "",
    };
    await update(gameRef, state);
    playGameStart();
  };

  const strike = async () => {
    if (!game || striking || game.turnUid !== userId || game.winner) return;
    setStriking(true);
    playDiceSound();

    await new Promise(r => setTimeout(r, 600));

    const result = SHOT_RESULTS[Math.floor(Math.random() * SHOT_RESULTS.length)];
    const me = game.players[userId];
    const newScore = Math.max(0, me.score + result.points);

    const playerUids = Object.keys(game.players);
    const myIdx = playerUids.indexOf(userId);
    const nextIdx = (myIdx + 1) % playerUids.length;
    const isLastPlayer = nextIdx === 0;
    const newRound = isLastPlayer ? game.round + 1 : game.round;

    setShotAnim(`${result.emoji} ${result.text}`);
    setTimeout(() => setShotAnim(null), 2000);

    if (result.points > 0) playTurnSound();

    const updates: Record<string, any> = {
      [`players/${userId}/score`]: newScore,
      turnUid: playerUids[nextIdx],
      lastShot: `${result.emoji} ${result.text}`,
      lastShotBy: userId,
      round: newRound,
    };

    if (newRound > MAX_ROUNDS) {
      let maxScore = -1;
      let winnerId = "";
      for (const p of Object.values(game.players)) {
        const s = p.uid === userId ? newScore : p.score;
        if (s > maxScore) { maxScore = s; winnerId = p.uid; }
      }
      updates.winner = winnerId;
      playWinSound();
    }

    await update(gameRef, updates);
    setStriking(false);
  };

  const isMyTurn = game?.turnUid === userId;
  const players = game ? Object.values(game.players) : [];
  players.sort((a, b) => b.score - a.score);

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3B1}"} Carrom Board
        </h3>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Strike to pocket coins! {MAX_ROUNDS} rounds
        </p>

        {!game?.started ? (
          <div>
            <div style={{
              width: 160, height: 160, margin: "0 auto 16px", borderRadius: 12,
              background: "#8B6914", border: "3px solid #5C4A0E",
              position: "relative", overflow: "hidden",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.4)",
            }}>
              <div style={{
                position: "absolute", inset: 12, borderRadius: 8,
                border: "2px solid rgba(0,0,0,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y], i) => (
                  <div key={i} style={{
                    position: "absolute",
                    left: x > 0 ? "auto" : 0, right: x > 0 ? 0 : "auto",
                    top: y > 0 ? "auto" : 0, bottom: y > 0 ? 0 : "auto",
                    width: 12, height: 12, borderRadius: 6, background: "#000",
                  }} />
                ))}
                {Array.from({length: 6}, (_, i) => (
                  <div key={`c${i}`} style={{
                    position: "absolute",
                    left: `${40 + Math.cos(i * 60 * Math.PI / 180) * 20}%`,
                    top: `${40 + Math.sin(i * 60 * Math.PI / 180) * 20}%`,
                    width: 8, height: 8, borderRadius: 4,
                    background: i % 2 === 0 ? "#fff" : "#111",
                    border: "1px solid rgba(0,0,0,0.3)",
                  }} />
                ))}
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: "#FF0000", border: "1px solid #8B0000",
                }} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              {hasControl ? "Start a carrom match!" : "Waiting for host..."}
            </p>
            {hasControl && (
              <button onClick={startGame} style={{
                width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
                color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "'Poppins','Inter',sans-serif",
                boxShadow: "0 0 20px rgba(191,0,255,0.3)",
              }}>
                {"\u{1F3B1}"} Start Game!
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8,
            }}>
              Round {Math.min(game.round, MAX_ROUNDS)}/{MAX_ROUNDS}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
              {players.map((p, i) => (
                <div key={p.uid} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "6px 10px",
                  borderRadius: 10,
                  background: game.turnUid === p.uid ? "rgba(0,255,255,0.08)" : "rgba(255,255,255,0.03)",
                  border: game.turnUid === p.uid ? "1px solid rgba(0,255,255,0.3)" : "1px solid rgba(255,255,255,0.06)",
                }}>
                  <span style={{ fontSize: 12, minWidth: 16 }}>{i === 0 ? "\u{1F947}" : i === 1 ? "\u{1F948}" : i === 2 ? "\u{1F949}" : ""}</span>
                  <span style={{
                    width: 8, height: 8, borderRadius: 4, background: p.color,
                    boxShadow: `0 0 4px ${p.color}`,
                  }} />
                  <span style={{
                    flex: 1, fontSize: 11, fontWeight: 700, color: p.color,
                    maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{cleanName(p.name)}</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{p.score}</span>
                  {game.turnUid === p.uid && <span style={{ fontSize: 8, color: "#00ffff" }}>{"\u25C0"} Turn</span>}
                </div>
              ))}
            </div>

            {shotAnim && (
              <div style={{
                padding: "8px 16px", borderRadius: 12, marginBottom: 8,
                background: "rgba(0,255,255,0.1)", border: "1px solid rgba(0,255,255,0.3)",
                fontSize: 14, fontWeight: 800, color: "#00ffff",
                animation: "chatFadeIn 0.3s ease",
              }}>{shotAnim}</div>
            )}

            {game.lastShot && !shotAnim && (
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                {cleanName(game.players[game.lastShotBy]?.name)}: {game.lastShot}
              </p>
            )}

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
              <button
                onClick={strike}
                disabled={!isMyTurn || striking}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 14, border: "none",
                  cursor: isMyTurn && !striking ? "pointer" : "not-allowed",
                  background: isMyTurn ? "linear-gradient(135deg, #bf00ff, #00e6e6)" : "rgba(108,92,231,0.15)",
                  color: "#fff", fontSize: 13, fontWeight: 800,
                  fontFamily: "'Poppins','Inter',sans-serif",
                  opacity: isMyTurn ? 1 : 0.4,
                }}
              >
                {striking ? "Striking..." : isMyTurn ? "\u{1F3AF} Strike!" : `${cleanName(game.players[game.turnUid]?.name)}'s turn`}
              </button>
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
