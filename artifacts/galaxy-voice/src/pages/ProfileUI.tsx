import React, { useState } from 'react';

export const ProfileUI = ({ profile, buyItem, equipFrame, setProfile }: any) => {
  const [tab, setTab] = useState('profile'); // profile, backpack, store

  return (
    <div style={containerStyle}>
      {/* 🚀 FIXED BOTTOM NAVIGATION */}
      <div style={bottomNav}>
        <div onClick={() => setTab('profile')} style={tab === 'profile' ? activeTab : navItem}>👤 Profile</div>
        <div onClick={() => setTab('backpack')} style={tab === 'backpack' ? activeTab : navItem}>🎒 Backpack</div>
        <div onClick={() => setTab('store')} style={tab === 'store' ? activeTab : navItem}>🛍️ Store</div>
      </div>

      {/* --- SECTION 1: PROFILE VIEW --- */}
      {tab === 'profile' && (
        <>
          <div style={headerStyle}>
            <div style={avatarWrapper}>
              <div style={vipBadge}>VIP {profile.vip}</div>
              {/* Dynamic Frame Check */}
              <div style={{...avatarCircle, borderColor: profile.activeFrame || '#6366f1'}}>
                <img src={profile.avatar || 'https://via.placeholder.com/150'} style={avatarImg} />
              </div>
            </div>
            <h2 style={{textAlign:'center', marginTop:'15px'}}>{profile.name}</h2>
            <div style={idRow}>🛡️ ID: {profile.id}</div>
          </div>

          {/* CP/Partner System Slot (Chalotalk Copy) */}
          <div style={cpContainer}>
             <div style={cpCircle}>Partner</div>
             <div style={cpHeart}>❤️</div>
             <div style={cpCircle}>You</div>
          </div>

          {/* Purana Stats & Level Sections (As it is) */}
          <div style={statsBox}>
             <div style={statItem}><b>{profile.followers}</b><br/><span>FOLLOWERS</span></div>
             <div style={statItem}><b>{profile.following}</b><br/><span>FOLLOWING</span></div>
             <div style={statItem}><b>{profile.gifts}</b><br/><span>GIFTS</span></div>
          </div>
        </>
      )}

      {/* --- SECTION 2: BACKPACK (Inventory) --- */}
      {tab === 'backpack' && (
        <div style={paddingBox}>
          <h3>My Items</h3>
          <div style={grid}>
            {profile.backpack?.map((item: any) => (
              <div key={item.id} style={itemCard} onClick={() => equipFrame(item.url)}>
                <div style={{fontSize:'30px'}}>{item.icon}</div>
                <div style={{fontSize:'10px'}}>{item.name}</div>
                <button style={useBtn}>Equip</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SECTION 3: STORE (Buy Frames/Effects) --- */}
      {tab === 'store' && (
        <div style={paddingBox}>
          <div style={walletInfo}>💰 My Coins: {profile.coins}</div>
          <h3>Galaxy Store</h3>
          <div style={grid}>
            {storeItems.map((item) => (
              <div key={item.name} style={itemCard}>
                <div style={{fontSize:'30px'}}>{item.icon}</div>
                <div>{item.name}</div>
                <div style={{color:'gold', fontSize:'12px'}}>💰 {item.price}</div>
                <button style={buyBtn} onClick={() => buyItem(item)}>Buy</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- DATA & STYLES ---
const storeItems = [
  { name: "Neon Frame", icon: "⭕", price: 500, url: "#00ffcc" },
  { name: "Gold Entry", icon: "🚗", price: 2000, url: "gold_effect" },
  { name: "VIP Bubble", icon: "💬", price: 300, url: "purple_bubble" },
];

const containerStyle: any = { minHeight: '100vh', background: '#0f071e', color: 'white', paddingBottom: '100px' };
const bottomNav: any = { position: 'fixed', bottom: 0, width: '100%', background: '#1a0b2e', display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #333', zIndex: 100 };
const navItem: any = { color: '#666', fontSize: '14px', cursor: 'pointer' };
const activeTab: any = { color: '#6366f1', fontWeight: 'bold' };
const cpContainer: any = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', margin: '20px 0' };
const cpCircle: any = { width: '50px', height: '50px', borderRadius: '50%', border: '2px dashed #444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' };
const cpHeart: any = { fontSize: '20px', animation: 'pulse 1.5s infinite' };
const grid: any = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '15px' };
const itemCard: any = { background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '15px', textAlign: 'center', border: '1px solid #333' };
const buyBtn: any = { background: '#6366f1', border: 'none', color: 'white', borderRadius: '5px', padding: '5px 10px', marginTop: '5px', fontSize: '10px' };
const useBtn: any = { background: '#22c55e', border: 'none', color: 'white', borderRadius: '5px', padding: '5px 10px', marginTop: '5px', fontSize: '10px' };
const walletInfo: any = { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '10px', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' };
// Baki saare purane styles (Avatar, Stats, ID row) isme add kar dena
