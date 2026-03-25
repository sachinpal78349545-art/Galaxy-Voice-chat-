import { useState } from 'react';
import { getConversations, getMessages, saveMessage, upsertConversation, ChatMessage, generateId } from '../lib/storage';
import { useApp } from '../lib/context';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

export function ChatsPage() {
  const { currentUser, activeChat, setActiveChat } = useApp();
  const conversations = currentUser ? getConversations(currentUser.id) : [];

  if (activeChat && currentUser) {
    return <ChatConversation
      myId={currentUser.id}
      myName={currentUser.username}
      myAvatar={currentUser.avatar}
      otherId={activeChat}
      otherName={conversations.find(c => c.participantId === activeChat)?.participantName || 'User'}
      otherAvatar={conversations.find(c => c.participantId === activeChat)?.participantAvatar || '🌟'}
      onBack={() => setActiveChat(null)}
    />;
  }

  return (
    <div className="page-content page-transition">
      <div className="page-header" style={{ paddingTop: 24 }}>
        <h2 className="page-title">Messages</h2>
      </div>

      {conversations.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, color: 'rgba(162, 155, 254, 0.5)' }}>
          <MessageCircle size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p>No conversations yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Join a room to start chatting</p>
        </div>
      )}

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => setActiveChat(conv.participantId)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0',
              borderBottom: '1px solid rgba(108, 92, 231, 0.1)',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
              border: '2px solid rgba(108, 92, 231, 0.4)',
              boxShadow: conv.unread > 0 ? '0 0 12px rgba(108, 92, 231, 0.6)' : 'none',
            }}>{conv.participantAvatar}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'white' }}>{conv.participantName}</span>
                <span style={{ fontSize: 11, color: 'rgba(162, 155, 254, 0.5)' }}>
                  {formatTime(conv.lastTimestamp)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{
                  fontSize: 13, color: 'rgba(162, 155, 254, 0.6)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
                }}>{conv.lastMessage}</span>
                {conv.unread > 0 && (
                  <span style={{
                    background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
                    borderRadius: '50%', minWidth: 18, height: 18,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: 'white',
                    marginLeft: 8, flexShrink: 0,
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

function ChatConversation({
  myId, myName, myAvatar, otherId, otherName, otherAvatar, onBack
}: {
  myId: string; myName: string; myAvatar: string;
  otherId: string; otherName: string; otherAvatar: string;
  onBack: () => void;
}) {
  const messages = getMessages(myId, otherId);
  const [input, setInput] = useState('');
  const [localMsgs, setLocalMsgs] = useState<ChatMessage[]>(messages);

  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: generateId(),
      fromId: myId, toId: otherId,
      fromName: myName, fromAvatar: myAvatar,
      text: input.trim(),
      timestamp: Date.now(), read: false,
    };
    saveMessage(msg);
    setLocalMsgs(prev => [...prev, msg]);
    setInput('');

    // Update conversation
    upsertConversation({
      id: `${myId}_${otherId}`,
      participantId: otherId,
      participantName: otherName,
      participantAvatar: otherAvatar,
      lastMessage: input.trim(),
      lastTimestamp: Date.now(),
      unread: 0,
    });

    // Fake reply after delay
    setTimeout(() => {
      const replies = [
        'That\'s so cool! 🌟', 'Totally agree!', 'Love that energy ✨',
        'Come join my room sometime 🎤', 'You\'re amazing! 💫',
        'haha yeah! 😄', 'Let\'s talk more in voice 🎵',
      ];
      const reply: ChatMessage = {
        id: generateId(),
        fromId: otherId, toId: myId,
        fromName: otherName, fromAvatar: otherAvatar,
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: Date.now(), read: false,
      };
      saveMessage(reply);
      setLocalMsgs(prev => [...prev, reply]);
    }, 1000 + Math.random() * 2000);
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '20px 16px 14px',
        background: 'rgba(26, 15, 46, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(108, 92, 231, 0.2)',
      }}>
        <button onClick={onBack} style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'rgba(108, 92, 231, 0.2)',
          border: '1px solid rgba(108, 92, 231, 0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#A29BFE',
        }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
        }}>{otherAvatar}</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{otherName}</div>
          <div style={{ fontSize: 11, color: '#A29BFE' }}>Online ✨</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 8,
        scrollbarWidth: 'none',
      }}>
        {localMsgs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 20, color: 'rgba(162, 155, 254, 0.4)', fontSize: 13 }}>
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
              <div className={`chat-bubble ${isSent ? 'sent' : 'received'}`}>
                {msg.text}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(162, 155, 254, 0.4)', marginTop: 4, paddingInline: 4 }}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} style={{
        display: 'flex', gap: 8, padding: '12px 16px',
        background: 'rgba(26, 15, 46, 0.9)',
        borderTop: '1px solid rgba(108, 92, 231, 0.2)',
        alignItems: 'center',
      }}>
        <input
          className="galaxy-input"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button type="submit" style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', flexShrink: 0,
          boxShadow: '0 0 16px rgba(108, 92, 231, 0.5)',
        }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function formatTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return `${Math.floor(diff / 86400000)}d`;
}
