import { getLeaderboard, canClaimDailyReward, claimDailyReward } from '../lib/storage';
import { useApp } from '../lib/context';
import { useState } from 'react';
import { Trophy, Gift, Star, Coins } from 'lucide-react';

const MEDALS = ['🥇', '🥈', '🥉'];

export function LeaderboardPage({ onClose }: { onClose: () => void }) {
  const { currentUser, refreshUser, showGiftAnimation } = useApp();
  const board = getLeaderboard();
  const [claimed, setClaimed] = useState(false);
  const canClaim = currentUser ? canClaimDailyReward(currentUser.id) : false;

  function handleDailyClaim() {
    if (!currentUser) return;
    const result = claimDailyReward(currentUser.id);
    if (result.success) {
      setClaimed(true);
      refreshUser();
      showGiftAnimation('🎁', `+${result.coins} Coins!`);
    }
  }

  const tabs = ['Top Coins', 'Top Gifts'];
  const [tab, setTab] = useState(0);

  const sorted = tab === 0
    ? [...board].sort((a, b) => b.coins - a.coins)
    : [...board].sort((a, b) => b.totalGiftsReceived - a.totalGiftsReceived);

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
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>🏆 Leaderboard</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Daily reward card */}
        <div style={{ padding: '14px 16px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(108,92,231,0.25) 0%, rgba(253,203,110,0.1) 100%)',
            border: '1px solid rgba(108,92,231,0.35)', borderRadius: 20, padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
                🎁 Daily Reward
              </div>
              <div style={{ fontSize: 12, color: 'rgba(162,155,254,0.7)', marginTop: 3 }}>
                {canClaim && !claimed ? 'Claim your free coins & XP!' : claimed ? 'Claimed! Come back tomorrow 🌟' : 'Already claimed today'}
              </div>
            </div>
            <button
              onClick={handleDailyClaim}
              disabled={!canClaim || claimed}
              style={{
                background: canClaim && !claimed ? 'linear-gradient(135deg, #fdcb6e, #e17055)' : 'rgba(108,92,231,0.15)',
                border: 'none', borderRadius: 14, padding: '8px 16px',
                fontSize: 13, fontWeight: 700,
                color: canClaim && !claimed ? '#333' : 'rgba(162,155,254,0.4)',
                cursor: canClaim && !claimed ? 'pointer' : 'default',
                boxShadow: canClaim && !claimed ? '0 0 16px rgba(253,203,110,0.5)' : 'none',
              }}>
              {claimed ? '✓ Done' : 'Claim'}
            </button>
          </div>
        </div>

        {/* Tab */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="toggle-switch">
            <button className={`tab-btn ${tab === 0 ? 'active' : ''}`} onClick={() => setTab(0)}>
              💰 Top Coins
            </button>
            <button className={`tab-btn ${tab === 1 ? 'active' : ''}`} onClick={() => setTab(1)}>
              🎁 Top Gifted
            </button>
          </div>
        </div>

        {/* Top 3 podium */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '0 16px 16px' }}>
          {[1, 0, 2].map(pos => {
            const user = sorted[pos];
            if (!user) return null;
            const heights = [100, 130, 80];
            const h = heights[pos === 0 ? 1 : pos === 1 ? 0 : 2];
            return (
              <div key={pos} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1,
              }}>
                <span style={{ fontSize: 20 }}>{MEDALS[sorted.indexOf(user)]}</span>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, border: '2px solid rgba(162,155,254,0.5)',
                  boxShadow: pos === 0 ? '0 0 20px rgba(253,203,110,0.6)' : '0 0 10px rgba(108,92,231,0.4)',
                }}>{user.avatar}</div>
                <span style={{ fontSize: 11, color: 'white', fontWeight: 600, textAlign: 'center' }}>{user.username}</span>
                <span style={{ fontSize: 10, color: '#fdcb6e' }}>💰{tab === 0 ? user.coins.toLocaleString() : user.totalGiftsReceived}</span>
                <div style={{
                  width: '100%', height: h,
                  background: pos === 0
                    ? 'linear-gradient(180deg, rgba(253,203,110,0.3), rgba(253,203,110,0.1))'
                    : 'linear-gradient(180deg, rgba(108,92,231,0.25), rgba(108,92,231,0.08))',
                  border: `1px solid ${pos === 0 ? 'rgba(253,203,110,0.35)' : 'rgba(108,92,231,0.25)'}`,
                  borderRadius: '8px 8px 0 0',
                }} />
              </div>
            );
          })}
        </div>

        {/* Full list */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sorted.slice(3).map((user, i) => {
            const rank = i + 4;
            const isMe = user.id === currentUser?.id;
            return (
              <div key={user.id} style={{
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
                }}>{user.avatar}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: isMe ? '#A29BFE' : 'white' }}>
                    {user.username} {isMe ? '(You)' : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Lv.{user.level} · {user.uid}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fdcb6e' }}>
                  💰{tab === 0 ? user.coins.toLocaleString() : user.totalGiftsReceived}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
