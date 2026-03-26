import { useState } from 'react';
import { useApp } from '../lib/context';
import { updateUserProfile, signOut } from '../lib/fbAuth';
import { AVATARS, getLevelFromXp, getXpToNextLevel } from '../lib/storage';
import { Edit2, LogOut, Camera, Check, X, ChevronRight, MapPin, Heart, Calendar, Users, Copy, Trophy } from 'lucide-react';
import { LeaderboardPage } from './LeaderboardPage';

export function ProfilePage() {
  const { currentUser, setUser, refreshUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [form, setForm] = useState({ bio: currentUser?.bio || '', displayName: currentUser?.displayName || '' });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!currentUser) return null;

  const xpInfo = getXpToNextLevel(currentUser.xp || 0);

  async function saveProfile() {
    setSaving(true);
    await updateUserProfile(currentUser.uid, { bio: form.bio, displayName: form.displayName });
    await refreshUser();
    setEditing(false);
    setSaving(false);
  }

  async function changeAvatar(emoji: string) {
    await updateUserProfile(currentUser.uid, { photoURL: emoji });
    await refreshUser();
    setShowAvatarPicker(false);
  }

  function copyUID() {
    navigator.clipboard.writeText(currentUser.customUID || currentUser.uid).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function logout() {
    await signOut();
    setUser(null);
  }

  return (
    <>
      {showLeaderboard && <LeaderboardPage onClose={() => setShowLeaderboard(false)} />}

      {showAvatarPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowAvatarPicker(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 400, margin: '0 auto',
            background: 'linear-gradient(180deg, #1e1040, #0F0F1A)',
            borderRadius: '24px 24px 0 0', border: '1px solid rgba(108,92,231,0.3)',
            padding: '20px 16px 32px',
          }}>
            <h3 style={{ color: 'white', fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Choose Avatar</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              {AVATARS.map(emoji => (
                <button key={emoji} onClick={() => changeAvatar(emoji)} style={{
                  fontSize: 36, background: 'rgba(108,92,231,0.1)',
                  border: `2px solid ${currentUser.photoURL === emoji ? '#A29BFE' : 'rgba(108,92,231,0.2)'}`,
                  borderRadius: 16, padding: '10px', cursor: 'pointer',
                  boxShadow: currentUser.photoURL === emoji ? '0 0 12px rgba(162,155,254,0.5)' : 'none',
                }}>{emoji}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="page-content page-transition">
        {/* Hero */}
        <div style={{
          position: 'relative',
          background: 'linear-gradient(135deg, rgba(108,92,231,0.3) 0%, rgba(26,15,46,0.9) 100%)',
          padding: '28px 16px 20px', textAlign: 'center',
          borderBottom: '1px solid rgba(108,92,231,0.2)',
        }}>
          <div style={{ position: 'absolute', top: 16, left: 12 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(253,203,110,0.15)', border: '1px solid rgba(253,203,110,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fdcb6e',
            }}><Trophy size={15} /></button>
          </div>

          <div style={{ position: 'absolute', top: 16, right: 12, display: 'flex', gap: 6 }}>
            {editing ? (
              <>
                <button onClick={saveProfile} disabled={saving} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(0,184,148,0.2)', border: '1px solid rgba(0,184,148,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#00b894',
                }}><Check size={15} /></button>
                <button onClick={() => setEditing(false)} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff7675',
                }}><X size={15} /></button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#A29BFE',
              }}><Edit2 size={15} /></button>
            )}
          </div>

          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, border: '3px solid rgba(162,155,254,0.6)',
              boxShadow: '0 0 30px rgba(108,92,231,0.5)',
            }}>{currentUser.photoURL}</div>
            <button onClick={() => setShowAvatarPicker(true)} style={{
              position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Camera size={12} color="white" /></button>
          </div>

          {/* Name */}
          {editing ? (
            <input className="galaxy-input" value={form.displayName}
              onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
              style={{ textAlign: 'center', maxWidth: 200, margin: '0 auto 8px', display: 'block' }} />
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>{currentUser.displayName}</h2>
          )}

          {/* UID */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>{currentUser.customUID || currentUser.uid.slice(0, 12)}</span>
            <button onClick={copyUID} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00b894' : 'rgba(162,155,254,0.4)', padding: 0 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          {/* Level + coins */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <span className="level-badge">Lv.{currentUser.level}</span>
            <span className="coins-badge">💰{(currentUser.coins || 0).toLocaleString()}</span>
            {currentUser.isAnonymous && (
              <span style={{ background: 'rgba(253,203,110,0.12)', border: '1px solid rgba(253,203,110,0.25)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: '#fdcb6e' }}>
                Guest
              </span>
            )}
          </div>

          {/* XP bar */}
          <div style={{ maxWidth: 200, margin: '0 auto 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(162,155,254,0.5)', marginBottom: 3 }}>
              <span>{xpInfo.current} XP</span><span>{xpInfo.needed} XP</span>
            </div>
            <div style={{ height: 4, background: 'rgba(108,92,231,0.2)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${xpInfo.pct}%`,
                background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)',
                borderRadius: 4, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            <StatBox num={currentUser.followers?.length || 0} label="Followers" />
            <div style={{ width: 1, background: 'rgba(108,92,231,0.3)' }} />
            <StatBox num={currentUser.following?.length || 0} label="Following" />
            <div style={{ width: 1, background: 'rgba(108,92,231,0.3)' }} />
            <StatBox num={currentUser.totalGiftsReceived || 0} label="Gifts" />
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* Bio */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>About Me</h3>
            {editing ? (
              <textarea className="galaxy-input" value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the galaxy about yourself..." rows={3} />
            ) : (
              <p style={{ color: currentUser.bio ? 'rgba(255,255,255,0.8)' : 'rgba(162,155,254,0.3)', fontSize: 13, lineHeight: 1.6 }}>
                {currentUser.bio || 'No bio yet. Tap edit to add one ✨'}
              </p>
            )}
          </div>

          {/* Gift stats */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Gift Stats</h3>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { emoji: '🎁', val: currentUser.totalGiftsReceived || 0, label: 'Received' },
                { emoji: '💝', val: currentUser.totalGiftsSent || 0, label: 'Sent' },
                { emoji: '💰', val: currentUser.coins || 0, label: 'Coins' },
              ].map(({ emoji, val, label }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', background: 'rgba(108,92,231,0.1)', borderRadius: 12, padding: 12 }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: label === 'Coins' ? '#fdcb6e' : 'white' }}>{val.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Account type */}
          {currentUser.isAnonymous && (
            <div style={{
              background: 'rgba(253,203,110,0.08)', border: '1px solid rgba(253,203,110,0.25)',
              borderRadius: 16, padding: '12px 14px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <p style={{ fontSize: 12, color: 'rgba(253,203,110,0.8)', lineHeight: 1.4 }}>
                You're using a guest account. Sign in with Google to save your progress permanently.
              </p>
            </div>
          )}

          {/* Settings */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Settings</h3>
            <div onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', cursor: 'pointer',
            }}>
              <LogOut size={15} color="#ff7675" />
              <span style={{ flex: 1, fontSize: 13, color: '#ff7675' }}>Sign Out</span>
              <ChevronRight size={15} color="rgba(162,155,254,0.4)" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StatBox({ num, label }: { num: number; label: string }) {
  return (
    <div className="stat-box">
      <span className="stat-num">{num}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
