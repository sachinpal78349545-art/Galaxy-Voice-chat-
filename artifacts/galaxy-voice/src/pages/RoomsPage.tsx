import { useState, useEffect } from 'react';
import { listenRooms, createRoom, FBRoom } from '../lib/fbRooms';
import { useApp } from '../lib/context';
import { Plus, Users, X, ChevronRight, Loader } from 'lucide-react';

const TOPICS = ['Music', 'Life', 'Gaming', 'Tech', 'Movies', 'Art', 'Food', 'Sports', 'Random'];

export function RoomsPage() {
  const { setActiveRoom, setActivePage, currentUser } = useApp();
  const [rooms, setRooms] = useState<FBRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomTopic, setRoomTopic] = useState('Music');
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const unsub = listenRooms(r => { setRooms(r); setLoading(false); });
    return unsub;
  }, []);

  const filtered = filter === 'All' ? rooms : rooms.filter(r => r.category === filter.toLowerCase());

  async function handleCreate() {
    if (!roomName.trim() || !currentUser) return;
    setCreating(true);
    try {
      const roomId = await createRoom(currentUser, roomName.trim(), roomTopic);
      setShowCreate(false);
      setRoomName('');
      setActiveRoom(roomId);
      setActivePage('room');
    } catch { /* handle */ } finally {
      setCreating(false);
    }
  }

  return (
    <div className="page-content page-transition">
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h2 className="page-title">Voice Rooms 🎤</h2>
        <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ padding: '8px 14px', fontSize: 12 }}>
          <Plus size={14} /> Create
        </button>
      </div>

      <div style={{ padding: '10px 16px 4px' }}>
        <div className="toggle-switch">
          {['All', 'Hot', 'New'].map(c => (
            <button key={c} className={`tab-btn ${filter === c ? 'active' : ''}`} onClick={() => setFilter(c)}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '10px 16px 4px' }}>
        <p style={{ color: 'rgba(162,155,254,0.45)', fontSize: 12 }}>
          {filtered.filter(r => r.isLive).length} live rooms
        </p>
      </div>

      <div style={{ padding: '4px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Loader size={24} color="#A29BFE" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
            <p style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12, marginTop: 8 }}>Loading rooms...</p>
          </div>
        )}

        {!loading && filtered.map(room => (
          <div key={room.id} className="glass-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                boxShadow: '0 0 10px rgba(108,92,231,0.35)',
              }}>{room.hostAvatar}</div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {room.name}
                </div>
                <div style={{ color: 'rgba(162,155,254,0.55)', fontSize: 11, marginTop: 2 }}>
                  {room.hostName} · {room.topic}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'rgba(162,155,254,0.6)', fontSize: 11 }}>
                    <Users size={10} />
                    <span>{(room.seats || []).filter(s => s.userId).length}/9</span>
                  </div>
                  {(room.listenerCount || 0) > 0 && (
                    <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.4)' }}>👂{room.listenerCount}</span>
                  )}
                  {room.isLive && (
                    <span style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: 6, padding: '1px 5px', fontSize: 9, fontWeight: 700, color: '#ff7675' }}>LIVE</span>
                  )}
                </div>
              </div>

              <button className="btn-primary"
                onClick={() => { setActiveRoom(room.id); setActivePage('room'); }}
                style={{ padding: '7px 12px', fontSize: 11, flexShrink: 0 }}>
                Join <ChevronRight size={11} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'flex-end' }}>
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
            <button className="btn-primary" onClick={handleCreate} disabled={creating || !roomName.trim()}
              style={{ width: '100%', padding: 13 }}>
              {creating ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : '🎤 Start Room'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
