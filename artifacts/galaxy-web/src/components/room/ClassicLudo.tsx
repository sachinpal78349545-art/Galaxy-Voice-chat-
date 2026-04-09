import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, set } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

const C = 20;
const PC = ["#FF4444", "#44FF88", "#4488FF", "#FFD700"];
const CN = ["Red", "Green", "Blue", "Yellow"];
const RGB: [number,number,number][] = [[255,68,68],[68,255,136],[68,136,255],[255,215,0]];
const START_ABS = [0, 13, 26, 39];
const SAFE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
const DICE_DOTS: Record<number,string> = {1:"\u2680",2:"\u2681",3:"\u2682",4:"\u2683",5:"\u2684",6:"\u2685"};

function rgba(ci: number, a: number) {
  const [r,g,b] = RGB[ci]; return `rgba(${r},${g},${b},${a})`;
}

const MAIN_PATH: [number,number][] = [
  [6,1],[6,2],[6,3],[6,4],[6,5],
  [5,6],[4,6],[3,6],[2,6],[1,6],[0,6],
  [0,7],[0,8],
  [1,8],[2,8],[3,8],[4,8],[5,8],
  [6,9],[6,10],[6,11],[6,12],[6,13],[6,14],
  [7,14],[8,14],
  [8,13],[8,12],[8,11],[8,10],[8,9],
  [9,8],[10,8],[11,8],[12,8],[13,8],[14,8],
  [14,7],[14,6],
  [13,6],[12,6],[11,6],[10,6],[9,6],
  [8,5],[8,4],[8,3],[8,2],[8,1],[8,0],
  [7,0],[6,0],
];

const HOME_PATHS: [number,number][][] = [
  [[7,1],[7,2],[7,3],[7,4],[7,5],[7,6]],
  [[1,7],[2,7],[3,7],[4,7],[5,7],[6,7]],
  [[7,13],[7,12],[7,11],[7,10],[7,9],[7,8]],
  [[13,7],[12,7],[11,7],[10,7],[9,7],[8,7]],
];

const BASE_SPOTS: [number,number][][] = [
  [[2,2],[2,3],[3,2],[3,3]],
  [[2,11],[2,12],[3,11],[3,12]],
  [[11,11],[11,12],[12,11],[12,12]],
  [[11,2],[11,3],[12,2],[12,3]],
];

const pathIdxMap: Record<string,number> = {};
MAIN_PATH.forEach(([r,c],i) => { pathIdxMap[`${r},${c}`] = i; });
const homeColorMap: Record<string,number> = {};
HOME_PATHS.forEach((p,ci) => p.forEach(([r,c]) => { homeColorMap[`${r},${c}`] = ci; }));

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

function tokenXY(ci: number, steps: number, ti: number): [number,number] {
  if (steps < 0) { const [r,c] = BASE_SPOTS[ci][ti]; return [c*C+C/2, r*C+C/2]; }
  if (steps >= 52) {
    const hi = Math.min(steps - 52, 5);
    const [r,c] = HOME_PATHS[ci][hi];
    return [c*C+C/2, r*C+C/2];
  }
  const a = absPos(ci, steps);
  const [r,c] = MAIN_PATH[a];
  return [c*C+C/2, r*C+C/2];
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
  return [val?.[0]??-1, val?.[1]??-1, val?.[2]??-1, val?.[3]??-1];
}

interface Props {
  roomId: string; userId: string; username: string; hasControl: boolean; onClose: () => void;
}

export default function ClassicLudo({ roomId, userId, username, hasControl, onClose }: Props) {
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
      players: { [userId]: { name: username, colorIndex: 0, tokens: [-1,-1,-1,-1] } },
    });
    playGameStart();
  };

  const joinGame = async () => {
    if (!game) return;
    const count = Object.keys(game.players).length;
    if (count >= 4 || game.players[userId]) return;
    await update(ref(db, `roomGames/${roomId}/ludo/players/${userId}`), {
      name: username, colorIndex: count, tokens: [-1,-1,-1,-1],
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
    const iv = setInterval(() => { setDiceAnim(Math.floor(Math.random()*6)+1); cnt++; if(cnt>=8) clearInterval(iv); }, 80);
    await new Promise(r => setTimeout(r, 700));
    clearInterval(iv);

    const dice = Math.floor(Math.random()*6)+1;
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

  const tokenRender: { uid:string; ci:number; ti:number; x:number; y:number; steps:number }[] = [];
  if (game?.players) {
    for (const [uid, p] of Object.entries(game.players)) {
      for (let t = 0; t < 4; t++) {
        const [x,y] = tokenXY(p.colorIndex, p.tokens[t], t);
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
    if (n === 2) { ox = idx===0 ? -3 : 3; }
    else if (n === 3) { ox = [-3,3,0][idx]; oy = [0,0,-3][idx]; }
    else if (n >= 4) { ox = idx%2===0?-3:3; oy = idx<2?-3:3; }
    return { ...tp, rx: tp.x+ox, ry: tp.y+oy };
  });

  const boardEls: React.ReactNode[] = [];
  const baseCorners: [number,number][] = [[0,0],[0,9],[9,9],[9,0]];
  baseCorners.forEach(([br,bc], ci) => {
    boardEls.push(
      <rect key={`b${ci}`} x={bc*C} y={br*C} width={6*C} height={6*C} rx={6}
        fill={rgba(ci,0.08)} stroke={rgba(ci,0.2)} strokeWidth={1} />
    );
    boardEls.push(
      <rect key={`bi${ci}`} x={(bc+0.8)*C} y={(br+0.8)*C} width={4.4*C} height={4.4*C} rx={4}
        fill={rgba(ci,0.06)} stroke={rgba(ci,0.15)} strokeWidth={0.5} />
    );
    BASE_SPOTS[ci].forEach(([sr,sc], si) => {
      boardEls.push(
        <circle key={`bs${ci}${si}`} cx={sc*C+C/2} cy={sr*C+C/2} r={6}
          fill={rgba(ci,0.1)} stroke={rgba(ci,0.25)} strokeWidth={0.5} />
      );
    });
  });

  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      const inCross = (r<=5&&c>=6&&c<=8)||(r>=6&&r<=8)||(r>=9&&c>=6&&c<=8);
      if (!inCross) continue;
      if (r>=6&&r<=8&&c>=6&&c<=8) continue;
      const key = `${r},${c}`;
      const pi = pathIdxMap[key]; const hi = homeColorMap[key];
      let fill = "rgba(255,255,255,0.04)", stroke = "rgba(255,255,255,0.08)";
      if (hi !== undefined) { fill = rgba(hi,0.1); stroke = rgba(hi,0.2); }
      if (pi !== undefined && START_ABS.includes(pi)) {
        const si = START_ABS.indexOf(pi);
        fill = rgba(si,0.2); stroke = rgba(si,0.4);
      }
      boardEls.push(
        <rect key={`c${key}`} x={c*C+0.5} y={r*C+0.5} width={C-1} height={C-1} rx={2}
          fill={fill} stroke={stroke} strokeWidth={0.5} />
      );
      if (pi !== undefined && SAFE_SET.has(pi) && !START_ABS.includes(pi)) {
        boardEls.push(
          <text key={`s${key}`} x={c*C+C/2} y={r*C+C/2+1} textAnchor="middle"
            dominantBaseline="middle" fontSize={9} fill="rgba(255,255,255,0.3)">{"\u2605"}</text>
        );
      }
      if (pi !== undefined && START_ABS.includes(pi)) {
        const si = START_ABS.indexOf(pi);
        const arr = ["\u2192","\u2193","\u2190","\u2191"];
        boardEls.push(
          <text key={`a${key}`} x={c*C+C/2} y={r*C+C/2+1} textAnchor="middle"
            dominantBaseline="middle" fontSize={9} fill={PC[si]}>{arr[si]}</text>
        );
      }
    }
  }

  const cx = 7*C+C/2, cy = 7*C+C/2;
  const tris: [string,number][] = [
    [`${6*C},${6*C} ${6*C},${9*C} ${cx},${cy}`, 0],
    [`${6*C},${6*C} ${9*C},${6*C} ${cx},${cy}`, 1],
    [`${9*C},${6*C} ${9*C},${9*C} ${cx},${cy}`, 2],
    [`${6*C},${9*C} ${9*C},${9*C} ${cx},${cy}`, 3],
  ];
  tris.forEach(([pts,ci]) => {
    boardEls.push(
      <polygon key={`tr${ci}`} points={pts} fill={rgba(ci,0.15)} stroke={rgba(ci,0.3)} strokeWidth={0.5} />
    );
  });
  boardEls.push(
    <circle key="fin" cx={cx} cy={cy} r={8} fill="rgba(108,92,231,0.3)" stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
  );
  boardEls.push(
    <text key="fint" x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
      fontSize={6} fill="rgba(255,255,255,0.5)" fontWeight={700}>HOME</text>
  );

  const tokenEls = tokens.map(tp => {
    const isSel = choosing && tp.uid === userId && selectable.includes(tp.ti);
    const fin = tp.steps === 57;
    const rad = fin ? 5 : 7;
    return (
      <g key={`tk${tp.uid}${tp.ti}`}
        onClick={() => isSel && handleTokenClick(tp.ti)}
        style={{ cursor: isSel ? "pointer" : "default" }}>
        <circle cx={tp.rx} cy={tp.ry} r={rad}
          fill={PC[tp.ci]}
          stroke={isSel ? "#fff" : "rgba(0,0,0,0.4)"}
          strokeWidth={isSel ? 2 : 1}
          className={isSel ? "ludo-selectable" : ""}
          style={{ filter: `drop-shadow(0 0 ${isSel?6:2}px ${PC[tp.ci]})`, transition: "all 0.4s ease" }}
        />
        {!fin && (
          <text x={tp.rx} y={tp.ry+0.5} textAnchor="middle" dominantBaseline="middle"
            fontSize={7} fill="#fff" fontWeight={800} style={{ pointerEvents: "none" }}>
            {tp.ti+1}
          </text>
        )}
      </g>
    );
  });

  const players = game?.players ? Object.entries(game.players) : [];

  const GBTN: React.CSSProperties = {
    padding: "10px 0", width: "100%", borderRadius: 14, border: "none",
    background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
    color: "#fff", fontSize: 13, fontWeight: 800, cursor: "pointer",
    fontFamily: "'Poppins','Inter',sans-serif",
    boxShadow: "0 0 20px rgba(191,0,255,0.3)",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div style={{
        position: "relative", zIndex: 1,
        background: "linear-gradient(160deg, #1A0F2E 0%, #0d0820 100%)",
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        border: "1px solid rgba(108,92,231,0.4)", borderBottom: "none",
        padding: "12px 16px 20px", maxHeight: "78vh", overflowY: "auto",
        scrollbarWidth: "none",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: "#fff", margin: 0 }}>
            {"\u265F\uFE0F"} Classic Ludo
          </h3>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.1)", border: "none", cursor: "pointer",
            borderRadius: 8, padding: "4px 10px", color: "rgba(255,255,255,0.5)",
            fontSize: 12, fontFamily: "'Poppins','Inter',sans-serif",
          }}>{"\u2715"}</button>
        </div>

        {!game ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            {hasControl ? (
              <button onClick={createGame} style={GBTN}>{"\u{1F3B2}"} Create Ludo Game</button>
            ) : (
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Waiting for host to create a game...</p>
            )}
          </div>
        ) : phase === "waiting" ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>
              {Object.keys(game.players).length}/4 players joined
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
              {players.map(([uid, p]) => (
                <div key={uid} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  borderRadius: 10, background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${rgba(p.colorIndex, 0.3)}`,
                }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: PC[p.colorIndex],
                    boxShadow: `0 0 4px ${PC[p.colorIndex]}` }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: PC[p.colorIndex] }}>
                    {cleanName(p.name)} ({CN[p.colorIndex]})
                  </span>
                </div>
              ))}
            </div>
            {!game.players[userId] && Object.keys(game.players).length < 4 && (
              <button onClick={joinGame} style={{ ...GBTN, marginBottom: 8 }}>{"\u{1F3AE}"} Join Game</button>
            )}
            {game.players[userId] && !hasControl && (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Waiting for host to start...</p>
            )}
            {hasControl && Object.keys(game.players).length >= 2 && (
              <button onClick={startPlaying} style={GBTN}>
                {"\u25B6"} Start! ({Object.keys(game.players).length} players)
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 6, justifyContent: "center", flexWrap: "wrap" }}>
              {players.map(([uid, p]) => {
                const home = p.tokens.filter(t => t === 57).length;
                return (
                  <div key={uid} style={{
                    display: "flex", alignItems: "center", gap: 3, padding: "2px 8px",
                    borderRadius: 6, fontSize: 9, fontWeight: 700,
                    background: game.turnUid===uid ? "rgba(0,255,255,0.1)" : "rgba(255,255,255,0.03)",
                    border: game.turnUid===uid ? "1px solid rgba(0,255,255,0.3)" : "1px solid transparent",
                    color: PC[p.colorIndex],
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: 3, background: PC[p.colorIndex],
                      boxShadow: `0 0 3px ${PC[p.colorIndex]}` }} />
                    {cleanName(p.name)}
                    {home > 0 && <span style={{ color: "rgba(255,255,255,0.5)" }}>{home}/4</span>}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
              <svg viewBox="0 0 300 300" style={{ width: "100%", maxWidth: 300, borderRadius: 12, background: "#0d0820" }}>
                {boardEls}
                {tokenEls}
              </svg>
            </div>

            {game.lastAction && (
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textAlign: "center", marginBottom: 4 }}>
                {game.lastAction}
              </p>
            )}

            {game.winner ? (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 28 }}>{"\u{1F3C6}"}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>
                  {cleanName(game.players[game.winner]?.name)} Wins!
                </div>
                {hasControl && (
                  <button onClick={createGame} style={{ ...GBTN, marginTop: 8 }}>Play Again</button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div className={`dice-face ${rolling ? "dice-rolling" : ""}`}
                  style={{ width: 40, height: 40, fontSize: 24, borderRadius: 10 }}>
                  {DICE_DOTS[diceAnim] || diceAnim}
                </div>
                {isMyTurn && !game.diceRolled && !choosing ? (
                  <button onClick={rollDice} disabled={rolling} style={{
                    ...GBTN, width: "auto", padding: "8px 24px", fontSize: 12,
                  }}>
                    {rolling ? "Rolling..." : "\u{1F3B2} Roll!"}
                  </button>
                ) : isMyTurn && choosing ? (
                  <span style={{ fontSize: 11, color: "#00ffff", fontWeight: 700 }}>
                    Tap a glowing token to move!
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                    {game.turnUid && game.players[game.turnUid]
                      ? `${cleanName(game.players[game.turnUid].name)}'s turn`
                      : ""}
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
