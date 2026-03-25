import { Home, Radio, MessageCircle, User } from 'lucide-react';
import { useApp } from '../lib/context';

const tabs = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'rooms', label: 'Rooms', icon: Radio },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
];

export function BottomNav() {
  const { activePage, setActivePage, setActiveRoom, setActiveChat } = useApp();

  function handleNav(page: string) {
    setActivePage(page);
    setActiveRoom(null);
    setActiveChat(null);
  }

  return (
    <div className="bottom-nav">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activePage === tab.id;
        return (
          <div
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => handleNav(tab.id)}
          >
            <Icon className="nav-icon" size={22} />
            <span className="nav-label">{tab.label}</span>
          </div>
        );
      })}
    </div>
  );
}
