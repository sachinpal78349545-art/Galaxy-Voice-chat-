import { useState, useEffect, useRef } from 'react';
import { getRoomById, Room, Seat, GIFTS, Gift, sendGift, findUserById, generateId, addNotification } from '../lib/storage';
import { useApp } from '../lib/context';
import {
  Mic, MicOff, ArrowLeft, Gift as GiftIcon, Smile, Volume2, Send, Lock,
  Hand, Crown, UserX, ShieldOff, ShieldCheck, X, Check, ChevronDown, Users
} from 'lucide-react';

let AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;
import('agora-rtc-sdk-ng').then(m => { AgoraRTC = m.default; }).catch(() => {});
const AGORA_APP_ID = 'YOUR_AGORA_APP_ID_HERE';

interface RoomMsg { id: string; user: string; avatar: string; text: string; type?: 'system' | 'gift' }
const EMOJIS = ['🔥', '💜', '✨', '🎵', '❤️', '👏', '🌟', '😍', '🚀', '💫', '🎉', '👑', '💎', '🦋'];

export function VoiceRoomPage() {
  const { activeRoom, setActivePage, setActiveRoom, currentUser, showGiftAnimation, refreshUser } = useApp();
  const [room, setRoom] = useState<Room | null>(activeRoom ? getRoomById(activeRoom) : null);
  const [seats, setSeats] = useState<Seat[]>(room?.seats || []);
  const [isMicOn, setIsMicOn] = useState(false);
  const [chatMessages, setChatMessages] = useState<RoomMsg[]>([
    { id: '1', user: '✨ System', avatar: '✨', text: 'Welcome to the room! 🎉', type: 'system' },
    { id: '2', user: room?.hostName || 'Host', avatar: room?.hostAvatar || '🌟', text: 'Glad you joined! Click a seat to sit down 🎤' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showSeatMenu, setShowSeatMenu] = useState(false);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [raisedHands, setRaisedHands] = useState<string[]>(room?.raisedHands || []);
  const [listeners, setListeners] = useState<string[]>(room?.listeners || []);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [listenerCount, setListenerCount] = useState(room?.listeners.length || 0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const localTrackRef = useRef<unknown>(null);

  const isHost = currentUser?.id === room?.hostId;

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  // Simulate random speaking / listeners joining
  useEffect(() => {
    const iv = setInterval(() => {
      setSeats(prev => prev.map(s => ({
        ...s,
        isSpeaking: s.userId && !s.isMuted ? Math.random() > 0.65 : false,
      })));
    }, 2000);

    // Simulate listener fluctuation
    const lv = setInterval(() => {
      setListenerCount(prev => Math.max(0, prev + Math.floor(Math.random() * 3) - 1));
    }, 5000);

    return () => { clearInterval(iv); clearInterval(lv); };
  }, []);

  // Auto-add user to listeners on join
  useEffect(() => {
    if (!currentUser) return;
    if (!listeners.includes(currentUser.id)) {
      setListeners(prev => [...prev, currentUser.id]);
      setListenerCount(prev => prev + 1);
    }
  }, [currentUser]);

  function addMsg(msg: Omit<RoomMsg, 'id'>) {
    setChatMessages(prev => [...prev, { ...msg, id: generateId() }]);
  }

  // ── Seat actions ──
  function handleSeatClick(seat: Seat) {
    if (seat.isLocked) return;

    if (seat.userId === currentUser?.id) {
      // Own seat - show options
      setSelectedSeat(seat);
      setShowSeatMenu(true);
    } else if (!seat.userId && mySeatIndex === null) {
      // Take empty seat
      takeSeat(seat.index);
    } else if (seat.userId && isHost) {
      // Host click on occupied seat - show host controls
      setSelectedSeat(seat);
      setShowSeatMenu(true);
    }
  }

  function takeSeat(index: number) {
    if (!currentUser) return;
    setSeats(prev => prev.map((s, i) => i === index ? {
      ...s,
      userId: currentUser.id,
      username: currentUser.username,
      avatar: currentUser.avatar,
      isMuted: true, isSpeaking: false,
    } : s));
    setMySeatIndex(index);
    addMsg({ user: '✨ System', avatar: '✨', text: `${currentUser.username} joined the stage! 🎤`, type: 'system' });
  }

  function leaveSeat() {
    if (mySeatIndex === null || !currentUser) return;
    setSeats(prev => prev.map((s, i) => i === mySeatIndex ? {
      ...s, userId: null, username: null, avatar: null, isMuted: true, isSpeaking: false,
    } : s));
    setMySeatIndex(null);
    setIsMicOn(false);
    if (localTrackRef.current) {
      const track = localTrackRef.current as { stop: () => void; close: () => void };
      track.stop(); track.close(); localTrackRef.current = null;
    }
    addMsg({ user: '✨ System', avatar: '✨', text: `${currentUser.username} left the stage`, type: 'system' });
  }

  // ── Host controls ──
  function hostMuteUser(seat: Seat) {
    if (!seat.userId) return;
    setSeats(prev => prev.map(s => s.userId === seat.userId ? { ...s, isMuted: !s.isMuted } : s));
    addMsg({ user: '✨ System', avatar: '✨', text: `Host ${seat.isMuted ? 'unmuted' : 'muted'} ${seat.username}`, type: 'system' });
    setShowSeatMenu(false);
  }

  function hostKickUser(seat: Seat) {
    if (!seat.userId) return;
    setSeats(prev => prev.map(s => s.userId === seat.userId ? {
      ...s, userId: null, username: null, avatar: null, isMuted: true, isSpeaking: false,
    } : s));
    addMsg({ user: '✨ System', avatar: '✨', text: `${seat.username} was removed from the stage`, type: 'system' });
    setShowSeatMenu(false);
  }

  function hostToggleLock(index: number) {
    setSeats(prev => prev.map((s, i) => i === index ? { ...s, isLocked: !s.isLocked } : s));
    setShowSeatMenu(false);
  }

  function hostApproveHand(uid: string) {
    const user = findUserById(uid);
    if (!user) { setRaisedHands(prev => prev.filter(id => id !== uid)); return; }
    const emptySeat = seats.findIndex(s => !s.userId && !s.isLocked);
    if (emptySeat >= 0) {
      setSeats(prev => prev.map((s, i) => i === emptySeat ? {
        ...s, userId: user.id, username: user.username, avatar: user.avatar, isMuted: false,
      } : s));
      addMsg({ user: '✨ System', avatar: '✨', text: `${user.username} joined the stage! 🎉`, type: 'system' });
    }
    setRaisedHands(prev => prev.filter(id => id !== uid));
  }

  function hostRejectHand(uid: string) {
    setRaisedHands(prev => prev.filter(id => id !== uid));
  }

  // ── Mic ──
  async function toggleMic() {
    if (mySeatIndex === null) {
      addMsg({ user: '✨ System', avatar: '✨', text: 'Take a seat first to use your mic 💺', type: 'system' });
      return;
    }
    if (!isMicOn) {
      try {
        if (AgoraRTC && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID_HERE' && !clientRef.current) {
          clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
          await clientRef.current.join(AGORA_APP_ID, activeRoom!, null, currentUser?.id);
          const track = await AgoraRTC.createMicrophoneAudioTrack();
          localTrackRef.current = track;
          await clientRef.current.publish([track]);
        }
      } catch { /* Agora unavailable, continue with UI */ }
      setIsMicOn(true);
      setSeats(prev => prev.map((s, i) => i === mySeatIndex ? { ...s, isMuted: false, isSpeaking: true } : s));
    } else {
      if (localTrackRef.current) {
        const track = localTrackRef.current as { stop: () => void; close: () => void };
        track.stop(); track.close(); localTrackRef.current = null;
      }
      setIsMicOn(false);
      setSeats(prev => prev.map((s, i) => i === mySeatIndex ? { ...s, isMuted: true, isSpeaking: false } : s));
    }
  }

  // ── Raise hand ──
  function toggleRaiseHand() {
    if (mySeatIndex !== null) return; // already on stage
    if (!currentUser) return;
    if (hasRaisedHand) {
      setRaisedHands(prev => prev.filter(id => id !== currentUser.id));
      setHasRaisedHand(false);
      addMsg({ user: '✨ System', avatar: '✨', text: `${currentUser.username} lowered hand`, type: 'system' });
    } else {
      setRaisedHands(prev => [...prev, currentUser.id]);
      setHasRaisedHand(true);
      addMsg({ user: '✨ System', avatar: '✨', text: `${currentUser.username} raised hand ✋`, type: 'system' });
      addNotification({ id: generateId(), type: 'raise_hand', fromName: currentUser.username, fromAvatar: currentUser.avatar, text: `${currentUser.username} wants to speak`, timestamp: Date.now(), read: false });
    }
  }

  // ── Gift ──
  function sendGiftToHost(gift: Gift) {
    if (!currentUser || !room) return;
    const result = sendGift(currentUser.id, room.hostId, gift);
    if (!result.success) {
      addMsg({ user: '✨ System', avatar: '✨', text: result.reason || 'Not enough coins 💰', type: 'system' });
      setShowGifts(false);
      return;
    }
    refreshUser();
    addMsg({ user: currentUser.username, avatar: currentUser.avatar, text: `sent a ${gift.emoji} ${gift.name} to the host!`, type: 'gift' });
    showGiftAnimation(gift.emoji, gift.name);
    setShowGifts(false);
  }

  // ── Chat ──
  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !currentUser) return;
    addMsg({ user: currentUser.username, avatar: currentUser.avatar, text: chatInput.trim() });
    setChatInput('');
    setShowEmoji(false);
  }

  function sendEmojiMsg(emoji: string) {
    if (!currentUser) return;
    addMsg({ user: currentUser.username, avatar: currentUser.avatar, text: emoji });
    setShowEmoji(false);
  }

  async function leaveRoom() {
    if (localTrackRef.current) {
      const track = localTrackRef.current as { stop: () => void; close: () => void };
      track.stop(); track.close();
    }
    if (clientRef.current) await clientRef.current.leave().catch(() => {});
    setActiveRoom(null);
    setActivePage('rooms');
  }

  if (!room) return null;

  const myCoins = currentUser ? (findUserById(currentUser.id)?.coins ?? currentUser.coins) : 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)', position: 'relative',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 12px 12px',
        background: 'rgba(26, 15, 46, 0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(108, 92, 231, 0.2)', flexShrink: 0,
      }}>
        <button onClick={leaveRoom} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(231, 76, 60, 0.2)', border: '1px solid rgba(231, 76, 60, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#ff7675', flexShrink: 0,
        }}><ArrowLeft size={15} /></button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(162, 155, 254, 0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={10} /> <span>{seats.filter(s => s.userId).length} on stage</span>
            <span>·</span>
            <span>{listenerCount} listeners</span>
          </div>
        </div>

        {/* Host badge / LIVE */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isHost && (
            <div style={{
              background: 'rgba(253, 203, 110, 0.2)', border: '1px solid rgba(253, 203, 110, 0.4)',
              borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fdcb6e',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Crown size={10} /> HOST
            </div>
          )}
          <div style={{
            background: 'rgba(231, 76, 60, 0.15)', border: '1px solid rgba(231, 76, 60, 0.3)',
            borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#ff7675',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e74c3c', display: 'inline-block' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* ── Raised-hand queue (host view) ── */}
      {isHost && raisedHands.length > 0 && (
        <div style={{
          background: 'rgba(108, 92, 231, 0.12)', borderBottom: '1px solid rgba(108, 92, 231, 0.2)',
          padding: '8px 12px', flexShrink: 0,
        }}>
          <p style={{ fontSize: 11, color: '#A29BFE', fontWeight: 600, marginBottom: 6 }}>
            ✋ {raisedHands.length} speaker request{raisedHands.length > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {raisedHands.map(uid => {
              const u = findUserById(uid);
              const name = u?.username || 'User';
              const avatar = u?.avatar || '👤';
              return (
                <div key={uid} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(108, 92, 231, 0.2)', borderRadius: 20, padding: '4px 10px',
                  border: '1px solid rgba(108, 92, 231, 0.35)', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 14 }}>{avatar}</span>
                  <span style={{ fontSize: 11, color: 'white' }}>{name}</span>
                  <button onClick={() => hostApproveHand(uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00b894', padding: 0 }}><Check size={14} /></button>
                  <button onClick={() => hostRejectHand(uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff7675', padding: 0 }}><X size={14} /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Seat grid ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {/* Host seat always first in visual */}
        <div style={{ padding: '12px 16px 4px' }}>
          <p style={{ fontSize: 11, color: 'rgba(162, 155, 254, 0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {isHost ? '👑 You are the host' : ''}
          </p>
        </div>
        <div className="seat-grid">
          {seats.map((seat, idx) => (
            <SeatItem
              key={idx} seat={seat} index={idx}
              currentUserId={currentUser?.id}
              isHost={isHost}
              onClick={() => handleSeatClick(seat)}
            />
          ))}
        </div>

        {/* Room chat */}
        <div style={{
          margin: '4px 12px 6px',
          background: 'rgba(26, 15, 46, 0.6)',
          borderRadius: 16, border: '1px solid rgba(108, 92, 231, 0.15)',
          overflow: 'hidden',
        }}>
          <div style={{ height: 120, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none' }}>
            {chatMessages.map(msg => (
              <div key={msg.id} style={{ marginBottom: 4 }}>
                {msg.type === 'gift' ? (
                  <span style={{ fontSize: 12 }}>
                    <span style={{ color: '#fdcb6e', fontWeight: 600 }}>🎁 {msg.user}</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}> {msg.text}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 12 }}>
                    <span style={{ color: msg.type === 'system' ? 'rgba(162,155,254,0.5)' : '#A29BFE', fontWeight: 600 }}>
                      {msg.avatar} {msg.user}:
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 4 }}>{msg.text}</span>
                  </span>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
        </div>
      </div>

      {/* ── Bottom controls ── */}
      <div style={{
        background: 'rgba(26, 15, 46, 0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(108, 92, 231, 0.2)',
        padding: '8px 10px 16px', flexShrink: 0,
      }}>
        {/* Gift picker */}
        {showGifts && (
          <div style={{
            marginBottom: 8, padding: '10px 4px',
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          }}>
            {GIFTS.map(g => (
              <button key={g.id} onClick={() => sendGiftToHost(g)} style={{
                background: 'rgba(108, 92, 231, 0.1)',
                border: '1px solid rgba(108, 92, 231, 0.25)', borderRadius: 12,
                padding: '8px 4px', cursor: 'pointer', display: 'flex',
                flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.2s', color: 'white',
              }}>
                <span style={{ fontSize: 28 }}>{g.emoji}</span>
                <span style={{ fontSize: 9, color: 'rgba(162,155,254,0.7)' }}>{g.name}</span>
                <span style={{ fontSize: 10, color: '#fdcb6e', fontWeight: 700 }}>💰{g.cost}</span>
              </button>
            ))}
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>
              Your coins: 💰{myCoins.toLocaleString()}
            </div>
          </div>
        )}

        {/* Emoji picker */}
        {showEmoji && !showGifts && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 0' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => sendEmojiMsg(e)} style={{
                fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
              }}>{e}</button>
            ))}
          </div>
        )}

        {/* Chat input */}
        <form onSubmit={sendChat} style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center' }}>
          <input className="galaxy-input" placeholder="Say something..."
            value={chatInput} onChange={e => setChatInput(e.target.value)}
            style={{ flex: 1, padding: '9px 12px', fontSize: 13 }} />
          <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowGifts(false); }} style={{
            width: 36, height: 36, borderRadius: '50%',
            background: showEmoji ? 'rgba(108, 92, 231, 0.4)' : 'rgba(108, 92, 231, 0.15)',
            border: '1px solid rgba(108, 92, 231, 0.35)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A29BFE', flexShrink: 0,
          }}><Smile size={15} /></button>
          <button type="submit" style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
          }}><Send size={14} /></button>
        </form>

        {/* Main action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          {/* Gift */}
          <ActionBtn
            icon={<GiftIcon size={17} />} label="Gift"
            active={showGifts}
            onClick={() => { setShowGifts(!showGifts); setShowEmoji(false); }}
          />

          {/* Raise hand (non-host, not on stage) */}
          {!isHost && mySeatIndex === null && (
            <ActionBtn
              icon={<Hand size={17} />} label={hasRaisedHand ? 'Lower' : 'Raise'}
              active={hasRaisedHand}
              onClick={toggleRaiseHand}
              glow={hasRaisedHand}
            />
          )}

          {/* Leave seat / take seat */}
          {mySeatIndex !== null ? (
            <ActionBtn
              icon={<ChevronDown size={17} />} label="Leave"
              onClick={leaveSeat} danger
            />
          ) : (
            <ActionBtn
              icon={<span style={{ fontSize: 15 }}>💺</span>} label="Sit"
              onClick={() => {
                const empty = seats.findIndex(s => !s.userId && !s.isLocked);
                if (empty >= 0) takeSeat(empty);
                else addMsg({ user: '✨ System', avatar: '✨', text: 'No empty seats available', type: 'system' });
              }}
            />
          )}

          {/* Main MIC button */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button className={`mic-main-btn ${isMicOn ? 'active' : 'inactive'}`} onClick={toggleMic}
              style={{ opacity: mySeatIndex === null ? 0.4 : 1 }}>
              {isMicOn ? <Mic size={22} color="white" /> : <MicOff size={22} color="rgba(162,155,254,0.5)" />}
            </button>
            <span style={{ fontSize: 9, color: 'rgba(162,155,254,0.5)' }}>
              {isMicOn ? 'Speaking' : mySeatIndex === null ? 'No seat' : 'Muted'}
            </span>
          </div>

          <ActionBtn icon={<Volume2 size={17} />} label="Volume" onClick={() => {}} />
        </div>
      </div>

      {/* ── Seat menu modal ── */}
      {showSeatMenu && selectedSeat && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500,
          display: 'flex', alignItems: 'flex-end',
        }} onClick={() => setShowSeatMenu(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)',
            borderRadius: '24px 24px 0 0', border: '1px solid rgba(108, 92, 231, 0.3)',
            width: '100%', maxWidth: 400, margin: '0 auto', padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>{selectedSeat.avatar || '?'}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{selectedSeat.username || 'Empty'}</div>
                <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.6)' }}>Seat #{selectedSeat.index + 1}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedSeat.userId === currentUser?.id ? (
                <SeatMenuBtn icon={<ChevronDown size={16} />} label="Leave Seat" onClick={leaveSeat} />
              ) : isHost && selectedSeat.userId ? (
                <>
                  <SeatMenuBtn icon={selectedSeat.isMuted ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                    label={selectedSeat.isMuted ? 'Unmute' : 'Mute'} onClick={() => hostMuteUser(selectedSeat)} />
                  <SeatMenuBtn icon={<UserX size={16} />} label="Kick from Stage" onClick={() => hostKickUser(selectedSeat)} danger />
                </>
              ) : null}
              {isHost && (
                <SeatMenuBtn
                  icon={<Lock size={16} />}
                  label={selectedSeat.isLocked ? 'Unlock Seat' : 'Lock Seat'}
                  onClick={() => hostToggleLock(selectedSeat.index)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function SeatItem({ seat, index, currentUserId, isHost, onClick }:
  { seat: Seat; index: number; currentUserId?: string; isHost: boolean; onClick: () => void }) {
  const isMe = seat.userId === currentUserId;

  if (seat.isLocked) {
    return (
      <div className="seat-item" onClick={isHost ? onClick : undefined} style={{ cursor: isHost ? 'pointer' : 'default' }}>
        <div className="seat-avatar seat-locked">
          <Lock size={20} color="rgba(108, 92, 231, 0.4)" />
        </div>
        <span className="seat-name" style={{ color: 'rgba(108, 92, 231, 0.4)' }}>Locked</span>
      </div>
    );
  }

  if (!seat.userId) {
    return (
      <div className="seat-item" onClick={onClick}>
        <div className="seat-avatar seat-empty">
          <span style={{ fontSize: 18, color: 'rgba(108, 92, 231, 0.35)' }}>+</span>
        </div>
        <span className="seat-name" style={{ color: 'rgba(108, 92, 231, 0.35)' }}>Empty</span>
      </div>
    );
  }

  return (
    <div className="seat-item" onClick={onClick}>
      <div
        className={`seat-avatar ${seat.isSpeaking ? 'avatar-speaking' : 'avatar-ring'}`}
        style={{
          background: `linear-gradient(135deg, ${isMe ? '#6C5CE7' : '#3d2b7a'}, ${isMe ? '#A29BFE' : '#6554af'})`,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 26 }}>{seat.avatar}</span>
        {index === 0 && (
          <div style={{
            position: 'absolute', top: -4, right: -4, fontSize: 14,
            filter: 'drop-shadow(0 0 4px rgba(253,203,110,0.8))',
          }}>👑</div>
        )}
        <div className={`mic-indicator ${seat.isMuted ? 'mic-muted' : 'mic-on'}`}>
          {seat.isMuted ? <MicOff size={9} color="white" /> : <Mic size={9} color="white" />}
        </div>
      </div>
      <span className="seat-name" style={{ color: isMe ? '#A29BFE' : undefined, fontWeight: isMe ? 700 : 500 }}>
        {isMe ? 'You' : seat.username}
      </span>
    </div>
  );
}

function ActionBtn({ icon, label, onClick, active, danger, glow }: {
  icon: React.ReactNode; label: string; onClick: () => void;
  active?: boolean; danger?: boolean; glow?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer' }} onClick={onClick}>
      <div style={{
        width: 42, height: 42, borderRadius: '50%',
        background: active ? 'rgba(108, 92, 231, 0.35)' : danger ? 'rgba(231, 76, 60, 0.15)' : 'rgba(108, 92, 231, 0.1)',
        border: `1px solid ${active ? 'rgba(108,92,231,0.6)' : danger ? 'rgba(231,76,60,0.35)' : 'rgba(108,92,231,0.25)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? '#A29BFE' : danger ? '#ff7675' : '#A29BFE',
        boxShadow: glow ? '0 0 12px rgba(108,92,231,0.7)' : 'none',
        transition: 'all 0.2s',
      }}>{icon}</div>
      <span style={{ fontSize: 9, color: 'rgba(162,155,254,0.55)' }}>{label}</span>
    </div>
  );
}

function SeatMenuBtn({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      background: danger ? 'rgba(231, 76, 60, 0.1)' : 'rgba(108, 92, 231, 0.1)',
      border: `1px solid ${danger ? 'rgba(231,76,60,0.25)' : 'rgba(108,92,231,0.25)'}`,
      borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
      color: danger ? '#ff7675' : '#A29BFE', fontSize: 14, fontWeight: 600,
    }}>
      {icon} {label}
    </button>
  );
}
