import { useState } from 'react';
import { getRooms } from '../lib/storage';
import { useApp } from '../lib/context';
import { Users, Search, Bell } from 'lucide-react';

const categories = ['Hot', 'New', 'Follow'];

export function HomePage() {
  const [activeTab, setActiveTab] = useState('Hot');
  const [search, setSearch] = useState('');
  const { setActiveRoom, setActivePage, currentUser } = useApp();
  const rooms = getRooms();

  const filtered = rooms.filter(room => {
    const matchesTab = activeTab === 'Hot'
      ? room.category === 'hot'
      : activeTab === 'New'
      ? room.category === 'new'
      : true;
    const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase()) ||
      room.topic.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  function openRoom(roomId: string) {
    setActiveRoom(roomId);
    setActivePage('room');
  }

  return (
    <div className="page-content page-transition">
      {/* Header */}
      <div className="page-header" style={{ paddingTop: 24 }}>
        <div>
          <h2 className="page-title">Galaxy Voice</h2>
          <p style={{ color: 'rgba(162, 155, 254, 0.6)', fontSize: 12, marginTop: 2 }}>
            Welcome back, {currentUser?.username} ✨
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(108, 92, 231, 0.2)',
            border: '1px solid rgba(108, 92, 231, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#A29BFE',
          }}>
            <Bell size={16} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '12px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%',
            transform: 'translateY(-50%)', color: 'rgba(162, 155, 254, 0.5)',
          }} />
          <input
            className="galaxy-input"
            placeholder="Search rooms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: 'flex', padding: '0 16px', gap: 8, marginBottom: 12 }}>
        <div className="toggle-switch" style={{ flex: 1 }}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`tab-btn ${activeTab === cat ? 'active' : ''}`}
              onClick={() => setActiveTab(cat)}
            >{cat}</button>
          ))}
        </div>
      </div>

      {/* Live rooms highlight */}
      {activeTab === 'Hot' && (
        <div style={{ padding: '0 16px 4px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(231, 92, 92, 0.15)',
            border: '1px solid rgba(231, 92, 92, 0.3)',
            borderRadius: 20, padding: '4px 12px',
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#e74c3c', boxShadow: '0 0 8px rgba(231, 76, 60, 0.8)',
              display: 'inline-block', animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ color: '#ff7675', fontSize: 12, fontWeight: 600 }}>
              {rooms.filter(r => r.isLive).length} Rooms Live
            </span>
          </div>
        </div>
      )}

      {/* Room cards */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(162, 155, 254, 0.5)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>🌌</p>
            <p>No rooms found</p>
          </div>
        )}
        {filtered.map(room => (
          <div key={room.id} className="room-card" onClick={() => openRoom(room.id)}
            style={{ padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Host avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, border: '2px solid rgba(108, 92, 231, 0.5)',
                boxShadow: '0 0 12px rgba(108, 92, 231, 0.4)',
              }}>
                {room.hostAvatar}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    fontSize: 15, fontWeight: 700, color: 'white',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    maxWidth: 180,
                  }}>{room.name}</div>
                  {room.isLive && (
                    <span style={{
                      background: 'rgba(231, 76, 60, 0.2)',
                      border: '1px solid rgba(231, 76, 60, 0.4)',
                      borderRadius: 8, padding: '2px 6px',
                      fontSize: 10, fontWeight: 700, color: '#ff7675',
                    }}>LIVE</span>
                  )}
                </div>
                <p style={{ color: 'rgba(162, 155, 254, 0.6)', fontSize: 12, marginTop: 2 }}>
                  {room.topic}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {/* Speaker avatars row */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {room.seats.filter(s => s.userId).slice(0, 4).map((seat, i) => (
                      <div key={i} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                        border: '2px solid rgba(26, 15, 46, 0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i,
                        position: 'relative',
                      }}>
                        {seat.avatar}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(162, 155, 254, 0.7)', fontSize: 12 }}>
                    <Users size={12} />
                    <span>{room.userCount}/{room.maxUsers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
