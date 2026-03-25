import { useState, useRef } from 'react';
import { useApp } from '../lib/context';
import { saveUser, User } from '../lib/storage';
import {
  Edit2, LogOut, Camera, Check, X, ChevronRight,
  MapPin, Heart, Calendar, Users, Star, Coins,
  Moon, Sun,
} from 'lucide-react';

const INTERESTS = ['Music', 'Gaming', 'Art', 'Travel', 'Food', 'Sports', 'Tech', 'Movies', 'Books', 'Fashion', 'Fitness', 'Photography'];
const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
const RELATIONSHIPS = ['Single', 'In a relationship', 'Married', 'It\'s complicated'];
const LEVELS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];

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
  const { currentUser, setUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  const [form, setForm] = useState<Partial<User>>(currentUser || {});
  const fileRef = useRef<HTMLInputElement>(null);

  if (!currentUser) return null;

  const age = getAge(currentUser.birthday);
  const levelProgress = ((currentUser.coins % 1000) / 1000) * 100;
  const nextLevel = Math.min(currentUser.level + 1, 10);

  function saveProfile() {
    const updated = { ...currentUser, ...form };
    saveUser(updated as User);
    setUser(updated as User);
    setEditing(false);
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const emoji = '🌟'; // We store emoji-based avatars, just cycle
      const emojis = ['🌟', '🦋', '🔮', '🌙', '⭐', '🌺', '🦄', '🎭', '🌸', '💫'];
      const next = emojis[(emojis.indexOf(currentUser.avatar) + 1) % emojis.length];
      const updated = { ...currentUser, avatar: next };
      saveUser(updated);
      setUser(updated);
    };
    reader.readAsDataURL(file);
  }

  function toggleInterest(interest: string) {
    const current = form.interests || currentUser.interests;
    const has = current.includes(interest);
    const updated = has ? current.filter(i => i !== interest) : [...current, interest];
    setForm(f => ({ ...f, interests: updated }));
  }

  function logout() {
    setUser(null);
  }

  function toggleDarkMode() {
    const updated = { ...currentUser, darkMode: !currentUser.darkMode };
    saveUser(updated);
    setUser(updated);
  }

  return (
    <div className="page-content page-transition">
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

      {/* Hero section */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(135deg, rgba(108, 92, 231, 0.3) 0%, rgba(26, 15, 46, 0.9) 100%)',
        padding: '32px 16px 24px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(108, 92, 231, 0.2)',
      }}>
        {/* Edit button */}
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
          {editing ? (
            <>
              <button onClick={saveProfile} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(0, 184, 148, 0.2)',
                border: '1px solid rgba(0, 184, 148, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#00b894',
              }}><Check size={16} /></button>
              <button onClick={() => { setEditing(false); setForm(currentUser); }} style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(231, 76, 60, 0.2)',
                border: '1px solid rgba(231, 76, 60, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#ff7675',
              }}><X size={16} /></button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(108, 92, 231, 0.2)',
              border: '1px solid rgba(108, 92, 231, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#A29BFE',
            }}><Edit2 size={16} /></button>
          )}
        </div>

        {/* Avatar */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 40, border: '3px solid rgba(162, 155, 254, 0.6)',
            boxShadow: '0 0 30px rgba(108, 92, 231, 0.5)',
          }}>
            {currentUser.avatar}
          </div>
          <button onClick={() => fileRef.current?.click()} style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Camera size={13} color="white" />
          </button>
        </div>

        {/* Username & ID */}
        {editing ? (
          <input
            className="galaxy-input"
            value={form.nickname || currentUser.nickname}
            onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))}
            style={{ textAlign: 'center', marginBottom: 8, maxWidth: 200, margin: '0 auto 8px' }}
          />
        ) : (
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {currentUser.nickname || currentUser.username}
          </h2>
        )}
        <p style={{ color: 'rgba(162, 155, 254, 0.5)', fontSize: 12, marginBottom: 12 }}>
          ID: #{currentUser.id.slice(-6).toUpperCase()}
        </p>

        {/* Level & coins */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
          <span className="level-badge">Lv.{currentUser.level}</span>
          <span className="coins-badge">
            <Star size={11} />
            {currentUser.coins.toLocaleString()}
          </span>
        </div>

        {/* XP bar */}
        <div style={{ maxWidth: 200, margin: '0 auto', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'rgba(162, 155, 254, 0.5)', marginBottom: 4 }}>
            <span>Lv.{currentUser.level}</span>
            <span>Lv.{nextLevel}</span>
          </div>
          <div style={{ height: 4, background: 'rgba(108, 92, 231, 0.2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${levelProgress}%`,
              background: 'linear-gradient(90deg, #6C5CE7, #A29BFE)',
              borderRadius: 4, transition: 'width 0.5s ease',
            }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
          <div className="stat-box">
            <span className="stat-num">{currentUser.followers}</span>
            <span className="stat-label">Followers</span>
          </div>
          <div style={{ width: 1, background: 'rgba(108, 92, 231, 0.3)' }} />
          <div className="stat-box">
            <span className="stat-num">{currentUser.following}</span>
            <span className="stat-label">Following</span>
          </div>
          <div style={{ width: 1, background: 'rgba(108, 92, 231, 0.3)' }} />
          <div className="stat-box">
            <span className="stat-num">0</span>
            <span className="stat-label">Friends</span>
          </div>
        </div>
      </div>

      {/* About Me */}
      <div style={{ padding: '16px' }}>
        <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(162, 155, 254, 0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            About Me
          </h3>
          {editing ? (
            <textarea
              className="galaxy-input"
              value={form.bio || currentUser.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell the galaxy about yourself..."
              rows={3}
              style={{ resize: 'none' }}
            />
          ) : (
            <p style={{ color: currentUser.bio ? 'rgba(255,255,255,0.8)' : 'rgba(162, 155, 254, 0.3)', fontSize: 14, lineHeight: 1.6 }}>
              {currentUser.bio || 'No bio yet. Tell us about yourself! ✨'}
            </p>
          )}
        </div>

        {/* Info card */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(162, 155, 254, 0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoRow icon={<Users size={14} />} label="Gender"
              value={editing ? (
                <select
                  className="galaxy-input"
                  value={form.gender || currentUser.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  style={{ padding: '6px 10px', fontSize: 13 }}
                >
                  <option value="">Select...</option>
                  {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : currentUser.gender || '—'} />

            <InfoRow icon={<Calendar size={14} />} label={age ? `Age ${age}` : 'Birthday'}
              value={editing ? (
                <input
                  type="date"
                  className="galaxy-input"
                  value={form.birthday || currentUser.birthday}
                  onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                  style={{ padding: '6px 10px', fontSize: 13 }}
                />
              ) : currentUser.birthday || '—'} />

            <InfoRow icon={<MapPin size={14} />} label="Location"
              value={editing ? (
                <input
                  className="galaxy-input"
                  value={form.location || currentUser.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Your city..."
                  style={{ padding: '6px 10px', fontSize: 13 }}
                />
              ) : currentUser.location || '—'} />

            <InfoRow icon={<Heart size={14} />} label="Status"
              value={editing ? (
                <select
                  className="galaxy-input"
                  value={form.relationship || currentUser.relationship}
                  onChange={e => setForm(f => ({ ...f, relationship: e.target.value }))}
                  style={{ padding: '6px 10px', fontSize: 13 }}
                >
                  <option value="">Select...</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              ) : currentUser.relationship || '—'} />
          </div>
        </div>

        {/* Interests */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(162, 155, 254, 0.7)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Interests
            </h3>
            <button onClick={() => setShowInterests(!showInterests)} style={{
              fontSize: 12, color: '#A29BFE', background: 'none', border: 'none', cursor: 'pointer',
            }}>
              {showInterests ? 'Done' : 'Edit'}
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(showInterests ? INTERESTS : (currentUser.interests.length ? currentUser.interests : INTERESTS.slice(0, 4))).map(interest => (
              <span
                key={interest}
                className={`interest-tag ${(form.interests || currentUser.interests).includes(interest) ? 'selected' : ''}`}
                onClick={() => showInterests && toggleInterest(interest)}
              >
                {interest}
              </span>
            ))}
          </div>
          {showInterests && (
            <button
              className="btn-primary"
              onClick={() => {
                saveProfile();
                setShowInterests(false);
              }}
              style={{ width: '100%', padding: 10, marginTop: 12 }}
            >Save Interests</button>
          )}
        </div>

        {/* Settings */}
        <div className="glass-card" style={{ padding: 16, marginBottom: 24 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(162, 155, 254, 0.7)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <SettingsRow
              icon={currentUser.darkMode ? <Moon size={16} color="#A29BFE" /> : <Sun size={16} color="#fdcb6e" />}
              label="Dark Mode"
              right={
                <div
                  onClick={toggleDarkMode}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: currentUser.darkMode ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : 'rgba(108, 92, 231, 0.2)',
                    border: '1px solid rgba(108, 92, 231, 0.4)',
                    position: 'relative', cursor: 'pointer', transition: 'all 0.3s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 2, left: currentUser.darkMode ? 22 : 2,
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    transition: 'left 0.3s',
                  }} />
                </div>
              }
            />
            <SettingsRow
              icon={<LogOut size={16} color="#ff7675" />}
              label={<span style={{ color: '#ff7675' }}>Sign Out</span>}
              right={<ChevronRight size={16} color="rgba(162, 155, 254, 0.4)" />}
              onClick={logout}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ color: 'rgba(162, 155, 254, 0.6)', flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'rgba(162, 155, 254, 0.5)', fontSize: 12, width: 64, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
        {typeof value === 'string' ? value : value}
      </div>
    </div>
  );
}

function SettingsRow({
  icon, label, right, onClick
}: {
  icon: React.ReactNode; label: React.ReactNode; right: React.ReactNode; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 0',
        borderBottom: '1px solid rgba(108, 92, 231, 0.1)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {icon}
      <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{label}</span>
      {right}
    </div>
  );
}
