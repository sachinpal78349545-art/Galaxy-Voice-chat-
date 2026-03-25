import { useState } from 'react';
import { Stars } from '../components/Stars';
import { useApp } from '../lib/context';
import {
  User, generateId, findUserByEmail, saveUser, getAvatarEmoji
} from '../lib/storage';
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
    const user = findUserByEmail(email);
    if (!user) { setError('No account found with this email'); return; }
    if (user.password !== password) { setError('Incorrect password'); return; }
    setUser(user);
  }

  function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!username.trim()) { setError('Username is required'); return; }
    if (findUserByEmail(email)) { setError('Email already in use'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    const id = generateId();
    const newUser: User = {
      id,
      username: username.trim(),
      email,
      password,
      avatar: getAvatarEmoji(id),
      level: 1,
      coins: 500,
      bio: '',
      gender: '',
      birthday: '',
      location: '',
      relationship: '',
      interests: [],
      followers: 0,
      following: 0,
      nickname: username.trim(),
      darkMode: true,
    };
    saveUser(newUser);
    setUser(newUser);
  }

  return (
    <div className="app-container">
      <Stars />
      <div className="auth-container">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px rgba(108, 92, 231, 0.6)',
          }}>
            <Mic size={36} color="white" />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800,
            background: 'linear-gradient(135deg, #A29BFE, #ffffff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>Galaxy Voice</h1>
          <p style={{ color: 'rgba(162, 155, 254, 0.6)', fontSize: 14, marginTop: 8 }}>
            Connect through the universe
          </p>
        </div>

        {/* Mode toggle */}
        <div className="toggle-switch" style={{ marginBottom: 24 }}>
          <button
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(''); }}
          >Login</button>
          <button
            className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(''); }}
          >Sign Up</button>
        </div>

        <form onSubmit={mode === 'login' ? handleLogin : handleSignup}>
          {mode === 'signup' && (
            <div style={{ marginBottom: 12 }}>
              <input
                className="galaxy-input"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <input
              className="galaxy-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <input
              className="galaxy-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p style={{
              color: '#ff6b6b', fontSize: 13, marginBottom: 12, textAlign: 'center',
              background: 'rgba(255, 107, 107, 0.1)', padding: '8px 12px', borderRadius: 10,
            }}>{error}</p>
          )}

          <button
            className="btn-primary"
            type="submit"
            style={{ width: '100%', padding: '14px' }}
          >
            <Sparkles size={16} />
            {mode === 'login' ? 'Enter the Galaxy' : 'Join the Galaxy'}
          </button>
        </form>

        <p style={{ color: 'rgba(162, 155, 254, 0.4)', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
