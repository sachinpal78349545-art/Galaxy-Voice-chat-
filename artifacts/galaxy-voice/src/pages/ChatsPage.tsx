import { useState } from 'react';
import { getConversations, getMessages, saveMessage, upsertConversation, ChatMessage, generateId } from '../lib/storage';
import { useApp } from '../lib/context';
import { ArrowLeft, Send, MessageCircle, Smile } from 'lucide-react';

const CHAT_EMOJIS = ['😊', '😂', '❤️', '💜', '✨', '🔥', '👏', '🎵', '🌟', '💫'];

export function ChatsPage() {
  const { currentUser, activeChat, setActiveChat } = useApp();
  const conversations = currentUser ? getConversations(currentUser.id) : [];

  if (activeChat && currentUser) {
    const conv = conversations.find(c => c.participantId === activeChat);
    return (
      <ChatConversation
        myId={currentUser.id}
        myName={currentUser.username}
        myAvatar={currentUser.avatar}
        otherId={activeChat}
        otherName={conv?.participantName || 'User'}
        otherAvatar={conv?.participantAvatar || '🌟'}
        onBack={() => setActiveChat(null)}
      />
    );
  }

  return (
    <div className="page-content page-transition">
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h2 className="page-title">Messages 💬</h2>
      </div>

      {conversations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(162,155,254,0.4)' }}>
          <MessageCircle size={48} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
          <p>No conversations yet</p>
          <p style={{ fontSize: 12, marginTop: 4, color: 'rgba(162,155,254,0.3)' }}>Join a room to start chatting</p>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {conversations.map(conv => (
          <div key={conv.id} onClick={() => setActiveChat(conv.participantId)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: '1px solid rgba(108,92,231,0.1)',
            cursor: 'pointer',
          }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                border: conv.unread > 0 ? '2px solid rgba(108,92,231,0.7)' : '2px solid rgba(108,92,231,0.25)',
                boxShadow: conv.unread > 0 ? '0 0 12px rgba(108,92,231,0.5)' : 'none',
              }}>{conv.participantAvatar}</div>
              {/* Online dot */}
              <div style={{
                position: 'absolute', bottom: 2, right: 2, width: 10, height: 10,
                borderRadius: '50%', background: '#00b894',
                border: '2px solid rgba(26,15,46,1)',
              }} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{conv.participantName}</span>
                <span style={{ fontSize: 11, color: 'rgba(162,155,254,0.45)' }}>{formatTime(conv.lastTimestamp)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 }}>
                <span style={{
                  fontSize: 12, color: 'rgba(162,155,254,0.55)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>{conv.lastMessage}</span>
                {conv.unread > 0 && (
                  <span style={{
                    background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                    borderRadius: '50%', minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'white', marginLeft: 8, flexShrink: 0,
                  }}>{conv.unread}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatConversation({ myId, myName, myAvatar, otherId, otherName, otherAvatar, onBack }: {
  myId: string; myName: string; myAvatar: string;
  otherId: string; otherName: string; otherAvatar: string;
  onBack: () => void;
}) {
  const storedMsgs = getMessages(myId, otherId);
  const [localMsgs, setLocalMsgs] = useState<ChatMessage[]>(storedMsgs);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  function sendMessage(e: React.FormEvent, overrideText?: string) {
    e.preventDefault();
    const text = overrideText || input.trim();
    if (!text) return;
    const msg: ChatMessage = {
      id: generateId(), fromId: myId, toId: otherId,
      fromName: myName, fromAvatar: myAvatar,
      text, timestamp: Date.now(), read: false,
    };
    saveMessage(msg);
    setLocalMsgs(prev => [...prev, msg]);
    setInput('');
    setShowEmoji(false);

    upsertConversation({
      id: `${myId}_${otherId}`,
      participantId: otherId, participantName: otherName, participantAvatar: otherAvatar,
      lastMessage: text, lastTimestamp: Date.now(), unread: 0,
    });

    // Simulate reply
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replies = [
        'That\'s so cool! 🌟', 'Totally agree!', 'Love that energy ✨',
        'Come join my room sometime 🎤', 'You\'re amazing! 💫',
        'haha yeah! 😄', 'Let\'s talk more in voice 🎵',
        '💜', '🔥', 'Sending you gifts next time!',
      ];
      const reply: ChatMessage = {
        id: generateId(), fromId: otherId, toId: myId,
        fromName: otherName, fromAvatar: otherAvatar,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: Date.now(), read: false,
      };
      saveMessage(reply);
      setLocalMsgs(prev => [...prev, reply]);
    }, 800 + Math.random() * 1500);
  }

  function sendEmoji(emoji: string) {
    const e = { preventDefault: () => {} } as React.FormEvent;
    sendMessage(e, emoji);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '20px 14px 14px',
        background: 'rgba(26,15,46,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(108,92,231,0.2)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'rgba(108,92,231,0.2)', border: '1px solid rgba(108,92,231,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#A29BFE',
        }}><ArrowLeft size={15} /></button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
        }}>{otherAvatar}</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{otherName}</div>
          <div style={{ fontSize: 11, color: isTyping ? '#A29BFE' : '#00b894', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isTyping ? '#A29BFE' : '#00b894', display: 'inline-block' }} />
            {isTyping ? 'typing...' : 'Online'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px 14px',
        display: 'flex', flexDirection: 'column', gap: 6, scrollbarWidth: 'none',
      }}>
        {localMsgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'rgba(162,155,254,0.35)', fontSize: 13 }}>
            Start a conversation ✨
          </div>
        )}
        {localMsgs.map(msg => {
          const isSent = msg.fromId === myId;
          return (
            <div key={msg.id} style={{
              display: 'flex', flexDirection: 'column',
              alignItems: isSent ? 'flex-end' : 'flex-start',
            }}>
              <div className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>{msg.text}</div>
              <span style={{ fontSize: 10, color: 'rgba(162,155,254,0.35)', marginTop: 3, paddingInline: 4 }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}

        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
            }}>{otherAvatar}</div>
            <div style={{
              background: 'rgba(108,92,231,0.15)', border: '1px solid rgba(108,92,231,0.2)',
              borderRadius: '18px 18px 18px 4px', padding: '10px 14px',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#A29BFE',
                    animation: `typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Emoji row */}
      {showEmoji && (
        <div style={{
          display: 'flex', gap: 6, padding: '8px 14px 4px',
          background: 'rgba(26,15,46,0.9)', overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {CHAT_EMOJIS.map(e => (
            <button key={e} onClick={() => sendEmoji(e)} style={{
              fontSize: 22, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}>{e}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        display: 'flex', gap: 8, padding: '10px 14px 16px',
        background: 'rgba(26,15,46,0.95)', borderTop: '1px solid rgba(108,92,231,0.15)',
        alignItems: 'center', flexShrink: 0,
      }}>
        <button type="button" onClick={() => setShowEmoji(!showEmoji)} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: showEmoji ? 'rgba(108,92,231,0.35)' : 'rgba(108,92,231,0.15)',
          border: '1px solid rgba(108,92,231,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#A29BFE', flexShrink: 0,
        }}><Smile size={15} /></button>
        <input className="galaxy-input" placeholder="Type a message..."
          value={input} onChange={e => setInput(e.target.value)} style={{ flex: 1 }} />
        <button type="submit" style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0, boxShadow: '0 0 14px rgba(108,92,231,0.5)',
        }}><Send size={15} /></button>
      </form>
    </div>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
