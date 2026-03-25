import { useState } from 'react';
import { Stars } from '../components/Stars';
import { useApp } from '../lib/context';
import { User, generateId, generateUID, findUserByEmail, saveUser, AVATARS } from '../lib/storage';
import { Mic, Sparkles } from 'lucide-react';

export function AuthPage() {
  const { setUser } = useApp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const user = findUserByEmail(email.trim().toLowerCase());
    if (!user) { setError('No account found with this email'); return; }
    if (user.password !== password) { setError('Incorrect password'); return; }
    setUser(user);
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Username is required'); return; }
    if (findUserByEmail(email.trim().toLowerCase())) { setError('Email already in use'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    const id = generateId();
    const uid = generateUID();
    const avatarIdx = Math.floor(Math.random() * AVATARS.length);

    const newUser: User = {
      id, uid,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password,
      avatar: AVATARS[avatarIdx],
      level: 1, xp: 0, coins: 500,
      bio: '', gender: '', birthday: '', location: '', relationship: '',
      interests: [],
      followers: [], following: [], friends: [],
      nickname: username.trim(),
      darkMode: true,
      lastDailyReward: 0,
      totalGiftsReceived: 0,
      totalGiftsSent: 0,
    };
    saveUser(newUser);
    setUser(newUser);
  }

  return (
    <div className="app-container">
      <Stars />
      <div className="auth-container">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 84, height: 84, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(108, 92, 231, 0.7), 0 0 80px rgba(108, 92, 231, 0.3)',
          }}>
            <Mic size={38} color="white" />
          </div>
          <h1 style={{
            fontSize: 30, fontWeight: 800,
            background: 'linear-gradient(135deg, #A29BFE, #ffffff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text', letterSpacing: -0.5,
          }}>Galaxy Voice</h1>
          <p style={{ color: 'rgba(162, 155, 254, 0.6)', fontSize: 14, marginTop: 6 }}>
            Connect through the universe 🌌
          </p>
        </div>

        {/* Mode toggle */}
        <div className="toggle-switch" style={{ marginBottom: 24 }}>
          <button className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}>Login</button>
          <button className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}>Sign Up</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 12 }}>
              <input className="galaxy-input" placeholder="Username" value={username}
                onChange={e => setUsername(e.target.value)} />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <input className="galaxy-input" type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 16 }}>
            <input className="galaxy-input" type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)} required />
          </div>

          {mode === 'signup' && (
            <div style={{
              background: 'rgba(108, 92, 231, 0.1)',
              border: '1px solid rgba(108, 92, 231, 0.25)',
              borderRadius: 12, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              marginBottom: 16,
            }}>
              <Sparkles size={14} color="#A29BFE" />
              <p style={{ color: 'rgba(162, 155, 254, 0.8)', fontSize: 12, margin: 0 }}>
                A unique UID will be auto-generated for you
              </p>
            </div>
          )}

          {error && (
            <p style={{
              color: '#ff6b6b', fontSize: 13, marginBottom: 12, textAlign: 'center',
              background: 'rgba(255, 107, 107, 0.1)', padding: '8px 12px', borderRadius: 10,
            }}>{error}</p>
          )}

          <button className="btn-primary" type="submit"
            style={{ width: '100%', padding: '14px', fontSize: 15 }}>
            <Sparkles size={16} />
            {mode === 'login' ? 'Enter the Galaxy' : 'Join the Galaxy'}
          </button>
        </form>

        <p style={{ color: 'rgba(162, 155, 254, 0.35)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
