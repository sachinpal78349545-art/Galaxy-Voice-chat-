import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useApp } from '../lib/context';
import { updateUserProfile, updateUserCoins } from '../lib/fbAuth';
import { Trophy, Loader } from 'lucide-react';

interface LeaderEntry {
  uid: string;
  customUID: string;
  displayName: string;
  photoURL: string;
  coins: number;
  level: number;
  totalGiftsReceived: number;
}

const MEDALS = ['🥇', '🥈', '🥉'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Static demo entries to fill the leaderboard
const DEMO_ENTRIES: LeaderEntry[] = [
  { uid: 'lb1', customUID: 'UID100001', displayName: 'StarGazer',   photoURL: '🌟', coins: 99999, level: 10, totalGiftsReceived: 450 },
  { uid: 'lb2', customUID: 'UID100002', displayName: 'MoonDancer',  photoURL: '🌙', coins: 78500, level: 9,  totalGiftsReceived: 310 },
  { uid: 'lb3', customUID: 'UID100003', displayName: 'CosmoKid',    photoURL: '🚀', coins: 62000, level: 9,  totalGiftsReceived: 280 },
  { uid: 'lb4', customUID: 'UID100004', displayName: 'NebulaDream', photoURL: '💫', coins: 45000, level: 8,  totalGiftsReceived: 200 },
  { uid: 'lb5', customUID: 'UID100005', displayName: 'BeatMaker',   photoURL: '🎵', coins: 33000, level: 7,  totalGiftsReceived: 180 },
  { uid: 'lb6', customUID: 'UID100006', displayName: 'NightOwl',    photoURL: '🦉', coins: 22000, level: 6,  totalGiftsReceived: 120 },
];

function canClaimToday(uid: string): boolean {
  const key = `gv_daily_${uid}`;
  const last = Number(localStorage.getItem(key) || '0');
  return Date.now() - last >= DAY_MS;
}

function markClaimed(uid: string) {
  localStorage.setItem(`gv_daily_${uid}`, String(Date.now()));
}

export function LeaderboardPage({ onClose }: { onClose: () => void }) {
  const { currentUser, refreshUser, showGiftAnimation } = useApp();
  const [tab, setTab] = useState<'coins' | 'gifts'>('coins');
  const [entries, setEntries] = useState<LeaderEntry[]>(DEMO_ENTRIES);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const canClaim = currentUser ? canClaimToday(currentUser.uid) : false;

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'users'), orderBy('coins', 'desc'), limit(20));
        const snap = await getDocs(q);
        const real: LeaderEntry[] = snap.docs.map(d => {
          const data = d.data();
          return {
            uid: data.uid,
            customUID: data.customUID || data.uid.slice(0, 8),
            displayName: data.displayName,
            photoURL: data.photoURL,
            coins: data.coins || 0,
            level: data.level || 1,
            totalGiftsReceived: data.totalGiftsReceived || 0,
          };
        });
        // Merge real + demo, dedup by uid, sort
        const merged = [...real, ...DEMO_ENTRIES.filter(d => !real.find(r => r.uid === d.uid))];
        setEntries(merged);
      } catch { /* fallback to demo */ }
      setLoading(false);
    }
    load();
  }, []);

  async function handleClaim() {
    if (!currentUser || !canClaim || claimed) return;
    const coins = 100 + Math.floor(Math.random() * 100);
    const xp = 50;
    await updateUserCoins(currentUser.uid, coins);
    await updateUserProfile(currentUser.uid, { xp: (currentUser.xp || 0) + xp });
    markClaimed(currentUser.uid);
    await refreshUser();
    setClaimed(true);
    showGiftAnimation('🎁', `+${coins} Coins!`);
  }

  const sorted = [...entries].sort((a, b) =>
    tab === 'coins' ? b.coins - a.coins : b.totalGiftsReceived - a.totalGiftsReceived
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
      display: 'flex', flexDirection: 'column', maxWidth: 400, margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 12px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(108,92,231,0.2)',
        background: 'rgba(26,15,46,0.9)', backdropFilter: 'blur(20px)',
      }}>
        <button onClick={onClose} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
          color: '#A29BFE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trophy size={18} color="#fdcb6e" /> Leaderboard
        </h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Daily reward */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(108,92,231,0.25) 0%, rgba(253,203,110,0.1) 100%)',
            border: '1px solid rgba(108,92,231,0.35)', borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>🎁 Daily Reward</div>
              <div style={{ fontSize: 12, color: 'rgba(162,155,254,0.7)', marginTop: 3 }}>
                {canClaim && !claimed ? 'Claim your free coins & XP!' : claimed ? 'Claimed! Come back tomorrow 🌟' : 'Already claimed today'}
              </div>
            </div>
            <button onClick={handleClaim} disabled={!canClaim || claimed} style={{
              background: canClaim && !claimed ? 'linear-gradient(135deg, #fdcb6e, #e17055)' : 'rgba(108,92,231,0.15)',
              border: 'none', borderRadius: 14, padding: '8px 16px',
              fontSize: 13, fontWeight: 700,
              color: canClaim && !claimed ? '#333' : 'rgba(162,155,254,0.4)',
              cursor: canClaim && !claimed ? 'pointer' : 'default',
              boxShadow: canClaim && !claimed ? '0 0 16px rgba(253,203,110,0.5)' : 'none',
              fontFamily: 'inherit',
            }}>{claimed ? '✓ Done' : 'Claim'}</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="toggle-switch">
            <button className={`tab-btn ${tab === 'coins' ? 'active' : ''}`} onClick={() => setTab('coins')}>💰 Top Coins</button>
            <button className={`tab-btn ${tab === 'gifts' ? 'active' : ''}`} onClick={() => setTab('gifts')}>🎁 Top Gifted</button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Loader size={24} color="#A29BFE" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
          </div>
        )}

        {/* Podium for top 3 */}
        {!loading && (
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '0 16px 16px' }}>
            {[1, 0, 2].map(pos => {
              const user = sorted[pos];
              if (!user) return null;
              const heights = [100, 130, 80];
              const h = heights[pos === 0 ? 1 : pos === 1 ? 0 : 2];
              const rank = pos;
              return (
                <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: 20 }}>{MEDALS[rank]}</span>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, border: '2px solid rgba(162,155,254,0.5)',
                    boxShadow: pos === 0 ? '0 0 20px rgba(253,203,110,0.6)' : '0 0 10px rgba(108,92,231,0.4)',
                  }}>{user.photoURL}</div>
                  <span style={{ fontSize: 11, color: 'white', fontWeight: 600, textAlign: 'center' }}>{user.displayName}</span>
                  <span style={{ fontSize: 10, color: '#fdcb6e' }}>
                    {tab === 'coins' ? `💰${user.coins.toLocaleString()}` : `🎁${user.totalGiftsReceived}`}
                  </span>
                  <div style={{
                    width: '100%', height: h, borderRadius: '8px 8px 0 0',
                    background: pos === 0 ? 'linear-gradient(180deg, rgba(253,203,110,0.3), rgba(253,203,110,0.1))' : 'linear-gradient(180deg, rgba(108,92,231,0.25), rgba(108,92,231,0.08))',
                    border: `1px solid ${pos === 0 ? 'rgba(253,203,110,0.35)' : 'rgba(108,92,231,0.25)'}`,
                  }} />
                </div>
              );
            })}
          </div>
        )}

        {/* Ranked list */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.slice(3).map((user, i) => {
            const rank = i + 4;
            const isMe = user.uid === currentUser?.uid;
            return (
              <div key={user.uid} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: isMe ? 'rgba(108,92,231,0.2)' : 'rgba(26,15,46,0.6)',
                border: `1px solid ${isMe ? 'rgba(108,92,231,0.4)' : 'rgba(108,92,231,0.12)'}`,
                borderRadius: 14, padding: '10px 12px',
              }}>
                <span style={{ width: 20, fontSize: 13, fontWeight: 700, color: 'rgba(162,155,254,0.6)', textAlign: 'center' }}>{rank}</span>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{user.photoURL}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#A29BFE' : 'white' }}>
                    {user.displayName} {isMe ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Lv.{user.level} · {user.customUID}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fdcb6e' }}>
                  {tab === 'coins' ? `💰${user.coins.toLocaleString()}` : `🎁${user.totalGiftsReceived}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
