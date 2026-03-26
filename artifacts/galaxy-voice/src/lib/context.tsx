import React, { createContext, useContext, useState, useEffect } from 'react';
import { getRedirectResult } from 'firebase/auth';
import { auth } from './firebase';
import { onAuthChange, AppUser, refreshUserFromDB } from './fbAuth';
import { Notification, getNotifications } from './storage';

interface AppContextType {
  currentUser: AppUser | null;
  setUser: (user: AppUser | null) => void;
  refreshUser: () => void;
  loading: boolean;
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
  currentUser: null, setUser: () => {}, refreshUser: () => {}, loading: true,
  activePage: 'home', setActivePage: () => {},
  activeRoom: null, setActiveRoom: () => {},
  activeChat: null, setActiveChat: () => {},
  notifications: [], refreshNotifications: () => {}, unreadCount: 0,
  giftAnimation: null, showGiftAnimation: () => {},
  viewingProfile: null, setViewingProfile: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser_] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [giftAnimation, setGiftAnimation] = useState<{ emoji: string; name: string } | null>(null);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);

  useEffect(() => {
    // Consume Google redirect result once on app load (must run before onAuthStateChanged
    // settles so Firebase can process the redirect credential properly).
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        console.log('[Auth] Google redirect sign-in completed for:', result.user.email);
      }
    }).catch((err) => {
      console.error('[Auth] getRedirectResult error:', err);
    });

    // Single source of truth for auth state — drives all routing in App.tsx
    const unsub = onAuthChange(user => {
      setCurrentUser_(user);
      setLoading(false);
      if (user) setNotifications(getNotifications());
    });
    return unsub;
  }, []);

  function setUser(user: AppUser | null) {
    setCurrentUser_(user);
  }

  async function refreshUser() {
    if (!currentUser) return;
    const updated = await refreshUserFromDB(currentUser.uid);
    if (updated) setCurrentUser_(updated);
  }

  function refreshNotifications() {
    setNotifications(getNotifications());
  }

  function showGiftAnimation(emoji: string, name: string) {
    setGiftAnimation({ emoji, name });
    setTimeout(() => setGiftAnimation(null), 3200);
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppContext.Provider value={{
      currentUser, setUser, refreshUser, loading,
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
