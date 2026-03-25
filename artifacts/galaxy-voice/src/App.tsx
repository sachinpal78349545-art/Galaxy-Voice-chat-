import { AppProvider, useApp } from './lib/context';
import { Stars } from './components/Stars';
import { BottomNav } from './components/BottomNav';
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { RoomsPage } from './pages/RoomsPage';
import { ChatsPage } from './pages/ChatsPage';
import { ProfilePage } from './pages/ProfilePage';
import { VoiceRoomPage } from './pages/VoiceRoomPage';

function AppContent() {
  const { currentUser, activePage, activeRoom } = useApp();

  if (!currentUser) {
    return <AuthPage />;
  }

  // Voice room takes over full screen
  if (activePage === 'room' && activeRoom) {
    return (
      <div className="app-container">
        <Stars />
        <VoiceRoomPage />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Stars />
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
