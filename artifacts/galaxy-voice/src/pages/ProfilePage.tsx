import { useState, useRef } from 'react';
import { useApp } from '../lib/context';
import { saveUser, User, AVATARS, getXpToNextLevel, followUser, unfollowUser, findUserById } from '../lib/storage';
import { Edit2, LogOut, Camera, Check, X, ChevronRight, MapPin, Heart, Calendar, Users, Moon, Sun, Copy, Trophy } from 'lucide-react';
import { LeaderboardPage } from './LeaderboardPage';

const INTERESTS = ['Music', 'Gaming', 'Art', 'Travel', 'Food', 'Sports', 'Tech', 'Movies', 'Books', 'Fashion', 'Fitness', 'Photography'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const RELATIONSHIPS = ['Single', 'In a relationship', 'Married', "It's complicated"];

function getAge(birthday: string): number | null {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function ProfilePage() {
  const { currentUser, setUser, refreshUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [form, setForm] = useState<Partial<User>>(currentUser || {});
  const [copied, setCopied] = useState(false);

  if (!currentUser) return null;

  const age = getAge(currentUser.birthday);
  const xpInfo = getXpToNextLevel(currentUser.xp);

  function saveProfile() {
    const updated = { ...currentUser, ...form };
    saveUser(updated as User);
    setUser(updated as User);
    setEditing(false);
  }

  function changeAvatar(emoji: string) {
    const updated = { ...currentUser, avatar: emoji };
    saveUser(updated);
    setUser(updated);
    setShowAvatarPicker(false);
  }

  function toggleInterest(interest: string) {
    const current = form.interests || currentUser.interests;
    const updated = current.includes(interest)
      ? current.filter(i => i !== interest)
      : [...current, interest];
    setForm(f => ({ ...f, interests: updated }));
  }

  function copyUID() {
    navigator.clipboard.writeText(currentUser.uid).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function logout() {
    setUser(null);
  }

  function toggleDarkMode() {
    const updated = { ...currentUser, darkMode: !currentUser.darkMode };
    saveUser(updated);
    setUser(updated);
  }

  const myFollowerCount = currentUser.followers.length;
  const myFollowingCount = currentUser.following.length;

  return (
    <>
      {showLeaderboard && <LeaderboardPage onClose={() => setShowLeaderboard(false)} />}
      {showAvatarPicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowAvatarPicker(false)}>
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
                  border: `2px solid ${currentUser.avatar === emoji ? '#A29BFE' : 'rgba(108,92,231,0.2)'}`,
                  borderRadius: 16, padding: '10px', cursor: 'pointer',
                  boxShadow: currentUser.avatar === emoji ? '0 0 12px rgba(162,155,254,0.5)' : 'none',
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
          {/* Edit / Save buttons */}
          <div style={{ position: 'absolute', top: 16, right: 12, display: 'flex', gap: 6 }}>
            {editing ? (
              <>
                <button onClick={saveProfile} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(0,184,148,0.2)', border: '1px solid rgba(0,184,148,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#00b894',
                }}><Check size={15} /></button>
                <button onClick={() => { setEditing(false); setForm(currentUser); }} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#ff7675',
                }}><X size={15} /></button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#A29BFE',
              }}><Edit2 size={15} /></button>
            )}
          </div>

          {/* Leaderboard button */}
          <div style={{ position: 'absolute', top: 16, left: 12 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(253,203,110,0.15)', border: '1px solid rgba(253,203,110,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fdcb6e',
            }}><Trophy size={15} /></button>
          </div>

          {/* Avatar */}
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 10 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 42, border: '3px solid rgba(162,155,254,0.6)',
              boxShadow: '0 0 30px rgba(108,92,231,0.5)',
            }}>{currentUser.avatar}</div>
            <button onClick={() => setShowAvatarPicker(true)} style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Camera size={12} color="white" /></button>
          </div>

          {/* Username */}
          {editing ? (
            <input className="galaxy-input" value={form.nickname || currentUser.nickname}
              onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
              style={{ textAlign: 'center', maxWidth: 200, margin: '0 auto 6px', display: 'block' }} />
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 2 }}>
              {currentUser.nickname || currentUser.username}
            </h2>
          )}

          {/* UID with copy */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
            <span style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12 }}>{currentUser.uid}</span>
            <button onClick={copyUID} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#00b894' : 'rgba(162,155,254,0.4)', padding: 0 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>

          {/* Level + coins */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
            <span className="level-badge">Lv.{currentUser.level}</span>
            <span className="coins-badge">💰{currentUser.coins.toLocaleString()}</span>
          </div>

          {/* XP bar */}
          <div style={{ maxWidth: 200, margin: '0 auto 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(162,155,254,0.5)', marginBottom: 3 }}>
              <span>{xpInfo.current} XP</span>
              <span>{xpInfo.needed} XP</span>
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
            <div className="stat-box">
              <span className="stat-num">{myFollowerCount}</span>
              <span className="stat-label">Followers</span>
            </div>
            <div style={{ width: 1, background: 'rgba(108,92,231,0.3)' }} />
            <div className="stat-box">
              <span className="stat-num">{myFollowingCount}</span>
              <span className="stat-label">Following</span>
            </div>
            <div style={{ width: 1, background: 'rgba(108,92,231,0.3)' }} />
            <div className="stat-box">
              <span className="stat-num">{currentUser.totalGiftsReceived}</span>
              <span className="stat-label">Gifts</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* About Me */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              About Me
            </h3>
            {editing ? (
              <textarea className="galaxy-input" value={form.bio || currentUser.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                placeholder="Tell the galaxy about yourself..." rows={3}
                style={{ resize: 'none' }} />
            ) : (
              <p style={{ color: currentUser.bio ? 'rgba(255,255,255,0.8)' : 'rgba(162,155,254,0.3)', fontSize: 13, lineHeight: 1.6 }}>
                {currentUser.bio || 'No bio yet. Tell us about yourself! ✨'}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Info
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow icon={<Users size={13} />} label="Gender"
                value={editing ? (
                  <select className="galaxy-input" value={form.gender || currentUser.gender}
                    onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                    style={{ padding: '5px 8px', fontSize: 12 }}>
                    <option value="">Select...</option>
                    {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                ) : currentUser.gender || '—'} />

              <InfoRow icon={<Calendar size={13} />} label={age ? `Age ${age}` : 'Birthday'}
                value={editing ? (
                  <input type="date" className="galaxy-input" value={form.birthday || currentUser.birthday}
                    onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                    style={{ padding: '5px 8px', fontSize: 12 }} />
                ) : currentUser.birthday || '—'} />

              <InfoRow icon={<MapPin size={13} />} label="Location"
                value={editing ? (
                  <input className="galaxy-input" value={form.location || currentUser.location}
                    onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    placeholder="Your city..." style={{ padding: '5px 8px', fontSize: 12 }} />
                ) : currentUser.location || '—'} />

              <InfoRow icon={<Heart size={13} />} label="Status"
                value={editing ? (
                  <select className="galaxy-input" value={form.relationship || currentUser.relationship}
                    onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                    style={{ padding: '5px 8px', fontSize: 12 }}>
                    <option value="">Select...</option>
                    {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : currentUser.relationship || '—'} />
            </div>
          </div>

          {/* Interests */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', textTransform: 'uppercase', letterSpacing: 1 }}>
                Interests
              </h3>
              <button onClick={() => setShowInterests(!showInterests)} style={{
                fontSize: 12, color: '#A29BFE', background: 'none', border: 'none', cursor: 'pointer',
              }}>{showInterests ? 'Done' : 'Edit'}</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(showInterests ? INTERESTS : (currentUser.interests.length ? currentUser.interests : ['No interests set'])).map(interest => (
                <span key={interest}
                  className={`interest-tag ${(form.interests || currentUser.interests).includes(interest) ? 'selected' : ''}`}
                  onClick={() => showInterests && toggleInterest(interest)}>
                  {interest}
                </span>
              ))}
            </div>
            {showInterests && (
              <button className="btn-primary" onClick={() => { saveProfile(); setShowInterests(false); }}
                style={{ width: '100%', padding: 10, marginTop: 10, fontSize: 13 }}>
                Save Interests
              </button>
            )}
          </div>

          {/* Gift stats */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 10 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Gift Stats
            </h3>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(108,92,231,0.1)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>🎁</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{currentUser.totalGiftsReceived}</div>
                <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Received</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(108,92,231,0.1)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>💝</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>{currentUser.totalGiftsSent}</div>
                <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Sent</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center', background: 'rgba(108,92,231,0.1)', borderRadius: 12, padding: 12 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>💰</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#fdcb6e' }}>{currentUser.coins.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>Coins</div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="glass-card" style={{ padding: 14, marginBottom: 24 }}>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'rgba(162,155,254,0.6)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Settings
            </h3>
            <SettingsRow
              icon={currentUser.darkMode ? <Moon size={15} color="#A29BFE" /> : <Sun size={15} color="#fdcb6e" />}
              label="Dark Mode"
              right={
                <div onClick={toggleDarkMode} style={{
                  width: 42, height: 22, borderRadius: 11,
                  background: currentUser.darkMode ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : 'rgba(108,92,231,0.2)',
                  border: '1px solid rgba(108,92,231,0.4)',
                  position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: currentUser.darkMode ? 20 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    transition: 'left 0.3s',
                  }} />
                </div>
              }
            />
            <SettingsRow
              icon={<LogOut size={15} color="#ff7675" />}
              label={<span style={{ color: '#ff7675' }}>Sign Out</span>}
              right={<ChevronRight size={15} color="rgba(162,155,254,0.4)" />}
              onClick={logout}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: 'rgba(162,155,254,0.5)', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'rgba(162,155,254,0.4)', fontSize: 11, width: 60, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{value}</div>
    </div>
  );
}

function SettingsRow({ icon, label, right, onClick }: {
  icon: React.ReactNode; label: React.ReactNode; right: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 0', borderBottom: '1px solid rgba(108,92,231,0.1)',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {icon}
      <span style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      {right}
    </div>
  );
}
