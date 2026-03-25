import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, getCurrentUser, setCurrentUser } from './storage';

interface AppContextType {
  currentUser: User | null;
  setUser: (user: User | null) => void;
  activePage: string;
  setActivePage: (page: string) => void;
  activeRoom: string | null;
  setActiveRoom: (roomId: string | null) => void;
  activeChat: string | null;
  setActiveChat: (userId: string | null) => void;
}

const AppContext = createContext<AppContextType>({
  currentUser: null,
  setUser: () => {},
  activePage: 'home',
  setActivePage: () => {},
  activeRoom: null,
  setActiveRoom: () => {},
  activeChat: null,
  setActiveChat: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser_] = useState<User | null>(null);
  const [activePage, setActivePage] = useState('home');
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) setCurrentUser_(user);
  }, []);

  function setUser(user: User | null) {
    setCurrentUser_(user);
    setCurrentUser(user?.id || null);
  }

  return (
    <AppContext.Provider value={{
      currentUser,
      setUser,
      activePage,
      setActivePage,
      activeRoom,
      setActiveRoom,
      activeChat,
      setActiveChat,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
