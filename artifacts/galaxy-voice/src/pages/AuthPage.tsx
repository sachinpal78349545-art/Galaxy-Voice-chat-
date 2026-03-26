import { useState, useRef } from 'react';
import { Stars } from '../components/Stars';
import {
  loginWithGoogleRedirect,
  loginAnonymously, sendOTP, verifyOTP, setupRecaptcha,
} from '../lib/fbAuth';
import { useApp } from '../lib/context';
import { Mic, Sparkles, Loader, Phone, ArrowLeft, ChevronRight, ShieldCheck } from 'lucide-react';

type Screen = 'main' | 'phone-number' | 'phone-otp';

export function AuthPage() {
  const { setUser } = useApp();
  const [screen, setScreen] = useState<Screen>('main');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  // Phone fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // ─── Countdown timer for OTP resend ──────────────────────────────
  function startCountdown(seconds = 60) {
    setResendCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setResendCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // ─── Google Sign-In (redirect) ────────────────────────────────────
  async function handleGoogle() {
    setError('');
    setLoading('google');
    try {
      await loginWithGoogleRedirect();
      // Browser redirects to Google — execution stops here
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('cancelled') ? 'Sign-in cancelled.' : 'Google sign-in failed. Try again.');
      setLoading(null);
    }
  }

  // ─── Anonymous ────────────────────────────────────────────────────
  async function handleAnon() {
    setError('');
    setLoading('anon');
    try {
      const user = await loginAnonymously();
      setUser(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Anonymous login failed.');
      setLoading(null);
    }
  }

  // ─── Phone: go to phone screen + init reCAPTCHA ──────────────────
  function openPhoneScreen() {
    setScreen('phone-number');
    setError('');
    setInfo('');
    setTimeout(() => setupRecaptcha('recaptcha-container'), 100);
  }

  // ─── Phone: send OTP ─────────────────────────────────────────────
  async function handleSendOTP() {
    setError('');
    const raw = phoneNumber.trim();
    if (!raw) { setError('Enter a phone number.'); return; }

    const formatted = raw.startsWith('+') ? raw : `+${raw}`;
    if (!/^\+\d{7,15}$/.test(formatted)) {
      setError('Use international format, e.g. +12025550123');
      return;
    }

    setLoading('otp-send');
    try {
      await sendOTP(formatted);
      setOtpDigits(['', '', '', '', '', '']);
      setOtpCode('');
      setScreen('phone-otp');
      setInfo(`Code sent to ${formatted}`);
      startCountdown(60);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 200);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('invalid-phone-number')) {
        setError('Invalid phone number. Use international format: +1XXXXXXXXXX');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a few minutes.');
      } else if (msg.includes('billing')) {
        setError('Phone auth requires Firebase Blaze plan. Use Google or Guest login.');
      } else {
        setError(msg || 'Failed to send OTP. Check your number and try again.');
      }
    } finally {
      setLoading(null);
    }
  }

  // ─── Phone: verify OTP ───────────────────────────────────────────
  async function handleVerifyOTP() {
    const code = otpDigits.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    setError('');
    setLoading('otp-verify');
    try {
      const user = await verifyOTP(code);
      setUser(user);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('invalid-verification-code') || msg.includes('code-used')) {
        setError('Wrong code. Please try again.');
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
      } else if (msg.includes('session-expired')) {
        setError('Code expired. Please resend.');
      } else {
        setError(msg || 'Verification failed. Try again.');
      }
    } finally {
      setLoading(null);
    }
  }

  // ─── OTP digit input handler ──────────────────────────────────────
  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    setOtpCode(next.join(''));
    if (digit && index < 5) otpInputsRef.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  // ─── Resend OTP ──────────────────────────────────────────────────
  async function handleResend() {
    if (resendCountdown > 0) return;
    setError('');
    setInfo('');
    setOtpDigits(['', '', '', '', '', '']);
    setupRecaptcha('recaptcha-container');
    await handleSendOTP();
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="app-container">
      <Stars />

      {/* Hidden reCAPTCHA container (always in DOM) */}
      <div id="recaptcha-container" style={{ position: 'fixed', bottom: 0, left: 0, zIndex: -1 }} />

      {/* ━━━━━━━━ MAIN SCREEN ━━━━━━━━ */}
      {screen === 'main' && (
        <div className="auth-container" style={{ justifyContent: 'center' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 40px rgba(108,92,231,0.7)', animation: 'logo-pulse 3s ease-in-out infinite',
            }}>
              <Mic size={40} color="white" />
            </div>
            <h1 style={{
              fontSize: 30, fontWeight: 800, letterSpacing: -0.5,
              background: 'linear-gradient(135deg, #A29BFE, #ffffff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>Galaxy Voice</h1>
            <p style={{ color: 'rgba(162,155,254,0.5)', fontSize: 13, marginTop: 5 }}>
              Connect through the universe 🌌
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
            {['🎤 Voice Rooms', '💬 Live Chat', '🎁 Gifts', '🏆 Leaderboard'].map(f => (
              <span key={f} style={{
                background: 'rgba(108,92,231,0.12)', border: '1px solid rgba(108,92,231,0.25)',
                borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'rgba(162,155,254,0.75)',
              }}>{f}</span>
            ))}
          </div>

          {/* Google */}
          <AuthBtn
            onClick={handleGoogle}
            loading={loading === 'google'}
            disabled={!!loading}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            }
            label={loading === 'google' ? 'Redirecting to Google...' : 'Continue with Google'}
            variant="white"
            style={{ marginBottom: 10 }}
          />

          {/* Phone */}
          <AuthBtn
            onClick={openPhoneScreen}
            loading={false}
            disabled={!!loading}
            icon={<Phone size={18} color="#A29BFE" />}
            label="Continue with Phone"
            variant="outline"
            style={{ marginBottom: 10 }}
          />

          {/* Divider */}
          <Divider />

          {/* Guest */}
          <AuthBtn
            onClick={handleAnon}
            loading={loading === 'anon'}
            disabled={!!loading}
            icon={<Sparkles size={16} />}
            label={loading === 'anon' ? 'Joining...' : 'Join as Guest 👤'}
            variant="ghost"
          />

          {error && <ErrorBox msg={error} />}

          <p style={{ color: 'rgba(162,155,254,0.28)', fontSize: 11, textAlign: 'center', marginTop: 20 }}>
            By continuing you agree to our Terms of Service
          </p>
        </div>
      )}

      {/* ━━━━━━━━ PHONE NUMBER SCREEN ━━━━━━━━ */}
      {screen === 'phone-number' && (
        <div className="auth-container" style={{ justifyContent: 'center' }}>
          <button onClick={() => { setScreen('main'); setError(''); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#A29BFE', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
            marginBottom: 28, padding: 0, alignSelf: 'flex-start',
          }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(108,92,231,0.6)',
            }}>
              <Phone size={28} color="white" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Enter your number</h2>
            <p style={{ color: 'rgba(162,155,254,0.55)', fontSize: 13, marginTop: 5 }}>
              We'll send a one-time verification code
            </p>
          </div>

          <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(162,155,254,0.65)', marginBottom: 8, display: 'block' }}>
            Phone Number
          </label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(162,155,254,0.5)', fontSize: 14, fontWeight: 600,
            }}>+</span>
            <input
              className="galaxy-input"
              type="tel"
              inputMode="tel"
              placeholder="1 (555) 000-0000"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value.replace(/[^\d\s\-\(\)\+]/g, ''))}
              onKeyDown={e => e.key === 'Enter' && handleSendOTP()}
              style={{ paddingLeft: 26 }}
              autoFocus
            />
          </div>

          <p style={{ color: 'rgba(162,155,254,0.4)', fontSize: 11, marginBottom: 18, lineHeight: 1.5 }}>
            Include your country code, e.g. <strong style={{ color: 'rgba(162,155,254,0.6)' }}>12025550123</strong> for US numbers
          </p>

          <button
            onClick={handleSendOTP}
            disabled={!phoneNumber.trim() || loading === 'otp-send'}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {loading === 'otp-send'
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending code...</>
              : <><ChevronRight size={16} /> Send Verification Code</>
            }
          </button>

          {error && <ErrorBox msg={error} />}
        </div>
      )}

      {/* ━━━━━━━━ OTP VERIFICATION SCREEN ━━━━━━━━ */}
      {screen === 'phone-otp' && (
        <div className="auth-container" style={{ justifyContent: 'center' }}>
          <button onClick={() => { setScreen('phone-number'); setError(''); setOtpDigits(['', '', '', '', '', '']); }} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#A29BFE', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14,
            marginBottom: 28, padding: 0, alignSelf: 'flex-start',
          }}>
            <ArrowLeft size={16} /> Change number
          </button>

          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(108,92,231,0.6)',
            }}>
              <ShieldCheck size={28} color="white" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>Verify your number</h2>
            {info && (
              <p style={{ color: '#A29BFE', fontSize: 13, marginTop: 5 }}>{info}</p>
            )}
          </div>

          {/* 6-digit OTP inputs */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={el => { otpInputsRef.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                style={{
                  width: 44, height: 52, borderRadius: 12, textAlign: 'center',
                  fontSize: 22, fontWeight: 700,
                  background: digit ? 'rgba(108,92,231,0.25)' : 'rgba(108,92,231,0.1)',
                  border: `2px solid ${digit ? 'rgba(162,155,254,0.7)' : 'rgba(108,92,231,0.3)'}`,
                  color: 'white', outline: 'none', fontFamily: 'inherit',
                  boxShadow: digit ? '0 0 10px rgba(108,92,231,0.4)' : 'none',
                  transition: 'all 0.15s',
                }}
              />
            ))}
          </div>

          <button
            onClick={handleVerifyOTP}
            disabled={otpDigits.join('').length < 6 || loading === 'otp-verify'}
            className="btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}
          >
            {loading === 'otp-verify'
              ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Verifying...</>
              : <><ShieldCheck size={16} /> Verify Code</>
            }
          </button>

          {/* Resend */}
          <div style={{ textAlign: 'center' }}>
            {resendCountdown > 0 ? (
              <p style={{ color: 'rgba(162,155,254,0.45)', fontSize: 13 }}>
                Resend code in <strong style={{ color: '#A29BFE' }}>{resendCountdown}s</strong>
              </p>
            ) : (
              <button onClick={handleResend} disabled={loading === 'otp-send'} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#A29BFE', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                opacity: loading === 'otp-send' ? 0.5 : 1,
              }}>
                {loading === 'otp-send' ? 'Sending...' : "Didn't receive it? Resend"}
              </button>
            )}
          </div>

          {error && <ErrorBox msg={error} />}
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ────────────────────────────────────────────

function AuthBtn({ icon, label, onClick, loading, disabled, variant, style }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  loading: boolean; disabled: boolean;
  variant: 'white' | 'outline' | 'ghost';
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
    fontSize: 14, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled && !loading ? 0.5 : 1, transition: 'all 0.2s',
    fontFamily: 'inherit', ...style,
  };
  const styles: Record<string, React.CSSProperties> = {
    white:   { background: 'white',                    border: 'none',                               color: '#333', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' },
    outline: { background: 'rgba(108,92,231,0.1)',     border: '1px solid rgba(108,92,231,0.35)',    color: '#A29BFE' },
    ghost:   { background: 'rgba(108,92,231,0.07)',    border: '1px solid rgba(108,92,231,0.2)',     color: '#A29BFE' },
  };
  return (
    <button onClick={!disabled ? onClick : undefined} style={{ ...base, ...styles[variant] }}>
      {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {label}
    </button>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(108,92,231,0.18)' }} />
      <span style={{ color: 'rgba(162,155,254,0.35)', fontSize: 12 }}>or</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(108,92,231,0.18)' }} />
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div style={{
      marginTop: 14, padding: '10px 14px',
      background: 'rgba(231,76,60,0.1)', border: '1px solid rgba(231,76,60,0.3)',
      borderRadius: 12, color: '#ff7675', fontSize: 13, textAlign: 'center', lineHeight: 1.5,
    }}>{msg}</div>
  );
}
