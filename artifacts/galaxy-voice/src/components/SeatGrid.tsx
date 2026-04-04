import React from 'react';

interface Seat {
  id: number;
  user: { name: string; avatar: string; level: number; isAdmin?: boolean; isMuted?: boolean } | null;
  status: 'empty' | 'locked' | 'speaking' | 'muted';
}

interface Props {
  seats: Seat[];
  onSeatClick: (id: number) => void;
}

const SeatGrid: React.FC<Props> = ({ seats, onSeatClick }) => {
  return (
    <div style={styles.grid}>
      {seats.map((seat) => (
        <div key={seat.id} style={styles.seatContainer} onClick={() => onSeatClick(seat.id)}>
          <div style={styles.avatarRing}>
            {seat.user ? (
              <>
                <img src={seat.user.avatar} style={styles.avatar} alt="user" />
                {/* 🎤 Mute/Speaking Indicator */}
                <div style={seat.user.isMuted ? styles.muteIcon : styles.micIcon}>
                  {seat.user.isMuted ? '🔇' : '🎤'}
                </div>
                {/* ⭐ Admin Star */}
                {seat.user.isAdmin && <div style={styles.adminStar}>⭐</div>}
              </>
            ) : (
              <div style={styles.emptySeat}>
                {seat.status === 'locked' ? '🔒' : seat.id}
              </div>
            )}
          </div>
          <div style={styles.nameLabel}>
            {seat.user ? (
              <span style={styles.userName}>
                <span style={styles.lvBadge}>Lv.{seat.user.level}</span> {seat.user.name}
              </span>
            ) : (
              <span style={styles.emptyText}>{seat.status === 'locked' ? 'Locked' : 'Join'}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', padding: '10px' },
  seatContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' },
  avatarRing: { width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatar: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '2px solid #00B0FF' },
  emptySeat: { color: 'rgba(255,255,255,0.3)', fontSize: '18px', fontWeight: 'bold' },
  micIcon: { position: 'absolute', bottom: '-2px', right: '-2px', backgroundColor: '#00E676', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #1A0033' },
  muteIcon: { position: 'absolute', bottom: '-2px', right: '-2px', backgroundColor: '#FF5252', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid #1A0033' },
  adminStar: { position: 'absolute', top: '-2px', left: '-2px', fontSize: '12px' },
  nameLabel: { marginTop: '5px', textAlign: 'center' },
  userName: { color: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' },
  lvBadge: { backgroundColor: '#FFD700', color: '#000', fontSize: '7px', padding: '1px 3px', borderRadius: '3px', fontWeight: 'bold' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: '10px' }
};

export default SeatGrid;
