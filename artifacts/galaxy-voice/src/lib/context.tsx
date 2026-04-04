import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string;
  shortId: string;
  coins: number;
}

interface AppContextType {
  currentUser: AppUser | null;
  setUser: (user: AppUser | null) => void;
  loading: boolean;
  activePage: string;
  setActivePage: (page: string) => void;
  activeRoom: string | null;
  setActiveRoom: (roomId: string | null) => void;
  activeChat: string | null; // 👈 Missing tha
  setActiveChat: (userId: string | null) => void; // 👈 Missing tha
  giftAnimation: { emoji: string; name: string } | null;
  showGiftAnimation: (emoji: string, name: string) => void;
  viewingProfile: string | null; // 👈 Missing tha
  setViewingProfile: (uid: string | null) => void; // 👈 Missing tha
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<string | null>(null);
  const [giftAnimation, setGiftAnimation] = useState<{ emoji: string; name: string } | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('local_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  function setUser(user: AppUser | null) {
    if (user) {
      localStorage.setItem('local_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('local_user');
    }
    setCurrentUser(user);
  }

  function showGiftAnimation(emoji: string, name: string) {
    setGiftAnimation({ emoji, name });
    setTimeout(() => setGiftAnimation(null), 3000);
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      setUser,
      loading,
      activePage,
      setActivePage,
      activeRoom,
      setActiveRoom,
      activeChat,
      setActiveChat,
      giftAnimation,
      showGiftAnimation,
      viewingProfile,
      setViewingProfile,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
}
