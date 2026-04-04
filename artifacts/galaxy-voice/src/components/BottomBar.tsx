import React from 'react';

interface BottomBarProps {
  isMuted: boolean;
  onMicClick: () => void;
  inputText: string;
  setInputText: (t: string) => void;
  onSend: () => void;
}

const BottomBar: React.FC<BottomBarProps> = ({ isMuted, onMicClick, inputText, setInputText, onSend }) => {
  return (
    <div style={styles.wrapper}>
      {/* Input Row */}
      <div style={styles.inputRow}>
        <input 
          style={styles.input} 
          placeholder="Say something..." 
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onSend()}
        />
        <button onClick={onSend} style={styles.sendBtn}>🚀</button>
      </div>

      {/* Buttons Row */}
      <div style={styles.btnRow}>
        <div style={styles.group}>
          <span style={styles.icon}>🔊</span>
          <span style={styles.icon} onClick={onMicClick}>{isMuted ? '🔇' : '🎤'}</span>
        </div>
        <div style={styles.group}>
          <div style={styles.giftBox}>
            <span style={styles.icon}>🎁</span>
            <span style={styles.recharge}>Recharge</span>
          </div>
          <span style={styles.icon}>≡</span>
        </div>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: { backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px 15px 20px' },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '15px' },
  input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '20px', padding: '8px 15px', color: '#fff' },
  sendBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' },
  btnRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  group: { display: 'flex', gap: '25px', alignItems: 'center' },
  icon: { fontSize: '24px', cursor: 'pointer', color: '#fff' },
  giftBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' },
  recharge: { color: '#FFB300', fontSize: '8px', fontWeight: 'bold', position: 'absolute', bottom: '-12px' }
};

export default BottomBar;
