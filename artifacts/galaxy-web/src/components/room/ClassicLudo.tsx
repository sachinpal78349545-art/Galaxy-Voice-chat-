import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, set } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

const C = 18; 
const PC = ["#00F0FF", "#FF007A", "#39FF14", "#FFCC00"]; 
const _CN = ["CyberBlue", "NeonPink", "MatrixGreen", "QuantumGold"]; void _CN;
const RGB: [number, number, number][] = [[0, 240, 255], [255, 0, 122], [57, 255, 20], [255, 204, 0]];
const START_ABS = [0, 13, 26, 39];
const SAFE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const DICE_DOTS: Record<number, string> = { 1: "⚀", 2: "⚁", 3: "⚂", 4: "⚃", 5: "⚄", 6: "⚅" };

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
      dice: 0, diceRolled: false, winner: null, lastAction: "Universe portal active!",
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
              updates.lastAction = `${cleanName(username)} atomized ${cleanName(player.name)}!`;
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
      updates.lastAction = `${cleanName(username)} conquered the core!`;
      playWinSound();
    } else if (!killed) {
      updates.lastAction = oldS < 0
        ? `${cleanName(username)} spawned a drone!`
        : `${cleanName(username)} warp +${d}`;
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
      await update(gRef, { lastAction: `Rolled ${dice} - Locked out!` });
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
    if (n === 2) { ox = idx === 0 ? -3 : 3; }
    else if (n === 3) { ox = [-3, 3, 0][idx]; oy = [0, 0, -3][idx]; }
    else if (n >= 4) { ox = idx % 2 === 0 ? -3 : 3; oy = idx < 2 ? -3 : 3; }
    return { ...tp, rx: tp.x + ox, ry: tp.y + oy };
  });

  const boardEls: React.ReactNode[] = [];
  const baseCorners: [number, number][] = [[0, 0], [0, 9], [9, 9], [9, 0]];

  // 1. Cyber Circuit Line Overlay inside Base Layout (Anti-ChaloTalk)
  baseCorners.forEach(([br, bc], ci) => {
    const isJoinable = phase === "waiting" && !game?.players[userId] && !takenColors.includes(ci);
    boardEls.push(
      <g key={`base${ci}`}
        onClick={() => isJoinable && joinAsColor(ci)}
        style={{ cursor: isJoinable ? "pointer" : "default" }}>
        <rect x={bc * C} y={br * C} width={6 * C} height={6 * C} rx={12}
          fill={`url(#baseGrad${ci})`}
          stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        {/* Subtle geometric technical lines inside corners */}
        <path d={`M ${bc * C + 4} ${br * C + 4} L ${(bc + 2) * C} ${br * C + 4} L ${(bc + 3) * C} ${(br + 1) * C}`} 
          fill="none" stroke={rgba(ci, 0.25)} strokeWidth={1} />
        <rect x={(bc + 1) * C} y={(br + 1) * C} width={4 * C} height={4 * C} rx={8}
          fill="#05020d"
          stroke={rgba(ci, 0.35)} strokeWidth={1} />
        {BASE_SPOTS[ci].map(([sr, sc], si) => (
          <g key={`bs${ci}${si}`}>
            <circle cx={sc * C + C / 2} cy={sr * C + C / 2} r={4.5}
              fill={rgba(ci, 0.2)} stroke={PC[ci]} strokeWidth={1} />
          </g>
        ))}
        {isJoinable && (
          <text x={(bc + 3) * C} y={(br + 3) * C + 2}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fontWeight={900} fill="#00F0FF" letterSpacing={0.5}>+ DOCK</text>
        )}
      </g>
    );
  });

  // 2. Track Rendering with Premium Tech Background Grid Filling
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inCross = (r <= 5 && c >= 6 && c <= 8) || (r >= 6 && r <= 8) || (r >= 9 && c >= 6 && c <= 8);
      if (!inCross) continue;
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;
      const key = `${r},${c}`;
      const pi = pathIdxMap[key]; const hi = homeColorMap[key];
      let fill = "rgba(10, 4, 28, 0.6)", stroke = "rgba(139,92,246,0.08)";
      if (hi !== undefined) { fill = rgba(hi, 0.2); stroke = rgba(hi, 0.4); }
      if (pi !== undefined && START_ABS.includes(pi)) {
        const si = START_ABS.indexOf(pi);
        fill = rgba(si, 0.35); stroke = PC[si];
      }
      boardEls.push(
        <rect key={`c${key}`} x={c * C + 1} y={r * C + 1} width={C - 2} height={C - 2} rx={2.5}
          fill={fill} stroke={stroke} strokeWidth={0.6} />
      );
      if (pi !== undefined && SAFE_SET.has(pi) && !START_ABS.includes(pi)) {
        boardEls.push(
          <circle key={`s${key}`} cx={c * C + C / 2} cy={r * C + C / 2} r={2}
            fill="#fff" style={{ filter: "drop-shadow(0 0 2px #fff)" }} />
        );
      }
    }
  }

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
        fill={rgba(ci, 0.12)} stroke={rgba(ci, 0.35)} strokeWidth={1} />
    );
  });
  boardEls.push(
    <circle key="fin" cx={cx} cy={cy} r={11}
      fill="#05010d" stroke="url(#quantumCore)" strokeWidth={1.5} />
  );
  boardEls.push(
    <text key="fint" x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle"
      fontSize={5.5} fill="#00F0FF" fontWeight={900} letterSpacing={0.5}>CORE</text>
  );

  const tokenEls = tokens.map(tp => {
    const isSel = choosing && tp.uid === userId && selectable.includes(tp.ti);
    const fin = tp.steps === 57;
    const rad = fin ? 3.5 : 6;
    return (
      <g key={`tk${tp.uid}${tp.ti}`}
        onClick={() => isSel && handleTokenClick(tp.ti)}
        style={{ cursor: isSel ? "pointer" : "default" }}>
        <circle cx={tp.rx} cy={tp.ry} r={rad}
          fill={`url(#tk${tp.ci})`}
          stroke={isSel ? "#fff" : "rgba(0,0,0,0.35)"}
          strokeWidth={isSel ? 1.2 : 0.8}
          style={{ 
            filter: isSel ? `drop-shadow(0 0 6px ${PC[tp.ci]})` : `drop-shadow(0 0 3px ${rgba(tp.ci, 0.4)})`, 
            transition: "all 0.2s ease-out" 
          }}
        />
        {!fin && (
          <circle cx={tp.rx} cy={tp.ry} r={1} fill="#fff" opacity={0.8} />
        )}
      </g>
    );
  });

  const players = game?.players ? Object.entries(game.players) : [];

  return (
    <div style={{
      background: "linear-gradient(160deg, #0b051f 0%, #030107 100%)",
      borderRadius: 20,
      padding: "10px 10px 14px 10px",
      border: "1px solid rgba(0, 240, 255, 0.12)",
      boxShadow: "0 15px 40px rgba(0,0,0,0.8)",
      display: "flex",
      flexDirection: "column",
      maxHeight: "100%", 
      boxSizing: "border-box"
    }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#00F0FF", boxShadow: "0 0 6px #00F0FF" }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "0.8px" }}>QUANTUM VECTOR</span>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 16,
          color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer", padding: "3px 8px"
        }}>DISCONNECT</button>
      </div>

      {/* Mic Feed */}
      {voiceUsers.length > 0 && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 6, flexShrink: 0 }}>
          {voiceUsers.slice(0, 6).map(u => {
            const isSpeaking = speakingUidsHash && hashCode ? speakingUidsHash.has(Math.abs(hashCode(u.uid)) % 1000000) : false;
            return (
              <div key={u.uid} style={{
                width: 26, height: 26, borderRadius: "50%", background: "#0c061c",
                border: isSpeaking ? "1.5px solid #00F0FF" : "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff"
              }}>
                {u.avatar ? <img src={u.avatar} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : u.name.charAt(0).toUpperCase()}
              </div>
            );
          })}
        </div>
      )}

      {/* Main Board Container with Cyber Circuit Canvas Background */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 250, 
        margin: "0 auto 6px auto",
        aspectRatio: "1 / 1",
        // Anti-ChaloTalk Background Texture embedded directly via CSS linear lines
        background: `
          radial-gradient(circle at 50% 50%, rgba(15, 7, 45, 0.95), rgba(4, 2, 12, 0.99)),
          linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
        `,
        backgroundSize: "100% 100%, 12px 12px, 12px 12px",
        borderRadius: 14,
        padding: 5,
        flexShrink: 0, 
        border: "1px solid rgba(139, 92, 246, 0.15)",
        boxShadow: "inset 0 0 20px rgba(0,0,0,0.6)"
      }}>
        <svg viewBox={`0 0 ${15 * C} ${15 * C}`} style={{ width: "100%", height: "100%", display: "block" }}>
          <defs>
            {/* Added a custom tech circuit line layout behind elements inside SVG definitions */}
            <pattern id="cyberGrid" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(0, 240, 255, 0.02)" strokeWidth="0.5"/>
            </pattern>
            <linearGradient id="quantumCore" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" />
              <stop offset="100%" stopColor="#FF007A" />
            </linearGradient>
            {[0, 1, 2, 3].map(ci => (
              <radialGradient key={`bg${ci}`} id={`baseGrad${ci}`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={rgba(ci, 0.22)} />
                <stop offset="100%" stopColor="rgba(4, 2, 14, 0.98)" />
              </radialGradient>
            ))}
            {[0, 1, 2, 3].map(ci => (
              <radialGradient key={`tk${ci}`} id={`tk${ci}`} cx="35%" cy="35%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor={PC[ci]} />
                <stop offset="100%" stopColor="#030008" />
              </radialGradient>
            ))}
          </defs>
          {/* Base Grid Layer */}
          <rect width={15 * C} height={15 * C} fill="url(#cyberGrid)" pointerEvents="none" />
          {boardEls}
          {tokenEls}
        </svg>
      </div>

      {/* Sync State Users Track */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 8, flexShrink: 0 }}>
        {players.map(([uid, p]) => {
          const home = p.tokens.filter(t => t === 57).length;
          const isTurn = game?.turnUid === uid;
          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 14,
              background: isTurn ? "rgba(255,255,255,0.04)" : "transparent",
              border: `1px solid ${isTurn ? PC[p.colorIndex] : "rgba(255,255,255,0.03)"}`,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: PC[p.colorIndex], boxShadow: `0 0 4px ${PC[p.colorIndex]}` }} />
              <span style={{ fontSize: 9, fontWeight: 600, color: isTurn ? "#fff" : "rgba(255,255,255,0.5)" }}>{cleanName(p.name)}</span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{home}/4</span>
            </div>
          );
        })}
      </div>

      {/* Bottom Panel Terminal Controls */}
      <div style={{ marginTop: "auto", flexShrink: 0 }}>
        {!game ? (
          hasControl ? (
            <button onClick={createGame} style={{
              width: "100%", padding: "9px 0", borderRadius: 12,
              background: "linear-gradient(90deg, #00F0FF, #FF007A)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: "0.5px",
              cursor: "pointer", boxShadow: "0 3px 10px rgba(0,240,255,0.2)"
            }}>INITIALIZE VECTOR</button>
          ) : (
            <p style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 }}>AWAITING NODE SYSTEM CREATION...</p>
          )
        ) : phase === "waiting" ? (
          <div>
            {hasControl && players.length >= 2 && (
              <button onClick={startPlaying} style={{
                width: "100%", padding: "9px 0", borderRadius: 12,
                background: "linear-gradient(90deg, #39FF14, #00F0FF)",
                border: "none", color: "#000", fontWeight: 900, fontSize: 11, letterSpacing: "0.5px",
                cursor: "pointer"
              }}>LAUNCH GRID ({players.length} PLUGGED)</button>
            )}
            {!game.players[userId] && players.length < 4 && (
              <p style={{ fontSize: 9, textAlign: "center", color: "#00F0FF", letterSpacing: 0.3 }}>
                ⚡ TAP AN EMPTY NODE TO SYNC MATRIX
              </p>
            )}
          </div>
        ) : game.winner ? (
          <div style={{ textAlign: "center", background: "rgba(255,204,0,0.03)", padding: "6px", borderRadius: 10, border: "1px solid rgba(255,204,0,0.3)" }}>
            <span style={{ fontSize: 10, fontWeight: 900, color: "#FFCC00" }}>👑 CORE CONQUERED BY {cleanName(game.players[game.winner]?.name).toUpperCase()}!</span>
            {hasControl && (
              <button onClick={createGame} style={{
                marginLeft: 8, padding: "2px 8px", borderRadius: 6,
                background: "rgba(255,255,255,0.08)", border: "none", color: "#fff", fontSize: 9, fontWeight: 700, cursor: "pointer"
              }}>REBOOT</button>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            {/* Geometric Dice Box */}
            <div style={{
              width: 42, height: 42, borderRadius: 10, background: "#05020a",
              border: `2px solid ${myColor !== undefined ? PC[myColor] : "#00F0FF"}`,
              boxShadow: `0 0 10px ${myColor !== undefined ? rgba(myColor, 0.3) : "rgba(0,240,255,0.2)"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, color: myColor !== undefined ? PC[myColor] : "#fff", flexShrink: 0
            }}>
              {DICE_DOTS[diceAnim] || diceAnim}
            </div>

            <div style={{ flex: 1 }}>
              {isMyTurn && !game.diceRolled && !choosing ? (
                <button onClick={rollDice} disabled={rolling}
                  style={{
                    width: "100%", padding: "9px 0", borderRadius: 12,
                    background: "linear-gradient(90deg, #00F0FF, #9400D3)",
                    border: "none", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: "0.5px",
                    cursor: "pointer"
                  }}>{rolling ? "CYCLING..." : "TRIGGER MATRIX"}</button>
            ) : isMyTurn && choosing ? (
                <div style={{
                  padding: "7px 0", borderRadius: 10, background: "rgba(255, 0, 122, 0.08)",
                  border: "1px solid #FF007A", color: "#FF007A",
                  fontSize: 9, fontWeight: 800, textAlign: "center", letterSpacing: 0.5,
                }}>SELECT DRONE POD!</div>
              ) : (
                <div style={{
                  padding: "7px 0", borderRadius: 10, background: "rgba(255,255,255,0.01)",
                  border: "1px solid rgba(255,255,255,0.04)",
                  fontSize: 9, color: "rgba(255,255,255,0.4)", textAlign: "center", letterSpacing: 0.5
                }}>{game.turnUid && game.players[game.turnUid] ? `${cleanName(game.players[game.turnUid].name).toUpperCase()} PROCESSING...` : "SYNCING"}</div>
              )}
              {game.lastAction && (
                <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", textAlign: "center", marginTop: 4, fontFamily: "monospace" }}>
                  &gt; {game.lastAction}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
