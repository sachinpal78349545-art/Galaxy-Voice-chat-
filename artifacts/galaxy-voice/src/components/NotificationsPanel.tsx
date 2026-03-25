import { useApp } from '../lib/context';
import { markNotificationsRead } from '../lib/storage';
import { Bell, X } from 'lucide-react';

const NOTIF_ICONS: Record<string, string> = {
  follow: '👤',
  message: '💬',
  room_invite: '🎤',
  gift: '🎁',
  raise_hand: '✋',
};

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  const { notifications, refreshNotifications } = useApp();

  function handleClose() {
    markNotificationsRead();
    refreshNotifications();
    onClose();
  }

  function formatTime(ts: number) {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end',
    }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 400, margin: '0 auto',
        background: 'linear-gradient(180deg, #1e1040 0%, #0F0F1A 100%)',
        borderRadius: '24px 24px 0 0',
        border: '1px solid rgba(108,92,231,0.3)',
        maxHeight: '75vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '16px 16px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(108,92,231,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={18} color="#A29BFE" />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Notifications</h3>
          </div>
          <button onClick={handleClose} style={{
            background: 'none', border: 'none', color: 'rgba(162,155,254,0.6)', cursor: 'pointer',
          }}><X size={20} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, scrollbarWidth: 'none', padding: '8px 0' }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'rgba(162,155,254,0.4)' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
              <p>No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '12px 16px',
                background: n.read ? 'transparent' : 'rgba(108,92,231,0.08)',
                borderBottom: '1px solid rgba(108,92,231,0.08)',
                transition: 'background 0.2s',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{n.fromAvatar}</div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                    <span style={{ color: '#A29BFE', fontWeight: 600 }}>{NOTIF_ICONS[n.type]} </span>
                    {n.text}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(162,155,254,0.5)', marginTop: 4 }}>
                    {formatTime(n.timestamp)}
                  </div>
                </div>

                {!n.read && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#6C5CE7', flexShrink: 0, marginTop: 4,
                    boxShadow: '0 0 6px rgba(108,92,231,0.8)',
                  }} />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
