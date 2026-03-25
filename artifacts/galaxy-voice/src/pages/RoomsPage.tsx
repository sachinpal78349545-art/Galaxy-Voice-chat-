import { useState } from 'react';
import { getRooms, Room, saveRoom, generateId } from '../lib/storage';
import { useApp } from '../lib/context';
import { Plus, Users, X, ChevronRight } from 'lucide-react';

const TOPICS = ['Music', 'Life', 'Gaming', 'Tech', 'Movies', 'Art', 'Food', 'Sports'];

export function RoomsPage() {
  const { setActiveRoom, setActivePage, currentUser } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('Music');
  const [maxUsers, setMaxUsers] = useState(9);
  const rooms = getRooms();

  function createRoom() {
    if (!roomName.trim() || !currentUser) return;
    const id = generateId();
    const newRoom: Room = {
      id,
      name: roomName.trim(),
      hostId: currentUser.id,
      hostName: currentUser.username,
      hostAvatar: currentUser.avatar,
      topic: roomTopic,
      userCount: 1,
      maxUsers,
      isLive: true,
      category: 'new',
      seats: Array.from({ length: maxUsers }, (_, i) => ({
        index: i,
        userId: i === 0 ? currentUser.id : null,
        username: i === 0 ? currentUser.username : null,
        avatar: i === 0 ? currentUser.avatar : null,
        isMuted: false,
        isLocked: false,
        isSpeaking: false,
      })),
    };
    saveRoom(newRoom);
    setShowCreate(false);
    setRoomName('');
    setActiveRoom(id);
    setActivePage('room');
  }

  function joinRoom(roomId: string) {
    setActiveRoom(roomId);
    setActivePage('room');
  }

  return (
    <div className="page-content page-transition">
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h2 className="page-title">Voice Rooms</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreate(true)}
          style={{ padding: '8px 16px', fontSize: 13 }}
        >
          <Plus size={15} />
          Create
        </button>
      </div>

      {/* Create room modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)',
            borderRadius: '24px 24px 0 0',
            border: '1px solid rgba(108, 92, 231, 0.3)',
            width: '100%', maxWidth: 400, margin: '0 auto',
            padding: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>Create Room</h3>
              <button onClick={() => setShowCreate(false)}
                style={{ color: 'rgba(162, 155, 254, 0.6)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(162, 155, 254, 0.7)', fontSize: 12, marginBottom: 6, display: 'block' }}>
                Room Name
              </label>
              <input
                className="galaxy-input"
                placeholder="Give your room a name..."
                value={roomName}
                onChange={e => setRoomName(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ color: 'rgba(162, 155, 254, 0.7)', fontSize: 12, marginBottom: 8, display: 'block' }}>
                Topic
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {TOPICS.map(t => (
                  <span
                    key={t}
                    className={`interest-tag ${roomTopic === t ? 'selected' : ''}`}
                    onClick={() => setRoomTopic(t)}
                  >{t}</span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: 'rgba(162, 155, 254, 0.7)', fontSize: 12, marginBottom: 8, display: 'block' }}>
                Max Seats: {maxUsers}
              </label>
              <input
                type="range" min={3} max={15} value={maxUsers}
                onChange={e => setMaxUsers(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#6C5CE7' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(162, 155, 254, 0.5)' }}>
                <span>3</span><span>15</span>
              </div>
            </div>

            <button
              className="btn-primary"
              onClick={createRoom}
              style={{ width: '100%', padding: 14 }}
            >
              Create Room
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ color: 'rgba(162, 155, 254, 0.5)', fontSize: 13 }}>
          {rooms.filter(r => r.isLive).length} rooms active now
        </p>
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rooms.map(room => (
          <div key={room.id} className="glass-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, flexShrink: 0,
              }}>{room.hostAvatar}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.name}
                </div>
                <div style={{ color: 'rgba(162, 155, 254, 0.6)', fontSize: 12, marginTop: 2 }}>
                  by {room.hostName} · {room.topic}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4,
                  color: 'rgba(162, 155, 254, 0.7)', fontSize: 11 }}>
                  <Users size={11} />
                  <span>{room.userCount}/{room.maxUsers}</span>
                  {room.isLive && (
                    <span style={{
                      background: 'rgba(231, 76, 60, 0.2)', borderRadius: 6,
                      padding: '1px 6px', fontSize: 9, fontWeight: 700,
                      color: '#ff7675', border: '1px solid rgba(231, 76, 60, 0.4)',
                    }}>LIVE</span>
                  )}
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => joinRoom(room.id)}
                style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
              >
                Join <ChevronRight size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
