import { useState } from 'react';
import { getRooms, Room, saveRoom, generateId } from '../lib/storage';
import { useApp } from '../lib/context';
import { Plus, Users, X, ChevronRight } from 'lucide-react';

const TOPICS = ['Music', 'Life', 'Gaming', 'Tech', 'Movies', 'Art', 'Food', 'Sports', 'Random'];
const CATEGORIES = ['All', 'Hot', 'New'];

export function RoomsPage() {
  const { setActiveRoom, setActivePage, currentUser } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('Music');
  const [filter, setFilter] = useState('All');
  const rooms = getRooms();

  const filtered = filter === 'All' ? rooms : rooms.filter(r => r.category === filter.toLowerCase());

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
      userCount: 1, maxUsers: 9, isLive: true, category: 'new',
      listeners: [], raisedHands: [],
      seats: Array.from({ length: 9 }, (_, i) => ({
        index: i,
        userId: i === 0 ? currentUser.id : null,
        username: i === 0 ? currentUser.username : null,
        avatar: i === 0 ? currentUser.avatar : null,
        isMuted: false, isLocked: false, isSpeaking: false,
      })),
    };
    saveRoom(newRoom);
    setShowCreate(false);
    setRoomName('');
    setActiveRoom(id);
    setActivePage('room');
  }

  return (
    <div className="page-content page-transition">
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h2 className="page-title">Voice Rooms 🎤</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)}
          style={{ padding: '8px 14px', fontSize: 12 }}>
          <Plus size={14} /> Create
        </button>
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '10px 16px 4px' }}>
        <div className="toggle-switch">
          {CATEGORIES.map(c => (
            <button key={c} className={`tab-btn ${filter === c ? 'active' : ''}`}
              onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 16px 4px' }}>
        <p style={{ color: 'rgba(162,155,254,0.45)', fontSize: 12 }}>
          {filtered.filter(r => r.isLive).length} live rooms
        </p>
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map(room => (
          <div key={room.id} className="glass-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                boxShadow: '0 0 10px rgba(108,92,231,0.35)',
              }}>{room.hostAvatar}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.name}
                </div>
                <div style={{ color: 'rgba(162,155,254,0.55)', fontSize: 11, marginTop: 2 }}>
                  {room.hostName} · {room.topic}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(162,155,254,0.6)', fontSize: 11 }}>
                    <Users size={10} />
                    <span>{room.userCount}/{room.maxUsers} on stage</span>
                  </div>
                  {room.listeners.length > 0 && (
                    <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.4)' }}>
                      👂 {room.listeners.length}
                    </span>
                  )}
                  {room.isLive && (
                    <span style={{
                      background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)',
                      borderRadius: 6, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#ff7675',
                    }}>LIVE</span>
                  )}
                </div>
              </div>

              <button className="btn-primary" onClick={() => { setActiveRoom(room.id); setActivePage('room'); }}
                style={{ padding: '7px 12px', fontSize: 11, flexShrink: 0 }}>
                Join <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)',
            borderRadius: '24px 24px 0 0', border: '1px solid rgba(108,92,231,0.3)',
            width: '100%', maxWidth: 400, margin: '0 auto', padding: '20px 20px 32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ color: 'white', fontSize: 17, fontWeight: 700 }}>Create Voice Room</h3>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(162,155,254,0.6)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ color: 'rgba(162,155,254,0.65)', fontSize: 12, marginBottom: 6, display: 'block' }}>Room Name</label>
              <input className="galaxy-input" placeholder="Give your room a name..."
                value={roomName} onChange={e => setRoomName(e.target.value)} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ color: 'rgba(162,155,254,0.65)', fontSize: 12, marginBottom: 8, display: 'block' }}>Topic</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {TOPICS.map(t => (
                  <span key={t} className={`interest-tag ${roomTopic === t ? 'selected' : ''}`}
                    onClick={() => setRoomTopic(t)}>{t}</span>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={createRoom} style={{ width: '100%', padding: 13 }}>
              🎤 Start Room
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
