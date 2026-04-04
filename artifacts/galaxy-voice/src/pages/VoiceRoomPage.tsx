import React from 'react';
import { useVoiceRoom } from '../hooks/useVoiceRoom';
import SeatGrid from '../components/SeatGrid';
import MiniChat from '../components/MiniChat';
import BottomBar from '../components/BottomBar';

const VoiceRoomPage = () => {
  const { 
    roomData, seats, messages, isMuted, inputText, isRoomModalOpen, isGiftSheetOpen, selectedUser,
    setInputText, setIsRoomModalOpen, setIsGiftSheetOpen, setSelectedUser,
    handleSeatClick, kickUser, toggleAllSeats, sendMessage, setIsMuted, setRoomData
  } = useVoiceRoom();

  return (
    <div style={styles.container}>
      {/* --- 1. CHALOTALK STYLE HEADER --- */}
      <div style={styles.header}>
        <div style={styles.roomBadge} onClick={() => setIsRoomModalOpen(true)}>
          <div style={styles.avatarWrapper}>
             <img src={roomData.dp} style={styles.roomAvatar} alt="dp" />
             <div style={styles.liveTag}>LIVE</div>
          </div>
          <div style={styles.roomInfo}>
            <div style={styles.roomTitle}>{roomData.name}</div>
            <div style={styles.roomSubRow}>
               <span style={styles.roomLevel}>Lv.{roomData.level}</span>
               <span style={styles.roomId}>ID: {roomData.id}</span>
            </div>
          </div>
        </div>
        
        <div style={styles.topRightArea}>
          <div style={styles.visitorStack}>
            <img src="https://i.pravatar.cc/30?img=11" style={styles.visitorImg} alt="v" />
            <div style={styles.visitorCount}>12</div>
          </div>
          <div style={styles.headerIcons}>
            <span>📤</span><span>⋮</span><span style={{color: '#FF5252'}}>✕</span>
          </div>
        </div>
      </div>

      {/* --- 2. RANKING & MUSIC PLAYER --- */}
      <div style={styles.topWidgets}>
        <div style={styles.trophyBadge}>🏆 Hour Rank 292 ›</div>
        <div style={styles.musicMiniPlayer}>🎵 Play Music</div>
      </div>

      {/* --- 3. SEATS SECTION --- */}
      <div style={styles.seatsArea}>
        <SeatGrid seats={seats} onSeatClick={handleSeatClick} />
      </div>

      {/* --- 4. CHAT & SHARE --- */}
      <div style={styles.chatWrapper}>
        <MiniChat messages={messages} />
        <div style={styles.shareBanner}>
          <span style={styles.shareText}>📢 Invite friends to earn stars!</span>
          <button style={styles.shareBtn}>Share</button>
        </div>
      </div>

      {/* --- 5. SIDE FLOATING ACTIONS --- */}
      <div style={styles.sideActions}>
        <div style={styles.sideBtn} onClick={() => setIsGiftSheetOpen(true)}>🎁</div>
        <div style={styles.sideBtn}>🎡<span style={styles.badge}>New</span></div>
        <div style={styles.sideBtn}>🛋️</div>
      </div>

      {/* --- 6. FOOTER --- */}
      <BottomBar 
        isMuted={isMuted} onMicClick={() => setIsMuted(!isMuted)} 
        inputText={inputText} setInputText={setInputText} onSend={sendMessage}
      />

      {/* --- 🛠 MODAL 1: USER ACTION CARD (Kick/Mute/Admin) --- */}
      {selectedUser && (
        <div style={styles.overlay} onClick={() => setSelectedUser(null)}>
          <div style={styles.userCard} onClick={e => e.stopPropagation()}>
            <img src={selectedUser.avatar} style={styles.cardAvatar} alt="u" />
            <div style={styles.cardName}>{selectedUser.name} <span style={styles.cardLv}>Lv.{selectedUser.level}</span></div>
            <div style={styles.cardActions}>
              <button style={styles.actionBtn}>🔇 Mute</button>
              <button style={styles.actionBtn}>⭐ Admin</button>
              <button style={{...styles.actionBtn, color: '#FF5252'}} onClick={() => kickUser(selectedUser.name)}>🚫 Kick</button>
            </div>
            <button style={styles.giftToUserBtn} onClick={() => {setSelectedUser(null); setIsGiftSheetOpen(true);}}>Send Gift 🎁</button>
          </div>
        </div>
      )}

      {/* --- 🎁 MODAL 2: GIFTING SHEET --- */}
      {isGiftSheetOpen && (
        <div style={styles.overlay} onClick={() => setIsGiftSheetOpen(false)}>
          <div style={styles.giftSheet} onClick={e => e.stopPropagation()}>
            <div style={styles.sheetHandle}></div>
            <div style={styles.giftTabs}>
              <span style={styles.activeTab}>Classic</span><span>Luxury</span><span>Events</span>
            </div>
            <div style={styles.giftGrid}>
              {[1,2,3,4,5,6,7,8].map(i => (
                <div key={i} style={styles.giftItem}>
                  <div style={styles.giftIcon}>🌹</div>
                  <div style={styles.giftPrice}>💎 10</div>
                </div>
              ))}
            </div>
            <div style={styles.giftFooter}>
              <div style={styles.wallet}>Balance: 💎 1,200</div>
              <button style={styles.sendBtn}>Send</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 🏠 MODAL 3: ROOM PROFILE (Admin) --- */}
      {isRoomModalOpen && (
        <div style={styles.overlay} onClick={() => setIsRoomModalOpen(false)}>
          <div style={styles.roomModal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHandle}></div>
            <div style={styles.modalBanner}>
               <img src={roomData.dp} style={styles.largeDp} alt="b" />
               <div style={styles.changeDpBtn}>📸 Change</div>
            </div>
            <div style={styles.modalBody}>
              <input 
                style={styles.modalTitleInput} 
                value={roomData.name} 
                onChange={(e) => setRoomData({...roomData, name: e.target.value})}
              />
              <div style={styles.adminPanel}>
                <div style={styles.adminTitle}>Admin Controls</div>
                <div style={styles.adminButtons}>
                   <button style={styles.ctrlBtn} onClick={() => toggleAllSeats(true)}>🔒 Lock All</button>
                   <button style={styles.ctrlBtn} onClick={() => toggleAllSeats(false)}>🔓 Unlock All</button>
                </div>
              </div>
              <textarea 
                style={styles.modalDesc} 
                value={roomData.description} 
                onChange={(e) => setRoomData({...roomData, description: e.target.value})}
              />
              <button style={styles.saveBtn} onClick={() => setIsRoomModalOpen(false)}>Save & Exit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { height: '100vh', width: '100%', background: 'radial-gradient(circle at top, #3E0071 0%, #1A0033 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', fontFamily: 'sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', padding: '50px 15px 10px', alignItems: 'center' },
  roomBadge: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: '5px 12px 5px 5px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)' },
  avatarWrapper: { position: 'relative' },
  roomAvatar: { width: '40px', height: '40px', borderRadius: '10px', marginRight: '10px' },
  liveTag: { position: 'absolute', bottom: '-2px', right: '5px', backgroundColor: '#FF1744', color: '#fff', fontSize: '7px', padding: '1px 3px', borderRadius: '4px', fontWeight: 'bold' },
  roomInfo: { display: 'flex', flexDirection: 'column' },
  roomTitle: { color: '#fff', fontSize: '13px', fontWeight: 'bold' },
  roomSubRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  roomLevel: { backgroundColor: '#FFD700', color: '#000', fontSize: '8px', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' },
  roomId: { color: 'rgba(255,255,255,0.5)', fontSize: '10px' },
  topRightArea: { display: 'flex', alignItems: 'center', gap: '15px' },
  visitorStack: { display: 'flex', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '15px' },
  visitorImg: { width: '22px', height: '22px', borderRadius: '50%', border: '1px solid #fff' },
  visitorCount: { color: '#fff', fontSize: '12px', marginLeft: '5px' },
  headerIcons: { display: 'flex', gap: '15px', color: '#fff', fontSize: '18px' },
  topWidgets: { display: 'flex', justifyContent: 'space-between', padding: '5px 15px' },
  trophyBadge: { backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#FFC107', padding: '4px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' },
  musicMiniPlayer: { backgroundColor: 'rgba(0,176,255,0.15)', color: '#00B0FF', padding: '4px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 'bold' },
  seatsArea: { marginTop: '10px', padding: '0 15px' },
  chatWrapper: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  shareBanner: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', margin: '10px 15px', padding: '10px 15px', borderRadius: '20px' },
  shareText: { color: '#FFB300', fontSize: '11px' },
  shareBtn: { backgroundColor: '#00B0FF', color: '#fff', border: 'none', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  sideActions: { position: 'absolute', right: '15px', bottom: '110px', display: 'flex', flexDirection: 'column', gap: '12px' },
  sideBtn: { width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' },
  badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#FF5252', color: '#fff', fontSize: '8px', padding: '2px 4px', borderRadius: '6px' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  userCard: { width: '300px', backgroundColor: '#2D0052', borderRadius: '30px', padding: '30px', textAlign: 'center' },
  cardAvatar: { width: '90px', height: '90px', borderRadius: '50%', border: '4px solid #00B0FF', marginBottom: '15px' },
  cardName: { color: '#fff', fontSize: '20px', fontWeight: 'bold' },
  cardLv: { backgroundColor: '#FFD700', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '5px' },
  cardActions: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', margin: '20px 0' },
  actionBtn: { backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '12px 5px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' },
  giftToUserBtn: { width: '100%', backgroundColor: '#E91E63', color: '#fff', border: 'none', padding: '12px', borderRadius: '25px', fontWeight: 'bold' },
  giftSheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#1A0033', borderTopLeftRadius: '30px', borderTopRightRadius: '30px', padding: '20px' },
  sheetHandle: { width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 20px' },
  giftTabs: { display: 'flex', gap: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '20px' },
  activeTab: { color: '#FFB300', fontWeight: 'bold', borderBottom: '2px solid #FFB300', paddingBottom: '5px' },
  giftGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' },
  giftItem: { textAlign: 'center', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '15px' },
  giftIcon: { fontSize: '24px', marginBottom: '5px' },
  giftPrice: { color: '#FFD700', fontSize: '10px' },
  giftFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)' },
  wallet: { color: '#fff', fontSize: '13px' },
  sendBtn: { backgroundColor: '#FF1744', color: '#fff', border: 'none', padding: '10px 30px', borderRadius: '25px', fontWeight: 'bold' },
  roomModal: { width: '100%', position: 'absolute', bottom: 0, backgroundColor: '#1E003D', borderTopLeftRadius: '35px', borderTopRightRadius: '35px', overflow: 'hidden' },
  modalHandle: { width: '40px', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '15px auto' },
  modalBanner: { position: 'relative', height: '180px' },
  largeDp: { width: '100%', height: '100%', objectFit: 'cover' },
  changeDpBtn: { position: 'absolute', bottom: '15px', right: '15px', backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff', padding: '5px 12px', borderRadius: '15px', fontSize: '11px' },
  modalBody: { padding: '25px' },
  modalTitleInput: { width: '100%', background: 'transparent', border: 'none', borderBottom: '1px solid #00B0FF', color: '#fff', fontSize: '24px', fontWeight: 'bold', outline: 'none', marginBottom: '20px' },
  adminPanel: { marginBottom: '20px' },
  adminTitle: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '10px' },
  adminButtons: { display: 'flex', gap: '10px' },
  ctrlBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '12px', borderRadius: '15px', fontSize: '12px' },
  modalDesc: { width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', border: 'none', borderRadius: '15px', padding: '15px', minHeight: '80px', marginBottom: '20px' },
  saveBtn: { width: '100%', backgroundColor: '#FF1744', color: '#fff', border: 'none', padding: '15px', borderRadius: '30px', fontWeight: 'bold' }
};

export default VoiceRoomPage;
