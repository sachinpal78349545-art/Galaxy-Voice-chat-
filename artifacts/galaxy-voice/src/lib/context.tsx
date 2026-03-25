import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getCurrentUser, setCurrentUser as persistCurrentUser, Notification, getNotifications } from './storage';

interface AppContextType {
  currentUser: User | null;
  setUser: (user: User | null) => void;
  refreshUser: () => void;
  activePage: string;
  setActivePage: (page: string) => void;
  activeRoom: string | null;
  setActiveRoom: (roomId: string | null) => void;
  activeChat: string | null;
  setActiveChat: (userId: string | null) => void;
  notifications: Notification[];
  refreshNotifications: () => void;
  unreadCount: number;
  giftAnimation: { emoji: string; name: string } | null;
  showGiftAnimation: (emoji: string, name: string) => void;
  viewingProfile: string | null;
  setViewingProfile: (uid: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  currentUser: null,
  setUser: () => {},
  refreshUser: () => {},
  activePage: 'home',
  setActivePage: () => {},
  activeRoom: null,
  setActiveRoom: () => {},
  activeChat: null,
  setActiveChat: () => {},
  notifications: [],
  refreshNotifications: () => {},
  unreadCount: 0,
  giftAnimation: null,
  showGiftAnimation: () => {},
  viewingProfile: null,
  setViewingProfile: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser_] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('home');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [giftAnimation, setGiftAnimation] = useState<{ emoji: string; name: string } | null>(null);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser_(user);
    setNotifications(getNotifications());
  }, []);

  function setUser(user: User | null) {
    setCurrentUser_(user);
    persistCurrentUser(user?.id || null);
  }

  function refreshUser() {
    const user = getCurrentUser();
    if (user) setCurrentUser_(user);
  }

  function refreshNotifications() {
    setNotifications(getNotifications());
  }

  function showGiftAnimation(emoji: string, name: string) {
    setGiftAnimation({ emoji, name });
    setTimeout(() => setGiftAnimation(null), 3000);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, setUser, refreshUser,
      activePage, setActivePage,
      activeRoom, setActiveRoom,
      activeChat, setActiveChat,
      notifications, refreshNotifications, unreadCount,
      giftAnimation, showGiftAnimation,
      viewingProfile, setViewingProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
