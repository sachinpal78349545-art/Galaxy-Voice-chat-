import React, { useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: string;
  text: string;
  type: 'system' | 'user' | 'gift' | 'entry';
  level?: number;
  giftIcon?: string;
  vipTag?: string;
}

interface Props {
  messages: Message[];
}

const MiniChat: React.FC<Props> = ({ messages }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div style={styles.chatWrapper}>
      {/* --- GRADIENT OVERLAY FOR SMOOTH FADE --- */}
      <div style={styles.topFade}></div>

      <div style={styles.chatScrollArea}>
        {messages.map((msg, index) => (
          <div key={msg.id || index} style={styles.messageRow}>
            
            {/* 1. ENTRY MESSAGE (Jab koi bada user aata hai) */}
            {msg.type === 'entry' && (
              <div style={styles.entryAnimation}>
                <span style={styles.entryStar}>✨</span>
                <span style={styles.entryText}>
                   Welcome <b style={{color: '#FFD700'}}>{msg.sender}</b> to the room!
                </span>
              </div>
            )}

            {/* 2. SYSTEM ANNOUNCEMENT */}
            {msg.type === 'system' && (
              <div style={styles.systemBox}>
                <div style={styles.systemTag}>OFFICIAL</div>
                <div style={styles.systemContent}>{msg.text}</div>
              </div>
            )}

            {/* 3. GIFT MESSAGE (Animated Gifting Text) */}
            {msg.type === 'gift' && (
              <div style={styles.giftMessage}>
                <div style={styles.giftSenderLv}>Lv.{msg.level}</div>
                <span style={styles.giftSenderName}>{msg.sender}</span>
                <span style={styles.giftActionText}>sent</span>
                <div style={styles.giftIconWrapper}>
                   <span style={styles.giftEmoji}>{msg.giftIcon || '🎁'}</span>
                </div>
              </div>
            )}

            {/* 4. REGULAR USER CHAT */}
            {msg.type === 'user' && (
              <div style={styles.bubbleWrapper}>
                <div style={styles.bubbleBody}>
                  {/* VIP/Level Badge */}
                  <div style={styles.badgeContainer}>
                    <div style={styles.levelBadge}>Lv.{msg.level || 1}</div>
                    {msg.vipTag && <div style={styles.vipBadge}>{msg.vipTag}</div>}
                  </div>
                  
                  <div style={styles.contentArea}>
                    <span style={styles.senderName}>{msg.sender}:</span>
                    <span style={styles.mainText}>{msg.text}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  chatWrapper: { flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0 12px' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(to bottom, #1A0033 0%, transparent 100%)', zIndex: 2, pointerEvents: 'none' },
  chatScrollArea: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '20px', scrollbarWidth: 'none' },
  messageRow: { marginBottom: '4px', animation: 'fadeInChat 0.3s ease-out forwards' },
  
  // Entry Animation Styles
  entryAnimation: { background: 'linear-gradient(90deg, rgba(255,215,0,0.2) 0%, transparent 100%)', padding: '6px 15px', borderRadius: '20px', borderLeft: '3px solid #FFD700', margin: '5px 0', display: 'flex', alignItems: 'center', gap: '8px' },
  entryStar: { fontSize: '14px' },
  entryText: { color: '#fff', fontSize: '11px', letterSpacing: '0.3px' },

  // System Styles
  systemBox: { backgroundColor: 'rgba(0,176,255,0.1)', border: '1px solid rgba(0,176,255,0.2)', padding: '8px 12px', borderRadius: '14px', maxWidth: '85%' },
  systemTag: { color: '#00B0FF', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px', textTransform: 'uppercase' },
  systemContent: { color: '#B0BEC5', fontSize: '11px', lineHeight: '1.4' },

  // Gift Styles
  giftMessage: { display: 'flex', alignItems: 'center', background: 'rgba(233,30,99,0.15)', padding: '6px 12px', borderRadius: '15px', border: '1px solid rgba(233,30,99,0.3)', width: 'fit-content', gap: '6px' },
  giftSenderLv: { backgroundColor: '#FFD700', color: '#000', fontSize: '8px', padding: '1px 4px', borderRadius: '4px', fontWeight: 'bold' },
  giftSenderName: { color: '#fff', fontSize: '12px', fontWeight: 'bold' },
  giftActionText: { color: 'rgba(255,255,255,0.6)', fontSize: '11px' },
  giftIconWrapper: { width: '24px', height: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
  giftEmoji: { fontSize: '18px' },

  // User Bubble Styles
  bubbleWrapper: { display: 'flex', flexDirection: 'column', maxWidth: '90%' },
  bubbleBody: { backgroundColor: 'rgba(0,0,0,0.35)', padding: '8px 14px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(5px)' },
  badgeContainer: { display: 'flex', gap: '4px', marginBottom: '4px' },
  levelBadge: { backgroundColor: '#4CAF50', color: '#fff', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' },
  vipBadge: { backgroundColor: '#9C27B0', color: '#fff', fontSize: '8px', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' },
  contentArea: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' },
  senderName: { color: '#00B0FF', fontSize: '12px', fontWeight: 'bold' },
  mainText: { color: '#fff', fontSize: '13px', lineHeight: '1.4' }
};

export default MiniChat;
