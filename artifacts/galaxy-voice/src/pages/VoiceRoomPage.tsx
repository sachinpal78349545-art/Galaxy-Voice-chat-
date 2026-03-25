import { useState, useEffect, useRef } from 'react';
import { getRoomById, getCurrentUser, Seat } from '../lib/storage';
import { useApp } from '../lib/context';
import {
  Mic, MicOff, ArrowLeft, Gift, Smile, Volume2, Send, Lock
} from 'lucide-react';

// Agora SDK (optional - works without it)
let AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;
import('agora-rtc-sdk-ng').then(m => { AgoraRTC = m.default; }).catch(() => {});

const AGORA_APP_ID = 'YOUR_AGORA_APP_ID_HERE';

interface RoomChatMsg {
  user: string;
  avatar: string;
  text: string;
  id: string;
}

const EMOJIS = ['🔥', '💜', '✨', '🎵', '❤️', '👏', '🌟', '😍', '🚀', '💫'];

export function VoiceRoomPage() {
  const { activeRoom, setActivePage, setActiveRoom, currentUser } = useApp();
  const room = activeRoom ? getRoomById(activeRoom) : null;
  const [seats, setSeats] = useState<Seat[]>(room?.seats || []);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatMessages, setChatMessages] = useState<RoomChatMsg[]>([
    { id: '1', user: 'System', avatar: '🌟', text: 'Welcome to the room! 🎉' },
    { id: '2', user: room?.hostName || 'Host', avatar: room?.hostAvatar || '🌟', text: 'Glad you joined! Feel free to speak!' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Agora refs
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const localTrackRef = useRef<ReturnType<typeof AgoraRTC.createMicrophoneAudioTrack> extends Promise<infer T> ? T : never | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Simulate random speaking users
  useEffect(() => {
    const interval = setInterval(() => {
      setSeats(prev => prev.map(seat => ({
        ...seat,
        isSpeaking: seat.userId && !seat.isMuted
          ? Math.random() > 0.7
          : false,
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Join room on mount - add current user to first empty seat
  useEffect(() => {
    if (!currentUser) return;
    setSeats(prev => {
      const alreadyIn = prev.some(s => s.userId === currentUser.id);
      if (alreadyIn) return prev;
      const emptyIdx = prev.findIndex(s => !s.userId && !s.isLocked);
      if (emptyIdx < 0) return prev;
      return prev.map((s, i) => i === emptyIdx ? {
        ...s, userId: currentUser.id,
        username: currentUser.username,
        avatar: currentUser.avatar,
        isMuted: true, isSpeaking: false,
      } : s);
    });
  }, [currentUser]);

  async function toggleMic() {
    if (!isMicOn) {
      // Turn on mic
      try {
        if (AgoraRTC && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID_HERE') {
          if (!clientRef.current) {
            clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            await clientRef.current.join(AGORA_APP_ID, activeRoom!, null, currentUser?.id);
          }
          const track = await AgoraRTC.createMicrophoneAudioTrack();
          localTrackRef.current = track as never;
          await clientRef.current.publish([track]);
          setIsConnected(true);
        }
        setIsMicOn(true);
        setSeats(prev => prev.map(s =>
          s.userId === currentUser?.id ? { ...s, isMuted: false, isSpeaking: true } : s
        ));
        addSystemMsg(`${currentUser?.username} turned on their mic 🎤`);
      } catch (err) {
        console.error('Mic error:', err);
        // Still toggle UI even if Agora fails
        setIsMicOn(true);
        setSeats(prev => prev.map(s =>
          s.userId === currentUser?.id ? { ...s, isMuted: false, isSpeaking: true } : s
        ));
      }
    } else {
      // Turn off mic
      if (localTrackRef.current) {
        (localTrackRef.current as never as { stop: () => void; close: () => void }).stop();
        (localTrackRef.current as never as { stop: () => void; close: () => void }).close();
        localTrackRef.current = null;
      }
      setIsMicOn(false);
      setSeats(prev => prev.map(s =>
        s.userId === currentUser?.id ? { ...s, isMuted: true, isSpeaking: false } : s
      ));
    }
  }

  async function leaveRoom() {
    if (localTrackRef.current) {
      (localTrackRef.current as never as { stop: () => void; close: () => void }).stop();
      (localTrackRef.current as never as { stop: () => void; close: () => void }).close();
    }
    if (clientRef.current) {
      await clientRef.current.leave();
    }
    setActiveRoom(null);
    setActivePage('rooms');
  }

  function addSystemMsg(text: string) {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: '✨ System',
      avatar: '✨',
      text,
    }]);
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: currentUser?.username || 'You',
      avatar: currentUser?.avatar || '🌟',
      text: chatInput.trim(),
    }]);
    setChatInput('');
    setShowEmoji(false);
  }

  function sendEmoji(emoji: string) {
    setChatMessages(prev => [...prev, {
      id: Date.now().toString(),
      user: currentUser?.username || 'You',
      avatar: currentUser?.avatar || '🌟',
      text: emoji,
    }]);
    setShowEmoji(false);
  }

  if (!room) return null;

  const filledSeats = seats.filter(s => s.userId);
  const emptySpeakerRow = seats.filter(s => !s.userId && !s.isLocked).length;
  const lockedSeats = seats.filter(s => s.isLocked).length;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 16px 12px',
        background: 'rgba(26, 15, 46, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(108, 92, 231, 0.2)',
        flexShrink: 0,
      }}>
        <button
          onClick={leaveRoom}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(231, 76, 60, 0.2)',
            border: '1px solid rgba(231, 76, 60, 0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#ff7675',
          }}
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>{room.name}</div>
          <div style={{ fontSize: 12, color: 'rgba(162, 155, 254, 0.6)' }}>
            {room.topic} · {filledSeats.length} listeners
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(231, 76, 60, 0.15)',
          border: '1px solid rgba(231, 76, 60, 0.3)',
          borderRadius: 12, padding: '4px 10px',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#e74c3c', display: 'block' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#ff7675' }}>LIVE</span>
        </div>
      </div>

      {/* Seats grid */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        <div className="seat-grid">
          {seats.map((seat, idx) => (
            <SeatItem key={idx} seat={seat} index={idx} currentUserId={currentUser?.id} />
          ))}
        </div>

        {/* Chat area */}
        <div style={{
          margin: '0 12px 8px',
          background: 'rgba(26, 15, 46, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(108, 92, 231, 0.2)',
          overflow: 'hidden',
        }}>
          <div className="room-chat-area" ref={undefined}>
            {chatMessages.map(msg => (
              <div key={msg.id} className="room-chat-msg">
                <span className="msg-user">{msg.avatar} {msg.user}:</span>
                <span className="msg-text">{msg.text}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div style={{
        background: 'rgba(26, 15, 46, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(108, 92, 231, 0.25)',
        padding: '8px 12px 16px',
        flexShrink: 0,
      }}>
        {/* Emoji picker */}
        {showEmoji && (
          <div style={{
            display: 'flex', gap: 8, marginBottom: 8,
            padding: '8px 4px', overflowX: 'auto', scrollbarWidth: 'none',
          }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => sendEmoji(e)} style={{
                fontSize: 22, background: 'none', border: 'none', cursor: 'pointer',
                flexShrink: 0, transition: 'transform 0.1s',
              }}
                onMouseDown={ev => (ev.currentTarget.style.transform = 'scale(1.3)')}
                onMouseUp={ev => (ev.currentTarget.style.transform = 'scale(1)')}
              >{e}</button>
            ))}
          </div>
        )}

        {/* Chat input */}
        <form onSubmit={sendChat} style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
          <input
            className="galaxy-input"
            placeholder="Say something..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', fontSize: 13 }}
          />
          <button
            type="button"
            onClick={() => setShowEmoji(!showEmoji)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: showEmoji ? 'rgba(108, 92, 231, 0.4)' : 'rgba(108, 92, 231, 0.2)',
              border: '1px solid rgba(108, 92, 231, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#A29BFE', flexShrink: 0,
            }}
          >
            <Smile size={16} />
          </button>
          <button
            type="submit"
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
            }}
          >
            <Send size={15} />
          </button>
        </form>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <ActionBtn icon={<Gift size={18} />} label="Gift" onClick={() => addSystemMsg('🎁 Gift sent!')} />

          {/* Main mic button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button
              className={`mic-main-btn ${isMicOn ? 'active' : 'inactive'}`}
              onClick={toggleMic}
            >
              {isMicOn ? <Mic size={24} color="white" /> : <MicOff size={24} color="rgba(162,155,254,0.6)" />}
            </button>
            <span style={{ fontSize: 10, color: 'rgba(162, 155, 254, 0.6)' }}>
              {isMicOn ? 'Speaking' : 'Muted'}
            </span>
          </div>

          <ActionBtn icon={<Volume2 size={18} />} label="Sound" onClick={() => {}} />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: 'rgba(108, 92, 231, 0.15)',
        border: '1px solid rgba(108, 92, 231, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#A29BFE', transition: 'all 0.2s ease',
      }}>{icon}</div>
      <span style={{ fontSize: 10, color: 'rgba(162, 155, 254, 0.6)' }}>{label}</span>
    </div>
  );
}

function SeatItem({ seat, index, currentUserId }: { seat: Seat; index: number; currentUserId?: string }) {
  const isMe = seat.userId === currentUserId;

  if (seat.isLocked) {
    return (
      <div className="seat-item">
        <div className="seat-avatar seat-locked">
          <Lock size={20} color="rgba(108, 92, 231, 0.4)" />
        </div>
        <span className="seat-name" style={{ color: 'rgba(108, 92, 231, 0.4)' }}>Locked</span>
      </div>
    );
  }

  if (!seat.userId) {
    return (
      <div className="seat-item">
        <div className="seat-avatar seat-empty">
          <span style={{ fontSize: 16, color: 'rgba(108, 92, 231, 0.3)' }}>+</span>
        </div>
        <span className="seat-name" style={{ color: 'rgba(108, 92, 231, 0.3)' }}>Empty</span>
      </div>
    );
  }

  return (
    <div className="seat-item">
      <div
        className={`seat-avatar ${seat.isSpeaking ? 'avatar-speaking' : 'avatar-ring'}`}
        style={{
          background: `linear-gradient(135deg, ${isMe ? '#6C5CE7' : '#4a3080'}, ${isMe ? '#A29BFE' : '#7c6fbf'})`,
          border: isMe ? '2px solid #A29BFE' : undefined,
        }}
      >
        <span style={{ fontSize: 28 }}>{seat.avatar}</span>
        <div className={`mic-indicator ${seat.isMuted ? 'mic-muted' : 'mic-on'}`}>
          {seat.isMuted
            ? <MicOff size={10} color="white" />
            : <Mic size={10} color="white" />
          }
        </div>
      </div>
      <span className="seat-name" style={{ color: isMe ? '#A29BFE' : undefined }}>
        {isMe ? 'You' : seat.username}
      </span>
    </div>
  );
}
