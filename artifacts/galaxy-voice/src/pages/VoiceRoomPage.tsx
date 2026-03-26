import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FBRoom, FBSeat, FBMessage, listenRoom, listenRoomMessages,
  takeSeat as fbTakeSeat, leaveSeat as fbLeaveSeat, muteSeat,
  kickSeat, lockSeat, sendRoomMessage, raiseHand, lowerHand,
  incrementListeners,
} from '../lib/fbRooms';
import { GIFTS, Gift } from '../lib/storage';
import { updateUserCoins } from '../lib/fbAuth';
import { useApp } from '../lib/context';
import {
  Mic, MicOff, ArrowLeft, Gift as GiftIcon, Smile, Send, Lock,
  Hand, Crown, UserX, ShieldOff, ShieldCheck, X, Check,
  ChevronDown, Users, Loader,
} from 'lucide-react';

const EMOJIS = ['🔥', '💜', '✨', '🎵', '❤️', '👏', '🌟', '😍', '🚀', '💫', '🎉', '👑', '💎', '🦋'];

let AgoraRTC: typeof import('agora-rtc-sdk-ng').default | null = null;
import('agora-rtc-sdk-ng').then(m => { AgoraRTC = m.default; }).catch(() => {});
const AGORA_APP_ID = 'YOUR_AGORA_APP_ID_HERE';

export function VoiceRoomPage() {
  const { activeRoom: roomId, setActivePage, setActiveRoom, currentUser, showGiftAnimation, refreshUser } = useApp();
  const [room, setRoom] = useState<FBRoom | null>(null);
  const [messages, setMessages] = useState<FBMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifts, setShowGifts] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [selectedSeat, setSelectedSeat] = useState<FBSeat | null>(null);
  const [showSeatMenu, setShowSeatMenu] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<ReturnType<typeof AgoraRTC.createClient> | null>(null);
  const localTrackRef = useRef<unknown>(null);

  const isHost = room?.hostId === currentUser?.uid;

  // ─ Subscribe to room ─
  useEffect(() => {
    if (!roomId) return;
    const unsub = listenRoom(roomId, r => {
      setRoom(r);
      setLoadingRoom(false);
    });
    return unsub;
  }, [roomId]);

  // ─ Subscribe to messages ─
  useEffect(() => {
    if (!roomId) return;
    const unsub = listenRoomMessages(roomId, msgs => setMessages(msgs));
    return unsub;
  }, [roomId]);

  // ─ Increment listener count ─
  useEffect(() => {
    if (!roomId || !currentUser) return;
    incrementListeners(roomId, 1);
    return () => { incrementListeners(roomId, -1); };
  }, [roomId, currentUser]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSeatClick = useCallback((seat: FBSeat) => {
    if (!currentUser) return;
    if (seat.isLocked) return;

    if (seat.userId === currentUser.uid) {
      setSelectedSeat(seat);
      setShowSeatMenu(true);
    } else if (!seat.userId && mySeatIndex === null) {
      handleTakeSeat(seat.index);
    } else if (seat.userId && isHost) {
      setSelectedSeat(seat);
      setShowSeatMenu(true);
    }
  }, [currentUser, mySeatIndex, isHost]);

  async function handleTakeSeat(index: number) {
    if (!currentUser || !roomId) return;
    await fbTakeSeat(roomId, index, currentUser);
    setMySeatIndex(index);
    await sendRoomMessage(roomId, {
      senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
      text: `${currentUser.displayName} joined the stage! 🎤`,
      type: 'system', timestamp: Date.now(),
    });
  }

  async function handleLeaveSeat() {
    if (mySeatIndex === null || !currentUser || !roomId) return;
    await fbLeaveSeat(roomId, mySeatIndex);
    setMySeatIndex(null);
    setIsMicOn(false);
    if (localTrackRef.current) {
      const t = localTrackRef.current as { stop: () => void; close: () => void };
      t.stop(); t.close(); localTrackRef.current = null;
    }
    setShowSeatMenu(false);
    await sendRoomMessage(roomId, {
      senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
      text: `${currentUser.displayName} left the stage`,
      type: 'system', timestamp: Date.now(),
    });
  }

  // ─ Host controls ─
  async function hostMute(seat: FBSeat) {
    if (!roomId) return;
    await muteSeat(roomId, seat.index, !seat.isMuted);
    setShowSeatMenu(false);
  }

  async function hostKick(seat: FBSeat) {
    if (!roomId) return;
    await kickSeat(roomId, seat.index);
    await sendRoomMessage(roomId, {
      senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
      text: `${seat.displayName} was removed from the stage`,
      type: 'system', timestamp: Date.now(),
    });
    setShowSeatMenu(false);
  }

  async function hostLock(seat: FBSeat) {
    if (!roomId) return;
    await lockSeat(roomId, seat.index, !seat.isLocked);
    setShowSeatMenu(false);
  }

  async function hostApproveHand(uid: string, name: string) {
    if (!roomId || !room) return;
    const emptySeat = room.seats.findIndex(s => !s.userId && !s.isLocked);
    if (emptySeat >= 0) {
      const raisedUser = room.raisedHands?.[uid];
      if (raisedUser) {
        await fbTakeSeat(roomId, emptySeat, { uid, displayName: raisedUser.name, photoURL: raisedUser.avatar } as never);
        await sendRoomMessage(roomId, {
          senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
          text: `${name} joined the stage! 🎉`,
          type: 'system', timestamp: Date.now(),
        });
      }
    }
    await lowerHand(roomId, uid);
  }

  async function hostRejectHand(uid: string) {
    if (!roomId) return;
    await lowerHand(roomId, uid);
  }

  // ─ Mic ─
  async function toggleMic() {
    if (!currentUser || !roomId) return;
    if (mySeatIndex === null) {
      await sendRoomMessage(roomId, {
        senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
        text: 'Take a seat first to use your mic 💺', type: 'system', timestamp: Date.now(),
      });
      return;
    }
    if (!isMicOn) {
      try {
        if (AgoraRTC && AGORA_APP_ID !== 'YOUR_AGORA_APP_ID_HERE' && !clientRef.current) {
          clientRef.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
          await clientRef.current.join(AGORA_APP_ID, roomId, null, currentUser.uid);
          const track = await AgoraRTC.createMicrophoneAudioTrack();
          localTrackRef.current = track;
          await clientRef.current.publish([track]);
        }
      } catch { /* Agora unavailable */ }
      setIsMicOn(true);
      await muteSeat(roomId, mySeatIndex, false);
    } else {
      if (localTrackRef.current) {
        const t = localTrackRef.current as { stop: () => void; close: () => void };
        t.stop(); t.close(); localTrackRef.current = null;
      }
      setIsMicOn(false);
      await muteSeat(roomId, mySeatIndex, true);
    }
  }

  // ─ Raise hand ─
  async function toggleRaiseHand() {
    if (!currentUser || !roomId || mySeatIndex !== null) return;
    if (hasRaisedHand) {
      await lowerHand(roomId, currentUser.uid);
      setHasRaisedHand(false);
    } else {
      await raiseHand(roomId, currentUser);
      setHasRaisedHand(true);
      await sendRoomMessage(roomId, {
        senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
        text: `${currentUser.displayName} raised hand ✋`, type: 'system', timestamp: Date.now(),
      });
    }
  }

  // ─ Gift ─
  async function handleGift(gift: Gift) {
    if (!currentUser || !room || !roomId) return;
    if ((currentUser.coins || 0) < gift.cost) {
      await sendRoomMessage(roomId, {
        senderId: 'system', senderName: '✨ System', senderAvatar: '✨',
        text: 'Not enough coins 💰', type: 'system', timestamp: Date.now(),
      });
      setShowGifts(false);
      return;
    }
    await updateUserCoins(currentUser.uid, -gift.cost);
    if (room.hostId !== currentUser.uid) {
      await updateUserCoins(room.hostId, Math.floor(gift.cost * 0.7));
    }
    await refreshUser();
    await sendRoomMessage(roomId, {
      senderId: currentUser.uid, senderName: currentUser.displayName,
      senderAvatar: currentUser.photoURL,
      text: `sent a ${gift.emoji} ${gift.name} to the host!`,
      type: 'gift', timestamp: Date.now(),
    });
    showGiftAnimation(gift.emoji, gift.name);
    setShowGifts(false);
  }

  // ─ Chat ─
  async function sendChat(e: React.FormEvent, overrideText?: string) {
    e.preventDefault();
    if (!currentUser || !roomId) return;
    const text = overrideText || chatInput.trim();
    if (!text) return;
    await sendRoomMessage(roomId, {
      senderId: currentUser.uid, senderName: currentUser.displayName,
      senderAvatar: currentUser.photoURL,
      text, type: 'chat', timestamp: Date.now(),
    });
    setChatInput('');
    setShowEmoji(false);
  }

  async function leaveRoom() {
    if (mySeatIndex !== null) await handleLeaveSeat();
    if (localTrackRef.current) {
      const t = localTrackRef.current as { stop: () => void; close: () => void };
      t.stop(); t.close();
    }
    if (clientRef.current) await clientRef.current.leave().catch(() => {});
    setActiveRoom(null);
    setActivePage('rooms');
  }

  const raisedHandsArr = room ? Object.entries(room.raisedHands || {}) : [];
  const seats = room?.seats || [];
  const onStageCount = seats.filter(s => s.userId).length;

  if (loadingRoom) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Loader size={32} color="#A29BFE" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'rgba(162,155,254,0.6)', fontSize: 13, marginTop: 10 }}>Joining room...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <p style={{ color: 'rgba(162,155,254,0.6)' }}>Room not found</p>
        <button className="btn-primary" onClick={() => { setActiveRoom(null); setActivePage('rooms'); }} style={{ padding: '10px 20px' }}>
          Back to Rooms
        </button>
      </div>
    );
  }

  const myCoins = currentUser?.coins ?? 0;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)', position: 'relative',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 12px 12px',
        background: 'rgba(26,15,46,0.9)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(108,92,231,0.2)', flexShrink: 0,
      }}>
        <button onClick={leaveRoom} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(231,76,60,0.2)', border: '1px solid rgba(231,76,60,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#ff7675', flexShrink: 0,
        }}><ArrowLeft size={15} /></button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {room.name}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.6)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={10} /> <span>{onStageCount} on stage</span>
            <span>·</span>
            <span>👂 {room.listenerCount || 0}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isHost && (
            <div style={{
              background: 'rgba(253,203,110,0.2)', border: '1px solid rgba(253,203,110,0.4)',
              borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#fdcb6e',
              display: 'flex', alignItems: 'center', gap: 4,
            }}><Crown size={10} /> HOST</div>
          )}
          <div style={{
            background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
            borderRadius: 10, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#ff7675',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#e74c3c', display: 'inline-block' }} />
            LIVE
          </div>
        </div>
      </div>

      {/* ── Raised-hand queue (host) ── */}
      {isHost && raisedHandsArr.length > 0 && (
        <div style={{
          background: 'rgba(108,92,231,0.12)', borderBottom: '1px solid rgba(108,92,231,0.2)',
          padding: '8px 12px', flexShrink: 0,
        }}>
          <p style={{ fontSize: 11, color: '#A29BFE', fontWeight: 600, marginBottom: 6 }}>
            ✋ {raisedHandsArr.length} speaker request{raisedHandsArr.length > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
            {raisedHandsArr.map(([uid, info]) => (
              <div key={uid} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(108,92,231,0.2)', borderRadius: 20, padding: '4px 10px',
                border: '1px solid rgba(108,92,231,0.35)', flexShrink: 0,
              }}>
                <span style={{ fontSize: 14 }}>{info.avatar}</span>
                <span style={{ fontSize: 11, color: 'white' }}>{info.name}</span>
                <button onClick={() => hostApproveHand(uid, info.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#00b894', padding: 0 }}><Check size={14} /></button>
                <button onClick={() => hostRejectHand(uid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff7675', padding: 0 }}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main scrollable content ── */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {isHost && <div style={{ padding: '8px 14px 0', fontSize: 11, color: 'rgba(162,155,254,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>👑 You are the host</div>}

        {/* Seat grid */}
        <div className="seat-grid">
          {seats.map((seat, idx) => (
            <SeatItem
              key={idx} seat={seat} index={idx}
              currentUserId={currentUser?.uid}
              isHost={isHost}
              isMe={seat.userId === currentUser?.uid}
              onClick={() => handleSeatClick(seat)}
            />
          ))}
        </div>

        {/* Room chat feed */}
        <div style={{
          margin: '4px 12px 6px',
          background: 'rgba(26,15,46,0.6)', borderRadius: 16,
          border: '1px solid rgba(108,92,231,0.15)', overflow: 'hidden',
        }}>
          <div style={{ height: 120, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: 4 }}>
                {msg.type === 'gift' ? (
                  <span style={{ fontSize: 12 }}>
                    <span style={{ color: '#fdcb6e', fontWeight: 600 }}>🎁 {msg.senderName}</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}> {msg.text}</span>
                  </span>
                ) : (
                  <span style={{ fontSize: 12 }}>
                    <span style={{ color: msg.type === 'system' ? 'rgba(162,155,254,0.5)' : '#A29BFE', fontWeight: 600 }}>
                      {msg.senderAvatar} {msg.senderName}:
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
        background: 'rgba(26,15,46,0.97)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(108,92,231,0.2)',
        padding: '8px 10px 16px', flexShrink: 0,
      }}>
        {/* Gift picker */}
        {showGifts && (
          <div style={{ marginBottom: 8, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, padding: '6px 0' }}>
            {GIFTS.map(g => (
              <button key={g.id} onClick={() => handleGift(g)} style={{
                background: 'rgba(108,92,231,0.1)', border: '1px solid rgba(108,92,231,0.25)',
                borderRadius: 12, padding: '8px 4px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: 'white',
              }}>
                <span style={{ fontSize: 26 }}>{g.emoji}</span>
                <span style={{ fontSize: 9, color: 'rgba(162,155,254,0.7)' }}>{g.name}</span>
                <span style={{ fontSize: 10, color: '#fdcb6e', fontWeight: 700 }}>💰{g.cost}</span>
              </button>
            ))}
            <div style={{ gridColumn: '1/-1', textAlign: 'center', fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>
              Your coins: 💰{myCoins.toLocaleString()}
            </div>
          </div>
        )}

        {/* Emoji picker */}
        {showEmoji && !showGifts && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto', scrollbarWidth: 'none', padding: '4px 0' }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={ev => sendChat(ev as unknown as React.FormEvent, e)} style={{
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
            background: showEmoji ? 'rgba(108,92,231,0.4)' : 'rgba(108,92,231,0.15)',
            border: '1px solid rgba(108,92,231,0.35)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A29BFE', flexShrink: 0,
          }}><Smile size={15} /></button>
          <button type="submit" style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
          }}><Send size={14} /></button>
        </form>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <ActionBtn icon={<GiftIcon size={17} />} label="Gift" active={showGifts}
            onClick={() => { setShowGifts(!showGifts); setShowEmoji(false); }} />

          {!isHost && mySeatIndex === null && (
            <ActionBtn icon={<Hand size={17} />} label={hasRaisedHand ? 'Lower' : 'Raise'}
              active={hasRaisedHand} onClick={toggleRaiseHand} glow={hasRaisedHand} />
          )}

          {mySeatIndex !== null ? (
            <ActionBtn icon={<ChevronDown size={17} />} label="Leave" onClick={handleLeaveSeat} danger />
          ) : (
            <ActionBtn icon={<span style={{ fontSize: 15 }}>💺</span>} label="Sit"
              onClick={() => {
                const empty = seats.findIndex(s => !s.userId && !s.isLocked);
                if (empty >= 0) handleTakeSeat(empty);
              }} />
          )}

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <button className={`mic-main-btn ${isMicOn ? 'active' : 'inactive'}`} onClick={toggleMic}
              style={{ opacity: mySeatIndex === null ? 0.4 : 1 }}>
              {isMicOn ? <Mic size={22} color="white" /> : <MicOff size={22} color="rgba(162,155,254,0.5)" />}
            </button>
            <span style={{ fontSize: 9, color: 'rgba(162,155,254,0.5)' }}>
              {isMicOn ? 'Speaking' : mySeatIndex === null ? 'No seat' : 'Muted'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Seat menu ── */}
      {showSeatMenu && selectedSeat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setShowSeatMenu(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)',
            borderRadius: '24px 24px 0 0', border: '1px solid rgba(108,92,231,0.3)',
            width: '100%', maxWidth: 400, margin: '0 auto', padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
              }}>{selectedSeat.photoURL || '?'}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{selectedSeat.displayName || 'Empty'}</div>
                <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.6)' }}>Seat #{selectedSeat.index + 1}</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectedSeat.userId === currentUser?.uid ? (
                <SeatMenuBtn icon={<ChevronDown size={16} />} label="Leave Seat" onClick={handleLeaveSeat} />
              ) : isHost && selectedSeat.userId ? (
                <>
                  <SeatMenuBtn icon={selectedSeat.isMuted ? <ShieldCheck size={16} /> : <ShieldOff size={16} />}
                    label={selectedSeat.isMuted ? 'Unmute' : 'Mute'} onClick={() => hostMute(selectedSeat)} />
                  <SeatMenuBtn icon={<UserX size={16} />} label="Kick from Stage" onClick={() => hostKick(selectedSeat)} danger />
                </>
              ) : null}
              {isHost && (
                <SeatMenuBtn icon={<Lock size={16} />}
                  label={selectedSeat.isLocked ? 'Unlock Seat' : 'Lock Seat'}
                  onClick={() => hostLock(selectedSeat)} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function SeatItem({ seat, index, currentUserId, isHost, isMe, onClick }: {
  seat: FBSeat; index: number; currentUserId?: string;
  isHost: boolean; isMe: boolean; onClick: () => void;
}) {
  if (seat.isLocked) return (
    <div className="seat-item" onClick={isHost ? onClick : undefined} style={{ cursor: isHost ? 'pointer' : 'default' }}>
      <div className="seat-avatar seat-locked"><Lock size={20} color="rgba(108,92,231,0.4)" /></div>
      <span className="seat-name" style={{ color: 'rgba(108,92,231,0.4)' }}>Locked</span>
    </div>
  );

  if (!seat.userId) return (
    <div className="seat-item" onClick={onClick}>
      <div className="seat-avatar seat-empty"><span style={{ fontSize: 18, color: 'rgba(108,92,231,0.35)' }}>+</span></div>
      <span className="seat-name" style={{ color: 'rgba(108,92,231,0.35)' }}>Empty</span>
    </div>
  );

  return (
    <div className="seat-item" onClick={onClick}>
      <div
        className={`seat-avatar ${seat.isSpeaking ? 'avatar-speaking' : 'avatar-ring'}`}
        style={{
          background: `linear-gradient(135deg, ${isMe ? '#6C5CE7' : '#3d2b7a'}, ${isMe ? '#A29BFE' : '#6554af'})`,
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 26 }}>{seat.photoURL}</span>
        {index === 0 && <div style={{ position: 'absolute', top: -4, right: -4, fontSize: 14 }}>👑</div>}
        <div className={`mic-indicator ${seat.isMuted ? 'mic-muted' : 'mic-on'}`}>
          {seat.isMuted ? <MicOff size={9} color="white" /> : <Mic size={9} color="white" />}
        </div>
      </div>
      <span className="seat-name" style={{ color: isMe ? '#A29BFE' : undefined, fontWeight: isMe ? 700 : 500 }}>
        {isMe ? 'You' : seat.displayName}
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
        background: active ? 'rgba(108,92,231,0.35)' : danger ? 'rgba(231,76,60,0.15)' : 'rgba(108,92,231,0.1)',
        border: `1px solid ${active ? 'rgba(108,92,231,0.6)' : danger ? 'rgba(231,76,60,0.35)' : 'rgba(108,92,231,0.25)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? '#A29BFE' : danger ? '#ff7675' : '#A29BFE',
        boxShadow: glow ? '0 0 12px rgba(108,92,231,0.7)' : 'none', transition: 'all 0.2s',
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
      background: danger ? 'rgba(231,76,60,0.1)' : 'rgba(108,92,231,0.1)',
      border: `1px solid ${danger ? 'rgba(231,76,60,0.25)' : 'rgba(108,92,231,0.25)'}`,
      borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
      color: danger ? '#ff7675' : '#A29BFE', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
    }}>
      {icon} {label}
    </button>
  );
}
