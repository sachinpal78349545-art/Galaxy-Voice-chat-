import { useState, useRef } from 'react';
import { Stars } from '../components/Stars';
import { useApp } from '../lib/context.tsx';

// ✅ Case Fix: 'L' is Capital in Logo.png
import logo from "../assets/Logo.png";

type Screen = 'main' | 'phone-number' | 'phone-otp';

export function AuthPage() {
  // ✅ Context se setUser nikaal rahe hain (Firebase dependency khatam)
  const { setUser, setActivePage } = useApp();

  const [screen, setScreen] = useState<Screen>('main');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // ✅ Helper: Local Login Generator
  const performLocalLogin = (method: string) => {
    setLoading(method);
    
    // 1 second ka delay taaki real feel aaye
    setTimeout(() => {
      const fakeUser = {
        uid: 'user_' + Math.random().toString(36).substr(2, 9),
        displayName: method === 'anon' ? 'Guest Explorer' : 'Galaxy Hero',
        photoURL: method === 'anon' ? '👤' : '🚀',
        shortId: Math.floor(10000 + Math.random() * 90000).toString(),
        coins: 1000
      };

      setUser(fakeUser); // Context mein save karega aur localStorage mein bhi
      setActivePage('home'); // Home page par bhej dega
      setLoading(null);
    }, 800);
  };

  // ✅ Login Handlers
  async function handleGoogle() {
    setError('');
    performLocalLogin('google');
  }

  async function handleAnon() {
    setError('');
    performLocalLogin('anon');
  }

  async function handleSendOTP() {
    if (!phoneNumber) return setError('Enter phone number');
    setError('');
    setLoading('otp-send');
    
    setTimeout(() => {
      setScreen('phone-otp');
      setLoading(null);
    }, 500);
  }

  async function handleVerifyOTP() {
    const code = otpDigits.join('');
    if (code.length < 6) return setError('Enter 6-digit OTP');
    setError('');
    performLocalLogin('phone');
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);

    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  return (
    <div className="app-container relative min-h-screen bg-black text-white flex flex-col items-center justify-center overflow-hidden">
      <Stars />

      {screen === 'main' && (
        <div style={{ textAlign: 'center', padding: '20px', zIndex: 10 }}>
          <img 
            src={logo} 
            alt="Galaxy Voice" 
            style={{ width: "130px", marginBottom: "20px", margin: "0 auto", filter: "drop-shadow(0 0 10px rgba(147, 51, 234, 0.5))" }} 
          />
          
          <h1 className="text-3xl font-bold mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            GALAXY VOICE
          </h1>
          <p className="text-gray-400 mb-10 text-sm">Voice Rooms & Global Chat</p>

          <div className="flex flex-col gap-4 items-center">
            <button 
              onClick={handleGoogle}
              style={styles.primaryBtn}
              className="hover:scale-105 transition-transform active:scale-95"
            >
              {loading === 'google' ? 'Connecting...' : 'Continue with Google'}
            </button>

            <button 
              onClick={() => setScreen('phone-number')}
              style={styles.secondaryBtn}
              className="hover:bg-white/5 transition-colors"
            >
              Continue with Phone
            </button>

            <button 
              onClick={handleAnon}
              className="text-gray-500 mt-4 text-sm hover:text-white transition-colors"
            >
              {loading === 'anon' ? 'Entering Galaxy...' : 'Join as Guest'}
            </button>
          </div>

          {error && <p className="text-red-400 mt-6 text-xs bg-red-500/10 p-2 rounded border border-red-500/20">{error}</p>}
        </div>
      )}

      {(screen === 'phone-number' || screen === 'phone-otp') && (
        <div style={{ padding: '20px', zIndex: 10, textAlign: 'center' }}>
          <h2 className="text-2xl font-bold mb-6 text-blue-400">
            {screen === 'phone-number' ? 'Enter Phone' : 'Verify OTP'}
          </h2>
          
          {screen === 'phone-number' ? (
            <div className="flex flex-col gap-5 items-center">
              <input
                className="bg-gray-900 border border-gray-700 p-4 rounded-2xl w-72 text-center text-xl focus:border-purple-500 outline-none transition-all"
                placeholder="+91 xxxxx xxxxx"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
              <button 
                onClick={handleSendOTP} 
                style={styles.actionBtn}
                className="hover:opacity-90 active:scale-95 transition-all"
              >
                {loading === 'otp-send' ? 'Sending...' : 'Get OTP'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-6 items-center">
              <div className="flex gap-2 justify-center">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => otpInputsRef.current[i] = el}
                    maxLength={1}
                    className="w-10 h-14 bg-gray-900 border border-gray-700 text-center text-2xl font-bold rounded-xl focus:border-green-500 outline-none"
                    value={d}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                  />
                ))}
              </div>
              <button 
                onClick={handleVerifyOTP} 
                style={{...styles.actionBtn, backgroundColor: '#10b981'}}
                className="hover:opacity-90 active:scale-95 transition-all"
              >
                {loading === 'phone' ? 'Verifying...' : 'Verify & Enter'}
              </button>
            </div>
          )}
          
          <button 
            onClick={() => setScreen('main')} 
            className="mt-10 text-gray-500 text-sm flex items-center gap-2 mx-auto hover:text-gray-300"
          >
            ← Back to Login
          </button>
        </div>
      )}
    </div>
  );
}

const styles: any = {
  primaryBtn: {
    backgroundColor: '#ffffff',
    color: '#000000',
    padding: '14px 30px',
    borderRadius: '16px',
    fontWeight: 'bold',
    width: '280px',
    fontSize: '16px',
  },
  secondaryBtn: {
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#ffffff',
    padding: '14px 30px',
    borderRadius: '16px',
    fontWeight: 'bold',
    width: '280px',
    fontSize: '16px'
  },
  actionBtn: {
    backgroundColor: '#9333ea',
    color: 'white',
    padding: '14px 0',
    borderRadius: '16px',
    fontWeight: 'bold',
    width: '100%',
    fontSize: '16px',
    boxShadow: '0 4px 15px rgba(147, 51, 234, 0.3)'
  }
};
