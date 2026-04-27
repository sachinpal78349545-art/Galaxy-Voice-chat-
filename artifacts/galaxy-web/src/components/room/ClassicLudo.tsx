import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, set } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

const C = 24;
const PC = ["#FF3D6E", "#3DFFAA", "#3DB8FF", "#FFD93D"];
const CN = ["Red", "Green", "Blue", "Yellow"];
const RGB: [number, number, number][] = [[255, 61, 110], [61, 255, 170], [61, 184, 255], [255, 217, 61]];
const START_ABS = [0, 13, 26, 39];
const SAFE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const DICE_DOTS: Record<number, string> = { 1: "\u2680", 2: "\u2681", 3: "\u2682", 4: "\u2683", 5: "\u2684", 6: "\u2685" };

function rgba(ci: number, a: number) {
  const [r, g, b] = RGB[ci]; return `rgba(${r},${g},${b},${a})`;
}

const MAIN_PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

const HOME_PATHS: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
];

const BASE_SPOTS: [number, number][][] = [
  [[2, 2], [2, 3], [3, 2], [3, 3]],
  [[2, 11], [2, 12], [3, 11], [3, 12]],
  [[11, 11], [11, 12], [12, 11], [12, 12]],
  [[11, 2], [11, 3], [12, 2], [12, 3]],
];

const pathIdxMap: Record<string, number> = {};
MAIN_PATH.forEach(([r, c], i) => { pathIdxMap[`${r},${c}`] = i; });
const homeColorMap: Record<string, number> = {};
HOME_PATHS.forEach((p, ci) => p.forEach(([r, c]) => { homeColorMap[`${r},${c}`] = ci; }));

interface PD { name: string; colorIndex: number; tokens: number[]; }
interface GD {
  phase: string;
  players: Record<string, PD>;
  turnOrder?: string[];
  turnUid?: string;
  dice?: number;
  diceRolled?: boolean;
  winner?: string | null;
  lastAction?: string;
}

function absPos(ci: number, steps: number) { return (START_ABS[ci] + steps) % 52; }

function tokenXY(ci: number, steps: number, ti: number): [number, number] {
  if (steps < 0) { const [r, c] = BASE_SPOTS[ci][ti]; return [c * C + C / 2, r * C + C / 2]; }
  if (steps >= 52) {
    const hi = Math.min(steps - 52, 5);
    const [r, c] = HOME_PATHS[ci][hi];
    return [c * C + C / 2, r * C + C / 2];
  }
  const a = absPos(ci, steps);
  const [r, c] = MAIN_PATH[a];
  return [c * C + C / 2, r * C + C / 2];
}

function validMoves(p: PD, dice: number): number[] {
  const v: number[] = [];
  for (let i = 0; i < 4; i++) {
    const s = p.tokens[i];
    if (s === 57) continue;
    if (s < 0) { if (dice === 6) v.push(i); }
    else if (s + dice <= 57) v.push(i);
  }
  return v;
}

function fixArr(val: any): number[] {
  if (Array.isArray(val)) return val;
  return [val?.[0] ?? -1, val?.[1] ?? -1, val?.[2] ?? -1, val?.[3] ?? -1];
}

interface VoiceUser { uid: string; name: string; avatar?: string | null; }

interface Props {
  roomId: string;
  userId: string;
  username: string;
  hasControl: boolean;
  onClose: () => void;
  voiceUsers?: VoiceUser[];
  speakingUidsHash?: Set<number>;
  hashCode?: (s: string) => number;
}

export default function ClassicLudo({
  roomId, userId, username, hasControl, onClose,
  voiceUsers = [], speakingUidsHash, hashCode,
}: Props) {
  const [game, setGame] = useState<GD | null>(null);
  const [rolling, setRolling] = useState(false);
  const [diceAnim, setDiceAnim] = useState(1);
  const [localDice, setLocalDice] = useState(0);
  const [selectable, setSelectable] = useState<number[]>([]);
  const [choosing, setChoosing] = useState(false);

  const gRef = ref(db, `roomGames/${roomId}/ludo`);

  useEffect(() => {
    const h = onValue(gRef, snap => {
      if (!snap.exists()) { setGame(null); return; }
      const d = snap.val() as GD;
      if (d.players) Object.values(d.players).forEach((p: any) => { p.tokens = fixArr(p.tokens); });
      if (d.turnOrder && !Array.isArray(d.turnOrder)) d.turnOrder = Object.values(d.turnOrder);
      setGame(d);
    });
    return () => off(gRef, "value", h);
  }, [roomId]);

  useEffect(() => {
    if (game?.turnUid !== userId) { setChoosing(false); setSelectable([]); }
    if (game?.dice && game.turnUid !== userId) setDiceAnim(game.dice);
  }, [game?.turnUid, game?.dice]);

  const createGame = async () => {
    await set(gRef, {
      phase: "waiting",
      players: { [userId]: { name: username, colorIndex: 0, tokens: [-1, -1, -1, -1] } },
    });
    playGameStart();
  };

  const joinAsColor = async (colorIndex: number) => {
    if (!game) return;
    if (game.players[userId]) return;
    const taken = Object.values(game.players).map(p => p.colorIndex);
    if (taken.includes(colorIndex)) return;
    await update(ref(db, `roomGames/${roomId}/ludo/players/${userId}`), {
      name: username, colorIndex, tokens: [-1, -1, -1, -1],
    });
  };

  const startPlaying = async () => {
    if (!game) return;
    const uids = Object.keys(game.players);
    if (uids.length < 2) return;
    await update(gRef, {
      phase: "playing", turnOrder: uids, turnUid: uids[0],
      dice: 0, diceRolled: false, winner: null, lastAction: "Game started!",
    });
    playGameStart();
  };

  const nextTurn = async (bonus: boolean) => {
    if (!game?.turnOrder) return;
    if (bonus) {
      await update(gRef, { diceRolled: false, dice: 0 });
      playTurnSound();
    } else {
      const idx = game.turnOrder.indexOf(game.turnUid!);
      const next = (idx + 1) % game.turnOrder.length;
      await update(gRef, { turnUid: game.turnOrder[next], diceRolled: false, dice: 0 });
      playTurnSound();
    }
  };

  const moveToken = async (ti: number) => {
    if (!game) return;
    const d = localDice;
    const me = game.players[userId];
    const oldS = me.tokens[ti];
    const newS = oldS < 0 ? 0 : oldS + d;
    const newTokens = [...me.tokens];
    newTokens[ti] = newS;
    setChoosing(false);
    setSelectable([]);

    const updates: Record<string, any> = { [`players/${userId}/tokens`]: newTokens };
    let killed = false;

    if (newS >= 0 && newS < 52) {
      const myAbs = absPos(me.colorIndex, newS);
      if (!SAFE_SET.has(myAbs)) {
        for (const [uid, player] of Object.entries(game.players)) {
          if (uid === userId) continue;
          for (let t = 0; t < 4; t++) {
            const ts = player.tokens[t];
            if (ts >= 0 && ts < 52 && absPos(player.colorIndex, ts) === myAbs) {
              const kt = [...player.tokens];
              kt[t] = -1;
              updates[`players/${uid}/tokens`] = kt;
              updates.lastAction = `${cleanName(username)} killed ${cleanName(player.name)}'s token!`;
              killed = true;
            }
          }
        }
      }
    }

    const allHome = newTokens.every(s => s === 57);
    const gotHome = newS === 57 && oldS !== 57;
    if (allHome) {
      updates.winner = userId;
      updates.lastAction = `${cleanName(username)} WINS! \u{1F3C6}`;
      playWinSound();
    } else if (!killed) {
      updates.lastAction = oldS < 0
        ? `${cleanName(username)} moved a token out!`
        : `${cleanName(username)} moved +${d}`;
    }

    await update(gRef, updates);
    if (!allHome) await nextTurn(killed || d === 6 || gotHome);
  };

  const rollDice = async () => {
    if (!game || rolling || game.turnUid !== userId || game.diceRolled) return;
    setRolling(true); setChoosing(false); setSelectable([]);
    playDiceSound();

    let cnt = 0;
    const iv = setInterval(() => { setDiceAnim(Math.floor(Math.random() * 6) + 1); cnt++; if (cnt >= 8) clearInterval(iv); }, 80);
    await new Promise(r => setTimeout(r, 700));
    clearInterval(iv);

    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceAnim(dice);
    setLocalDice(dice);
    setRolling(false);
    await update(gRef, { dice, diceRolled: true });

    const me = game.players[userId];
    const valid = validMoves(me, dice);
    if (valid.length === 0) {
      await update(gRef, { lastAction: `${cleanName(username)} rolled ${dice} - no moves!` });
      setTimeout(() => nextTurn(dice === 6), 800);
    } else if (valid.length === 1) {
      setLocalDice(dice);
      await moveToken(valid[0]);
    } else {
      setSelectable(valid);
      setChoosing(true);
    }
  };

  const handleTokenClick = (ti: number) => {
    if (!choosing || !selectable.includes(ti)) return;
    moveToken(ti);
  };

  const isMyTurn = game?.turnUid === userId;
  const phase = game?.phase;
  const takenColors = game?.players ? Object.values(game.players).map(p => p.colorIndex) : [];
  const myColor = game?.players?.[userId]?.colorIndex;

  // ── Token positions ──
  const tokenRender: { uid: string; ci: number; ti: number; x: number; y: number; steps: number }[] = [];
  if (game?.players) {
    for (const [uid, p] of Object.entries(game.players)) {
      for (let t = 0; t < 4; t++) {
        const [x, y] = tokenXY(p.colorIndex, p.tokens[t], t);
        tokenRender.push({ uid, ci: p.colorIndex, ti: t, x, y, steps: p.tokens[t] });
      }
    }
  }
  const posGroups: Record<string, typeof tokenRender> = {};
  tokenRender.forEach(tp => {
    const k = `${Math.round(tp.x)},${Math.round(tp.y)}`;
    if (!posGroups[k]) posGroups[k] = [];
    posGroups[k].push(tp);
  });
  const tokens = tokenRender.map(tp => {
    const k = `${Math.round(tp.x)},${Math.round(tp.y)}`;
    const g = posGroups[k]; const idx = g.indexOf(tp); const n = g.length;
    let ox = 0, oy = 0;
    if (n === 2) { ox = idx === 0 ? -4 : 4; }
    else if (n === 3) { ox = [-4, 4, 0][idx]; oy = [0, 0, -4][idx]; }
    else if (n >= 4) { ox = idx % 2 === 0 ? -4 : 4; oy = idx < 2 ? -4 : 4; }
    return { ...tp, rx: tp.x + ox, ry: tp.y + oy };
  });

  // ── Board SVG elements ──
  const boardEls: React.ReactNode[] = [];
  const baseCorners: [number, number][] = [[0, 0], [0, 9], [9, 9], [9, 0]];

  baseCorners.forEach(([br, bc], ci) => {
    const isJoinable = phase === "waiting" && !game?.players[userId] && !takenColors.includes(ci);
    boardEls.push(
      <g key={`base${ci}`}
        onClick={() => isJoinable && joinAsColor(ci)}
        style={{ cursor: isJoinable ? "pointer" : "default" }}>
        {/* Outer base square with neon glow */}
        <rect x={bc * C} y={br * C} width={6 * C} height={6 * C} rx={10}
          fill={`url(#baseGrad${ci})`}
          stroke={rgba(ci, 0.85)} strokeWidth={2}
          filter={`url(#glow${ci})`} />
        {/* Inner cut-out where tokens sit */}
        <rect x={(bc + 1) * C} y={(br + 1) * C} width={4 * C} height={4 * C} rx={6}
          fill="rgba(8,4,24,0.85)"
          stroke={rgba(ci, 0.5)} strokeWidth={1.2} />
        {/* Token holding spots — 4 circles with depth */}
        {BASE_SPOTS[ci].map(([sr, sc], si) => (
          <g key={`bs${ci}${si}`}>
            <circle cx={sc * C + C / 2} cy={sr * C + C / 2} r={9}
              fill="rgba(0,0,0,0.55)"
              stroke={rgba(ci, 0.7)} strokeWidth={1.2} />
            <circle cx={sc * C + C / 2 - 1.5} cy={sr * C + C / 2 - 1.5} r={2}
              fill="rgba(255,255,255,0.18)" />
          </g>
        ))}
        {/* "JOIN" badge if open */}
        {isJoinable && (
          <g>
            <rect x={(bc + 1.6) * C} y={(br + 2.6) * C} width={2.8 * C} height={0.85 * C} rx={5}
              fill={rgba(ci, 0.9)} />
            <text x={(bc + 3) * C} y={(br + 3.05) * C}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fontWeight={900} fill="#0d0820"
              style={{ pointerEvents: "none", letterSpacing: 1 }}>
              + JOIN
            </text>
          </g>
        )}
      </g>
    );
  });

  // Path cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inCross = (r <= 5 && c >= 6 && c <= 8) || (r >= 6 && r <= 8) || (r >= 9 && c >= 6 && c <= 8);
      if (!inCross) continue;
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;
      const key = `${r},${c}`;
      const pi = pathIdxMap[key]; const hi = homeColorMap[key];
      let fill = "rgba(255,255,255,0.05)", stroke = "rgba(167,139,250,0.18)";
      if (hi !== undefined) { fill = rgba(hi, 0.35); stroke = rgba(hi, 0.7); }
      if (pi !== undefined && START_ABS.includes(pi)) {
        const si = START_ABS.indexOf(pi);
        fill = rgba(si, 0.55); stroke = rgba(si, 0.9);
      }
      boardEls.push(
        <rect key={`c${key}`} x={c * C + 1} y={r * C + 1} width={C - 2} height={C - 2} rx={3}
          fill={fill} stroke={stroke} strokeWidth={0.8} />
      );
      if (pi !== undefined && SAFE_SET.has(pi) && !START_ABS.includes(pi)) {
        boardEls.push(
          <text key={`s${key}`} x={c * C + C / 2} y={r * C + C / 2 + 1.5}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fill="rgba(255,255,255,0.55)">{"\u2605"}</text>
        );
      }
      if (pi !== undefined && START_ABS.includes(pi)) {
        const si = START_ABS.indexOf(pi);
        const arr = ["\u2192", "\u2193", "\u2190", "\u2191"];
        boardEls.push(
          <text key={`a${key}`} x={c * C + C / 2} y={r * C + C / 2 + 1.5}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={12} fill="#fff" fontWeight={900}>{arr[si]}</text>
        );
      }
    }
  }

  // Center home with 3D depth
  const cx = 7 * C + C / 2, cy = 7 * C + C / 2;
  const tris: [string, number][] = [
    [`${6 * C},${6 * C} ${6 * C},${9 * C} ${cx},${cy}`, 0],
    [`${6 * C},${6 * C} ${9 * C},${6 * C} ${cx},${cy}`, 1],
    [`${9 * C},${6 * C} ${9 * C},${9 * C} ${cx},${cy}`, 2],
    [`${6 * C},${9 * C} ${9 * C},${9 * C} ${cx},${cy}`, 3],
  ];
  tris.forEach(([pts, ci]) => {
    boardEls.push(
      <polygon key={`tr${ci}`} points={pts}
        fill={rgba(ci, 0.45)} stroke={rgba(ci, 0.9)} strokeWidth={1.2} />
    );
  });
  boardEls.push(
    <circle key="fin-glow" cx={cx} cy={cy} r={16}
      fill="url(#centerGrad)" filter="url(#centerGlow)" />
  );
  boardEls.push(
    <circle key="fin" cx={cx} cy={cy} r={12}
      fill="rgba(13,8,32,0.95)" stroke="rgba(255,215,0,0.85)" strokeWidth={1.5} />
  );
  boardEls.push(
    <text key="fint" x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
      fontSize={9} fill="#FFD93D" fontWeight={900}>HOME</text>
  );

  // Tokens with 3D sphere effect
  const tokenEls = tokens.map(tp => {
    const isSel = choosing && tp.uid === userId && selectable.includes(tp.ti);
    const fin = tp.steps === 57;
    const rad = fin ? 6 : 9;
    return (
      <g key={`tk${tp.uid}${tp.ti}`}
        onClick={() => isSel && handleTokenClick(tp.ti)}
        style={{ cursor: isSel ? "pointer" : "default" }}>
        <circle cx={tp.rx + 0.8} cy={tp.ry + 1.2} r={rad}
          fill="rgba(0,0,0,0.5)" />
        <circle cx={tp.rx} cy={tp.ry} r={rad}
          fill={`url(#tk${tp.ci})`}
          stroke={isSel ? "#fff" : "rgba(0,0,0,0.55)"}
          strokeWidth={isSel ? 2 : 1}
          className={isSel ? "ludo-selectable" : ""}
          style={{ filter: `drop-shadow(0 0 ${isSel ? 8 : 3}px ${PC[tp.ci]})`, transition: "all 0.4s ease" }}
        />
        <circle cx={tp.rx - rad * 0.35} cy={tp.ry - rad * 0.35} r={rad * 0.32}
          fill="rgba(255,255,255,0.6)" style={{ pointerEvents: "none" }} />
        {!fin && (
          <text x={tp.rx} y={tp.ry + 0.5} textAnchor="middle" dominantBaseline="middle"
            fontSize={8} fill="#fff" fontWeight={900}
            style={{ pointerEvents: "none", textShadow: "0 1px 1px rgba(0,0,0,0.6)" }}>
            {tp.ti + 1}
          </text>
        )}
      </g>
    );
  });

  const players = game?.players ? Object.entries(game.players) : [];

  // ── UI styles ──
  const NEON_BTN: React.CSSProperties = {
    padding: "12px 24px", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
    color: "#fff", fontSize: 14, fontWeight: 900, cursor: "pointer",
    fontFamily: "'Poppins','Inter',sans-serif",
    boxShadow: "0 0 20px rgba(191,0,255,0.5), 0 0 40px rgba(0,230,230,0.25)",
    letterSpacing: 0.5,
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "radial-gradient(ellipse at center, rgba(15,5,40,0.96) 0%, rgba(5,2,15,0.99) 100%)",
      backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
      maxWidth: 430, margin: "0 auto",
      overflow: "hidden",
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px 8px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 22,
            filter: "drop-shadow(0 0 8px rgba(191,0,255,0.8))",
          }}>{"\u{1F3F0}"}</span>
          <h3 style={{
            fontSize: 17, fontWeight: 900, color: "#fff", margin: 0,
            background: "linear-gradient(90deg,#bf00ff,#00e6e6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: 0.5,
          }}>3D LUDO</h3>
        </div>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: 10,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          color: "#fff", fontSize: 14, cursor: "pointer",
        }}>{"\u2715"}</button>
      </div>

      {/* ── MINI VOICE STRIP (minimized seats) ── */}
      {voiceUsers.length > 0 && (
        <div style={{
          display: "flex", gap: 6, overflowX: "auto", padding: "2px 16px 8px",
          flexShrink: 0, scrollbarWidth: "none",
        }}>
          {voiceUsers.slice(0, 12).map(u => {
            const isSpeaking = speakingUidsHash && hashCode
              ? speakingUidsHash.has(Math.abs(hashCode(u.uid)) % 1000000)
              : false;
            return (
              <div key={u.uid} style={{
                position: "relative", flexShrink: 0,
                width: 36, height: 36, borderRadius: 18,
                background: "linear-gradient(135deg,#1a0f2e,#0d0820)",
                border: isSpeaking ? "2px solid #00e6e6" : "1.5px solid rgba(167,139,250,0.4)",
                boxShadow: isSpeaking ? "0 0 10px rgba(0,230,230,0.7)" : "none",
                overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center",
              }} title={cleanName(u.name)}>
                {u.avatar ? (
                  <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                    {cleanName(u.name).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── PLAYER CHIPS ── */}
      {phase === "playing" && (
        <div style={{
          display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap",
          padding: "0 16px 8px", flexShrink: 0,
        }}>
          {players.map(([uid, p]) => {
            const home = p.tokens.filter(t => t === 57).length;
            const isTurn = game?.turnUid === uid;
            return (
              <div key={uid} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 10,
                background: isTurn ? rgba(p.colorIndex, 0.2) : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isTurn ? PC[p.colorIndex] : "rgba(255,255,255,0.08)"}`,
                boxShadow: isTurn ? `0 0 12px ${rgba(p.colorIndex, 0.6)}` : "none",
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: 5, background: PC[p.colorIndex],
                  boxShadow: `0 0 6px ${PC[p.colorIndex]}`,
                }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {cleanName(p.name)}
                </span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                  {home}/4
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── BOARD (CENTER, FULL VIEW) ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "8px 12px", minHeight: 0, position: "relative",
      }}>
        <div style={{
          position: "relative",
          width: "100%", maxWidth: 380,
          aspectRatio: "1 / 1",
          borderRadius: 22,
          background: "linear-gradient(160deg,#1a0f2e 0%,#0a0418 100%)",
          border: "2px solid rgba(167,139,250,0.5)",
          boxShadow: "0 0 30px rgba(108,92,231,0.4), 0 0 80px rgba(191,0,255,0.25), inset 0 0 30px rgba(0,0,0,0.6)",
          padding: 8,
        }}>
          <svg viewBox={`0 0 ${15 * C} ${15 * C}`} style={{ width: "100%", height: "100%", display: "block" }}>
            <defs>
              {/* Base gradients (3D-look) */}
              {[0, 1, 2, 3].map(ci => (
                <radialGradient key={`bg${ci}`} id={`baseGrad${ci}`} cx="0.3" cy="0.3" r="0.85">
                  <stop offset="0%" stopColor={rgba(ci, 1)} />
                  <stop offset="60%" stopColor={rgba(ci, 0.55)} />
                  <stop offset="100%" stopColor={rgba(ci, 0.2)} />
                </radialGradient>
              ))}
              {/* Token sphere gradients */}
              {[0, 1, 2, 3].map(ci => (
                <radialGradient key={`tk${ci}`} id={`tk${ci}`} cx="0.3" cy="0.3" r="0.85">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="35%" stopColor={PC[ci]} />
                  <stop offset="100%" stopColor={rgba(ci, 0.6)} />
                </radialGradient>
              ))}
              {/* Glow filters */}
              {[0, 1, 2, 3].map(ci => (
                <filter key={`gl${ci}`} id={`glow${ci}`} x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
              <radialGradient id="centerGrad" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="rgba(255,215,61,0.8)" />
                <stop offset="100%" stopColor="rgba(255,215,61,0)" />
              </radialGradient>
              <filter id="centerGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            {boardEls}
            {tokenEls}
          </svg>

          {/* ── WAITING-PHASE OVERLAY (no text dialog — instructions on board) ── */}
          {phase === "waiting" && (
            <div style={{
              position: "absolute", left: 0, right: 0, bottom: 14,
              display: "flex", justifyContent: "center",
              pointerEvents: "none",
            }}>
              <div style={{
                background: "rgba(13,8,32,0.85)", backdropFilter: "blur(6px)",
                border: "1px solid rgba(167,139,250,0.4)",
                borderRadius: 12, padding: "6px 14px",
                color: "#fff", fontSize: 11, fontWeight: 700,
                boxShadow: "0 0 18px rgba(108,92,231,0.4)",
              }}>
                {!game?.players[userId]
                  ? "\u{1F3AF}  Tap a colored corner to join"
                  : `${players.length}/4 joined  \u00B7  ${hasControl ? "Press Start" : "Waiting for host"}`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CONTROLS ── */}
      <div style={{
        padding: "10px 16px 18px", flexShrink: 0,
        background: "linear-gradient(180deg, transparent 0%, rgba(13,8,32,0.6) 50%)",
      }}>
        {!game ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            {hasControl ? (
              <button onClick={createGame} style={NEON_BTN}>
                {"\u{1F3B2}"} Create Ludo Game
              </button>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0, textAlign: "center" }}>
                Waiting for host to create a game...
              </p>
            )}
          </div>
        ) : phase === "waiting" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
            {hasControl && players.length >= 2 && (
              <button onClick={startPlaying} style={NEON_BTN}>
                {"\u25B6"} Start Game ({players.length} players)
              </button>
            )}
            {!game.players[userId] && players.length < 4 && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: 0 }}>
                Pick any open corner above to enter the game
              </p>
            )}
          </div>
        ) : game.winner ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, filter: "drop-shadow(0 0 10px #FFD93D)" }}>{"\u{1F3C6}"}</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#FFD93D", marginBottom: 10 }}>
              {cleanName(game.players[game.winner]?.name)} Wins!
            </div>
            {hasControl && (
              <button onClick={createGame} style={NEON_BTN}>Play Again</button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            {/* ── BIG NEON DICE ── */}
            <div className={rolling ? "dice-rolling" : ""} style={{
              width: 64, height: 64, borderRadius: 14,
              background: "linear-gradient(135deg,#1a0f2e,#0d0820)",
              border: `2px solid ${myColor !== undefined ? PC[myColor] : "#00e6e6"}`,
              boxShadow: `0 0 18px ${myColor !== undefined ? rgba(myColor, 0.8) : "rgba(0,230,230,0.7)"}, inset 0 0 12px rgba(0,0,0,0.5)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 40, color: "#fff",
              textShadow: `0 0 10px ${myColor !== undefined ? PC[myColor] : "#00e6e6"}`,
            }}>
              {DICE_DOTS[diceAnim] || diceAnim}
            </div>

            {/* ── ROLL BUTTON / STATUS ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
              {isMyTurn && !game.diceRolled && !choosing ? (
                <button onClick={rollDice} disabled={rolling}
                  style={{ ...NEON_BTN, padding: "12px 18px", fontSize: 14 }}>
                  {rolling ? "Rolling..." : "\u{1F3B2}  ROLL DICE"}
                </button>
              ) : isMyTurn && choosing ? (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(0,230,230,0.15)",
                  border: "1.5px solid #00e6e6",
                  color: "#00e6e6", fontSize: 12, fontWeight: 800, textAlign: "center",
                }}>
                  Tap a glowing token to move!
                </div>
              ) : (
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 700, textAlign: "center",
                }}>
                  {game.turnUid && game.players[game.turnUid]
                    ? `${cleanName(game.players[game.turnUid].name)}'s turn`
                    : "Waiting..."}
                </div>
              )}
              {game.lastAction && (
                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.45)",
                  textAlign: "center", whiteSpace: "nowrap",
                  overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {game.lastAction}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
