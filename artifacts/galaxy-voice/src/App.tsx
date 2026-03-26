import { useEffect } from 'react';
import { AppProvider, useApp } from './lib/context';
import { Stars } from './components/Stars';
import { BottomNav } from './components/BottomNav';
import { GiftAnimation } from './components/GiftAnimation';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { ChatsPage } from './pages/ChatsPage';
import { ProfilePage } from './pages/ProfilePage';
import { VoiceRoomPage } from './pages/VoiceRoomPage';
import { seedDemoRooms } from './lib/fbRooms';
import { Mic, Loader } from 'lucide-react';

function LoadingScreen() {
  return (
    <div style={{
      width: '100%', maxWidth: 400, height: '100dvh', margin: '0 auto',
      background: 'linear-gradient(180deg, #1A0F2E 0%, #0F0F1A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20,
    }}>
      <div style={{
        width: 84, height: 84, borderRadius: '50%',
        background: 'linear-gradient(135deg, #6C5CE7, #A29BFE)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(108,92,231,0.7)',
        animation: 'logo-pulse 2s ease-in-out infinite',
      }}>
        <Mic size={38} color="white" />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'rgba(162,155,254,0.8)', fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Galaxy Voice</p>
        <Loader size={20} color="rgba(162,155,254,0.5)" style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser, activePage, activeRoom, giftAnimation, loading } = useApp();

  useEffect(() => {
    // Seed demo rooms once on first load
    seedDemoRooms().catch(() => {});
  }, []);

  if (loading) return <LoadingScreen />;

  if (!currentUser) return <AuthPage />;

  if (activePage === 'room' && activeRoom) {
    return (
      <div className="app-container">
        <Stars />
        {giftAnimation && <GiftAnimation emoji={giftAnimation.emoji} name={giftAnimation.name} />}
        <VoiceRoomPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Stars />
      {giftAnimation && <GiftAnimation emoji={giftAnimation.emoji} name={giftAnimation.name} />}
      {activePage === 'home'    && <HomePage />}
      {activePage === 'rooms'   && <RoomsPage />}
      {activePage === 'chats'   && <ChatsPage />}
      {activePage === 'profile' && <ProfilePage />}
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
