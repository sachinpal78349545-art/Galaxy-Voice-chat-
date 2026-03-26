import { useState, useEffect } from 'react';
import { listenRooms, FBRoom } from '../lib/fbRooms';
import { useApp } from '../lib/context';
import { Search, Bell, Trophy, Users, Loader } from 'lucide-react';
import { NotificationsPanel } from '../components/NotificationsPanel';
import { LeaderboardPage } from './LeaderboardPage';

const CATEGORIES = ['Hot', 'New', 'Follow'];

export function HomePage() {
  const [activeTab, setActiveTab] = useState('Hot');
  const [search, setSearch] = useState('');
  const [showNotifs, setShowNotifs] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [rooms, setRooms] = useState<FBRoom[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const { setActiveRoom, setActivePage, currentUser, unreadCount } = useApp();

  useEffect(() => {
    const unsub = listenRooms(r => { setRooms(r); setLoadingRooms(false); });
    return unsub;
  }, []);

  const filtered = rooms.filter(room => {
    const tabMatch = activeTab === 'Hot' ? room.category === 'hot'
      : activeTab === 'New' ? room.category === 'new'
      : true;
    const searchMatch = room.name.toLowerCase().includes(search.toLowerCase())
      || room.topic.toLowerCase().includes(search.toLowerCase());
    return tabMatch && searchMatch;
  });

  function openRoom(roomId: string) { setActiveRoom(roomId); setActivePage('room'); }

  return (
    <>
      {showNotifs && <NotificationsPanel onClose={() => setShowNotifs(false)} />}
      {showLeaderboard && <LeaderboardPage onClose={() => setShowLeaderboard(false)} />}

      <div className="page-content page-transition">
        <div className="page-header" style={{ paddingTop: 24 }}>
          <div>
            <h2 className="page-title">Galaxy Voice 🌌</h2>
            <p style={{ color: 'rgba(162,155,254,0.6)', fontSize: 12, marginTop: 2 }}>
              Welcome, {currentUser?.displayName} ✨
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowLeaderboard(true)} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fdcb6e',
            }}><Trophy size={16} /></button>
            <button onClick={() => setShowNotifs(true)} style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#A29BFE', position: 'relative',
            }}>
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, width: 16, height: 16,
                  borderRadius: '50%', background: '#e74c3c', fontSize: 9, fontWeight: 700, color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid rgba(26,15,46,1)',
                }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Coins bar */}
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(253,203,110,0.1)', border: '1px solid rgba(253,203,110,0.25)',
            borderRadius: 20, padding: '5px 12px',
          }}>
            <span style={{ fontSize: 14 }}>💰</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fdcb6e' }}>{(currentUser?.coins || 0).toLocaleString()}</span>
            <span style={{ width: 1, height: 12, background: 'rgba(253,203,110,0.25)' }} />
            <span className="level-badge">Lv.{currentUser?.level || 1}</span>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '10px 16px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(162,155,254,0.5)' }} />
            <input className="galaxy-input" placeholder="Search rooms..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 34 }} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 16px 12px' }}>
          <div className="toggle-switch">
            {CATEGORIES.map(c => (
              <button key={c} className={`tab-btn ${activeTab === c ? 'active' : ''}`}
                onClick={() => setActiveTab(c)}>{c}</button>
            ))}
          </div>
        </div>

        {/* Live badge */}
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.25)',
            borderRadius: 20, padding: '4px 10px',
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#e74c3c', boxShadow: '0 0 6px rgba(231,76,60,0.8)', display: 'inline-block' }} />
            <span style={{ color: '#ff7675', fontSize: 11, fontWeight: 600 }}>
              {rooms.filter(r => r.isLive).length} Rooms Live
            </span>
          </div>
        </div>

        {/* Rooms */}
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loadingRooms && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Loader size={24} color="#A29BFE" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
              <p style={{ color: 'rgba(162,155,254,0.5)', fontSize: 12, marginTop: 8 }}>Loading rooms...</p>
            </div>
          )}
          {!loadingRooms && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(162,155,254,0.5)' }}>
              <p style={{ fontSize: 36, marginBottom: 8 }}>🌌</p>
              <p>No rooms found</p>
            </div>
          )}
          {filtered.map(room => (
            <div key={room.id} className="room-card" onClick={() => openRoom(room.id)} style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, border: '2px solid rgba(108,92,231,0.5)',
                  boxShadow: '0 0 12px rgba(108,92,231,0.35)',
                }}>{room.hostAvatar}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                      {room.name}
                    </div>
                    {room.isLive && (
                      <span style={{ background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.35)', borderRadius: 6, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#ff7675' }}>
                        LIVE
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'rgba(162,155,254,0.55)', fontSize: 11, marginTop: 2 }}>
                    {room.topic} · hosted by {room.hostName}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                    <div style={{ display: 'flex' }}>
                      {(room.seats || []).filter(s => s.userId).slice(0, 5).map((seat, i) => (
                        <div key={i} style={{
                          width: 22, height: 22, borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                          border: '2px solid rgba(26,15,46,0.9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, marginLeft: i > 0 ? -8 : 0, zIndex: 5 - i, position: 'relative',
                        }}>{seat.photoURL}</div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(162,155,254,0.65)', fontSize: 11 }}>
                      <Users size={11} />
                      <span>{(room.seats || []).filter(s => s.userId).length}/9</span>
                    </div>
                    {(room.listenerCount || 0) > 0 && (
                      <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>
                        👂{room.listenerCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 8 }} />
      </div>
    </>
  );
}
