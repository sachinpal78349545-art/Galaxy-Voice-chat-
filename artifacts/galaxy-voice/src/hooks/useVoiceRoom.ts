import { useState } from 'react';

export const useVoiceRoom = () => {
  const [isMuted, setIsMuted] = useState(true);
  const [inputText, setInputText] = useState("");
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isGiftSheetOpen, setIsGiftSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [roomData, setRoomData] = useState({
    name: "Dosti Ki Mehfil ☕",
    id: "468534831",
    level: 52,
    followers: "12.5k",
    popularity: 850,
    description: "Welcome! No fighting, only fun. Level 40+ for Admin.",
    category: "#Music",
    dp: "https://via.placeholder.com/150/4A008F/FFFFFF?text=Room+DP"
  });

  const [seats, setSeats] = useState([
    { id: 1, user: { name: 'Owner', avatar: 'https://i.pravatar.cc/100?img=1', level: 85, isAdmin: true }, status: 'speaking' },
    { id: 2, user: null, status: 'locked' },
    { id: 3, user: null, status: 'empty' },
    { id: 4, user: null, status: 'empty' },
    { id: 5, user: null, status: 'empty' },
    { id: 6, user: null, status: 'empty' },
    { id: 7, user: null, status: 'locked' },
    { id: 8, user: null, status: 'locked' },
    { id: 9, user: null, status: 'empty' },
    { id: 10, user: null, status: 'empty' },
  ]);

  const [messages, setMessages] = useState([
    { id: '1', sender: 'System', text: 'Welcome! Follow the room rules.', type: 'system' },
  ]);

  // --- MASTER FUNCTIONS ---
  const handleSeatClick = (seatId: number) => {
    const seat = seats.find(s => s.id === seatId);
    if (seat?.user) {
      setSelectedUser(seat.user); // Open User Profile Card
    } else if (seat?.status === 'empty') {
      setSeats(prev => prev.map(s => s.id === seatId ? { ...s, user: { name: 'You', avatar: 'https://i.pravatar.cc/100?img=7', level: 1, isAdmin: false }, status: 'muted' } : s));
    }
  };

  const kickUser = (userName: string) => {
    setSeats(prev => prev.map(s => s.user?.name === userName ? { ...s, user: null, status: 'empty' } : s));
    setSelectedUser(null);
  };

  const toggleAllSeats = (lock: boolean) => {
    setSeats(prev => prev.map(s => s.user === null ? { ...s, status: lock ? 'locked' : 'empty' } : s));
  };

  const sendMessage = () => {
    if (inputText.trim() === "") return;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'You', text: inputText, type: 'user', level: 1 }]);
    setInputText("");
  };

  return {
    roomData, seats, messages, isMuted, inputText, isRoomModalOpen, isGiftSheetOpen, selectedUser,
    setInputText, setIsRoomModalOpen, setIsGiftSheetOpen, setSelectedUser,
    handleSeatClick, kickUser, toggleAllSeats, sendMessage, setIsMuted, setRoomData
  };
};
