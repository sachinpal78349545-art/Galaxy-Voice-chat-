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

  // Rooms list load karna
  useEffect(() => {
    const unsub = listenRooms(r => { 
      setRooms(r); 
      setLoading(false); 
    });
    return unsub;
  }, []);

  // Filter Logic: All, Hot (more listeners), New (latest)
  const filtered = rooms.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Hot') return r.listenerCount > 5;
    if (filter === 'New') return (Date.now() - r.createdAt) < 3600000; // Last 1 hour
    return r.topic === filter;
  });

  // 🔥 Create Room Function with Fixes
  async function handleCreate() {
    if (!roomName.trim()) {
      alert("Pehle Room Name likho!");
      return;
    }

    // Checking if user is logged in to avoid 'hostId' undefined error
    if (!currentUser || !currentUser.uid) {
      alert("Error: Login session nahi mila. Please logout karke firse login karein.");
      return;
    }

    setCreating(true);
    try {
      console.log("Creating room in database...");
      
      const roomId = await createRoom(currentUser, roomName.trim(), roomTopic);
      
      setShowCreate(false);
      setRoomName('');
      setActiveRoom(roomId);
      setActivePage('room'); // VoiceRoomPage par bhejne ke liye
    } catch (error: any) {
      alert("Firebase Error: " + error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    // 💡 Added paddingBottom: 90px taaki Bottom Navigation Bar hide na ho
    <div className="page-content" style={{ 
      background: '#0F0F1A', 
      minHeight: '100vh', 
      paddingBottom: '90px', 
      overflowY: 'auto' 
    }}>
      
      {/* Header Section */}
      <div className="page-header" style={{ 
        paddingTop: 24, 
        paddingLeft: 16, 
        paddingRight: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <h2 style={{ color: 'white', fontSize: 22, margin: 0, fontWeight: 'bold' }}>Voice Rooms 🎤</h2>
        <button 
          className="btn-primary" 
          onClick={() => setShowCreate(true)} 
          style={{ 
            padding: '8px 16px', 
            background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '20px', 
            fontSize: 13, 
            fontWeight: 'bold', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 5,
            boxShadow: '0 4px 15px rgba(108, 92, 231, 0.3)'
          }}
        >
          <Plus size={16} /> Create
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ padding: '15px 16px' }}>
        <div style={{ 
          display: 'flex', 
          gap: 10, 
          background: 'rgba(255,255,255,0.05)', 
          padding: '6px', 
          borderRadius: '25px' 
        }}>
          {['All', 'Hot', 'New'].map(c => (
            <button 
              key={c} 
              onClick={() => setFilter(c)}
              style={{ 
                flex: 1, 
                padding: '8px', 
                borderRadius: '20px', 
                border: 'none',
                background: filter === c ? '#6C5CE7' : 'transparent',
                color: filter === c ? 'white' : 'rgba(162,155,254,0.5)',
                fontSize: 13, 
                fontWeight: '600', 
                transition: '0.3s',
                cursor: 'pointer'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px 10px' }}>
        <p style={{ color: 'rgba(162,155,254,0.45)', fontSize: 12 }}>
          {filtered.length} live rooms available
        </p>
      </div>

      {/* Rooms List Section */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
           <div style={{ textAlign: 'center', marginTop: 40 }}>
             <Loader className="animate-spin" color="#6C5CE7" style={{ margin: '0 auto' }} />
             <p style={{ color: 'white', marginTop: 10 }}>Loading rooms...</p>
           </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: 40, color: 'rgba(255,255,255,0.3)' }}>
            No rooms found in this category.
          </div>
        ) : filtered.map(room => (
          <div key={room.id} className="room-card" style={{ 
            padding: 16, 
            background: 'rgba(26, 15, 46, 0.65)', 
            borderRadius: '20px', 
            border: '1px solid rgba(108, 92, 231, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '16px',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}>{room.hostAvatar || '👤'}</div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: '700', color: 'white' }}>{room.name}</div>
                <div style={{ color: 'rgba(162,155,254,0.6)', fontSize: 12 }}>{room.hostName} • {room.topic}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                   <Users size={12} color="#A29BFE" />
                   <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)' }}>
                     {room.listenerCount || 0} listening
                   </span>
                </div>
              </div>

              <button 
                className="btn-primary"
                onClick={() => { setActiveRoom(room.id); setActivePage('room'); }}
                style={{ 
                  padding: '8px 16px', 
                  background: 'rgba(108,92,231,0.15)', 
                  color: '#A29BFE', 
                  border: '1px solid rgba(108,92,231,0.3)', 
                  borderRadius: '12px', 
                  fontSize: 12, 
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Join <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Room Modal */}
      {showCreate && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          background: 'rgba(0,0,0,0.85)', 
          zIndex: 2000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 20,
          backdropFilter: 'blur(5px)'
        }}>
          <div className="page-transition" style={{ 
            background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)', 
            borderRadius: '24px', 
            border: '1px solid rgba(108,92,231,0.4)', 
            width: '100%', 
            maxWidth: 380, 
            padding: 24,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: '800' }}>Create Voice Room</h3>
                <X color="rgba(255,255,255,0.6)" onClick={() => setShowCreate(false)} style={{ cursor: 'pointer' }} />
             </div>

             <div style={{ marginBottom: 15 }}>
               <label style={{ color: 'rgba(162,155,254,0.6)', fontSize: 12, display: 'block', marginBottom: 8, fontWeight: '600' }}>Room Name</label>
               <input 
                 className="galaxy-input"
                 placeholder="Enter a catchy room name..." 
                 value={roomName}
                 onChange={e => setRoomName(e.target.value)}
                 style={{ 
                   width: '100%', 
                   padding: 14, 
                   borderRadius: '14px', 
                   background: 'rgba(108,92,231,0.08)', 
                   color: 'white', 
                   border: '1px solid rgba(108,92,231,0.25)',
                   outline: 'none'
                 }}
               />
             </div>

             <div style={{ marginBottom: 25 }}>
               <label style={{ color: 'rgba(162,155,254,0.6)', fontSize: 12, display: 'block', marginBottom: 10, fontWeight: '600' }}>Select Topic</label>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                 {TOPICS.map(t => (
                   <span 
                     key={t} 
                     onClick={() => setRoomTopic(t)}
                     style={{
                       padding: '7px 14px',
                       borderRadius: '15px',
                       fontSize: 11,
                       cursor: 'pointer',
                       fontWeight: '600',
                       background: roomTopic === t ? 'linear-gradient(135deg, #6C5CE7, #8b7cf5)' : 'rgba(108,92,231,0.1)',
                       color: roomTopic === t ? 'white' : 'rgba(162,155,254,0.6)',
                       border: roomTopic === t ? 'none' : '1px solid rgba(108,92,231,0.2)',
                       transition: '0.2s'
                     }}
                   >
                     {t}
                   </span>
                 ))}
               </div>
             </div>

             <button 
               className="btn-primary" 
               onClick={handleCreate}
               disabled={creating || !roomName.trim()}
               style={{ 
                 width: '100%', 
                 padding: 15, 
                 borderRadius: '16px', 
                 fontWeight: 'bold',
                 fontSize: 15,
                 display: 'flex',
                 justifyContent: 'center',
                 alignItems: 'center',
                 gap: 8,
                 background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                 border: 'none',
                 color: 'white',
                 cursor: 'pointer',
                 opacity: (creating || !roomName.trim()) ? 0.6 : 1
               }}
             >
               {creating ? <Loader className="animate-spin" size={18} /> : (
                 <>
                  <Plus size={18} /> Start Room
                 </>
               )}
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
