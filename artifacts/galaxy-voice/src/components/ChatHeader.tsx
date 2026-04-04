import React, { useState, useEffect } from 'react';
import { Search, Bell, Plus, X, User, MessageCircle, Heart } from 'lucide-react';
import { searchByShortId, toggleFollow, listenNotifications } from '../lib/fbRooms';

interface ChatHeaderProps {
  currentUser: any;
  setActiveChat: (id: string) => void;
}

export function ChatHeader({ currentUser, setActiveChat }: ChatHeaderProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Real-time Notifications Listen karein
  useEffect(() => {
    if (!currentUser) return;
    return listenNotifications(currentUser.uid, (data) => {
      setNotifications(data);
    });
  }, [currentUser]);

  // 2. 9-Digit ID Search Logic
  const handleSearch = async () => {
    if (searchTerm.length < 5) return;
    setLoading(true);
    const user = await searchByShortId(searchTerm);
    setFoundUser(user);
    setLoading(false);
  };

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%' }}>
      {/* --- MAIN HEADER BAR --- */}
      <div style={{
        padding: '20px 16px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(26,15,46,0.95)',
        backdropFilter: 'blur(15px)',
        borderBottom: '1px solid rgba(108,92,231,0.15)'
      }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '22px', fontWeight: '700' }}>
          Messages 💬
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* Search Trigger */}
          <Search 
            size={22} 
            color={showSearch ? "#fff" : "#A29BFE"} 
            style={{ cursor: 'pointer', transition: '0.3s' }} 
            onClick={() => setShowSearch(!showSearch)} 
          />

          {/* Plus Icon */}
          <Plus size={22} color="#A29BFE" style={{ cursor: 'pointer' }} />
          
          {/* Bell with Red Dot */}
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={22} color="#A29BFE" />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                background: '#ff7675', width: '10px', height: '10px',
                borderRadius: '50%', border: '2px solid #1A0F2E'
              }} />
            )}
          </div>
        </div>
      </div>

      {/* --- SEARCH & VISIT PANEL --- */}
      {showSearch && (
        <div style={{ 
          padding: '15px', 
          background: 'linear-gradient(180deg, rgba(26,15,46,1) 0%, rgba(15,15,26,1) 100%)',
          borderBottom: '1px solid #6C5CE7',
          animation: 'slideDown 0.3s ease-out'
        }}>
          {/* Input Box */}
          <div style={{ 
            display: 'flex', gap: 10, background: 'rgba(255,255,255,0.05)', 
            borderRadius: '25px', padding: '8px 15px', border: '1px solid #6C5CE7' 
          }}>
            <input 
              placeholder="Enter 9-digit ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{ flex: 1, background: 'none', border: 'none', color: 'white', outline: 'none', fontSize: '14px' }}
            />
            {loading ? (
               <div className="spinner-small" /> 
            ) : (
              <Search size={18} color="#A29BFE" onClick={handleSearch} style={{ cursor: 'pointer' }} />
            )}
            <X size={18} color="#A29BFE" onClick={() => { setShowSearch(false); setFoundUser(null); }} style={{ cursor: 'pointer' }} />
          </div>

          {/* RESULT CARD (ChaloTalk style) */}
          {foundUser ? (
            <div style={{
              marginTop: '15px', padding: '20px', borderRadius: '25px',
              background: 'rgba(108,92,231,0.1)',
              border: '1px solid rgba(108,92,231,0.3)',
              textAlign: 'center',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
            }}>
              {/* Profile Image with Gender Glow */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img 
                  src={foundUser.photoURL || 'https://via.placeholder.com/100'} 
                  style={{ 
                    width: '85px', height: '85px', borderRadius: '50%', 
                    border: `3px solid ${foundUser.gender === 'female' ? '#fd79a8' : '#74b9ff'}`,
                    padding: '3px'
                  }} 
                />
                <div style={{
                  position: 'absolute', bottom: '5px', right: '-5px',
                  background: foundUser.gender === 'female' ? '#fd79a8' : '#74b9ff',
                  borderRadius: '10px', padding: '2px 8px', fontSize: '10px', color: 'white', fontWeight: '700'
                }}>
                  {foundUser.gender === 'female' ? '♀' : '♂'} {foundUser.age || '19'}
                </div>
              </div>

              <h3 style={{ color: 'white', margin: '12px 0 2px', fontSize: '18px' }}>{foundUser.displayName}</h3>
              <p style={{ color: 'rgba(162,155,254,0.6)', fontSize: '12px', marginBottom: '18px' }}>ID: {foundUser.shortId}</p>

              {/* Visit/Follow/Message Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => toggleFollow(currentUser.uid, foundUser.uid)}
                  style={{ 
                    flex: 1, background: '#6C5CE7', border: 'none', padding: '10px', 
                    borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                  }}>
                  <Heart size={14} /> Follow
                </button>
                <button 
                  onClick={() => { setActiveChat(foundUser.uid); setShowSearch(false); }}
                  style={{ 
                    flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid #6C5CE7', 
                    padding: '10px', borderRadius: '12px', color: 'white', fontWeight: '600', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5
                  }}>
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            </div>
          ) : searchTerm.length >= 9 && !loading && (
            <p style={{ color: '#ff7675', fontSize: '12px', textAlign: 'center', marginTop: '10px' }}>User not found!</p>
          )}
        </div>
      )}
    </div>
  );
}
