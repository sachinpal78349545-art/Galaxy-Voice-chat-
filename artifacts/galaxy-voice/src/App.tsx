import { useEffect } from 'react';
import { AppProvider, useApp } from './lib/context.tsx';
import { Stars } from './components/Stars';
import { BottomNav } from './components/BottomNav';
import { GiftAnimation } from './components/GiftAnimation';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { ChatsPage } from './pages/ChatsPage';
import { ProfilePage } from './pages/ProfilePage';
import VoiceRoomPage from './pages/VoiceRoomPage';
import { seedDemoRooms } from './lib/fbRooms';

// ✅ Splash & Notifications
import SplashScreen from './pages/splashscreen';
import NotificationsPage from './pages/NotificationsPage';

function AppContent() {
  // 🚨 FIX: Destructure 'loading' from context to sync with user state
  const { currentUser, activePage, activeRoom, giftAnimation, loading } = useApp();

  useEffect(() => {
    // Seed rooms once on mount
    seedDemoRooms().catch(() => {});
  }, []);

  // ✅ Use context loading to ensure currentUser is populated before rendering
  if (loading) {
    return <SplashScreen />;
  }

  // ❌ If not logged in, show AuthPage
  if (!currentUser) {
    return <AuthPage />;
  }

  // 🎤 Voice Room Full Screen Mode
  if (activePage === 'room' && activeRoom) {
    return (
      <div className="app-container">
        <Stars />
        {giftAnimation && (
          <GiftAnimation
            emoji={giftAnimation.emoji}
            name={giftAnimation.name}
          />
        )}
        <VoiceRoomPage />
      </div>
    );
  }

  // 🏠 MAIN APP (Home, Rooms, Chats, etc.)
  return (
    <div className="app-container">
      <Stars />

      {giftAnimation && (
        <GiftAnimation
          emoji={giftAnimation.emoji}
          name={giftAnimation.name}
        />
      )}

      {activePage === 'home' && <HomePage />}
      {activePage === 'rooms' && <RoomsPage />}
      {activePage === 'chats' && <ChatsPage />}
      {activePage === 'profile' && <ProfilePage />}
      {activePage === 'notifications' && <NotificationsPage />}

      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
