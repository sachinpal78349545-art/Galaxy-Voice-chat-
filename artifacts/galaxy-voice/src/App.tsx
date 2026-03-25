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

function AppContent() {
  const { currentUser, activePage, activeRoom, giftAnimation } = useApp();

  if (!currentUser) {
    return <AuthPage />;
  }

  // Voice room — full screen takeover
  if (activePage === 'room' && activeRoom) {
    return (
      <div className="app-container">
        <Stars />
        {giftAnimation && (
          <GiftAnimation emoji={giftAnimation.emoji} name={giftAnimation.name} />
        )}
        <VoiceRoomPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Stars />
      {giftAnimation && (
        <GiftAnimation emoji={giftAnimation.emoji} name={giftAnimation.name} />
      )}
      {activePage === 'home' && <HomePage />}
      {activePage === 'rooms' && <RoomsPage />}
      {activePage === 'chats' && <ChatsPage />}
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
